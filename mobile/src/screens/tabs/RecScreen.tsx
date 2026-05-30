import React, {useCallback, useEffect, useMemo} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {useSoundWithStates} from 'react-native-nitro-sound';
import HapticFeedback from 'react-native-haptic-feedback';
import MaterialIcon from '@react-native-vector-icons/material-icons';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {showMessage} from 'react-native-flash-message';
import DynamicListenerGrid from '../../components/DynamicListenerGrid';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import {useAuthStore} from '../../stores/authStore';
import {useUIStore} from '../../stores/uiStore';
import {colors, spacing} from '../../theme';
import {recordingsApi} from '../../api/recordings';
import {usersApi} from '../../api/users';
import {navigateToTab} from '../../navigation/pagerRef';
import {useState} from 'react';
import type {AppStackParamList} from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<AppStackParamList>;

type RecState = 'idle' | 'recording' | 'preview';

function fmtMs(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const TAB_BAR_HEIGHT = 56;

export default function RecScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const {height: screenHeight} = useWindowDimensions();
  const queryClient = useQueryClient();
  const {user} = useAuthStore();
  const {shouldStartRecording, clearStartRecording} = useUIStore();

  const [recState, setRecState] = useState<RecState>('idle');
  const [recordedPath, setRecordedPath] = useState<string | null>(null);
  const [recordedMs, setRecordedMs] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [title, setTitle] = useState('');

  // Real online users — refetch every 30s
  const {data: onlineData} = useQuery({
    queryKey: ['online-users'],
    queryFn: () => usersApi.getOnline().then(r => r.data),
    refetchInterval: 30_000,
  });

  // Always include the current user at the top of the grid
  const listeners = useMemo(() => {
    const base: {id: string; username: string; avatar_url?: string | null}[] =
      Array.isArray(onlineData) ? onlineData : [];
    if (!user) return base;
    const alreadyIn = base.some(l => l.id === user.id);
    if (alreadyIn) return base;
    return [{id: user.id, username: user.username, avatar_url: user.avatar_url}, ...base];
  }, [onlineData, user]);

  const pulse = useSharedValue(1);
  const ring = useSharedValue(1);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{scale: pulse.value}],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{scale: ring.value}],
    opacity: Math.max(0, 1.4 - ring.value),
  }));

  const {
    startRecorder,
    stopRecorder,
    startPlayer,
    pausePlayer,
    stopPlayer,
    state: soundState,
  } = useSoundWithStates({
    onRecord: e => {
      if (e.isRecording) {
        setRecordedMs(e.currentPosition);
      }
    },
  });

  const requestMic = async () => {
    if (Platform.OS !== 'android') return true;
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Mikrofon İzni',
        message: 'Kayıt yapmak için mikrofon erişimi gerekli.',
        buttonPositive: 'İzin Ver',
        buttonNegative: 'İptal',
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  const handleStartRecording = useCallback(async () => {
    const granted = await requestMic();
    if (!granted) {
      Alert.alert('İzin Gerekli', 'Mikrofon izni olmadan kayıt yapılamaz.');
      return;
    }
    setIsStarting(true);
    try {
      await startRecorder();
      setRecState('recording');
      pulse.value = withRepeat(withTiming(1.15, {duration: 600}), -1, true);
      ring.value = withRepeat(withTiming(1.8, {duration: 1200}), -1, false);
      HapticFeedback.trigger('notificationSuccess', {enableVibrateFallback: true, ignoreAndroidSystemSettings: false});
    } catch {
      HapticFeedback.trigger('notificationError', {enableVibrateFallback: true, ignoreAndroidSystemSettings: false});
      Alert.alert('Hata', 'Kayıt başlatılamadı.');
    } finally {
      setIsStarting(false);
    }
  }, [pulse, ring, startRecorder]);

  // Tab bar mic button triggers recording when this screen is active
  useEffect(() => {
    if (shouldStartRecording && recState === 'idle') {
      clearStartRecording();
      handleStartRecording();
    }
  }, [shouldStartRecording, recState, clearStartRecording, handleStartRecording]);

  const handleStopRecording = useCallback(async () => {
    setIsStopping(true);
    cancelAnimation(pulse);
    cancelAnimation(ring);
    pulse.value = withTiming(1);
    ring.value = withTiming(1);
    try {
      const path = await stopRecorder();
      setRecordedPath(path);
      setRecState('preview');
      HapticFeedback.trigger('notificationSuccess', {enableVibrateFallback: true, ignoreAndroidSystemSettings: false});
    } catch {
      HapticFeedback.trigger('notificationError', {enableVibrateFallback: true, ignoreAndroidSystemSettings: false});
      Alert.alert('Hata', 'Kayıt durdurulamadı.');
      setRecState('idle');
    } finally {
      setIsStopping(false);
    }
  }, [pulse, ring, stopRecorder]);

  const handleTogglePreview = useCallback(async () => {
    if (!recordedPath) return;
    if (soundState.isPlaying) {
      await pausePlayer();
    } else {
      await startPlayer(recordedPath);
    }
  }, [pausePlayer, recordedPath, soundState.isPlaying, startPlayer]);

  const handleDiscard = useCallback(async () => {
    await stopPlayer().catch(() => {});
    setRecordedPath(null);
    setRecordedMs(0);
    setTitle('');
    setRecState('idle');
  }, [stopPlayer]);

  const handleSend = useCallback(async () => {
    if (!recordedPath || isUploading) return;
    setIsUploading(true);
    try {
      await stopPlayer().catch(() => {});
      const durationSecs = Math.max(1, Math.round(recordedMs / 1000));
      await recordingsApi.uploadAudio(recordedPath, durationSecs, title.trim() || undefined);
      await queryClient.invalidateQueries({queryKey: ['recordings']});
      setRecordedPath(null);
      setRecordedMs(0);
      setTitle('');
      setRecState('idle');
      showMessage({message: 'Kayıt kuyruğa eklendi!', type: 'success'});
      navigateToTab(1);
    } catch {
      HapticFeedback.trigger('notificationError', {enableVibrateFallback: true, ignoreAndroidSystemSettings: false});
      Alert.alert('Hata', 'Kayıt gönderilemedi. Tekrar dene.');
    } finally {
      setIsUploading(false);
    }
  }, [isUploading, queryClient, recordedMs, recordedPath, stopPlayer, title]);

  if (recState === 'recording') {
    return (
      <View style={[styles.container, styles.centered]}>
        <View style={styles.recordingVisual}>
          <Animated.View style={[styles.pulseRing, ringStyle]} />
          <Animated.View style={[styles.micCircle, pulseStyle]}>
            <MaterialIcon name="mic" size={32} color={colors.textPrimary} />
          </Animated.View>
        </View>
        <AppText style={styles.timer}>{fmtMs(recordedMs)}</AppText>
        <AppText style={styles.statusLabel}>Kaydediliyor...</AppText>
        <TouchableOpacity
          style={styles.stopButton}
          onPress={handleStopRecording}
          disabled={isStopping}
          activeOpacity={0.8}>
          <View style={styles.stopSquare} />
        </TouchableOpacity>
      </View>
    );
  }

  if (recState === 'preview') {
    return (
      <KeyboardAvoidingView
        style={[styles.container, styles.centered]}
        behavior="padding"
        keyboardVerticalOffset={TAB_BAR_HEIGHT + insets.bottom}>
        <AppText style={styles.timer}>{fmtMs(recordedMs)}</AppText>
        <AppText style={styles.statusLabel}>Kayıt hazır</AppText>
        <TouchableOpacity
          style={styles.playPreviewBtn}
          onPress={handleTogglePreview}
          activeOpacity={0.8}>
          <MaterialIcon
            name={soundState.isPlaying ? 'pause' : 'play-arrow'}
            size={36}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <TextInput
            style={styles.titleInput}
            placeholder="Başlık ekle (isteğe bağlı)"
            placeholderTextColor={colors.textSecondary}
            value={title}
            onChangeText={setTitle}
            maxLength={80}
            returnKeyType="done"
            blurOnSubmit
          />
          <AppText style={[
            styles.charCount,
            title.length >= 80 && styles.charCountLimit,
          ]}>
            {title.length}/80
          </AppText>
        </View>
        <View style={styles.previewActions}>
          <TouchableOpacity style={styles.discardBtn} onPress={handleDiscard}>
            <AppText style={styles.discardLabel}>Tekrar</AppText>
          </TouchableOpacity>
          <Button
            label="Gönder"
            onPress={handleSend}
            loading={isUploading}
            disabled={isUploading}
            style={styles.sendBtn}
          />
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText variant="label">
          Şu an dinleyenler ({listeners.length})
        </AppText>
      </View>

      <DynamicListenerGrid
        listeners={listeners}
        maxHeight={screenHeight * 0.7}
        onListenerPress={l => {
          if (l.id !== user?.id) {
            navigation.navigate('Profile', {username: l.username});
          }
        }}
      />

      <View style={styles.recordHintSection}>
        <MaterialIcon name="mic" size={16} color={colors.textSecondary} />
        <AppText style={styles.recordHint}>Kayıt başlatmak için aşağıdaki mic butonuna bas</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: spacing.md,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 0,
  },

  // idle
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  recordHintSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  recordHint: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // recording
  recordingVisual: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
  },
  micCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timer: {
    fontSize: 48,
    fontWeight: '200',
    color: colors.textPrimary,
    letterSpacing: 2,
    lineHeight: 58,
    includeFontPadding: false,
    fontVariant: ['tabular-nums'],
    marginBottom: spacing.sm,
  },
  statusLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xxl,
  },
  stopButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopSquare: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },

  // preview
  titleWrap: {
    width: '80%',
    marginBottom: spacing.xl,
  },
  titleInput: {
    width: '100%',
    height: 44,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontSize: 14,
  },
  charCount: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  charCountLimit: {
    color: colors.primary,
  },
  playPreviewBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  previewActions: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  discardBtn: {
    height: 48,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  discardLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sendBtn: {
    minWidth: 120,
  },
});
