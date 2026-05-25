import React from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import {colors} from '../theme';

interface Props {
  size?: number;
  style?: ViewStyle;
}

export default function OnlineIndicator({size = 10, style}: Props) {
  return (
    <View
      style={[
        styles.dot,
        {width: size, height: size, borderRadius: size / 2},
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    backgroundColor: colors.online,
    borderWidth: 2,
    borderColor: colors.bg,
  },
});
