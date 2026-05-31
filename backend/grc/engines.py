"""
Engines for KRI processing, Risk calculation, Compliance checking, and AI insights.
"""
import json
from django.conf import settings
from typing import Dict, List, Tuple, Any
import google.generativeai as genai
import logging

logger = logging.getLogger(__name__)


class GeminiInsightsError(Exception):
    """Raised when Gemini cannot produce assessment insights."""


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

    MODELS = ('gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash')

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model = None
        self._model_names = []
        self._last_model_used = None
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self._model_names = list(self.MODELS)
            self.model = genai.GenerativeModel(self._model_names[0])

    def _extract_text(self, response) -> str:
        try:
            text = response.text
            if text and text.strip():
                return text.strip()
        except Exception:
            pass
        if response.candidates:
            parts = response.candidates[0].content.parts
            if parts:
                return parts[0].text.strip()
        raise ValueError("Gemini returned an empty response")

    def _call_gemini(self, prompt: str) -> str:
        last_error = None
        for model_name in self._model_names:
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                self._last_model_used = model_name
                return self._extract_text(response)
            except Exception as exc:
                last_error = exc
                logger.warning("Gemini call failed for %s: %s", model_name, exc)
        raise GeminiInsightsError(
            "Gemini could not generate insights. Check GEMINI_API_KEY and API quota, then retry."
        ) from last_error

    def _parse_json(self, text: str) -> Dict:
        cleaned = text.replace('```json', '').replace('```', '').strip()
        start = cleaned.find('{')
        end = cleaned.rfind('}')
        if start != -1 and end != -1:
            cleaned = cleaned[start:end + 1]
        return json.loads(cleaned)

    def _kri_summary(self, normalized_kris: Dict) -> str:
        lines = []
        for name, data in normalized_kris.items():
            lines.append(
                f"- {name}: {data.get('raw_value')}{data.get('unit', '')} "
                f"(band={data.get('band')}, score={data.get('normalized_score', 0):.0f})"
            )
        return '\n'.join(lines) if lines else "No KRI data supplied."

    def _compliance_summary(self, compliance_violations: Dict) -> str:
        lines = []
        for reg_name, result in (compliance_violations or {}).items():
            lines.append(f"- {reg_name}: {result.get('status', 'Unknown')}")
            for control in result.get('control_results', []):
                lines.append(
                    f"    • {control.get('status', 'N/A')}: {control.get('evidence', '')}"
                )
        return '\n'.join(lines) if lines else "No compliance mapping available."

    def analyze_control_compliance(self, control, kri_data):
        """Perform evidence-to-control mapping (rule-based to preserve API quota for insights)"""
        return self._fallback_control_analysis(control, kri_data)

    def calculate_advanced_risk_metrics(self, normalized_kris, base_score):
        """Derive risk metrics from KRI bands without extra API calls"""
        critical = sum(1 for d in normalized_kris.values() if d.get('band') == 'Critical')
        warning = sum(
            1 for d in normalized_kris.values() if d.get('band') in ('Warning', 'Watch')
        )
        safe = sum(1 for d in normalized_kris.values() if d.get('band') == 'Safe')
        total = len(normalized_kris) or 1

        likelihood = min(1.0, 0.15 + (critical * 0.2 + warning * 0.1) / total)
        impact = min(1.0, base_score / 100)
        exploitability = min(1.0, 0.2 + critical * 0.12)
        confidence = max(35, min(95, int((safe / total) * 100)))

        return {
            'likelihood_score': round(likelihood, 2),
            'impact_score': round(impact, 2),
            'exploitability_score': round(exploitability, 2),
            'residual_risk_score': base_score,
            'compliance_confidence': confidence,
        }

    def generate_regulation_summary(self, reg_name, results):
        statuses = [r.get('status', 'Unknown') for r in results]
        if 'Non-Compliant' in statuses:
            tone = 'requires immediate remediation'
        elif 'Partial' in statuses:
            tone = 'is partially compliant with observed gaps'
        else:
            tone = 'meets the evaluated control requirements'
        return f"Compliance review for {reg_name} {tone} across {len(results)} mapped control(s)."

    def _fallback_control_analysis(self, control, kri_data):
        raw = kri_data.get('raw_value', 0)
        band = kri_data.get('band', 'Watch')
        status = 'Partial'
        if band == 'Safe' or raw > 90:
            status = 'Compliant'
        elif band == 'Critical' or raw < 40:
            status = 'Non-Compliant'

        return {
            'status': status,
            'evidence': f"KRI {control.mapped_kri_name} value is {raw}{kri_data.get('unit', '')}",
            'analysis': (
                f"Control {control.control_id} evaluated against {control.mapped_kri_name}. "
                f"Observed value {raw} indicates {status.lower()} alignment with {control.title}."
            ),
            'risk_impact': 'High' if status == 'Non-Compliant' else 'Medium' if status == 'Partial' else 'Low',
            'confidence': 75 if status != 'Partial' else 60,
        }

    def _is_quota_error(self, exc: Exception) -> bool:
        msg = str(exc).lower()
        return '429' in msg or 'quota' in msg or 'rate limit' in msg

    def extract_kris_locally(self, report_text: str) -> Dict[str, float]:
        """Parse KRIs from structured reports/JSON without calling Gemini."""
        import re

        text = report_text.strip()
        kris: Dict[str, float] = {}

        if text.startswith('{'):
            try:
                data = json.loads(text)
                if isinstance(data, dict):
                    return self._normalize_extracted_kris(data)
            except json.JSONDecodeError:
                pass

        patterns = {
            'mfa_percentage': [
                r'(?:mfa|multi-factor authentication).*?(\d+(?:\.\d+)?)\s*%',
                r'(\d+(?:\.\d+)?)\s*%.*?(?:mfa|multi-factor)',
            ],
            'patch_delay_days': [
                r'patch(?:es)?.*?(?:within|in|after)\s*(\d+(?:\.\d+)?)\s*days',
                r'(\d+(?:\.\d+)?)\s*days.*?(?:patch|patched)',
            ],
            'encryption_percentage': [
                r'encrypt(?:ion|ed).*?(\d+(?:\.\d+)?)\s*%',
                r'(?:all|100%).*?encrypt',
            ],
            'failed_login_rate': [
                r'failed(?:\s+authentication|\s+login).*?(\d+(?:\.\d+)?)\s*%',
                r'(\d+(?:\.\d+)?)\s*%.*?(?:failed\s+login|failed\s+authentication)',
            ],
            'privileged_accounts': [
                r'(\d+)\s*(?:privileged|admin(?:istrative)?(?:[\s-]level)?)\s*accounts',
                r'maintains\s*(\d+)\s*(?:privileged|admin)',
            ],
            'incident_response_time': [
                r'(?:response|containment)\s*time.*?(\d+(?:\.\d+)?)\s*hours',
                r'(\d+(?:\.\d+)?)\s*hours.*?(?:incident|response|containment)',
            ],
        }

        lower = text.lower()
        if re.search(r'all .{0,80}encrypt', text, re.IGNORECASE):
            kris['encryption_percentage'] = 100.0

        for key, regex_list in patterns.items():
            if key == 'encryption_percentage' and 'encryption_percentage' in kris:
                continue
            for pattern in regex_list:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    try:
                        kris[key] = float(match.group(1))
                        break
                    except (TypeError, ValueError):
                        continue

        return kris

    def resolve_kris_from_logs(self, log_text: str, manual_kris: Dict = None) -> Dict[str, float]:
        """Prefer local parsing; use Gemini only when local extraction is insufficient."""
        manual_kris = manual_kris or {}
        local_kris = self.extract_kris_locally(log_text)
        merged = {**local_kris, **manual_kris}

        required = {
            'mfa_percentage', 'patch_delay_days', 'encryption_percentage',
            'failed_login_rate', 'privileged_accounts', 'incident_response_time',
        }
        if required.issubset(merged.keys()):
            return merged

        try:
            gemini_kris = self.extract_kris_from_text(log_text)
            return {**gemini_kris, **manual_kris}
        except GeminiInsightsError as exc:
            if merged and self._is_quota_error(exc.__cause__ or exc):
                return merged
            raise

    def generate_insights_with_fallback(
        self,
        normalized_kris: Dict,
        risk_score: float,
        risk_level: str,
        compliance_violations: Dict,
        supplemental_report: str = None,
    ) -> Dict[str, Any]:
        """Generate insights via Gemini; use rule-based output only when quota is exceeded."""
        try:
            return self.generate_insights(
                normalized_kris,
                risk_score,
                risk_level,
                compliance_violations,
                supplemental_report=supplemental_report,
            )
        except GeminiInsightsError as exc:
            cause = exc.__cause__
            if cause and self._is_quota_error(cause):
                fallback = self._fallback_insights(
                    normalized_kris, risk_score, risk_level, compliance_violations
                )
                fallback['model_used'] = self._last_model_used or 'rule-based'
                return fallback
            if self._is_quota_error(exc):
                fallback = self._fallback_insights(
                    normalized_kris, risk_score, risk_level, compliance_violations
                )
                fallback['model_used'] = 'rule-based'
                return fallback
            raise

    def _fallback_insights(
        self,
        normalized_kris: Dict,
        risk_score: float,
        risk_level: str,
        compliance_violations: Dict = None,
    ) -> Dict[str, Any]:
        """Rule-based insights when Gemini is unavailable"""
        critical = [
            (name, data) for name, data in normalized_kris.items()
            if data.get('band') in ('Critical', 'Warning')
        ]
        watch = [
            (name, data) for name, data in normalized_kris.items()
            if data.get('band') == 'Watch'
        ]

        if critical:
            focus = ', '.join(name for name, _ in critical)
            risk_explanation = (
                f"The organization shows a {risk_level.lower()} overall posture ({risk_score:.1f}/100), "
                f"but critical attention is required for: {focus}. These gaps increase exposure to "
                f"credential abuse, data loss, and regulatory non-compliance."
            )
        else:
            risk_explanation = (
                f"The organization maintains a {risk_level.lower()} risk posture with a score of "
                f"{risk_score:.1f}/100. Core technical controls are generally healthy"
                + (f"; monitor: {', '.join(n for n, _ in watch)}" if watch else "")
                + "."
            )

        threat_scenarios = []
        for name, data in critical[:3]:
            threat_scenarios.append(
                f"{name} gap exploitation: attacker leverages weak {name.lower()} "
                f"(value {data.get('raw_value')}{data.get('unit', '')}) -> lateral movement -> data impact"
            )
        if not threat_scenarios:
            threat_scenarios = [
                "Phishing-led credential theft targeting staff with incomplete security awareness",
                "Third-party vendor compromise affecting shared integrations",
                "Insider misuse of privileged access without sufficient monitoring",
            ]

        remediation_steps = []
        for name, data in critical[:3]:
            remediation_steps.append(
                f"Remediate {name}: current value {data.get('raw_value')}{data.get('unit', '')} "
                f"is in {data.get('band')} band — implement targeted control uplift (SBP/SECP mapped)."
            )
        if not remediation_steps:
            remediation_steps = [
                "Maintain MFA enforcement and quarterly access reviews (SBP 3.1.2)",
                "Continue patch SLAs within 15 days for critical systems (SECP resilience)",
                "Expand security awareness training above 95% completion (PECA mandate)",
            ]

        proof_lines = ["Independent Compliance Assertion (rule-based summary):"]
        for reg_name, result in (compliance_violations or {}).items():
            proof_lines.append(f"\n{reg_name}: {result.get('status', 'Unknown')}")
            for control in result.get('control_results', []):
                proof_lines.append(f"  • {control.get('evidence', '')} — {control.get('status', 'N/A')}")

        return {
            'risk_explanation': risk_explanation,
            'threat_scenarios': threat_scenarios[:3],
            'remediation_steps': remediation_steps[:5],
            'compliance_proof': '\n'.join(proof_lines),
        }

    def generate_insights(
        self,
        normalized_kris: Dict,
        risk_score: float,
        risk_level: str,
        compliance_violations: Dict,
        supplemental_report: str = None,
    ) -> Dict[str, Any]:
        """Generate AI insights using Gemini only (no manual fallback)."""
        if not self.api_key or not self._model_names:
            raise GeminiInsightsError(
                "GEMINI_API_KEY is not configured. Add it to backend/.env to enable AI insights."
            )

        critical_names = [
            name for name, data in normalized_kris.items()
            if data.get('band') in ('Critical', 'Warning')
        ]
        report_section = ''
        if supplemental_report:
            report_section = f"\nSupplemental log/report context (for reference only):\n{supplemental_report[:4000]}\n"

        prompt = f"""
Act as a senior GRC and cyber risk analyst for a Fintech organization in Pakistan.

Assessment snapshot:
- Risk score: {risk_score:.1f}/100 ({risk_level})
- Critical / warning KRIs: {', '.join(critical_names) if critical_names else 'none'}
- KRI evidence:
{self._kri_summary(normalized_kris)}

Compliance mapping:
{self._compliance_summary(compliance_violations)}
{report_section}
Return ONLY valid JSON with this exact shape:
{{
  "risk_explanation": "150 words max plain-language executive summary",
  "threat_scenarios": ["Title: MITRE-style attack path", "...", "..."],
  "remediation_steps": ["action with SBP/SECP/NIST reference", "..."],
  "compliance_proof": "formal Independent Compliance Assertion paragraph referencing SBP, SECP, PECA where relevant"
}}
"""
        raw = self._call_gemini(prompt)
        try:
            data = self._parse_json(raw)
        except json.JSONDecodeError as exc:
            raise GeminiInsightsError("Gemini returned invalid JSON for insights.") from exc

        for field in ('risk_explanation', 'threat_scenarios', 'remediation_steps', 'compliance_proof'):
            if not data.get(field):
                raise GeminiInsightsError(f"Gemini returned incomplete insights (missing {field}).")

        return {
            'risk_explanation': data['risk_explanation'],
            'threat_scenarios': data['threat_scenarios'],
            'remediation_steps': data['remediation_steps'],
            'compliance_proof': data['compliance_proof'],
            'model_used': self._last_model_used or 'gemini',
        }

    KRI_EXTRACT_KEY_ALIASES = {
        'MFA Coverage': 'mfa_percentage',
        'Patch Delay': 'patch_delay_days',
        'Encryption Coverage': 'encryption_percentage',
        'Failed Login Rate': 'failed_login_rate',
        'Privileged Account Count': 'privileged_accounts',
        'Privileged Accounts': 'privileged_accounts',
        'Incident Response Time': 'incident_response_time',
        'Security Awareness Training': 'security_awareness_training',
        'Vendor Risk Score': 'vendor_risk_score',
        'DDoS Protection': 'ddos_protection',
    }

    def _normalize_extracted_kris(self, raw: Dict) -> Dict[str, float]:
        """Map Gemini output keys to frontend/engine snake_case keys."""
        normalized = {}
        for key, value in raw.items():
            if value is None or value == '':
                continue
            mapped = self.KRI_EXTRACT_KEY_ALIASES.get(key, key)
            try:
                if isinstance(value, bool):
                    normalized[mapped] = 1.0 if value else 0.0
                elif isinstance(value, str):
                    lower = value.strip().lower()
                    if lower in ('yes', 'active', 'enabled', 'true'):
                        normalized[mapped] = 1.0
                    elif lower in ('no', 'inactive', 'disabled', 'false'):
                        normalized[mapped] = 0.0
                    else:
                        normalized[mapped] = float(value)
                else:
                    normalized[mapped] = float(value)
            except (TypeError, ValueError):
                continue
        return normalized

    def extract_kris_from_text(self, report_text: str) -> Dict[str, float]:
        """Infer KRI values from security logs/reports using Gemini."""
        if not self.api_key or not self._model_names:
            raise GeminiInsightsError(
                "GEMINI_API_KEY is not configured. Add it to backend/.env to analyze logs."
            )

        prompt = f"""
You are a senior cybersecurity analyst reviewing security logs and reports for a GRC assessment.

Analyze the content below and infer Key Risk Indicator (KRI) values.
The document may NOT contain explicit KRI labels — derive reasonable numeric estimates from
events, patterns, failures, auth activity, patching signals, encryption mentions, and context.

Return ONLY valid JSON with these exact snake_case keys (all numbers):
- mfa_percentage (0-100, MFA/adaptive auth coverage estimate)
- patch_delay_days (average days to patch critical vulnerabilities)
- encryption_percentage (0-100, data-at-rest/in-transit encryption coverage)
- failed_login_rate (0-100, failed login attempts as % of total logins)
- privileged_accounts (count of privileged/admin accounts observed or estimated)
- incident_response_time (hours, mean time to respond to incidents)

Log / report content:
---
{report_text[:12000]}
---
"""
        raw = self._call_gemini(prompt)
        try:
            data = self._parse_json(raw)
        except json.JSONDecodeError as exc:
            raise GeminiInsightsError(
                "Gemini could not parse KRI values from the uploaded logs."
            ) from exc

        kris = self._normalize_extracted_kris(data)
        if not kris:
            raise GeminiInsightsError(
                "Could not determine KRI values from the uploaded logs. "
                "Try a richer log file or add optional manual KRI overrides."
            )
        return kris

