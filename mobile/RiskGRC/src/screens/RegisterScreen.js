import React, { useState } from 'react';
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
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import COLORS from '../constants/colors';

const SECTORS = ['Fintech', 'Banking', 'Telecom', 'Government', 'IT'];

const RegisterScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [sector, setSector] = useState(SECTORS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const validateInputs = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (password !== passwordConfirm) {
      newErrors.passwordConfirm = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateInputs()) return;
    setIsLoading(true);
    try {
      const response = await api.post(`/accounts/register/`, {
        email: email.trim(),
        phone: phone.trim(),
        password,
        sector,
      });

      if (response.data?.tokens?.access) {
        await AsyncStorage.setItem('access_token', response.data.tokens.access);
        await AsyncStorage.setItem('refresh_token', response.data.tokens.refresh);
        setGlobalError('');
        Alert.alert('Success', 'Account created! Please login.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
      } else {
        Alert.alert('Success', 'Account created! Please login.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
      }
    } catch (error) {
      const errorData = error?.response?.data || {};
      const firstErrorVal = Object.values(errorData)[0];
      let genError = '';
      if (Array.isArray(firstErrorVal)) genError = firstErrorVal[0];
      else if (typeof firstErrorVal === 'string') genError = firstErrorVal;

      const errorMessage =
        errorData.detail ||
        genError ||
        error?.message ||
        'Registration failed. Please try again.';

      setGlobalError(errorMessage);
      Alert.alert('Registration Error', errorMessage);
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <MaterialIcons name="security" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join RiskGRC — AI-Powered GRC</Text>
        </View>

        <View style={styles.formContainer}>
          {/* Email */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Email Address *</Text>
            <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
              <MaterialIcons name="email" size={18} color={COLORS.muted} />
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                editable={!isLoading}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor={COLORS.muted}
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Phone */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="phone" size={18} color={COLORS.muted} />
              <TextInput
                style={styles.input}
                placeholder="+1 234 567 8900"
                value={phone}
                onChangeText={setPhone}
                editable={!isLoading}
                keyboardType="phone-pad"
                placeholderTextColor={COLORS.muted}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Password *</Text>
            <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
              <MaterialIcons name="lock" size={18} color={COLORS.muted} />
              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors({ ...errors, password: '' });
                }}
                editable={!isLoading}
                placeholderTextColor={COLORS.muted}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <MaterialIcons
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={18}
                  color={COLORS.muted}
                />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Confirm Password *</Text>
            <View style={[styles.inputWrapper, errors.passwordConfirm && styles.inputError]}>
              <MaterialIcons name="lock-outline" size={18} color={COLORS.muted} />
              <TextInput
                style={styles.input}
                placeholder="Repeat password"
                secureTextEntry
                value={passwordConfirm}
                onChangeText={(text) => {
                  setPasswordConfirm(text);
                  if (errors.passwordConfirm) setErrors({ ...errors, passwordConfirm: '' });
                }}
                editable={!isLoading}
                placeholderTextColor={COLORS.muted}
              />
            </View>
            {errors.passwordConfirm && (
              <Text style={styles.errorText}>{errors.passwordConfirm}</Text>
            )}
          </View>

          {/* Sector */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Sector</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.sectorContainer}>
                {SECTORS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.sectorPill, sector === s && styles.sectorPillActive]}
                    onPress={() => setSector(s)}
                  >
                    <Text style={[styles.sectorText, sector === s && styles.sectorTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Global Error Notice */}
          {globalError ? (
            <View style={{ backgroundColor: '#fee2e2', padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <Text style={{ color: COLORS.danger, fontSize: 14, textAlign: 'center' }}>
                {globalError}
              </Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <MaterialIcons name="person-add" size={18} color="#fff" />
              <Text style={styles.buttonText}>Create Account</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.navigate('Login')}
          disabled={isLoading}
        >
          <Text style={styles.link}>
            Already have an account? <Text style={styles.linkBold}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  scrollContainer: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 28 },
  logoContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.dark, marginBottom: 4 },
  subtitle: { fontSize: 13, color: COLORS.muted },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  fieldContainer: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, color: COLORS.dark },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.light,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    gap: 8,
  },
  inputError: { borderColor: COLORS.danger },
  input: { flex: 1, fontSize: 14, color: COLORS.dark },
  errorText: { marginTop: 4, fontSize: 12, color: COLORS.danger },
  sectorContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sectorPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.muted,
    backgroundColor: '#fff',
  },
  sectorPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sectorText: { fontSize: 13, color: COLORS.muted, fontWeight: '500' },
  sectorTextActive: { color: '#fff' },
  button: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    gap: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  loginLink: { alignItems: 'center' },
  link: { textAlign: 'center', color: COLORS.muted, fontSize: 14 },
  linkBold: { color: COLORS.primary, fontWeight: '700' },
});

export default RegisterScreen;