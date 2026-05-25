import React from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import MaterialIcon from '@react-native-vector-icons/material-icons';
import AppText from './AppText';
import Button from './Button';
import {colors, spacing} from '../theme';

interface Props {
  icon?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export default function EmptyState({icon, message, actionLabel, onAction, style}: Props) {
  return (
    <View style={[styles.container, style]}>
      {icon && (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <MaterialIcon name={icon as any} size={48} color={colors.textSecondary} style={styles.icon} />
      )}
      <AppText variant="body" style={styles.message}>{message}</AppText>
      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="ghost"
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  icon: {
    marginBottom: spacing.sm,
  },
  message: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    marginTop: spacing.sm,
  },
});
