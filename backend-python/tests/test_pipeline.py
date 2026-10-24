import os
import unittest
import numpy as np
import cv2
from app.services.image_preprocessing import preprocess_floor_plan_image
from app.services.wall_extraction import extract_metric_wall_network
from app.services.opening_detection import detect_and_attach_openings
from app.services.room_reconstruction import reconstruct_room_topology
from app.services.geometry_validation import validate_architectural_geometry
from app.services.mesh_generation import generate_building_scene, export_glb_bytes
from app.services.pipeline import execute_floor_plan_pipeline

class TestBeyond2DPythonPipeline(unittest.TestCase):

    def setUp(self):
        # Create a synthetic 1024x682 test floor plan image with walls and rooms
        self.w = 1024
        self.h = 682
        self.img = np.ones((self.h, self.w, 3), dtype=np.uint8) * 255
        
        # Draw outer rectangle [bx=197, by=60, bw=617, bh=571]
        bx, by, bw, bh = 197, 60, 617, 571
        cv2.rectangle(self.img, (bx, by), (bx + bw, by + bh), (0, 0, 0), 6)
        
        # Encode to bytes
        _, buf = cv2.imencode(".png", self.img)
        self.image_bytes = buf.tobytes()

    def test_image_preprocessing(self):
        res = preprocess_floor_plan_image(self.image_bytes)
        self.assertEqual(res.orig_dims, (1024, 682))
        self.assertGreater(res.bbox[2], 500)
        self.assertGreater(res.bbox[3], 400)

    def test_wall_extraction_and_topology(self):
        bbox = (197, 60, 617, 571)
        wall_segs, world_walls, _ = extract_metric_wall_network(bbox, 10.0, 8.0)
        self.assertGreaterEqual(len(world_walls), 11)
        
        # Verify 6 exterior walls
        ext_walls = [w for w in world_walls if w["isExterior"]]
        self.assertEqual(len(ext_walls), 6)

        # Openings
        detect_and_attach_openings(bbox, world_walls, 10.0, 8.0)
        doors = [o for w in world_walls for o in w["openings"] if o["type"] == "door"]
        windows = [o for w in world_walls for o in w["openings"] if o["type"] == "window"]
        self.assertEqual(len(doors), 5)
        self.assertEqual(len(windows), 7)

    def test_room_reconstruction_bounds(self):
        bbox = (197, 60, 617, 571)
        rooms = reconstruct_room_topology(bbox, 10.0, 8.0)
        self.assertEqual(len(rooms), 8)
        
        # Check that room X bounds reach 1.0 (no voids)
        max_x = max(r["relX"] + r["relW"] for r in rooms)
        self.assertAlmostEqual(max_x, 1.0, places=2)

    def test_mesh_generation_and_glb(self):
        bbox = (197, 60, 617, 571)
        _, world_walls, _ = extract_metric_wall_network(bbox, 10.0, 8.0)
        rooms = reconstruct_room_topology(bbox, 10.0, 8.0)
        dims = {"width": 10.0, "length": 8.0, "wallHeight": 2.8}

        scene, meta = generate_building_scene(world_walls, rooms, dims)
        self.assertIsNotNone(scene)
        self.assertGreater(meta["sizeX"], 5.0)

        glb_bytes = export_glb_bytes(scene)
        self.assertGreater(len(glb_bytes), 1000)
        self.assertTrue(glb_bytes.startswith(b"glTF"))

    def test_end_to_end_pipeline(self):
        res = execute_floor_plan_pipeline(self.image_bytes, "test.png")
        self.assertTrue(res["success"])
        self.assertIn("layout", res)
        self.assertIn("diagnostics", res)
        self.assertEqual(len(res["layout"]["rooms"]), 8)
        self.assertTrue(res["diagnostics"]["footprint"]["porchBayPreserved"])

if __name__ == "__main__":
    unittest.main()
