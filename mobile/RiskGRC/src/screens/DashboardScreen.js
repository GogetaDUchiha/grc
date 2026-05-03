import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import COLORS from '../constants/colors';
import { AuthContext } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const MOCK_ASSESSMENTS = [
  {
    id: 1,
    organization_name: 'Demo Org',
    risk_score: 62.5,
    risk_level: 'Moderate',
    input_mode: 'manual',
    created_at: new Date().toISOString(),
  },
];

const MOCK_KRI = [
  { label: 'MFA Coverage', value: 78, status: 'warning' },
  { label: 'Patch Delay', value: 12, unit: 'days', status: 'danger' },
  { label: 'Encryption %', value: 91, status: 'success' },
  { label: 'Failed Logins', value: 3.2, unit: '%', status: 'success' },
  { label: 'Privileged Accts', value: 15, status: 'warning' },
  { label: 'Incident Response', value: 4.5, unit: 'hrs', status: 'warning' },
];

function getRiskColor(level) {
  switch (level) {
    case 'Low': return COLORS.success;
    case 'Moderate': return COLORS.warning;
    case 'High': return '#ff8c00';
    case 'Critical': return COLORS.danger;
    default: return COLORS.muted;
  }
}

function getScoreColor(score) {
  if (score >= 70) return COLORS.danger;
  if (score >= 40) return COLORS.warning;
  return COLORS.success;
}

function getKriStatusColor(status) {
  if (status === 'success') return COLORS.success;
  if (status === 'warning') return COLORS.warning;
  return COLORS.danger;
}

