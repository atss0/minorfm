import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcon from '@react-native-vector-icons/material-icons';
import {useQuery} from '@tanstack/react-query';
import {usersApi} from '../api/users';
import Avatar from './Avatar';
import AppText from './AppText';
import {colors, spacing, radius} from '../theme';

interface User {
  id: string;
  username: string;
  avatar_url: string;
  bio?: string;
}

interface Props {
  visible: boolean;
  userId: string;
  type: 'followers' | 'following';
  onClose: () => void;
  onUserPress: (username: string) => void;
}

export default function FollowListModal({visible, userId, type, onClose, onUserPress}: Props) {
  const {data, isLoading} = useQuery<User[]>({
    queryKey: ['followList', userId, type],
    queryFn: () =>
      (type === 'followers'
        ? usersApi.getFollowers(userId)
        : usersApi.getFollowing(userId)
      ).then(r => r.data),
    enabled: visible && !!userId,
  });

  const users: User[] = Array.isArray(data) ? data : [];
  const title = type === 'followers' ? 'Takipçiler' : 'Takip Edilenler';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <AppText variant="subheading">{title}</AppText>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcon name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : users.length === 0 ? (
            <View style={styles.empty}>
              <AppText variant="caption">
                {type === 'followers' ? 'Henüz takipçi yok' : 'Henüz takip edilen yok'}
              </AppText>
            </View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={styles.userRow}
                  onPress={() => {
                    onClose();
                    onUserPress(item.username);
                  }}
                  activeOpacity={0.75}>
                  <Avatar uri={item.avatar_url} username={item.username} size={40} />
                  <View style={styles.userInfo}>
                    <AppText variant="body" style={styles.username}>
                      {item.username}
                    </AppText>
                    {item.bio ? (
                      <AppText variant="caption" numberOfLines={1}>
                        {item.bio}
                      </AppText>
                    ) : null}
                  </View>
                  <MaterialIcon name="chevron-right" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '70%',
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loading: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  empty: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  list: {
    paddingTop: spacing.xs,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  userInfo: {flex: 1, gap: 2},
  username: {fontWeight: '600'},
});
