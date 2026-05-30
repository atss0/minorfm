import React from 'react';
import {Modal, StyleSheet, TouchableOpacity, View} from 'react-native';
import AppText from './AppText';
import {colors, spacing, radius} from '../theme';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
  onRequestClose?: () => void;
}

export default function CustomAlert({visible, title, message, buttons, onRequestClose}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose ?? (() => {})}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.body}>
            <AppText variant="subheading" style={styles.title}>{title}</AppText>
            {message ? (
              <AppText variant="body" style={styles.message}>{message}</AppText>
            ) : null}
          </View>
          <View style={styles.divider} />
          <View style={[styles.buttons, buttons.length === 2 && styles.buttonsRow]}>
            {buttons.map((btn, i) => (
              <React.Fragment key={btn.text}>
                {i > 0 && buttons.length === 2 && <View style={styles.btnDividerV} />}
                {i > 0 && buttons.length !== 2 && <View style={styles.btnDividerH} />}
                <TouchableOpacity
                  style={[styles.btn, buttons.length === 2 && styles.btnFlex]}
                  onPress={btn.onPress}
                  activeOpacity={0.6}>
                  <AppText
                    variant="body"
                    style={[
                      styles.btnText,
                      btn.style === 'destructive' && styles.btnDestructive,
                      btn.style === 'cancel' && styles.btnCancel,
                    ]}>
                    {btn.text}
                  </AppText>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    width: '100%',
    maxWidth: 320,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  buttons: {
    flexDirection: 'column',
  },
  buttonsRow: {
    flexDirection: 'row',
  },
  btn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFlex: {
    flex: 1,
  },
  btnText: {
    fontWeight: '500',
    color: colors.primary,
  },
  btnDestructive: {
    color: colors.error,
  },
  btnCancel: {
    color: colors.textSecondary,
  },
  btnDividerV: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  btnDividerH: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
