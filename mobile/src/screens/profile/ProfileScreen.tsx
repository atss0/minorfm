import React, {useCallback} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import TrackPlayer from 'react-native-track-player';
import MaterialIcon from '@react-native-vector-icons/material-icons';
import {useAuthStore} from '../../stores/authStore';
import {usersApi} from '../../api/users';
import {dmApi} from '../../api/dm';
import {recordingsApi} from '../../api/recordings';
import {useRecordingsStore} from '../../stores/recordingsStore';
import Avatar from '../../components/Avatar';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import RecordingCard from '../../components/RecordingCard';
import {colors, spacing} from '../../theme';
import type {AppStackParamList} from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Route = RouteProp<AppStackParamList, 'Profile'>;

interface Recording {
  id: string;
  user_id: string;
  user: {username: string; avatar_url: string};
  audio_url: string;
  duration: number;
  title: string | null;
  created_at: string;
}

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const {params} = useRoute<Route>();
  const queryClient = useQueryClient();
  const {user: me} = useAuthStore();
  const {currentIndex, isPlaying, progress, setQueue, setIndex, setPlaying} =
    useRecordingsStore();

  const {data: profileData, isLoading} = useQuery({
    queryKey: ['profile', params.username],
    queryFn: () => usersApi.getProfile(params.username).then(r => r.data),
  });

  const {data: recData} = useQuery({
    queryKey: ['recordings'],
    queryFn: () => recordingsApi.getList(1).then(r => r.data),
  });

  const allRecordings: Recording[] = recData?.recordings ?? recData ?? [];
  const userRecordings = allRecordings.filter(r => r.user_id === profileData?.id);

  const followMutation = useMutation({
    mutationFn: () => usersApi.follow(profileData!.id),
    onSuccess: () =>
      queryClient.invalidateQueries({queryKey: ['profile', params.username]}),
  });

  const handleDM = async () => {
    try {
      const res = await dmApi.createRoom([profileData!.id]);
      const room = res.data?.room ?? res.data;
      navigation.navigate('DMConversation', {
        roomId: room.id,
        name: params.username,
      });
    } catch {}
  };

  const handleRecordingPress = useCallback(
    async (recording: Recording, idx: number) => {
      if (currentIndex === idx && isPlaying) {
        await TrackPlayer.pause();
        setPlaying(false);
        return;
      }
      setQueue(userRecordings);
      setIndex(idx);
      setPlaying(true);
      await TrackPlayer.reset();
      await TrackPlayer.add(
        userRecordings.map(r => ({
          id: r.id,
          url: r.audio_url,
          title: r.title ?? 'Adsız kayıt',
          artist: r.user.username,
          duration: r.duration,
        })),
      );
      await TrackPlayer.skip(idx);
      await TrackPlayer.play();
    },
    [currentIndex, isPlaying, userRecordings, setIndex, setPlaying, setQueue],
  );

  const isOwnProfile = me?.username === params.username;

  return (
    <View style={styles.root}>
      <View style={styles.navHeader}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}>
          <MaterialIcon name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <AppText variant="subheading">@{params.username}</AppText>
        <View style={styles.iconBtn} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}>
          <View style={styles.profileSection}>
            <Avatar
              uri={profileData?.avatar_url}
              username={params.username}
              size={80}
            />
            <AppText variant="subheading" style={styles.username}>
              @{params.username}
            </AppText>
            {profileData?.bio ? (
              <AppText variant="body" style={styles.bio}>
                {profileData.bio}
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
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <AppText variant="subheading">{userRecordings.length}</AppText>
                <AppText variant="caption">Kayıt</AppText>
              </View>
            </View>

            {!isOwnProfile && (
              <View style={styles.actionRow}>
                <Button
                  label={profileData?.is_following ? 'Takip Ediliyor' : 'Takip Et'}
                  variant={profileData?.is_following ? 'ghost' : 'primary'}
                  onPress={() => followMutation.mutate()}
                  loading={followMutation.isPending}
                  style={styles.actionBtn}
                />
                <TouchableOpacity style={styles.dmBtn} onPress={handleDM}>
                  <MaterialIcon
                    name="chat-bubble-outline"
                    size={22}
                    color={colors.textPrimary}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <AppText variant="label" style={styles.sectionTitle}>
              Kayıtlar
            </AppText>
            {userRecordings.length === 0 ? (
              <View style={styles.emptyState}>
                <AppText variant="caption">Henüz kayıt yok</AppText>
              </View>
            ) : (
              userRecordings.map((r, idx) => (
                <RecordingCard
                  key={r.id}
                  recording={r}
                  isPlaying={currentIndex === idx && isPlaying}
                  progress={currentIndex === idx ? progress : 0}
                  onPress={() => handleRecordingPress(r, idx)}
                />
              ))
            )}
          </View>
        </ScrollView>
      )}
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
  centered: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  scroll: {paddingBottom: spacing.xl},
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  username: {marginTop: spacing.xs},
  bio: {textAlign: 'center', color: colors.textSecondary, fontSize: 14},
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.lg,
  },
  statItem: {alignItems: 'center', gap: 2},
  statDivider: {width: 1, height: 24, backgroundColor: colors.border},
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: spacing.lg,
  },
  actionBtn: {flex: 1},
  dmBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {marginTop: spacing.sm},
  sectionTitle: {paddingHorizontal: spacing.md, paddingBottom: spacing.sm},
  emptyState: {padding: spacing.xl, alignItems: 'center'},
});
