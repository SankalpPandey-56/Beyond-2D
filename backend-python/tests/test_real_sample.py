import os
import unittest
from app.services.pipeline import execute_floor_plan_pipeline

class TestRealFloorPlanSample(unittest.TestCase):

    def test_real_plan_sample(self):
        sample_path = "/Users/sankalppandey/.gemini/antigravity/brain/44508ead-5f76-46a6-b0b2-b60bad2a4a47/.user_uploaded/media_1792857206917_485e4325.png"
        if not os.path.exists(sample_path):
            self.skipTest(f"Sample file not found at {sample_path}")

        with open(sample_path, "rb") as f:
            img_bytes = f.read()

        result = execute_floor_plan_pipeline(img_bytes, "media_1792857206917_485e4325.png")

        self.assertTrue(result["success"])
        layout = result["layout"]
        self.assertEqual(layout["dimensions"]["width"], 10.0)
        self.assertEqual(layout["dimensions"]["length"], 8.0)
        self.assertGreaterEqual(len(layout["rooms"]), 7)
        self.assertGreaterEqual(len(layout["walls"]), 12)

        # Verify exterior walls
        ext_walls = [w for w in layout["walls"] if w["isExterior"]]
        self.assertGreaterEqual(len(ext_walls), 6)

        diag = result["diagnostics"]
        self.assertEqual(diag["footprint"]["resolution"], "1024x682")
        self.assertEqual(diag["footprint"]["aspectRatio"], 1.081)
        self.assertTrue(diag["footprint"]["porchBayPreserved"])
        self.assertGreater(len(diag["semanticImageBase64"]), 1000)
        self.assertGreater(len(diag["overlayImageBase64"]), 1000)

if __name__ == "__main__":
    unittest.main()
