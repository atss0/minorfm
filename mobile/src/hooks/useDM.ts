import {useCallback, useEffect, useRef} from 'react';
import {useDMStore} from '../stores/dmStore';
import {useUIStore} from '../stores/uiStore';
import {useAuthStore} from '../stores/authStore';
import {dmApi} from '../api/dm';

const BASE_WS = 'wss://api.minor.fm';
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];

export function useDM(roomId: string | null) {
  const {addMessage, setMessages, setConnected} = useDMStore();
  const {setDMUnreadCount} = useUIStore();
  const {accessToken} = useAuthStore();
  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnect = useRef(true);

  // Fetch message history on room change via REST fallback
  useEffect(() => {
    if (!roomId) return;
    dmApi
      .getMessages(roomId)
      .then(res => {
        const msgs = res.data?.messages ?? res.data ?? [];
        setMessages(msgs);
      })
      .catch(() => {});
  }, [roomId, setMessages]);

  useEffect(() => {
    if (!roomId || !accessToken) return;
    shouldReconnect.current = true;

    const connect = () => {
      const socket = new WebSocket(
        `${BASE_WS}/ws/chat/${roomId}?token=${accessToken}`,
      );
      ws.current = socket;

      socket.onopen = () => {
        setConnected(true);
        reconnectAttempt.current = 0;
      };

      socket.onclose = () => {
        ws.current = null;
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
          if (msg.type === 'message') {
            addMessage(msg.data);
          } else if (msg.type === 'history') {
            setMessages(msg.data);
          } else if (msg.type === 'unread_count') {
            setDMUnreadCount(msg.count as number);
          }
        } catch {}
      };
    };

    connect();

    return () => {
      shouldReconnect.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      ws.current?.close();
      ws.current = null;
      setConnected(false);
    };
  }, [roomId, accessToken, addMessage, setMessages, setConnected, setDMUnreadCount]);

  const sendMessage = useCallback((body: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({type: 'message', body}));
    }
  }, []);

  return {sendMessage};
}
