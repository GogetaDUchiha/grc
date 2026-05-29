"""
Engines for KRI processing, Risk calculation, Compliance checking, and AI insights.
"""
import json
from django.conf import settings
from typing import Dict, List, Tuple, Any
import google.generativeai as genai
import logging

logger = logging.getLogger(__name__)


class KRIEngine:
    """KRI Engine: Normalizes raw KRI values to standardized scores"""
    
    # KRI definitions with polarity, thresholds, and units
    KRI_DEFINITIONS = {
        'MFA Coverage': {
            'unit': '%',
            'polarity': 'higher_is_better',
            'thresholds': {'Safe': 95, 'Watch': 85, 'Warning': 70, 'Critical': 0},
        },
        'Patch Delay': {
            'unit': 'days',
            'polarity': 'lower_is_better',
            'thresholds': {'Safe': 7, 'Watch': 15, 'Warning': 30, 'Critical': 90},
        },
        'Encryption Coverage': {
            'unit': '%',
            'polarity': 'higher_is_better',
            'thresholds': {'Safe': 95, 'Watch': 85, 'Warning': 70, 'Critical': 0},
        },
        'Failed Login Rate': {
            'unit': '%',
            'polarity': 'lower_is_better',
            'thresholds': {'Safe': 1, 'Watch': 5, 'Warning': 10, 'Critical': 100},
        },
        'Privileged Account Count': {
            'unit': 'count',
            'polarity': 'lower_is_better',
            'thresholds': {'Safe': 10, 'Watch': 25, 'Warning': 50, 'Critical': 500},
        },
        'Incident Response Time': {
            'unit': 'hours',
            'polarity': 'lower_is_better',
            'thresholds': {'Safe': 4, 'Watch': 8, 'Warning': 24, 'Critical': 168},
        },
        'DDoS Protection': {
            'unit': 'yes/no',
            'polarity': 'higher_is_better',
            'thresholds': {'Safe': 100, 'Watch': 0, 'Warning': 0, 'Critical': 0},
        },
        'Vendor Risk Score': {
            'unit': 'score',
            'polarity': 'lower_is_better',
            'thresholds': {'Safe': 30, 'Watch': 50, 'Warning': 70, 'Critical': 100},
        },
        'Security Awareness Training': {
            'unit': '%',
            'polarity': 'higher_is_better',
            'thresholds': {'Safe': 95, 'Watch': 85, 'Warning': 70, 'Critical': 0},
        },
        'Vulnerability Density': {
            'unit': 'count',
            'polarity': 'lower_is_better',
            'thresholds': {'Safe': 1, 'Watch': 10, 'Warning': 50, 'Critical': 1000},
        },
    }

    # Sector-specific weights
    SECTOR_WEIGHTS = {
        'Fintech': {
            'MFA Coverage': 0.15,
            'Encryption Coverage': 0.15,
            'Patch Delay': 0.15,
            'Incident Response Time': 0.10,
            'Failed Login Rate': 0.10,
            'Security Awareness Training': 0.10,
            'Privileged Account Count': 0.05,
            'DDoS Protection': 0.10,
            'Vendor Risk Score': 0.05,
            'Vulnerability Density': 0.05,
        },
        'Banking': {
            'MFA Coverage': 0.20,
            'Encryption Coverage': 0.20,
            'Patch Delay': 0.15,
            'Incident Response Time': 0.15,
            'Security Awareness Training': 0.10,
            'Vendor Risk Score': 0.10,
            'Privileged Account Count': 0.05,
            'Vulnerability Density': 0.05,
        },
        'Telecom': {
            'Patch Delay': 0.20,
            'MFA Coverage': 0.15,
            'Encryption Coverage': 0.15,
            'Incident Response Time': 0.15,
            'DDoS Protection': 0.15,
            'Vulnerability Density': 0.10,
            'Security Awareness Training': 0.10,
        },
        'Government': {
            'MFA Coverage': 0.20,
            'Encryption Coverage': 0.20,
            'Patch Delay': 0.15,
            'Incident Response Time': 0.15,
            'Security Awareness Training': 0.15,
            'Vulnerability Density': 0.15,
        },
        'IT': {
            'MFA Coverage': 0.15,
            'Encryption Coverage': 0.15,
            'Patch Delay': 0.15,
            'Incident Response Time': 0.15,
            'Vulnerability Density': 0.15,
            'Security Awareness Training': 0.10,
            'Failed Login Rate': 0.10,
            'Privileged Account Count': 0.05,
        },
    }

    def __init__(self, sector='Fintech'):
        self.sector = sector
        self.weights = self.SECTOR_WEIGHTS.get(sector, self.SECTOR_WEIGHTS['Fintech'])

    def process_kris(self, kri_data: Dict) -> Dict:
        """Process raw KRI data and normalize to scores"""
        # Map frontend keys to canonical names if necessary
        key_mapping = {
            'mfa_percentage': 'MFA Coverage',
            'patch_delay_days': 'Patch Delay',
            'encryption_percentage': 'Encryption Coverage',
            'failed_login_rate': 'Failed Login Rate',
            'privileged_accounts': 'Privileged Account Count',
            'incident_response_time': 'Incident Response Time',
        }
        
        normalized_data = {}
        for k, v in kri_data.items():
            mapped_key = key_mapping.get(k, k)
            normalized_data[mapped_key] = v

        normalized_kris = {}
        for kri_name, kri_def in self.KRI_DEFINITIONS.items():
            raw_value = normalized_data.get(kri_name, 0)
            
            # Normalize value
            normalized_score = self._normalize_score(raw_value, kri_def)
            
            # Determine band
            band = self._get_band(normalized_score)
            
            # Get threshold
            threshold_val = kri_def['thresholds'].get(band, 0)
            
            normalized_kris[kri_name] = {
                'raw_value': raw_value,
                'normalized_score': normalized_score,
                'band': band,
                'threshold': threshold_val,
                'weight': self.weights.get(kri_name, 0),
                'unit': kri_def['unit'],
            }
        
        return normalized_kris

    def _normalize_score(self, raw_value: float, kri_def: Dict) -> float:
        """Normalize raw value to 0-100 scale"""
        thresholds = kri_def['thresholds']
        
        if kri_def['polarity'] == 'higher_is_better':
            # For metrics where higher is better (MFA%, Encryption%)
            if raw_value >= thresholds['Safe']:
                return 100
            elif raw_value >= thresholds['Watch']:
                return 75 + (raw_value - thresholds['Watch']) / (thresholds['Safe'] - thresholds['Watch']) * 25
            elif raw_value >= thresholds['Warning']:
                return 50 + (raw_value - thresholds['Warning']) / (thresholds['Watch'] - thresholds['Warning']) * 25
            elif raw_value >= thresholds['Critical']:
                return 25 + (raw_value - 0) / (thresholds['Warning'] - 0) * 25
            else:
                return 0
        else:
            # For metrics where lower is better (Patch delay, Response time)
            if raw_value <= thresholds['Safe']:
                return 100
            elif raw_value <= thresholds['Watch']:
                return 75 + (thresholds['Watch'] - raw_value) / (thresholds['Watch'] - thresholds['Safe']) * 25
            elif raw_value <= thresholds['Warning']:
                return 50 + (thresholds['Warning'] - raw_value) / (thresholds['Warning'] - thresholds['Watch']) * 25
            elif raw_value <= thresholds['Critical']:
                return 25 + (thresholds['Critical'] - raw_value) / (thresholds['Critical'] - thresholds['Warning']) * 25
            else:
                return 0

    def _get_band(self, normalized_score: float) -> str:
        """Determine band based on normalized score"""
        if normalized_score >= 80:
            return 'Safe'
        elif normalized_score >= 60:
            return 'Watch'
        elif normalized_score >= 40:
            return 'Warning'
        else:
            return 'Critical'


