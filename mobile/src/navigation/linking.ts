import type {LinkingOptions} from '@react-navigation/native';
import {getStateFromPath as defaultGetStateFromPath} from '@react-navigation/native';
import type {AppStackParamList} from './RootNavigator';

// Tab index mapping for PagerView
const TAB_ROUTES: Record<string, number> = {
  deck: 0,
  chat: 1,
  rec: 2,
  you: 4,
};

const config: LinkingOptions<AppStackParamList>['config'] = {
  screens: {
    Main: '',
    Profile: 'profile/:username',
    PostDetail: 'post/:id',
    DMConversation: 'dm/:roomId',
    Settings: 'settings',
    Notifications: 'notifications',
    Search: 'search',
  },
};

export const linking: LinkingOptions<AppStackParamList> = {
  prefixes: ['minorfm://', 'https://minor.fm', 'http://minor.fm'],
  config,

  getStateFromPath(path, options) {
    const clean = path.replace(/^\//, '');

    // Exact tab route → navigate to Main with initialTab param
    if (clean in TAB_ROUTES) {
      return {routes: [{name: 'Main', params: {initialTab: TAB_ROUTES[clean]}}]};
    }

    // "dm" alone → DM tab (index 3); "dm/:roomId" falls through to default
    if (clean === 'dm') {
      return {routes: [{name: 'Main', params: {initialTab: 3}}]};
    }

    return defaultGetStateFromPath(path, options);
  },
};
