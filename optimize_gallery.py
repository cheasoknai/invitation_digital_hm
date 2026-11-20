from pathlib import Path
from PIL import Image, ImageOps

# Project gallery folders
ROOT = Path(__file__).resolve().parent
GALLERY = ROOT / "public" / "assets" / "images" / "gallery"

SOURCE = GALLERY / "original"
OPTIMIZED = GALLERY / "optimized"
THUMBNAILS = GALLERY / "thumbnails"

OPTIMIZED.mkdir(parents=True, exist_ok=True)
THUMBNAILS.mkdir(parents=True, exist_ok=True)

# Find original JPG images
images = sorted(SOURCE.glob("photo-*.jpg"))

if len(images) != 25:
    raise SystemExit(
        f"STOP: Expected 25 original JPG images, found {len(images)}. "
        "No images were converted."
    )

def convert_image(source_path, output_path, max_size, quality):
    with Image.open(source_path) as original:
        # Correct image orientation using EXIF information
        image = ImageOps.exif_transpose(original)

        # Convert JPEG to RGB for WebP output
        image = image.convert("RGB")

        # Resize without enlarging the original
        image.thumbnail(
            (max_size, max_size),
            Image.Resampling.LANCZOS
        )

        image.save(
            output_path,
            "WEBP",
            quality=quality,
            method=6
        )

        return image.size

total_original = 0
total_optimized = 0
total_thumbnails = 0

print("\nStarting image optimization...\n")

for source in images:
    optimized_path = OPTIMIZED / f"{source.stem}.webp"
    thumbnail_path = THUMBNAILS / f"{source.stem}.webp"

    convert_image(source, optimized_path, 1920, 84)
    convert_image(source, thumbnail_path, 600, 80)

    original_size = source.stat().st_size
    optimized_size = optimized_path.stat().st_size
    thumbnail_size = thumbnail_path.stat().st_size

    total_original += original_size
    total_optimized += optimized_size
    total_thumbnails += thumbnail_size

    print(
        f"{source.name}: "
        f"Original {original_size / 1024 / 1024:.2f} MB | "
        f"Optimized {optimized_size / 1024:.1f} KB | "
        f"Thumbnail {thumbnail_size / 1024:.1f} KB"
    )

print("\n========== SUMMARY ==========")
print(f"Images converted: {len(images)}")
print(f"Original total:   {total_original / 1024 / 1024:.2f} MB")
print(f"Optimized total:  {total_optimized / 1024 / 1024:.2f} MB")
print(f"Thumbnail total:  {total_thumbnails / 1024 / 1024:.2f} MB")
print("\nOptimization completed successfully!")
print("Original JPG files were not modified.")
