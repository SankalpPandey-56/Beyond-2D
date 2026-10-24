import uuid
from django.db import models


class JobStatus(models.TextChoices):
    UPLOADED = 'uploaded', 'Uploaded'
    ANALYZING = 'analyzing', 'Analyzing'
    AWAITING_REVIEW = 'awaiting_review', 'Awaiting Review'
    GENERATING = 'generating', 'Generating'
    COMPLETED = 'completed', 'Completed'
    FAILED = 'failed', 'Failed'


class FloorPlanJob(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    status = models.CharField(
        max_length=32,
        choices=JobStatus.choices,
        default=JobStatus.UPLOADED,
        db_index=True,
    )
    progress = models.IntegerField(default=10)
    stage = models.CharField(max_length=64, default='Image Uploaded')
    error_message = models.TextField(blank=True, null=True)
    warnings = models.JSONField(default=list, blank=True)
    calibration_params = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Job {self.id} [{self.status}]"


class UploadedFloorPlan(models.Model):
    job = models.OneToOneField(
        FloorPlanJob,
        on_delete=models.CASCADE,
        related_name='upload',
    )
    image = models.ImageField(upload_to='uploads/%Y/%m/%d/')
    original_filename = models.CharField(max_length=255)
    file_size = models.BigIntegerField(help_text='File size in bytes')
    mime_type = models.CharField(max_length=64)
    width = models.IntegerField(help_text='Image width in pixels')
    height = models.IntegerField(help_text='Image height in pixels')
    is_valid = models.BooleanField(default=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Upload for {self.job_id} ({self.original_filename})"


class DetectedGeometry(models.Model):
    job = models.OneToOneField(
        FloorPlanJob,
        on_delete=models.CASCADE,
        related_name='geometry',
    )
    dimensions = models.JSONField(
        default=dict,
        help_text='Building dimensions: width, length, wallHeight, wallThickness',
    )
    rooms = models.JSONField(
        default=list,
        help_text='List of room polygons and metadata matching frontend schema',
    )
    walls = models.JSONField(
        default=list,
        help_text='List of wall segments with metric coordinates and openings',
    )
    confidence_score = models.FloatField(default=0.0)
    diagnostics = models.JSONField(default=dict, blank=True)
    is_user_corrected = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Geometry for {self.job_id} ({len(self.rooms)} rooms, {len(self.walls)} walls)"


class GeneratedModel(models.Model):
    job = models.OneToOneField(
        FloorPlanJob,
        on_delete=models.CASCADE,
        related_name='model',
    )
    glb_file = models.FileField(upload_to='generated/%Y/%m/%d/')
    file_size = models.BigIntegerField(default=0, help_text='GLB file size in bytes')
    vertex_count = models.IntegerField(default=0)
    face_count = models.IntegerField(default=0)
    bounding_box = models.JSONField(default=dict, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"3D Model for {self.job_id} ({self.vertex_count} vertices)"
