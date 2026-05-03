import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext({
  isLoggedIn: false,
  login: async () => {},
  logout: async () => {},
});
