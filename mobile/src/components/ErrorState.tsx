import React from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import MaterialIcon from '@react-native-vector-icons/material-icons';
import AppText from './AppText';
import Button from './Button';
import {colors, spacing} from '../theme';

interface Props {
  message?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export default function ErrorState({
  message = 'Bir hata oluştu',
  onRetry,
  style,
}: Props) {
  return (
    <View style={[styles.container, style]}>
      <MaterialIcon name="error-outline" size={48} color={colors.error} style={styles.icon} />
      <AppText variant="body" style={styles.message}>{message}</AppText>
      {onRetry && (
        <Button
          label="Tekrar Dene"
          onPress={onRetry}
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
