from django.urls import path
from .views import RegisterView, LoginView, OrganizationListView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('organizations/', OrganizationListView.as_view(), name='organizations'),
]