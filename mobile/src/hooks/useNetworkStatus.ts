import {useEffect, useRef, useState} from 'react';
import NetInfo, {NetInfoState} from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected ?? false;

      if (!connected) {
        wasOfflineRef.current = true;
        setIsReconnecting(false);
      } else if (wasOfflineRef.current) {
        // Just came back online
        setIsReconnecting(true);
        // Clear reconnecting state after a short window
        setTimeout(() => setIsReconnecting(false), 2000);
        wasOfflineRef.current = false;
      }

      setIsConnected(connected);
    });

    return unsubscribe;
  }, []);

  return {
    isConnected,
    isOffline: isConnected === false,
    isReconnecting,
  };
}
