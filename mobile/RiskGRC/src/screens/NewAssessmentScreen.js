import React, { useState, useEffect } from 'react';
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
import * as DocumentPicker from 'expo-document-picker';
import api, { ASSESSMENT_TIMEOUT } from '../services/api';
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

const KRI_NAME_TO_KEY = {
    'MFA Coverage': 'mfa_percentage',
    'Patch Delay': 'patch_delay_days',
    'Encryption Coverage': 'encryption_percentage',
    'Failed Login Rate': 'failed_login_rate',
    'Privileged Account Count': 'privileged_accounts',
    'Incident Response Time': 'incident_response_time',
};

const KRI_STORAGE_KEY = 'riskgrc_saved_kri';

const EMPTY_KRIS = {
    mfa_percentage: '',
    patch_delay_days: '',
    encryption_percentage: '',
    failed_login_rate: '',
    privileged_accounts: '',
    incident_response_time: '',
};

const applyExtractedKris = (records) => {
    const next = { ...EMPTY_KRIS };
    (records || []).forEach((rec) => {
        const key = KRI_NAME_TO_KEY[rec.kri_name];
        if (key && rec.raw_value != null) {
            next[key] = String(rec.raw_value);
        }
    });
    return next;
};

export default function NewAssessmentScreen({ navigation }) {
    const [activeTab, setActiveTab] = useState('manual'); // 'manual' | 'upload'
    const [kris, setKris] = useState({ ...EMPTY_KRIS });
    const [customFields, setCustomFields] = useState([]);
    const [organizations, setOrganizations] = useState([]);
    const [selectedOrg, setSelectedOrg] = useState(null);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchOrganizations();
        loadSavedKris();
    }, []);

    const loadSavedKris = async () => {
        try {
            const saved = await AsyncStorage.getItem(KRI_STORAGE_KEY);
            if (saved) {
                setKris({ ...EMPTY_KRIS, ...JSON.parse(saved) });
            }
        } catch (e) {
            console.log('Could not load saved KRIs:', e);
        }
    };

    const persistKris = async (nextKris) => {
        try {
            await AsyncStorage.setItem(KRI_STORAGE_KEY, JSON.stringify(nextKris));
        } catch (e) {
            console.log('Could not save KRIs:', e);
        }
    };

    const fetchOrganizations = async () => {
        try {
            const res = await api.get('/accounts/organizations/');
            setOrganizations(res.data);
            if (res.data.length > 0) setSelectedOrg(res.data[0].id);
        } catch (e) {
            console.log('Error fetching organizations:', e);
        }
    };

    const addCustomField = () => setCustomFields([...customFields, { key: '', value: '' }]);
    const updateCustomField = (idx, field, val) => {
        const updated = [...customFields];
        updated[idx][field] = val;
        setCustomFields(updated);
    };
    const removeCustomField = (idx) => {
        setCustomFields(customFields.filter((_, i) => i !== idx));
    };

    const updateKri = (key, value) => {
        setKris((prev) => {
            const next = { ...prev, [key]: value };
            persistKris(next);
            return next;
        });
        if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
    };

    const validateOptionalKri = () => {
        const newErrors = {};
        KRI_FIELDS.forEach(({ key, label, min, max }) => {
            if (kris[key] === '' || kris[key] === undefined) return;
            const val = parseFloat(kris[key]);
            if (isNaN(val)) {
                newErrors[key] = `${label} must be a number`;
            } else if (val < min || val > max) {
                newErrors[key] = `Must be between ${min} and ${max}`;
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const buildLogContent = (file) => {
        const parts = [];
        if (file.text?.trim()) parts.push(file.text.trim());
        if (file.data && Object.keys(file.data).length > 0) {
            parts.push(JSON.stringify(file.data, null, 2));
        }
        return parts.join('\n\n');
    };

    const buildKriData = () => {
        const kriData = {};
        KRI_FIELDS.forEach(({ key }) => {
            if (kris[key] !== '' && kris[key] !== undefined) {
                kriData[key] = parseFloat(kris[key]);
            }
        });
        customFields.forEach((field) => {
            if (field.key.trim() && field.value.trim()) {
                const parsed = parseFloat(field.value);
                kriData[field.key.trim()] = isNaN(parsed) ? field.value : parsed;
            }
        });
        return kriData;
    };

    const goToResults = (assessment) => {
        navigation.replace('AssessmentDetail', { assessment });
    };

    const submitAssessment = async (logContent) => {
        if (!logContent || logContent.trim().length < 20) {
            Alert.alert('Input Required', 'Upload log files before running analysis.');
            return;
        }

        if (!validateOptionalKri()) return;

        if (!selectedOrg) {
            Alert.alert('Organization Required', 'Select an organization before running analysis.');
            return;
        }

        const kriData = buildKriData();
        setIsLoading(true);
        try {
            const payload = {
                input_mode: 'upload',
                organization: selectedOrg,
                text_report: logContent,
            };
            if (Object.keys(kriData).length > 0) {
                payload.kri_data = kriData;
            }

            const response = await api.post(`/grc/assessments/`, payload, {
                timeout: ASSESSMENT_TIMEOUT,
            });

            const assessment = response.data?.ai_output
                ? response.data
                : (await api.get(`/grc/assessments/${response.data.id}/`, {
                    timeout: ASSESSMENT_TIMEOUT,
                })).data;

            if (!assessment.ai_output) {
                Alert.alert('Error', 'Assessment could not complete. Please try again.');
                return;
            }

            const extractedKris = applyExtractedKris(assessment.kri_records);
            setKris(extractedKris);
            await persistKris(extractedKris);

            setUploadedFile(null);
            goToResults(assessment);
        } catch (error) {
            Alert.alert('Error', error?.response?.data?.detail || 'Assessment failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        Alert.alert('Input Required', 'Upload log files before running analysis.');
        setActiveTab('upload');
    };

    const handleFileUpload = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['text/csv', 'application/json', 'application/vnd.ms-excel', '*/*'],
                copyToCacheDirectory: true,
                multiple: true
            });

            if (result.canceled) return;

            setIsLoading(true);
            let combinedText = '';
            let combinedData = {};
            let isTextReport = false;
            let fileCount = result.assets.length;

            for (const fileObj of result.assets) {
                let fileText = '';
                if (Platform.OS === 'web' && fileObj.file) {
                    fileText = await fileObj.file.text();
                } else {
                    const res = await fetch(fileObj.uri);
                    fileText = await res.text();
                }

                const isJson = fileObj.name.toLowerCase().endsWith('.json') || fileObj.mimeType === 'application/json';
                const isTxt = fileObj.name.toLowerCase().endsWith('.txt') || fileObj.mimeType === 'text/plain' || fileObj.name.toLowerCase().endsWith('.pdf') || fileObj.name.toLowerCase().endsWith('.docx');

                if (isJson) {
                    try {
                        const parsed = JSON.parse(fileText);
                        combinedData = { ...combinedData, ...parsed };
                    } catch (e) {
                        combinedText += `\n[FILE: ${fileObj.name}]\n${fileText}\n`;
                        isTextReport = true;
                    }
                } else if (isTxt) {
                    combinedText += `\n[FILE: ${fileObj.name}]\n${fileText}\n`;
                    isTextReport = true;
                } else {
                    combinedText += `\n[FILE: ${fileObj.name}]\n${fileText}\n`;
                    isTextReport = true;
                }
            }

            setUploadedFile({
                name: fileCount > 1 ? `${fileCount} Files Selected` : result.assets[0].name,
                data: combinedData,
                text: combinedText,
                isTextReport: isTextReport || combinedText.length > 0
            });
        } catch (error) {
            console.log(error);
            Alert.alert('Upload Error', error?.message || 'Failed to process files. Ensure they are valid formats.');
        } finally {
            setIsLoading(false);
        }
    };

    const submitUploadedFile = async () => {
        if (!uploadedFile) {
            Alert.alert('Input Required', 'Choose a log file before running analysis.');
            return;
        }
        await submitAssessment(buildLogContent(uploadedFile));
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            {/* Organization Selector */}
            <View style={styles.orgSelector}>
                <Text style={styles.orgHeader}>Select Organization</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.orgScroll}>
                    {organizations.map(org => (
                        <TouchableOpacity
                            key={org.id}
                            style={[styles.orgChip, selectedOrg === org.id && styles.orgChipActive]}
                            onPress={() => setSelectedOrg(org.id)}
                        >
                            <MaterialIcons name="business" size={16} color={selectedOrg === org.id ? '#fff' : COLORS.muted} />
                            <Text style={[styles.orgChipText, selectedOrg === org.id && styles.orgChipTextActive]}>{org.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

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

                    {/* Custom Fields Section */}
                    {customFields.length > 0 && (
                        <View style={styles.customFieldsSection}>
                            <Text style={styles.sectionTitle}>Custom KRI Fields</Text>
                            {customFields.map((field, idx) => (
                                <View key={`custom-${idx}`} style={styles.customFieldRow}>
                                    <TextInput
                                        style={[styles.input, styles.customKeyInput]}
                                        placeholder="Field Name"
                                        value={field.key}
                                        onChangeText={(val) => updateCustomField(idx, 'key', val)}
                                    />
                                    <TextInput
                                        style={[styles.input, styles.customValueInput]}
                                        placeholder="Value"
                                        value={field.value}
                                        onChangeText={(val) => updateCustomField(idx, 'value', val)}
                                    />
                                    <TouchableOpacity onPress={() => removeCustomField(idx)} style={styles.removeBtn}>
                                        <MaterialIcons name="close" size={20} color={COLORS.danger} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}

                    <TouchableOpacity style={styles.addCustomBtn} onPress={addCustomField}>
                        <MaterialIcons name="add-circle-outline" size={18} color={COLORS.primary} />
                        <Text style={styles.addCustomText}>Add Custom Field</Text>
                    </TouchableOpacity>

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
                                <Text style={styles.submitBtnText}>Run Risk & Compliance Analysis</Text>
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
                        <TouchableOpacity
                            style={[styles.uploadBtn, isLoading && styles.submitBtnDisabled]}
                            onPress={handleFileUpload}
                            disabled={isLoading}
                        >
                            {isLoading && !uploadedFile ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <MaterialIcons name="attach-file" size={18} color="#fff" />
                                    <Text style={styles.uploadBtnText}>Choose File</Text>
                                </>
                            )}
                        </TouchableOpacity>
                        <Text style={styles.uploadNote}>
                            Max file size: 10MB
                        </Text>
                    </View>

                    {uploadedFile && (
                        <View style={styles.previewCard}>
                            <View style={styles.previewHeader}>
                                <Text style={styles.previewTitle}>File Preview: {uploadedFile.name}</Text>
                                <TouchableOpacity onPress={() => setUploadedFile(null)}>
                                    <MaterialIcons name="close" size={20} color={COLORS.danger} />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.previewDataBox}>
                                <Text style={styles.previewDataText}>
                                    {uploadedFile.isTextReport
                                        ? `[SECURITY REPORT DETECTED]\nExtracting insights from unstructured text...\n\n${uploadedFile.text.substring(0, 300)}...`
                                        : JSON.stringify(uploadedFile.data, null, 2)}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.submitBtn, isLoading && styles.submitBtnDisabled, { marginTop: 16 }]}
                                onPress={submitUploadedFile}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <MaterialIcons name="calculate" size={20} color="#fff" />
                                        <Text style={styles.submitBtnText}>Run Risk & Compliance Analysis</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}

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
    customFieldsSection: {
        marginTop: 10,
        marginBottom: 10,
        borderTopWidth: 1,
        borderTopColor: COLORS.light,
        paddingTop: 16,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.dark,
        marginBottom: 12,
    },
    customFieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    customKeyInput: {
        flex: 1,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: COLORS.light,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    customValueInput: {
        flex: 1,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: COLORS.light,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    removeBtn: {
        padding: 4,
    },
    addCustomBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 6,
        borderWidth: 1,
        borderColor: COLORS.primary,
        borderRadius: 10,
        marginBottom: 20,
        backgroundColor: 'rgba(37, 99, 235, 0.05)',
    },
    addCustomText: {
        color: COLORS.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    previewCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    previewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    previewTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.dark,
    },
    previewDataBox: {
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        padding: 12,
        maxHeight: 200,
    },
    previewDataText: {
        fontSize: 12,
        fontFamily: 'monospace',
        color: COLORS.dark,
    },
    orgSelector: {
        backgroundColor: '#fff',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.light,
    },
    orgHeader: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.muted,
        textTransform: 'uppercase',
        marginBottom: 10,
        letterSpacing: 0.5,
    },
    orgScroll: {
        gap: 8,
    },
    orgChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    orgChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    orgChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.muted,
    },
    orgChipTextActive: {
        color: '#fff',
    },
});