export default function DashboardScreen({ navigation }) {
  const { logout } = useContext(AuthContext);
  const [assessments, setAssessments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [useMock, setUseMock] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (token === 'demo_access_token') {
        setAssessments(MOCK_ASSESSMENTS);
        setUseMock(true);
        return;
      }

      const response = await api.get(`/grc/assessments/`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      setAssessments(response.data || []);
      setUseMock(false);
    } catch (error) {
      // Graceful fallback to mock data
      setAssessments(MOCK_ASSESSMENTS);
      setUseMock(true);
    } finally {
      setIsLoading(false);
    }
  };

  const latestAssessment = assessments.length > 0 ? assessments[0] : null;
  const riskScore = latestAssessment ? latestAssessment.risk_score : 0;
  const riskLevel = latestAssessment ? latestAssessment.risk_level : 'N/A';
  const scoreColor = getScoreColor(riskScore);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Banner */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>RiskGRC</Text>
          <Text style={styles.headerSubtitle}>Cyber GRC Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <MaterialIcons name="logout" size={20} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {useMock && (
        <View style={styles.mockBanner}>
          <MaterialIcons name="info-outline" size={16} color={COLORS.warning} />
          <Text style={styles.mockBannerText}>Demo mode — connect backend for live data</Text>
        </View>
      )}

      <View style={styles.content}>
        {/* Big Risk Score Card */}
        <View style={[styles.scoreCard, { borderTopColor: scoreColor }]}>
          <View style={styles.scoreLeft}>
            <Text style={styles.scoreLabel}>Overall Risk Score</Text>
            <Text style={[styles.scoreValue, { color: scoreColor }]}>
              {riskScore.toFixed(1)}
            </Text>
            <Text style={styles.scoreMax}>/ 100</Text>
          </View>
          <View style={styles.scoreRight}>
            <View style={[styles.riskBadge, { backgroundColor: getRiskColor(riskLevel) }]}>
              <Text style={styles.riskBadgeText}>{riskLevel}</Text>
            </View>
            <View style={styles.scoreGauge}>
              <View style={[styles.scoreBar, { width: `${Math.min(riskScore, 100)}%`, backgroundColor: scoreColor }]} />
            </View>
            <Text style={styles.scoreBarLabel}>{riskScore.toFixed(0)}% risk exposure</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={() => navigation.navigate('NewAssessment')}
          >
            <MaterialIcons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.primaryActionText}>New Assessment</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={() => navigation.navigate('AIInsights', { assessment: latestAssessment })}
          >
            <MaterialIcons name="psychology" size={20} color={COLORS.primary} />
            <Text style={styles.secondaryActionText}>AI Insights</Text>
          </TouchableOpacity>
        </View>

        {/* KRI Breakdown */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="bar-chart" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>KRI Breakdown</Text>
          </View>
          <View style={styles.kriGrid}>
            {MOCK_KRI.map((kri) => (
              <View key={kri.label} style={styles.kriItem}>
                <View style={[styles.kriDot, { backgroundColor: getKriStatusColor(kri.status) }]} />
                <Text style={styles.kriLabel}>{kri.label}</Text>
                <Text style={[styles.kriValue, { color: getKriStatusColor(kri.status) }]}>
                  {kri.value}{kri.unit || '%'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Compliance Matrix Preview */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="verified-user" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Compliance Matrix</Text>
          </View>
          <View style={styles.complianceGrid}>
            {[
              { regulation: 'PCI DSS', status: 'Partial', color: COLORS.warning },
              { regulation: 'ISO 27001', status: 'Compliant', color: COLORS.success },
              { regulation: 'NIST CSF', status: 'Review', color: '#ff8c00' },
              { regulation: 'GDPR', status: 'Compliant', color: COLORS.success },
            ].map((item) => (
              <View key={item.regulation} style={styles.complianceItem}>
                <View style={[styles.complianceDot, { backgroundColor: item.color }]} />
                <View style={styles.complianceInfo}>
                  <Text style={styles.complianceReg}>{item.regulation}</Text>
                  <Text style={[styles.complianceStatus, { color: item.color }]}>{item.status}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Top Risks */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="warning" size={20} color={COLORS.danger} />
            <Text style={styles.sectionTitle}>Top Risk Factors</Text>
          </View>
          {assessments.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="check-circle-outline" size={36} color={COLORS.success} />
              <Text style={styles.emptyStateText}>No critical risks detected</Text>
              <Text style={styles.emptyStateSubtext}>Run an assessment to identify threats</Text>
            </View>
          ) : (
            [
              { risk: 'Unpatched Systems', severity: 'High', score: 78 },
              { risk: 'Weak MFA Coverage', severity: 'Moderate', score: 55 },
              { risk: 'Privileged Access', severity: 'Moderate', score: 48 },
            ].map((item) => (
              <View key={item.risk} style={styles.riskItem}>
                <View style={styles.riskInfo}>
                  <Text style={styles.riskName}>{item.risk}</Text>
                  <View style={[styles.severityBadge, { backgroundColor: getRiskColor(item.severity) }]}>
                    <Text style={styles.severityText}>{item.severity}</Text>
                  </View>
                </View>
                <View style={styles.riskBar}>
                  <View style={[styles.riskBarFill, { width: `${item.score}%`, backgroundColor: getRiskColor(item.severity) }]} />
                </View>
              </View>
            ))
          )}
        </View>

        {/* AI Summary Card */}
        <View style={[styles.sectionCard, styles.aiCard]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="auto-awesome" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>AI Summary</Text>
          </View>
          <Text style={styles.aiSummaryText}>
            {latestAssessment
              ? `Your organization shows a ${riskLevel.toLowerCase()} risk posture with a score of ${riskScore.toFixed(1)}/100. Primary concerns include authentication gaps and delayed patching cycles. Recommend immediate MFA enforcement and patch management review.`
              : 'No assessment data available. Run your first assessment to receive AI-powered risk analysis and actionable recommendations tailored to your sector.'}
          </Text>
          <TouchableOpacity
            style={styles.aiButton}
            onPress={() => navigation.navigate('AIInsights', { assessment: latestAssessment })}
          >
            <Text style={styles.aiButtonText}>View Full AI Report →</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Assessments */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="history" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Recent Assessments</Text>
          </View>
          {assessments.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="assignment-outlined" size={36} color={COLORS.muted} />
              <Text style={styles.emptyStateText}>No assessments yet</Text>
              <TouchableOpacity
                style={styles.emptyStateBtn}
                onPress={() => navigation.navigate('NewAssessment')}
              >
                <Text style={styles.emptyStateBtnText}>Create First Assessment</Text>
              </TouchableOpacity>
            </View>
          ) : (
            assessments.slice(0, 3).map((item) => (
              <TouchableOpacity
                key={item.id.toString()}
                style={styles.assessmentRow}
                onPress={() => navigation.navigate('AssessmentDetail', { assessment: item })}
              >
                <View style={styles.assessmentInfo}>
                  <Text style={styles.assessmentOrg}>{item.organization_name}</Text>
                  <Text style={styles.assessmentDate}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.assessmentScore}>
                  <Text style={[styles.assessmentScoreText, { color: getScoreColor(item.risk_score) }]}>
                    {item.risk_score.toFixed(1)}
                  </Text>
                  <MaterialIcons name="chevron-right" size={16} color={COLORS.muted} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.light,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.muted,
    fontSize: 14,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  mockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  mockBannerText: {
    fontSize: 12,
    color: '#92400e',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  scoreCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 4,
  },
  scoreLeft: {
    flex: 1,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 52,
    fontWeight: '800',
    lineHeight: 56,
  },
  scoreMax: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 4,
  },
  scoreRight: {
    flex: 1.2,
    paddingLeft: 20,
    gap: 10,
  },
  riskBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  riskBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  scoreGauge: {
    height: 8,
    backgroundColor: COLORS.light,
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBar: {
    height: '100%',
    borderRadius: 4,
  },
  scoreBarLabel: {
    fontSize: 11,
    color: COLORS.muted,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryAction: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryAction: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  secondaryActionText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.dark,
  },
  kriGrid: {
    gap: 8,
  },
  kriItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 10,
  },
  kriDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  kriLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.dark,
  },
  kriValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  complianceGrid: {
    gap: 10,
  },
  complianceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  complianceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  complianceInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  complianceReg: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
  },
  complianceStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  riskItem: {
    marginBottom: 12,
  },
  riskInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  riskName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  severityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  riskBar: {
    height: 6,
    backgroundColor: COLORS.light,
    borderRadius: 3,
    overflow: 'hidden',
  },
  riskBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  aiCard: {
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.15)',
    backgroundColor: 'rgba(37, 99, 235, 0.02)',
  },
  aiSummaryText: {
    fontSize: 13,
    color: COLORS.dark,
    lineHeight: 20,
    marginBottom: 14,
  },
  aiButton: {
    alignSelf: 'flex-start',
  },
  aiButtonText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
  },
  emptyStateBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  emptyStateBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  assessmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light,
  },
  assessmentInfo: {},
  assessmentOrg: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  assessmentDate: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  assessmentScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assessmentScoreText: {
    fontSize: 18,
    fontWeight: '800',
  },
});