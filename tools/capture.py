"""
Capture real device screenshots for the Play listing.

**Safety first, and this is not theoretical.** Two earlier runs of this script tapped the
system navigation bar instead of the app's tab bar, opened the recents switcher, and
captured the owner's other apps — a browser, a code editor, private paths. Those images
were one letterbox step away from a public store listing.

So every capture is now gated: the script refuses to shoot unless Cue is the focused
window, and it aborts the whole run rather than saving a frame it cannot vouch for. It
also waits for the app to actually render — a dev build spends its first ~15 s fetching
the JS bundle and screenshots as a black rectangle.

Play rejects a screenshot whose long side exceeds 2x the short side, and this phone
captures 1080x2340 (2.17:1), so tools/store_assets.py letterboxes these to 1080x1920.

    python tools/capture.py            # capture in the phone's current theme
    python tools/capture.py --dark     # force dark mode first
"""
from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "store" / "raw"
PKG = "com.wukoric.cue"
ACTIVITY = f"{PKG}/.MainActivity"

# Fractions of the width; the y is measured, not guessed (see tab_y()).
TABS = {"live": 0.125, "history": 0.375, "people": 0.625, "settings": 0.875}

# A 1080x2340 all-black PNG lands around 15 KB. Real content is far larger.
MIN_RENDERED_BYTES = 40_000


def adb(*args: str, binary: bool = False):
    r = subprocess.run(["adb", *args], capture_output=True)
    return r.stdout if binary else r.stdout.decode(errors="replace").strip()


def size() -> tuple[int, int]:
    w, h = adb("shell", "wm", "size").split(":")[-1].strip().split("x")
    return int(w), int(h)


def focused() -> str:
    for line in adb("shell", "dumpsys", "window").splitlines():
        if "mCurrentFocus" in line:
            return line.strip()
    return ""


def require_cue(step: str) -> None:
    """Abort rather than capture whatever else happens to be on screen."""
    f = focused()
    if PKG not in f:
        print(f"\nABORT at {step}: Cue is not the focused window.")
        print(f"  focus is: {f or '(none)'}")
        print("  Refusing to screenshot — this is how another app's content gets captured.")
        sys.exit(3)


def shoot(name: str) -> Path:
    RAW.mkdir(parents=True, exist_ok=True)
    p = RAW / f"{name}.png"
    p.write_bytes(adb("exec-out", "screencap", "-p", binary=True))
    return p


def wait_rendered(timeout: float = 45.0) -> bool:
    """A dev build shows black while it downloads its bundle."""
    end = time.time() + timeout
    while time.time() < end:
        require_cue("waiting for first paint")
        if len(adb("exec-out", "screencap", "-p", binary=True)) > MIN_RENDERED_BYTES:
            return True
        time.sleep(2)
    return False


def tab_y(h: int) -> int:
    """
    The tab bar sits above the system navigation bar. 0.965 of the height is INSIDE the
    nav bar and opens recents — measured on a 1080x2340 S24 Ultra, the tab row centre is
    ~0.910. Kept as a fraction so another device is at least close.
    """
    return int(h * 0.910)


def main() -> int:
    if PKG not in adb("shell", "pm", "list", "packages"):
        print(f"{PKG} is not installed — build it first")
        return 2

    w, h = size()
    y = tab_y(h)

    if "--dark" in sys.argv:
        adb("shell", "cmd", "uimode", "night", "yes")
        time.sleep(1.5)

    # am start, never monkey: monkey injects events that can surface system UI.
    adb("shell", "am", "start", "-n", ACTIVITY)
    time.sleep(4)
    require_cue("launch")

    if not wait_rendered():
        print("app never rendered (still black) — is metro reachable?")
        return 4

    shots = []
    for i, (name, frac) in enumerate(TABS.items(), 1):
        adb("shell", "input", "tap", str(int(w * frac)), str(y))
        time.sleep(2.0)
        require_cue(f"after tapping {name}")          # the tap must not have left the app
        shots.append(shoot(f"{i}-{name}"))

    # The detail screen — summary, commitments, people, Ask — is the most compelling one
    # and is only reachable by opening a conversation from History.
    adb("shell", "input", "tap", str(int(w * TABS["history"])), str(y))
    time.sleep(1.8)
    require_cue("returning to History")
    adb("shell", "input", "tap", str(w // 2), str(int(h * 0.22)))   # the newest card
    time.sleep(2.5)
    require_cue("opening a conversation")
    shots.append(shoot("5-conversation"))
    adb("shell", "input", "keyevent", "KEYCODE_BACK")
    time.sleep(1.2)

    sizes = {p.stat().st_size for p in shots}
    for p in shots:
        print("  captured", p.name, p.stat().st_size, "bytes")
    if len(sizes) == 1:
        print("\nWARNING: every capture is byte-identical — the taps probably did nothing.")
        return 5

    print(f"\n{len(shots)} captures in {RAW}; run tools/store_assets.py to letterbox them")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
