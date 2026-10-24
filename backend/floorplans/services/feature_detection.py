from typing import Dict, Any, List, Tuple
import cv2
import numpy as np


ROOM_COLORS = {
    'living': '#3b82f6',
    'bedroom': '#10b981',
    'kitchen': '#ec4899',
    'bathroom': '#eab308',
    'dining': '#f97316',
    'hallway': '#64748b',
    'office': '#8b5cf6',
    'balcony': '#06b6d4',
    'entrance': '#a855f7',
    'porch': '#78716c',
}


def detect_walls_morphological(binary_img: np.ndarray) -> np.ndarray:
    """
    Isolates horizontal and vertical structural walls using directional morphological kernels.
    """
    h, w = binary_img.shape
    # Dynamic kernel length based on image dimensions (e.g. 2.5% of dimension)
    h_len = max(15, int(w * 0.025))
    v_len = max(15, int(h * 0.025))

    # Horizontal wall mask
    h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (h_len, 1))
    h_walls = cv2.erode(binary_img, h_kernel)
    h_walls = cv2.dilate(h_walls, h_kernel)

    # Vertical wall mask
    v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, v_len))
    v_walls = cv2.erode(binary_img, v_kernel)
    v_walls = cv2.dilate(v_walls, v_kernel)

    # Combine
    combined = cv2.bitwise_or(h_walls, v_walls)

    # Dilate slightly to form a continuous manifold
    wall_join_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    wall_mask = cv2.dilate(combined, wall_join_kernel, iterations=1)
    return wall_mask


def detect_wall_segments_hough(binary_walls: np.ndarray) -> List[Dict[str, Any]]:
    """
    Extracts geometric line segments from wall mask using Probabilistic Hough Transform.
    """
    h, w = binary_walls.shape
    min_line_len = max(20, int(min(w, h) * 0.03))
    max_line_gap = max(8, int(min(w, h) * 0.015))

    lines = cv2.HoughLinesP(
        binary_walls,
        rho=1,
        theta=np.pi / 180,
        threshold=35,
        minLineLength=min_line_len,
        maxLineGap=max_line_gap,
    )

    segments = []
    if lines is not None:
        for line in lines:
            pts = line.flatten()
            if len(pts) < 4:
                continue
            x1, y1, x2, y2 = int(pts[0]), int(pts[1]), int(pts[2]), int(pts[3])
            dx = abs(x2 - x1)
            dy = abs(y2 - y1)
            length = np.hypot(dx, dy)

            if length < min_line_len:
                continue

            # Snap nearly horizontal or vertical lines
            is_horizontal = dy < max(8, dx * 0.1)
            is_vertical = dx < max(8, dy * 0.1)

            if is_horizontal:
                avg_y = int((y1 + y2) / 2)
                segments.append({
                    'x1': min(x1, x2),
                    'y1': avg_y,
                    'x2': max(x1, x2),
                    'y2': avg_y,
                    'orientation': 'H',
                    'length': float(length),
                })
            elif is_vertical:
                avg_x = int((x1 + x2) / 2)
                segments.append({
                    'x1': avg_x,
                    'y1': min(y1, y2),
                    'x2': avg_x,
                    'y2': max(y1, y2),
                    'orientation': 'V',
                    'length': float(length),
                })
            else:
                segments.append({
                    'x1': int(x1),
                    'y1': int(y1),
                    'x2': int(x2),
                    'y2': int(y2),
                    'orientation': 'A',
                    'length': float(length),
                })

    return merge_collinear_segments(segments)


def merge_collinear_segments(segments: List[Dict[str, Any]], dist_thresh: int = 12) -> List[Dict[str, Any]]:
    """
    Merges segments that lie along the same line and overlap or are separated by a small gap.
    """
    if not segments:
        return []

    h_segments = [s for s in segments if s['orientation'] == 'H']
    v_segments = [s for s in segments if s['orientation'] == 'V']
    other_segments = [s for s in segments if s['orientation'] not in ('H', 'V')]

    merged = []

    # Merge Horizontal lines
    h_segments.sort(key=lambda s: (s['y1'], s['x1']))
    used_h = set()
    for i, s1 in enumerate(h_segments):
        if i in used_h:
            continue
        cur_y = s1['y1']
        cur_x1 = s1['x1']
        cur_x2 = s1['x2']

        for j in range(i + 1, len(h_segments)):
            if j in used_h:
                continue
            s2 = h_segments[j]
            if abs(s2['y1'] - cur_y) <= dist_thresh:
                # Same row: check if overlapping or within gap
                if s2['x1'] <= cur_x2 + dist_thresh:
                    cur_x2 = max(cur_x2, s2['x2'])
                    used_h.add(j)

        used_h.add(i)
        merged.append({
            'x1': cur_x1,
            'y1': cur_y,
            'x2': cur_x2,
            'y2': cur_y,
            'orientation': 'H',
            'length': float(cur_x2 - cur_x1),
        })

    # Merge Vertical lines
    v_segments.sort(key=lambda s: (s['x1'], s['y1']))
    used_v = set()
    for i, s1 in enumerate(v_segments):
        if i in used_v:
            continue
        cur_x = s1['x1']
        cur_y1 = s1['y1']
        cur_y2 = s1['y2']

        for j in range(i + 1, len(v_segments)):
            if j in used_v:
                continue
            s2 = v_segments[j]
            if abs(s2['x1'] - cur_x) <= dist_thresh:
                if s2['y1'] <= cur_y2 + dist_thresh:
                    cur_y2 = max(cur_y2, s2['y2'])
                    used_v.add(j)

        used_v.add(i)
        merged.append({
            'x1': cur_x,
            'y1': cur_y1,
            'x2': cur_x,
            'y2': cur_y2,
            'orientation': 'V',
            'length': float(cur_y2 - cur_y1),
        })

    merged.extend(other_segments)
    return merged


