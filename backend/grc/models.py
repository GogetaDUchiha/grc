from django.db import models
from django.contrib.postgres.fields import ArrayField
from accounts.models import Organization, SECTOR_CHOICES
import json


class Regulation(models.Model):
    """Regulatory framework database"""
    sector = models.CharField(max_length=100, choices=SECTOR_CHOICES, default='Fintech')
    name = models.CharField(max_length=255)
    version = models.CharField(max_length=50, default="1.0")
    description = models.TextField(default='')
    source_url = models.URLField(blank=True, null=True)
    rules = models.JSONField(default=dict)
    last_fetched = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True)

    class Meta:
        unique_together = ('sector', 'name')
        ordering = ['sector', 'name']

    def __str__(self):
        return f"{self.name} ({self.sector})"


class Assessment(models.Model):
    """Represents a single risk assessment"""
    INPUT_MODE_CHOICES = [
        ('manual', 'Manual Input'),
        ('upload', 'File Upload'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='assessments')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Input data
    input_mode = models.CharField(max_length=20, choices=INPUT_MODE_CHOICES, default='manual')
    uploaded_file = models.FileField(upload_to='assessments/%Y/%m/%d/', blank=True, null=True)
    
    # Risk scoring
    risk_score = models.FloatField(default=0, help_text="0-100 scale")
    risk_level = models.CharField(
        max_length=20,
        choices=[
            ('Low', 'Low (0-30)'),
            ('Moderate', 'Moderate (31-55)'),
            ('High', 'High (56-75)'),
            ('Critical', 'Critical (76-100)'),
        ],
        default='Low'
    )
    
    created_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Assessment - {self.organization.name} ({self.get_risk_level_display()})"


class KRIRecord(models.Model):
    """Key Risk Indicator records"""
    BAND_CHOICES = [
        ('Safe', 'Safe (Green)'),
        ('Watch', 'Watch (Amber)'),
        ('Warning', 'Warning (Orange)'),
        ('Critical', 'Critical (Red)'),
    ]
    
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name='kri_records')
    kri_name = models.CharField(max_length=255)
    raw_value = models.FloatField()
    normalized_score = models.FloatField(help_text="0-100 normalized value")
    band = models.CharField(max_length=20, choices=BAND_CHOICES)
    threshold = models.FloatField()
    weight = models.FloatField(default=1.0)
    unit = models.CharField(max_length=50, blank=True)  # %, days, hours, ratio, count
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-normalized_score']

    def __str__(self):
        return f"{self.kri_name} ({self.band})"


class ComplianceResult(models.Model):
    """Compliance assessment results per regulation"""
    STATUS_CHOICES = [
        ('Compliant', 'Compliant'),
        ('Partial', 'Partial'),
        ('Non-Compliant', 'Non-Compliant'),
    ]
    
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name='compliance_results')
    regulation = models.ForeignKey(Regulation, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    violated_kri_names = models.JSONField(default=list)  # List of KRI names that caused violations
    clause_reference = models.CharField(max_length=255, blank=True)
    details = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['status', 'regulation__name']
        unique_together = ('assessment', 'regulation')

    def __str__(self):
        return f"{self.regulation.name} - {self.status}"


class AIOutput(models.Model):
    """Stores AI-generated governance insights"""
    assessment = models.OneToOneField(Assessment, on_delete=models.CASCADE, related_name='ai_output')
    
    risk_explanation = models.TextField()
    threat_scenarios = models.JSONField(default=list)  # List of threat scenarios
    remediation_steps = models.JSONField(default=list)  # List of remediation steps
    
    generated_at = models.DateTimeField(auto_now_add=True)
    model_used = models.CharField(max_length=100, default='gemini-pro')

    def __str__(self):
        return f"AI Output - Assessment {self.assessment.id}"


class RegulationDB(models.Model):
    """Cache for retrieved regulations (for agentic RAG)"""
    sector = models.CharField(max_length=100, choices=SECTOR_CHOICES)
    regulation_name = models.CharField(max_length=255)
    version = models.CharField(max_length=50)
    source_url = models.URLField()
    content = models.TextField()  # Full regulation text
    last_fetched = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('sector', 'regulation_name', 'version')

    def __str__(self):
        return f"{self.regulation_name} v{self.version}"
