import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import MaterialIcon from '@react-native-vector-icons/material-icons';
import {useAuthStore} from '../../stores/authStore';
import {dmApi} from '../../api/dm';
import Avatar from '../../components/Avatar';
import AppText from '../../components/AppText';
import {colors, spacing, radius} from '../../theme';
import {timeAgo} from '../../utils/time';
import type {AppStackParamList} from '../../navigation/RootNavigator';

type Route = RouteProp<AppStackParamList, 'DMConversation'>;

interface Message {
  id: string;
  user_id: string;
  user: {username: string; avatar_url: string};
  body: string;
  created_at: string;
}

const BASE_WS = 'wss://api.minor.fm';
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];

export default function DMConversationScreen() {
  const navigation = useNavigation();
  const {params} = useRoute<Route>();
  const {user, accessToken} = useAuthStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnect = useRef(true);
  const sendingRef = useRef(false);

  // Load message history via HTTP
  useEffect(() => {
    dmApi
      .getMessages(params.roomId)
      .then(res => {
        // Backend returns oldest-first after its internal reverse; keep that order.
        // FlatList is inverted so data[0] = newest = shown at bottom.
        const raw: Record<string, unknown>[] = res.data?.messages ?? res.data ?? [];
        const normalized: Message[] = raw.map(m => ({
          id: m.id as string,
          user_id: (m.user_id ?? m.userId) as string,
          user: m.user as Message['user'],
          body: m.body as string,
          created_at: (m.created_at ?? m.createdAt) as string,
        }));
        // Backend sends oldest-first; for inverted FlatList we want newest-first.
        setMessages(normalized.reverse());
      })
      .catch(() => {});
  }, [params.roomId]);

  // WebSocket connection with reconnect backoff
  useEffect(() => {
    if (!accessToken) {
      return;
    }
    shouldReconnect.current = true;

    const connect = () => {
      const socket = new WebSocket(
        `${BASE_WS}/ws/chat/${params.roomId}?token=${accessToken}`,
      );
      ws.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        reconnectAttempt.current = 0;
      };

      socket.onclose = () => {
        setIsConnected(false);
        if (!shouldReconnect.current) {
          return;
        }
        const delay =
          RECONNECT_DELAYS[
            Math.min(reconnectAttempt.current, RECONNECT_DELAYS.length - 1)
          ];
        reconnectAttempt.current++;
        reconnectTimer.current = setTimeout(connect, delay);
      };

      socket.onerror = () => socket.close();

      // Backend broadcasts: {id, room_id, user_id, username, avatar_url, body, created_at}
      socket.onmessage = event => {
        try {
          const raw = JSON.parse(event.data);
          if (!raw.id || !raw.body) {
            return;
          }
          const msg: Message = {
            id: raw.id,
            user_id: raw.user_id,
            user: {
              username: raw.username,
              avatar_url: raw.avatar_url,
            },
            body: raw.body,
            created_at: raw.created_at,
          };
          // Prepend so newest stays at index 0 (inverted FlatList = bottom)
          setMessages(prev =>
            prev.some(m => m.id === msg.id) ? prev : [msg, ...prev],
          );
        } catch {}
      };
    };

    connect();

    return () => {
      shouldReconnect.current = false;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      ws.current?.close();
      ws.current = null;
    };
  }, [params.roomId, accessToken]);

  const handleSend = useCallback(() => {
    if (sendingRef.current) {
      return;
    }
    const text = input.trim();
    if (!text || ws.current?.readyState !== WebSocket.OPEN) {
      return;
    }
    sendingRef.current = true;
    setTimeout(() => {
      sendingRef.current = false;
    }, 500);
    ws.current.send(JSON.stringify({body: text}));
    setInput('');
  }, [input]);

  const renderMessage = useCallback(
    ({item}: {item: Message}) => {
      const isOwn = item.user_id === user?.id;
      return (
        <View style={isOwn ? styles.msgRowOwn : styles.msgRow}>
          {!isOwn && (
            <Avatar
              uri={item.user?.avatar_url}
              username={item.user?.username ?? ''}
              size={30}
            />
          )}
          <View style={isOwn ? styles.bubbleOwn : styles.bubbleOther}>
            {!isOwn && (
              <AppText variant="caption" style={styles.senderName}>
                {item.user?.username}
              </AppText>
            )}
            <AppText style={styles.msgText}>{item.body}</AppText>
            <AppText
              variant="caption"
              style={isOwn ? styles.msgTimeOwn : styles.msgTime}>
              {timeAgo(item.created_at)}
            </AppText>
          </View>
        </View>
      );
    },
    [user?.id],
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior="padding"
        keyboardVerticalOffset={0}>
        <View style={styles.navHeader}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.goBack()}>
            <MaterialIcon
              name="arrow-back"
              size={24}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <AppText variant="subheading">{params.name ?? 'Mesaj'}</AppText>
            {isConnected && <View style={styles.onlineDot} />}
          </View>
          <View style={styles.iconBtn} />
        </View>

        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Mesaj yaz..."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim()}
            activeOpacity={0.7}>
            <MaterialIcon name="send" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
  kav: {flex: 1},
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.online,
  },
  messageList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    marginVertical: 2,
  },
  msgRowOwn: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    marginVertical: 2,
  },
  bubbleOther: {
    maxWidth: '75%',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    gap: 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleOwn: {
    maxWidth: '75%',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    gap: 2,
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  senderName: {
    color: colors.primary,
    fontWeight: '600',
  },
  msgText: {
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  msgTime: {
    fontSize: 10,
    color: colors.textSecondary,
    alignSelf: 'flex-end',
  },
  msgTimeOwn: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    alignSelf: 'flex-end',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    color: colors.textPrimary,
    fontSize: 15,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
