import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
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

const MOCK_KRIS = [
  { name: 'MFA Coverage', value: '78%', status: 'warning' },
  { name: 'Patch Delay', value: '12 days', status: 'danger' },
  { name: 'Encryption', value: '91%', status: 'success' },
  { name: 'Failed Logins', value: '3.2%', status: 'success' },
  { name: 'Privileged Accts', value: '15', status: 'warning' },
  { name: 'Incident Response', value: '4.5 hrs', status: 'warning' },
];

export default function AssessmentDetailScreen({ route, navigation }) {
  // Support both { assessment } and { id } params
  const { assessment: passedAssessment, id } = route.params || {};

  const [assessment, setAssessment] = useState(passedAssessment || null);
  const [isLoading, setIsLoading] = useState(!passedAssessment && !!id);

  useEffect(() => {
    if (!passedAssessment && id) {
      fetchAssessment(id);
    }
  }, [id]);

  const fetchAssessment = async (assessmentId) => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (token === 'demo_access_token') {
        setAssessment({
          id: assessmentId,
          organization_name: 'Demo Org',
          risk_score: 55.5,
          risk_level: 'Moderate',
          input_mode: 'manual',
          created_at: new Date().toISOString(),
        });
        return;
      }

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

        {/* Compliance Status */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="verified-user" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Sector Compliance Frameworks</Text>
          </View>
          {compliances.length > 0 ? compliances.map((item, idx) => {
            const isCompliant = item.status === 'PASS';
            const color = isCompliant ? COLORS.success : COLORS.danger;
            return (
              <View key={idx} style={styles.complianceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.complianceName}>{item.regulation_name}</Text>
                  {item.violated_kri_names && item.violated_kri_names.length > 0 && (
                    <Text style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>
                      Violations: {item.violated_kri_names.join(', ')}
                    </Text>
                  )}
                </View>
                <View style={[styles.complianceBadge, { backgroundColor: color }]}>
                  <Text style={styles.complianceBadgeText}>{item.status_display || item.status}</Text>
                </View>
              </View>
            )
          }) : (
            <View style={{ padding: 16, alignItems: 'center' }}>
              <Text style={{ color: COLORS.muted, fontSize: 13 }}>No compliance frameworks attached to this sector</Text>
            </View>
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
  },
  aiButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});