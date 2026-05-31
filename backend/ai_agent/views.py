from rest_framework import generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from grc.models import Assessment, KRIRecord


class AIRecommendationView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, assessment_id):
        assessment = Assessment.objects.filter(
            id=assessment_id,
            organization__members__user=request.user,
        ).first()
        if not assessment:
            return Response({'error': 'Assessment not found'}, status=404)

        recommendations = self.generate_recommendations(assessment)
        return Response({'recommendations': recommendations})

    def generate_recommendations(self, assessment):
        recs = []
        kri_map = {
            r.kri_name: r.raw_value
            for r in KRIRecord.objects.filter(assessment=assessment)
        }

        mfa = kri_map.get('MFA Coverage', 100)
        if mfa < 50:
            recs.append({
                'issue': 'MFA coverage is low',
                'regulatory_impact': 'Violates PTA Access Control Guidelines',
                'threat_insight': 'Susceptible to credential stuffing attacks',
                'recommendation': 'Enforce MFA across all privileged accounts',
            })

        patch_delay = kri_map.get('Patch Delay', 0)
        if patch_delay > 30:
            recs.append({
                'issue': 'Patch delay is high',
                'regulatory_impact': 'Violates PECA security standards',
                'threat_insight': 'Vulnerable to known exploits',
                'recommendation': 'Implement automated patching',
            })

        if not recs and assessment.ai_output:
            for step in (assessment.ai_output.remediation_steps or [])[:3]:
                recs.append({
                    'issue': 'AI-identified gap',
                    'regulatory_impact': 'See compliance proof in assessment',
                    'threat_insight': 'Derived from Gemini threat analysis',
                    'recommendation': step,
                })

        return recs
