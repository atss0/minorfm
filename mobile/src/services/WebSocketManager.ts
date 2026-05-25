import {AppState, AppStateStatus} from 'react-native';
import {useAuthStore} from '../stores/authStore';

const BASE_WS = 'wss://api.minor.fm';
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];

interface ChannelConfig {
  path: string;
  onMessage: (data: unknown) => void;
  onOpen?: () => void;
  onClose?: () => void;
  requiresAuth?: boolean;
}

interface ManagedChannel {
  config: ChannelConfig;
  socket: WebSocket | null;
  reconnectAttempt: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  shouldConnect: boolean;
}

class WebSocketManager {
  private channels: Map<string, ManagedChannel> = new Map();
  private appStateSubscription: {remove: () => void} | null = null;

  constructor() {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppState,
    );
  }

  private handleAppState = (state: AppStateStatus) => {
    if (state === 'active') {
      // Re-connect all channels that were open before backgrounding
      this.channels.forEach((channel, key) => {
        if (
          channel.shouldConnect &&
          (!channel.socket || channel.socket.readyState !== WebSocket.OPEN)
        ) {
          if (!channel.reconnectTimer) {
            this.scheduleReconnect(key, 0);
          }
        }
      });
    } else if (state === 'background') {
      // Close sockets cleanly but preserve channel configs
      this.channels.forEach(channel => {
        if (channel.reconnectTimer) {
          clearTimeout(channel.reconnectTimer);
          channel.reconnectTimer = null;
        }
        channel.socket?.close();
        channel.socket = null;
      });
    }
  };

  private scheduleReconnect(key: string, delayOverride?: number) {
    const channel = this.channels.get(key);
    if (!channel || !channel.shouldConnect) return;

    const delay =
      delayOverride !== undefined
        ? delayOverride
        : RECONNECT_DELAYS[Math.min(channel.reconnectAttempt, RECONNECT_DELAYS.length - 1)];

    channel.reconnectTimer = setTimeout(() => {
      channel.reconnectTimer = null;
      if (channel.shouldConnect) {
        this.createSocket(key);
      }
    }, delay);

    if (delayOverride === undefined) {
      channel.reconnectAttempt++;
    }
  }

  private createSocket(key: string) {
    const channel = this.channels.get(key);
    if (!channel) return;

    const token = useAuthStore.getState().accessToken;
    const baseUrl = `${BASE_WS}${channel.config.path}`;
    const url =
      token && channel.config.requiresAuth !== false
        ? `${baseUrl}?token=${token}`
        : baseUrl;

    const socket = new WebSocket(url);
    channel.socket = socket;

    socket.onopen = () => {
      channel.reconnectAttempt = 0;
      channel.config.onOpen?.();
    };

    socket.onclose = () => {
      channel.socket = null;
      channel.config.onClose?.();
      if (channel.shouldConnect) {
        this.scheduleReconnect(key);
      }
    };

    socket.onerror = () => socket.close();

    socket.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        channel.config.onMessage(data);
      } catch {}
    };
  }

  connect(key: string, config: ChannelConfig) {
    this.disconnect(key);
    this.channels.set(key, {
      config,
      socket: null,
      reconnectAttempt: 0,
      reconnectTimer: null,
      shouldConnect: true,
    });
    this.createSocket(key);
  }

  send(key: string, data: unknown) {
    const channel = this.channels.get(key);
    if (channel?.socket?.readyState === WebSocket.OPEN) {
      channel.socket.send(JSON.stringify(data));
    }
  }

  disconnect(key: string) {
    const channel = this.channels.get(key);
    if (!channel) return;
    channel.shouldConnect = false;
    if (channel.reconnectTimer) {
      clearTimeout(channel.reconnectTimer);
      channel.reconnectTimer = null;
    }
    channel.socket?.close();
    channel.socket = null;
    this.channels.delete(key);
  }

  reconnectAll() {
    this.channels.forEach((channel, key) => {
      if (
        channel.shouldConnect &&
        (!channel.socket || channel.socket.readyState !== WebSocket.OPEN)
      ) {
        if (channel.reconnectTimer) {
          clearTimeout(channel.reconnectTimer);
          channel.reconnectTimer = null;
        }
        this.createSocket(key);
      }
    });
  }

  disconnectAll() {
    const keys = Array.from(this.channels.keys());
    keys.forEach(key => this.disconnect(key));
  }

  destroy() {
    this.disconnectAll();
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
  }
}

export const wsManager = new WebSocketManager();
