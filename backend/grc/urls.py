from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegulationViewSet,
    AssessmentViewSet,
    KRIRecordViewSet,
    ComplianceResultViewSet,
)

router = DefaultRouter()
router.register(r'regulations', RegulationViewSet, basename='regulation')
router.register(r'assessments', AssessmentViewSet, basename='assessment')
router.register(r'kri-records', KRIRecordViewSet, basename='kri-record')
router.register(r'compliance-results', ComplianceResultViewSet, basename='compliance-result')

urlpatterns = [
    path('', include(router.urls)),
]