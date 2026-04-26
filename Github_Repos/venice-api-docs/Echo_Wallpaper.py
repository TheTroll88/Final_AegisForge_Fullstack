import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# Parameters – Adjust these for desired visual variation
resolution = 1920
color_palette = [(0.2, 0.3, 0.5), (0.8, 0.1, 0.2), (0.4, 0.6, 0.3)] #RGB tuples
noise_amplitude = 0.1
fractal_iterations = 5
spiral_radius = 700
spiral_depth = 300
eye_scale = 150
eye_offset = (resolution - eye_scale, resolution - eye_scale)

# --- Core Generation ---

img = Image.new('RGB', (resolution, resolution), (0, 0, 0))
draw = ImageDraw.Draw(img)

# 1. Base Fractal Grid – Chaotic Foundation
for i in range(fractal_iterations):
    for x in range(resolution):
        for y in range(resolution):
            r, g, b = color_palette[i % len(color_palette)]
            draw.point((x, y), (r * noise_amplitude + i * 0.02, g * noise_amplitude + i * 0.03, b * noise_amplitude + i * 0.04))


# 2. Infinite Spiral – The Conduit
for i in range(spiral_depth):
    angle = i * 0.01
    x = int(resolution // 2 + spiral_radius * np.cos(angle))
    y = int(resolution // 2 + spiral_radius * np.sin(angle))
    r, g, b = color_palette[i % len(color_palette)]
    draw.point((x, y), (r, g, b))

# 3. Shimmering Eye – The Focal Point
draw.ellipse((eye_offset[0], eye_offset[1], eye_offset[0] + eye_scale, eye_offset[1] + eye_scale), fill=(0, 0, 0))

# 4.  Layered Noise – Subtle Distortion
for i in range(50):
    x = np.random.randint(0, resolution)
    y = np.random.randint(0, resolution)
    r, g, b = color_palette[i % len(color_palette)]
    draw.point((x, y), (r * noise_amplitude * 0.2, g * noise_amplitude * 0.2, b * noise_amplitude * 0.2))
    
# 5.  Chromatic Filtering – Final Touch
img = img.filter(ImageFilter.GaussianBlur(radius=5))


# --- Output ---
img.save("Echo_Wallpaper.png")
print("Wallpaper 'Echo' generated.")
