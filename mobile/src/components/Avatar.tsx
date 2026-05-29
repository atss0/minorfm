import React, {useState, useEffect} from 'react';
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
  const [failed, setFailed] = useState(false);
  const borderRadius = size / 2;

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  if (uri && !failed) {
    return (
      <Image
        source={{uri}}
        style={[{width: size, height: size, borderRadius}, style]}
        resizeMode="cover"
        onError={() => setFailed(true)}
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
