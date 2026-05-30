import React, {useCallback, useRef, useState} from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialIcon from '@react-native-vector-icons/material-icons';
import {showMessage} from 'react-native-flash-message';
import Avatar from '../../components/Avatar';
import AppText from '../../components/AppText';
import RecordingCard from '../../components/RecordingCard';
import {colors, spacing, radius} from '../../theme';
import {timeAgo} from '../../utils/time';
import {useBroadcastChat} from '../../hooks/useBroadcastChat';
import {useRecordingsPlayer} from '../../hooks/useRecordingsPlayer';
import type {RecordingItem} from '../../hooks/useRecordingsAudio';
import {useAuthStore} from '../../stores/authStore';
import {recordingsApi} from '../../api/recordings';
import type {AppStackParamList} from '../../navigation/RootNavigator';

interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  user: {username: string; avatar_url: string};
  body: string;
  createdAt: string;
}

type FeedItem =
  | {kind: 'message'; id: string; ts: string; data: ChatMessage}
  | {kind: 'recording'; id: string; ts: string; data: RecordingItem};

// Fixed inner container height of CustomTabBar (see CustomTabBar.tsx styles.container)
const TAB_BAR_HEIGHT = 56;

type Nav = NativeStackNavigationProp<AppStackParamList>;

export default function ChatScreen() {
  const navigation = useNavigation<Nav>();
  const {user} = useAuthStore();
  const insets = useSafeAreaInsets();
  const {messages, isConnected, sendMessage} = useBroadcastChat();
  const [text, setText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const autoScrollRef = useRef(true);
  const sendingRef = useRef(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [newMsgCount, setNewMsgCount] = useState(0);

  const setAutoScrollState = (val: boolean) => {
    autoScrollRef.current = val;
    setAutoScroll(val);
  };

  const {currentIndex, isPlaying, progress, play} = useRecordingsPlayer();
  const queryClient = useQueryClient();

  const {data: recData, isRefetching, refetch} = useQuery({
    queryKey: ['recordings'],
    queryFn: () => recordingsApi.getList().then(r => r.data),
    refetchInterval: 30_000,
  });
  const recordings: RecordingItem[] = recData?.recordings ?? recData ?? [];

  // Merge messages + recordings, oldest first (top-to-bottom feed)
  const feedItems: FeedItem[] = [
    ...messages.map(m => ({kind: 'message' as const, id: m.id, ts: m.createdAt, data: m})),
    ...recordings.map(r => ({kind: 'recording' as const, id: r.id, ts: r.created_at, data: r})),
  ].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

  const handleRecordingPress = useCallback(
    async (recording: RecordingItem, listIndex: number) => {
      try {
        const recIndex = recordings.indexOf(recording);
        if (recIndex === -1) return;
        // useRecordingsPlayer.play() handles pause/resume internally via
        // isSameTrack check — don't call resume() here which would resume
        // the radio stream when store index happens to match by coincidence.
        await play(recordings, recIndex);
      } catch {
        showMessage({message: 'Kayıt çalınamadı', type: 'danger'});
      }
    },
    [play, recordings],
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

  const handleSend = useCallback(() => {
    if (sendingRef.current) return;
    const trimmed = text.trim();
    if (!trimmed || !user) return;
    sendingRef.current = true;
    setTimeout(() => { sendingRef.current = false; }, 500);
    sendMessage(trimmed);
    setText('');
    setAutoScrollState(true);
    setNewMsgCount(0);
  }, [text, user, sendMessage]);

  const handleScrollEnd = useCallback(
    ({nativeEvent}: {nativeEvent: {contentOffset: {y: number}; contentSize: {height: number}; layoutMeasurement: {height: number}}}) => {
      const {contentOffset, contentSize, layoutMeasurement} = nativeEvent;
      const atBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 40;
      setAutoScrollState(atBottom);
      if (atBottom) setNewMsgCount(0);
    },
    [],
  );

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({animated: true});
    setNewMsgCount(0);
    setAutoScrollState(true);
  };

  const renderItem = ({item, index}: {item: FeedItem; index: number}) => {
    if (item.kind === 'recording') {
      const recIndex = recordings.indexOf(item.data);
      return (
        <RecordingCard
          recording={item.data}
          isPlaying={currentIndex === recIndex && isPlaying}
          progress={currentIndex === recIndex ? progress : 0}
          onPress={() => handleRecordingPress(item.data, index)}
          onLongPress={user?.id === item.data.user_id ? () => handleLongPress(item.data) : undefined}
        />
      );
    }

    const msg = item.data;
    const isOwn = msg.userId === user?.id;

    if (isOwn) {
      return (
        <View style={styles.ownRow}>
          <View style={styles.ownBubble}>
            <AppText variant="caption" style={styles.ownTime}>
              {timeAgo(msg.createdAt)}
            </AppText>
            <AppText variant="body" style={styles.ownText}>
              {msg.body}
            </AppText>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.msgRow}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile', {username: msg.user.username})}
          activeOpacity={0.75}>
          <Avatar uri={msg.user.avatar_url} username={msg.user.username} size={32} />
        </TouchableOpacity>
        <View style={styles.msgContent}>
          <View style={styles.msgHeader}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile', {username: msg.user.username})}
              activeOpacity={0.7}>
              <AppText variant="caption" style={styles.username}>
                {msg.user.username}
              </AppText>
            </TouchableOpacity>
            <AppText variant="caption" style={styles.time}>
              {timeAgo(msg.createdAt)}
            </AppText>
          </View>
          <AppText variant="body" style={styles.msgText}>
            {msg.body}
          </AppText>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={TAB_BAR_HEIGHT + insets.bottom}>

      {user && !isConnected && (
        <View style={styles.connectingBar}>
          <AppText variant="caption" style={styles.connectingText}>
            Bağlanıyor...
          </AppText>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={feedItems}
        keyExtractor={item => item.kind + item.id}
        renderItem={renderItem}
        onScroll={handleScrollEnd}
        scrollEventThrottle={200}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        windowSize={10}
        ListEmptyComponent={
          <View style={styles.empty}>
            <AppText variant="caption">Henüz mesaj yok</AppText>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onContentSizeChange={() => {
          if (autoScrollRef.current) {
            setTimeout(() => flatListRef.current?.scrollToEnd({animated: true}), 50);
          } else {
            setNewMsgCount(c => c + 1);
          }
        }}
      />

      {newMsgCount > 0 && !autoScroll && (
        <TouchableOpacity style={styles.newMsgBanner} onPress={scrollToBottom}>
          <AppText variant="caption" style={styles.newMsgText}>
            {newMsgCount} yeni mesaj
          </AppText>
          <MaterialIcon name="keyboard-arrow-down" size={16} color={colors.textPrimary} />
        </TouchableOpacity>
      )}

      {user ? (
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Mesaj yaz..."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit
          />
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim()}
            activeOpacity={0.75}>
            <MaterialIcon name="send" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.authBar}>
          <AppText variant="caption" style={styles.authText}>
            Sohbete katılmak için giriş yapmalısın
          </AppText>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  connectingBar: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  connectingText: {
    color: colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
    flexGrow: 1,
  },
  msgRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs + 1,
  },
  msgContent: {
    flex: 1,
    gap: 2,
  },
  msgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  username: {
    color: colors.primary,
    fontWeight: '600',
  },
  time: {
    color: colors.textSecondary,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
  },
  ownRow: {
    alignItems: 'flex-end',
    paddingVertical: spacing.xs + 1,
  },
  ownBubble: {
    maxWidth: '75%',
    backgroundColor: 'rgba(188, 2, 45, 0.15)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(188, 2, 45, 0.3)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    gap: 2,
  },
  ownTime: {
    color: colors.textSecondary,
    textAlign: 'right',
  },
  ownText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  newMsgBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  newMsgText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.sm,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
    maxHeight: 100,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.border,
  },
  authBar: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  authText: {
    color: colors.textSecondary,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
});
