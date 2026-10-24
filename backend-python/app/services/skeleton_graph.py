"""
Skeleton graph construction for wall extraction (PlanPop 3D Architecture).

Converts a skeletonized wall mask into a graph structure where:
- Nodes are junctions (branch points, degree >= 3) and endpoints (degree == 1)
- Edges are paths between nodes (wall segments)

Enables graph-based wall extraction with proper corner and junction handling.
"""

import numpy as np
import cv2
from typing import List, Tuple, Set, Dict, Optional
from dataclasses import dataclass

@dataclass
class Point:
    """A 2D point."""
    x: float
    y: float

    def __iter__(self):
        return iter((self.x, self.y))

    def to_tuple(self) -> Tuple[float, float]:
        return (self.x, self.y)

    def to_int_tuple(self) -> Tuple[int, int]:
        return (int(round(self.x)), int(round(self.y)))

    def distance_to(self, other: 'Point') -> float:
        return float(np.sqrt((self.x - other.x) ** 2 + (self.y - other.y) ** 2))

@dataclass
class Segment:
    """A wall segment with start point, end point, and thickness."""
    p1: Point
    p2: Point
    thickness: float = 0.22

    @classmethod
    def from_coords(cls, x1: float, y1: float, x2: float, y2: float, thickness: float = 0.22) -> 'Segment':
        return cls(Point(x1, y1), Point(x2, y2), thickness)

@dataclass
class GraphNode:
    """A node in the skeleton graph (junction or endpoint)."""
    position: Point
    node_type: str  # 'junction', 'endpoint', 'corner'
    neighbors: int  # Number of skeleton neighbors (3+ = junction, 1 = endpoint)

    def to_tuple(self) -> Tuple[int, int]:
        return self.position.to_int_tuple()

@dataclass
class GraphEdge:
    """An edge in the skeleton graph (path between two nodes)."""
    start_node: GraphNode
    end_node: GraphNode
    path_points: List[Tuple[int, int]]  # All pixels along the path

    def length(self) -> float:
        if len(self.path_points) < 2:
            return 0.0
        total = 0.0
        for i in range(len(self.path_points) - 1):
            p1, p2 = self.path_points[i], self.path_points[i + 1]
            total += float(np.sqrt((p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2))
        return total

@dataclass
class SkeletonGraph:
    """Complete skeleton graph structure."""
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    junctions: List[GraphNode]
    endpoints: List[GraphNode]

    @property
    def junction_points(self) -> List[Point]:
        return [n.position for n in self.junctions]

    @property
    def endpoint_points(self) -> List[Point]:
        return [n.position for n in self.endpoints]

def count_neighbors(skeleton: np.ndarray, y: int, x: int) -> int:
    h, w = skeleton.shape
    count = 0
    for dy in [-1, 0, 1]:
        for dx in [-1, 0, 1]:
            if dy == 0 and dx == 0:
                continue
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and skeleton[ny, nx] > 0:
                count += 1
    return count

def find_graph_nodes(skeleton: np.ndarray) -> Tuple[List[GraphNode], List[GraphNode]]:
    skeleton_bool = skeleton > 0
    junctions: List[GraphNode] = []
    endpoints: List[GraphNode] = []

    skeleton_points = np.argwhere(skeleton_bool)
    for point in skeleton_points:
        y, x = int(point[0]), int(point[1])
        neighbors = count_neighbors(skeleton_bool, y, x)
        if neighbors >= 3:
            junctions.append(GraphNode(position=Point(float(x), float(y)), node_type='junction', neighbors=neighbors))
        elif neighbors == 1:
            endpoints.append(GraphNode(position=Point(float(x), float(y)), node_type='endpoint', neighbors=neighbors))

    junctions = _cluster_nearby_nodes(junctions, radius=3.0)
    return junctions, endpoints

def _cluster_nearby_nodes(nodes: List[GraphNode], radius: float) -> List[GraphNode]:
    if not nodes:
        return []
    clustered = []
    used = set()
    for i, node in enumerate(nodes):
        if i in used:
            continue
        cluster = [node]
        used.add(i)
        for j, other in enumerate(nodes):
            if j in used:
                continue
            if node.position.distance_to(other.position) <= radius:
                cluster.append(other)
                used.add(j)
        if len(cluster) == 1:
            clustered.append(node)
        else:
            cx = sum(n.position.x for n in cluster) / len(cluster)
            cy = sum(n.position.y for n in cluster) / len(cluster)
            max_neighbors = max(n.neighbors for n in cluster)
            clustered.append(GraphNode(position=Point(cx, cy), node_type='junction', neighbors=max_neighbors))
    return clustered

def trace_skeleton_paths(
    skeleton: np.ndarray,
    junctions: List[GraphNode],
    endpoints: List[GraphNode],
) -> List[GraphEdge]:
    skeleton_bool = skeleton > 0
    h, w = skeleton.shape
    all_nodes = junctions + endpoints
    node_positions: Set[Tuple[int, int]] = {n.to_tuple() for n in all_nodes}

    def is_near_node(pixel: Tuple[int, int], exclude_node: GraphNode) -> Optional[GraphNode]:
        px, py = pixel
        for node in all_nodes:
            if node is exclude_node:
                continue
            nx, ny = node.to_tuple()
            if abs(px - nx) <= 2 and abs(py - ny) <= 2:
                return node
        return None

    def get_neighbors(y: int, x: int) -> List[Tuple[int, int]]:
        neighbors = []
        for dy in [-1, 0, 1]:
            for dx in [-1, 0, 1]:
                if dy == 0 and dx == 0:
                    continue
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and skeleton_bool[ny, nx]:
                    neighbors.append((nx, ny))
        return neighbors

    edges: List[GraphEdge] = []
    traced_pairs: Set[Tuple[Tuple[int, int], Tuple[int, int]]] = set()

    for start_node in all_nodes:
        start_pos = start_node.to_tuple()
        start_x, start_y = start_pos
        initial_neighbors = get_neighbors(start_y, start_x)

        for first_step in initial_neighbors:
            if (start_pos, first_step) in traced_pairs:
                continue
            path = [start_pos, first_step]
            visited = {start_pos, first_step}
            current = first_step

            while True:
                cx, cy = current
                reached_node = is_near_node(current, start_node)
                if reached_node is not None:
                    end_pos = reached_node.to_tuple()
                    pair_key = tuple(sorted([start_pos, end_pos]))
                    if pair_key not in traced_pairs:
                        edges.append(GraphEdge(start_node=start_node, end_node=reached_node, path_points=path.copy()))
                        traced_pairs.add((start_pos, end_pos))
                        traced_pairs.add((end_pos, start_pos))
                    break

                neighbors = get_neighbors(cy, cx)
                next_pixel = None
                for nx, ny in neighbors:
                    if (nx, ny) not in visited:
                        next_pixel = (nx, ny)
                        break

                if next_pixel is None:
                    break
                path.append(next_pixel)
                visited.add(next_pixel)
                current = next_pixel
                if len(path) > h * w:
                    break

    return edges

def build_skeleton_graph(skeleton: np.ndarray) -> SkeletonGraph:
    skeleton_uint8 = (skeleton > 0).astype(np.uint8) * 255
    junctions, endpoints = find_graph_nodes(skeleton_uint8)
    edges = trace_skeleton_paths(skeleton_uint8, junctions, endpoints)
    return SkeletonGraph(nodes=junctions + endpoints, edges=edges, junctions=junctions, endpoints=endpoints)
