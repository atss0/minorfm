import React, {useCallback, useRef, useState} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcon from '@react-native-vector-icons/material-icons';
import Avatar from '../../components/Avatar';
import AppText from '../../components/AppText';
import {colors, spacing, radius} from '../../theme';
import {timeAgo} from '../../utils/time';
import {useBroadcastChat} from '../../hooks/useBroadcastChat';
import {useAuthStore} from '../../stores/authStore';

interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  user: {username: string; avatar_url: string};
  body: string;
  createdAt: string;
}

export default function ChatScreen() {
  const {user} = useAuthStore();
  const {messages, isConnected, sendMessage} = useBroadcastChat();
  const [text, setText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [newMsgCount, setNewMsgCount] = useState(0);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || !user) return;
    sendMessage(trimmed);
    setText('');
  }, [text, user, sendMessage]);

  const handleScrollEnd = useCallback(({nativeEvent}: {nativeEvent: {contentOffset: {y: number}}}) => {
    const atBottom = nativeEvent.contentOffset.y <= 10;
    setAutoScroll(atBottom);
    if (atBottom) setNewMsgCount(0);
  }, []);

  const scrollToBottom = () => {
    flatListRef.current?.scrollToOffset({offset: 0, animated: true});
    setNewMsgCount(0);
    setAutoScroll(true);
  };

  const renderMessage = ({item}: {item: ChatMessage}) => (
    <Pressable
      style={styles.msgRow}
      onLongPress={() => {
        // TODO: copy to clipboard
      }}>
      <Avatar uri={item.user.avatar_url} username={item.user.username} size={32} />
      <View style={styles.msgContent}>
        <View style={styles.msgHeader}>
          <AppText variant="caption" style={styles.username}>
            {item.user.username}
          </AppText>
          <AppText variant="caption" style={styles.time}>
            {timeAgo(item.createdAt)}
          </AppText>
        </View>
        <AppText variant="body" style={styles.msgText}>
          {item.body}
        </AppText>
      </View>
    </Pressable>
  );

  if (!user) {
    return (
      <View style={styles.authBanner}>
        <AppText variant="caption">Sohbete katılmak için giriş yapmalısın.</AppText>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}>
      {!isConnected && (
        <View style={styles.connectingBar}>
          <AppText variant="caption" style={styles.connectingText}>
            Bağlanıyor...
          </AppText>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={[...messages].reverse()}
        keyExtractor={item => item.id}
        inverted
        renderItem={renderMessage}
        onScroll={handleScrollEnd}
        scrollEventThrottle={150}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        windowSize={10}
        onContentSizeChange={() => {
          if (autoScroll) return;
          setNewMsgCount(c => c + 1);
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
  authBanner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
});
