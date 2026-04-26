import React, { useEffect, useState } from 'react';
import COLORS from '../constants/colors';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  TextInput,
  Modal,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const SettingsScreen = ({ navigation }) => {
  const [userInfo, setUserInfo] = useState(null);
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    autoSync: true,
  });
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiUrl, setApiUrl] = useState('http://localhost:8000/api');
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    loadSettings();
    loadUserInfo();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem('appSettings');
      if (stored) {
        setSettings(JSON.parse(stored));
      }
      const url = await AsyncStorage.getItem('apiUrl');
      if (url) {
        setApiUrl(url);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadUserInfo = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const apiUrl = await AsyncStorage.getItem('apiUrl') || 'http://localhost:8000/api';

      const response = await axios.get(`${apiUrl}/accounts/user/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserInfo(response.data);
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  const handleSettingChange = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await AsyncStorage.setItem('appSettings', JSON.stringify(newSettings));
  };

  const handleApiUrlChange = async () => {
    await AsyncStorage.setItem('apiUrl', apiUrl);
    setShowApiModal(false);
    Alert.alert('Success', 'API URL updated successfully');
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', onPress: () => {}, style: 'cancel' },
      {
        text: 'Logout',
        onPress: async () => {
          try {
            await AsyncStorage.removeItem('access_token');
            await AsyncStorage.removeItem('refresh_token');
            navigation.reset({
              index: 0,
              routes: [{ name: 'LoginScreen' }],
            });
          } catch (error) {
            Alert.alert('Error', 'Failed to logout');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const handleClearCache = async () => {
    Alert.alert('Clear Cache', 'Are you sure? This will delete all cached data.', [
      { text: 'Cancel', onPress: () => {}, style: 'cancel' },
      {
        text: 'Clear',
        onPress: async () => {
          try {
            // Clear specific cache items while keeping auth
            const keys = await AsyncStorage.getAllKeys();
            const keysToDelete = keys.filter(
              (key) =>
                !['access_token', 'refresh_token', 'appSettings', 'apiUrl'].includes(key)
            );
            await AsyncStorage.multiRemove(keysToDelete);
            Alert.alert('Success', 'Cache cleared successfully');
          } catch (error) {
            Alert.alert('Error', 'Failed to clear cache');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* User Info Section */}
        {userInfo && (
          <View style={styles.section}>
            <View style={styles.userCard}>
              <View style={styles.userAvatar}>
                <MaterialIcons name="person" size={32} color={COLORS.primary} />
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{userInfo.username}</Text>
                <Text style={styles.userEmail}>{userInfo.email}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingLabel}>
              <MaterialIcons name="notifications" size={20} color={COLORS.primary} />
              <Text style={styles.settingText}>Push Notifications</Text>
            </View>
            <Switch
              value={settings.notifications}
              onValueChange={(value) => handleSettingChange('notifications', value)}
              trackColor={{ false: COLORS.light, true: 'rgba(37, 99, 235, 0.3)' }}
              thumbColor={settings.notifications ? COLORS.primary : COLORS.muted}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLabel}>
              <MaterialIcons name="dark-mode" size={20} color={COLORS.primary} />
              <Text style={styles.settingText}>Dark Mode</Text>
            </View>
            <Switch
              value={settings.darkMode}
              onValueChange={(value) => handleSettingChange('darkMode', value)}
              trackColor={{ false: COLORS.light, true: 'rgba(37, 99, 235, 0.3)' }}
              thumbColor={settings.darkMode ? COLORS.primary : COLORS.muted}
              disabled={true}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLabel}>
              <MaterialIcons name="sync" size={20} color={COLORS.primary} />
              <Text style={styles.settingText}>Auto-Sync Data</Text>
            </View>
            <Switch
              value={settings.autoSync}
              onValueChange={(value) => handleSettingChange('autoSync', value)}
              trackColor={{ false: COLORS.light, true: 'rgba(37, 99, 235, 0.3)' }}
              thumbColor={settings.autoSync ? COLORS.primary : COLORS.muted}
            />
          </View>
        </View>

        {/* API Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Configuration</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setShowApiModal(true)}
          >
            <View style={styles.settingLabel}>
              <MaterialIcons name="cloud" size={20} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingText}>API Server</Text>
                <Text style={styles.settingDescription}>{apiUrl}</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={COLORS.muted} />
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setShowAbout(!showAbout)}
          >
            <View style={styles.settingLabel}>
              <MaterialIcons name="info" size={20} color={COLORS.primary} />
              <Text style={styles.settingText}>About RiskGRC</Text>
            </View>
            <MaterialIcons
              name={showAbout ? 'expand-less' : 'expand-more'}
              size={20}
              color={COLORS.muted}
            />
          </TouchableOpacity>

          {showAbout && (
            <View style={styles.aboutContent}>
              <Text style={styles.aboutTitle}>RiskGRC</Text>
              <Text style={styles.aboutVersion}>Version 1.0.0</Text>
              <Text style={styles.aboutDescription}>
                AI-Powered Cyber Governance, Risk & Compliance Platform
              </Text>
              <Text style={styles.aboutText}>
                RiskGRC is a mobile-first GRC platform designed for cybersecurity professionals
                and organizations. It features sector-specific regulatory compliance mapping,
                AI-powered risk assessment, and real-time threat scenario analysis.
              </Text>
              <Text style={styles.copyright}>© 2026 RiskGRC. All rights reserved.</Text>
            </View>
          )}
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Privacy</Text>

          <TouchableOpacity
            style={[styles.settingItem, styles.dangerItem]}
            onPress={handleClearCache}
          >
            <View style={styles.settingLabel}>
              <MaterialIcons name="delete-sweep" size={20} color={COLORS.danger} />
              <Text style={[styles.settingText, { color: COLORS.danger }]}>
                Clear Cache
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, styles.dangerItem]}
            onPress={handleLogout}
          >
            <View style={styles.settingLabel}>
              <MaterialIcons name="logout" size={20} color={COLORS.danger} />
              <Text style={[styles.settingText, { color: COLORS.danger }]}>
                Logout
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* API URL Modal */}
      <Modal visible={showApiModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>API Server URL</Text>
              <TouchableOpacity onPress={() => setShowApiModal(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.dark} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.label}>Server URL</Text>
              <TextInput
                style={styles.input}
                placeholder="http://localhost:8000/api"
                value={apiUrl}
                onChangeText={setApiUrl}
                placeholderTextColor={COLORS.muted}
              />

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleApiUrlChange}
              >
                <Text style={styles.submitButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  section: {
    backgroundColor: '#fff',
    marginVertical: 8,
    borderTopWidth: 8,
    borderTopColor: COLORS.light,
    borderBottomWidth: 8,
    borderBottomColor: COLORS.light,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
    paddingHorizontal: 16,
    paddingVertical: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userCard: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 4,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light,
  },
  dangerItem: {
    borderBottomWidth: 1,
  },
  settingLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.dark,
  },
  settingDescription: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  aboutContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  aboutVersion: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  aboutDescription: {
    fontSize: 13,
    color: COLORS.dark,
    marginTop: 8,
    fontWeight: '600',
  },
  aboutText: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 8,
    lineHeight: 18,
  },
  copyright: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 12,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.light,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.dark,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default SettingsScreen;
