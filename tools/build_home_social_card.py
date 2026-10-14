"""Build the author-led homepage social card (assets/social-card-home.jpg, 1200x630).

Gareth's portrait and name lead; BUILT sits beside the portrait as the current flagship work, echoing the
homepage hero. The dedicated BUILT page keeps its book-led card (assets/social-card.jpg).
Uses the site's own fonts (assets/fonts, converted to temporary static TTFs) and portrait/cover assets.
Requires: pip install pillow fonttools brotli. Run from the repository root: python tools/build_home_social_card.py
"""
import tempfile
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
W, H = 1200, 630
GROUND, INK, INK2, GOLD, GOLD_HI = (14, 18, 22), (244, 238, 226), (195, 197, 198), (217, 178, 115), (239, 207, 155)


def static_font(name: str, axes: dict, directory: Path) -> Path:
    font = instancer.instantiateVariableFont(TTFont(ROOT / "assets" / "fonts" / name), axes)
    out = directory / f"{name}-{'-'.join(f'{k}{v}' for k, v in axes.items())}.ttf"
    font.flavor = None
    font.save(out)
    return out


def tracked(draw: ImageDraw.ImageDraw, xy, text: str, font, fill, spacing: float) -> None:
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        x += draw.textlength(ch, font=font) + spacing


def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        display = static_font("newsreader-latin-opsz-normal.woff2", {"opsz": 72, "wght": 400}, tmp)
        italic = static_font("newsreader-latin-wght-italic.woff2", {"wght": 400}, tmp)
        sans = static_font("instrument-sans-latin-wght-normal.woff2", {"wght": 600}, tmp)
        f_name = ImageFont.truetype(str(display), 72)
        f_book = ImageFont.truetype(str(display), 46)
        f_sub = ImageFont.truetype(str(italic), 19)
        f_lead = ImageFont.truetype(str(italic), 28)
        f_label = ImageFont.truetype(str(sans), 15)
        f_url = ImageFont.truetype(str(sans), 17)

        canvas = Image.new("RGB", (W, H), GROUND)
        draw = ImageDraw.Draw(canvas)

        # Left column: the author.
        tracked(draw, (72, 100), "AUTHOR · WRITER · SYSTEMS THINKER", f_label, GOLD, 3.2)
        draw.text((72, 134), "Gareth Andrew", font=f_name, fill=INK)
        draw.text((72, 212), "Mackenzie.", font=f_name, fill=GOLD_HI)
        draw.text((72, 336), "Author of BUILT, writing about wealth,", font=f_lead, fill=INK2)
        draw.text((72, 372), "systems, risk and decision-making.", font=f_lead, fill=INK2)
        draw.line([(72, 520), (140, 520)], fill=GOLD, width=2)
        tracked(draw, (72, 536), "MACKENZIEBOOKS.BBROOT.COM", f_url, (142, 147, 154), 2.4)

        # Right: portrait plate, tinted like the homepage (multiply with warm paper).
        portrait = Image.open(ROOT / "assets" / "gareth-mackenzie-author.jpeg").convert("RGB")
        pw = 450
        ph = round(pw * portrait.height / portrait.width)
        portrait = portrait.resize((pw, ph), Image.LANCZOS)
        portrait = ImageChops.multiply(portrait, Image.new("RGB", portrait.size, (233, 224, 205)))
        px, py = 610, 100
        canvas.paste(portrait, (px, py))

        # Flagship cover overlapping the plate's lower right, with a soft contact shadow.
        cover = Image.open(ROOT / "assets" / "book-cover.jpg").convert("RGB")
        cw = 170
        ch = round(cw * cover.height / cover.width)
        cover = cover.resize((cw, ch), Image.LANCZOS)
        cx, cy = 1140 - cw, py + ph - 150
        shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(shadow).rectangle([cx + 6, cy + 34, cx + cw - 2, cy + ch + 26], fill=(0, 0, 0, 215))
        shadow = shadow.filter(ImageFilter.GaussianBlur(24))
        canvas = Image.alpha_composite(canvas.convert("RGBA"), shadow).convert("RGB")
        canvas.paste(cover, (cx, cy))
        draw = ImageDraw.Draw(canvas)
        draw.rectangle([cx - 1, cy - 1, cx + cw, cy + ch], outline=(70, 74, 78), width=1)

        # Book caption under the portrait: secondary to the author, same hierarchy as the hero.
        tracked(draw, (px, py + ph + 38), "CURRENT FLAGSHIP WORK", f_label, GOLD, 2.8)
        draw.text((px, py + ph + 60), "BUILT", font=f_book, fill=INK)
        draw.text((px, py + ph + 116), "How Wealth Is Deliberately Constructed", font=f_sub, fill=INK2)

        out = ROOT / "assets" / "social-card-home.jpg"
        canvas.save(out, "JPEG", quality=88, optimize=True, progressive=True, subsampling=0)
        print(f"{out.relative_to(ROOT)}: {canvas.size[0]}x{canvas.size[1]}, {out.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
