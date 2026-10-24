import os
import tempfile
import cv2
import numpy as np
from django.test import TestCase
from floorplans.services.image_preprocessing import preprocess_floorplan
from floorplans.services.scale_calibration import calculate_scale
from floorplans.services.feature_detection import detect_architectural_features
from .fixtures import create_synthetic_floorplan_image


class DetectionPipelineTests(TestCase):
    def setUp(self):
        self.img_bytes = create_synthetic_floorplan_image(500, 400)
        self.temp_file = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        self.temp_file.write(self.img_bytes)
        self.temp_file.close()

    def tearDown(self):
        if os.path.exists(self.temp_file.name):
            os.remove(self.temp_file.name)

    def test_preprocessing(self):
        binary_walls, gray_img, scale_ratio, metadata = preprocess_floorplan(self.temp_file.name)
        self.assertEqual(binary_walls.shape, (400, 500))
        self.assertGreater(np.sum(binary_walls > 0), 100)
        self.assertEqual(metadata['original_width'], 500)

    def test_scale_calibration_explicit(self):
        ppm, is_est, dims = calculate_scale(500, 400, {'reference_length_meters': 5.0, 'pixel_distance': 250})
        self.assertFalse(is_est)
        self.assertEqual(ppm, 50.0)
        self.assertEqual(dims['width'], 10.0)
        self.assertEqual(dims['length'], 8.0)

    def test_scale_calibration_estimated(self):
        ppm, is_est, dims = calculate_scale(500, 400, None)
        self.assertTrue(is_est)
        self.assertGreater(ppm, 0)
        self.assertGreater(dims['width'], 0)

    def test_feature_detection(self):
        binary_walls, _, _, _ = preprocess_floorplan(self.temp_file.name)
        features = detect_architectural_features(binary_walls, 500, 400)
        self.assertIn('walls', features)
        self.assertIn('rooms', features)
        self.assertGreater(len(features['walls']), 0)
        self.assertGreater(len(features['rooms']), 0)
        self.assertGreaterEqual(features['confidence'], 0.5)
