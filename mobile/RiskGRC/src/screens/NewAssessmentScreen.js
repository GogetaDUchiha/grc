import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { grcAPI } from '../services/api';

const NewAssessmentScreen = ({ navigation }) => {
  const [mfa, setMfa] = useState('');
  const [patchDelay, setPatchDelay] = useState('');
  const [encryption, setEncryption] = useState('');

  const handleSubmit = async () => {
    try {
      await grcAPI.createAssessment({
        mfa_percentage: parseFloat(mfa),
        patch_delay_days: parseFloat(patchDelay),
        encryption_percentage: parseFloat(encryption),
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to create assessment');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Assessment</Text>
      <TextInput
        style={styles.input}
        placeholder="MFA Percentage"
        keyboardType="numeric"
        value={mfa}
        onChangeText={setMfa}
      />
      <TextInput
        style={styles.input}
        placeholder="Patch Delay Days"
        keyboardType="numeric"
        value={patchDelay}
        onChangeText={setPatchDelay}
      />
      <TextInput
        style={styles.input}
        placeholder="Encryption Percentage"
        keyboardType="numeric"
        value={encryption}
        onChangeText={setEncryption}
      />
      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, textAlign: 'center', marginBottom: 20 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 },
  button: { backgroundColor: '#007bff', padding: 15, borderRadius: 5, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 16 },
});

export default NewAssessmentScreen;