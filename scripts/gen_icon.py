"""Render the Null app icon (empty-set mark) to PNG / ICO / ICNS with Pillow only.

Supersampled 2x, then downscaled for smooth edges. The mark is built with an
explicit mask (outer disc minus inner disc, slash clipped to the outer disc)
because Pillow draws ellipse outlines inward, not centered.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import math
import os

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")
os.makedirs(OUT, exist_ok=True)

SS = 2048          # supersample size
S = 1024           # final size
k = SS / S
CX, CY = 512 * k, 524 * k
ROUT = 308 * k     # ring outer radius
RIN = 204 * k      # ring inner radius
HALF = 52 * k      # slash half-width
BLUE_TOP = (143, 176, 255)
BLUE_BOT = (61, 104, 224)


def vgrad(w, h, top, bottom):
    img = Image.new("RGB", (1, h))
    px = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        px[0, y] = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
    return img.resize((w, h), Image.BILINEAR)


img = vgrad(SS, SS, (26, 34, 62), (11, 15, 30)).convert("RGBA")

sheen = Image.new("RGBA", (SS, SS), (0, 0, 0, 0))
ImageDraw.Draw(sheen).ellipse([-410 * k, -640 * k, 1434 * k, 290 * k],
                              fill=(255, 255, 255, 13))
img = Image.alpha_composite(img, sheen)

glow = Image.new("RGBA", (SS, SS), (0, 0, 0, 0))
dg = ImageDraw.Draw(glow)
for i in range(24, 0, -1):
    a = int(72 * (1 - i / 24) ** 1.7)
    r = 380 * k * i / 24
    dg.ellipse([CX - r, CY - r, CX + r, CY + r], fill=(91, 140, 255, a))
glow = glow.filter(ImageFilter.GaussianBlur(int(18 * k)))
img = Image.alpha_composite(img, glow)

# --- mark mask: annulus + slash clipped to outer disc ---
ux, uy = 1 / math.sqrt(2), -1 / math.sqrt(2)   # up-right diagonal
px_, py_ = -uy, ux                              # perpendicular
L = ROUT + HALF * 2


def corner(s, w):
    return (CX + ux * s + px_ * w, CY + uy * s + py_ * w)


corners = [corner(-L, -HALF), corner(L, -HALF), corner(L, HALF), corner(-L, HALF)]

slash = Image.new("L", (SS, SS), 0)
ImageDraw.Draw(slash).polygon(corners, fill=255)
outer = Image.new("L", (SS, SS), 0)
ImageDraw.Draw(outer).ellipse([CX - ROUT, CY - ROUT, CX + ROUT, CY + ROUT], fill=255)
inner = Image.new("L", (SS, SS), 0)
ImageDraw.Draw(inner).ellipse([CX - RIN, CY - RIN, CX + RIN, CY + RIN], fill=255)
mark_mask = ImageChops.multiply(slash, outer)
ring = ImageChops.subtract(outer, inner)
mark_mask = ImageChops.lighter(mark_mask, ring)
mark_mask = mark_mask.filter(ImageFilter.GaussianBlur(1.5 * k))

blue = vgrad(SS, SS, BLUE_TOP, BLUE_BOT).convert("RGBA")
blue.putalpha(Image.new("L", (SS, SS), 255))
mark_layer = Image.new("RGBA", (SS, SS), (0, 0, 0, 0))
mark_layer.paste(blue, (0, 0), mark_mask)
img = Image.alpha_composite(img, mark_layer)

# crisp highlight arc riding the band center
hi = Image.new("RGBA", (SS, SS), (0, 0, 0, 0))
RMID = (ROUT + RIN) / 2
ImageDraw.Draw(hi).arc([CX - RMID, CY - RMID, CX + RMID, CY + RMID],
                       start=150, end=235, fill=(255, 255, 255, 64), width=int(13 * k))
img = Image.alpha_composite(img, hi)

mask = Image.new("L", (SS, SS), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, SS, SS], radius=int(224 * k), fill=255)
bg = Image.new("RGBA", (SS, SS), (0, 0, 0, 0))
bg.paste(img, (0, 0), mask)
border = Image.new("RGBA", (SS, SS), (0, 0, 0, 0))
ImageDraw.Draw(border).rounded_rectangle([3 * k, 3 * k, SS - 3 * k, SS - 3 * k],
                                         radius=int(221 * k),
                                         outline=(255, 255, 255, 24), width=int(4 * k))
out = Image.alpha_composite(bg, border)
out = out.resize((S, S), Image.LANCZOS)

out.save(os.path.join(OUT, "icon.png"))
out.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, "icon-512.png"))
out.save(os.path.join(OUT, "icon.ico"),
         sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
notes = ["icon.png", "icon-512.png", "icon.ico"]
try:
    out.save(os.path.join(OUT, "icon.icns"),
             sizes=[(16, 16), (32, 32), (64, 64), (128, 128), (256, 256), (512, 512),
                    (1024, 1024)])
    notes.append("icon.icns")
except Exception as e:  # noqa: BLE001
    notes.append(f"icon.icns FAILED ({e})")
print("wrote:", " ".join(notes))
