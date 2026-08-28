from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"


def resized(image: Image.Image, width: int) -> Image.Image:
    if image.width <= width:
        return image.copy()
    height = round(image.height * width / image.width)
    return image.resize((width, height), Image.Resampling.LANCZOS)


def save_webp(source: Image.Image, name: str, width: int, quality: int = 82) -> None:
    resized(source, width).save(
        ASSETS / name,
        "WEBP",
        quality=quality,
        method=6,
        exif=b"",
    )


book_path = ASSETS / "book-cover.jpg"
book = ImageOps.exif_transpose(Image.open(book_path)).convert("RGB")
book.save(book_path, "JPEG", quality=82, optimize=True, progressive=True, exif=b"")
for target_width in (480, 800, 1200):
    save_webp(book, f"book-cover-{target_width}.webp", target_width)

author_path = ASSETS / "gareth-mackenzie-author.jpeg"
author = ImageOps.exif_transpose(Image.open(author_path)).convert("RGB")
author.save(author_path, "JPEG", quality=84, optimize=True, progressive=True, exif=b"")
for target_width in (640, 1200):
    save_webp(author, f"gareth-mackenzie-author-{target_width}.webp", target_width, quality=84)

social = ImageOps.exif_transpose(Image.open(ASSETS / "social-card.png")).convert("RGB")
social.save(ASSETS / "social-card.jpg", "JPEG", quality=84, optimize=True, progressive=True, exif=b"")
