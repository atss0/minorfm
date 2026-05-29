import {useEffect, useRef} from 'react';
import TrackPlayer, {Capability, State, usePlaybackState} from 'react-native-track-player';
import {useStreamStore} from '../stores/streamStore';
import {radioApi} from '../api/radio';

const STREAM_URL = __DEV__ ? 'https://stream.minor.fm/stream' : 'https://stream.minor.fm/stream';

export function useStream() {
  const {setPlaying, setStreamUrl, setMeta, currentMeta} = useStreamStore();
  const playbackState = usePlaybackState();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const setup = async () => {
      try {
        await TrackPlayer.setupPlayer({minBuffer: 5, playBuffer: 2, maxBuffer: 10, backBuffer: 0});
      } catch {
        // Already initialized on hot reload — skip to queue check
        try {
          const queue = await TrackPlayer.getQueue();
          if (queue.length === 0) {
            await TrackPlayer.add({
              id: 'live-stream',
              url: STREAM_URL,
              title: 'MINOR.fm',
              artist: 'Canlı Yayın',
              isLiveStream: true,
            });
          }
          setStreamUrl(STREAM_URL);
        } catch {}
        return;
      }
      await TrackPlayer.updateOptions({
        capabilities: [Capability.Play, Capability.Pause],
        compactCapabilities: [Capability.Play, Capability.Pause],
      });
      await TrackPlayer.add({
        id: 'live-stream',
        url: STREAM_URL,
        title: 'MINOR.fm',
        artist: 'Canlı Yayın',
        isLiveStream: true,
      });
      setStreamUrl(STREAM_URL);
      await TrackPlayer.play();
    };

    setup();

    // Stop playback when user logs out (MainScreen unmounts)
    return () => {
      TrackPlayer.reset().catch(() => {});
    };
  }, [setStreamUrl]);

  useEffect(() => {
    if (playbackState.state !== undefined) {
      setPlaying(playbackState.state === State.Playing);
    }
  }, [playbackState.state, setPlaying]);

  // Poll metadata every 30s
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await radioApi.getCurrent();
        const track = res.data?.track;
        if (track?.title || track?.artist) {
          setMeta({
            artist: track.artist ?? '',
            title: track.title ?? '',
            cover_url: track.cover_url || undefined,
          });
        }
      } catch {}
    };
    fetchMeta();
    const interval = setInterval(fetchMeta, 30_000);
    return () => clearInterval(interval);
  }, [setMeta]);

  const togglePlay = async () => {
    if (playbackState.state === State.Playing) {
      await TrackPlayer.pause();
    } else {
      // Reset to live edge on every resume
      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: 'live-stream',
        url: STREAM_URL,
        title: 'MINOR.fm',
        artist: 'Canlı Yayın',
        isLiveStream: true,
      });
      await TrackPlayer.play();
    }
  };

  const isBuffering =
    playbackState.state === State.Loading ||
    playbackState.state === State.Buffering;

  return {
    isPlaying: playbackState.state === State.Playing,
    isBuffering,
    currentMeta,
    togglePlay,
  };
}
