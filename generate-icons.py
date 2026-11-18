import os
import math
from PIL import Image, ImageDraw

def render_biztrack_icon(target_size, is_maskable=False):
    # Render at 4x resolution for pristine anti-aliasing
    scale = 4
    w = target_size * scale
    h = target_size * scale
    
    # Brand colors
    bg_navy = (10, 17, 40, 255)          # #0A1128
    bg_surface = (15, 27, 58, 255)       # #0F1B3A
    emerald = (16, 185, 129, 255)        # #10B981
    emerald_bright = (52, 211, 153, 255) # #34D399
    white = (255, 255, 255, 255)
    
    img = Image.new('RGBA', (w, h), bg_navy)
    draw = ImageDraw.Draw(img)
    
    # Safe zone factor (Android maskable icons require content inside central 66%)
    content_scale = 0.62 if is_maskable else 0.76
    
    cx = w / 2
    cy = h / 2
    
    # Subtle inner rounded card for standard non-maskable icons
    if not is_maskable:
        pad = w * 0.04
        r = int(w * 0.22)
        draw.rounded_rectangle(
            [pad, pad, w - pad, h - pad],
            radius=r,
            fill=bg_surface,
            outline=(16, 185, 129, 70),
            width=max(2, int(w * 0.015))
        )
    
    # Design of the "Growth & Records" symbol:
    # 3 bold vertical ascending rounded bars representing Records, Sales, and Profit
    # with an energetic ascending surge arrow pointing 45° to the top right.
    sym_w = w * content_scale
    sym_h = h * content_scale
    
    # Positioning
    baseline_y = cy + sym_h * 0.38
    bar_w = sym_w * 0.20
    gap = sym_w * 0.08
    
    # Heights of the 3 ascending bars:
    # Bar 1 (Left - Records): 38%
    # Bar 2 (Middle - Sales): 64%
    # Bar 3 (Right - Profit/Growth): 90%
    h1 = sym_h * 0.38
    h2 = sym_h * 0.64
    h3 = sym_h * 0.90
    
    # Coordinate X positions (centered)
    total_bars_w = bar_w * 3 + gap * 2
    start_x = cx - total_bars_w / 2
    
    # Bar 1 (Left) - White pill
    b1_x0 = start_x
    b1_x1 = b1_x0 + bar_w
    b1_y0 = baseline_y - h1
    r_bar = int(bar_w / 2)
    draw.rounded_rectangle([b1_x0, b1_y0, b1_x1, baseline_y], radius=r_bar, fill=white)
    
    # Bar 2 (Center) - Emerald green (#10B981)
    b2_x0 = b1_x1 + gap
    b2_x1 = b2_x0 + bar_w
    b2_y0 = baseline_y - h2
    draw.rounded_rectangle([b2_x0, b2_y0, b2_x1, baseline_y], radius=r_bar, fill=emerald)
    
    # Bar 3 (Right) - Vivid Emerald (#34D399)
    b3_x0 = b2_x1 + gap
    b3_x1 = b3_x0 + bar_w
    b3_y0 = baseline_y - h3
    draw.rounded_rectangle([b3_x0, b3_y0, b3_x1, baseline_y], radius=r_bar, fill=emerald_bright)
    
    # Dynamic Upward Growth Arrow:
    # A bold 45-degree arrow positioned above/crossing towards the top right
    # Arrow tip points to top-right
    arrow_stroke = max(4, int(sym_w * 0.10))
    arrow_tip_x = b3_x1 + sym_w * 0.06
    arrow_tip_y = b3_y0 - sym_h * 0.12
    arrow_wing_len = sym_w * 0.22
    
    # Stem of arrow coming upwards from left
    stem_start_x = b1_x0 - sym_w * 0.02
    stem_start_y = b1_y0 - sym_h * 0.02
    
    # Draw arrow stem
    draw.line([stem_start_x, stem_start_y, arrow_tip_x, arrow_tip_y], fill=white, width=arrow_stroke)
    # Rounded cap at start of stem
    draw.ellipse(
        [stem_start_x - arrow_stroke/2, stem_start_y - arrow_stroke/2,
         stem_start_x + arrow_stroke/2, stem_start_y + arrow_stroke/2],
        fill=white
    )
    
    # Arrowhead wings (horizontal left and vertical down from tip)
    draw.line([arrow_tip_x, arrow_tip_y, arrow_tip_x - arrow_wing_len, arrow_tip_y], fill=white, width=arrow_stroke)
    draw.line([arrow_tip_x, arrow_tip_y, arrow_tip_x, arrow_tip_y + arrow_wing_len], fill=white, width=arrow_stroke)
    
    # Rounded joints for arrowhead
    draw.ellipse(
        [arrow_tip_x - arrow_stroke/2, arrow_tip_y - arrow_stroke/2,
         arrow_tip_x + arrow_stroke/2, arrow_tip_y + arrow_stroke/2],
        fill=white
    )
    draw.ellipse(
        [arrow_tip_x - arrow_wing_len - arrow_stroke/2, arrow_tip_y - arrow_stroke/2,
         arrow_tip_x - arrow_wing_len + arrow_stroke/2, arrow_tip_y + arrow_stroke/2],
        fill=white
    )
    draw.ellipse(
        [arrow_tip_x - arrow_stroke/2, arrow_tip_y + arrow_wing_len - arrow_stroke/2,
         arrow_tip_x + arrow_stroke/2, arrow_tip_y + arrow_wing_len + arrow_stroke/2],
        fill=white
    )
    
    # Center accent pip in arrowhead
    pip_r = int(arrow_stroke * 0.5)
    pip_cx = arrow_tip_x - arrow_wing_len * 0.35
    pip_cy = arrow_tip_y + arrow_wing_len * 0.35
    draw.ellipse([pip_cx - pip_r, pip_cy - pip_r, pip_cx + pip_r, pip_cy + pip_r], fill=emerald)

    # Downscale with high quality Lanczos filter for perfect antialiasing
    return img.resize((target_size, target_size), Image.Resampling.LANCZOS)


