import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
} from 'react';
import {
  Dimensions,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, radius} from '../theme';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');
const SNAP_THRESHOLD = 80;
const VELOCITY_THRESHOLD = 500;

export interface BottomSheetRef {
  open: () => void;
  close: () => void;
}

interface Props {
  children: React.ReactNode;
  snapHeight?: number;
  onClose?: () => void;
}

const BottomSheet = forwardRef<BottomSheetRef, Props>(
  ({children, snapHeight = SCREEN_HEIGHT * 0.5, onClose}, ref) => {
    const insets = useSafeAreaInsets();
    const translateY = useSharedValue(snapHeight);
    const backdropOpacity = useSharedValue(0);
    const isVisible = useSharedValue(false);

    const open = useCallback(() => {
      isVisible.value = true;
      backdropOpacity.value = withTiming(1, {duration: 250});
      translateY.value = withSpring(0, {damping: 20, stiffness: 220});
    }, [translateY, backdropOpacity, isVisible]);

    const closeSheet = useCallback(() => {
      isVisible.value = false;
      backdropOpacity.value = withTiming(0, {duration: 200});
      translateY.value = withSpring(snapHeight, {damping: 20, stiffness: 220});
    }, [translateY, backdropOpacity, isVisible, snapHeight]);

    const close = useCallback(() => {
      closeSheet();
      if (onClose) setTimeout(onClose, 220);
    }, [closeSheet, onClose]);

    useImperativeHandle(ref, () => ({open, close}));

    const dismissOnJS = useCallback(() => {
      isVisible.value = false;
      if (onClose) onClose();
    }, [isVisible, onClose]);

    const panGesture = Gesture.Pan()
      .onUpdate(e => {
        if (e.translationY > 0) {
          translateY.value = e.translationY;
          backdropOpacity.value = Math.max(0, 1 - e.translationY / snapHeight);
        }
      })
      .onEnd(e => {
        if (e.translationY > SNAP_THRESHOLD || e.velocityY > VELOCITY_THRESHOLD) {
          backdropOpacity.value = withTiming(0, {duration: 200});
          translateY.value = withSpring(snapHeight, {damping: 20, stiffness: 220});
          runOnJS(dismissOnJS)();
        } else {
          backdropOpacity.value = withTiming(1, {duration: 200});
          translateY.value = withSpring(0, {damping: 20, stiffness: 220});
        }
      });

    const sheetStyle = useAnimatedStyle(() => ({
      transform: [{translateY: translateY.value}],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
      opacity: backdropOpacity.value,
      display: backdropOpacity.value === 0 ? 'none' : 'flex',
    }));

    const totalHeight = snapHeight + insets.bottom;

    return (
      <>
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
          pointerEvents="box-none">
          <TouchableWithoutFeedback onPress={close}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
        </Animated.View>

        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[styles.sheet, {height: totalHeight}, sheetStyle]}>
            <View style={styles.handleRow}>
              <View style={styles.handle} />
            </View>
            <View style={[styles.content, {paddingBottom: insets.bottom}]}>
              {children}
            </View>
          </Animated.View>
        </GestureDetector>
      </>
    );
  },
);

BottomSheet.displayName = 'BottomSheet';
export default BottomSheet;

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: 'hidden',
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  content: {
    flex: 1,
  },
});
