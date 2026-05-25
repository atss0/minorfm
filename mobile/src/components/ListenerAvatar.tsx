import React, {useCallback, useEffect} from 'react';
import {StyleSheet} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import MaterialIcon from '@react-native-vector-icons/material-icons';
import Avatar from './Avatar';
import {colors} from '../theme';
import type {AppStackParamList} from '../navigation/RootNavigator';

interface Listener {
  id: string;
  username: string;
  avatar_url?: string | null;
}

interface Props {
  listener: Listener;
  size: number;
  isSuperliked?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

export default React.memo(function ListenerAvatar({
  listener,
  size,
  isSuperliked = false,
  onPress,
  onLongPress,
}: Props) {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const sizeShared = useSharedValue(size);

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate('Profile', {username: listener.username});
    }
  }, [onPress, navigation, listener.username]);
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  useEffect(() => {
    sizeShared.value = withTiming(size, {duration: 250});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  useEffect(() => {
    if (isSuperliked) {
      // Pop in: scale 0 → 1.2 → 1 with full opacity
      heartOpacity.value = withTiming(1, {duration: 60});
      heartScale.value = withSequence(
        withSpring(1.2, {damping: 6, stiffness: 300}),
        withSpring(1, {damping: 10, stiffness: 200}),
      );
    } else {
      // Fade out smoothly
      heartOpacity.value = withTiming(0, {duration: 350});
      heartScale.value = withDelay(100, withTiming(0, {duration: 250}));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperliked]);

  const wrapperStyle = useAnimatedStyle(() => ({
    width: sizeShared.value,
    height: sizeShared.value,
    borderRadius: sizeShared.value / 2,
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    transform: [{scale: heartScale.value}],
    opacity: heartOpacity.value,
  }));

  const iconSize = Math.round(size * 0.44);

  return (
    <TouchableOpacity onPress={handlePress} onLongPress={onLongPress} activeOpacity={0.8}>
      <Animated.View style={[styles.wrapper, wrapperStyle]}>
        <Avatar
          uri={listener.avatar_url}
          username={listener.username}
          size={size}
          style={styles.avatar}
        />
        <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}>
          <MaterialIcon name="favorite" size={iconSize} color={colors.textPrimary} />
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  avatar: {
    borderWidth: 0,
  },
  overlay: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
