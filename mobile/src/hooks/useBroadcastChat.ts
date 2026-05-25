import {useEffect, useRef, useCallback} from 'react';
import {useChatStore} from '../stores/chatStore';
import {useAuthStore} from '../stores/authStore';
import {chatApi} from '../api/chat';

const BASE_WS = 'wss://api.minor.fm';
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];

export function useBroadcastChat() {
  const {messages, broadcastRoomId, isConnected, setMessages, setRoomId, setConnected, addMessage} =
    useChatStore();
  const {accessToken} = useAuthStore();
  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnect = useRef(true);

  // Fetch broadcast room on mount
  useEffect(() => {
    chatApi
      .getRooms()
      .then(res => {
        const rooms = res.data?.rooms ?? res.data ?? [];
        const broadcastRoom = rooms.find(
          (r: {type: string; id: string}) => r.type === 'broadcast',
        );
        if (broadcastRoom) {
          setRoomId(broadcastRoom.id);
        }
      })
      .catch(() => {});
  }, [setRoomId]);

  useEffect(() => {
    if (!broadcastRoomId || !accessToken) return;

    shouldReconnect.current = true;

    const connect = () => {
      const socket = new WebSocket(
        `${BASE_WS}/ws/chat/${broadcastRoomId}?token=${accessToken}`,
      );
      ws.current = socket;

      socket.onopen = () => {
        setConnected(true);
        reconnectAttempt.current = 0;
      };

      socket.onclose = () => {
        setConnected(false);
        if (!shouldReconnect.current) return;
        const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt.current, RECONNECT_DELAYS.length - 1)];
        reconnectAttempt.current++;
        reconnectTimer.current = setTimeout(connect, delay);
      };

      socket.onerror = () => socket.close();

      socket.onmessage = event => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'message') addMessage(msg.data);
          else if (msg.type === 'history') setMessages(msg.data);
        } catch {}
      };
    };

    connect();

    return () => {
      shouldReconnect.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      ws.current?.close();
      ws.current = null;
    };
  }, [broadcastRoomId, accessToken, setConnected, addMessage, setMessages]);

  const sendMessage = useCallback(
    (body: string) => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({type: 'message', body}));
      }
    },
    [],
  );

  return {messages, isConnected, sendMessage};
}
