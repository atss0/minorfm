import React from 'react';
import {Image, StyleSheet, Text, View, ViewStyle} from 'react-native';
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

  return (
    <View
      style={[
        styles.container,
        {width: size, height: size, borderRadius},
        style,
      ]}>
      <Text style={[styles.initials, {fontSize: size * 0.38}]}>
        {getInitials(username)}
      </Text>
      {!!uri && (
        <Image
          source={{uri}}
          style={[StyleSheet.absoluteFill, {borderRadius}]}
          resizeMode="cover"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  initials: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