def detect_rooms(
    binary_walls: np.ndarray,
    img_w: int,
    img_h: int
) -> List[Dict[str, Any]]:
    """
    Extracts enclosed architectural rooms from the inverted wall mask.
    """
    # Dilate wall mask to close small doorways (so rooms form closed regions)
    gap_close_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
    dilated_walls = cv2.dilate(binary_walls, gap_close_kernel, iterations=2)

    # Invert so rooms are white (255) and walls are black (0)
    free_space = cv2.bitwise_not(dilated_walls)

    # Find room contours
    contours, hierarchy = cv2.findContours(free_space, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)

    total_area = img_w * img_h
    rooms = []

    # Sort contours by area descending
    valid_contours = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        # Exclude tiny noise (<0.8% of image) and exterior background (>70% of image)
        if area > total_area * 0.008 and area < total_area * 0.70:
            x, y, bw, bh = cv2.boundingRect(cnt)
            # Must not be along outer border margin
            if x > 5 and y > 5 and (x + bw) < (img_w - 5) and (y + bh) < (img_h - 5):
                valid_contours.append((cnt, area, x, y, bw, bh))

    valid_contours.sort(key=lambda c: c[1], reverse=True)

    # Deduplicate overlapping bounding boxes
    kept_boxes = []
    for cnt, area, x, y, bw, bh in valid_contours:
        overlap = False
        for kx, ky, kbw, kbh in kept_boxes:
            # Check intersection area
            ix1 = max(x, kx)
            iy1 = max(y, ky)
            ix2 = min(x + bw, kx + kbw)
            iy2 = min(y + bh, ky + kbh)
            if ix2 > ix1 and iy2 > iy1:
                inter_area = (ix2 - ix1) * (iy2 - iy1)
                min_area = min(area, kbw * kbh)
                if inter_area / min_area > 0.45:
                    overlap = True
                    break
        if not overlap:
            kept_boxes.append((x, y, bw, bh))
            rooms.append({
                'contour': cnt,
                'area_px': float(area),
                'x': int(x),
                'y': int(y),
                'w': int(bw),
                'h': int(bh),
            })

    return rooms


def assign_semantic_room_types(rooms: List[Dict[str, Any]], img_w: int, img_h: int) -> List[Dict[str, Any]]:
    """
    Labels detected rooms with standard architectural categories based on size and layout position.
    """
    if not rooms:
        return []

    # Sort rooms by area descending
    sorted_rooms = sorted(rooms, key=lambda r: r['area_px'], reverse=True)
    assigned = []

    has_living = False
    has_kitchen = False
    bedroom_idx = 1

    for idx, r in enumerate(sorted_rooms):
        x = r['x']
        y = r['y']
        w = r['w']
        h = r['h']
        area = r['area_px']

        # Determine semantic role
        if not has_living:
            room_type = 'living'
            name = 'Living Room'
            has_living = True
        elif not has_kitchen and (idx == 1 or idx == 2) and area < sorted_rooms[0]['area_px'] * 0.7:
            room_type = 'kitchen'
            name = 'Kitchen'
            has_kitchen = True
        elif area < sorted_rooms[0]['area_px'] * 0.25:
            room_type = 'bathroom'
            name = 'Bathroom'
        elif y > img_h * 0.65 and x < img_w * 0.45 and area < sorted_rooms[0]['area_px'] * 0.4:
            room_type = 'porch'
            name = 'Porch / Entry'
        elif bedroom_idx <= 4:
            room_type = 'bedroom'
            name = f'Bedroom {bedroom_idx}'
            bedroom_idx += 1
        else:
            room_type = 'dining'
            name = 'Dining Area'

        assigned.append({
            'id': f'room_{idx + 1}',
            'name': name,
            'type': room_type,
            'color': ROOM_COLORS.get(room_type, '#3b82f6'),
            'x': x,
            'y': y,
            'w': w,
            'h': h,
            'area_px': area,
        })

    return assigned


def detect_architectural_features(
    binary_img: np.ndarray,
    img_w: int,
    img_h: int
) -> Dict[str, Any]:
    """
    Full OpenCV feature detection pipeline.
    Returns:
        walls: list of line segments
        rooms: list of assigned rooms
        openings: detected doors & windows
        confidence: score 0.0 to 1.0
        diagnostics: detailed metadata
    """
    # 1. Morphological wall filtering
    wall_mask = detect_walls_morphological(binary_img)

    # 2. Extract wall segments
    wall_segments = detect_wall_segments_hough(wall_mask)

    # 3. Detect rooms
    raw_rooms = detect_rooms(wall_mask, img_w, img_h)
    rooms = assign_semantic_room_types(raw_rooms, img_w, img_h)

    # Compute confidence score
    confidence = 0.5
    if len(rooms) >= 3:
        confidence += 0.25
    if len(wall_segments) >= 8:
        confidence += 0.15
    if len(rooms) >= 5:
        confidence += 0.05
    confidence = min(0.95, round(confidence, 2))

    diagnostics = {
        'detected_wall_segments': len(wall_segments),
        'detected_room_count': len(rooms),
        'wall_coverage_percent': round(float(np.sum(wall_mask > 0) / (img_w * img_h) * 100), 2),
    }

    return {
        'walls': wall_segments,
        'rooms': rooms,
        'confidence': confidence,
        'diagnostics': diagnostics,
    }
