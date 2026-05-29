import React, {useCallback} from 'react';
import {Image, StyleSheet, TouchableOpacity, View, StatusBar} from 'react-native';
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
import {colors, spacing, radius, PLAYER_HEADER_HEIGHT} from '../theme';
import {useStream} from '../hooks/useStream';
import {radioApi} from '../api/radio';

const HAPTIC_OPTIONS = {enableVibrateFallback: true, ignoreAndroidSystemSettings: false};

export default function PlayerHeader() {
  const {isPlaying, isBuffering, currentMeta, togglePlay} = useStream();

  const heartScale = useSharedValue(1);
  const heartColor = useSharedValue(0);

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
    radioApi.superlike().catch(() => {});
  }, [heartScale, heartColor]);

  const iconOpacity = useAnimatedStyle(() => ({
    opacity: 1 - heartColor.value * 0.3,
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.surface} />

      {/* Cover art */}
      <View style={styles.coverWrap}>
        {currentMeta?.cover_url ? (
          <Image source={{uri: currentMeta.cover_url}} style={styles.cover} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <MaterialIcon name="music-note" size={22} color={colors.textSecondary} />
          </View>
        )}
      </View>

      {/* Artist / title */}
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

      {/* Play / pause */}
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

      {/* Superheart */}
      <TouchableOpacity style={styles.superlikeBtn} onPress={handleSuperlike} activeOpacity={0.7}>
        <Animated.View style={[heartStyle, iconOpacity]}>
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
    gap: spacing.sm,
  },
  coverWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  cover: {
    width: 40,
    height: 40,
  },
  coverPlaceholder: {
    width: 40,
    height: 40,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  meta: {
    flex: 1,
  },
  connecting: {
    color: colors.textSecondary,
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
  superlikeBtn: {
    padding: spacing.xs,
  },
});
