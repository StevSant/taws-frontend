from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


PITCH_DIR = Path(__file__).parents[1] / "public" / "pitch"
OUTPUT_SIZE = (1280, 720)
SLIDES = (
    ("product-radar.png", "1  RADAR - que se mueve y por que"),
    ("product-chat.png", "2  CHAT - respuesta con contexto y fuentes"),
    ("product-scenarios.png", "3  SCENARIO LAB - ensayar que podria pasar"),
)


def fit_image(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGB")
    ratio = max(OUTPUT_SIZE[0] / image.width, OUTPUT_SIZE[1] / image.height)
    image = image.resize(
        (round(image.width * ratio), round(image.height * ratio)),
        Image.Resampling.LANCZOS,
    )
    left = (image.width - OUTPUT_SIZE[0]) // 2
    top = (image.height - OUTPUT_SIZE[1]) // 2
    return image.crop((left, top, left + OUTPUT_SIZE[0], top + OUTPUT_SIZE[1]))


def add_caption(image: Image.Image, caption: str) -> Image.Image:
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    title_font = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 28)
    footer_font = ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf", 18)
    draw.rectangle((0, 0, 1280, 74), fill=(5, 5, 5, 230))
    draw.text((34, 20), caption, font=title_font, fill=(255, 216, 103, 255))
    draw.rectangle((0, 684, 1280, 720), fill=(5, 5, 5, 220))
    draw.text(
        (34, 690),
        "MIDAS - producto real - taws-frontend.vercel.app",
        font=footer_font,
        fill=(210, 205, 194, 255),
    )
    return Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")


def main() -> None:
    slides = [
        add_caption(fit_image(PITCH_DIR / filename), caption)
        for filename, caption in SLIDES
    ]
    frames: list[Image.Image] = []
    for index, slide in enumerate(slides):
        frames.extend(slide.copy() for _ in range(18))
        if index < len(slides) - 1:
            frames.extend(
                Image.blend(slide, slides[index + 1], step / 9)
                for step in range(1, 9)
            )
    output = PITCH_DIR / "demo-backup.gif"
    frames[0].save(
        output,
        save_all=True,
        append_images=frames[1:],
        duration=140,
        loop=0,
        optimize=True,
    )
    print(output)


if __name__ == "__main__":
    main()
