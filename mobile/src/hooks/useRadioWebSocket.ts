import {useEffect, useRef} from 'react';
import TrackPlayer from 'react-native-track-player';
import {useStreamStore} from '../stores/streamStore';
import {useAuthStore} from '../stores/authStore';

const BASE_WS = 'wss://api.minor.fm';
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];

export function useRadioWebSocket() {
  const {setMeta} = useStreamStore();
  const {accessToken} = useAuthStore();
  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnect = useRef(true);

  useEffect(() => {
    shouldReconnect.current = true;

    const connect = () => {
      const url = accessToken
        ? `${BASE_WS}/ws/radio?token=${accessToken}`
        : `${BASE_WS}/ws/radio`;
      const socket = new WebSocket(url);
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

      socket.onmessage = async event => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'meta') {
            const meta = {artist: msg.artist ?? '', title: msg.title ?? ''};
            setMeta(meta);
            await TrackPlayer.updateNowPlayingMetadata({
              artist: meta.artist,
              title: meta.title,
            });
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
  }, [accessToken, setMeta]);
}
