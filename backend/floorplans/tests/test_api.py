import json
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from .fixtures import create_synthetic_floorplan_image


class FullWorkflowAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_health_endpoint(self):
        response = self.client.get('/api/v1/health/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'healthy')
        self.assertIn('opencv', response.data['dependencies'])
        self.assertIn('trimesh', response.data['dependencies'])

    def test_full_conversion_pipeline_workflow(self):
        # 1. Upload floor plan image
        img_bytes = create_synthetic_floorplan_image(500, 400)
        upload_file = SimpleUploadedFile("floorplan.png", img_bytes, content_type="image/png")

        upload_res = self.client.post(
            "/api/v1/floorplans/upload/",
            {"image": upload_file, "reference_length_meters": 10.0, "pixel_distance": 500},
            format="multipart"
        )
        self.assertEqual(upload_res.status_code, status.HTTP_201_CREATED)
        job_id = upload_res.data["job_id"]

        # 2. Check initial job status
        status_res = self.client.get(f"/api/v1/floorplans/{job_id}/status/")
        self.assertEqual(status_res.status_code, status.HTTP_200_OK)
        self.assertEqual(status_res.data["status"], "uploaded")

        # 3. Analyze floor plan
        analyze_res = self.client.post(f"/api/v1/floorplans/{job_id}/analyze/")
        self.assertEqual(analyze_res.status_code, status.HTTP_200_OK)
        self.assertEqual(analyze_res.data["status"], "awaiting_review")
        self.assertIn("rooms", analyze_res.data)
        self.assertIn("walls", analyze_res.data)
        self.assertIn("dimensions", analyze_res.data)

        # 4. Fetch geometry endpoint
        geo_res = self.client.get(f"/api/v1/floorplans/{job_id}/geometry/")
        self.assertEqual(geo_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(geo_res.data["rooms"]), len(analyze_res.data["rooms"]))

        # 5. User correction of geometry
        updated_dimensions = {"width": 11.0, "length": 9.0, "wallHeight": 3.0, "wallThickness": 0.25}
        update_res = self.client.put(
            f"/api/v1/floorplans/{job_id}/geometry/update/",
            data=json.dumps({"dimensions": updated_dimensions}),
            content_type="application/json"
        )
        self.assertEqual(update_res.status_code, status.HTTP_200_OK)
        self.assertEqual(update_res.data["geometry"]["dimensions"]["width"], 11.0)
        self.assertTrue(update_res.data["geometry"]["is_user_corrected"])

        # 6. Generate 3D GLB model
        gen_res = self.client.post(f"/api/v1/floorplans/{job_id}/generate-3d/")
        self.assertEqual(gen_res.status_code, status.HTTP_200_OK)
        self.assertEqual(gen_res.data["status"], "completed")
        self.assertIn("glb_url", gen_res.data["model"])
        self.assertGreater(gen_res.data["model"]["vertex_count"], 0)

        # 7. Retrieve model metadata & download URL
        model_res = self.client.get(f"/api/v1/floorplans/{job_id}/model/")
        self.assertEqual(model_res.status_code, status.HTTP_200_OK)
        self.assertIn(".glb", model_res.data["glb_url"])
        self.assertGreater(model_res.data["file_size"], 1000)

        # 8. Final status check
        final_status = self.client.get(f"/api/v1/floorplans/{job_id}/status/")
        self.assertEqual(final_status.data["status"], "completed")
        self.assertEqual(final_status.data["progress"], 100)
        self.assertTrue(final_status.data["has_model"])
