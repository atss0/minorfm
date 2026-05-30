// Module-level reference so RecScreen (and others) can send heart_tap
// without needing a second WS connection. Set by useBroadcastChat on open.
export const heartTapBridge = {
  send: null as ((effect: 'heart' | 'clap') => void) | null,
};