class RiskEngine:
    """Risk Engine: Calculates composite risk score"""
    
    def __init__(self, sector='Fintech'):
        self.sector = sector
        self.kri_engine = KRIEngine(sector)

    def calculate_risk(self, normalized_kris: Dict) -> Tuple[float, str]:
        """
        Calculate composite risk score using weighted aggregation formula: 
        R = Σ (P_i * W_i) 
        where P_i is the normalized KRI score and W_i is the assigned sector weight.
        """
        total_score = 0
        total_weight = 0
        
        for kri_name, kri_data in normalized_kris.items():
            score = kri_data['normalized_score']
            weight = kri_data['weight']
            total_score += score * weight
            total_weight += weight
        
        # Invert score because normalized_score is "health" (higher is better)
        # but Risk Score should represent exposure (higher is worse)
        health_score = total_score / total_weight if total_weight > 0 else 0
        risk_score = 100 - health_score
        
        # Clamp to 0-100
        risk_score = max(0, min(100, risk_score))
        
        # Determine risk level
        risk_level = self._get_risk_level(risk_score)
        
        return risk_score, risk_level

    def _get_risk_level(self, score: float) -> str:
        """Determine risk level from score"""
        if score >= 76:
            return 'Critical'
        elif score >= 56:
            return 'High'
        elif score >= 31:
            return 'Moderate'
        else:
            return 'Low'


