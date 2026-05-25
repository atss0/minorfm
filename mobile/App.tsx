import React, {useEffect} from 'react';
import {StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import FlashMessage from 'react-native-flash-message';
import RootNavigator from './src/navigation/RootNavigator';
import {linking} from './src/navigation/linking';
import {initOneSignal} from './src/services/OneSignalService';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 dk
      gcTime: 30 * 60 * 1000,    // 30 dk
      retry: 2,
    },
  },
});

const styles = StyleSheet.create({
  root: {flex: 1},
});

export default function App() {
  useEffect(() => {
    initOneSignal();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer linking={linking}>
            <RootNavigator />
            <FlashMessage position="top" />
          </NavigationContainer>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
