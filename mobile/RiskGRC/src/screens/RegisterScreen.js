import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { authAPI } from '../services/api';
import { validateUsername, validateEmail, validatePassword } from '../utils/validation';

const RegisterScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [organization, setOrganization] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await authAPI.getOrganizations();
        if (Array.isArray(response.data)) {
          setOrganizations(response.data);
        }
      } catch (error) {
        console.warn('Failed to load organizations:', error.message);
      }
    };
    fetchOrganizations();
  }, []);

  const validateInputs = () => {
    const newErrors = {};

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      newErrors.username = usernameValidation.error;
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      newErrors.email = emailValidation.error;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      newErrors.password = passwordValidation.error;
    }

    if (password !== passwordConfirm) {
      newErrors.passwordConfirm = 'Passwords do not match';
    }

    if (!organization) {
      newErrors.organization = 'Please select an organization';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateInputs()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await authAPI.register({
        username: username.trim(),
        email: email.trim(),
        password,
        organization,
      });

      if (response.data?.tokens?.access && response.data?.tokens?.refresh) {
        await AsyncStorage.setItem('access_token', response.data.tokens.access);
        await AsyncStorage.setItem('refresh_token', response.data.tokens.refresh);

        // Clear sensitive data
        setPassword('');
        setPasswordConfirm('');
        setUsername('');
        setEmail('');

        navigation.replace('Dashboard');
      } else {
        Alert.alert('Error', 'Invalid response format from server');
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.detail ||
        error?.response?.data?.username?.[0] ||
        error?.response?.data?.email?.[0] ||
        error?.response?.data?.non_field_errors?.[0] ||
        error?.message ||
        'Registration failed. Please try again';

      Alert.alert('Registration Error', errorMessage);
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join RiskGRC</Text>

        <View style={styles.formContainer}>
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={[styles.input, errors.username && styles.inputError]}
              placeholder="Choose a username"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (errors.username) setErrors({ ...errors, username: '' });
              }}
              editable={!isLoading}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={150}
            />
            {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="your@email.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              editable={!isLoading}
              autoCapitalize="none"
              keyboardType="email-address"
              maxLength={254}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="At least 6 characters"
              secureTextEntry
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: '' });
              }}
              editable={!isLoading}
              maxLength={255}
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={[styles.input, errors.passwordConfirm && styles.inputError]}
              placeholder="Repeat password"
              secureTextEntry
              value={passwordConfirm}
              onChangeText={(text) => {
                setPasswordConfirm(text);
                if (errors.passwordConfirm) setErrors({ ...errors, passwordConfirm: '' });
              }}
              editable={!isLoading}
              maxLength={255}
            />
            {errors.passwordConfirm && (
              <Text style={styles.errorText}>{errors.passwordConfirm}</Text>
            )}
          </View>

          {organizations.length > 0 && (
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Organization</Text>
              <View style={[styles.pickerContainer, errors.organization && styles.inputError]}>
                <Picker
                  selectedValue={organization}
                  onValueChange={setOrganization}
                  enabled={!isLoading}
                >
                  <Picker.Item label="Select Organization" value="" />
                  {organizations.map((org) => (
                    <Picker.Item key={org.id} label={org.name} value={org.id} />
                  ))}
                </Picker>
              </View>
              {errors.organization && (
                <Text style={styles.errorText}>{errors.organization}</Text>
              )}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Register</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={isLoading}>
          <Text style={styles.link}>
            Already have an account? <Text style={styles.linkBold}>Login</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContainer: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8, color: '#333' },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 32, color: '#666' },
  formContainer: { marginBottom: 24 },
  fieldContainer: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 6, fontSize: 14, backgroundColor: '#fff', color: '#333' },
  inputError: { borderColor: '#dc3545', backgroundColor: '#fff5f5' },
  errorText: { marginTop: 4, fontSize: 12, color: '#dc3545' },
  pickerContainer: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, backgroundColor: '#fff', overflow: 'hidden' },
  button: { backgroundColor: '#007bff', padding: 14, borderRadius: 6, alignItems: 'center', marginBottom: 16 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  link: { textAlign: 'center', color: '#666', fontSize: 14 },
  linkBold: { color: '#007bff', fontWeight: '600' },
});

export default RegisterScreen;