import React from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import MaterialIcon from '@react-native-vector-icons/material-icons';
import HapticFeedback from 'react-native-haptic-feedback';
import Avatar from './Avatar';
import AppText from './AppText';
import {colors, spacing, radius} from '../theme';
import {formatDuration, timeAgo} from '../utils/time';

const HAPTIC_OPTIONS = {enableVibrateFallback: true, ignoreAndroidSystemSettings: false};

interface Recording {
  id: string;
  user_id: string;
  user: {username: string; avatar_url: string};
  audio_url: string;
  duration: number;
  title: string | null;
  created_at: string;
}

interface Props {
  recording: Recording;
  isPlaying: boolean;
  progress: number;
  onPress: () => void;
  onLongPress?: () => void;
}

export default React.memo(function RecordingCard({recording, isPlaying, progress, onPress, onLongPress}: Props) {
  const handlePress = () => {
    HapticFeedback.trigger('impactLight', HAPTIC_OPTIONS);
    onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.card, isPlaying && styles.cardActive]}
      onPress={handlePress}
      onLongPress={onLongPress}
      delayLongPress={500}
      activeOpacity={0.75}>
      <Avatar
        uri={recording.user.avatar_url}
        username={recording.user.username}
        size={44}
      />

      <View style={styles.info}>
        <AppText variant="body" style={styles.title} numberOfLines={1}>
          {recording.title ?? 'Adsız kayıt'}
        </AppText>
        <AppText variant="caption">
          {recording.user.username} · {timeAgo(recording.created_at)}
        </AppText>
        {isPlaying && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, {width: `${progress * 100}%`}]} />
          </View>
        )}
      </View>

      <View style={styles.right}>
        <AppText variant="caption">{formatDuration(recording.duration)}</AppText>
        <TouchableOpacity style={styles.playBtn} onPress={handlePress} activeOpacity={0.7}>
          <MaterialIcon
            name={isPlaying ? 'pause-circle-outline' : 'play-circle-outline'}
            size={32}
            color={isPlaying ? colors.primary : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  cardActive: {
    backgroundColor: colors.surfaceHover,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
  },
  right: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  playBtn: {
    padding: 2,
  },
  progressBar: {
    height: 2,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
});
