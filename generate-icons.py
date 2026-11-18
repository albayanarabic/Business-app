import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs('public', exist_ok=True)

def create_icon(size, is_maskable=False):
    # Deep navy background
    bg_color = (10, 17, 40, 255) # #0A1128
    emerald = (16, 185, 129, 255) # #10B981
    emerald_dark = (5, 150, 105, 255) # #059669
    white = (255, 255, 255, 255)
    slate_300 = (203, 213, 225, 255)

    img = Image.new('RGBA', (size, size), bg_color)
    draw = ImageDraw.Draw(img)

    # Safe zone factor for maskable icons (must stay within central 80%)
    scale = 0.72 if is_maskable else 0.88
    center = size / 2

    # Draw rounded gradient badge in the center
    badge_half = (size * scale) / 2
    x0, y0 = center - badge_half, center - badge_half
    x1, y1 = center + badge_half, center + badge_half
    corner_radius = int(size * 0.22 * scale)

    # Gradient-like inner rounded box
    draw.rounded_rectangle([x0, y0, x1, y1], radius=corner_radius, fill=(15, 23, 42, 255), outline=emerald, width=max(2, int(size * 0.02)))

    # Inner decorative glow circle
    glow_r = int(size * 0.25 * scale)
    draw.ellipse([center - glow_r, center - glow_r, center + glow_r, center + glow_r], fill=(16, 185, 129, 30))

    # Draw modern "BT" monogram or geometric monogram
    # Let's draw stylized geometric B and T
    # Base stroke width
    sw = max(3, int(size * 0.055 * scale))

    # B letter (left side)
    bx0 = center - int(size * 0.24 * scale)
    bx1 = center - int(size * 0.05 * scale)
    by0 = center - int(size * 0.20 * scale)
    by1 = center + int(size * 0.20 * scale)
    bm = (by0 + by1) / 2

    # Vertical bar of B
    draw.rectangle([bx0, by0, bx0 + sw, by1], fill=white)
    # Top bar
    draw.rectangle([bx0, by0, bx1 - sw, by0 + sw], fill=white)
    # Middle bar
    draw.rectangle([bx0, bm - sw/2, bx1 - sw, bm + sw/2], fill=emerald)
    # Bottom bar
    draw.rectangle([bx0, by1 - sw, bx1 - sw, by1], fill=white)
    # Top loop rounded
    draw.rounded_rectangle([bx1 - sw*2, by0, bx1, bm], radius=int(sw*0.8), fill=white)
    # Bottom loop rounded
    draw.rounded_rectangle([bx1 - sw*2, bm, bx1, by1], radius=int(sw*0.8), fill=emerald)

    # T letter (right side)
    tx0 = center + int(size * 0.03 * scale)
    tx1 = center + int(size * 0.25 * scale)
    tm = (tx0 + tx1) / 2
    ty0 = by0
    ty1 = by1

    # Horizontal bar of T
    draw.rectangle([tx0, ty0, tx1, ty0 + sw], fill=emerald)
    # Vertical bar of T
    draw.rectangle([tm - sw/2, ty0, tm + sw/2, ty1], fill=white)

    # Small growth arrow indicator in bottom-right corner
    ax = center + int(size * 0.22 * scale)
    ay = center + int(size * 0.16 * scale)
    ar = int(size * 0.07 * scale)
    draw.ellipse([ax - ar, ay - ar, ax + ar, ay + ar], fill=emerald)
    # Arrow diagonal
    draw.line([ax - ar*0.4, ay + ar*0.4, ax + ar*0.4, ay - ar*0.4], fill=(10, 17, 40, 255), width=max(2, int(sw*0.4)))
    draw.line([ax + ar*0.4, ay - ar*0.4, ax, ay - ar*0.4], fill=(10, 17, 40, 255), width=max(2, int(sw*0.4)))
    draw.line([ax + ar*0.4, ay - ar*0.4, ax + ar*0.4, ay], fill=(10, 17, 40, 255), width=max(2, int(sw*0.4)))

    return img

# Generate icons
create_icon(192, is_maskable=False).save('public/icon-192.png', 'PNG')
create_icon(512, is_maskable=False).save('public/icon-512.png', 'PNG')
create_icon(192, is_maskable=True).save('public/icon-maskable-192.png', 'PNG')
create_icon(512, is_maskable=True).save('public/icon-maskable-512.png', 'PNG')
create_icon(180, is_maskable=False).save('public/apple-touch-icon.png', 'PNG')
create_icon(64, is_maskable=False).save('public/favicon-32x32.png', 'PNG')

print('PWA Icons generated successfully in public/ folder!')
