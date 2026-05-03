import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import COLORS from '../constants/colors';

const KRI_FIELDS = [
    {
        key: 'mfa_percentage',
        label: 'MFA Coverage',
        unit: '%',
        hint: '0–100%',
        icon: 'security',
        min: 0,
        max: 100,
    },
    {
        key: 'patch_delay_days',
        label: 'Patch Delay',
        unit: 'days',
        hint: 'Average days to patch',
        icon: 'update',
        min: 0,
        max: 365,
    },
    {
        key: 'encryption_percentage',
        label: 'Data Encryption',
        unit: '%',
        hint: '0–100%',
        icon: 'lock',
        min: 0,
        max: 100,
    },
    {
        key: 'failed_login_rate',
        label: 'Failed Login Rate',
        unit: '%',
        hint: 'Daily failed logins %',
        icon: 'block',
        min: 0,
        max: 100,
    },
    {
        key: 'privileged_accounts',
        label: 'Privileged Accounts',
        unit: '#',
        hint: 'Number of admin accounts',
        icon: 'manage-accounts',
        min: 0,
        max: 9999,
    },
    {
        key: 'incident_response_time',
        label: 'Incident Response Time',
        unit: 'hrs',
        hint: 'Average response time',
        icon: 'timer',
        min: 0,
        max: 1000,
    },
];

