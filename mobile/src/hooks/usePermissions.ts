import {Linking, Platform} from 'react-native';
import {PermissionsAndroid} from 'react-native';
import {useState} from 'react';
import type {AlertButton} from '../components/CustomAlert';

export interface PermissionAlertConfig {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
}

export function usePermissions() {
  const [permissionAlert, setPermissionAlert] = useState<PermissionAlertConfig>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

  const dismissPermissionAlert = () =>
    setPermissionAlert(prev => ({...prev, visible: false}));

  const showSettingsAlert = (message: string) => {
    setPermissionAlert({
      visible: true,
      title: 'İzin Gerekli',
      message,
      buttons: [
        {text: 'İptal', style: 'cancel', onPress: dismissPermissionAlert},
        {text: 'Ayarlar', onPress: () => { dismissPermissionAlert(); Linking.openSettings(); }},
      ],
    });
  };

  const requestMicrophone = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Mikrofon İzni',
        message: 'Ses kaydı yapabilmek için mikrofon izni gerekli.',
        buttonPositive: 'İzin Ver',
        buttonNegative: 'İptal',
      },
    );

    if (granted === PermissionsAndroid.RESULTS.GRANTED) return true;
    if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      showSettingsAlert(
        'Mikrofon izni kalıcı olarak reddedildi. Kayıt yapabilmek için Ayarlar\'dan izin vermelisin.',
      );
    }
    return false;
  };

  const requestCamera = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Kamera İzni',
        message: 'Fotoğraf çekmek için kamera izni gerekli.',
        buttonPositive: 'İzin Ver',
        buttonNegative: 'İptal',
      },
    );

    if (granted === PermissionsAndroid.RESULTS.GRANTED) return true;
    if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      showSettingsAlert('Kamera izni kalıcı olarak reddedildi. Ayarlar\'dan açabilirsin.');
    }
    return false;
  };

  const requestMediaImages = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    // Android 13+ uses READ_MEDIA_IMAGES, older uses READ_EXTERNAL_STORAGE
    const permission =
      parseInt(String(Platform.Version), 10) >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : ('android.permission.READ_EXTERNAL_STORAGE' as typeof PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);

    const granted = await PermissionsAndroid.request(permission, {
      title: 'Galeri İzni',
      message: 'Fotoğraf seçebilmek için galeri izni gerekli.',
      buttonPositive: 'İzin Ver',
      buttonNegative: 'İptal',
    });

    if (granted === PermissionsAndroid.RESULTS.GRANTED) return true;
    if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      showSettingsAlert('Galeri izni kalıcı olarak reddedildi. Ayarlar\'dan açabilirsin.');
    }
    return false;
  };

  return {requestMicrophone, requestCamera, requestMediaImages, permissionAlert, dismissPermissionAlert};
}
