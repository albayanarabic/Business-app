from pathlib import Path

from PIL import Image


ROOT = Path(__file__).parent
PUBLIC = ROOT / "public"
SOURCE = PUBLIC / "biztrack-logo-source.png"
RESAMPLING = Image.Resampling.LANCZOS
MASKABLE_PADDING = 0.17


def resize_logo(size: int) -> Image.Image:
    with Image.open(SOURCE) as source:
        if source.width != source.height:
            raise ValueError(f"Expected a square logo image, got {source.size}")
        return source.convert("RGBA").resize((size, size), RESAMPLING)


def make_padded_icon(size: int, padding_ratio: float, transparent: bool) -> Image.Image:
    background = (0, 0, 0, 0) if transparent else (0, 0, 0, 255)
    icon = Image.new("RGBA", (size, size), background)
    logo_size = round(size * (1 - 2 * padding_ratio))
    logo = resize_logo(logo_size)
    offset = (size - logo_size) // 2
    icon.alpha_composite(logo, (offset, offset))
    return icon


def save_png(image: Image.Image, name: str) -> None:
    image.save(PUBLIC / name, "PNG", optimize=True)
    print(f"Generated public/{name} ({image.width}x{image.height})")


PUBLIC.mkdir(exist_ok=True)

for size in (192, 512):
    save_png(resize_logo(size), f"icon-{size}.png")
    save_png(
        make_padded_icon(size, MASKABLE_PADDING, False),
        f"icon-maskable-{size}.png",
    )

save_png(resize_logo(180), "apple-touch-icon.png")
save_png(resize_logo(16), "favicon-16x16.png")
save_png(resize_logo(32), "favicon-32x32.png")
save_png(
    make_padded_icon(512, MASKABLE_PADDING, True),
    "adaptive-icon-foreground.png",
)
save_png(Image.new("RGBA", (512, 512), (0, 0, 0, 255)), "adaptive-icon-background.png")

favicon = resize_logo(48)
favicon.save(
    PUBLIC / "favicon.ico",
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48)],
)
print("Generated public/favicon.ico (16x16, 32x32, 48x48)")
