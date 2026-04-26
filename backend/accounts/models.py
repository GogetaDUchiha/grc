from django.db import models
from django.contrib.auth.models import User


SECTOR_CHOICES = [
    ('Fintech', 'Fintech'),
    ('Banking', 'Banking'),
    ('Telecom', 'Telecom'),
    ('Government', 'Government'),
    ('IT', 'IT / Corporate'),
]


class Organization(models.Model):
    """Organization model for multi-org support"""
    name = models.CharField(max_length=255)
    sector = models.CharField(max_length=100, choices=SECTOR_CHOICES)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='organizations', null=True, blank=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.sector})"


class UserOrganization(models.Model):
    """Bridge table for user-organization relationships with roles"""
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('member', 'Member'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='org_memberships')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='members')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'organization')

    def __str__(self):
        return f"{self.user.email} - {self.organization.name} ({self.role})"
