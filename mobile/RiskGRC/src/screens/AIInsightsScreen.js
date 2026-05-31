import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../services/api';
import COLORS from '../constants/colors';

const MOCK_INSIGHTS = null;

const PRIORITY_COLORS = {
    Critical: COLORS.danger,
    High: '#ff8c00',
    Medium: COLORS.warning,
    Low: COLORS.success,
};

export default function AIInsightsScreen({ route }) {
    const { assessment } = route.params || {};
    const [isLoading, setIsLoading] = useState(false);
    const [insights, setInsights] = useState(null);
    const [activeSection, setActiveSection] = useState('scenario');

    useEffect(() => {
        loadInsights();
    }, [assessment?.id]);

    const loadInsights = async () => {
        if (!assessment?.id) return;

        setIsLoading(true);
        try {
            const res = await api.get(`/grc/assessments/${assessment.id}/`);
            const fullAss = res.data;

            if (fullAss.ai_output) {
                setInsights({
                    threat_scenario: fullAss.ai_output.risk_explanation,
                    compliance_proof: fullAss.ai_output.compliance_proof,
                    exploitation_paths: (fullAss.ai_output.threat_scenarios || []).map((t, i) => ({
                        step: i + 1,
                        title: t.split(':')[0] || 'Threat',
                        desc: t.split(':').slice(1).join(':') || t
                    })),
                    remediation_steps: (fullAss.ai_output.remediation_steps || []).map(r => ({
                        priority: r.includes('Critical') ? 'Critical' : r.includes('High') ? 'High' : 'Medium',
                        title: r.split(':')[0] || 'Action',
                        desc: r.split(':').slice(1).join(':') || r,
                        effort: 'Medium',
                        impact: 'High'
                    }))
                });
            }
        } catch (error) {
            console.error('Error loading AI insights:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingTitle}>Analyzing with AI...</Text>
                <Text style={styles.loadingSubtext}>Processing threat intelligence</Text>
            </View>
        );
    }

    if (!insights) {
        return (
            <View style={styles.emptyContainer}>
                <MaterialIcons name="psychology" size={48} color={COLORS.muted} />
                <Text style={styles.emptyTitle}>No AI Insights Available</Text>
                <Text style={styles.emptySubtext}>
                    Complete an assessment first to receive AI-powered threat analysis.
                </Text>
            </View>
        );
    }

    const tabs = [
        { key: 'scenario', label: 'Threat', icon: 'warning' },
        { key: 'compliance', label: 'Audit Proof', icon: 'verified-user' },
        { key: 'paths', label: 'Attack Path', icon: 'alt-route' },
        { key: 'remediation', label: 'Fix It', icon: 'build' },
    ];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <MaterialIcons name="auto-awesome" size={24} color="#fff" />
                </View>
                <View>
                    <Text style={styles.headerTitle}>AI Threat Analysis</Text>
                    <Text style={styles.headerSubtitle}>
                        {assessment ? assessment.organization_name : 'Demo Analysis'} • Powered by AI
                    </Text>
                </View>
            </View>

            {/* Tab Bar */}
            <View style={styles.tabBar}>
                {tabs.map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tabItem, activeSection === tab.key && styles.tabItemActive]}
                        onPress={() => setActiveSection(tab.key)}
                    >
                        <MaterialIcons
                            name={tab.icon}
                            size={16}
                            color={activeSection === tab.key ? COLORS.primary : COLORS.muted}
                        />
                        <Text style={[styles.tabLabel, activeSection === tab.key && styles.tabLabelActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Compliance Proof */}
                {activeSection === 'compliance' && (
                    <View style={styles.section}>
                        <View style={styles.scenarioCard}>
                            <View style={[styles.alertBanner, { borderLeftColor: COLORS.success }]}>
                                <MaterialIcons name="fact-check" size={20} color={COLORS.primary} />
                                <Text style={[styles.alertText, { color: COLORS.primary }]}>Proof of Evidence Statement</Text>
                            </View>
                            <Text style={styles.scenarioText}>
                                {insights.compliance_proof || "Detailed compliance evidence is being analyzed for this assessment..."}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Threat Scenario */}
                {activeSection === 'scenario' && (
                    <View style={styles.section}>
                        <View style={styles.scenarioCard}>
                            <View style={styles.alertBanner}>
                                <MaterialIcons name="gpp-maybe" size={20} color={COLORS.danger} />
                                <Text style={styles.alertText}>Threat Scenario Detected</Text>
                            </View>
                            <Text style={styles.scenarioText}>{insights.threat_scenario}</Text>
                        </View>

                        <View style={styles.quickStats}>
                            <Text style={styles.quickStatsTitle}>Risk Summary</Text>
                            <View style={styles.statsRow}>
                                <View style={styles.statCard}>
                                    <Text style={[styles.statValue, { color: COLORS.danger }]}>
                                        {((assessment?.likelihood_score || 0) * 10).toFixed(1)}
                                    </Text>
                                    <Text style={styles.statLabel}>Likelihood</Text>
                                </View>
                                <View style={styles.statCard}>
                                    <Text style={[styles.statValue, { color: COLORS.warning }]}>
                                        {((assessment?.impact_score || 0) * 10).toFixed(1)}
                                    </Text>
                                    <Text style={styles.statLabel}>Impact</Text>
                                </View>
                                <View style={styles.statCard}>
                                    <Text style={[styles.statValue, { color: COLORS.success }]}>
                                        {assessment?.compliance_confidence || 0}%
                                    </Text>
                                    <Text style={styles.statLabel}>Confidence</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                {/* Exploitation Paths */}
                {activeSection === 'paths' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionDesc}>
                            Simulated attack path based on your current security posture:
                        </Text>
                        {insights.exploitation_paths.map((path) => (
                            <View key={path.step} style={styles.pathCard}>
                                <View style={styles.pathStep}>
                                    <Text style={styles.pathStepNum}>{path.step}</Text>
                                </View>
                                <View style={styles.pathContent}>
                                    <Text style={styles.pathTitle}>{path.title}</Text>
                                    <Text style={styles.pathDesc}>{path.desc}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Remediation Steps */}
                {activeSection === 'remediation' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionDesc}>
                            Prioritized remediation steps to reduce your risk score:
                        </Text>
                        {insights.remediation_steps.map((step, i) => (
                            <View key={i} style={styles.remCard}>
                                <View style={styles.remHeader}>
                                    <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[step.priority] }]}>
                                        <Text style={styles.priorityText}>{step.priority}</Text>
                                    </View>
                                    <View style={styles.effortRow}>
                                        <Text style={styles.effortLabel}>Effort: {step.effort}</Text>
                                        <Text style={styles.effortLabel}>Impact: {step.impact}</Text>
                                    </View>
                                </View>
                                <Text style={styles.remTitle}>{step.title}</Text>
                                <Text style={styles.remDesc}>{step.desc}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.light },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        backgroundColor: COLORS.light,
    },
    loadingTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
    loadingSubtext: { fontSize: 13, color: COLORS.muted },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        padding: 24,
    },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
    emptySubtext: { fontSize: 13, color: COLORS.muted, textAlign: 'center' },
    header: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerIcon: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
    headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.light,
    },
    tabItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 6,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabItemActive: { borderBottomColor: COLORS.primary },
    tabLabel: { fontSize: 12, fontWeight: '600', color: COLORS.muted },
    tabLabelActive: { color: COLORS.primary },
    content: { flex: 1 },
    section: { padding: 16, gap: 12 },
    sectionDesc: { fontSize: 13, color: COLORS.muted, lineHeight: 18, marginBottom: 4 },
    scenarioCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.danger,
    },
    alertBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    alertText: { fontSize: 14, fontWeight: '700', color: COLORS.danger },
    scenarioText: { fontSize: 14, color: COLORS.dark, lineHeight: 22 },
    quickStats: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
    },
    quickStatsTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.dark,
        marginBottom: 12,
    },
    statsRow: { flexDirection: 'row', gap: 8 },
    statCard: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: COLORS.light,
        borderRadius: 10,
        paddingVertical: 14,
    },
    statValue: { fontSize: 24, fontWeight: '800' },
    statLabel: { fontSize: 11, color: COLORS.muted, marginTop: 4, textAlign: 'center' },
    pathCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        gap: 14,
        alignItems: 'flex-start',
    },
    pathStep: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    pathStepNum: { color: '#fff', fontWeight: '800', fontSize: 14 },
    pathContent: { flex: 1 },
    pathTitle: { fontSize: 14, fontWeight: '700', color: COLORS.dark, marginBottom: 4 },
    pathDesc: { fontSize: 13, color: COLORS.muted, lineHeight: 19 },
    remCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        gap: 8,
    },
    remHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    priorityBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    priorityText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    effortRow: { flexDirection: 'row', gap: 10 },
    effortLabel: { fontSize: 11, color: COLORS.muted },
    remTitle: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
    remDesc: { fontSize: 13, color: COLORS.muted, lineHeight: 19 },
});
