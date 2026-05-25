import React from 'react';
import {StyleSheet, View} from 'react-native';
import Avatar from './Avatar';
import AppText from './AppText';
import {colors, radius, spacing} from '../theme';
import {timeAgo} from '../utils/time';

interface Props {
  isMine: boolean;
  body: string;
  username: string;
  avatarUrl?: string | null;
  createdAt: string;
  showAvatar?: boolean;
}

export default React.memo(function MessageBubble({
  isMine,
  body,
  username,
  avatarUrl,
  createdAt,
  showAvatar = true,
}: Props) {
  return (
    <View style={[styles.row, isMine && styles.rowMine]}>
      {!isMine && (
        showAvatar ? (
          <Avatar uri={avatarUrl} username={username} size={32} />
        ) : (
          <View style={styles.avatarPlaceholder} />
        )
      )}

      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
        {!isMine && showAvatar && (
          <AppText variant="caption" style={styles.username}>{username}</AppText>
        )}
        <AppText
          variant="body"
          style={isMine ? [styles.bodyText, styles.textMine] : [styles.bodyText, styles.textOther]}>
          {body}
        </AppText>
        <AppText variant="caption" style={isMine ? [styles.time, styles.timeMine] : styles.time}>
          {timeAgo(createdAt)}
        </AppText>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  rowMine: {
    flexDirection: 'row-reverse',
  },
  avatarPlaceholder: {
    width: 32,
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    gap: 2,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: radius.sm,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radius.sm,
  },
  username: {
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  textMine: {
    color: colors.textPrimary,
  },
  textOther: {
    color: colors.textPrimary,
  },
  time: {
    fontSize: 10,
    color: colors.textSecondary,
    alignSelf: 'flex-end',
  },
  timeMine: {
    color: 'rgba(255,255,255,0.65)',
  },
});