export default function NewAssessmentScreen({ navigation }) {
    const [activeTab, setActiveTab] = useState('manual'); // 'manual' | 'upload'
    const [kris, setKris] = useState({
        mfa_percentage: '',
        patch_delay_days: '',
        encryption_percentage: '',
        failed_login_rate: '',
        privileged_accounts: '',
        incident_response_time: '',
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    const updateKri = (key, value) => {
        setKris((prev) => ({ ...prev, [key]: value }));
        if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
    };

    const validate = () => {
        const newErrors = {};
        KRI_FIELDS.forEach(({ key, label, min, max }) => {
            const val = parseFloat(kris[key]);
            if (kris[key] === '' || kris[key] === undefined) {
                newErrors[key] = `${label} is required`;
            } else if (isNaN(val)) {
                newErrors[key] = `${label} must be a number`;
            } else if (val < min || val > max) {
                newErrors[key] = `Must be between ${min} and ${max}`;
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setIsLoading(true);
        try {
            const token = await AsyncStorage.getItem('access_token');
            const kriData = {};
            KRI_FIELDS.forEach(({ key }) => {
                kriData[key] = parseFloat(kris[key]);
            });

            if (token === 'demo_access_token') {
                // Mock result
                const mockResult = {
                    id: Date.now(),
                    organization_name: 'Demo Org',
                    risk_score: 55.5,
                    risk_level: 'Moderate',
                    input_mode: 'manual',
                    created_at: new Date().toISOString(),
                    kri_data: kriData,
                };
                Alert.alert('Assessment Complete', 'Risk score calculated: 55.5 (Moderate)', [
                    {
                        text: 'View Details',
                        onPress: () => navigation.navigate('AssessmentDetail', { assessment: mockResult }),
                    },
                    { text: 'Back to Dashboard', onPress: () => navigation.goBack() },
                ]);
                return;
            }

            const response = await api.post(
                `/grc/assessments/`,
                { input_mode: 'manual', kri_data: kriData }
            );

            Alert.alert('Assessment Complete', `Risk score: ${response.data.risk_score?.toFixed(1) || 'N/A'}`, [
                {
                    text: 'View Details',
                    onPress: () => navigation.navigate('AssessmentDetail', { assessment: response.data }),
                },
                { text: 'Back', onPress: () => navigation.goBack() },
            ]);
        } catch (error) {
            Alert.alert('Error', error?.response?.data?.detail || 'Assessment failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            {/* Tabs */}
            <View style={styles.tabRow}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'manual' && styles.tabActive]}
                    onPress={() => setActiveTab('manual')}
                >
                    <MaterialIcons name="edit-note" size={18} color={activeTab === 'manual' ? COLORS.primary : COLORS.muted} />
                    <Text style={[styles.tabText, activeTab === 'manual' && styles.tabTextActive]}>
                        Manual KRI Input
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'upload' && styles.tabActive]}
                    onPress={() => setActiveTab('upload')}
                >
                    <MaterialIcons name="upload-file" size={18} color={activeTab === 'upload' ? COLORS.primary : COLORS.muted} />
                    <Text style={[styles.tabText, activeTab === 'upload' && styles.tabTextActive]}>
                        Upload Logs
                    </Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'manual' ? (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Text style={styles.sectionDesc}>
                        Enter your Key Risk Indicators (KRIs) to calculate your cybersecurity risk score.
                    </Text>

                    {KRI_FIELDS.map((field) => (
                        <View key={field.key} style={styles.fieldContainer}>
                            <View style={styles.fieldLabel}>
                                <MaterialIcons name={field.icon} size={16} color={COLORS.primary} />
                                <Text style={styles.label}>{field.label}</Text>
                                <Text style={styles.unit}>({field.unit})</Text>
                            </View>
                            <View style={[styles.inputWrapper, errors[field.key] && styles.inputError]}>
                                <TextInput
                                    style={styles.input}
                                    placeholder={field.hint}
                                    value={kris[field.key]}
                                    onChangeText={(val) => updateKri(field.key, val)}
                                    keyboardType="decimal-pad"
                                    placeholderTextColor={COLORS.muted}
                                />
                            </View>
                            {errors[field.key] && (
                                <Text style={styles.errorText}>{errors[field.key]}</Text>
                            )}
                        </View>
                    ))}

                    <TouchableOpacity
                        style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <MaterialIcons name="calculate" size={20} color="#fff" />
                                <Text style={styles.submitBtnText}>Calculate Risk Score</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.uploadArea}>
                        <MaterialIcons name="cloud-upload" size={64} color={COLORS.primary} />
                        <Text style={styles.uploadTitle}>Upload Log Files</Text>
                        <Text style={styles.uploadDesc}>
                            Upload CSV or JSON log files for automated KRI extraction and risk analysis.
                        </Text>
                        <View style={styles.uploadFormats}>
                            <View style={styles.formatBadge}>
                                <Text style={styles.formatText}>CSV</Text>
                            </View>
                            <View style={styles.formatBadge}>
                                <Text style={styles.formatText}>JSON</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.uploadBtn}>
                            <MaterialIcons name="attach-file" size={18} color="#fff" />
                            <Text style={styles.uploadBtnText}>Choose File</Text>
                        </TouchableOpacity>
                        <Text style={styles.uploadNote}>
                            Max file size: 10MB
                        </Text>
                    </View>

                    <View style={styles.uploadInfoCard}>
                        <Text style={styles.uploadInfoTitle}>📋 Supported Log Formats</Text>
                        <Text style={styles.uploadInfoText}>
                            • SIEM logs (Splunk, QRadar, Elastic)
                        </Text>
                        <Text style={styles.uploadInfoText}>
                            • Firewall/IDS/IPS logs
                        </Text>
                        <Text style={styles.uploadInfoText}>
                            • Windows Event Logs (CSV export)
                        </Text>
                        <Text style={styles.uploadInfoText}>
                            • Custom KRI data in JSON format
                        </Text>
                    </View>

                    <View style={styles.comingSoonBanner}>
                        <MaterialIcons name="schedule" size={16} color={COLORS.warning} />
                        <Text style={styles.comingSoonText}>
                            File upload feature is coming soon. Use Manual KRI Input for now.
                        </Text>
                    </View>
                </ScrollView>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.light },
    tabRow: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.light,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 6,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: COLORS.primary,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.muted,
    },
    tabTextActive: {
        color: COLORS.primary,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    sectionDesc: {
        fontSize: 13,
        color: COLORS.muted,
        marginBottom: 16,
        lineHeight: 18,
    },
    fieldContainer: {
        marginBottom: 14,
    },
    fieldLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.dark,
    },
    unit: {
        fontSize: 12,
        color: COLORS.muted,
    },
    inputWrapper: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: COLORS.light,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    inputError: {
        borderColor: COLORS.danger,
    },
    input: {
        fontSize: 15,
        color: COLORS.dark,
    },
    errorText: {
        fontSize: 12,
        color: COLORS.danger,
        marginTop: 4,
    },
    submitBtn: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 8,
    },
    submitBtnDisabled: { opacity: 0.6 },
    submitBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    uploadArea: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(37, 99, 235, 0.2)',
        borderStyle: 'dashed',
        marginBottom: 16,
        gap: 12,
    },
    uploadTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.dark,
    },
    uploadDesc: {
        fontSize: 13,
        color: COLORS.muted,
        textAlign: 'center',
        lineHeight: 18,
    },
    uploadFormats: {
        flexDirection: 'row',
        gap: 8,
    },
    formatBadge: {
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
    },
    formatText: {
        color: COLORS.primary,
        fontWeight: '700',
        fontSize: 12,
    },
    uploadBtn: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 10,
        gap: 8,
        alignItems: 'center',
    },
    uploadBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    uploadNote: {
        fontSize: 11,
        color: COLORS.muted,
    },
    uploadInfoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        gap: 6,
    },
    uploadInfoTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.dark,
        marginBottom: 8,
    },
    uploadInfoText: {
        fontSize: 13,
        color: COLORS.muted,
    },
    comingSoonBanner: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'flex-start',
        backgroundColor: '#fef3c7',
        borderRadius: 10,
        padding: 12,
    },
    comingSoonText: {
        flex: 1,
        fontSize: 12,
        color: '#92400e',
        lineHeight: 18,
    },
});
