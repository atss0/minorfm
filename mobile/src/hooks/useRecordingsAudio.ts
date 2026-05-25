import {useCallback, useRef} from 'react';
import {useSoundWithStates} from 'react-native-nitro-sound';
import TrackPlayer from 'react-native-track-player';
import {useRecordingsStore} from '../stores/recordingsStore';

export interface RecordingItem {
  id: string;
  user_id: string;
  user: {username: string; avatar_url: string};
  audio_url: string;
  duration: number;
  title: string | null;
  created_at: string;
}

export function useRecordingsAudio() {
  const setQueue = useRecordingsStore(s => s.setQueue);
  const setIndex = useRecordingsStore(s => s.setIndex);
  const setPlaying = useRecordingsStore(s => s.setPlaying);
  const setProgress = useRecordingsStore(s => s.setProgress);

  // Refs keep callbacks fresh inside nitro-sound's init-time-captured listeners
  const autoAdvanceRef = useRef<() => Promise<void>>(async () => {});
  const onProgressRef = useRef<(pos: number, dur: number) => void>(() => {});

  const {startPlayer, pausePlayer, resumePlayer, stopPlayer, state} = useSoundWithStates({
    onPlaybackEnd: () => autoAdvanceRef.current(),
    onPlayback: e => onProgressRef.current(e.currentPosition ?? 0, e.duration ?? 1),
  });

  // Always-fresh — assigned every render, read only inside callbacks
  onProgressRef.current = (pos, dur) => {
    setProgress(dur > 0 ? pos / dur : 0);
  };

  autoAdvanceRef.current = async () => {
    const {queue, currentIndex} = useRecordingsStore.getState();
    if (currentIndex < queue.length - 1) {
      const nextIndex = currentIndex + 1;
      setIndex(nextIndex);
      await startPlayer(queue[nextIndex].audio_url);
    } else {
      setPlaying(false);
      setIndex(0);
      setProgress(0);
    }
  };

  const play = useCallback(
    async (recordings: RecordingItem[], index: number) => {
      try {
        await TrackPlayer.pause();
      } catch {}
      setQueue(recordings);
      setIndex(index);
      setPlaying(true);
      setProgress(0);
      await startPlayer(recordings[index].audio_url);
    },
    [startPlayer, setQueue, setIndex, setPlaying, setProgress],
  );

  const pause = useCallback(async () => {
    await pausePlayer();
    setPlaying(false);
  }, [pausePlayer, setPlaying]);

  const resume = useCallback(async () => {
    await resumePlayer();
    setPlaying(true);
  }, [resumePlayer, setPlaying]);

  const stop = useCallback(async () => {
    await stopPlayer();
    setPlaying(false);
    setProgress(0);
  }, [stopPlayer, setPlaying, setProgress]);

  const progress =
    state.playback.duration > 0 ? state.playback.position / state.playback.duration : 0;

  return {play, pause, resume, stop, isPlaying: state.isPlaying, progress};
}
