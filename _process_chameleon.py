#!/usr/bin/env python3
"""新カメレオン画像4枚を統一処理する。
- 左上のアルファベット(A/B/C/D)を連結成分判定で自動除去
- カメレオン本体(最大連結成分)を切り抜き
- 1200x1200 白背景キャンバスの中央に同スケールで配置 → JPG出力
"""
from PIL import Image
import numpy as np
from scipy import ndimage

CANVAS = 1200          # 出力キャンバス(profile_camereon.jpg と同寸)
TARGET = int(CANVAS * 0.86)  # カメレオンの最長辺をこのpxに揃える
THRESH = 200           # これより暗ければ「インク」とみなす

SOURCES = {
    "a": "cameleon_a.webp",
    "b": "cameleon_b.webp",
    "c": "cameleon_c_page-1.png",  # PDFから変換済み
    "d": "cameleon_d.webp",
}


def process(key, src):
    im = Image.open(src).convert("RGB")
    arr = np.asarray(im.convert("L"))
    ink = arr < THRESH  # True=インク

    # 連結成分ラベリング(8近傍)
    structure = np.ones((3, 3), dtype=int)
    labels, n = ndimage.label(ink, structure=structure)
    if n == 0:
        raise RuntimeError(f"{src}: インクが見つからない")

    H, W = arr.shape
    sizes = ndimage.sum(np.ones_like(labels), labels, index=range(1, n + 1))
    # 最大成分 = カメレオン本体。
    body = int(np.argmax(sizes)) + 1

    # 本体以外で「左上隅(x<40%, y<40%)」に重心がある成分 = アルファベット。
    # それらを元画像上で白に塗りつぶして除去する。
    centroids = ndimage.center_of_mass(np.ones_like(labels), labels,
                                       index=range(1, n + 1))
    from PIL import ImageDraw
    draw = ImageDraw.Draw(im)
    PAD = 22  # アンチエイリアスの薄い残像まで消すための余白
    removed = []
    for lab in range(1, n + 1):
        if lab == body:
            continue
        cy, cx = centroids[lab - 1]
        if cx < W * 0.40 and cy < H * 0.40 and sizes[lab - 1] > 80:
            ys_l, xs_l = np.where(labels == lab)
            bx0, bx1 = int(xs_l.min()), int(xs_l.max())
            by0, by1 = int(ys_l.min()), int(ys_l.max())
            draw.rectangle(
                [max(0, bx0 - PAD), max(0, by0 - PAD),
                 min(W - 1, bx1 + PAD), min(H - 1, by1 + PAD)],
                fill=(255, 255, 255))
            removed.append(lab)

    # 文字除去後、本体成分のbboxで切り抜く。
    ys, xs = np.where(labels == body)
    y0, y1 = ys.min(), ys.max() + 1
    x0, x1 = xs.min(), xs.max() + 1

    crop = im.crop((x0, y0, x1, y1))
    cw, ch = crop.size
    scale = TARGET / max(cw, ch)
    nw, nh = int(round(cw * scale)), int(round(ch * scale))
    crop = crop.resize((nw, nh), Image.LANCZOS)

    canvas = Image.new("RGB", (CANVAS, CANVAS), (255, 255, 255))
    canvas.paste(crop, ((CANVAS - nw) // 2, (CANVAS - nh) // 2))

    out = f"chameleon_{key}.jpg"
    canvas.save(out, "JPEG", quality=88, optimize=True)
    print(f"{src} -> {out}  文字除去={removed} bbox=({x0},{y0},{x1},{y1}) "
          f"crop={cw}x{ch} placed={nw}x{nh}")


for k, s in SOURCES.items():
    process(k, s)
print("done")
