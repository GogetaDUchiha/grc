import React, { useState, useContext } from 'react';
import COLORS from '../constants/colors';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const LoginScreen = ({ navigation }) => {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

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
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateInputs()) return;
    setIsLoading(true);
    try {
      const response = await api.post(`/accounts/login/`, {
        email: email.trim(),
        password,
      });

      if (response.data?.tokens?.access) {
        await login(response.data.tokens.access, response.data.tokens.refresh);
        setPassword('');
        setEmail('');
      } else {
        Alert.alert('Error', 'Invalid response from server');
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        error?.message ||
        'Login failed. Please try again.';
      Alert.alert('Login Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      await AsyncStorage.setItem('apiUrl', 'http://localhost:8000/api');
      await login('demo_access_token', 'demo_refresh_token');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      overflowY: 'auto',
      overflowX: 'hidden',
      backgroundColor: COLORS.light,
      WebkitOverflowScrolling: 'touch',
    }}>
      <div style={{
        maxWidth: 500,
        margin: '0 auto',
        padding: '20px',
        paddingTop: '40px',
        paddingBottom: '60px',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}>
            <MaterialIcons name="security" size={48} color={COLORS.primary} />
          </div>
          <h1 style={{
            fontSize: 28,
            fontWeight: '700',
            color: COLORS.dark,
            marginBottom: 4,
            marginTop: 0,
          }}>RiskGRC</h1>
          <p style={{
            fontSize: 14,
            color: COLORS.muted,
            margin: 0,
          }}>AI-Powered GRC Platform</p>
        </div>

        {/* Form */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}>
          {/* Email Field */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              fontSize: 14,
              fontWeight: '600',
              color: COLORS.dark,
              marginBottom: 8,
              display: 'block',
            }}>Email Address</label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: errors.email ? COLORS.danger : '#e5e7eb',
              borderRadius: 10,
              padding: '12px',
              backgroundColor: '#fff',
              gap: 8,
            }}>
              <MaterialIcons name="email" size={20} color={COLORS.muted} />
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                disabled={isLoading}
                style={{
                  flex: 1,
                  fontSize: 15,
                  color: COLORS.dark,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                }}
              />
            </div>
            {errors.email && <p style={{
              fontSize: 12,
              color: COLORS.danger,
              marginTop: 4,
            }}>{errors.email}</p>}
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              fontSize: 14,
              fontWeight: '600',
              color: COLORS.dark,
              marginBottom: 8,
              display: 'block',
            }}>Password</label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: errors.password ? COLORS.danger : '#e5e7eb',
              borderRadius: 10,
              padding: '12px',
              backgroundColor: '#fff',
              gap: 8,
            }}>
              <MaterialIcons name="lock" size={20} color={COLORS.muted} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: '' });
                }}
                disabled={isLoading}
                style={{
                  flex: 1,
                  fontSize: 15,
                  color: COLORS.dark,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                }}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <MaterialIcons
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={20}
                  color={COLORS.muted}
                />
              </button>
            </div>
            {errors.password && <p style={{
              fontSize: 12,
              color: COLORS.danger,
              marginTop: 4,
            }}>{errors.password}</p>}
          </div>

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              backgroundColor: COLORS.primary,
              padding: '14px',
              borderRadius: 10,
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              marginTop: 8,
            }}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="login" size={20} color="#fff" />
                <span style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Sign In</span>
              </>
            )}
          </button>

          {/* Demo Button */}
          <button
            onClick={handleDemoLogin}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              backgroundColor: '#fff',
              border: `1px solid ${COLORS.primary}`,
              padding: '12px',
              borderRadius: 10,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginTop: 10,
            }}
          >
            <MaterialIcons name="play-circle-outline" size={18} color={COLORS.primary} />
            <span style={{ color: COLORS.primary, fontWeight: '600', fontSize: 14 }}>
              Try Demo (No Backend Needed)
            </span>
          </button>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            margin: '20px 0',
          }}>
            <div style={{ flex: 1, height: 1, backgroundColor: '#e5e7eb' }} />
            <span style={{ margin: '0 12px', color: COLORS.muted, fontSize: 12, fontWeight: '500' }}>or</span>
            <div style={{ flex: 1, height: 1, backgroundColor: '#e5e7eb' }} />
          </div>

          {/* Register Button - NOW VISIBLE */}
          <button
            onClick={() => navigation.navigate('Register')}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              backgroundColor: '#fff',
              border: `2px solid ${COLORS.primary}`,
              padding: '14px',
              borderRadius: 10,
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            <MaterialIcons name="person-add" size={18} color={COLORS.primary} />
            <span style={{ color: COLORS.primary, fontWeight: '700', fontSize: 16 }}>
              Create New Account
            </span>
          </button>
        </div>

        {/* Dev Info */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 12,
          borderLeft: `4px solid #f59e0b`,
          marginBottom: 20,
        }}>
          <p style={{
            fontSize: 12,
            fontWeight: '600',
            color: COLORS.dark,
            marginBottom: 4,
            marginTop: 0,
          }}>Demo Credentials:</p>
          <p style={{
            fontSize: 11,
            color: COLORS.muted,
            fontFamily: 'monospace',
            margin: 0,
          }}>Email: demo@example.com</p>
          <p style={{
            fontSize: 11,
            color: COLORS.muted,
            fontFamily: 'monospace',
            margin: 0,
          }}>Password: demo1234</p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;