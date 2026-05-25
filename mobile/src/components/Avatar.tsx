import React from 'react';
import {StyleSheet, Text, View, ViewStyle} from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import {colors} from '../theme';
import {getInitials} from '../utils/format';

interface Props {
  uri?: string | null;
  username: string;
  size?: number;
  style?: ViewStyle;
}

export default function Avatar({uri, username, size = 40, style}: Props) {
  const borderRadius = size / 2;

  if (uri) {
    return (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <FastImage
        source={{uri, priority: FastImage.priority.normal}}
        style={[{width: size, height: size, borderRadius}, style] as any}
        resizeMode={FastImage.resizeMode.cover}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {width: size, height: size, borderRadius},
        style,
      ]}>
      <Text style={[styles.initials, {fontSize: size * 0.38}]}>
        {getInitials(username)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  initials: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
