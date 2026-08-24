"""
Capture real device screenshots for the Play listing.

Drives the installed app over adb, screenshots each tab, and drops the raw captures in
store/raw/ where tools/store_assets.py letterboxes them to Play's 1080x1920.

Play rejects a screenshot whose long side is more than 2x the short side, and an S24 Ultra
capture is 1080x2340 (2.17:1) — hence the letterboxing step rather than uploading these
directly.

    python tools/capture.py            # capture in the phone's current theme
    python tools/capture.py --dark     # force dark first, then restore
"""
from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "store" / "raw"
PKG = "com.wukoric.cue"

# Fractions of the screen, so this survives a different device.
TABS = {"live": 0.125, "history": 0.375, "people": 0.625, "settings": 0.875}


def adb(*args: str, binary: bool = False):
    r = subprocess.run(["adb", *args], capture_output=True)
    if binary:
        return r.stdout
    return r.stdout.decode(errors="replace").strip()


def size() -> tuple[int, int]:
    out = adb("shell", "wm", "size")          # "Physical size: 1080x2340"
    w, h = out.split(":")[-1].strip().split("x")
    return int(w), int(h)


def shoot(name: str) -> Path:
    RAW.mkdir(parents=True, exist_ok=True)
    png = adb("exec-out", "screencap", "-p", binary=True)   # exec-out: shell corrupts binary
    p = RAW / f"{name}.png"
    p.write_bytes(png)
    return p


def main() -> int:
    if PKG not in adb("shell", "pm", "list", "packages"):
        print(f"{PKG} is not installed — build it first")
        return 2

    w, h = size()
    # 0.965 lands on the SYSTEM navigation bar, not the app's tab bar — that opened the
    # recents switcher and captured the user's other apps. The tab bar sits above it.
    tab_y = int(h * 0.910)

    if "--dark" in sys.argv:
        adb("shell", "cmd", "uimode", "night", "yes")
        time.sleep(1.5)

    adb("shell", "monkey", "-p", PKG, "-c", "android.intent.category.LAUNCHER", "1")
    time.sleep(4)

    shots = []
    for name, frac in TABS.items():
        adb("shell", "input", "tap", str(int(w * frac)), str(tab_y))
        time.sleep(1.6)
        shots.append(shoot(f"{len(shots) + 1}-{name}"))

    for p in shots:
        print("  captured", p.name, p.stat().st_size, "bytes")
    print(f"{len(shots)} captures in {RAW}; run tools/store_assets.py to letterbox them")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
