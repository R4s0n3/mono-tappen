#!/usr/bin/env python3
"""Draw the Tappen mark on the navy brand background for the iOS icon and splash."""

import subprocess
import tempfile
from pathlib import Path

from PIL import Image

NAVY = (0x1D, 0x1F, 0x2F)
NATIVE = Path(__file__).resolve().parents[1]
LOGO = NATIVE.parents[1] / "play" / "public" / "logo.svg"
ICON = NATIVE / "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png"
SPLASH = NATIVE / "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png"


def render_logo(height: int) -> Image.Image:
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as handle:
        out = Path(handle.name)
    subprocess.check_call(["rsvg-convert", "-h", str(height), "-o", str(out), str(LOGO)])
    image = Image.open(out).convert("RGBA")
    out.unlink()
    return image


def compose(size: int, mark_height: int) -> Image.Image:
    canvas = Image.new("RGB", (size, size), NAVY)
    mark = render_logo(mark_height)
    canvas.paste(mark, ((size - mark.width) // 2, (size - mark.height) // 2), mark)
    return canvas


def main() -> None:
    icon = compose(1024, 620)
    if icon.mode != "RGB":
        raise SystemExit("app icon must not have an alpha channel")
    icon.save(ICON, "PNG", optimize=True)

    splash = compose(2732, 980)
    splash.save(SPLASH, "PNG", optimize=True)
    for extra in ("splash-2732x2732-1.png", "splash-2732x2732-2.png"):
        splash.save(SPLASH.with_name(extra), "PNG", optimize=True)
    print(f"wrote {ICON.name} and splash")


if __name__ == "__main__":
    main()
