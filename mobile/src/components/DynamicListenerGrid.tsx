import React, {useCallback, useEffect, useRef, useState, useMemo} from 'react';
import {FlatList, StyleSheet, View, useWindowDimensions} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {runOnJS} from 'react-native-reanimated';
import HapticFeedback from 'react-native-haptic-feedback';
import AppText from './AppText';
import ListenerAvatar from './ListenerAvatar';
import {useAuthStore} from '../stores/authStore';
import {useChatStore} from '../stores/chatStore';
import {usersApi} from '../api/users';
import {heartTapBridge} from '../utils/heartTapBridge';
import {colors, spacing} from '../theme';
import {calcGridLayout, GAP} from '../utils/gridLayout';

interface Listener {
  id: string;
  username: string;
  avatar_url?: string | null;
}

interface Props {
  listeners: Listener[];
  maxHeight: number;
  onListenerPress?: (listener: Listener) => void;
}

const SUPERLIKE_MS = 3000;
const HEART_TAP_MS = 10_000;
const HAPTIC_OPTIONS = {enableVibrateFallback: true, ignoreAndroidSystemSettings: false};

export default function DynamicListenerGrid({
  listeners,
  maxHeight,
  onListenerPress,
}: Props) {
  const {width: screenWidth} = useWindowDimensions();
  const count = listeners.length;

  const {columns, avatarSize, scrollEnabled} = useMemo(
    () => calcGridLayout(count, screenWidth, maxHeight),
    [count, screenWidth, maxHeight],
  );

  const {user} = useAuthStore();
  const lastHeartTap = useChatStore(s => s.lastHeartTap);

  const listenersRef = useRef(listeners);
  const userIdRef = useRef(user?.id);
  const userRef = useRef(user);

  // Rapid-tap tracking: 3+ double-taps within 2.5s → clap
  const tapCountRef = useRef(0);
  const lastDoubleTapRef = useRef(0);
  const tapResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { listenersRef.current = listeners; }, [listeners]);
  useEffect(() => { userIdRef.current = user?.id; userRef.current = user; }, [user]);

  // Superlike state (long-press, 3s)
  const [superlikedIds, setSuperlikedIds] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Heart-tap state (double-tap broadcast, 30s)
  const [heartTapMap, setHeartTapMap] = useState<Map<string, 'heart' | 'clap'>>(new Map());
  const heartTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = timersRef.current;
    const heartTimers = heartTimersRef.current;
    return () => {
      timers.forEach(t => clearTimeout(t));
      heartTimers.forEach(t => clearTimeout(t));
      if (tapResetTimerRef.current) clearTimeout(tapResetTimerRef.current);
    };
  }, []);

  const showSuperlikeFor = useCallback((id: string) => {
    setSuperlikedIds(prev => new Set(prev).add(id));
    const existing = timersRef.current.get(id);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      setSuperlikedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      timersRef.current.delete(id);
    }, SUPERLIKE_MS);
    timersRef.current.set(id, t);
  }, []);

  const showHeartTapFor = useCallback((userId: string, effect: 'heart' | 'clap') => {
    setHeartTapMap(prev => {
      const next = new Map(prev);
      next.set(userId, effect);
      return next;
    });
    const existing = heartTimersRef.current.get(userId);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      setHeartTapMap(prev => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
      heartTimersRef.current.delete(userId);
    }, HEART_TAP_MS);
    heartTimersRef.current.set(userId, t);
  }, []);

  // Subscribe to incoming heart taps from the broadcast WS
  useEffect(() => {
    if (!lastHeartTap) return;
    showHeartTapFor(lastHeartTap.userId, lastHeartTap.effect);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastHeartTap?.seq]);

  // Double-tap anywhere → heart or clap animation + WS broadcast
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastDoubleTapRef.current < 2500) {
      tapCountRef.current += 1;
    } else {
      tapCountRef.current = 1;
    }
    lastDoubleTapRef.current = now;

    if (tapResetTimerRef.current) clearTimeout(tapResetTimerRef.current);
    tapResetTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 2500);

    const effect: 'heart' | 'clap' = tapCountRef.current >= 3 ? 'clap' : 'heart';
    const me = userRef.current;

    // Direct call — skips chatStore/useEffect cycle, shows immediately
    if (me) {
      showHeartTapFor(me.id, effect);
    }
    // Broadcast to others via WS
    heartTapBridge.send?.(effect);
    HapticFeedback.trigger('impactLight', HAPTIC_OPTIONS);
  }, [showHeartTapFor]);

  const doubleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .maxDuration(300)
        .onStart(() => {
          'worklet';
          runOnJS(handleDoubleTap)();
        }),
    [handleDoubleTap],
  );

  // Long-press on a specific avatar → send superlike to that user via API
  const handleLongPress = useCallback(
    async (listener: Listener) => {
      const myId = userIdRef.current;
      if (!myId || listener.id === myId) return; // can't superlike yourself
      HapticFeedback.trigger('impactMedium', HAPTIC_OPTIONS);
      showSuperlikeFor(listener.id);
      try {
        await usersApi.superlike(listener.id);
      } catch {}
    },
    [showSuperlikeFor],
  );

  if (count === 0) {
    return (
      <View style={[styles.empty, {height: maxHeight}]}>
        <AppText variant="caption">Şu an kimse dinlemiyor</AppText>
      </View>
    );
  }

  return (
    <GestureDetector gesture={doubleTap}>
    <View style={[styles.container, {maxHeight}]}>
      <FlatList
        key={`grid-${columns}`}
        data={listeners}
        numColumns={columns}
        keyExtractor={item => item.id}
        scrollEnabled={scrollEnabled}
        contentContainerStyle={[
          styles.grid,
          !scrollEnabled && styles.gridCentered,
        ]}
        columnWrapperStyle={columns > 1 ? styles.row : undefined}
        renderItem={({item}) => (
          <View style={[styles.cell, {padding: GAP / 2}]}>
            <ListenerAvatar
              listener={item}
              size={avatarSize}
              isSuperliked={superlikedIds.has(item.id)}
              heartTapType={heartTapMap.get(item.id) ?? null}
              onPress={() => {}}
              onLongPress={() => onListenerPress?.(item)}
            />
          </View>
        )}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
      />
    </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  grid: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  gridCentered: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  row: {
    justifyContent: 'center',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
});
