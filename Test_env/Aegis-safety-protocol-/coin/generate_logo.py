"""
generate_logo.py — Generates the $SIGNAL logo
The NoiseAsset aesthetic: Gaussian gray noise, 6 levels, red pixel center.
"""

import numpy as np
from PIL import Image, ImageDraw, ImageFont
import io

def generate_signal_logo(size=512, save_path="logo.png"):
    np.random.seed(2026)

    # Base: Gaussian gray noise quantized to 6 levels
    gray_levels = [30, 70, 110, 150, 190, 230]
    raw = np.random.normal(128, 45, (size, size))
    raw = np.clip(raw, 0, 255).astype(int)

    quantized = np.zeros_like(raw)
    boundaries = [50, 90, 130, 170, 210, 256]
    for i, (level, bound) in enumerate(zip(gray_levels, boundaries)):
        if i == 0:
            quantized[raw < bound] = level
        else:
            prev_bound = boundaries[i-1]
            quantized[(raw >= prev_bound) & (raw < bound)] = level

    # RGB
    img_array = np.stack([quantized, quantized, quantized], axis=2).astype(np.uint8)

    # Red signal pixel — dead center, 4x4 for visibility at small sizes
    cx, cy = size // 2, size // 2
    r = size // 64  # 8px at 512
    img_array[cy-r:cy+r, cx-r:cx+r] = [255, 0, 0]

    img = Image.fromarray(img_array, 'RGB')

    # Save
    img.save(save_path, format='PNG')
    print(f"Logo saved: {save_path} ({size}x{size})")
    return save_path


if __name__ == "__main__":
    generate_signal_logo(512, "logo.png")
    generate_signal_logo(256, "logo_256.png")
    print("Done. Use logo.png for Pump.fun upload.")
