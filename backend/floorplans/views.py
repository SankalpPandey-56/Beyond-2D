import os
import uuid
from django.core.files.base import ContentFile
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from .models import FloorPlanJob, UploadedFloorPlan, DetectedGeometry, GeneratedModel, JobStatus
from .serializers import (
    FloorPlanUploadSerializer,
    FloorPlanJobStatusSerializer,
    DetectedGeometrySerializer,
    GeneratedModelSerializer,
)
from .services.image_preprocessing import validate_image_file, preprocess_floorplan
from .services.scale_calibration import calculate_scale
from .services.feature_detection import detect_architectural_features
from .services.geometry_extraction import build_structured_geometry
from .services.mesh_generation import generate_3d_building_mesh
from .services.model_validation import validate_glb_model


@api_view(['GET'])
def health_check(request):
    """
    Health check endpoint reporting dependency status.
    """
    import cv2
    import numpy as np
    import trimesh
    import shapely
    import PIL
    import django

    return Response({
        'status': 'healthy',
        'service': 'Beyond-2D Architectural Geometry Engine',
        'version': '1.0.0',
        'dependencies': {
            'django': django.__version__,
            'opencv': cv2.__version__,
            'trimesh': trimesh.__version__,
            'numpy': np.__version__,
            'shapely': shapely.__version__,
            'pillow': PIL.__version__,
        },
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def upload_floorplan(request):
    """
    Upload a 2D floor-plan image with optional scale calibration parameters.
    """
    serializer = FloorPlanUploadSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    image_file = serializer.validated_data['image']
    calibration_params = {
        'reference_length_meters': serializer.validated_data.get('reference_length_meters'),
        'pixel_distance': serializer.validated_data.get('pixel_distance'),
        'known_width_meters': serializer.validated_data.get('known_width_meters'),
        'unit': serializer.validated_data.get('unit', 'meters'),
    }

    # Create Job
    job = FloorPlanJob.objects.create(
        status=JobStatus.UPLOADED,
        progress=15,
        stage='Image Uploaded',
        calibration_params={k: v for k, v in calibration_params.items() if v is not None},
    )

    # Save Uploaded Floor Plan
    upload_record = UploadedFloorPlan.objects.create(
        job=job,
        image=image_file,
        original_filename=image_file.name,
        file_size=image_file.size,
        mime_type=image_file.content_type or 'image/jpeg',
        width=0,
        height=0,
    )

    # Validate image file integrity
    try:
        val_info = validate_image_file(upload_record.image.path)
        upload_record.width = val_info['width']
        upload_record.height = val_info['height']
        upload_record.save(update_fields=['width', 'height'])
    except Exception as e:
        job.status = JobStatus.FAILED
        job.error_message = str(e)
        job.save()
        return Response({
            'job_id': str(job.id),
            'status': 'failed',
            'error': str(e),
        }, status=status.HTTP_400_BAD_REQUEST)

    job_serializer = FloorPlanJobStatusSerializer(job, context={'request': request})
    return Response({
        'job_id': str(job.id),
        'status': job.status,
        'image': {
            'filename': upload_record.original_filename,
            'url': job_serializer.data.get('upload_url'),
            'width': upload_record.width,
            'height': upload_record.height,
            'file_size': upload_record.file_size,
        },
        'message': 'Floor plan uploaded successfully. Ready for architectural analysis.',
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def analyze_floorplan(request, job_id):
    """
    Executes OpenCV computer-vision feature detection and geometry extraction on the uploaded plan.
    """
    job = get_object_or_404(FloorPlanJob, id=job_id)
    if not hasattr(job, 'upload'):
        return Response({'error': 'No uploaded image found for this job.'}, status=status.HTTP_400_BAD_REQUEST)

    job.status = JobStatus.ANALYZING
    job.progress = 35
    job.stage = 'Detecting Architectural Features'
    job.save()

    image_path = job.upload.image.path
    warnings = []

    try:
        # 1. Preprocess Image
        binary_walls, gray_img, scale_ratio, prep_meta = preprocess_floorplan(image_path)
        img_h, img_w = binary_walls.shape

        # 2. Compute Scale Calibration
        ppm, is_estimated, dimensions = calculate_scale(
            job.upload.width,
            job.upload.height,
            job.calibration_params,
        )
        if is_estimated:
            warnings.append(
                f"No calibration reference provided. Dimensions estimated assuming a standard {dimensions['width']}m x {dimensions['length']}m building footprint."
            )

        # 3. Detect Features (walls, rooms, openings)
        features = detect_architectural_features(binary_walls, img_w, img_h)

        if len(features.get('rooms', [])) == 0:
            warnings.append("Automatic room segmentation found low contrast boundaries. Generated baseline architectural envelope.")

        # 4. Extract Structured Geometry
        geometry_data = build_structured_geometry(features, img_w, img_h, dimensions)

        # 5. Save or Update DetectedGeometry
        geometry_obj, _ = DetectedGeometry.objects.update_or_create(
            job=job,
            defaults={
                'dimensions': geometry_data['dimensions'],
                'rooms': geometry_data['rooms'],
                'walls': geometry_data['walls'],
                'confidence_score': features['confidence'],
                'diagnostics': {
                    **features['diagnostics'],
                    'pixels_per_meter': round(ppm, 2),
                    'is_scale_estimated': is_estimated,
                },
                'is_user_corrected': False,
            },
        )

        job.status = JobStatus.AWAITING_REVIEW
        job.progress = 65
        job.stage = 'Awaiting Review / Ready for 3D Generation'
        job.warnings = warnings
        job.save()

        return Response({
            'job_id': str(job.id),
            'status': job.status,
            'confidence': geometry_obj.confidence_score,
            'warnings': warnings,
            'dimensions': geometry_obj.dimensions,
            'rooms': geometry_obj.rooms,
            'walls': geometry_obj.walls,
            'diagnostics': geometry_obj.diagnostics,
        }, status=status.HTTP_200_OK)

    except Exception as e:
        job.status = JobStatus.FAILED
        job.error_message = f"Analysis pipeline failed: {str(e)}"
        job.save()
        return Response({
            'job_id': str(job.id),
            'status': 'failed',
            'error': job.error_message,
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
@parser_classes([JSONParser])
def update_geometry(request, job_id):
    """
    Submits user or frontend corrections to dimensions, rooms, walls, and openings before 3D generation.
    """
    job = get_object_or_404(FloorPlanJob, id=job_id)
    if not hasattr(job, 'geometry'):
        return Response({'error': 'Job must be analyzed before submitting geometry corrections.'}, status=status.HTTP_400_BAD_REQUEST)

    serializer = DetectedGeometrySerializer(job.geometry, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    geometry = serializer.save(is_user_corrected=True)
    return Response({
        'job_id': str(job.id),
        'status': job.status,
        'message': 'Geometry updated successfully.',
        'geometry': DetectedGeometrySerializer(geometry).data,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
def generate_3d_model(request, job_id):
    """
    Generates the 3D architectural model using Trimesh and exports a validated binary GLB (.glb).
    """
    job = get_object_or_404(FloorPlanJob, id=job_id)
    if not hasattr(job, 'geometry'):
        return Response({'error': 'No geometry found for this job. Run analysis first.'}, status=status.HTTP_400_BAD_REQUEST)

    job.status = JobStatus.GENERATING
    job.progress = 85
    job.stage = 'Generating 3D Geometry and GLB'
    job.save()

    try:
        geometry = job.geometry
        geometry_data = {
            'dimensions': geometry.dimensions,
            'rooms': geometry.rooms,
            'walls': geometry.walls,
        }

        # Generate 3D mesh and GLB binary
        glb_bytes, mesh_stats = generate_3d_building_mesh(geometry_data)

        # Validate GLB model
        is_valid, val_msg, val_stats = validate_glb_model(glb_bytes)
        if not is_valid:
            raise ValueError(f"Generated GLB failed validation: {val_msg}")

        # Save GLB file to Django Storage
        filename = f"model_{job.id}.glb"
        model_obj, _ = GeneratedModel.objects.update_or_create(
            job=job,
            defaults={
                'file_size': mesh_stats['file_size_bytes'],
                'vertex_count': mesh_stats['vertex_count'],
                'face_count': mesh_stats['face_count'],
                'bounding_box': mesh_stats['bounding_box'],
            },
        )
        model_obj.glb_file.save(filename, ContentFile(glb_bytes), save=True)

        job.status = JobStatus.COMPLETED
        job.progress = 100
        job.stage = 'Completed'
        job.save()

        model_serializer = GeneratedModelSerializer(model_obj, context={'request': request})
        return Response({
            'job_id': str(job.id),
            'status': job.status,
            'model': model_serializer.data,
            'dimensions': geometry.dimensions,
            'message': '3D architectural model generated successfully in GLB format.',
        }, status=status.HTTP_200_OK)

    except Exception as e:
        job.status = JobStatus.FAILED
        job.error_message = f"3D model generation failed: {str(e)}"
        job.save()
        return Response({
            'job_id': str(job.id),
            'status': 'failed',
            'error': job.error_message,
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_job_status(request, job_id):
    """
    Returns current job progress, stage, status, errors, and asset links.
    """
    job = get_object_or_404(FloorPlanJob, id=job_id)
    serializer = FloorPlanJobStatusSerializer(job, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
def get_job_geometry(request, job_id):
    """
    Returns the structured architectural geometry JSON for editing or rendering in the frontend.
    """
    job = get_object_or_404(FloorPlanJob, id=job_id)
    if not hasattr(job, 'geometry'):
        return Response({'error': 'No geometry available for this job yet.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = DetectedGeometrySerializer(job.geometry)
    return Response({
        'job_id': str(job.id),
        'status': job.status,
        **serializer.data,
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
def get_job_model(request, job_id):
    """
    Returns the generated 3D model metadata and download URL.
    """
    job = get_object_or_404(FloorPlanJob, id=job_id)
    if not hasattr(job, 'model') or not job.model.glb_file:
        return Response({'error': 'No 3D model generated for this job yet.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = GeneratedModelSerializer(job.model, context={'request': request})
    return Response({
        'job_id': str(job.id),
        'status': job.status,
        **serializer.data,
    }, status=status.HTTP_200_OK)