def generate_svg():
    svg_content = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <!-- Background Badge -->
  <rect width="100" height="100" rx="22" fill="#0A1128"/>
  <rect x="4" y="4" width="92" height="92" rx="18" fill="#0F1B3A" stroke="#10B981" stroke-width="1.5" stroke-opacity="0.3"/>
  
  <!-- Ascending Growth Pillars -->
  <!-- Bar 1: White (Records) -->
  <rect x="22" y="55" width="14" height="27" rx="7" fill="#FFFFFF"/>
  <!-- Bar 2: Emerald Green (Sales) -->
  <rect x="43" y="38" width="14" height="44" rx="7" fill="#10B981"/>
  <!-- Bar 3: Bright Emerald (Profit/Growth) -->
  <rect x="64" y="21" width="14" height="61" rx="7" fill="#34D399"/>
  
  <!-- Dynamic Upward Growth Arrow -->
  <path d="M 21 52 L 78 18" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round"/>
  <path d="M 64 18 L 78 18 L 78 32" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Accent Pip -->
  <circle cx="73" cy="23" r="2.5" fill="#10B981"/>
</svg>"""
    return svg_content

# Generate all required PWA icons
os.makedirs('public', exist_ok=True)

icons_to_make = [
    ('public/icon-512.png', 512, False),
    ('public/icon-192.png', 192, False),
    ('public/icon-maskable-512.png', 512, True),
    ('public/icon-maskable-192.png', 192, True),
    ('public/apple-touch-icon.png', 180, False),
    ('public/favicon-32x32.png', 32, False),
]

for path, size, maskable in icons_to_make:
    img = render_biztrack_icon(size, is_maskable=maskable)
    img.save(path, 'PNG', optimize=True)
    print(f"Generated {path} ({size}x{size}, maskable={maskable})")

# Write SVG
svg_text = generate_svg()
with open('public/favicon.svg', 'w', encoding='utf-8') as f:
    f.write(svg_text)
print("Generated public/favicon.svg")

with open('public/icons.svg', 'w', encoding='utf-8') as f:
    f.write(svg_text)
print("Generated public/icons.svg")

# Clean up test icon
if os.path.exists('public/test-icon.png'):
    os.remove('public/test-icon.png')

print("All branding assets generated successfully!")
