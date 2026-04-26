from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.core.files.storage import default_storage
import json
import csv
import io

from .models import Regulation, Assessment, KRIRecord, ComplianceResult, AIOutput
from .serializers import (
    RegulationSerializer,
    AssessmentDetailSerializer,
    AssessmentListSerializer,
    AssessmentCreateSerializer,
    KRIRecordSerializer,
    ComplianceResultSerializer,
    AIOutputSerializer,
)
from .engines import KRIEngine, RiskEngine, ComplianceEngine, AIGovernanceAgent
from accounts.models import Organization


class RegulationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing regulations"""
    serializer_class = RegulationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        sector = self.request.query_params.get('sector')
        queryset = Regulation.objects.all()
        if sector:
            queryset = queryset.filter(sector=sector)
        return queryset

    @action(detail=False, methods=['post'])
    def create_sector_regulations(self, request):
        """Create default regulations for a sector (admin only)"""
        sector = request.data.get('sector')
        if not sector:
            return Response({'error': 'Sector is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create default regulations based on sector
        regulations = self._get_sector_regulations(sector)
        created = []
        
        for reg_data in regulations:
            reg, _ = Regulation.objects.get_or_create(
                sector=sector,
                name=reg_data['name'],
                defaults={
                    'description': reg_data['description'],
                    'rules': reg_data.get('rules', {}),
                }
            )
            created.append(RegulationSerializer(reg).data)
        
        return Response(created, status=status.HTTP_201_CREATED)

    def _get_sector_regulations(self, sector):
        """Get default regulations for each sector"""
        regulations_by_sector = {
            'Fintech': [
                {
                    'name': 'SBP Regulatory Sandbox Guidelines',
                    'description': 'State Bank of Pakistan Fintech regulatory guidelines',
                    'rules': {
                        'mfa_coverage_min': 80,
                        'patch_delay_max': 15,
                        'encryption_coverage_min': 90,
                    }
                },
                {
                    'name': 'SECP FinTech Regulations',
                    'description': 'Securities and Exchange Commission FinTech regulations',
                    'rules': {
                        'mfa_coverage_min': 80,
                        'incident_response_max_hours': 12,
                    }
                },
                {
                    'name': 'PTA Data Protection Guidelines',
                    'description': 'Pakistan Telecom Authority data protection guidelines',
                    'rules': {
                        'encryption_coverage_min': 85,
                        'log_retention_days_min': 90,
                    }
                },
            ],
            'Banking': [
                {
                    'name': 'SBP Cybersecurity Framework',
                    'description': 'State Bank of Pakistan cybersecurity framework',
                    'rules': {
                        'mfa_coverage_min': 90,
                        'patch_delay_max': 10,
                        'encryption_coverage_min': 95,
                    }
                },
                {
                    'name': 'PECA 2016',
                    'description': 'Prevention of Electronic Crimes Act 2016',
                    'rules': {
                        'log_retention_days_min': 180,
                        'incident_response_max_hours': 24,
                    }
                },
            ],
            'Telecom': [
                {
                    'name': 'PTA Cybersecurity Regulations',
                    'description': 'Pakistan Telecom Authority cybersecurity regulations',
                    'rules': {
                        'mfa_coverage_min': 80,
                        'encryption_coverage_min': 85,
                    }
                },
                {
                    'name': 'nCERT Baseline Security Standard',
                    'description': 'National Cyber Emergency Response Team baseline standards',
                    'rules': {
                        'patch_delay_max': 20,
                        'backup_freshness_max_days': 7,
                    }
                },
            ],
            'Government': [
                {
                    'name': 'nCERT Baseline Security Standard',
                    'description': 'National Cyber Emergency Response Team baseline standards',
                    'rules': {
                        'mfa_coverage_min': 90,
                        'encryption_coverage_min': 90,
                    }
                },
                {
                    'name': 'NTC Guidelines',
                    'description': 'National Technology Council guidelines',
                    'rules': {
                        'log_retention_days_min': 365,
                        'security_awareness_training_min': 80,
                    }
                },
            ],
            'IT': [
                {
                    'name': 'ISO 27001',
                    'description': 'ISO/IEC 27001 Information Security Management',
                    'rules': {
                        'mfa_coverage_min': 80,
                        'patch_delay_max': 30,
                        'encryption_coverage_min': 80,
                    }
                },
                {
                    'name': 'PTA Data Protection Guidelines',
                    'description': 'Pakistan Telecom Authority data protection guidelines',
                    'rules': {
                        'encryption_coverage_min': 80,
                        'log_retention_days_min': 90,
                    }
                },
            ],
        }
        return regulations_by_sector.get(sector, [])


class AssessmentViewSet(viewsets.ModelViewSet):
    """ViewSet for assessment operations"""
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return assessments for user's organizations"""
        return Assessment.objects.filter(
            organization__members__user=self.request.user
        ).distinct()

    def get_serializer_class(self):
        if self.action == 'list':
            return AssessmentListSerializer
        elif self.action == 'create':
            return AssessmentCreateSerializer
        return AssessmentDetailSerializer

    def perform_create(self, serializer):
        """Create assessment and trigger engine calculations"""
        # Get organization
        org_id = self.request.data.get('organization')
        try:
            org = Organization.objects.get(
                id=org_id,
                members__user=self.request.user
            )
        except Organization.DoesNotExist:
            raise PermissionError("Organization not found or you don't have access")
        
        assessment = serializer.save(
            organization=org,
            created_by=self.request.user
        )
        
        # Run analysis engines
        self.run_assessment_engines(assessment)

    def run_assessment_engines(self, assessment):
        """Execute all assessment engines"""
        kri_data = json.loads(self.request.data.get('kri_data', '{}'))
        
        # 1. KRI Engine: Normalize inputs
        kri_engine = KRIEngine(assessment.organization.sector)
        kri_results = kri_engine.process_kris(kri_data)
        
        # 2. Risk Engine: Calculate composite score
        risk_engine = RiskEngine(assessment.organization.sector)
        risk_score, risk_level = risk_engine.calculate_risk(kri_results)
        assessment.risk_score = risk_score
        assessment.risk_level = risk_level
        assessment.save()
        
        # 3. Compliance Engine: Check regulations
        compliance_engine = ComplianceEngine(assessment.organization.sector)
        compliance_violations = compliance_engine.check_compliance(kri_results)
        
        # 4. AI Governance Agent: Generate insights
        ai_agent = AIGovernanceAgent()
        ai_insights = ai_agent.generate_insights(
            kri_results,
            risk_score,
            risk_level,
            compliance_violations
        )
        
        # Save all results to database
        self._save_assessment_results(assessment, kri_results, compliance_violations, ai_insights)

    def _save_assessment_results(self, assessment, kri_results, compliance_violations, ai_insights):
        """Save all engine results to database"""
        # Save KRI Records
        for kri_name, kri_data in kri_results.items():
            KRIRecord.objects.create(
                assessment=assessment,
                kri_name=kri_name,
                raw_value=kri_data['raw_value'],
                normalized_score=kri_data['normalized_score'],
                band=kri_data['band'],
                threshold=kri_data['threshold'],
                weight=kri_data.get('weight', 1.0),
                unit=kri_data.get('unit', ''),
            )
        
        # Save Compliance Results
        regulations = Regulation.objects.filter(sector=assessment.organization.sector)
        for regulation in regulations:
            violations = compliance_violations.get(regulation.name, [])
            status_val = 'Compliant' if not violations else 'Partial'
            
            ComplianceResult.objects.create(
                assessment=assessment,
                regulation=regulation,
                status=status_val,
                violated_kri_names=violations,
                clause_reference=self._get_clause_reference(regulation.name),
            )
        
        # Save AI Output
        if ai_insights:
            AIOutput.objects.create(
                assessment=assessment,
                risk_explanation=ai_insights.get('risk_explanation', ''),
                threat_scenarios=ai_insights.get('threat_scenarios', []),
                remediation_steps=ai_insights.get('remediation_steps', []),
            )

    def _get_clause_reference(self, regulation_name):
        """Get clause reference for regulation"""
        clause_map = {
            'SBP Cybersecurity Framework': 'SBP Circular',
            'PECA 2016': 'Section 10-18',
            'PTA Data Protection Guidelines': 'PTA Circular',
            'SECP FinTech Regulations': 'SECP Advertisement',
            'nCERT Baseline Security Standard': 'nCERT Bulletin',
            'NTC Guidelines': 'NTC Framework',
            'ISO 27001': 'ISO 27001:2022',
        }
        return clause_map.get(regulation_name, '')

    @action(detail=True, methods=['get'])
    def report(self, request, pk=None):
        """Generate assessment report"""
        assessment = self.get_object()
        serializer = AssessmentDetailSerializer(assessment)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def upload_logs(self, request):
        """Process uploaded log file"""
        if 'file' not in request.FILES:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        uploaded_file = request.FILES['file']
        org_id = request.data.get('organization')
        
        # Parse file
        if uploaded_file.name.endswith('.csv'):
            kri_data = self._parse_csv_logs(uploaded_file)
        elif uploaded_file.name.endswith('.json'):
            kri_data = self._parse_json_logs(uploaded_file)
        else:
            return Response(
                {'error': 'File must be CSV or JSON'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response(kri_data)

    def _parse_csv_logs(self, file):
        """Parse CSV log file"""
        try:
            file.seek(0)
            reader = csv.DictReader(io.StringIO(file.read().decode('utf-8')))
            # Extract KRI values from CSV
            kri_data = {}
            for row in reader:
                # Implement parsing logic based on CSV structure
                pass
            return kri_data
        except Exception as e:
            raise ValueError(f"Error parsing CSV: {str(e)}")

    def _parse_json_logs(self, file):
        """Parse JSON log file"""
        try:
            file.seek(0)
            data = json.load(file)
            # Extract KRI values from JSON
            kri_data = {}
            return kri_data
        except Exception as e:
            raise ValueError(f"Error parsing JSON: {str(e)}")

    @action(detail=True, methods=['get'])
    def export_pdf(self, request, pk=None):
        """Export assessment as PDF"""
        from django.http import FileResponse
        from weasyprint import HTML
        import tempfile
        
        assessment = self.get_object()
        serializer = AssessmentDetailSerializer(assessment)
        
        # Generate PDF (simplified)
        # In production, use a proper PDF template
        
        return Response({'message': 'PDF generation not yet implemented'})


class KRIRecordViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing KRI records"""
    serializer_class = KRIRecordSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        assessment_id = self.request.query_params.get('assessment')
        queryset = KRIRecord.objects.all()
        if assessment_id:
            queryset = queryset.filter(assessment_id=assessment_id)
        return queryset


class ComplianceResultViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing compliance results"""
    serializer_class = ComplianceResultSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        assessment_id = self.request.query_params.get('assessment')
        queryset = ComplianceResult.objects.all()
        if assessment_id:
            queryset = queryset.filter(assessment_id=assessment_id)
        return queryset
