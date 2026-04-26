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
            'thresholds': {'Safe': 90, 'Watch': 70, 'Warning': 50, 'Critical': 0},
        },
        'Patch Delay': {
            'unit': 'days',
            'polarity': 'lower_is_better',
            'thresholds': {'Safe': 10, 'Watch': 20, 'Warning': 30, 'Critical': 100},
        },
        'Encryption Coverage': {
            'unit': '%',
            'polarity': 'higher_is_better',
            'thresholds': {'Safe': 90, 'Watch': 70, 'Warning': 50, 'Critical': 0},
        },
        'Failed Login Rate': {
            'unit': 'ratio',
            'polarity': 'lower_is_better',
            'thresholds': {'Safe': 0.01, 'Watch': 0.05, 'Warning': 0.1, 'Critical': 1},
        },
        'Privileged Account Count': {
            'unit': 'count',
            'polarity': 'lower_is_better',
            'thresholds': {'Safe': 10, 'Watch': 20, 'Warning': 50, 'Critical': 1000},
        },
        'Incident Response Time': {
            'unit': 'hours',
            'polarity': 'lower_is_better',
            'thresholds': {'Safe': 4, 'Watch': 12, 'Warning': 24, 'Critical': 100},
        },
        'Vulnerability Density': {
            'unit': 'per 100',
            'polarity': 'lower_is_better',
            'thresholds': {'Safe': 1, 'Watch': 5, 'Warning': 10, 'Critical': 100},
        },
        'Log Retention Compliance': {
            'unit': 'yes/no',
            'polarity': 'higher_is_better',
            'thresholds': {'Safe': 90, 'Watch': 70, 'Warning': 50, 'Critical': 0},
        },
        'Security Awareness Training': {
            'unit': '%',
            'polarity': 'higher_is_better',
            'thresholds': {'Safe': 85, 'Watch': 70, 'Warning': 50, 'Critical': 0},
        },
        'Backup Freshness': {
            'unit': 'days',
            'polarity': 'lower_is_better',
            'thresholds': {'Safe': 1, 'Watch': 3, 'Warning': 7, 'Critical': 30},
        },
    }

    # Sector-specific weights
    SECTOR_WEIGHTS = {
        'Fintech': {
            'MFA Coverage': 0.20,
            'Encryption Coverage': 0.20,
            'Patch Delay': 0.15,
            'Incident Response Time': 0.15,
            'Failed Login Rate': 0.10,
            'Security Awareness Training': 0.10,
            'Privileged Account Count': 0.05,
            'Vulnerability Density': 0.05,
            'Log Retention Compliance': 0.00,
            'Backup Freshness': 0.00,
        },
        'Banking': {
            'MFA Coverage': 0.25,
            'Encryption Coverage': 0.25,
            'Patch Delay': 0.15,
            'Incident Response Time': 0.15,
            'Security Awareness Training': 0.10,
            'Log Retention Compliance': 0.05,
            'Privileged Account Count': 0.03,
            'Backup Freshness': 0.02,
            'Failed Login Rate': 0.00,
            'Vulnerability Density': 0.00,
        },
        'Telecom': {
            'Patch Delay': 0.20,
            'MFA Coverage': 0.18,
            'Encryption Coverage': 0.18,
            'Incident Response Time': 0.15,
            'Backup Freshness': 0.10,
            'Vulnerability Density': 0.10,
            'Security Awareness Training': 0.07,
            'Log Retention Compliance': 0.02,
            'Failed Login Rate': 0.00,
            'Privileged Account Count': 0.00,
        },
        'Government': {
            'MFA Coverage': 0.22,
            'Encryption Coverage': 0.22,
            'Log Retention Compliance': 0.18,
            'Incident Response Time': 0.15,
            'Security Awareness Training': 0.12,
            'Patch Delay': 0.08,
            'Backup Freshness': 0.03,
            'Privileged Account Count': 0.00,
            'Failed Login Rate': 0.00,
            'Vulnerability Density': 0.00,
        },
        'IT': {
            'MFA Coverage': 0.18,
            'Encryption Coverage': 0.18,
            'Patch Delay': 0.15,
            'Incident Response Time': 0.12,
            'Vulnerability Density': 0.12,
            'Security Awareness Training': 0.10,
            'Backup Freshness': 0.05,
            'Failed Login Rate': 0.05,
            'Privileged Account Count': 0.05,
            'Log Retention Compliance': 0.00,
        },
    }

    def __init__(self, sector='Fintech'):
        self.sector = sector
        self.weights = self.SECTOR_WEIGHTS.get(sector, self.SECTOR_WEIGHTS['Fintech'])

    def process_kris(self, kri_data: Dict) -> Dict:
        """Process raw KRI data and normalize to scores"""
        normalized_kris = {}
        
        for kri_name, kri_def in self.KRI_DEFINITIONS.items():
            raw_value = kri_data.get(kri_name, 0)
            
            # Normalize value
            normalized_score = self._normalize_score(raw_value, kri_def)
            
            # Determine band
            band = self._get_band(normalized_score)
            
            # Get threshold
            threshold = kri_def['thresholds'].get(band, 0)
            
            normalized_kris[kri_name] = {
                'raw_value': raw_value,
                'normalized_score': normalized_score,
                'band': band,
                'threshold': threshold,
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
        """Calculate composite risk score"""
        total_score = 0
        total_weight = 0
        
        for kri_name, kri_data in normalized_kris.items():
            score = kri_data['normalized_score']
            weight = kri_data['weight']
            total_score += score * weight
            total_weight += weight
        
        # Normalize by total weight
        if total_weight > 0:
            composite_score = total_score / total_weight
        else:
            composite_score = 0
        
        # Clamp to 0-100
        composite_score = max(0, min(100, composite_score))
        
        # Determine risk level
        risk_level = self._get_risk_level(composite_score)
        
        return composite_score, risk_level

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

    def check_compliance(self, normalized_kris: Dict) -> Dict[str, List[str]]:
        """Check compliance violations"""
        from .models import Regulation
        
        violations = {}
        regulations = Regulation.objects.filter(sector=self.sector)
        
        for regulation in regulations:
            reg_violations = []
            rules = regulation.rules or {}
            
            for rule_name, threshold in rules.items():
                # Extract KRI name from rule (e.g., 'mfa_coverage_min' -> 'MFA Coverage')
                kri_name = self._rule_to_kri(rule_name)
                
                if kri_name in normalized_kris:
                    kri_score = normalized_kris[kri_name]['normalized_score']
                    
                    # Check violation
                    if self._is_violation(rule_name, kri_score, threshold):
                        reg_violations.append(kri_name)
            
            violations[regulation.name] = reg_violations
        
        return violations

    def _rule_to_kri(self, rule_name: str) -> str:
        """Convert rule name to KRI name"""
        rule_to_kri_map = {
            'mfa_coverage_min': 'MFA Coverage',
            'mfa_coverage_max': 'MFA Coverage',
            'patch_delay_max': 'Patch Delay',
            'patch_delay_min': 'Patch Delay',
            'encryption_coverage_min': 'Encryption Coverage',
            'encryption_coverage_max': 'Encryption Coverage',
            'log_retention_days_min': 'Log Retention Compliance',
            'incident_response_max_hours': 'Incident Response Time',
            'backup_freshness_max_days': 'Backup Freshness',
            'security_awareness_training_min': 'Security Awareness Training',
        }
        return rule_to_kri_map.get(rule_name, '')

    def _is_violation(self, rule_name: str, kri_score: float, threshold: float) -> bool:
        """Check if KRI violates threshold"""
        if 'max' in rule_name or 'days_min' not in rule_name:
            # Lower is better rules
            return kri_score < threshold
        else:
            # Higher is better rules
            return kri_score < threshold


class AIGovernanceAgent:
    """AI Governance Agent: Generates AI insights using Gemini"""
    
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-pro')
        else:
            self.model = None

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
            
            return {
                'risk_explanation': risk_explanation,
                'threat_scenarios': threat_scenarios,
                'remediation_steps': remediation_steps,
            }
        except Exception as e:
            logger.error(f"Gemini API error: {str(e)}")
            return self._fallback_insights(normalized_kris, risk_score, risk_level)

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
            return self._fallback_risk_explanation(context)

    def _generate_threat_scenarios(self, context: Dict) -> List[str]:
        """Generate threat scenarios using Gemini"""
        scenarios = []
        
        threat_map = {
            'MFA Coverage': 'Credential stuffing attacks with high success rate against accounts',
            'Patch Delay': 'Remote Code Execution via unpatched CVEs within days of disclosure',
            'Encryption Coverage': 'Data exfiltration through unencrypted channels',
            'Incident Response Time': 'Extended dwell time allowing lateral movement and escalation',
            'Backup Freshness': 'Ransomware recovery inability due to stale backups',
        }
        
        for kri_name, data in context['critical_kris']:
            if kri_name in threat_map:
                scenarios.append(f"{kri_name}: {threat_map[kri_name]}")
        
        return scenarios

    def _generate_remediation_steps(self, context: Dict) -> List[str]:
        """Generate remediation steps"""
        steps = []
        
        remediation_map = {
            'MFA Coverage': 'Implement MFA for all user accounts, starting with privileged accounts',
            'Patch Delay': 'Establish patch management SLA (critical: 15 days, high: 30 days)',
            'Encryption Coverage': 'Enable encryption for all data at rest and in transit',
            'Incident Response Time': 'Develop/update incident response playbooks targeting 4-hour TTFB',
            'Backup Freshness': 'Implement daily backup schedule with off-site replication',
            'Security Awareness Training': 'Conduct monthly security awareness training for all staff',
        }
        
        for kri_name, data in context['critical_kris']:
            if kri_name in remediation_map:
                steps.append(remediation_map[kri_name])
        
        return steps

    def _fallback_insights(self, normalized_kris: Dict, risk_score: float, risk_level: str) -> Dict:
        """Fallback when Gemini is not available"""
        return {
            'risk_explanation': self._fallback_risk_explanation({
                'risk_score': risk_score,
                'risk_level': risk_level,
                'critical_kris': [(n, d) for n, d in normalized_kris.items() if d['band'] == 'Critical']
            }),
            'threat_scenarios': self._fallback_threat_scenarios(normalized_kris),
            'remediation_steps': self._fallback_remediation_steps(normalized_kris),
        }

    def _fallback_risk_explanation(self, context: Dict) -> str:
        """Fallback risk explanation"""
        return f"Your organization has a {context['risk_level']} risk score of {context['risk_score']:.1f}/100. " \
               f"Focus on improving critical metrics: {', '.join([n for n, _ in context['critical_kris']])}."

    def _fallback_threat_scenarios(self, normalized_kris: Dict) -> List[str]:
        """Fallback threat scenarios"""
        threat_map = {
            'MFA Coverage': 'Credential stuffing attacks with high success rate',
            'Patch Delay': 'RCE exploitation within days of CVE publication',
            'Encryption Coverage': 'Data exfiltration via unencrypted channels',
            'Incident Response Time': 'Extended dwell time enabling lateral movement',
            'Backup Freshness': 'Inability to recover from ransomware',
        }
        
        scenarios = []
        for kri_name, data in normalized_kris.items():
            if data['band'] == 'Critical' and kri_name in threat_map:
                scenarios.append(threat_map[kri_name])
        
        return scenarios[:3]  # Top 3

    def _fallback_remediation_steps(self, normalized_kris: Dict) -> List[str]:
        """Fallback remediation steps"""
        remediation_map = {
            'MFA Coverage': 'Implement MFA for all accounts',
            'Patch Delay': 'Establish patch SLA (critical: 15 days)',
            'Encryption Coverage': 'Enable encryption for all data',
            'Incident Response Time': 'Develop IR playbooks (target 4-hour TTFB)',
            'Backup Freshness': 'Implement daily backup schedule',
        }
        
        steps = []
        for kri_name, data in normalized_kris.items():
            if data['band'] == 'Critical' and kri_name in remediation_map:
                steps.append(remediation_map[kri_name])
        
        return steps[:5]  # Top 5
