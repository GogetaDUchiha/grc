from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Assessment, KRI, RiskScore, ComplianceStatus, Regulation
from .serializers import AssessmentSerializer, AssessmentCreateSerializer
import random  # For simulated logs

class AssessmentListView(generics.ListAPIView):
    serializer_class = AssessmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Assessment.objects.filter(organization=self.request.user.userprofile.organization)

class AssessmentCreateView(generics.CreateAPIView):
    serializer_class = AssessmentCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        assessment = serializer.save(organization=self.request.user.userprofile.organization)
        self.calculate_kri_risk_compliance(assessment)

    def calculate_kri_risk_compliance(self, assessment):
        # KRI Engine: transform raw data to metrics
        kris = [
            KRI(assessment=assessment, name='MFA Coverage', value=assessment.mfa_percentage, weight=0.3),
            KRI(assessment=assessment, name='Patch Delay', value=assessment.patch_delay_days, weight=0.2),
            KRI(assessment=assessment, name='Encryption Coverage', value=assessment.encryption_percentage, weight=0.3),
            KRI(assessment=assessment, name='Suspicious Activity', value=random.uniform(0, 100), weight=0.2),  # Simulated
        ]
        for kri in kris:
            kri.save()

        # Risk Engine: weighted scoring
        risk_score_value = sum(kri.value * kri.weight for kri in kris)
        level = 'Low' if risk_score_value < 25 else 'Medium' if risk_score_value < 50 else 'High' if risk_score_value < 75 else 'Critical'
        RiskScore.objects.create(assessment=assessment, score=risk_score_value, level=level)

        # Compliance Engine
        regulations = Regulation.objects.all()
        for reg in regulations:
            if reg.name == 'PTA':
                status = 'Non-Compliant' if assessment.mfa_percentage < 50 else 'Compliant'
            elif reg.name == 'PECA':
                status = 'Non-Compliant' if assessment.encryption_percentage < 80 else 'Compliant'
            else:
                status = 'Partial'
            ComplianceStatus.objects.create(assessment=assessment, regulation=reg, status=status)

class AssessmentDetailView(generics.RetrieveAPIView):
    serializer_class = AssessmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Assessment.objects.filter(organization=self.request.user.userprofile.organization)
