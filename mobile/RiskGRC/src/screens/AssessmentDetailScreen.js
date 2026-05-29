import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import COLORS from '../constants/colors';

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

const MOCK_KRIS = [];

export default function AssessmentDetailScreen({ route, navigation }) {
  // Support both { assessment } and { id } params
  const { assessment: passedAssessment, id } = route.params || {};

  // Check if passedAssessment is just a list item (lacks advanced fields)
  const isMinimal = passedAssessment && !passedAssessment.likelihood_score;

  const [assessment, setAssessment] = useState(passedAssessment || null);
  const [isLoading, setIsLoading] = useState((!passedAssessment && !!id) || isMinimal);

  useEffect(() => {
    if ((!passedAssessment && id) || isMinimal) {
      fetchAssessment(id || passedAssessment?.id);
    }
  }, [id, passedAssessment]);

  const fetchAssessment = async (assessmentId) => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await api.get(`/grc/assessments/${assessmentId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssessment(response.data);
    } catch (error) {
      console.error('Error fetching assessment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!assessment) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={48} color={COLORS.muted} />
        <Text style={styles.errorText}>Assessment not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const scoreColor = getScoreColor(assessment.risk_score || 0);

  const kris = (assessment.kri_records && assessment.kri_records.length > 0)
    ? assessment.kri_records.map(r => ({
      name: r.kri_name,
      value: `${r.raw_value} ${r.unit || ''}`.trim(),
      status: r.band, // e.g. "Critical", "Warning", "Safe"
      details: r.band_display,
    }))
    : assessment.kri_data
      ? Object.entries(assessment.kri_data).map(([k, v]) => ({
        name: k.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        value: `${v}`,
        status: 'Warning',
      }))
      : MOCK_KRIS;

  const compliances = assessment.compliance_results || [];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Score Hero */}
      <View style={[styles.hero, { borderBottomColor: scoreColor }]}>
        <Text style={styles.orgName}>{assessment.organization_name || 'Assessment'}</Text>
        <Text style={[styles.score, { color: scoreColor }]}>
          {(assessment.risk_score || 0).toFixed(1)}
        </Text>
        <Text style={styles.scoreLabel}>Risk Score / 100</Text>
        <View style={[styles.levelBadge, { backgroundColor: getRiskColor(assessment.risk_level) }]}>
          <Text style={styles.levelText}>{assessment.risk_level || 'N/A'}</Text>
        </View>
        <Text style={styles.date}>
          {new Date(assessment.created_at).toLocaleDateString('en-US', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
          })}
        </Text>
        <View style={styles.advancedStats}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{(assessment.likelihood_score * 10).toFixed(1)}/10</Text>
            <Text style={styles.statLab}>Likelihood</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{(assessment.impact_score * 10).toFixed(1)}/10</Text>
            <Text style={styles.statLab}>Impact</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{(assessment.exploitability_score * 10).toFixed(1)}/10</Text>
            <Text style={styles.statLab}>Exploitability</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Meta info */}
        <View style={styles.metaCard}>
          <View style={styles.metaItem}>
            <MaterialIcons name="info-outline" size={16} color={COLORS.primary} />
            <Text style={styles.metaLabel}>Input Mode</Text>
            <Text style={styles.metaValue}>{assessment.input_mode || 'manual'}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <MaterialIcons name="assignment" size={16} color={COLORS.primary} />
            <Text style={styles.metaLabel}>Assessment ID</Text>
            <Text style={styles.metaValue}>#{assessment.id}</Text>
          </View>
        </View>

        {/* Action Button: Download PDF */}
        <TouchableOpacity
          style={styles.downloadBtn}
          onPress={() => {
            Linking.openURL(`${api.defaults.baseURL}/grc/assessments/${assessment.id}/export_pdf/`);
          }}
        >
          <MaterialIcons name="picture-as-pdf" size={20} color="#fff" />
          <Text style={styles.downloadBtnText}>Generate Professional Audit Report</Text>
        </TouchableOpacity>

        {/* KRI Table */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="bar-chart" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>KRI Values</Text>
          </View>
          {kris.map((kri, i) => (
            <View key={i} style={styles.kriRow}>
              <Text style={styles.kriName}>{kri.name}</Text>
              <View style={[styles.kriValueBadge, {
                backgroundColor: kri.status === 'Safe'
                  ? 'rgba(16,185,129,0.1)'
                  : (kri.status === 'Warning' || kri.status === 'Watch')
                    ? 'rgba(245,158,11,0.1)'
                    : 'rgba(239,68,68,0.1)',
              }]}>
                <Text style={[styles.kriValue, {
                  color: kri.status === 'Safe'
                    ? COLORS.success
                    : (kri.status === 'Warning' || kri.status === 'Watch')
                      ? COLORS.warning
                      : COLORS.danger,
                }]}>{kri.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Evidence-to-Control Mapping (v2) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="account-tree" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>AI Evidence-to-Control Mapping</Text>
          </View>
          {assessment.control_results && assessment.control_results.length > 0 ? assessment.control_results.map((res, rid) => (
            <View key={rid} style={styles.controlMappingCard}>
              <View style={styles.controlHeader}>
                <Text style={styles.controlId}>{res.control_details.control_id}</Text>
                <Text style={[styles.controlStatus, { color: res.status === 'Compliant' ? COLORS.success : res.status === 'Partial' ? COLORS.warning : COLORS.danger }]}>{res.status}</Text>
              </View>
              <Text style={styles.controlTitle}>{res.control_details.title}</Text>
              <View style={styles.aiAnalysisBox}>
                <Text style={styles.aiAnalysisLabel}>AI Reasoning:</Text>
                <Text style={styles.aiAnalysisText}>{res.ai_analysis}</Text>
              </View>
              <View style={styles.evidenceLine}>
                <Text style={styles.evidenceLabel}>Evidence:</Text>
                <Text style={styles.evidenceText}>{res.evidence}</Text>
              </View>
              <View style={styles.mappingFooter}>
                <Text style={styles.confidenceText}>Confidence: {res.confidence_score}%</Text>
                <Text style={styles.impactText}>Risk Impact: {res.risk_impact}</Text>
              </View>
            </View>
          )) : (
            <Text style={styles.noDataText}>No detailed control mapping available for this legacy assessment.</Text>
          )}
        </View>

        {/* AI Insights Button */}
        <TouchableOpacity
          style={styles.aiButton}
          onPress={() => navigation.navigate('AIInsights', { assessment })}
        >
          <MaterialIcons name="auto-awesome" size={20} color="#fff" />
          <Text style={styles.aiButtonText}>View AI Insights & Recommendations</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText: { fontSize: 16, color: COLORS.muted },
  backBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: 8 },
  backBtnText: { color: '#fff', fontWeight: '600' },
  hero: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderBottomWidth: 3,
    gap: 6,
  },
  orgName: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  score: { fontSize: 64, fontWeight: '900', lineHeight: 70 },
  scoreLabel: { fontSize: 13, color: COLORS.muted },
  levelBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  levelText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  date: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  content: { padding: 16, gap: 12 },
  metaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: { flex: 1, alignItems: 'center', gap: 4 },
  metaLabel: { fontSize: 11, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValue: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  metaDivider: { width: 1, height: 36, backgroundColor: COLORS.light, marginHorizontal: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.dark },
  kriRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light,
  },
  kriName: { fontSize: 13, color: COLORS.dark },
  kriValueBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  kriValue: { fontSize: 13, fontWeight: '700' },
  complianceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light,
  },
  complianceName: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  complianceBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  complianceBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  aiButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  aiButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  complianceCard: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light,
    paddingBottom: 16,
  },
  complianceStatusText: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  evidenceTable: {
    marginTop: 12,
    backgroundColor: COLORS.light,
    borderRadius: 8,
    padding: 10,
  },
  evidenceHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 6,
    marginBottom: 6,
  },
  evidenceHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
  },
  evidenceRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    alignItems: 'center',
  },
  evidenceCell: {
    fontSize: 11,
    color: COLORS.dark,
  },
  advancedStats: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
    justifyContent: 'center',
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 80,
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.dark,
  },
  statLab: {
    fontSize: 10,
    color: COLORS.muted,
    textTransform: 'uppercase',
  },
  downloadBtn: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  downloadBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  controlMappingCard: {
    backgroundColor: COLORS.light,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  controlId: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  controlStatus: {
    fontSize: 11,
    fontWeight: '800',
  },
  controlTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 8,
  },
  aiAnalysisBox: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  aiAnalysisLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.muted,
    marginBottom: 2,
  },
  aiAnalysisText: {
    fontSize: 11,
    color: COLORS.dark,
    lineHeight: 16,
  },
  evidenceLine: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  evidenceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
  },
  evidenceText: {
    fontSize: 11,
    color: COLORS.dark,
    flex: 1,
  },
  mappingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 8,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.success,
  },
  impactText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.danger,
  },
  noDataText: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
    padding: 20,
  }
});