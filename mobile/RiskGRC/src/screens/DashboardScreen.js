import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { grcAPI } from '../services/api';

const DashboardScreen = ({ navigation }) => {
  const [assessments, setAssessments] = useState([]);

  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        const response = await grcAPI.getAssessments();
        setAssessments(response.data);
      } catch (error) {
        Alert.alert('Error', 'Failed to load assessments');
      }
    };
    fetchAssessments();
  }, []);

  const renderAssessment = ({ item }) => (
    <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('AssessmentDetail', { id: item.id })}>
      <Text>Risk Score: {item.risk_score ? item.risk_score.score : 'N/A'}</Text>
      <Text>Level: {item.risk_score ? item.risk_score.level : 'N/A'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('NewAssessment')}>
        <Text style={styles.buttonText}>New Assessment</Text>
      </TouchableOpacity>
      <FlatList
        data={assessments}
        renderItem={renderAssessment}
        keyExtractor={item => item.id.toString()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, textAlign: 'center', marginBottom: 20 },
  button: { backgroundColor: '#007bff', padding: 15, borderRadius: 5, alignItems: 'center', marginBottom: 20 },
  buttonText: { color: 'white', fontSize: 16 },
  item: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#ccc' },
});

export default DashboardScreen;