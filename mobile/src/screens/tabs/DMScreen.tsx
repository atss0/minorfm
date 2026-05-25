import React from 'react';
import {FlatList, StyleSheet, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useQuery} from '@tanstack/react-query';
import MaterialIcon from '@react-native-vector-icons/material-icons';
import {dmApi} from '../../api/dm';
import Avatar from '../../components/Avatar';
import AppText from '../../components/AppText';
import {colors, spacing} from '../../theme';
import {timeAgo} from '../../utils/time';
import type {AppStackParamList} from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<AppStackParamList>;

interface Room {
  id: string;
  name: string;
  type: string;
  avatar_url?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
}

export default function DMScreen() {
  const navigation = useNavigation<Nav>();

  const {data, isRefetching, refetch} = useQuery({
    queryKey: ['dm-rooms'],
    queryFn: () => dmApi.getRooms().then(r => r.data),
  });

  const rooms: Room[] = data?.rooms ?? data ?? [];

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <AppText variant="subheading">Mesajlar</AppText>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.navigate('Search', {mode: 'dm'})}>
          <MaterialIcon name="edit" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={rooms}
        keyExtractor={item => item.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        renderItem={({item}) => (
          <TouchableOpacity
            style={styles.roomItem}
            onPress={() =>
              navigation.navigate('DMConversation', {
                roomId: item.id,
                name: item.name,
              })
            }
            activeOpacity={0.75}>
            <Avatar uri={item.avatar_url} username={item.name} size={50} />
            <View style={styles.roomInfo}>
              <View style={styles.roomRow}>
                <AppText
                  variant="body"
                  style={styles.roomName}
                  numberOfLines={1}>
                  {item.name}
                </AppText>
                {item.last_message_at ? (
                  <AppText variant="caption">
                    {timeAgo(item.last_message_at)}
                  </AppText>
                ) : null}
              </View>
              <AppText variant="caption" numberOfLines={1}>
                {item.last_message ?? 'Henüz mesaj yok'}
              </AppText>
            </View>
            {(item.unread_count ?? 0) > 0 && (
              <View style={styles.badge}>
                <AppText style={styles.badgeText}>{item.unread_count}</AppText>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <AppText variant="caption">Henüz mesaj yok</AppText>
          </View>
        }
        contentContainerStyle={rooms.length === 0 ? {flexGrow: 1} : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  iconBtn: {width: 40, height: 40, justifyContent: 'center', alignItems: 'center'},
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  roomInfo: {flex: 1, gap: 3},
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roomName: {fontWeight: '600', flex: 1},
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {fontSize: 11, fontWeight: '700', color: colors.textPrimary},
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
});
