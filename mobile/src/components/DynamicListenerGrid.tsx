import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {FlatList, StyleSheet, View, useWindowDimensions} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {runOnJS} from 'react-native-reanimated';
import HapticFeedback from 'react-native-haptic-feedback';
import AppText from './AppText';
import ListenerAvatar from './ListenerAvatar';
import {useAuthStore} from '../stores/authStore';
import {usersApi} from '../api/users';
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

  const listenersRef = useRef(listeners);
  const userIdRef = useRef(user?.id);

  useEffect(() => { listenersRef.current = listeners; }, [listeners]);
  useEffect(() => { userIdRef.current = user?.id; }, [user?.id]);

  const [superlikedIds, setSuperlikedIds] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = timersRef.current;
    return () => { timers.forEach(t => clearTimeout(t)); };
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

  // Double-tap anywhere → show heart on own avatar (no API call, local expression)
  const doubleTapSelf = useCallback(() => {
    const myId = userIdRef.current;
    const list = listenersRef.current;
    if (!myId || !list.some(l => l.id === myId)) return;
    HapticFeedback.trigger('impactMedium', HAPTIC_OPTIONS);
    showSuperlikeFor(myId);
  }, [showSuperlikeFor]);

  const doubleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .maxDuration(300)
        .onStart(() => {
          'worklet';
          runOnJS(doubleTapSelf)();
        }),
    [doubleTapSelf],
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
                onPress={() => onListenerPress?.(item)}
                onLongPress={() => handleLongPress(item)}
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
