import React from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import {colors} from '../theme';

interface Props {
  style?: ViewStyle;
}

export default function Divider({style}: Props) {
  return <View style={[styles.line, style]} />;
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    width: '100%',
  },
});
