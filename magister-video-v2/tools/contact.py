"""Build a labelled contact sheet from QC stills:  python3 tools/contact.py out/qc sheet.png [cols]"""
import sys, os, glob
from PIL import Image, ImageDraw
src, dst = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 4
files = sorted(glob.glob(os.path.join(src, 'f_*.png')))
tw, th = 640, 360
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw, rows * (th + 22)), (20, 20, 20))
d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((tw, th), Image.LANCZOS)
    x, y = (i % cols) * tw, (i // cols) * (th + 22)
    sheet.paste(im, (x, y + 22))
    d.text((x + 6, y + 5), os.path.basename(f)[2:-4] + 's', fill=(230, 230, 230))
sheet.save(dst)
