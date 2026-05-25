import type {LinkingOptions} from '@react-navigation/native';
import type {AppStackParamList} from './RootNavigator';

export const linking: LinkingOptions<AppStackParamList> = {
  prefixes: ['minorfm://'],
  config: {
    screens: {
      Main: '',
      Profile: 'profile/:username',
      PostDetail: 'post/:id',
      DMConversation: 'dm/:roomId',
      Settings: 'settings',
      Notifications: 'notifications',
      Search: 'search',
    },
  },
};
