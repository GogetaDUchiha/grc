from django.db import models
from django.contrib.auth.models import User

class Organization(models.Model):
    name = models.CharField(max_length=255)
    sector = models.CharField(max_length=100, choices=[
        ('Banking', 'Banking'),
        ('Telecom', 'Telecom'),
        ('IT', 'IT'),
        ('Govt', 'Government'),
    ])
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.user.username} - {self.organization.name}"