class ComplianceEngine:
    """Compliance Engine: Checks KRI against regulatory thresholds"""
    
    def __init__(self, sector='Fintech'):
        self.sector = sector

    def check_compliance(self, normalized_kris: Dict, assessment_id=None) -> Dict[str, Dict]:
        """Check compliance with AI evidence-to-control mapping"""
        from .models import Regulation, Control, ControlResult, Assessment
        
        results = {}
        regulations = Regulation.objects.filter(sector=self.sector)
        ai_agent = AIGovernanceAgent()
        
        for regulation in regulations:
            controls = regulation.controls.all()
            control_results = []
            
            # Map KRIs to Controls and analyze via AI
            for control in controls:
                kri_name = control.mapped_kri_name or "General"
                kri_data = normalized_kris.get(kri_name, {})
                
                # Perform AI mapping result
                mapping = ai_agent.analyze_control_compliance(control, kri_data)
                
                if assessment_id:
                    ControlResult.objects.create(
                        assessment_id=assessment_id,
                        control=control,
                        status=mapping['status'],
                        evidence=mapping['evidence'],
                        ai_analysis=mapping['analysis'],
                        risk_impact=mapping['risk_impact'],
                        confidence_score=mapping['confidence']
                    )
                
                control_results.append(mapping)
            
            # Aggregate status for the Regulation
            statuses = [r['status'] for r in control_results]
            if not statuses:
                status = 'Compliant'
            elif 'Non-Compliant' in statuses:
                status = 'Non-Compliant'
            elif 'Partial' in statuses:
                status = 'Partial'
            else:
                status = 'Compliant'
                
            results[regulation.name] = {
                'status': status,
                'control_results': control_results,
                'summary': ai_agent.generate_regulation_summary(regulation.name, control_results)
            }
        
        return results

    def _generate_logical_summary(self, reg_name, status, violations):
        if status == 'Compliant':
            return f"Fully compliant with {reg_name} standards."
        elif status == 'Partial':
            v_list = ", ".join([v['kri'] for v in violations])
            return f"Partial compliance with {reg_name}. Critical gaps found in: {v_list}."
        else:
            return f"Non-compliant with {reg_name} due to systemic gaps across multiple controlled KRIs."

    def _rule_to_kri(self, rule_name: str) -> str:
        """Convert rule name to KRI name"""
        rule_to_kri_map = {
            'mfa_coverage_min': 'MFA Coverage',
            'patch_delay_max': 'Patch Delay',
            'encryption_coverage_min': 'Encryption Coverage',
            'incident_response_max_hours': 'Incident Response Time',
            'security_awareness_training_min': 'Security Awareness Training',
            'failed_login_rate_max': 'Failed Login Rate',
            'privileged_accounts_max': 'Privileged Account Count',
            'ddos_protection_required': 'DDoS Protection',
            'vendor_risk_max': 'Vendor Risk Score',
        }
        return rule_to_kri_map.get(rule_name, '')

    def _is_violation(self, rule_name: str, actual_value: float, threshold: float) -> bool:
        """Check if KRI violates threshold based on rule name suffix"""
        if '_min' in rule_name:
            return actual_value < threshold
        if '_max' in rule_name:
            return actual_value > threshold
        if '_required' in rule_name:
            return actual_value < threshold
        return False

