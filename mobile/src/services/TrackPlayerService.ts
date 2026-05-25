import TrackPlayer, {Event} from 'react-native-track-player';

export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());

  // Auto-play next in recordings queue — handled by useRecordingsPlayer hook in Faz 3
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
    const {useRecordingsStore} = await import('../stores/recordingsStore');
    const {playNext, queue, currentIndex} = useRecordingsStore.getState();
    if (currentIndex < queue.length - 1) {
      playNext();
      await TrackPlayer.skipToNext();
      await TrackPlayer.play();
    }
  });
}
