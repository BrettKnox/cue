"""
Generate Play Store graphics to spec, then assert the specs rather than trusting them.

The rule that bites: a screenshot's long side must be at most 2x its short side. A raw
S24 Ultra capture is 1080x2340 (2.17:1) and Play rejects it with an unhelpful error, so
device shots are letterboxed to a clean 1080x1920.
"""
from pathlib import Path
import sys

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "store" / "assets"
OUT.mkdir(parents=True, exist_ok=True)

ACCENT = (31, 111, 235)
DARK_BG = (16, 20, 26)
INK = (255, 255, 255)


def bars(d, cx, cy, scale=1.0, color=INK):
    from PIL import ImageDraw  # noqa: F401
    heights = [0.30, 0.58, 0.86, 0.58, 0.30]
    w, gap = int(58 * scale), int(46 * scale)
    total = len(heights) * w + (len(heights) - 1) * gap
    x = cx - total // 2
    for h in heights:
        bh = int(h * 470 * scale)
        d.rounded_rectangle([x, cy - bh // 2, x + w, cy + bh // 2], radius=w // 2, fill=color)
        x += w + gap


def icon_512() -> Path:
    """512x512, 32-bit, NO alpha — Play rejects transparency on the store icon."""
    from PIL import ImageDraw
    src = ROOT / "assets" / "icon.png"
    img = Image.open(src).convert("RGBA").resize((512, 512), Image.LANCZOS)
    flat = Image.new("RGB", (512, 512), ACCENT)
    flat.paste(img, (0, 0), img)
    p = OUT / "play-icon-512.png"
    flat.save(p)
    return p


def feature_1024x500() -> Path:
    """The feature graphic. No alpha, no text that a translation would strand."""
    from PIL import ImageDraw
    img = Image.new("RGB", (1024, 500), DARK_BG)
    d = ImageDraw.Draw(img)
    bars(d, 300, 250, scale=0.42, color=(127, 178, 255))
    d.rounded_rectangle([170, 352, 430, 366], radius=7, fill=(127, 178, 255))
    for i, y in enumerate((188, 232, 276)):
        d.rounded_rectangle([560, y, 560 + (330 - i * 60), y + 16], radius=8, fill=(236, 240, 244))
    d.rounded_rectangle([560, 320, 800, 334], radius=7, fill=(90, 100, 112))
    p = OUT / "play-feature-1024x500.png"
    img.save(p)
    return p


def letterbox(src: Path, dst: Path, size=(1080, 1920)) -> Path:
    """Fit a device capture into 1080x1920 on its own background — never stretch it."""
    img = Image.open(src).convert("RGB")
    bg = img.getpixel((4, img.height // 2))          # sample the app's own background
    canvas = Image.new("RGB", size, bg)
    scale = min(size[0] / img.width, size[1] / img.height)
    resized = img.resize((int(img.width * scale), int(img.height * scale)), Image.LANCZOS)
    canvas.paste(resized, ((size[0] - resized.width) // 2, (size[1] - resized.height) // 2))
    canvas.save(dst)
    return dst


def check(path: Path, expect=None, no_alpha=False, ratio_max=2.0) -> list[str]:
    bad = []
    img = Image.open(path)
    w, h = img.size
    if expect and (w, h) != expect:
        bad.append(f"{path.name}: {w}x{h}, expected {expect[0]}x{expect[1]}")
    if no_alpha and img.mode in ("RGBA", "LA", "P"):
        bad.append(f"{path.name}: has an alpha channel; Play rejects that here")
    if max(w, h) > ratio_max * min(w, h):
        bad.append(f"{path.name}: {round(max(w,h)/min(w,h), 3)}:1 exceeds the {ratio_max}:1 rule")
    return bad


def main() -> int:
    problems: list[str] = []
    problems += check(icon_512(), expect=(512, 512), no_alpha=True)
    problems += check(feature_1024x500(), expect=(1024, 500), no_alpha=True, ratio_max=2.05)

    shots = sorted((ROOT / "store" / "raw").glob("*.png")) if (ROOT / "store" / "raw").exists() else []
    for i, s in enumerate(shots, 1):
        problems += check(letterbox(s, OUT / f"play-shot-{i}.png"), expect=(1080, 1920))
    if not shots:
        print("no captures in store/raw/ yet — icon and feature graphic only")

    for p in problems:
        print("  FAIL", p)
    print(f"{len(list(OUT.glob('*.png')))} assets in {OUT}, {len(problems)} problems")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
