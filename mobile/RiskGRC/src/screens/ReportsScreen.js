import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { COLORS } from '../../App';

const ReportsScreen = () => {
  const [assessments, setAssessments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const apiUrl = await AsyncStorage.getItem('apiUrl') || 'http://localhost:8000/api';

      const response = await axios.get(`${apiUrl}/grc/assessments/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      

      // Sort by created_at descending
      const sorted = response.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setAssessments(sorted);
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Error', 'Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async (assessmentId) => {
    Alert.alert(
      'Export PDF',
      'PDF export feature coming soon.\nYou can download the report from the web portal.'
    );
  };

  const renderReportItem = ({ item }) => (
    <View style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <View>
          <Text style={styles.reportTitle}>{item.organization_name}</Text>
          <Text style={styles.reportDate}>
            {new Date(item.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
        <View style={[styles.riskBadge, { backgroundColor: getRiskColor(item.risk_level) }]}>
          <Text style={styles.riskText}>{item.risk_level}</Text>
        </View>
      </View>

      <View style={styles.reportStats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.risk_score.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Risk Score</Text>
        </View>
        <View style={styles.stat}>
          <MaterialIcons name={item.input_mode === 'manual' ? 'edit' : 'upload'} size={20} color={COLORS.primary} />
          <Text style={styles.statLabel}>{item.input_mode}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>-</Text>
          <Text style={styles.statLabel}>Status</Text>
        </View>
      </View>

      <View style={styles.reportActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleExportPDF(item.id)}
        >
          <MaterialIcons name="download" size={18} color="#fff" />
          <Text style={styles.actionBtnText}>Export</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.viewBtn]}>
          <MaterialIcons name="visibility" size={18} color={COLORS.primary} />
          <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'Low':
        return COLORS.success;
      case 'Moderate':
        return COLORS.warning;
      case 'High':
        return '#ff8c00';
      case 'Critical':
        return COLORS.danger;
      default:
        return COLORS.muted;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reports</Text>
          <Text style={styles.headerSubtitle}>Assessment Reports & Exports</Text>
        </View>

        {assessments.length > 0 ? (
          <FlatList
            data={assessments}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderReportItem}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="description" size={48} color={COLORS.muted} />
            <Text style={styles.emptyText}>No reports available</Text>
            <Text style={styles.emptySubtext}>
              Reports will appear here once you complete an assessment.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
  },
  reportDate: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  riskText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  reportStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  reportActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  viewBtn: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default ReportsScreen;
