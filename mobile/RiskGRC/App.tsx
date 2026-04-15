import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import NewAssessmentScreen from './src/screens/NewAssessmentScreen';
import AssessmentDetailScreen from './src/screens/AssessmentDetailScreen';

const Stack = createStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="NewAssessment" component={NewAssessmentScreen} />
        <Stack.Screen name="AssessmentDetail" component={AssessmentDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
