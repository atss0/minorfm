import React, {useCallback, useState} from 'react';
import {RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useQuery} from '@tanstack/react-query';
import MaterialIcon from '@react-native-vector-icons/material-icons';
import {useAuthStore} from '../../stores/authStore';
import {useQueryClient} from '@tanstack/react-query';
import {usersApi} from '../../api/users';
import Avatar from '../../components/Avatar';
import AppText from '../../components/AppText';
import {colors, spacing} from '../../theme';
import type {AppStackParamList} from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<AppStackParamList>;

export default function YouScreen() {
  const navigation = useNavigation<Nav>();
  const {user, updateUser} = useAuthStore();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await usersApi.getMe();
      const me = res.data?.user ?? res.data;
      if (me) updateUser(me);
    } catch {}
    await queryClient.invalidateQueries({queryKey: ['profile', user?.username]});
    setRefreshing(false);
  }, [user?.username, updateUser, queryClient]);

  const {data: profileData} = useQuery({
    queryKey: ['profile', user?.username],
    queryFn: () => usersApi.getProfile(user!.username).then(r => r.data),
    enabled: !!user?.username,
  });

  if (!user) {
    return null;
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }>
      <View style={styles.topActions}>
        <AppText variant="heading" style={styles.screenTitle}>
          minor.fm
        </AppText>
        <View style={styles.iconRow}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Search')}>
            <MaterialIcon name="search" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Notifications')}>
            <MaterialIcon
              name="notifications-none"
              size={24}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Settings')}>
            <MaterialIcon name="settings" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.profileSection}>
        <Avatar uri={user.avatar_url} username={user.username} size={80} />
        <AppText variant="subheading" style={styles.username}>
          @{user.username}
        </AppText>
        {user.bio ? (
          <AppText variant="body" style={styles.bio}>
            {user.bio}
          </AppText>
        ) : null}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <AppText variant="subheading">
              {profileData?.followers_count ?? 0}
            </AppText>
            <AppText variant="caption">Takipçi</AppText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <AppText variant="subheading">
              {profileData?.following_count ?? 0}
            </AppText>
            <AppText variant="caption">Takip</AppText>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    paddingBottom: spacing.xl,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  screenTitle: {
    color: colors.primary,
  },
  iconRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  username: {
    marginTop: spacing.xs,
  },
  bio: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
});
