import React, {useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute, RouteProp} from '@react-navigation/native';
import type {AppStackParamList} from './RootNavigator';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import PagerView from 'react-native-pager-view';
import {useQueryClient} from '@tanstack/react-query';
import {mainPagerRef} from './pagerRef';
import PlayerHeader from '../components/PlayerHeader';
import CustomTabBar from '../components/CustomTabBar';
import AppText from '../components/AppText';
import DeckScreen from '../screens/tabs/DeckScreen';
import ChatScreen from '../screens/tabs/ChatScreen';
import RecScreen from '../screens/tabs/RecScreen';
import DMScreen from '../screens/tabs/DMScreen';
import YouScreen from '../screens/tabs/YouScreen';
import {useUIStore} from '../stores/uiStore';
import {useNetworkStatus} from '../hooks/useNetworkStatus';
import {wsManager} from '../services/WebSocketManager';
import {colors, spacing} from '../theme';

type MainRouteProp = RouteProp<AppStackParamList, 'Main'>;

export default function MainScreen() {
  const route = useRoute<MainRouteProp>();
  const setTabIndex = useUIStore(s => s.setTabIndex);
  const {isOffline, isReconnecting} = useNetworkStatus();
  const queryClient = useQueryClient();

  // Deep link ile açıldıysa doğru sekmeye git
  useEffect(() => {
    const initialTab = route.params?.initialTab;
    if (initialTab !== undefined) {
      mainPagerRef.current?.setPage(initialTab);
      setTabIndex(initialTab);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bannerHeight = useSharedValue(0);

  useEffect(() => {
    bannerHeight.value = withTiming(isOffline ? 32 : 0, {duration: 250});
  }, [isOffline, bannerHeight]);

  useEffect(() => {
    if (isReconnecting) {
      queryClient.invalidateQueries();
      wsManager.reconnectAll();
    }
  }, [isReconnecting, queryClient]);

  const bannerStyle = useAnimatedStyle(() => ({
    height: bannerHeight.value,
    overflow: 'hidden',
  }));

  const handleTabPress = (index: number) => {
    mainPagerRef.current?.setPage(index);
    setTabIndex(index);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.topSafe}>
        <PlayerHeader />
        <Animated.View style={[styles.offlineBanner, bannerStyle]}>
          <AppText variant="caption" style={styles.offlineText}>
            İnternet bağlantısı yok
          </AppText>
        </Animated.View>
      </SafeAreaView>

      <PagerView
        ref={mainPagerRef}
        style={styles.pager}
        initialPage={2}
        onPageSelected={e => setTabIndex(e.nativeEvent.position)}>
        <View key="0" style={styles.page}>
          <DeckScreen />
        </View>
        <View key="1" style={styles.page}>
          <ChatScreen />
        </View>
        <View key="2" style={styles.page}>
          <RecScreen />
        </View>
        <View key="3" style={styles.page}>
          <DMScreen />
        </View>
        <View key="4" style={styles.page}>
          <YouScreen />
        </View>
      </PagerView>

      <CustomTabBar onTabPress={handleTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topSafe: {
    backgroundColor: colors.surface,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  offlineBanner: {
    backgroundColor: '#B71C1C',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  offlineText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 12,
  },
});
