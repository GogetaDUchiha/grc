from rest_framework import serializers
from .models import Assessment, KRI, RiskScore, ComplianceStatus, Regulation

class KRISerializer(serializers.ModelSerializer):
    class Meta:
        model = KRI
        fields = '__all__'

class ComplianceStatusSerializer(serializers.ModelSerializer):
    regulation = serializers.StringRelatedField()

    class Meta:
        model = ComplianceStatus
        fields = '__all__'

class RiskScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = RiskScore
        fields = '__all__'

class AssessmentSerializer(serializers.ModelSerializer):
    kris = KRISerializer(many=True, read_only=True)
    compliance_statuses = ComplianceStatusSerializer(many=True, read_only=True)
    risk_score = RiskScoreSerializer(read_only=True)

    class Meta:
        model = Assessment
        fields = '__all__'

class AssessmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assessment
        fields = '__all__'