import React, {useCallback} from 'react';
import {StyleSheet, TouchableOpacity, View, StatusBar} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import MaterialIcon from '@react-native-vector-icons/material-icons';
import HapticFeedback from 'react-native-haptic-feedback';
import AppText from './AppText';
import {colors, spacing, PLAYER_HEADER_HEIGHT} from '../theme';
import {useStream} from '../hooks/useStream';

const HAPTIC_OPTIONS = {enableVibrateFallback: true, ignoreAndroidSystemSettings: false};

export default function PlayerHeader() {
  const {isPlaying, isBuffering, currentMeta, togglePlay} = useStream();

  const heartScale = useSharedValue(1);
  const heartColor = useSharedValue(0); // 0 = outline, 1 = filled

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{scale: heartScale.value}],
  }));

  const handleSuperlike = useCallback(() => {
    HapticFeedback.trigger('impactMedium', HAPTIC_OPTIONS);
    heartScale.value = withSequence(
      withSpring(1.4, {damping: 5, stiffness: 400}),
      withSpring(1, {damping: 10, stiffness: 200}),
    );
    heartColor.value = withSequence(
      withTiming(1, {duration: 80}),
      withTiming(0, {duration: 1200}),
    );
  }, [heartScale, heartColor]);

  const iconColor = useAnimatedStyle(() => ({
    // colour changes handled by swapping the icon name below
    opacity: 1 - heartColor.value * 0.3,
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.surface} />
      <TouchableOpacity
        style={[styles.playBtn, isBuffering && styles.playBtnDisabled]}
        onPress={togglePlay}
        disabled={isBuffering}
        activeOpacity={0.75}>
        <MaterialIcon
          name={isPlaying ? 'pause' : 'play-arrow'}
          size={24}
          color={colors.textPrimary}
        />
      </TouchableOpacity>

      <View style={styles.meta}>
        {isBuffering ? (
          <AppText variant="caption" style={styles.connecting}>
            Bağlanıyor...
          </AppText>
        ) : (
          <>
            <AppText variant="artist" numberOfLines={1}>
              {currentMeta?.artist ?? 'MINOR.fm'}
            </AppText>
            <AppText variant="title" numberOfLines={1}>
              {currentMeta?.title ?? 'Canlı Yayın'}
            </AppText>
          </>
        )}
      </View>

      <TouchableOpacity style={styles.superlikeBtn} onPress={handleSuperlike} activeOpacity={0.7}>
        <Animated.View style={[heartStyle, iconColor]}>
          <MaterialIcon name="favorite" size={22} color={colors.primary} />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: PLAYER_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  playBtnDisabled: {
    opacity: 0.5,
  },
  meta: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  connecting: {
    color: colors.textSecondary,
  },
  superlikeBtn: {
    padding: spacing.xs,
  },
});
