import {createRef} from 'react';
import PagerView from 'react-native-pager-view';

export const mainPagerRef = createRef<PagerView>();

export function navigateToTab(index: number) {
  mainPagerRef.current?.setPage(index);
}
