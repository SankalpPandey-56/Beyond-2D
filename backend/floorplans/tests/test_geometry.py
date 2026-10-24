from django.test import TestCase
from floorplans.services.geometry_extraction import build_structured_geometry


class GeometryExtractionTests(TestCase):
    def test_structured_geometry_building(self):
        detected_features = {
            'rooms': [
                {'id': 'r1', 'name': 'Living Room', 'type': 'living', 'color': '#3b82f6', 'x': 50, 'y': 50, 'w': 200, 'h': 200, 'area_px': 40000},
                {'id': 'r2', 'name': 'Bedroom 1', 'type': 'bedroom', 'color': '#10b981', 'x': 250, 'y': 50, 'w': 200, 'h': 200, 'area_px': 40000},
            ],
            'walls': [
                {'x1': 50, 'y1': 50, 'x2': 450, 'y2': 50, 'orientation': 'H'},
                {'x1': 50, 'y1': 250, 'x2': 450, 'y2': 250, 'orientation': 'H'},
            ],
        }
        dimensions = {'width': 10.0, 'length': 8.0, 'wallHeight': 2.8, 'wallThickness': 0.22}

        geo = build_structured_geometry(detected_features, 500, 400, dimensions)
        self.assertEqual(geo['dimensions']['width'], 10.0)
        self.assertEqual(len(geo['rooms']), 2)

        # Verify normalized coordinates within 0..1
        for room in geo['rooms']:
            self.assertGreaterEqual(room['relX'], 0.0)
            self.assertLessEqual(room['relX'] + room['relW'], 1.05)
            self.assertGreaterEqual(room['relZ'], 0.0)
            self.assertLessEqual(room['relZ'] + room['relD'], 1.05)
            self.assertIn('dimensionsText', room)

        # Verify walls have metric coordinates
        self.assertGreater(len(geo['walls']), 0)
        for wall in geo['walls']:
            self.assertIn('startX', wall)
            self.assertIn('startZ', wall)
            self.assertIn('endX', wall)
            self.assertIn('endZ', wall)
            self.assertIn('isExterior', wall)
