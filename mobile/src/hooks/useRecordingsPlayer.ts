import {useCallback, useEffect} from 'react';
import TrackPlayer, {Event, useTrackPlayerEvents, useProgress} from 'react-native-track-player';
import {useRecordingsStore} from '../stores/recordingsStore';

export function useRecordingsPlayer() {
  const {
    queue,
    currentIndex,
    isPlaying,
    progress,
    setQueue,
    setIndex,
    setPlaying,
    setProgress,
    playNext,
  } = useRecordingsStore();

  // Track playback progress (update store every 500ms while playing)
  const {position, duration} = useProgress(500);
  useEffect(() => {
    if (isPlaying && duration > 0) {
      setProgress(position / duration);
    }
  }, [position, duration, isPlaying, setProgress]);

  // Auto-advance to next recording when current finishes
  useTrackPlayerEvents([Event.PlaybackQueueEnded], () => {
    playNext();
  });

  const play = useCallback(
    async (recordings: typeof queue, index: number) => {
      const isSameTrack = currentIndex === index && queue === recordings;

      if (isSameTrack && isPlaying) {
        await TrackPlayer.pause();
        setPlaying(false);
        return;
      }

      const recording = recordings[index];
      if (!recording) return;

      setQueue(recordings);
      setIndex(index);

      try {
        await TrackPlayer.reset();
        await TrackPlayer.add(
          recordings.map(r => ({
            id: r.id,
            url: r.audio_url,
            title: r.title ?? 'Adsız kayıt',
            artist: r.user.username,
            duration: r.duration,
          })),
        );
        await TrackPlayer.skip(index);
        await TrackPlayer.play();
        setPlaying(true);
      } catch {}
    },
    [currentIndex, isPlaying, queue, setIndex, setPlaying, setQueue],
  );

  const pause = useCallback(async () => {
    await TrackPlayer.pause();
    setPlaying(false);
  }, [setPlaying]);

  const resume = useCallback(async () => {
    await TrackPlayer.play();
    setPlaying(true);
  }, [setPlaying]);

  return {
    queue,
    currentIndex,
    isPlaying,
    progress,
    play,
    pause,
    resume,
  };
}
