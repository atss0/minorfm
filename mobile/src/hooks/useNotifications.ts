import {useEffect, useRef} from 'react';
import {useUIStore} from '../stores/uiStore';
import {useAuthStore} from '../stores/authStore';
import {notificationsApi} from '../api/notifications';

const BASE_WS = 'wss://api.minor.fm';
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];

export function useNotifications() {
  const {setNotificationCount} = useUIStore();
  const {accessToken} = useAuthStore();
  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnect = useRef(true);

  // Fetch initial unread count via REST
  useEffect(() => {
    if (!accessToken) return;
    notificationsApi
      .getList()
      .then(res => {
        const list = res.data?.notifications ?? res.data ?? [];
        const unread = Array.isArray(list) ? list.filter((n: {read: boolean}) => !n.read).length : 0;
        setNotificationCount(unread);
      })
      .catch(() => {});
  }, [accessToken, setNotificationCount]);

  useEffect(() => {
    if (!accessToken) return;
    shouldReconnect.current = true;

    const connect = () => {
      const socket = new WebSocket(
        `${BASE_WS}/ws/notifications?token=${accessToken}`,
      );
      ws.current = socket;

      socket.onopen = () => {
        reconnectAttempt.current = 0;
      };

      socket.onclose = () => {
        ws.current = null;
        if (!shouldReconnect.current) return;
        const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt.current, RECONNECT_DELAYS.length - 1)];
        reconnectAttempt.current++;
        reconnectTimer.current = setTimeout(connect, delay);
      };

      socket.onerror = () => socket.close();

      socket.onmessage = event => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'unread_count') {
            setNotificationCount(msg.count as number);
          } else if (msg.type === 'notification') {
            setNotificationCount((useUIStore.getState().notificationCount) + 1);
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
    };
  }, [accessToken, setNotificationCount]);
}