def threshold_to_symbol(rule_name):
    if '_min' in rule_name: return '≥'
    if '_max' in rule_name: return '≤'
    if '_required' in rule_name: return '≥'
    return '='


class AIGovernanceAgent:
    """AI Governance Agent: Generates AI insights using Gemini"""
    
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-1.5-pro') # Use upgrade version
        else:
            self.model = None

    def analyze_control_compliance(self, control, kri_data):
        """Perform AI Evidence-to-Control mapping"""
        if not self.model:
            return self._fallback_control_analysis(control, kri_data)
        
        evidence = f"KRI: {control.mapped_kri_name}, Value: {kri_data.get('raw_value', 'N/A')}{kri_data.get('unit', '')}"
        
        prompt = f"""
        Act as a Lead GRC Auditor (CISA/ISO 27001 Certified). 
        You are performing a formal evidence-to-control mapping audit.
        
        CONTROL FRAMEWORK: {control.regulation.name}
        
        CONTROL UNDER TEST:
        ID: {control.control_id}
        Title: {control.title}
        Description: {control.description}
        Mandatory Evidence Requirements: {control.required_evidence}
        
        AUDIT EVIDENCE PROVIDED:
        {evidence}
        
        INSTRUCTIONS:
        1. Evaluate if the evidence satisfies the control requirement.
        2. Assign a 'status' based on the gap analysis.
        3. Provide 'analysis' using professional auditor language.
        4. Assess the 'risk_impact' if this control fails.
        5. State your 'confidence' level in this mapping.

        Return a JSON object:
        {{
            "status": "Compliant" | "Partial" | "Non-Compliant",
            "evidence": "Verification string of the data points used",
            "analysis": "Professional executive-level reasoning",
            "risk_impact": "Low" | "Medium" | "High" | "Critical",
            "confidence": 0-100
        }}
        Only return valid JSON. Do not include markdown blocks.
        """
        
        try:
            response = self.model.generate_content(prompt)
            data = json.loads(response.text.replace('```json', '').replace('```', '').strip())
            return data
        except:
            return self._fallback_control_analysis(control, kri_data)

    def calculate_advanced_risk_metrics(self, normalized_kris, base_score):
        """Calculate contextual risk parameters using AI"""
        if not self.model:
            return {'likelihood': 0.5, 'impact': 0.5, 'exploitability': 0.5}

        kri_summary = "\n".join([f"{k}: {v['raw_value']} {v['unit']} ({v['band']})" for k, v in normalized_kris.items()])
        
        prompt = f"""
        Analyze these Key Risk Indicators and calculate enterprise risk parameters.
        Base Score: {base_score}
        
        KRIs:
        {kri_summary}
        
        Return JSON object with:
        - "likelihood_score": decimal 0-1
        - "impact_score": decimal 0-1
        - "exploitability_score": decimal 0-1
        - "residual_risk_score": 0-100
        - "compliance_confidence": 0-100
        """
        
        try:
            response = self.model.generate_content(prompt)
            return json.loads(response.text.replace('```json', '').replace('```', '').strip())
        except:
            return {'likelihood_score': 0.5, 'impact_score': 0.5, 'exploitability_score': 0.5, 'residual_risk_score': base_score, 'compliance_confidence': 50}

    def generate_regulation_summary(self, reg_name, results):
        prompt = f"Summarize the compliance status for {reg_name} based on these control results: {json.dumps(results[:5])}. Keep it professional and executive-level."
        try:
            return self.model.generate_content(prompt).text
        except:
            return f"Compliance analysis completed for {reg_name}."

    def _fallback_control_analysis(self, control, kri_data):
        # Basic threshold logic as fallback
        raw = kri_data.get('raw_value', 0)
        status = 'Partial'
        if raw > 90: status = 'Compliant'
        elif raw < 40: status = 'Non-Compliant'
        
        return {
            'status': status,
            'evidence': f"KRI {control.mapped_kri_name} value is {raw}",
            'analysis': "Analyzed via threshold fallback. AI logic unavailable.",
            'risk_impact': 'Medium',
            'confidence': 50
        }


    def generate_insights(
        self,
        normalized_kris: Dict,
        risk_score: float,
        risk_level: str,
        compliance_violations: Dict,
    ) -> Dict[str, Any]:
        """Generate AI insights for assessment"""
        
        if not self.model:
            return self._fallback_insights(normalized_kris, risk_score, risk_level)
        
        try:
            # Prepare context
            context = self._prepare_context(normalized_kris, risk_score, risk_level, compliance_violations)
            
            # Generate risk explanation
            risk_explanation = self._generate_risk_explanation(context)
            
            # Generate threat scenarios
            threat_scenarios = self._generate_threat_scenarios(context)
            
            # Generate remediation steps
            remediation_steps = self._generate_remediation_steps(context)
            
            # Generate Compliance Support Summary (Proof of Evidence)
            compliance_proof = self._generate_compliance_proof(context)
            
            return {
                'risk_explanation': risk_explanation,
                'threat_scenarios': threat_scenarios,
                'remediation_steps': remediation_steps,
                'compliance_proof': compliance_proof,
            }
        except Exception as e:
            logger.error(f"Gemini API error: {str(e)}")
            return {
                'risk_explanation': "AI Analysis failed. Please check API configuration.",
                'threat_scenarios': ["N/A"],
                'remediation_steps': ["N/A"],
                'compliance_proof': "N/A"
            }

    def _generate_compliance_proof(self, context: Dict) -> str:
        """Generate AI proof of compliance based on raw evidence"""
        evidence_str = ""
        for reg_name, result in context.get('violations', {}).items():
            evidence_str += f"\n- {reg_name}: status is {result.get('status')}. "
            for entry in result.get('evidence', []):
                evidence_str += f"[{entry['kri']} is {entry['actual']}, required {entry['required']} - {entry['status']}]. "

        prompt = f"""
        Format the output as a formal 'Independent Compliance Assertion'.
        Compare the actual values against the mandatory frameworks (e.g. SBP Cybersecurity Circular No. 6 of 2017, PECA Section 21).
        
        Mandatory Mappings for Fintech Sector:
        - MFA -> SBP Section 3.1.2 (Identity & Access Management)
        - Patching -> SECP Circular 29 (Operational Resilience)
        - Encryption -> SBP Section 3.1.4 (Data Protection)
        - Awareness -> PECA 2016 Awareness Mandate
        
        Briefly explain WHY certain sections are marked as Partial or Non-Compliant using specific standard terminology.
        """
        
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except:
            return "AI compliance verification in progress..."

    def extract_kris_from_text(self, report_text: str) -> Dict[str, float]:
        """Extract KRIs from unstructured text using Gemini"""
        if not self.model:
            return {}

        prompt = f"""
        Extract the following Key Risk Indicators (KRIs) from this security assessment report text.
        Return the results as a JSON object where the keys match exactly these names:
        - "MFA Coverage" (percentage, 0-100)
        - "Patch Delay" (average days, number)
        - "Encryption Coverage" (percentage, 0-100)
        - "Failed Login Rate" (percentage, 0-100)
        - "Privileged Account Count" (number)
        - "Incident Response Time" (hours, number)
        - "Security Awareness Training" (percentage, 0-100)
        - "Vendor Risk Score" (0-100)
        - "DDoS Protection" (1 if active/yes, 0 otherwise)

        If a metric is not mentioned, use a reasonable default based on context or leave it out of the JSON.
        Only return the JSON object, nothing else.

        Report Text:
        ---
        {report_text}
        ---
        """

        try:
            response = self.model.generate_content(prompt)
            cleaned_text = response.text.replace('```json', '').replace('```', '').strip()
            return json.loads(cleaned_text)
        except Exception as e:
            logger.error(f"Error extracting KRIs from text: {str(e)}")
            return {}

    def _prepare_context(self, normalized_kris: Dict, risk_score: float, risk_level: str, violations: Dict) -> Dict:
        """Prepare context for AI"""
        critical_kris = [
            (name, data) for name, data in normalized_kris.items()
            if data['band'] == 'Critical'
        ]
        
        return {
            'risk_score': risk_score,
            'risk_level': risk_level,
            'critical_kris': critical_kris,
            'all_kris': normalized_kris,
            'violations': violations,
        }

    def _generate_risk_explanation(self, context: Dict) -> str:
        """Generate risk explanation using Gemini"""
        prompt = f"""
        Based on the following cybersecurity assessment data, provide a concise risk explanation (max 150 words):
        
        Risk Score: {context['risk_score']:.2f}/100 ({context['risk_level']})
        Critical Metrics: {', '.join([name for name, _ in context['critical_kris']])}
        
        Provide a plain-language summary of the organization's risk posture and business implications.
        """
        
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except:
            return "Unable to generate AI risk explanation at this time."

    def _generate_threat_scenarios(self, context: Dict) -> List[str]:
        """Generate AI-powered threat scenarios mapped to MITRE ATT&CK"""
        if not self.model: return ["Ransomware via MFA Gap", "Data Breach via Patch Delay"]
        
        prompt = f"""
        Act as a Cyber Threat Analyst for a {context.get('sector', 'Fintech')} organization.
        Based on the current critical gaps: {', '.join([n for n, _ in context['critical_kris']])}.
        
        Generate 3 technical threat scenarios including the probable MITRE ATT&CK vectors.
        Format each line as 'Title: Step-by-Step Path'.
        Example: 'Ransomware Exploiting MFA Gap: T1078 (Valid Accounts) -> T1486 (Data Encrypted for Impact)'.
        """
        try:
            res = self.model.generate_content(prompt)
            return [l.strip('- *') for l in res.text.strip().split('\n') if ':' in l][:3]
        except:
            return ["Credential Stuffing: Exploiting low MFA coverage"]

    def _generate_remediation_steps(self, context: Dict) -> List[str]:
        """Generate auditor-grade remediation steps mapped to standards"""
        if not self.model: return ["Enable MFA", "Shorten Patch Cycle"]

        prompt = f"""
        Act as a Senior GRC Consultant. 
        Provide top 5 prioritized remediation actions based on the critical gaps in this assessment.
        
        Mandatory: For each action, add a parenthetical reference to the relevant part of the standard 
        (e.g., SBP 3.1.2, NIST PR.AC-1, or ISO A.9.1).
        
        Context Sector: {context.get('sector', 'Fintech')}
        Gaps: {', '.join([n for n, _ in context['critical_kris']])}
        
        Return a simple list of strings.
        """
        try:
            res = self.model.generate_content(prompt)
            return [l.strip('- *') for l in res.text.strip().split('\n') if len(l) > 10][:5]
        except:
            return ["Priority 1: Implement MFA organization-wide (SBP 3.1.2)"]


