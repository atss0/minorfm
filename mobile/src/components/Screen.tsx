import React from 'react';
import {StatusBar, StyleSheet, View, ViewStyle} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export default function Screen({children, style, edges = ['top', 'bottom']}: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <View style={[styles.container, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  noBottom: {
    paddingBottom: 0,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
