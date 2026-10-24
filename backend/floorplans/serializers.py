from rest_framework import serializers
from .models import FloorPlanJob, UploadedFloorPlan, DetectedGeometry, GeneratedModel


class FloorPlanUploadSerializer(serializers.Serializer):
    image = serializers.ImageField(required=True)
    reference_length_meters = serializers.FloatField(required=False, min_value=0.5, max_value=100.0)
    pixel_distance = serializers.FloatField(required=False, min_value=10.0, max_value=20000.0)
    known_width_meters = serializers.FloatField(required=False, min_value=2.0, max_value=100.0)
    unit = serializers.ChoiceField(choices=['meters', 'feet'], default='meters')

    def validate_image(self, value):
        max_size = 25 * 1024 * 1024  # 25MB
        if value.size > max_size:
            raise serializers.ValidationError(f"Image file size ({value.size / (1024*1024):.1f}MB) exceeds 25MB limit.")
        ext = value.name.split('.')[-1].lower()
        if ext not in ['png', 'jpg', 'jpeg', 'webp']:
            raise serializers.ValidationError("Only PNG, JPG, JPEG, and WebP floor plans are supported.")
        return value


class FloorPlanJobStatusSerializer(serializers.ModelSerializer):
    upload_url = serializers.SerializerMethodField()
    has_geometry = serializers.SerializerMethodField()
    has_model = serializers.SerializerMethodField()

    class Meta:
        model = FloorPlanJob
        fields = [
            'id',
            'status',
            'progress',
            'stage',
            'error_message',
            'warnings',
            'calibration_params',
            'upload_url',
            'has_geometry',
            'has_model',
            'created_at',
            'updated_at',
        ]

    def get_upload_url(self, obj):
        if hasattr(obj, 'upload') and obj.upload.image:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.upload.image.url) if request else obj.upload.image.url
        return None

    def get_has_geometry(self, obj):
        return hasattr(obj, 'geometry')

    def get_has_model(self, obj):
        return hasattr(obj, 'model') and bool(obj.model.glb_file)


class DetectedGeometrySerializer(serializers.ModelSerializer):
    class Meta:
        model = DetectedGeometry
        fields = [
            'dimensions',
            'rooms',
            'walls',
            'confidence_score',
            'diagnostics',
            'is_user_corrected',
            'updated_at',
        ]

    def validate_dimensions(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Dimensions must be a JSON object.")
        for k in ['width', 'length']:
            if k not in value or float(value[k]) <= 0:
                raise serializers.ValidationError(f"Dimensions must include a positive '{k}'.")
        return value

    def validate_rooms(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Rooms must be an array.")
        return value

    def validate_walls(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Walls must be an array.")
        return value


class GeneratedModelSerializer(serializers.ModelSerializer):
    glb_url = serializers.SerializerMethodField()

    class Meta:
        model = GeneratedModel
        fields = [
            'glb_url',
            'file_size',
            'vertex_count',
            'face_count',
            'bounding_box',
            'generated_at',
        ]

    def get_glb_url(self, obj):
        if obj.glb_file:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.glb_file.url) if request else obj.glb_file.url
        return None
