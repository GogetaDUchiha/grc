import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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

const MOCK_ASSESSMENTS = [];
const MOCK_KRI = [];

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
  const [latestDetail, setLatestDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [useMock, setUseMock] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (token === 'demo_access_token') {
        setAssessments(MOCK_ASSESSMENTS);
        setUseMock(true);
        return;
      }

      const response = await api.get(`/grc/assessments/`);
      let fetchedAssessments = response.data || [];
      // Sort by newest
      fetchedAssessments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setAssessments(fetchedAssessments);

      if (fetchedAssessments.length > 0) {
        try {
          const detailResponse = await api.get(`/grc/assessments/${fetchedAssessments[0].id}/`);
          setLatestDetail(detailResponse.data);
        } catch (e) {
          setLatestDetail(null);
        }
      } else {
        setLatestDetail(null);
      }

      setUseMock(false);
    } catch (error) {
      // Don't fallback to dummy data for real users on failure
      setAssessments([]);
      setUseMock(false);
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
            <View style={styles.metricsRow}>
              <View style={styles.miniMetric}>
                <Text style={styles.miniLabel}>Likelihood</Text>
                <Text style={styles.miniValue}>{((latestAssessment?.likelihood_score || 0) * 10).toFixed(1)}</Text>
              </View>
              <View style={styles.miniMetric}>
                <Text style={styles.miniLabel}>Impact</Text>
                <Text style={styles.miniValue}>{((latestAssessment?.impact_score || 0) * 10).toFixed(1)}</Text>
              </View>
            </View>
            <View style={styles.scoreGauge}>
              <View style={[styles.scoreBar, { width: `${Math.min(riskScore, 100)}%`, backgroundColor: scoreColor }]} />
            </View>
            <Text style={styles.scoreBarLabel}>{riskScore.toFixed(0)}% overall exposure</Text>
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
            onPress={() => navigation.navigate('AIInsights', { assessment: latestDetail || latestAssessment })}
            disabled={!latestAssessment}
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
            {latestDetail && latestDetail.kri_records ? latestDetail.kri_records.slice(0, 4).map((kri) => (
              <View key={kri.kri_name} style={styles.kriItem}>
                <View style={[styles.kriDot, { backgroundColor: getKriStatusColor(kri.band === 'Safe' ? 'success' : kri.band === 'Critical' ? 'danger' : 'warning') }]} />
                <Text style={styles.kriLabel} numberOfLines={1}>{kri.kri_name}</Text>
                <Text style={[styles.kriValue, { color: getKriStatusColor(kri.band === 'Safe' ? 'success' : kri.band === 'Critical' ? 'danger' : 'warning') }]}>
                  {kri.raw_value.toFixed(1)}{kri.unit || ''}
                </Text>
              </View>
            )) : MOCK_KRI.map((kri) => (
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

        {/* Risk Heatmap (v2) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="grid-view" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Cyber Risk Heatmap</Text>
          </View>
          <View style={styles.heatmap}>
            <View style={styles.heatmapY}><Text style={styles.heatmapLabel}>Impact</Text></View>
            <View style={styles.heatmapGrid}>
              {[1, 2, 3].map(row => (
                <View key={row} style={styles.heatmapRow}>
                  {[1, 2, 3].map(col => {
                    const isActive = latestAssessment && (
                      ((row === 1 && latestAssessment.impact_score > 0.6) ||
                        (row === 2 && latestAssessment.impact_score <= 0.6 && latestAssessment.impact_score > 0.3) ||
                        (row === 3 && latestAssessment.impact_score <= 0.3)) &&
                      ((col === 1 && latestAssessment.likelihood_score <= 0.3) ||
                        (col === 2 && latestAssessment.likelihood_score <= 0.6 && latestAssessment.likelihood_score > 0.3) ||
                        (col === 3 && latestAssessment.likelihood_score > 0.6))
                    );

                    const color = (row === 1) ? COLORS.danger : (row === 2) ? COLORS.warning : COLORS.success;
                    return (
                      <View key={col} style={[styles.heatmapCell, { backgroundColor: color, opacity: isActive ? 1 : 0.2 }]}>
                        {isActive && col === 2 && <MaterialIcons name="location-on" size={20} color="#fff" />}
                      </View>
                    )
                  })}
                </View>
              ))}
            </View>
          </View>
          <View style={styles.heatmapX}><Text style={styles.heatmapLabel}>Likelihood</Text></View>
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
            latestDetail && latestDetail.kri_records ?
              latestDetail.kri_records.filter(r => r.band === 'Critical' || r.band === 'Warning').map((item) => (
                <View key={item.kri_name} style={styles.riskItem}>
                  <View style={styles.riskInfo}>
                    <Text style={styles.riskName}>{item.kri_name}</Text>
                    <View style={[styles.severityBadge, { backgroundColor: item.band === 'Critical' ? COLORS.danger : COLORS.warning }]}>
                      <Text style={styles.severityText}>{item.band}</Text>
                    </View>
                  </View>
                  <View style={styles.riskBar}>
                    <View style={[styles.riskBarFill, { width: `${Math.min(item.normalized_score * 100, 100)}%`, backgroundColor: item.band === 'Critical' ? COLORS.danger : COLORS.warning }]} />
                  </View>
                </View>
              ))
              : [
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
            {latestDetail?.ai_output?.risk_explanation
              ? latestDetail.ai_output.risk_explanation
              : latestAssessment
              ? `Your organization shows a ${riskLevel.toLowerCase()} risk posture with a score of ${riskScore.toFixed(1)}/100. Open AI Insights for the full analysis.`
              : 'No assessment data available. Run your first assessment to receive AI-powered risk analysis and actionable recommendations tailored to your sector.'}
          </Text>
          <TouchableOpacity
            style={styles.aiButton}
            onPress={() => navigation.navigate('AIInsights', { assessment: latestDetail || latestAssessment })}
            disabled={!latestAssessment}
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
              <MaterialIcons name="assignment" size={36} color={COLORS.muted} />
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
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  miniMetric: {
    alignItems: 'center',
  },
  miniLabel: {
    fontSize: 9,
    color: COLORS.muted,
    textTransform: 'uppercase',
  },
  miniValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.dark,
  },
  heatmap: {
    flexDirection: 'row',
    height: 150,
    alignItems: 'center',
  },
  heatmapGrid: {
    flex: 1,
    gap: 4,
  },
  heatmapRow: {
    flexDirection: 'row',
    flex: 1,
    gap: 4,
  },
  heatmapCell: {
    flex: 1,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heatmapY: {
    width: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heatmapX: {
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  heatmapLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.muted,
    transform: [{ rotate: '-90deg' }],
  },
});