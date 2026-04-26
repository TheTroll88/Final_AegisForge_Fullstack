# Tesseract OCR — Cheat Sheet

> **Path:** `C:\Program Files\Tesseract-OCR\tesseract.exe`  
> **Version:** 5.4.0  
> **Type:** Optical Character Recognition engine  
> **AegisForge Role:** OCR pipeline tool, document text extraction

---

## Basic Usage

```bash
# Extract text from image
tesseract image.png output                 # Creates output.txt
tesseract image.png stdout                 # Print to console
tesseract image.png -                      # Print to stdout (piping)

# Specify language
tesseract image.png output -l eng          # English (default)
tesseract image.png output -l spa          # Spanish
tesseract image.png output -l eng+fra      # Multiple languages

# Output formats
tesseract image.png output                 # Plain text (.txt)
tesseract image.png output pdf             # Searchable PDF
tesseract image.png output hocr            # HOCR (HTML with coordinates)
tesseract image.png output tsv             # Tab-separated values (with confidence)
tesseract image.png output txt pdf         # Multiple outputs at once
```

---

## Page Segmentation Modes (--psm)

Controls how Tesseract analyzes the image layout.

```bash
tesseract image.png output --psm 6        # Single block of text (most common)
```

| PSM | Mode | Use For |
|---|---|---|
| 0 | OSD only | Detect orientation & script |
| 1 | Auto + OSD | Auto with orientation detection |
| 3 | Auto (default) | General-purpose |
| 4 | Single column | Column of text |
| 6 | Single block | **Most common** — uniform text block |
| 7 | Single line | One line of text |
| 8 | Single word | One word |
| 9 | Single word (circle) | Word in a circle |
| 10 | Single character | One character |
| 11 | Sparse text | Find text anywhere in image |
| 12 | Sparse + OSD | Sparse with orientation detection |
| 13 | Raw line | Treat as single line, no analysis |

---

## OCR Engine Modes (--oem)

```bash
tesseract image.png output --oem 1        # LSTM neural network (best quality)
```

| OEM | Engine | Quality |
|---|---|---|
| 0 | Legacy | Fast, less accurate |
| 1 | LSTM | **Best accuracy** (default in 5.x) |
| 2 | Legacy + LSTM | Combined |
| 3 | Default | Auto-select best available |

---

## Configuration Variables

```bash
# Whitelist characters (only recognize these)
tesseract image.png output -c tessedit_char_whitelist=0123456789

# Blacklist characters (never recognize these)
tesseract image.png output -c tessedit_char_blacklist=|~`

# Digits only
tesseract image.png output -c tessedit_char_whitelist=0123456789.,$

# Preserve interword spaces
tesseract image.png output -c preserve_interword_spaces=1
```

---

## Language Data

```bash
# List installed languages
tesseract --list-langs

# Install additional languages:
# Download .traineddata files from:
# https://github.com/tesseract-ocr/tessdata_best (best accuracy)
# https://github.com/tesseract-ocr/tessdata_fast (faster)
# Place in: C:\Program Files\Tesseract-OCR\tessdata\
```

---

## Python Integration

```python
# pip install pytesseract Pillow

import pytesseract
from PIL import Image

# Set Tesseract path (Windows)
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Basic OCR
text = pytesseract.image_to_string(Image.open('image.png'))
print(text)

# With language
text = pytesseract.image_to_string(Image.open('image.png'), lang='eng')

# With config
text = pytesseract.image_to_string(
    Image.open('image.png'),
    config='--psm 6 --oem 1'
)

# Get bounding boxes (word positions)
data = pytesseract.image_to_data(Image.open('image.png'), output_type=pytesseract.Output.DICT)
for i, word in enumerate(data['text']):
    if word.strip():
        print(f"{word}: ({data['left'][i]}, {data['top'][i]}) conf={data['conf'][i]}")

# Get confidence scores
data = pytesseract.image_to_data(Image.open('image.png'), output_type=pytesseract.Output.DATAFRAME)
high_conf = data[data['conf'] > 80]

# PDF output
pdf_bytes = pytesseract.image_to_pdf_or_hocr(Image.open('image.png'), extension='pdf')
with open('searchable.pdf', 'wb') as f:
    f.write(pdf_bytes)
```

---

## Image Preprocessing Tips

For best OCR results, preprocess images:

```python
from PIL import Image, ImageFilter, ImageEnhance
import pytesseract

img = Image.open('image.png')

# Convert to grayscale
img = img.convert('L')

# Increase contrast
enhancer = ImageEnhance.Contrast(img)
img = enhancer.enhance(2.0)

# Resize (upscale small text)
img = img.resize((img.width * 2, img.height * 2), Image.LANCZOS)

# Sharpen
img = img.filter(ImageFilter.SHARPEN)

# Binarize (black/white)
img = img.point(lambda x: 0 if x < 128 else 255)

text = pytesseract.image_to_string(img, config='--psm 6')
```

---

## Batch Processing

```powershell
# OCR all images in a folder
Get-ChildItem *.png | ForEach-Object {
    $out = $_.BaseName
    tesseract $_.FullName $out --psm 6
    Write-Host "Processed: $($_.Name) → $out.txt"
}
```

```bash
# Bash equivalent
for img in *.png; do
    tesseract "$img" "${img%.png}" --psm 6
    echo "Processed: $img"
done
```
