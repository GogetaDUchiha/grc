import React, { createContext, useContext, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';

// Auth Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

// App Screens
import DashboardScreen from './src/screens/DashboardScreen';
import AssessmentScreen from './src/screens/AssessmentScreen';
import NewAssessmentScreen from './src/screens/NewAssessmentScreen';
import AssessmentDetailScreen from './src/screens/AssessmentDetailScreen';
import AIInsightsScreen from './src/screens/AIInsightsScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

import COLORS from './src/constants/colors';

import { AuthContext } from './src/context/AuthContext';

export function useAuth() {
  return useContext(AuthContext);
}

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// ================= AUTH STACK =================
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// ================= ASSESS STACK =================
function AssessStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#fff',
      }}
    >
      <Stack.Screen
        name="AssessHome"
        component={AssessmentScreen}
        options={{ title: 'Assessments' }}
      />
      <Stack.Screen
        name="NewAssessment"
        component={NewAssessmentScreen}
        options={{ title: 'New Assessment' }}
      />
      <Stack.Screen
        name="AssessmentDetail"
        component={AssessmentDetailScreen}
        options={{ title: 'Assessment Details' }}
      />
      <Stack.Screen
        name="AIInsights"
        component={AIInsightsScreen}
        options={{ title: 'AI Insights' }}
      />
    </Stack.Navigator>
  );
}

// ================= DASHBOARD STACK =================
function DashboardStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#fff',
      }}
    >
      <Stack.Screen
        name="DashboardHome"
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Stack.Screen
        name="NewAssessment"
        component={NewAssessmentScreen}
        options={{ title: 'New Assessment' }}
      />
      <Stack.Screen
        name="AssessmentDetail"
        component={AssessmentDetailScreen}
        options={{ title: 'Assessment Details' }}
      />
      <Stack.Screen
        name="AIInsights"
        component={AIInsightsScreen}
        options={{ title: 'AI Insights' }}
      />
    </Stack.Navigator>
  );
}

// ================= MAIN TABS =================
function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: COLORS.light,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName: string = 'dashboard';
          if (route.name === 'Dashboard') iconName = 'dashboard';
          else if (route.name === 'Assess') iconName = 'assignment';
          else if (route.name === 'Reports') iconName = 'description';
          else if (route.name === 'Settings') iconName = 'settings';
          return <MaterialIcons name={iconName as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardStack} />
      <Tab.Screen name="Assess" component={AssessStack} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// ================= ROOT =================
export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      setIsLoggedIn(!!token);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token: string, refresh: string) => {
    await AsyncStorage.setItem('access_token', token);
    await AsyncStorage.setItem('refresh_token', refresh);
    setIsLoggedIn(true);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('access_token');
    await AsyncStorage.removeItem('refresh_token');
    setIsLoggedIn(false);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.light }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
      <NavigationContainer>
        {isLoggedIn ? <AppTabs /> : <AuthStack />}
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
