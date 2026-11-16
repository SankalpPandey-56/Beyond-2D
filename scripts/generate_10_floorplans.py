import os
import json
import math
from PIL import Image, ImageDraw, ImageFont

# Canvas dimensions
CANVAS_W = 1400
CANVAS_H = 1000

# Try to load high quality font, fallback to default
try:
    FONT_TITLE = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 26)
    FONT_ROOM = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20)
    FONT_SUB = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 13)
    FONT_DIM = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 13)
    FONT_BADGE = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 11)
except Exception:
    FONT_TITLE = ImageFont.load_default()
    FONT_ROOM = ImageFont.load_default()
    FONT_SUB = ImageFont.load_default()
    FONT_DIM = ImageFont.load_default()
    FONT_BADGE = ImageFont.load_default()

PLANS_DEF = [
    {
        "id": "plan_01_studio",
        "num": "01",
        "name": "Modern Minimalist Studio",
        "archetype": "Compact Studio",
        "filename": "01_minimalist_studio.png",
        "dims": {"width": 6.0, "length": 5.5, "wallHeight": 2.8, "wallThickness": 0.22},
        "description": "Smart ultra-compact studio optimizing single-volume living, integrated kitchenette, and wet room.",
        "rooms": [
            {"id": "r1", "name": "Living & Bedroom Studio", "type": "bedroom", "relX": 0.0, "relZ": 0.0, "relW": 0.65, "relD": 1.0, "fin": "Pale oak parquet", "furniture": ["queen_bed", "nightstand", "sofa", "coffee_table", "tv_console"]},
            {"id": "r2", "name": "Kitchen & Dining Alcove", "type": "kitchen", "relX": 0.65, "relZ": 0.45, "relW": 0.35, "relD": 0.55, "fin": "Honed terrazzo", "furniture": ["kitchen_counter", "sink", "dining_table", "dining_chairs"]},
            {"id": "r3", "name": "Modern Bath & Shower", "type": "bathroom", "relX": 0.65, "relZ": 0.0, "relW": 0.35, "relD": 0.45, "fin": "Grey slate tile", "furniture": ["shower_enclosure", "toilet", "vanity_sink"]}
        ]
    },
    {
        "id": "plan_02_urban_1bhk",
        "num": "02",
        "name": "Urban 1BHK Apartment",
        "archetype": "1-Bedroom Flat",
        "filename": "02_urban_1bhk.png",
        "dims": {"width": 8.0, "length": 6.5, "wallHeight": 2.8, "wallThickness": 0.22},
        "description": "Ergonomic 1BHK urban layout featuring segregated sleeping quarters, sunlit lounge, and balcony access.",
        "rooms": [
            {"id": "r1", "name": "Master Suite", "type": "bedroom", "relX": 0.0, "relZ": 0.0, "relW": 0.52, "relD": 0.42, "fin": "White oak plank", "furniture": ["king_bed", "nightstands", "wardrobe"]},
            {"id": "r2", "name": "Ensuite Bath", "type": "bathroom", "relX": 0.52, "relZ": 0.0, "relW": 0.48, "relD": 0.42, "fin": "Carrara marble", "furniture": ["bathtub", "toilet", "vanity_sink"]},
            {"id": "r3", "name": "Living Lounge & Media", "type": "living", "relX": 0.0, "relZ": 0.42, "relW": 0.58, "relD": 0.58, "fin": "Smoked oak floor", "furniture": ["l_sofa", "coffee_table", "media_credenza", "accent_chair"]},
            {"id": "r4", "name": "Kitchen & Dining Hall", "type": "kitchen", "relX": 0.58, "relZ": 0.42, "relW": 0.42, "relD": 0.58, "fin": "Honed limestone", "furniture": ["island_counter", "barstools", "dining_table", "dining_chairs"]}
        ]
    },
    {
        "id": "plan_03_contemporary_2bhk",
        "num": "03",
        "name": "Contemporary 2BHK Residence",
        "archetype": "2-Bedroom Home",
        "filename": "03_contemporary_2bhk.png",
        "dims": {"width": 10.0, "length": 8.0, "wallHeight": 2.8, "wallThickness": 0.22},
        "description": "Balanced architectural residence with private master suite, guest room, dual bath, and welcoming porch.",
        "rooms": [
            {"id": "r1", "name": "Master Bedroom", "type": "bedroom", "relX": 0.0, "relZ": 0.0, "relW": 0.41, "relD": 0.45, "fin": "Warm walnut", "furniture": ["king_bed", "nightstands", "credenza"]},
            {"id": "r2", "name": "Central Bathroom", "type": "bathroom", "relX": 0.41, "relZ": 0.0, "relW": 0.20, "relD": 0.35, "fin": "Grey travertine", "furniture": ["shower_enclosure", "toilet", "vanity_sink"]},
            {"id": "r3", "name": "Guest Bedroom", "type": "bedroom", "relX": 0.61, "relZ": 0.0, "relW": 0.39, "relD": 0.45, "fin": "Nordic birch", "furniture": ["queen_bed", "wardrobe", "desk"]},
            {"id": "r4", "name": "Living Hall", "type": "living", "relX": 0.0, "relZ": 0.45, "relW": 0.61, "relD": 0.40, "fin": "Smoked oak", "furniture": ["sectional_sofa", "coffee_table", "reading_lamp"]},
            {"id": "r5", "name": "Gourmet Kitchen & Dining", "type": "kitchen", "relX": 0.61, "relZ": 0.45, "relW": 0.39, "relD": 0.55, "fin": "Polished basalt", "furniture": ["kitchen_island", "dining_set", "prep_counter"]},
            {"id": "r6", "name": "Entrance Porch", "type": "porch", "relX": 0.0, "relZ": 0.85, "relW": 0.41, "relD": 0.15, "fin": "Flagstone pavers", "furniture": ["bench_planter"]}
        ]
    },
    {
        "id": "plan_04_suburban_3bhk_villa",
        "num": "04",
        "name": "Suburban 3BHK Family Villa",
        "archetype": "3-Bedroom Villa",
        "filename": "04_suburban_3bhk_villa.png",
        "dims": {"width": 12.0, "length": 9.5, "wallHeight": 3.0, "wallThickness": 0.24},
        "description": "Expansive family villa with 3 secluded bedrooms, generous social spine, open chef island, and dual baths.",
        "rooms": [
            {"id": "r1", "name": "Master Suite", "type": "bedroom", "relX": 0.0, "relZ": 0.0, "relW": 0.38, "relD": 0.48, "fin": "European oak", "furniture": ["king_bed", "dual_nightstands", "armchair"]},
            {"id": "r2", "name": "Bedroom 2 (Kids)", "type": "bedroom", "relX": 0.38, "relZ": 0.0, "relW": 0.32, "relD": 0.38, "fin": "Light ash", "furniture": ["twin_beds", "study_desk"]},
            {"id": "r3", "name": "Bedroom 3 (Guest)", "type": "bedroom", "relX": 0.70, "relZ": 0.0, "relW": 0.30, "relD": 0.38, "fin": "Light ash", "furniture": ["queen_bed", "wardrobe"]},
            {"id": "r4", "name": "Family Bath", "type": "bathroom", "relX": 0.38, "relZ": 0.38, "relW": 0.20, "relD": 0.22, "fin": "Terrazzo slab", "furniture": ["bathtub", "toilet", "double_vanity"]},
            {"id": "r5", "name": "Grand Salon Living", "type": "living", "relX": 0.0, "relZ": 0.48, "relW": 0.58, "relD": 0.52, "fin": "Natural chevron oak", "furniture": ["modular_sofa", "accent_chairs", "coffee_table"]},
            {"id": "r6", "name": "Chef Island & Dining", "type": "kitchen", "relX": 0.58, "relZ": 0.38, "relW": 0.42, "relD": 0.62, "fin": "Polished granite", "furniture": ["grand_island", "barstools", "8p_dining_table"]}
        ]
    },
    {
        "id": "plan_05_industrial_loft",
        "num": "05",
        "name": "Industrial Open-Concept Loft",
        "archetype": "Double-Height Loft",
        "filename": "05_industrial_loft.png",
        "dims": {"width": 11.0, "length": 8.5, "wallHeight": 3.4, "wallThickness": 0.25},
        "description": "Dramatic open loft layout with polished concrete floors, steel-frame partitions, and monumental living volume.",
        "rooms": [
            {"id": "r1", "name": "Great Room (Living/Dining)", "type": "living", "relX": 0.0, "relZ": 0.0, "relW": 0.65, "relD": 1.0, "fin": "Polished concrete", "furniture": ["leather_sectional", "reclaimed_table", "industrial_lamp", "large_credenza"]},
            {"id": "r2", "name": "Loft Bedroom Suite", "type": "bedroom", "relX": 0.65, "relZ": 0.0, "relW": 0.35, "relD": 0.55, "fin": "Distressed pine", "furniture": ["platform_bed", "wardrobe_wall"]},
            {"id": "r3", "name": "Spa Bath & Dressing", "type": "bathroom", "relX": 0.65, "relZ": 0.55, "relW": 0.35, "relD": 0.45, "fin": "Black matte porcelain", "furniture": ["freestanding_tub", "walk_in_shower", "floating_vanity"]}
        ]
    },
    {
        "id": "plan_06_california_ranch",
        "num": "06",
        "name": "L-Shaped California Ranch",
        "archetype": "Ranch Residence",
        "filename": "06_california_ranch.png",
        "dims": {"width": 12.5, "length": 10.5, "wallHeight": 2.8, "wallThickness": 0.22},
        "description": "Non-convex L-shaped ranch design connecting internal private wings to a sheltered garden deck patio.",
        "rooms": [
            {"id": "r1", "name": "Vaulted Living Wing", "type": "living", "relX": 0.0, "relZ": 0.0, "relW": 0.55, "relD": 0.55, "fin": "Bleached oak", "furniture": ["hearth_sofa", "armchairs", "credenza"]},
            {"id": "r2", "name": "Dining & Kitchen Pavilion", "type": "kitchen", "relX": 0.55, "relZ": 0.0, "relW": 0.45, "relD": 0.45, "fin": "Limestone pavers", "furniture": ["dining_suite", "island_bar", "pantry"]},
            {"id": "r3", "name": "Private Master Suite", "type": "bedroom", "relX": 0.0, "relZ": 0.55, "relW": 0.55, "relD": 0.45, "fin": "Soft carpet & oak", "furniture": ["cal_king_bed", "dressers", "ensuite_bath"]},
            {"id": "r4", "name": "Sheltered Garden Deck", "type": "porch", "relX": 0.55, "relZ": 0.45, "relW": 0.45, "relD": 0.55, "fin": "Teak deck decking", "furniture": ["outdoor_lounge", "fire_pit_table"]}
        ]
    },
    {
        "id": "plan_07_courtyard_villa",
        "num": "07",
        "name": "Luxury Courtyard Villa",
        "archetype": "Atrium Residence",
        "filename": "07_courtyard_villa.png",
        "dims": {"width": 12.0, "length": 10.0, "wallHeight": 3.0, "wallThickness": 0.24},
        "description": "Classical central-atrium typology providing natural cross-ventilation, perimeter galleries, and serene daylighting.",
        "rooms": [
            {"id": "r1", "name": "Central Open Zen Atrium", "type": "porch", "relX": 0.35, "relZ": 0.30, "relW": 0.30, "relD": 0.35, "fin": "River stone & greenery", "furniture": ["water_feature_basin", "meditation_bench"]},
            {"id": "r2", "name": "North Reception Gallery", "type": "living", "relX": 0.0, "relZ": 0.0, "relW": 0.65, "relD": 0.30, "fin": "Botticino marble", "furniture": ["lounge_ensemble", "grand_credenza"]},
            {"id": "r3", "name": "East Dining & Gourmet Kitchen", "type": "kitchen", "relX": 0.65, "relZ": 0.0, "relW": 0.35, "relD": 0.65, "fin": "Honed granite", "furniture": ["formal_dining_table", "prep_island"]},
            {"id": "r4", "name": "West Primary Suite", "type": "bedroom", "relX": 0.0, "relZ": 0.30, "relW": 0.35, "relD": 0.70, "fin": "Fine teak", "furniture": ["king_canopy_bed", "chaise_lounge"]},
            {"id": "r5", "name": "South Guest Wing", "type": "bedroom", "relX": 0.35, "relZ": 0.65, "relW": 0.65, "relD": 0.35, "fin": "Fine teak", "furniture": ["twin_beds", "guest_bath_fixtures"]}
        ]
    },
    {
        "id": "plan_08_duplex_residence",
        "num": "08",
        "name": "Modern Duplex Ground Floor",
        "archetype": "Townhouse Ground",
        "filename": "08_duplex_residence.png",
        "dims": {"width": 10.5, "length": 8.5, "wallHeight": 3.1, "wallThickness": 0.22},
        "description": "Multi-level townhouse ground floor with sculptural staircase core, deep living salon, and garden outlook.",
        "rooms": [
            {"id": "r1", "name": "Double-Height Great Room", "type": "living", "relX": 0.0, "relZ": 0.0, "relW": 0.60, "relD": 0.60, "fin": "Nordic white oak", "furniture": ["corner_lounge", "coffee_pod", "media_wall"]},
            {"id": "r2", "name": "Kitchen & Breakfast Island", "type": "kitchen", "relX": 0.60, "relZ": 0.0, "relW": 0.40, "relD": 0.50, "fin": "Quartz slab", "furniture": ["kitchen_island", "stools", "pantry_wall"]},
            {"id": "r3", "name": "Floating Staircase Gallery", "type": "hallway", "relX": 0.60, "relZ": 0.50, "relW": 0.40, "relD": 0.50, "fin": "Exposed aggregate", "furniture": ["architectural_staircase", "powder_room"]},
            {"id": "r4", "name": "Garden Guest Suite", "type": "bedroom", "relX": 0.0, "relZ": 0.60, "relW": 0.60, "relD": 0.40, "fin": "Warm walnut", "furniture": ["queen_bed", "study_nook"]}
        ]
    },
    {
        "id": "plan_09_executive_penthouse",
        "num": "09",
        "name": "Executive Penthouse Suite",
        "archetype": "Luxury Penthouse",
        "filename": "09_executive_penthouse.png",
        "dims": {"width": 13.0, "length": 9.0, "wallHeight": 3.2, "wallThickness": 0.24},
        "description": "Crown-level penthouse with continuous glass perimeter curtain walls, entertainment salon, and spa ensuite.",
        "rooms": [
            {"id": "r1", "name": "Panoramic Skyline Salon", "type": "living", "relX": 0.0, "relZ": 0.0, "relW": 0.62, "relD": 0.60, "fin": "Calacatta marble", "furniture": ["designer_sofas", "low_cocktail_table", "baby_grand_piano"]},
            {"id": "r2", "name": "Chef Kitchen & Wine Bar", "type": "kitchen", "relX": 0.62, "relZ": 0.0, "relW": 0.38, "relD": 0.45, "fin": "Nero Marquina marble", "furniture": ["waterfall_island", "wine_display_wall"]},
            {"id": "r3", "name": "Presidential Master Suite", "type": "bedroom", "relX": 0.0, "relZ": 0.60, "relW": 0.55, "relD": 0.40, "fin": "Silk carpet & ebony", "furniture": ["custom_king_bed", "dressing_lounge"]},
            {"id": "r4", "name": "Master Spa Ensuite", "type": "bathroom", "relX": 0.55, "relZ": 0.60, "relW": 0.45, "relD": 0.40, "fin": "Honed Statuario", "furniture": ["freestanding_oval_tub", "steam_shower", "double_vanity"]}
        ]
    },
    {
        "id": "plan_10_micro_living_pod",
        "num": "10",
        "name": "Micro-Living Modular Pod",
        "archetype": "Modular Tiny Home",
        "filename": "10_micro_living_pod.png",
        "dims": {"width": 6.0, "length": 4.0, "wallHeight": 2.6, "wallThickness": 0.20},
        "description": "High-efficiency factory-built modular pod with transformable furniture, compact wet bath, and entry deck.",
        "rooms": [
            {"id": "r1", "name": "Transformable Living & Bed Pod", "type": "bedroom", "relX": 0.0, "relZ": 0.0, "relW": 0.65, "relD": 1.0, "fin": "Birch plywood", "furniture": ["murphy_bed_sofa", "foldout_table", "modular_storage"]},
            {"id": "r2", "name": "Compact Kitchenette", "type": "kitchen", "relX": 0.65, "relZ": 0.0, "relW": 0.35, "relD": 0.50, "fin": "Stainless steel & birch", "furniture": ["induction_counter", "undercounter_fridge", "sink"]},
            {"id": "r3", "name": "Precast Wet Room", "type": "bathroom", "relX": 0.65, "relZ": 0.50, "relW": 0.35, "relD": 0.50, "fin": "Microcement", "furniture": ["wall_hung_toilet", "monobloc_shower", "corner_basin"]}
        ]
    }
]

