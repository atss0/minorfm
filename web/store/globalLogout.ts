import { useAuthStore } from '@/store/authStore'
import { useAdminAuthStore } from '@/store/adminAuthStore'

/**
 * Her iki auth store'u aynı anda temizler.
 * Ana siteden veya admin panelinden çıkış yapıldığında her zaman bu
 * fonksiyon çağrılmalı; böylece iki store arasında tutarsız auth durumu oluşmaz.
 */
export function globalLogout() {
  useAuthStore.getState().logout()
  useAdminAuthStore.getState().logout()
}
