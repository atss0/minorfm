import {useCallback} from 'react';
import {useSoundWithStates} from 'react-native-nitro-sound';

interface Options {
  onPositionUpdate?: (positionMs: number) => void;
}

export function useAudioRecorder({onPositionUpdate}: Options = {}) {
  const {startRecorder, stopRecorder, startPlayer, pausePlayer, stopPlayer, state} =
    useSoundWithStates({
      onRecord: e => {
        if (e.isRecording && onPositionUpdate) {
          onPositionUpdate(e.currentPosition);
        }
      },
    });

  const start = useCallback(async (): Promise<void> => {
    await startRecorder();
  }, [startRecorder]);

  const stop = useCallback(async (): Promise<string> => {
    return stopRecorder();
  }, [stopRecorder]);

  const playPreview = useCallback(
    async (path: string): Promise<void> => {
      await startPlayer(path);
    },
    [startPlayer],
  );

  const pausePreview = useCallback(async (): Promise<void> => {
    await pausePlayer();
  }, [pausePlayer]);

  const stopPreview = useCallback(async (): Promise<void> => {
    await stopPlayer();
  }, [stopPlayer]);

  return {
    start,
    stop,
    playPreview,
    pausePreview,
    stopPreview,
    isRecording: state.isRecording,
    isPlaying: state.isPlaying,
    recordingPositionMs: state.recording.position,
    playbackPositionMs: state.playback.position,
  };
}
