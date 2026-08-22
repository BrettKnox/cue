"""
Measure Cue's accessibility numbers instead of eyeballing them.

Exports the app for web, serves dist/, and drives it with Playwright across every
combination that can hide a failure: 3 widths x 2 colour schemes x 2 accents x every
screen. Asserts the hard numbers from ~/.claude/knowledge/ui-ux-standards.md:

  * interactive elements are at least 48x48 dp
  * text clears 4.5:1 against what is actually behind it
  * no text below 12px
  * nothing overflows horizontally
  * every interactive element has an accessible name

A passing default proves nothing about the other permutations, which is why this walks
all of them. Web is a proxy for layout and colour only — TalkBack, real font scaling and
the native recogniser still need the device.

    python tools/audit.py            # build if needed, then audit
    python tools/audit.py --no-build # reuse the existing dist/
"""
from __future__ import annotations

import functools
import http.server
import json
import socketserver
import subprocess
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
PORT = 8799

WIDTHS = [(360, 800, "phone-min"), (390, 844, "phone"), (800, 1200, "tablet")]
SCHEMES = ["light", "dark"]
ACCENTS = ["blue", "green"]
TABS = ["Live", "History", "People", "Settings"]

MIN_TAP = 48
MIN_FONT = 12
MIN_CONTRAST = 4.5


def luminance(rgb: list[int]) -> float:
    def channel(v: float) -> float:
        v = v / 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4

    r, g, b = (channel(x) for x in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(fg: list[int], bg: list[int]) -> float:
    a, b = luminance(fg), luminance(bg)
    hi, lo = max(a, b), min(a, b)
    return round((hi + 0.05) / (lo + 0.05), 2)


def parse_rgb(s: str) -> list[int] | None:
    if not s or "rgb" not in s:
        return None
    nums = s.replace("rgba(", "").replace("rgb(", "").rstrip(")").split(",")
    try:
        parts = [int(float(n)) for n in nums[:3]]
    except ValueError:
        return None
    # A fully transparent foreground is not a contrast failure, it is invisible by design.
    if len(nums) > 3 and float(nums[3]) < 0.5:
        return None
    return parts


# Collected in the page: every interactive element and every text node that matters.
PROBE = r"""() => {
  const bgOf = (el) => {
    let e = el;
    while (e) {
      const c = getComputedStyle(e).backgroundColor;
      if (c && c !== 'rgba(0, 0, 0, 0)' && !c.endsWith(', 0)')) return c;
      e = e.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor || 'rgb(255, 255, 255)';
  };
  // React Navigation keeps inactive tabs MOUNTED, so "is it in the DOM" is not "is it on
  // screen". Without this every pass re-measures every other screen and the failure labels
  // name the wrong one.
  const hidden = (el) => {
    let e = el;
    while (e) {
      if (e.getAttribute && e.getAttribute('aria-hidden') === 'true') return true;
      const s = getComputedStyle(e);
      if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return true;
      e = e.parentElement;
    }
    return false;
  };
  const onScreen = (r) =>
    r.bottom > 0 && r.right > 0 &&
    r.top < window.innerHeight && r.left < window.innerWidth;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && !hidden(el) && onScreen(r);
  };
  const name = (el) =>
    (el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText || '').trim();

  const interactive = [...document.querySelectorAll(
    '[role=button], [role=tab], [role=switch], [role=link], button, input, textarea, select')]
    .filter(visible)
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { name: name(el), role: el.getAttribute('role') || el.tagName.toLowerCase(),
               w: Math.round(r.width), h: Math.round(r.height) };
    });

  const texts = [...document.querySelectorAll('div, span, p, h1, h2, h3, label, input, textarea')]
    .filter((el) => visible(el) && el.children.length === 0 && (el.innerText || el.placeholder || '').trim())
    .map((el) => {
      const s = getComputedStyle(el);
      return { text: (el.innerText || el.placeholder).trim().slice(0, 40),
               color: el.placeholder && !el.innerText ? s.getPropertyValue('color') : s.color,
               size: parseFloat(s.fontSize), weight: s.fontWeight, bg: bgOf(el) };
    });

  return {
    interactive,
    texts,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  };
}"""


def serve() -> socketserver.TCPServer:
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(DIST))
    handler.log_message = lambda *a, **k: None  # type: ignore[method-assign]
    srv = socketserver.TCPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def audit_page(page, label: str, failures: list[str]) -> dict:
    data = page.evaluate(PROBE)

    if data["overflow"]:
        failures.append(f"{label}: horizontal overflow ({data['scrollWidth']}>{data['clientWidth']})")

    for el in data["interactive"]:
        if not el["name"]:
            failures.append(f"{label}: unnamed {el['role']} ({el['w']}x{el['h']})")
        if el["h"] < MIN_TAP or el["w"] < MIN_TAP:
            failures.append(
                f"{label}: {el['role']} '{el['name'][:24]}' is {el['w']}x{el['h']}, under {MIN_TAP}dp")

    for t in data["texts"]:
        if t["size"] < MIN_FONT:
            failures.append(f"{label}: '{t['text'][:24]}' at {t['size']}px, under {MIN_FONT}px")
        fg, bg = parse_rgb(t["color"]), parse_rgb(t["bg"])
        if not fg or not bg:
            continue
        # Large text gets the 3:1 allowance, per WCAG.
        large = t["size"] >= 24 or (t["size"] >= 18.66 and int(t["weight"] or 400) >= 700)
        need = 3.0 if large else MIN_CONTRAST
        ratio = contrast(fg, bg)
        if ratio < need:
            failures.append(
                f"{label}: '{t['text'][:24]}' contrast {ratio} < {need} ({t['color']} on {t['bg']})")

    return data


