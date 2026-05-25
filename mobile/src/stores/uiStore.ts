import {create} from 'zustand';

interface UIState {
  activeTabIndex: number;
  notificationCount: number;
  dmUnreadCount: number;
  chatUnreadCount: number;
  setTabIndex: (index: number) => void;
  setNotificationCount: (count: number) => void;
  setDMUnreadCount: (count: number) => void;
  setChatUnreadCount: (count: number) => void;
}

export const useUIStore = create<UIState>(set => ({
  activeTabIndex: 1,
  notificationCount: 0,
  dmUnreadCount: 0,
  chatUnreadCount: 0,
  setTabIndex: activeTabIndex => set({activeTabIndex}),
  setNotificationCount: notificationCount => set({notificationCount}),
  setDMUnreadCount: dmUnreadCount => set({dmUnreadCount}),
  setChatUnreadCount: chatUnreadCount => set({chatUnreadCount}),
}));
