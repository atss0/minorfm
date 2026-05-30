import React, {useEffect, useState} from 'react';
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
  const [loaded, setLoaded] = useState(false);

  // Reset the loaded flag whenever the URI changes so the initials show
  // again until the new image finishes loading.
  useEffect(() => {
    setLoaded(false);
  }, [uri]);
  
  return (
    <View
      style={[
        styles.container,
        {width: size, height: size, borderRadius},
        style,
      ]}>
      {(!uri || !loaded) && (
        <Text style={[styles.initials, {fontSize: size * 0.38}]}>
          {getInitials(username)}
        </Text>
      )}
      {!!uri && (
        <Image
          key={uri}
          source={{uri}}
          style={[styles.image, {width: size, height: size, borderRadius}]}
          resizeMode="cover"
          onLoad={() => setLoaded(true)}
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
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  initials: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
