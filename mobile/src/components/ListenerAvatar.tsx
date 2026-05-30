import React, {useCallback, useEffect} from 'react';
import {StyleSheet, TouchableOpacity} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import MaterialIcon from '@react-native-vector-icons/material-icons';
import Avatar from './Avatar';
import {colors} from '../theme';
import type {AppStackParamList} from '../navigation/RootNavigator';

interface Listener {
  id: string;
  username: string;
  avatar_url?: string | null;
}

interface Props {
  listener: Listener;
  size: number;
  isSuperliked?: boolean;
  heartTapType?: 'heart' | 'clap' | null;
  onPress?: () => void;
  onLongPress?: () => void;
}

export default React.memo(function ListenerAvatar({
  listener,
  size,
  isSuperliked = false,
  heartTapType = null,
  onPress,
  onLongPress,
}: Props) {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const sizeShared = useSharedValue(size);

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate('Profile', {username: listener.username});
    }
  }, [onPress, navigation, listener.username]);

  // Superlike overlay (long-press): static bg, only icon scales
  const superlikeOverlayOpacity = useSharedValue(0);
  const superlikeIconScale = useSharedValue(0);

  // Heart-tap overlay (double-tap broadcast): static bg, only emoji scales
  const tapOverlayOpacity = useSharedValue(0);
  const tapIconScale = useSharedValue(0);

  useEffect(() => {
    sizeShared.value = withTiming(size, {duration: 250});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  useEffect(() => {
    if (isSuperliked) {
      superlikeOverlayOpacity.value = withTiming(1, {duration: 60});
      superlikeIconScale.value = withSequence(
        withSpring(1.3, {damping: 6, stiffness: 300}),
        withSpring(1, {damping: 10, stiffness: 200}),
      );
    } else {
      superlikeOverlayOpacity.value = withTiming(0, {duration: 350});
      superlikeIconScale.value = withDelay(100, withTiming(0, {duration: 250}));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperliked]);

  useEffect(() => {
    if (heartTapType) {
      tapOverlayOpacity.value = withTiming(1, {duration: 80});
      tapIconScale.value = withSequence(
        withSpring(1.4, {damping: 5, stiffness: 280}),
        withSpring(1, {damping: 12, stiffness: 200}),
      );
    } else {
      tapOverlayOpacity.value = withTiming(0, {duration: 400});
      tapIconScale.value = withDelay(150, withTiming(0, {duration: 250}));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heartTapType]);

  const wrapperStyle = useAnimatedStyle(() => ({
    width: sizeShared.value,
    height: sizeShared.value,
    borderRadius: sizeShared.value / 2,
  }));

  const superlikeOverlayStyle = useAnimatedStyle(() => ({
    opacity: superlikeOverlayOpacity.value,
  }));

  const superlikeIconStyle = useAnimatedStyle(() => ({
    transform: [{scale: superlikeIconScale.value}],
  }));

  const tapOverlayStyle = useAnimatedStyle(() => ({
    opacity: tapOverlayOpacity.value,
  }));

  const tapIconStyle = useAnimatedStyle(() => ({
    transform: [{scale: tapIconScale.value}],
  }));

  const iconSize = Math.round(size * 0.44);

  return (
    <TouchableOpacity onPress={handlePress} onLongPress={onLongPress} activeOpacity={0.8}>
      <Animated.View style={[styles.wrapper, wrapperStyle]}>
        <Avatar
          uri={listener.avatar_url}
          username={listener.username}
          size={size}
          style={styles.avatar}
        />
        {/* Superlike overlay — static bg, animated icon only */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, superlikeOverlayStyle]}>
          <Animated.View style={superlikeIconStyle}>
            <MaterialIcon name="favorite" size={iconSize} color={colors.textPrimary} />
          </Animated.View>
        </Animated.View>
        {/* Heart-tap overlay — static bg, animated icon only */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            heartTapType === 'clap' ? styles.clapOverlay : styles.overlay,
            tapOverlayStyle,
          ]}>
          <Animated.View style={tapIconStyle}>
            <MaterialIcon
              name={heartTapType === 'clap' ? 'thumb-up' : 'favorite'}
              size={iconSize}
              color={colors.textPrimary}
            />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  avatar: {
    borderWidth: 0,
  },
  overlay: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clapOverlay: {
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
