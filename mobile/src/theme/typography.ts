import {StyleSheet} from 'react-native';
import {colors} from './colors';

export const typography = StyleSheet.create({
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  subheading: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  artist: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  title: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textPrimary,
  },
});
