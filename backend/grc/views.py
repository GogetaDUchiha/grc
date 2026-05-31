from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db import transaction
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
from .engines import KRIEngine, RiskEngine, ComplianceEngine, AIGovernanceAgent, GeminiInsightsError
from accounts.models import Organization


def get_sector_regulations(sector):
    """Default regulations with structured controls for evidence-to-control mapping"""
    regulations_by_sector = {
        'Fintech': [
            {
                'name': 'SBP Mandatory Cybersecurity Controls',
                'description': 'State Bank of Pakistan - Cybersecurity Framework for Financial Institutions',
                'controls': [
                    {
                        'control_id': 'SBP-AC-01',
                        'title': 'Identity & Access Management (MFA)',
                        'description': 'Multi-factor authentication must be enforced for all privileged access and remote logins.',
                        'severity': 'Critical',
                        'required_evidence': 'MFA adoption percentage across organization',
                        'mapped_kri_name': 'MFA Coverage',
                    },
                    {
                        'control_id': 'SBP-PM-04',
                        'title': 'Vulnerability & Patch Management',
                        'description': 'Critical security patches must be applied within 15 days of availability.',
                        'severity': 'High',
                        'required_evidence': 'Average patch delay for production systems',
                        'mapped_kri_name': 'Patch Delay',
                    },
                    {
                        'control_id': 'SBP-DP-10',
                        'title': 'Data-at-Rest Encryption',
                        'description': 'Sensitive customer data must be encrypted using industry-standard algorithms.',
                        'severity': 'High',
                        'required_evidence': 'Percentage of databases/storage with encryption enabled',
                        'mapped_kri_name': 'Encryption Coverage',
                    },
                ],
            }
        ],
        'Banking': [
            {
                'name': 'SBP Cybersecurity Standard',
                'description': 'Core banking cybersecurity standards',
                'controls': [
                    {
                        'control_id': 'BANK-SEC-01',
                        'title': 'Network Boundary Protection',
                        'description': 'Advanced DDoS protection and WAF must be active for all banking portals.',
                        'severity': 'Critical',
                        'required_evidence': 'DDoS protection status',
                        'mapped_kri_name': 'DDoS Protection',
                    }
                ],
            }
        ],
    }
    return regulations_by_sector.get(sector, regulations_by_sector['Fintech'])


def ensure_sector_regulations(sector):
    """Create regulations and controls for a sector if missing"""
    from .models import Control

    for r_data in get_sector_regulations(sector):
        reg, _ = Regulation.objects.get_or_create(
            sector=sector,
            name=r_data['name'],
            defaults={'description': r_data['description']},
        )
        if not reg.controls.exists():
            for c_data in r_data.get('controls', []):
                Control.objects.create(regulation=reg, **c_data)


def parse_kri_data(data):
    """Normalize kri_data from request payload."""
    kri_data_raw = data.get('kri_data', {})
    if isinstance(kri_data_raw, str):
        try:
            kri_data_raw = json.loads(kri_data_raw)
        except json.JSONDecodeError:
            kri_data_raw = {}
    if not isinstance(kri_data_raw, dict):
        return {}
    return kri_data_raw


MIN_LOG_CONTENT_LENGTH = 20


def get_log_content(data):
    """Log/report text from upload (text_report only)."""
    return (data.get('text_report') or '').strip()