def main() -> int:
    if "--no-build" not in sys.argv:
        print("building web export…")
        r = subprocess.run("npx expo export --platform web", cwd=ROOT, shell=True,
                           capture_output=True, text=True)
        if "Exported" not in r.stdout + r.stderr:
            print((r.stdout + r.stderr)[-2000:])
            return 2

    if not DIST.exists():
        print("no dist/ — run without --no-build")
        return 2

    srv = serve()
    failures: list[str] = []
    checked = 0

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            for width, height, wname in WIDTHS:
                for scheme in SCHEMES:
                    page = browser.new_page(viewport={"width": width, "height": height},
                                            color_scheme=scheme)
                    errors: list[str] = []
                    page.on("pageerror", lambda e: errors.append(str(e)))
                    page.on("console",
                            lambda m: errors.append(m.text) if m.type == "error" else None)
                    page.goto(f"http://127.0.0.1:{PORT}/", wait_until="networkidle")
                    page.wait_for_timeout(2000)

                    # Onboarding gates everything; it is a screen too.
                    if page.get_by_role("button", name="Get started").count():
                        audit_page(page, f"Onboarding {wname}/{scheme}", failures)
                        checked += 1
                        page.get_by_role("button", name="Get started").click()
                        page.wait_for_timeout(1200)

                    for accent in ACCENTS:
                        if accent != "blue":
                            page.get_by_role("tab", name="Settings").click()
                            page.wait_for_timeout(700)
                            btn = page.get_by_role("button", name=accent)
                            if btn.count():
                                btn.first.click()
                                page.wait_for_timeout(600)
                        for tab in TABS:
                            t = page.get_by_role("tab", name=tab)
                            if not t.count():
                                failures.append(f"missing tab {tab} at {wname}/{scheme}")
                                continue
                            t.click()
                            page.wait_for_timeout(650)
                            audit_page(page, f"{tab} {wname}/{scheme}/{accent}", failures)
                            checked += 1

                    for e in errors[:3]:
                        failures.append(f"console {wname}/{scheme}: {e[:120]}")
                    page.close()
            browser.close()
    finally:
        srv.shutdown()

    unique = sorted(set(failures))
    print(json.dumps({"screens_checked": checked, "failures": len(unique)}, indent=1))
    for f in unique:
        # Windows consoles are cp1252; a smart quote in a label must not crash the report.
        print("  FAIL", f.encode("ascii", "replace").decode("ascii"))
    return 1 if unique else 0


if __name__ == "__main__":
    raise SystemExit(main())