def generate_walls_from_rooms(rooms, W, L, T=0.22, H=2.8):
    """
    Computes exact watertight wall segments from room definitions.
    Generates exterior perimeter walls and interior partition segments.
    """
    walls = []
    wall_id = 1
    
    # Grid of coordinates
    # Exterior bounds
    hw = W / 2.0
    hl = L / 2.0
    
    # 4 Exterior Walls (Default rectilinear, adapted for porch/deck if present)
    # North Wall
    walls.append({
        "id": f"wall_ext_{wall_id}", "startX": -hw, "startZ": -hl, "endX": hw, "endZ": -hl,
        "isExterior": True, "thickness": T, "height": H,
        "openings": [{"id": f"win_{wall_id}_1", "type": "window", "position": 0.25, "width": 1.4},
                     {"id": f"win_{wall_id}_2", "type": "window", "position": 0.75, "width": 1.4}]
    })
    wall_id += 1
    
    # East Wall
    walls.append({
        "id": f"wall_ext_{wall_id}", "startX": hw, "startZ": -hl, "endX": hw, "endZ": hl,
        "isExterior": True, "thickness": T, "height": H,
        "openings": [{"id": f"win_{wall_id}", "type": "window", "position": 0.5, "width": 1.3}]
    })
    wall_id += 1
    
    # South Wall
    walls.append({
        "id": f"wall_ext_{wall_id}", "startX": hw, "startZ": hl, "endX": -hw, "endZ": hl,
        "isExterior": True, "thickness": T, "height": H,
        "openings": [{"id": f"door_{wall_id}", "type": "door", "position": 0.35, "width": 1.0, "hingeSide": "left"},
                     {"id": f"win_{wall_id}", "type": "window", "position": 0.75, "width": 1.6}]
    })
    wall_id += 1
    
    # West Wall
    walls.append({
        "id": f"wall_ext_{wall_id}", "startX": -hw, "startZ": hl, "endX": -hw, "endZ": -hl,
        "isExterior": True, "thickness": T, "height": H,
        "openings": [{"id": f"win_{wall_id}", "type": "window", "position": 0.5, "width": 1.4}]
    })
    wall_id += 1

    # Extract unique internal X and Z boundaries between rooms
    x_lines = set()
    z_lines = set()
    for r in rooms:
        rx = round(r["relX"], 2)
        rx2 = round(r["relX"] + r["relW"], 2)
        rz = round(r["relZ"], 2)
        rz2 = round(r["relZ"] + r["relD"], 2)
        if 0.05 < rx < 0.95: x_lines.add(rx)
        if 0.05 < rx2 < 0.95: x_lines.add(rx2)
        if 0.05 < rz < 0.95: z_lines.add(rz)
        if 0.05 < rz2 < 0.95: z_lines.add(rz2)

    # Generate internal walls for each dividing line
    int_thickness = 0.15
    for xl in sorted(x_lines):
        world_x = round((xl - 0.5) * W, 2)
        # Find Z span for this X line
        z_spans = []
        for r in rooms:
            if abs(r["relX"] - xl) < 0.02 or abs((r["relX"] + r["relW"]) - xl) < 0.02:
                z_spans.append((r["relZ"], r["relZ"] + r["relD"]))
        if z_spans:
            min_z = min(s[0] for s in z_spans)
            max_z = max(s[1] for s in z_spans)
            w_z1 = round((min_z - 0.5) * L, 2)
            w_z2 = round((max_z - 0.5) * L, 2)
            walls.append({
                "id": f"wall_int_{wall_id}",
                "startX": world_x, "startZ": w_z1, "endX": world_x, "endZ": w_z2,
                "isExterior": False, "thickness": int_thickness, "height": H,
                "openings": [{"id": f"door_int_{wall_id}", "type": "door", "position": 0.5, "width": 0.9, "hingeSide": "left"}]
            })
            wall_id += 1

    for zl in sorted(z_lines):
        world_z = round((zl - 0.5) * L, 2)
        x_spans = []
        for r in rooms:
            if abs(r["relZ"] - zl) < 0.02 or abs((r["relZ"] + r["relD"]) - zl) < 0.02:
                x_spans.append((r["relX"], r["relX"] + r["relW"]))
        if x_spans:
            min_x = min(s[0] for s in x_spans)
            max_x = max(s[1] for s in x_spans)
            w_x1 = round((min_x - 0.5) * W, 2)
            w_x2 = round((max_x - 0.5) * W, 2)
            walls.append({
                "id": f"wall_int_{wall_id}",
                "startX": w_x1, "startZ": world_z, "endX": w_x2, "endZ": world_z,
                "isExterior": False, "thickness": int_thickness, "height": H,
                "openings": [{"id": f"door_int_{wall_id}", "type": "door", "position": 0.5, "width": 0.9, "hingeSide": "right"}]
            })
            wall_id += 1

    return walls

