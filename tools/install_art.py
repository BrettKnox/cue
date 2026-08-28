"""Install hand-delivered illustrations into assets/art/, checking them first.

The app tints these at runtime, so a file that looks right in a viewer can still
be wrong in ways that only show on device:

  - A baked-in background renders as an opaque rectangle over the screen. One
    delivered file had the transparency CHECKERBOARD drawn into the pixels, and
    it is invisible as an error in any viewer that shows a checkerboard for
    transparency, which is all of them.
  - Any colour in the file fights the palette, because tinting multiplies.
  - Ink that is not actually dark tints to a washed-out ghost.

So each file is measured, repaired if it can be, and refused if it cannot.

    python tools/install_art.py <source.png> <art-name>          # one
    python tools/install_art.py --manifest tools/art_manifest.txt # many
"""
from __future__ import annotations

import argparse
import pathlib
import sys

from PIL import Image

ART = pathlib.Path(__file__).resolve().parent.parent / "assets" / "art"

VALID = {
    "mark", "onboard-hears", "onboard-device", "onboard-asked", "onboard-delete",
    "live-empty", "history-empty", "people-empty", "search-empty", "flourish",
}


def measure(im: Image.Image) -> dict:
    px = im.load()
    w, h = im.size
    step = max(1, min(w, h) // 220)
    n = ink = opaque = coloured = 0
    for y in range(0, h, step):
        for x in range(0, w, step):
            r, g, b, a = px[x, y]
            n += 1
            if a <= 16:
                continue
            opaque += 1
            if 0.2126 * r + 0.7152 * g + 0.0722 * b < 110:
                ink += 1
            if max(r, g, b) - min(r, g, b) > 28:
                coloured += 1
    return {"n": n, "ink": ink, "opaque": opaque, "coloured": coloured}


def flatten_to_alpha(im: Image.Image, cutoff: int = 150) -> Image.Image:
    """
    Turn a light background into real transparency by keying on luminance.

    Only safe because these are pure black-ink line drawings: everything that
    matters is dark and everything light is background, checkerboard included.
    Alpha ramps across the cutoff rather than switching, so edges stay smooth
    instead of turning into a staircase.
    """
    out = Image.new("RGBA", im.size)
    src, dst = im.load(), out.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = src[x, y]
            lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
            if lum >= cutoff:
                dst[x, y] = (0, 0, 0, 0)
            else:
                # 0 at the cutoff, 255 at pure black.
                dst[x, y] = (0, 0, 0, min(255, round(255 * (cutoff - lum) / cutoff)))
    return out


def install(src: pathlib.Path, name: str) -> bool:
    if name not in VALID and not any(
            name.startswith(v + "-f") for v in VALID):
        print(f"  REFUSED {name}: not a name src/art.tsx knows")
        return False
    if not src.exists():
        print(f"  REFUSED {name}: {src} does not exist")
        return False

    im = Image.open(src).convert("RGBA")
    m = measure(im)
    transparent = m["opaque"] < m["n"] * 0.98
    note = ""

    if m["coloured"] > m["opaque"] * 0.02:
        pct = 100 * m["coloured"] / max(m["opaque"], 1)
        print(f"  REFUSED {name}: {pct:.1f}% coloured pixels; the app tints these, "
              "so colour in the file fights the palette")
        return False

    if not transparent:
        im = flatten_to_alpha(im)
        m2 = measure(im)
        if m2["ink"] < m["n"] * 0.002:
            print(f"  REFUSED {name}: background keyed out and almost no ink left "
                  f"({100*m2['ink']/m2['n']:.2f}%); regenerate this one")
            return False
        note = f" (background keyed out, {100*m2['ink']/m2['n']:.1f}% ink)"
        m = m2

    if im.width < 1000:
        note += f" (WARNING: {im.width}px on the long side, brief said 1024+)"

    ART.mkdir(parents=True, exist_ok=True)
    dest = ART / f"{name}.png"
    im.save(dest, optimize=True)
    print(f"  {name:16} <- {src.name[-18:]}  {im.width}x{im.height}, "
          f"{100*m['ink']/m['n']:.1f}% ink, {dest.stat().st_size//1024} KB{note}")
    return True


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("source", nargs="?")
    ap.add_argument("name", nargs="?")
    ap.add_argument("--manifest")
    args = ap.parse_args()

    pairs: list[tuple[pathlib.Path, str]] = []
    if args.manifest:
        for line in pathlib.Path(args.manifest).read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            path, _, nm = line.rpartition("|")
            pairs.append((pathlib.Path(path.strip()), nm.strip()))
    elif args.source and args.name:
        pairs.append((pathlib.Path(args.source), args.name))
    else:
        ap.error("give a source and a name, or --manifest")

    print(f"installing {len(pairs)} file(s) into {ART}")
    ok = sum(install(s, n) for s, n in pairs)
    print(f"\n{ok}/{len(pairs)} installed")
    return 0 if ok == len(pairs) else 1


if __name__ == "__main__":
    sys.exit(main())
