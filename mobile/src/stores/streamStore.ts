import {create} from 'zustand';

interface StreamMeta {
  artist: string;
  title: string;
  cover_url?: string;
}

interface StreamState {
  isPlaying: boolean;
  streamUrl: string | null;
  currentMeta: StreamMeta | null;
  setPlaying: (isPlaying: boolean) => void;
  setStreamUrl: (url: string) => void;
  setMeta: (meta: StreamMeta) => void;
}

export const useStreamStore = create<StreamState>(set => ({
  isPlaying: false,
  streamUrl: null,
  currentMeta: null,
  setPlaying: isPlaying => set({isPlaying}),
  setStreamUrl: streamUrl => set({streamUrl}),
  setMeta: currentMeta => set({currentMeta}),
}));
