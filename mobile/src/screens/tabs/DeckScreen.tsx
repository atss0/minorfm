import React from 'react';
import {StyleSheet, View} from 'react-native';
import MaterialIcon from '@react-native-vector-icons/material-icons';
import AppText from '../../components/AppText';
import {colors, spacing} from '../../theme';

export default function DeckScreen() {
  return (
    <View style={styles.container}>
      <MaterialIcon name="queue-music" size={48} color={colors.textSecondary} />
      <AppText variant="subheading" style={styles.title}>Deck</AppText>
      <AppText variant="caption" style={styles.subtitle}>Yakında</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.textSecondary,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
