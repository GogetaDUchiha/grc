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
  Dimensions,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { COLORS } from '../../App';

const windowWidth = Dimensions.get('window').width;

const AssessmentScreen = ({ navigation }) => {
  const [assessments, setAssessments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [organizations, setOrganizations] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const apiUrl = await AsyncStorage.getItem('apiUrl') || 'http://localhost:8000/api';

      // Load organizations
      const orgsRes = await axios.get(`${apiUrl}/accounts/organizations/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrganizations(orgsRes.data);
      if (!selectedOrg && orgsRes.data.length > 0) {
        setSelectedOrg(orgsRes.data[0]);
      }

      // Load assessments if org is selected
      if (selectedOrg) {
        const assessRes = await axios.get(`${apiUrl}/grc/assessments/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAssessments(assessRes.data);
      }
    } catch (error) {
      console.error('Error loading assessments:', error);
      Alert.alert('Error', 'Failed to load assessments');
    } finally {
      setIsLoading(false);
    }
  };

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

  const renderAssessmentItem = ({ item }) => (
    <TouchableOpacity
      style={styles.assessmentCard}
      onPress={() => {
        navigation.navigate('AssessmentDetail', { assessment: item });
      }}
    >
      <View style={styles.cardHeaderass}>
        <Text style={styles.cardTitle}>{item.organization_name}</Text>
        <View
          style={{
            ...styles.riskBadge,
            backgroundColor: getRiskColor(item.risk_level),
          }}
        >
          <Text style={styles.riskText}>{item.risk_level}</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.riskScoreBox}>
          <Text style={styles.riskScore}>{item.risk_score.toFixed(1)}</Text>
          <Text style={styles.riskLabel}>/ 100</Text>
        </View>

        <View style={styles.metaInfo}>
          <View style={styles.metaItem}>
            <MaterialIcons name="calendar-today" size={16} color={COLORS.muted} />
            <Text style={styles.metaText}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialIcons name="info" size={16} color={COLORS.muted} />
            <Text style={styles.metaText}>{item.input_mode}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

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
        {/* Organization Selector */}
        {organizations.length > 1 && (
          <View style={styles.orgSelectorContainer}>
            <Text style={styles.sectionTitle}>Organization</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.orgScroll}>
              {organizations.map((org) => (
                <TouchableOpacity
                  key={org.id}
                  style={{
                    ...styles.orgPill,
                    backgroundColor: selectedOrg?.id === org.id ? COLORS.primary : COLORS.light,
                  }}
                  onPress={() => {
                    setSelectedOrg(org);
                    loadData();
                  }}
                >
                  <Text
                    style={{
                      ...styles.orgPillText,
                      color: selectedOrg?.id === org.id ? '#fff' : COLORS.dark,
                    }}
                  >
                    {org.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Summary Card */}
        {assessments.length > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{assessments.length}</Text>
                <Text style={styles.summaryLabel}>Total Assessments</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>
                  {(assessments.reduce((sum, a) => sum + a.risk_score, 0) / assessments.length).toFixed(1)}
                </Text>
                <Text style={styles.summaryLabel}>Avg Risk</Text>
              </View>
            </View>
          </View>
        )}

        {/* Assessments List */}
        <View style={styles.listContainer}>
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Recent Assessments</Text>
            <TouchableOpacity
              style={styles.newButton}
              onPress={() => navigation.navigate('NewAssessment')}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {assessments.length > 0 ? (
            <FlatList
              data={assessments}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderAssessmentItem}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="assessment" size={48} color={COLORS.muted} />
              <Text style={styles.emptyText}>No assessments yet</Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => navigation.navigate('NewAssessment')}
              >
                <Text style={styles.createButtonText}>Create Your First Assessment</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
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
    backgroundColor: COLORS.light,
  },
  orgSelectorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  orgScroll: {
    marginTop: 8,
  },
  orgPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.muted,
  },
  orgPillText: {
    fontWeight: '600',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 4,
  },
  summaryCard: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  newButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assessmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeaderass: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
    flex: 1,
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  riskText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskScoreBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  riskScore: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
  },
  riskLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginLeft: 4,
  },
  metaInfo: {
    flex: 1,
    marginLeft: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.muted,
    marginLeft: 6,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.light,
    marginVertical: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 12,
  },
  createButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default AssessmentScreen;
