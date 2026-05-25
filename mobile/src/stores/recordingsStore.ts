import {create} from 'zustand';

interface Recording {
  id: string;
  user_id: string;
  user: {username: string; avatar_url: string};
  audio_url: string;
  duration: number;
  title: string | null;
  created_at: string;
}

interface RecordingsState {
  queue: Recording[];
  currentIndex: number;
  isPlaying: boolean;
  progress: number;
  setQueue: (queue: Recording[]) => void;
  setIndex: (index: number) => void;
  setPlaying: (isPlaying: boolean) => void;
  setProgress: (progress: number) => void;
  playNext: () => void;
  playPrev: () => void;
  prependRecording: (recording: Recording) => void;
}

export const useRecordingsStore = create<RecordingsState>((set, get) => ({
  queue: [],
  currentIndex: 0,
  isPlaying: false,
  progress: 0,
  setQueue: queue => set({queue}),
  setIndex: currentIndex => set({currentIndex, progress: 0}),
  setPlaying: isPlaying => set({isPlaying}),
  setProgress: progress => set({progress}),
  playNext: () => {
    const {currentIndex, queue} = get();
    if (currentIndex < queue.length - 1) {
      set({currentIndex: currentIndex + 1, progress: 0});
    }
  },
  playPrev: () => {
    const {currentIndex} = get();
    if (currentIndex > 0) {
      set({currentIndex: currentIndex - 1, progress: 0});
    }
  },
  prependRecording: recording =>
    set(state => ({queue: [recording, ...state.queue]})),
}));
