import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Linking, StyleSheet, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useAuthStore} from '../stores/authStore';
import {colors} from '../theme';
import {navigationRef} from './navigationRef';
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
  Main: {initialTab?: number} | undefined;
  Profile: {username: string};
  PostDetail: {id: string};
  DMConversation: {roomId: string; name?: string};
  Settings: undefined;
  Notifications: undefined;
  Search: {mode?: 'dm'} | undefined;
};

// Parse a deep link URL into a screen + params pair.
// Used to replay a pending link after the user logs in.
function parseDeepLink(
  url: string,
): {screen: keyof AppStackParamList; params?: object} | null {
  try {
    const path = url
      .replace(/^minorfm:\/\//, '/')
      .replace(/^https?:\/\/minor\.fm/, '')
      .replace(/^\/\//, '/');

    const [, first, second] = path.split('/');

    if (!first) return {screen: 'Main', params: {initialTab: 2}};
    if (first === 'profile' && second) return {screen: 'Profile', params: {username: second}};
    if (first === 'post' && second) return {screen: 'PostDetail', params: {id: second}};
    if (first === 'dm' && second) return {screen: 'DMConversation', params: {roomId: second}};
    if (first === 'dm') return {screen: 'Main', params: {initialTab: 3}};
    if (first === 'settings') return {screen: 'Settings'};
    if (first === 'notifications') return {screen: 'Notifications'};
    if (first === 'search') return {screen: 'Search'};
    if (first === 'chat') return {screen: 'Main', params: {initialTab: 1}};
    if (first === 'rec') return {screen: 'Main', params: {initialTab: 2}};
    if (first === 'deck') return {screen: 'Main', params: {initialTab: 0}};
    if (first === 'you') return {screen: 'Main', params: {initialTab: 4}};
    return null;
  } catch {
    return null;
  }
}

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
  const pendingUrlRef = useRef<string | null>(null);

  // AsyncStorage'dan token'ı oku — persist middleware bunu otomatik yapıyor
  // ama ilk render için hydration bekle
  useEffect(() => {
    const timer = setTimeout(() => setHydrating(false), 100);
    return () => clearTimeout(timer);
  }, []);

  // Giriş yapmamışken gelen deep link'i sakla
  useEffect(() => {
    if (accessToken) return;

    Linking.getInitialURL().then(url => {
      if (url) pendingUrlRef.current = url;
    });

    const sub = Linking.addEventListener('url', ({url}) => {
      pendingUrlRef.current = url;
    });

    return () => sub.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Giriş yapıldıktan sonra saklanan deep link'e git
  useEffect(() => {
    if (!accessToken || !pendingUrlRef.current) return;

    const url = pendingUrlRef.current;
    pendingUrlRef.current = null;

    const tryNavigate = (attempts = 0) => {
      if (!navigationRef.isReady()) {
        if (attempts < 10) setTimeout(() => tryNavigate(attempts + 1), 100);
        return;
      }
      const target = parseDeepLink(url);
      if (target) {
        navigationRef.navigate(target.screen as any, target.params as any);
      }
    };

    setTimeout(tryNavigate, 200);
  }, [accessToken]);

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