def render_blueprint_image(plan, output_path):
    img = Image.new("RGB", (CANVAS_W, CANVAS_H), "#FAFAFC")
    draw = ImageDraw.Draw(img)

    # 1. Subtle Architectural Grid
    grid_spacing = 30
    for x in range(0, CANVAS_W, grid_spacing):
        draw.line([(x, 0), (x, CANVAS_H)], fill="#EDEFF2", width=1)
    for y in range(0, CANVAS_H, grid_spacing):
        draw.line([(0, y), (CANVAS_W, y)], fill="#EDEFF2", width=1)

    # 2. Outer CAD Border
    pad = 40
    draw.rectangle([pad, pad, CANVAS_W - pad, CANVAS_H - pad], outline="#1E232A", width=2)
    draw.rectangle([pad + 4, pad + 4, CANVAS_W - pad - 4, CANVAS_H - pad - 4], outline="#CBD5E1", width=1)

    # Title Banner
    draw.text((pad + 25, pad + 20), f"BEYOND - 2D  ·  ARCHITECTURAL SUITE", font=FONT_SUB, fill="#64748B")
    draw.text((pad + 25, pad + 40), f"{plan['num']}. {plan['name'].upper()}", font=FONT_TITLE, fill="#0F172A")
    draw.text((pad + 25, pad + 74), f"ARCHETYPE: {plan['archetype'].upper()}  |  DIMENSIONS: {plan['dims']['width']}m x {plan['dims']['length']}m (CEILING: {plan['dims']['wallHeight']}m)", font=FONT_SUB, fill="#475569")

    # Scale and placement box in canvas
    plan_box_w = 900
    plan_box_h = 680
    plan_box_x = 70
    plan_box_y = 140

    bw = plan_box_w
    bh = plan_box_h
    bx = plan_box_x
    by = plan_box_y

    # Draw rooms
    ROOM_COLORS = {
        "bedroom": "#EEF2FF",
        "living": "#F0FDF4",
        "kitchen": "#FFF7ED",
        "bathroom": "#FEFCE8",
        "porch": "#F1F5F9",
        "hallway": "#FAF5FF"
    }
    BORDER_COLORS = {
        "bedroom": "#6366F1",
        "living": "#22C55E",
        "kitchen": "#F97316",
        "bathroom": "#EAB308",
        "porch": "#94A3B8",
        "hallway": "#A855F7"
    }

    rooms = plan["rooms"]
    for r in rooms:
        rx = bx + int(r["relX"] * bw)
        ry = by + int(r["relZ"] * bh)
        rw = int(r["relW"] * bw)
        rh = int(r["relD"] * bh)

        fill_col = ROOM_COLORS.get(r["type"], "#FFFFFF")
        draw.rectangle([rx, ry, rx + rw, ry + rh], fill=fill_col, outline="#D1D5DB", width=1)

        # Room Text Labels
        room_name = r["name"].upper()
        m_w = round(r["relW"] * plan["dims"]["width"], 1)
        m_d = round(r["relD"] * plan["dims"]["length"], 1)
        area_m2 = round(m_w * m_d, 1)

        # Center label
        cx = rx + rw // 2
        cy = ry + rh // 2

        # Draw clean pill badge for room type
        tag_w = 120
        tag_h = 24
        draw.rectangle([cx - tag_w//2, cy - 32, cx + tag_w//2, cy - 10], fill="#FFFFFF", outline="#CBD5E1", width=1)
        draw.text((cx - 45, cy - 28), r["type"].upper(), font=FONT_BADGE, fill=BORDER_COLORS.get(r["type"], "#475569"))

        draw.text((cx - len(room_name) * 5, cy), room_name, font=FONT_ROOM, fill="#0F172A")
        dim_str = f"{m_w}m x {m_d}m  ({area_m2} m²)"
        draw.text((cx - len(dim_str) * 3 - 5, cy + 26), dim_str, font=FONT_DIM, fill="#64748B")

        # Architectural furniture schematic drawing
        f_types = r.get("furniture", [])
        if "king_bed" in f_types or "queen_bed" in f_types or "twin_beds" in f_types or "platform_bed" in f_types:
            # Bed rectangle with pillows
            bed_w = int(rw * 0.45)
            bed_h = int(rh * 0.45)
            b_x = rx + 25
            b_y = ry + 25
            draw.rectangle([b_x, b_y, b_x + bed_w, b_y + bed_h], outline="#94A3B8", fill="#FFFFFF", width=2)
            # Pillows
            draw.rectangle([b_x + 8, b_y + 6, b_x + bed_w//2 - 4, b_y + 24], outline="#CBD5E1", fill="#F8FAFC", width=1)
            draw.rectangle([b_x + bed_w//2 + 4, b_y + 6, b_x + bed_w - 8, b_y + 24], outline="#CBD5E1", fill="#F8FAFC", width=1)
            # Blanket line
            draw.line([(b_x, b_y + 36), (b_x + bed_w, b_y + 36)], fill="#CBD5E1", width=2)

        if "sofa" in f_types or "l_sofa" in f_types or "sectional_sofa" in f_types or "modular_sofa" in f_types:
            # Sofa rectangle with cushions
            s_w = int(rw * 0.5)
            s_h = int(rh * 0.28)
            s_x = rx + rw - s_w - 30
            s_y = ry + rh - s_h - 30
            draw.rectangle([s_x, s_y, s_x + s_w, s_y + s_h], outline="#94A3B8", fill="#FFFFFF", width=2)
            # Backrest
            draw.rectangle([s_x, s_y, s_x + s_w, s_y + 14], outline="#CBD5E1", fill="#E2E8F0", width=1)
            # Coffee table
            draw.rectangle([s_x + 10, s_y - 25, s_x + s_w - 10, s_y - 8], outline="#94A3B8", fill="#F8FAFC", width=1)

        if "dining_table" in f_types or "dining_set" in f_types or "8p_dining_table" in f_types:
            t_w = int(rw * 0.45)
            t_h = int(rh * 0.3)
            t_x = rx + 30
            t_y = ry + rh - t_h - 30
            draw.rectangle([t_x, t_y, t_x + t_w, t_y + t_h], outline="#64748B", fill="#FFFFFF", width=2)
            # Chairs around table
            draw.rectangle([t_x + 8, t_y - 10, t_x + 28, t_y - 2], outline="#94A3B8", fill="#E2E8F0", width=1)
            draw.rectangle([t_x + t_w - 28, t_y - 10, t_x + t_w - 8, t_y - 2], outline="#94A3B8", fill="#E2E8F0", width=1)
            draw.rectangle([t_x + 8, t_y + t_h + 2, t_x + 28, t_y + t_h + 10], outline="#94A3B8", fill="#E2E8F0", width=1)
            draw.rectangle([t_x + t_w - 28, t_y + t_h + 2, t_x + t_w - 8, t_y + t_h + 10], outline="#94A3B8", fill="#E2E8F0", width=1)

        if "toilet" in f_types:
            t_x = rx + 15
            t_y = ry + 15
            # Toilet tank & oval bowl
            draw.rectangle([t_x, t_y, t_x + 30, t_y + 14], outline="#94A3B8", fill="#F8FAFC", width=1)
            draw.ellipse([t_x + 3, t_y + 14, t_x + 27, t_y + 44], outline="#64748B", fill="#FFFFFF", width=2)

        if "bathtub" in f_types or "shower_enclosure" in f_types or "freestanding_tub" in f_types:
            bt_x = rx + rw - 55
            bt_y = ry + 15
            draw.rectangle([bt_x, bt_y, bt_x + 40, bt_y + 70], outline="#64748B", fill="#FFFFFF", width=2)
            draw.ellipse([bt_x + 4, bt_y + 4, bt_x + 36, bt_y + 66], outline="#94A3B8", fill="#F1F5F9", width=1)

    # 3. Heavy Structural Walls & Openings (Thick Solid CAD Fill)
    wall_thick = 10
    # Outer structural perimeter
    draw.rectangle([bx, by, bx + bw, by + bh], outline="#0F172A", width=wall_thick)

    # Interior dividing walls
    x_divs = set()
    z_divs = set()
    for r in rooms:
        rx = round(r["relX"], 2)
        rx2 = round(r["relX"] + r["relW"], 2)
        rz = round(r["relZ"], 2)
        rz2 = round(r["relZ"] + r["relD"], 2)
        if 0.05 < rx < 0.95: x_divs.add(rx)
        if 0.05 < rx2 < 0.95: x_divs.add(rx2)
        if 0.05 < rz < 0.95: z_divs.add(rz)
        if 0.05 < rz2 < 0.95: z_divs.add(rz2)

    for xd in x_divs:
        px = bx + int(xd * bw)
        draw.line([(px, by), (px, by + bh)], fill="#0F172A", width=wall_thick)
        # Door opening & swing arc
        d_y = by + int(0.5 * bh)
        door_size = 45
        draw.rectangle([px - wall_thick, d_y - door_size//2, px + wall_thick, d_y + door_size//2], fill="#FFFFFF")
        draw.line([(px, d_y - door_size//2), (px + door_size, d_y - door_size//2)], fill="#2563EB", width=2)
        draw.arc([px - door_size, d_y - door_size//2 - door_size, px + door_size, d_y + door_size//2], 0, 90, fill="#38BDF8", width=2)

    for zd in z_divs:
        py = by + int(zd * bh)
        draw.line([(bx, py), (bx + bw, py)], fill="#0F172A", width=wall_thick)
        # Door opening & swing arc
        d_x = bx + int(0.5 * bw)
        door_size = 45
        draw.rectangle([d_x - door_size//2, py - wall_thick, d_x + door_size//2, py + wall_thick], fill="#FFFFFF")
        draw.line([(d_x - door_size//2, py), (d_x - door_size//2, py - door_size)], fill="#2563EB", width=2)
        draw.arc([d_x - door_size//2 - door_size, py - door_size, d_x + door_size//2, py + door_size], 270, 360, fill="#38BDF8", width=2)

    # Exterior Windows with double lines & cyan glass fill
    win_w = 90
    # North Windows
    w_nx1 = bx + int(bw * 0.25)
    draw.rectangle([w_nx1 - win_w//2, by - wall_thick//2 - 2, w_nx1 + win_w//2, by + wall_thick//2 + 2], fill="#FFFFFF", outline="#0284C7", width=2)
    draw.line([(w_nx1 - win_w//2, by), (w_nx1 + win_w//2, by)], fill="#38BDF8", width=2)

    w_nx2 = bx + int(bw * 0.75)
    draw.rectangle([w_nx2 - win_w//2, by - wall_thick//2 - 2, w_nx2 + win_w//2, by + wall_thick//2 + 2], fill="#FFFFFF", outline="#0284C7", width=2)
    draw.line([(w_nx2 - win_w//2, by), (w_nx2 + win_w//2, by)], fill="#38BDF8", width=2)

    # South Windows & Entrance Door
    w_sx = bx + int(bw * 0.75)
    draw.rectangle([w_sx - win_w//2, by + bh - wall_thick//2 - 2, w_sx + win_w//2, by + bh + wall_thick//2 + 2], fill="#FFFFFF", outline="#0284C7", width=2)
    draw.line([(w_sx - win_w//2, by + bh), (w_sx + win_w//2, by + bh)], fill="#38BDF8", width=2)

    main_dx = bx + int(bw * 0.35)
    door_w = 55
    draw.rectangle([main_dx - door_w//2, by + bh - wall_thick//2 - 3, main_dx + door_w//2, by + bh + wall_thick//2 + 3], fill="#FFFFFF")
    draw.line([(main_dx - door_w//2, by + bh), (main_dx - door_w//2, by + bh - door_w)], fill="#DC2626", width=3)
    draw.arc([main_dx - door_w//2 - door_w, by + bh - door_w, main_dx - door_w//2 + door_w, by + bh + door_w], 270, 360, fill="#EF4444", width=2)

    # 4. Dimension Lines & Metric Strings
    # Top width dimension string
    dim_y = by - 35
    draw.line([(bx, dim_y), (bx + bw, dim_y)], fill="#64748B", width=1)
    draw.line([(bx, dim_y - 8), (bx, dim_y + 8)], fill="#1E232A", width=2)
    draw.line([(bx + bw, dim_y - 8), (bx + bw, dim_y + 8)], fill="#1E232A", width=2)
    draw.text((bx + bw // 2 - 40, dim_y - 20), f"{plan['dims']['width']} m OVERALL", font=FONT_DIM, fill="#0F172A")

    # Left length dimension string
    dim_x = bx - 35
    draw.line([(dim_x, by), (dim_x, by + bh)], fill="#64748B", width=1)
    draw.line([(dim_x - 8, by), (dim_x + 8, by)], fill="#1E232A", width=2)
    draw.line([(dim_x - 8, by + bh), (dim_x + 8, by + bh)], fill="#1E232A", width=2)
    draw.text((dim_x - 65, by + bh // 2 - 10), f"{plan['dims']['length']} m", font=FONT_DIM, fill="#0F172A")

    # 5. Right Sidebar: Certified Title Block & BIM Schedule
    tb_x = CANVAS_W - 380
    tb_y = 140
    tb_w = 340
    tb_h = 760

    draw.rectangle([tb_x, tb_y, tb_x + tb_w, tb_y + tb_h], fill="#FFFFFF", outline="#CBD5E1", width=1)
    # Header of Title Block
    draw.rectangle([tb_x, tb_y, tb_x + tb_w, tb_y + 60], fill="#0F172A")
    draw.text((tb_x + 20, tb_y + 12), "BEYOND - 2D STUDIO", font=FONT_SUB, fill="#38BDF8")
    draw.text((tb_x + 20, tb_y + 32), "CERTIFIED BIM SPECIFICATION", font=FONT_BADGE, fill="#94A3B8")

    # Specs
    spec_y = tb_y + 80
    total_area = round(plan['dims']['width'] * plan['dims']['length'], 1)
    net_area = round(sum(r['relW'] * r['relD'] * total_area for r in rooms), 1)

    specs = [
        ("PROJECT ID", plan["id"]),
        ("ARCHETYPE", plan["archetype"]),
        ("GROSS FOOTPRINT", f"{total_area} m²"),
        ("NET INTERIOR", f"{net_area} m²"),
        ("WALL HEIGHT", f"{plan['dims']['wallHeight']} m"),
        ("EXT THICKNESS", f"{int(plan['dims']['wallThickness']*100)} cm"),
        ("ROOMS COUNT", f"{len(rooms)} Spaces"),
        ("SCALE RATIO", "1 : 100 METRIC"),
        ("TOPOLOGY", "WATERTIGHT MANIFOLD")
    ]
    for label, val in specs:
        draw.text((tb_x + 18, spec_y), label, font=FONT_BADGE, fill="#64748B")
        draw.text((tb_x + 160, spec_y), val, font=FONT_DIM, fill="#0F172A")
        draw.line([(tb_x + 18, spec_y + 18), (tb_x + tb_w - 18, spec_y + 18)], fill="#F1F5F9", width=1)
        spec_y += 28

    # Room Schedule in Title Block
    draw.text((tb_x + 18, spec_y + 10), "ROOM SCHEDULE & FINISHES", font=FONT_BADGE, fill="#0F172A")
    draw.line([(tb_x + 18, spec_y + 26), (tb_x + tb_w - 18, spec_y + 26)], fill="#CBD5E1", width=1)
    spec_y += 36

    for r in rooms:
        m2 = round(r['relW'] * r['relD'] * total_area, 1)
        draw.text((tb_x + 18, spec_y), r["name"][:18], font=FONT_BADGE, fill="#334155")
        draw.text((tb_x + 190, spec_y), f"{m2} m²", font=FONT_DIM, fill="#0F172A")
        draw.text((tb_x + 18, spec_y + 14), r.get("fin", "Standard Finish")[:28], font=FONT_BADGE, fill="#94A3B8")
        spec_y += 34

    # North Compass Symbol
    compass_x = tb_x + tb_w // 2
    compass_y = tb_y + tb_h - 70
    draw.ellipse([compass_x - 30, compass_y - 30, compass_x + 30, compass_y + 30], outline="#64748B", width=1)
    draw.polygon([(compass_x, compass_y - 25), (compass_x - 8, compass_y), (compass_x + 8, compass_y)], fill="#EF4444")
    draw.polygon([(compass_x, compass_y + 25), (compass_x - 8, compass_y), (compass_x + 8, compass_y)], fill="#64748B")
    draw.text((compass_x - 5, compass_y - 48), "N", font=FONT_BADGE, fill="#EF4444")

    # Bottom Footer
    draw.text((pad + 25, CANVAS_H - pad - 25), "AUTOMATED HIGH-RESOLUTION BLUEPRINT RENDER  ·  BEYOND-2D CAD GEOMETRY COMPLIANT", font=FONT_BADGE, fill="#94A3B8")

    img.save(output_path, "PNG", quality=95)
    print(f"Generated: {output_path}")

def main():
    catalog = []
    
    # Destination directories
    dirs = [
        "floorplans",
        "public/samples",
        "frontend-form-studio/samples"
    ]
    for d in dirs:
        os.makedirs(d, exist_ok=True)

    for plan in PLANS_DEF:
        walls = generate_walls_from_rooms(
            plan["rooms"],
            plan["dims"]["width"],
            plan["dims"]["length"],
            plan["dims"]["wallThickness"],
            plan["dims"]["wallHeight"]
        )

        plan_entry = {
            "id": plan["id"],
            "num": plan["num"],
            "name": plan["name"],
            "archetype": plan["archetype"],
            "filename": plan["filename"],
            "imagePath": f"/samples/{plan['filename']}",
            "description": plan["description"],
            "dimensions": plan["dims"],
            "rooms": plan["rooms"],
            "walls": walls
        }
        catalog.append(plan_entry)

        # Render image to all sample directories
        for d in dirs:
            out_img = os.path.join(d, plan["filename"])
            render_blueprint_image(plan, out_img)

    # Save JSON catalog in multiple places for frontend and tests
    cat_json_path = "floorplans/floorplans_catalog.json"
    with open(cat_json_path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2)
    print(f"Catalog saved to {cat_json_path}")

    # Also save as JS file for direct zero-latency import in index.html
    js_content = f"// Beyond-2D 10 Architectural Presets Catalog\nwindow.BEYOND_2D_CATALOG = {json.dumps(catalog, indent=2)};\n"
    with open("public/samples/catalog.js", "w", encoding="utf-8") as f:
        f.write(js_content)
    with open("frontend-form-studio/samples/catalog.js", "w", encoding="utf-8") as f:
        f.write(js_content)
    print("Catalog JS exported to public/samples/catalog.js and frontend-form-studio/samples/catalog.js")

if __name__ == "__main__":
    main()
