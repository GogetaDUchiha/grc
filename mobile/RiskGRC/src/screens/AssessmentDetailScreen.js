import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Alert } from 'react-native';
import { grcAPI, aiAPI } from '../services/api';

const AssessmentDetailScreen = ({ route }) => {
  const { id } = route.params;
  const [assessment, setAssessment] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await grcAPI.getAssessment(id);
        setAssessment(response.data);
        const recResponse = await aiAPI.getRecommendations(id);
        setRecommendations(recResponse.data.recommendations);
      } catch (error) {
        Alert.alert('Error', 'Failed to load data');
      }
    };
    fetchData();
  }, [id]);

  if (!assessment) return <Text>Loading...</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Assessment Details</Text>
      <Text>Risk Score: {assessment.risk_score.score}</Text>
      <Text>Level: {assessment.risk_score.level}</Text>
      <Text>KRIs:</Text>
      <FlatList
        data={assessment.kris}
        renderItem={({ item }) => <Text>{item.name}: {item.value}</Text>}
        keyExtractor={item => item.id.toString()}
      />
      <Text>Compliance:</Text>
      <FlatList
        data={assessment.compliance_statuses}
        renderItem={({ item }) => <Text>{item.regulation}: {item.status}</Text>}
        keyExtractor={item => item.id.toString()}
      />
      <Text>AI Recommendations:</Text>
      <FlatList
        data={recommendations}
        renderItem={({ item }) => (
          <View style={styles.rec}>
            <Text>Issue: {item.issue}</Text>
            <Text>Recommendation: {item.recommendation}</Text>
          </View>
        )}
        keyExtractor={(item, index) => index.toString()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, textAlign: 'center', marginBottom: 20 },
  rec: { padding: 10, borderWidth: 1, marginBottom: 10 },
});

export default AssessmentDetailScreen;