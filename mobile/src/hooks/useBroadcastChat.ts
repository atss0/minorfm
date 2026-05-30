import {useEffect, useRef, useCallback} from 'react';
import {useChatStore} from '../stores/chatStore';
import {useAuthStore} from '../stores/authStore';
import {chatApi} from '../api/chat';
import {usersApi} from '../api/users';
import {heartTapBridge} from '../utils/heartTapBridge';
import NetInfo from '@react-native-community/netinfo';

const BASE_WS = 'wss://api.minor.fm';
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];
// If a socket stays in CONNECTING longer than this, force-close it so the
// reconnect chain can retry (common on Android when network drops mid-connect).
const CONNECT_TIMEOUT_MS = 8000;

export function useBroadcastChat() {
  const {
    messages, broadcastRoomId, isConnected,
    setMessages, setRoomId, setConnected,
    addMessage, addHeartTap,
    setOnlineUsers, upsertOnlineUser, removeOnlineUser,
  } = useChatStore();
  const {accessToken} = useAuthStore();
  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnect = useRef(true);

  useEffect(() => {
    chatApi
      .getRooms()
      .then(res => {
        const rooms = res.data?.rooms ?? res.data ?? [];
        const broadcastRoom = rooms.find(
          (r: {type: string; id: string}) => r.type === 'broadcast',
        );
        if (broadcastRoom) setRoomId(broadcastRoom.id);
      })
      .catch(() => {});
  }, [setRoomId]);

  const connect = useCallback(() => {
    if (!broadcastRoomId || !accessToken) return;

    // Clear any pending reconnect timer
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }

    // Close any existing socket
    if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
      ws.current.onclose = null; // prevent double-reconnect
      ws.current.close();
      ws.current = null;
    }

    // Clear stale connect timeout
    if (connectTimer.current) {
      clearTimeout(connectTimer.current);
      connectTimer.current = null;
    }

    const socket = new WebSocket(
      `${BASE_WS}/ws/chat/${broadcastRoomId}?token=${accessToken}`,
    );
    ws.current = socket;

    // Force-close if CONNECTING state lasts too long (network down on Android)
    connectTimer.current = setTimeout(() => {
      if (socket.readyState !== WebSocket.OPEN) {
        socket.close();
      }
      connectTimer.current = null;
    }, CONNECT_TIMEOUT_MS);

    socket.onopen = async () => {
      if (connectTimer.current) {
        clearTimeout(connectTimer.current);
        connectTimer.current = null;
      }
      setConnected(true);
      reconnectAttempt.current = 0;
      heartTapBridge.send = (effect: 'heart' | 'clap') => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({type: 'heart_tap', effect}));
        }
      };
      try {
        const [msgRes, onlineRes] = await Promise.all([
          chatApi.getMessages(broadcastRoomId),
          usersApi.getOnline(),
        ]);
        const history: any[] = msgRes.data?.data ?? [];
        setMessages(
          history.map(m => ({
            id: m.id,
            roomId: m.room_id,
            userId: m.user_id,
            user: m.user ?? {username: m.username ?? '', avatar_url: m.avatar_url ?? ''},
            body: m.body,
            createdAt: m.created_at,
          })),
        );
        const users = Array.isArray(onlineRes.data) ? onlineRes.data : [];
        setOnlineUsers(users);
      } catch {}
    };

    socket.onclose = () => {
      heartTapBridge.send = null;
      setConnected(false);
      if (!shouldReconnect.current) return;
      const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt.current, RECONNECT_DELAYS.length - 1)];
      reconnectAttempt.current++;
      reconnectTimer.current = setTimeout(() => connect(), delay);
    };

    socket.onerror = () => socket.close();

    socket.onmessage = event => {
      try {
        const raw = JSON.parse(event.data);
        if (raw.type === 'heart_tap') {
          addHeartTap({
            userId: raw.user_id,
            username: raw.username ?? '',
            avatarUrl: raw.avatar_url ?? '',
            effect: raw.effect === 'clap' ? 'clap' : 'heart',
          });
          return;
        }
        if (raw.type === 'presence') {
          if (raw.action === 'join') {
            upsertOnlineUser({id: raw.user_id, username: raw.username, avatar_url: raw.avatar_url});
          } else if (raw.action === 'leave') {
            removeOnlineUser(raw.user_id);
          }
          return;
        }
        if (raw.id && raw.body) {
          addMessage({
            id: raw.id,
            roomId: raw.room_id,
            userId: raw.user_id,
            user: {username: raw.username, avatar_url: raw.avatar_url},
            body: raw.body,
            createdAt: raw.created_at,
          });
        }
      } catch {}
    };
  }, [broadcastRoomId, accessToken, setConnected, addMessage, addHeartTap, setMessages, setOnlineUsers, upsertOnlineUser, removeOnlineUser]);

  useEffect(() => {
    if (!broadcastRoomId || !accessToken) return;

    shouldReconnect.current = true;
    connect();

    return () => {
      shouldReconnect.current = false;
      heartTapBridge.send = null;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (connectTimer.current) clearTimeout(connectTimer.current);
      if (ws.current) {
        ws.current.onclose = null;
        ws.current.close();
        ws.current = null;
      }
    };
  }, [broadcastRoomId, accessToken, connect]);

  // Re-connect immediately when network comes back online
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected ?? false;
      if (online && shouldReconnect.current) {
        const isClosed =
          !ws.current ||
          ws.current.readyState === WebSocket.CLOSED ||
          ws.current.readyState === WebSocket.CLOSING;
        if (isClosed) {
          reconnectAttempt.current = 0;
          connect();
        }
      }
    });
    return unsubscribe;
  }, [connect]);

  const sendMessage = useCallback((body: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({body}));
    }
  }, []);

  return {messages, isConnected, sendMessage};
}
