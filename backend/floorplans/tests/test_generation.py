from django.test import TestCase
from floorplans.services.mesh_generation import generate_3d_building_mesh
from floorplans.services.model_validation import validate_glb_model


class MeshGenerationTests(TestCase):
    def setUp(self):
        self.geometry_data = {
            'dimensions': {'width': 10.0, 'length': 8.0, 'wallHeight': 2.8, 'wallThickness': 0.22},
            'rooms': [
                {'id': 'r1', 'name': 'Living Room', 'type': 'living', 'relX': 0.0, 'relZ': 0.0, 'relW': 0.5, 'relD': 0.5},
                {'id': 'r2', 'name': 'Bedroom 1', 'type': 'bedroom', 'relX': 0.5, 'relZ': 0.0, 'relW': 0.5, 'relD': 0.5},
            ],
            'walls': [
                {
                    'id': 'w1',
                    'startX': -5.0, 'startZ': -4.0, 'endX': 0.0, 'endZ': -4.0,
                    'isExterior': True,
                    'openings': [{'type': 'window', 'position': 0.5, 'width': 1.3}],
                },
                {
                    'id': 'w2',
                    'startX': 0.0, 'startZ': -4.0, 'endX': 0.0, 'endZ': 0.0,
                    'isExterior': False,
                    'openings': [{'type': 'door', 'position': 0.5, 'width': 0.95}],
                },
                {
                    'id': 'w3',
                    'startX': -5.0, 'startZ': 0.0, 'endX': 0.0, 'endZ': 0.0,
                    'isExterior': False,
                    'openings': [],
                },
            ],
        }

    def test_glb_mesh_generation_and_validation(self):
        glb_bytes, stats = generate_3d_building_mesh(self.geometry_data)

        self.assertGreater(len(glb_bytes), 1000)
        self.assertGreater(stats['vertex_count'], 24)
        self.assertGreater(stats['face_count'], 12)
        self.assertIn('bounding_box', stats)

        # Validate with trimesh loader
        is_valid, msg, val_stats = validate_glb_model(glb_bytes)
        self.assertTrue(is_valid, f"GLB validation failed: {msg}")
        self.assertGreater(val_stats['vertex_count'], 0)
        self.assertGreater(val_stats['face_count'], 0)
