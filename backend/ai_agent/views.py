from rest_framework import generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from grc.models import Assessment

class AIRecommendationView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, assessment_id):
        try:
            assessment = Assessment.objects.get(id=assessment_id, organization=request.user.userprofile.organization)
            recommendations = self.generate_recommendations(assessment)
            return Response({'recommendations': recommendations})
        except Assessment.DoesNotExist:
            return Response({'error': 'Assessment not found'}, status=404)

    def generate_recommendations(self, assessment):
        recs = []
        if assessment.mfa_percentage < 50:
            recs.append({
                'issue': 'MFA coverage is low',
                'regulatory_impact': 'Violates PTA Access Control Guidelines',
                'threat_insight': 'Susceptible to credential stuffing attacks',
                'recommendation': 'Enforce MFA across all privileged accounts'
            })
        if assessment.patch_delay_days > 30:
            recs.append({
                'issue': 'Patch delay is high',
                'regulatory_impact': 'Violates PECA security standards',
                'threat_insight': 'Vulnerable to known exploits',
                'recommendation': 'Implement automated patching'
            })
        # Add more rules
        return recs
