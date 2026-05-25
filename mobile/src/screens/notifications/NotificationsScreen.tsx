import React from 'react';
import {FlatList, StyleSheet, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import MaterialIcon from '@react-native-vector-icons/material-icons';
import {notificationsApi} from '../../api/notifications';
import AppText from '../../components/AppText';
import {colors, spacing} from '../../theme';
import {timeAgo} from '../../utils/time';
import type {Notification} from '../../types/notification';

function notificationText(n: Notification): string {
  const actor = (n.payload?.actor_username as string) ?? 'Biri';
  switch (n.type) {
    case 'follow':
      return `${actor} seni takip etmeye başladı`;
    case 'like':
      return `${actor} kaydını beğendi`;
    case 'comment':
      return `${actor} yorum yaptı`;
    case 'mention':
      return `${actor} senden bahsetti`;
    default:
      return `${actor} bir bildirim gönderdi`;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function notificationIcon(type: string): any {
  switch (type) {
    case 'follow':
      return 'person-add';
    case 'like':
      return 'favorite';
    case 'comment':
      return 'chat-bubble';
    case 'mention':
      return 'alternate-email';
    default:
      return 'notifications';
  }
}

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const {data, isLoading, refetch, isRefetching} = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getList().then(r => r.data),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () =>
      queryClient.invalidateQueries({queryKey: ['notifications']}),
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () =>
      queryClient.invalidateQueries({queryKey: ['notifications']}),
  });

  const notifications: Notification[] =
    data?.notifications ?? data ?? [];
  const hasUnread = notifications.some(n => !n.read);

  return (
    <View style={styles.root}>
      <View style={styles.navHeader}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}>
          <MaterialIcon name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <AppText variant="subheading">Bildirimler</AppText>
        {hasUnread ? (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => markAllMutation.mutate()}>
            <MaterialIcon name="done-all" size={22} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        renderItem={({item}) => (
          <TouchableOpacity
            style={[styles.item, !item.read && styles.itemUnread]}
            onPress={() => !item.read && markOneMutation.mutate(item.id)}
            activeOpacity={0.75}>
            <View style={styles.notifIcon}>
              <MaterialIcon
                name={notificationIcon(item.type)}
                size={20}
                color={item.read ? colors.textSecondary : colors.primary}
              />
            </View>
            <View style={styles.notifContent}>
              <AppText variant="body" style={styles.notifText}>
                {notificationText(item)}
              </AppText>
              <AppText variant="caption">{timeAgo(item.created_at)}</AppText>
            </View>
            {!item.read && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <AppText variant="caption">Bildirim yok</AppText>
            </View>
          ) : null
        }
        contentContainerStyle={
          notifications.length === 0 ? {flexGrow: 1} : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  iconBtn: {width: 40, height: 40, justifyContent: 'center', alignItems: 'center'},
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  itemUnread: {
    backgroundColor: colors.surfaceHover,
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifContent: {flex: 1, gap: 3},
  notifText: {fontSize: 14},
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
});
