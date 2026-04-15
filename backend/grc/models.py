from django.db import models
from accounts.models import Organization

class Regulation(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()

    def __str__(self):
        return self.name

class Assessment(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    mfa_percentage = models.FloatField(default=0)
    patch_delay_days = models.FloatField(default=0)
    encryption_percentage = models.FloatField(default=0)
    # Add more fields as needed

class KRI(models.Model):
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    value = models.FloatField()
    weight = models.FloatField(default=1.0)

class RiskScore(models.Model):
    assessment = models.OneToOneField(Assessment, on_delete=models.CASCADE)
    score = models.FloatField()
    level = models.CharField(max_length=20, choices=[
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
        ('Critical', 'Critical'),
    ])

class ComplianceStatus(models.Model):
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE)
    regulation = models.ForeignKey(Regulation, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=[
        ('Compliant', 'Compliant'),
        ('Non-Compliant', 'Non-Compliant'),
        ('Partial', 'Partial'),
    ])
