import React, {useEffect, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import MaterialIcon from '@react-native-vector-icons/material-icons';
import AppText from './AppText';
import {colors, spacing} from '../theme';

interface Props {
  hearts: number;
  claps: number;
  listeners: number;
}

function StatItem({icon, count}: {icon: React.ComponentProps<typeof MaterialIcon>['name']; count: number}) {
  const scale = useSharedValue(1);
  const prevCount = useRef(count);

  useEffect(() => {
    if (count > prevCount.current) {
      scale.value = withSequence(
        withSpring(1.35, {damping: 5, stiffness: 400}),
        withTiming(1, {duration: 200}),
      );
    }
    prevCount.current = count;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  return (
    <Animated.View style={[styles.item, animStyle]}>
      <MaterialIcon name={icon} size={13} color={colors.textSecondary} />
      <AppText style={styles.count}>{count}</AppText>
    </Animated.View>
  );
}

export default function LiveStatsBar({hearts, claps, listeners}: Props) {
  return (
    <View style={styles.bar}>
      <StatItem icon="favorite" count={hearts} />
      <View style={styles.dot} />
      <StatItem icon="thumb-up" count={claps} />
      <View style={styles.dot} />
      <StatItem icon="people" count={listeners} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  count: {
    fontSize: 12,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.border,
  },
});
