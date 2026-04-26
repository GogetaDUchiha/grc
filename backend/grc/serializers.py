from rest_framework import serializers
from .models import (
    Regulation, 
    Assessment, 
    KRIRecord, 
    ComplianceResult,
    AIOutput,
    RegulationDB
)


class RegulationSerializer(serializers.ModelSerializer):
    """Serializer for Regulation model"""
    sector_display = serializers.CharField(source='get_sector_display', read_only=True)
    
    class Meta:
        model = Regulation
        fields = (
            'id', 'sector', 'sector_display', 'name', 'version', 
            'description', 'source_url', 'rules', 'last_fetched', 'created_at'
        )
        read_only_fields = ('last_fetched', 'created_at')


class KRIRecordSerializer(serializers.ModelSerializer):
    """Serializer for KRI Records"""
    band_display = serializers.CharField(source='get_band_display', read_only=True)
    
    class Meta:
        model = KRIRecord
        fields = (
            'id', 'assessment', 'kri_name', 'raw_value', 'normalized_score',
            'band', 'band_display', 'threshold', 'weight', 'unit', 'created_at'
        )
        read_only_fields = ('id', 'normalized_score', 'band', 'created_at')


class ComplianceResultSerializer(serializers.ModelSerializer):
    """Serializer for Compliance Results"""
    regulation_name = serializers.CharField(source='regulation.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = ComplianceResult
        fields = (
            'id', 'assessment', 'regulation', 'regulation_name', 'status',
            'status_display', 'violated_kri_names', 'clause_reference', 'details', 'created_at'
        )
        read_only_fields = ('id', 'created_at')


class AIOutputSerializer(serializers.ModelSerializer):
    """Serializer for AI-generated outputs"""
    
    class Meta:
        model = AIOutput
        fields = (
            'id', 'assessment', 'risk_explanation', 'threat_scenarios',
            'remediation_steps', 'generated_at', 'model_used'
        )
        read_only_fields = ('id', 'generated_at')


class AssessmentDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for Assessment including all related data"""
    kri_records = KRIRecordSerializer(many=True, read_only=True)
    compliance_results = ComplianceResultSerializer(many=True, read_only=True)
    ai_output = AIOutputSerializer(read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    risk_level_display = serializers.CharField(source='get_risk_level_display', read_only=True)
    
    class Meta:
        model = Assessment
        fields = (
            'id', 'organization', 'organization_name', 'created_at', 'updated_at',
            'input_mode', 'uploaded_file', 'risk_score', 'risk_level', 'risk_level_display',
            'created_by', 'kri_records', 'compliance_results', 'ai_output'
        )
        read_only_fields = (
            'id', 'created_at', 'updated_at', 'risk_score', 'risk_level',
            'kri_records', 'compliance_results', 'ai_output'
        )


class AssessmentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for Assessment list view"""
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    risk_level_display = serializers.CharField(source='get_risk_level_display', read_only=True)
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    
    class Meta:
        model = Assessment
        fields = (
            'id', 'organization', 'organization_name', 'created_at', 'updated_at',
            'risk_score', 'risk_level', 'risk_level_display', 'input_mode',
            'created_by', 'created_by_email'
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'risk_score', 'risk_level')


class AssessmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating assessments with KRI data"""
    kri_data = serializers.JSONField(write_only=True)
    
    class Meta:
        model = Assessment
        fields = ('organization', 'input_mode', 'uploaded_file', 'kri_data')


class RegulationDBSerializer(serializers.ModelSerializer):
    """Serializer for Regulation DB cache"""
    sector_display = serializers.CharField(source='get_sector_display', read_only=True)
    
    class Meta:
        model = RegulationDB
        fields = (
            'id', 'sector', 'sector_display', 'regulation_name', 'version',
            'source_url', 'content', 'last_fetched'
        )
        read_only_fields = ('id', 'last_fetched')