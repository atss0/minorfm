import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useAuthStore} from '../stores/authStore';
import {colors} from '../theme';
import {
  registerDeviceToken,
  setExternalUserId,
  clearExternalUserId,
} from '../services/OneSignalService';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import MainScreen from './MainScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import PostDetailScreen from '../screens/post/PostDetailScreen';
import DMConversationScreen from '../screens/dm/DMConversationScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import SearchScreen from '../screens/search/SearchScreen';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type AppStackParamList = {
  Main: undefined;
  Profile: {username: string};
  PostDetail: {id: string};
  DMConversation: {roomId: string; name?: string};
  Settings: undefined;
  Notifications: undefined;
  Search: {mode?: 'dm'} | undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{headerShown: false}}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator screenOptions={{headerShown: false}}>
      <AppStack.Screen name="Main" component={MainScreen} />
      <AppStack.Screen name="Profile" component={ProfileScreen} />
      <AppStack.Screen name="PostDetail" component={PostDetailScreen} />
      <AppStack.Screen name="DMConversation" component={DMConversationScreen} />
      <AppStack.Screen name="Settings" component={SettingsScreen} />
      <AppStack.Screen name="Notifications" component={NotificationsScreen} />
      <AppStack.Screen name="Search" component={SearchScreen} />
    </AppStack.Navigator>
  );
}

export default function RootNavigator() {
  const {accessToken} = useAuthStore();
  const [hydrating, setHydrating] = useState(true);

  // AsyncStorage'dan token'ı oku — persist middleware bunu otomatik yapıyor
  // ama ilk render için hydration bekle
  useEffect(() => {
    const timer = setTimeout(() => setHydrating(false), 100);
    return () => clearTimeout(timer);
  }, []);

  // OneSignal: kullanıcı giriş/çıkışına göre external ID güncelle
  useEffect(() => {
    const {user} = useAuthStore.getState();
    if (accessToken && user) {
      setExternalUserId(user.id);
      registerDeviceToken();
    } else {
      clearExternalUserId();
    }
  }, [accessToken]);

  if (hydrating) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return accessToken ? <AppNavigator /> : <AuthNavigator />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
