from pathlib import Path
import os
import runpy
from PIL import ImageDraw

_original_point = ImageDraw.ImageDraw.point


def _coerce_fill(fill):
    if isinstance(fill, tuple):
        coerced = []
        for value in fill:
            if isinstance(value, float):
                if 0.0 <= value <= 1.0:
                    value = int(round(value * 255))
                else:
                    value = int(round(value))
            coerced.append(max(0, min(255, int(value))))
        return tuple(coerced)
    return fill


def _patched_point(self, xy, fill=None):
    return _original_point(self, xy, fill=_coerce_fill(fill))


ImageDraw.ImageDraw.point = _patched_point
script_path = Path(__file__).with_name("Echo_Wallpaper.py")
os.chdir(script_path.parent)
runpy.run_path(str(script_path), run_name="__main__")
