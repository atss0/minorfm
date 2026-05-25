import React, {useCallback} from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {showMessage} from 'react-native-flash-message';
import RecordingCard from '../../components/RecordingCard';
import Skeleton from '../../components/Skeleton';
import AppText from '../../components/AppText';
import {useAuthStore} from '../../stores/authStore';
import {useRecordingsStore} from '../../stores/recordingsStore';
import {colors, spacing} from '../../theme';
import {recordingsApi} from '../../api/recordings';
import {useRecordingsAudio, RecordingItem} from '../../hooks/useRecordingsAudio';

function RecordingSkeleton() {
  return (
    <View style={styles.skeletonRow}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={styles.skeletonInfo}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={11} />
      </View>
      <Skeleton width={32} height={32} borderRadius={16} />
    </View>
  );
}

export default function ListenScreen() {
  const {currentIndex, isPlaying, progress} = useRecordingsStore();
  const {play, pause, resume} = useRecordingsAudio();
  const {user} = useAuthStore();
  const queryClient = useQueryClient();

  const {data: recordingsData, isLoading, refetch, isRefetching} = useQuery({
    queryKey: ['recordings'],
    queryFn: () => recordingsApi.getList().then(r => r.data),
  });

  const recordings: RecordingItem[] = recordingsData?.recordings ?? recordingsData ?? [];

  const handleRecordingPress = useCallback(
    async (recording: RecordingItem, index: number) => {
      try {
        const isSameAndPlaying = currentIndex === index && isPlaying;
        if (isSameAndPlaying) {
          await pause();
          return;
        }
        if (currentIndex === index && !isPlaying) {
          await resume();
          return;
        }
        await play(recordings, index);
      } catch {
        showMessage({message: 'Kayıt çalınamadı', type: 'danger'});
      }
    },
    [currentIndex, isPlaying, pause, resume, play, recordings],
  );

  const handleLongPress = useCallback(
    (recording: RecordingItem) => {
      if (user?.id !== recording.user_id) return;
      Alert.alert('Kaydı Sil', 'Bu kaydı silmek istediğinden emin misin?', [
        {text: 'İptal', style: 'cancel'},
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await recordingsApi.delete(recording.id);
              await queryClient.invalidateQueries({queryKey: ['recordings']});
              showMessage({message: 'Kayıt silindi', type: 'success'});
            } catch {
              showMessage({message: 'Kayıt silinemedi', type: 'danger'});
            }
          },
        },
      ]);
    },
    [queryClient, user?.id],
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppText variant="label" style={styles.sectionLabel}>Kayıtlar</AppText>
        {[1, 2, 3, 4, 5].map(i => <RecordingSkeleton key={i} />)}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={recordings}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <AppText variant="label" style={styles.sectionLabel}>Kayıtlar</AppText>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <AppText variant="caption">
              Henüz kayıt yok. Rec ile ilk kaydı sen gönder!
            </AppText>
          </View>
        }
        renderItem={({item, index}) => (
          <RecordingCard
            recording={item}
            isPlaying={currentIndex === index && isPlaying}
            progress={currentIndex === index ? progress : 0}
            onPress={() => handleRecordingPress(item, index)}
            onLongPress={user?.id === item.user_id ? () => handleLongPress(item) : undefined}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        windowSize={10}
        contentContainerStyle={recordings.length === 0 ? {flexGrow: 1} : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  sectionLabel: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  empty: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  skeletonInfo: {
    flex: 1,
    gap: spacing.xs,
  },
});