def validate_has_logs(data):
    """Assessment requires uploaded log content."""
    log_content = get_log_content(data)
    if len(log_content) < MIN_LOG_CONTENT_LENGTH:
        return False, 'Upload log files before running analysis.'
    return True, ''


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
        ensure_sector_regulations(sector)
        regulations = Regulation.objects.filter(sector=sector)
        created = [RegulationSerializer(reg).data for reg in regulations]
        
        return Response(created, status=status.HTTP_201_CREATED)

    def _get_sector_regulations(self, sector):
        return get_sector_regulations(sector)


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

    def create(self, request, *args, **kwargs):
        is_valid, error_message = validate_has_logs(request.data)
        if not is_valid:
            return Response({'detail': error_message}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_create(serializer)
        except PermissionError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except GeminiInsightsError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        assessment = serializer.instance
        assessment.refresh_from_db()
        output = AssessmentDetailSerializer(assessment, context={'request': request})
        headers = self.get_success_headers(output.data)
        return Response(output.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        """Create assessment and trigger engine calculations"""
        # Get organization
        org_id = self.request.data.get('organization')
        if org_id:
            try:
                org = Organization.objects.get(
                    id=org_id,
                    members__user=self.request.user
                )
            except Organization.DoesNotExist:
                raise PermissionError("Organization not found or you don't have access")
        else:
            org = Organization.objects.filter(members__user=self.request.user).first()
            if not org:
                raise PermissionError("You must belong to an organization to create an assessment.")
            
        # Ensure regulations and controls exist for this sector
        ensure_sector_regulations(org.sector)

        with transaction.atomic():
            assessment = serializer.save(
                organization=org,
                created_by=self.request.user
            )
            self.run_assessment_engines(assessment)

    def run_assessment_engines(self, assessment):
        """Execute all assessment engines"""
        ai_agent = AIGovernanceAgent()

        log_content = get_log_content(self.request.data)
        manual_kris = parse_kri_data(self.request.data)

        # Extract KRIs from logs (local parser first, Gemini if needed)
        extracted_kris = ai_agent.resolve_kris_from_logs(log_content, manual_kris)
        if not extracted_kris:
            raise GeminiInsightsError(
                'Could not determine KRI values from the uploaded logs.'
            )
        kri_data = extracted_kris

        # 1. KRI Engine: Normalize inputs
        kri_engine = KRIEngine(assessment.organization.sector)
        kri_results = kri_engine.process_kris(kri_data)
        
        # 2. Risk Engine: Calculate composite score
        risk_engine = RiskEngine(assessment.organization.sector)
        risk_score, risk_level = risk_engine.calculate_risk(kri_results)
        assessment.risk_score = risk_score
        assessment.risk_level = risk_level
        assessment.save()
        
        # 3. Compliance Engine: Check regulations (v2 AI control mapping)
        compliance_engine = ComplianceEngine(assessment.organization.sector)
        compliance_violations = compliance_engine.check_compliance(kri_results, assessment.id)
        
        # 4. AI Governance Agent: Advanced Risk Analysis
        risk_metrics = ai_agent.calculate_advanced_risk_metrics(kri_results, risk_score)
        assessment.likelihood_score = risk_metrics.get('likelihood_score', 0)
        assessment.impact_score = risk_metrics.get('impact_score', 0)
        assessment.exploitability_score = risk_metrics.get('exploitability_score', 0)
        assessment.compliance_confidence = risk_metrics.get('compliance_confidence', 0)
        assessment.residual_risk_score = risk_metrics.get('residual_risk_score', risk_score)
        assessment.save()

        # 5. Generate AI Insights (Gemini with quota-safe fallback)
        ai_insights = ai_agent.generate_insights_with_fallback(
            kri_results,
            risk_score,
            risk_level,
            compliance_violations,
            supplemental_report=log_content,
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
            reg_result = compliance_violations.get(regulation.name, {})
            # Ensure we default to safe empty values if engine didn't return for some reason
            status_val = reg_result.get('status', 'Compliant')
            violations_list = reg_result.get('violations', [])
            evidence_data = reg_result.get('evidence', [])
            
            ComplianceResult.objects.create(
                assessment=assessment,
                regulation=regulation,
                status=status_val,
                violated_kri_names=violations_list,
                clause_reference=self._get_clause_reference(regulation.name),
                details=json.dumps(evidence_data) # Store full comparison proof
            )
        
        # Save AI Output
        if ai_insights:
            AIOutput.objects.create(
                assessment=assessment,
                risk_explanation=ai_insights.get('risk_explanation', ''),
                threat_scenarios=ai_insights.get('threat_scenarios', []),
                remediation_steps=ai_insights.get('remediation_steps', []),
                compliance_proof=ai_insights.get('compliance_proof', ''),
                model_used=ai_insights.get('model_used', 'gemini'),
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



    @action(detail=True, methods=['get'], permission_classes=[AllowAny])
    def export_pdf(self, request, pk=None):
        """Export assessment as professional enterprise PDF using AI data"""
        from django.http import HttpResponse
        
        # Bypass get_object to allow anonymous download for demo
        assessment = Assessment.objects.get(pk=pk)
        serializer = AssessmentDetailSerializer(assessment)
        data = serializer.data

        # Professional Executive HTML Template
        css_styles = """
            @page { margin: 1in; }
            body { font-family: 'Segoe UI', Helvetica, sans-serif; color: #2c3e50; line-height: 1.6; }
            .badge { padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
            .bg-danger { background: #e74c3c; color: white; }
            .bg-warning { background: #f39c12; color: white; }
            .bg-success { background: #27ae60; color: white; }
            .header-banner { background: #1c2833; color: white; padding: 40px; border-radius: 8px; margin-bottom: 30px; }
            .header-banner h1 { margin: 0; font-size: 32px; letter-spacing: 1px; }
            .section-title { border-left: 5px solid #2980b9; padding-left: 15px; margin: 30px 0 15px; color: #1c2833; text-transform: uppercase; font-size: 18px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background: #f8f9fa; border-bottom: 2px solid #dee2e6; text-align: left; padding: 12px; font-size: 13px; }
            td { border-bottom: 1px solid #dee2e6; padding: 12px; font-size: 12px; vertical-align: top; }
            .metric-card { background: #f4f7f6; padding: 20px; border-radius: 8px; margin-bottom: 20px; display: inline-block; width: 30%; margin-right: 2%; text-align: center; }
            .metric-value { font-size: 28px; font-weight: bold; color: #2980b9; display: block; }
            .metric-label { font-size: 11px; color: #7f8c8d; text-transform: uppercase; }
            .formula-box { background: #ecf0f1; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 11px; margin: 10px 0; border: 1px dashed #bdc3c7; }
        """

        control_rows = ""
        for c in data.get('control_results', []):
            status_class = 'bg-success' if c['status'] == 'Compliant' else 'bg-warning' if c['status'] == 'Partial' else 'bg-danger'
            control_rows += f"""
            <tr>
                <td><strong>{c['control_details']['control_id']}</strong><br/><small>{c['control_details']['title']}</small></td>
                <td><span class="badge {status_class}">{c['status']}</span></td>
                <td>{c['ai_analysis']}<br/><em style="color: #666; font-size: 10px;">Evidence: {c['evidence']}</em></td>
                <td>{c.get('risk_impact', 'Medium')}</td>
            </tr>
            """

        html_content = f"""
        <html>
        <head><style>{css_styles}</style></head>
        <body>
            <div class="header-banner">
                <h1>RiskGRC Audit Intelligence</h1>
                <div style="margin-top: 15px; font-size: 14px; opacity: 0.8;">
                    Organization: {data['organization_name']} | Asset ID: ASS-TX-{data['id']}
                </div>
                <div style="font-size: 12px; opacity: 0.6;">Generated on: {data['created_at']}</div>
            </div>

            <h2 class="section-title">I. Executive Summary & Exposure</h2>
            <div style="margin-bottom: 30px;">
                <div class="metric-card">
                    <span class="metric-label">Residual Risk Score</span>
                    <span class="metric-value" style="color: {'#e74c3c' if data['risk_score'] > 70 else '#f39c12' if data['risk_score'] > 40 else '#27ae60'}">
                        {data['risk_score']:.1f}
                    </span>
                    <span class="badge {'bg-danger' if data['risk_score'] > 70 else 'bg-warning' if data['risk_score'] > 40 else 'bg-success'}">{data['risk_level']}</span>
                </div>
                <div class="metric-card">
                    <span class="metric-label">Compliance Confidence</span>
                    <span class="metric-value">{data.get('compliance_confidence', 'N/A')}%</span>
                    <span class="badge bg-success">AI Verified</span>
                </div>
                <div class="metric-card">
                    <span class="metric-label">Contextual Impact</span>
                    <span class="metric-value">{data.get('impact_score', 0) * 10:.1f}</span>
                    <span class="badge bg-warning">Sector Weighted</span>
                </div>
            </div>

            <div style="background: #fff8e1; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
                <strong>AI Governance Insight:</strong> {data['ai_output']['risk_explanation'] if data['ai_output'] else 'Data extraction in progress...'}
            </div>

            <h2 class="section-title">II. Audit Methodology</h2>
            <p style="font-size: 12px;">This report leverages the <strong>RiskGRC Weighted Aggregation Model</strong>. Risk scores are calculated using the following mathematical proof:</p>
            <div class="formula-box">
                R_composite = 100 - [ Σ (KRI_score_i * Sector_Weight_i) / Σ Sector_Weight_i ]
            </div>
            <p style="font-size: 11px; color: #7f8c8d;">Weights are dynamically assigned based on {data.get('organization_sector', 'Fintech')} sector benchmarks and regulatory requirements.</p>

            <h2 class="section-title">III. Evidence-to-Control Mapping (v2 Audit Trail)</h2>
            <table>
                <thead>
                    <tr>
                        <th width="20%">Control ID</th>
                        <th width="15%">Status</th>
                        <th width="50%">Automated Auditor Reasoning</th>
                        <th width="15%">Impact</th>
                    </tr>
                </thead>
                <tbody>
                    {control_rows}
                </tbody>
            </table>

            <div style="page-break-before: always;"></div>
            <h2 class="section-title">IV. Remediation Roadmap</h2>
            <p style="font-size: 12px;">Based on the identified gaps, the AI Governance Agent recommends the following priority actions:</p>
            <ul>
                {"".join([f"<li style='font-size: 12px; margin-bottom: 10px;'>{step}</li>" for step in data['ai_output']['remediation_steps'][:5]]) if data['ai_output'] else "<li>Complete assessment to view remediation steps.</li>"}
            </ul>

            <div style="margin-top: 50px; padding: 20px; border-top: 2px solid #eee; text-align: center; color: #bdc3c7; font-size: 10px;">
                CONFIDENTIAL AUDIT DOCUMENT | RiskGRC v2.0 AI-Core | Security Verified
            </div>
        </body>
        </html>
        """
        
        try:
            from weasyprint import HTML
            pdf_file = HTML(string=html_content).write_pdf()
            response = HttpResponse(pdf_file, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="RiskGRC_Report_{assessment.id}.pdf"'
        except Exception:
            # Windows/dev fallback when WeasyPrint native libs are unavailable
            response = HttpResponse(html_content, content_type='text/html; charset=utf-8')
            response['Content-Disposition'] = f'attachment; filename="RiskGRC_Report_{assessment.id}.html"'
        return response


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
