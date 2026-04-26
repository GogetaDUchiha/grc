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
  Modal,
  TextInput,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { COLORS } from '../../App';
import { Picker } from '@react-native-picker/picker';

const OrganizationsScreen = ({ navigation }) => {
  const [organizations, setOrganizations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sector: 'Fintech',
    description: '',
  });

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const apiUrl = await AsyncStorage.getItem('apiUrl') || 'http://localhost:8000/api';

      const response = await axios.get(`${apiUrl}/accounts/organizations/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrganizations(response.data);
    } catch (error) {
      console.error('Error loading organizations:', error);
      Alert.alert('Error', 'Failed to load organizations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrganization = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Organization name is required');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('access_token');
      const apiUrl = await AsyncStorage.getItem('apiUrl') || 'http://localhost:8000/api';

      const response = await axios.post(
        `${apiUrl}/accounts/organizations/`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setOrganizations([...organizations, response.data]);
      setFormData({ name: '', sector: 'Fintech', description: '' });
      setShowCreateModal(false);
      Alert.alert('Success', 'Organization created successfully');
    } catch (error) {
      console.error('Error creating organization:', error);
      Alert.alert('Error', 'Failed to create organization');
    }
  };

  const renderOrgItem = ({ item }) => (
    <View style={styles.orgCard}>
      <View style={styles.orgHeader}>
        <View style={styles.orgIcon}>
          <MaterialIcons name="business" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.orgInfo}>
          <Text style={styles.orgName}>{item.name}</Text>
          <Text style={styles.orgSector}>{item.sector_display}</Text>
        </View>
      </View>
      {item.description && (
        <Text style={styles.orgDescription}>{item.description}</Text>
      )}
      <View style={styles.orgActions}>
        <TouchableOpacity style={styles.actionButton}>
          <MaterialIcons name="settings" size={18} color={COLORS.primary} />
          <Text style={styles.actionText}>Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <MaterialIcons name="group" size={18} color={COLORS.primary} />
          <Text style={styles.actionText}>Members</Text>
        </TouchableOpacity>
      </View>
    </View>
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
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Organizations</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowCreateModal(true)}
          >
            <MaterialIcons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {organizations.length > 0 ? (
          <FlatList
            data={organizations}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderOrgItem}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="business" size={48} color={COLORS.muted} />
            <Text style={styles.emptyText}>No organizations yet</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.createButtonText}>Create Organization</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Organization</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.dark} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Organization Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter organization name"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholderTextColor={COLORS.muted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Sector</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.sector}
                    onValueChange={(value) => setFormData({ ...formData, sector: value })}
                  >
                    <Picker.Item label="Fintech" value="Fintech" />
                    <Picker.Item label="Banking" value="Banking" />
                    <Picker.Item label="Telecom" value="Telecom" />
                    <Picker.Item label="Government" value="Government" />
                    <Picker.Item label="IT / Corporate" value="IT" />
                  </Picker>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter description"
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={COLORS.muted}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleCreateOrganization}
              >
                <Text style={styles.submitButtonText}>Create Organization</Text>
              </TouchableOpacity>
            </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  orgCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  orgHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  orgIcon: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orgInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  orgName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  orgSector: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  orgDescription: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 12,
  },
  orgActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.light,
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primary,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
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
  formGroup: {
    marginBottom: 16,
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
  },
  textArea: {
    minHeight: 100,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.light,
    borderRadius: 8,
    overflow: 'hidden',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default OrganizationsScreen;
