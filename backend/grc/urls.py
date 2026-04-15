from django.urls import path
from .views import AssessmentListView, AssessmentCreateView, AssessmentDetailView

urlpatterns = [
    path('assessments/', AssessmentListView.as_view(), name='assessments'),
    path('assessments/create/', AssessmentCreateView.as_view(), name='assessment-create'),
    path('assessments/<int:pk>/', AssessmentDetailView.as_view(), name='assessment-detail'),
]