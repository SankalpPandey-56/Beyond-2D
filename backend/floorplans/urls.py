from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.health_check, name='health_check'),
    path('floorplans/upload/', views.upload_floorplan, name='upload_floorplan'),
    path('floorplans/<uuid:job_id>/analyze/', views.analyze_floorplan, name='analyze_floorplan'),
    path('floorplans/<uuid:job_id>/geometry/', views.get_job_geometry, name='get_job_geometry'),
    path('floorplans/<uuid:job_id>/geometry/update/', views.update_geometry, name='update_geometry'),
    path('floorplans/<uuid:job_id>/generate-3d/', views.generate_3d_model, name='generate_3d_model'),
    path('floorplans/<uuid:job_id>/status/', views.get_job_status, name='get_job_status'),
    path('floorplans/<uuid:job_id>/model/', views.get_job_model, name='get_job_model'),
]
