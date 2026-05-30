import React from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated, {useAnimatedStyle, useSharedValue, withSpring} from 'react-native-reanimated';
import MaterialIcon from '@react-native-vector-icons/material-icons';
import {useUIStore} from '../stores/uiStore';
import {useAuthStore} from '../stores/authStore';
import Avatar from './Avatar';
import {colors, spacing} from '../theme';

// Deck=0, Chat=1, Rec=2(center), DM=3, Profile=4
const TAB_ITEMS = [
  {index: 0, icon: 'headset'},
  {index: 1, icon: 'chat'},
  {index: 2, icon: 'mic'},
  {index: 3, icon: 'mail'},
  {index: 4, icon: 'person'},
] as const;

interface Props {
  onTabPress: (index: number) => void;
}

export default function CustomTabBar({onTabPress}: Props) {
  const {activeTabIndex, chatUnreadCount, dmUnreadCount, triggerStartRecording} = useUIStore();
  const {user} = useAuthStore();
  const recScale = useSharedValue(1);

  const recAnimStyle = useAnimatedStyle(() => ({
    transform: [{scale: recScale.value}],
  }));

  const handlePress = (index: number) => {
    if (index === 2) {
      recScale.value = withSpring(0.82, {damping: 15}, finished => {
        'worklet';
        if (finished) {
          recScale.value = withSpring(1, {damping: 12});
        }
      });
      // If already on RecScreen: trigger recording; otherwise navigate to RecScreen
      if (activeTabIndex === 2) {
        triggerStartRecording();
      } else {
        onTabPress(2);
      }
    } else {
      onTabPress(index);
    }
  };

  const getBadge = (index: number) => {
    if (index === 1) return chatUnreadCount > 0;
    if (index === 3) return dmUnreadCount > 0;
    return false;
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <View style={styles.container}>
        {TAB_ITEMS.map(tab => {
          const isActive = activeTabIndex === tab.index;
          const isRec = tab.index === 2;
          const isYou = tab.index === 4;
          const hasBadge = getBadge(tab.index);

          if (isRec) {
            return (
              <TouchableOpacity
                key={tab.index}
                style={styles.tabItem}
                onPress={() => handlePress(2)}
                activeOpacity={0.85}>
                <Animated.View style={[styles.recButton, recAnimStyle]}>
                  <MaterialIcon name="mic" size={26} color={colors.textPrimary} />
                </Animated.View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={tab.index}
              style={styles.tabItem}
              onPress={() => handlePress(tab.index)}
              activeOpacity={0.7}>
              <View style={styles.iconWrapper}>
                {isYou && user ? (
                  <View style={[styles.avatarRing, isActive && styles.avatarRingActive]}>
                    <Avatar uri={user.avatar_url} username={user.username} size={24} />
                  </View>
                ) : (
                  <MaterialIcon
                    name={tab.icon}
                    size={24}
                    color={isActive ? colors.primary : colors.textSecondary}
                  />
                )}
                {hasBadge && <View style={styles.badge} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  container: {
    flexDirection: 'row',
    height: 56,
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconWrapper: {
    position: 'relative',
  },
  recButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  avatarRing: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarRingActive: {
    borderColor: colors.primary,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
});
