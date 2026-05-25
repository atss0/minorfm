import {OneSignal, NotificationWillDisplayEvent, NotificationClickEvent} from 'react-native-onesignal';
import {usersApi} from '../api/users';

export const ONESIGNAL_APP_ID = 'cd627586-9de2-4400-88f2-dad2d6c4a059';

export function initOneSignal() {
  OneSignal.initialize(ONESIGNAL_APP_ID);

  // İzin iste (iOS için sistem prompt, Android 13+ için)
  OneSignal.Notifications.requestPermission(true);

  // Ön planda bildirim — sistem bildirimi yerine uygulama içi mesaj göster
  OneSignal.Notifications.addEventListener(
    'foregroundWillDisplay',
    (event: NotificationWillDisplayEvent) => {
      event.preventDefault();
      // showMessage() veya özel banner burada çağrılabilir
    },
  );

  // Bildirime tıklanınca → deep link ile ilgili ekrana git
  OneSignal.Notifications.addEventListener(
    'click',
    (event: NotificationClickEvent) => {
      const data = event.notification.additionalData as Record<string, string> | null;
      if (!data?.type) return;
      // Deep link navigasyon burada yapılır
      // Örnek: Linking.openURL(`minorfm://${data.type}/${data.id}`)
    },
  );
}

export async function registerDeviceToken() {
  try {
    const pushId = await OneSignal.User.pushSubscription.getIdAsync();
    if (pushId) {
      await usersApi.updateDeviceToken(pushId);
    }
  } catch {}
}

export function setExternalUserId(userId: string) {
  OneSignal.login(userId);
}

export function clearExternalUserId() {
  OneSignal.logout();
}
