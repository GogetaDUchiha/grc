from django.urls import path
from .views import AIRecommendationView

urlpatterns = [
    path('recommendations/<int:assessment_id>/', AIRecommendationView.as_view(), name='ai-recommendations'),
]