import io
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from floorplans.models import FloorPlanJob, JobStatus
from .fixtures import create_synthetic_floorplan_image


class FloorPlanUploadTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_valid_image_upload(self):
        img_bytes = create_synthetic_floorplan_image()
        upload_file = SimpleUploadedFile("floorplan.png", img_bytes, content_type="image/png")

        response = self.client.post(
            "/api/v1/floorplans/upload/",
            {"image": upload_file, "known_width_meters": 12.0},
            format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("job_id", response.data)
        self.assertEqual(response.data["status"], JobStatus.UPLOADED)

        # Verify database record
        job = FloorPlanJob.objects.get(id=response.data["job_id"])
        self.assertIsNotNone(job.upload)
        self.assertEqual(job.upload.width, 500)
        self.assertEqual(job.upload.height, 400)

    def test_invalid_file_format_rejected(self):
        fake_file = SimpleUploadedFile("script.sh", b"#!/bin/bash\necho hello", content_type="text/plain")
        response = self.client.post(
            "/api/v1/floorplans/upload/",
            {"image": fake_file},
            format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_corrupted_image_rejected(self):
        corrupted_file = SimpleUploadedFile("broken.png", b"not-a-valid-png-stream", content_type="image/png")
        response = self.client.post(
            "/api/v1/floorplans/upload/",
            {"image": corrupted_file},
            format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
