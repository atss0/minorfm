import React, {useState} from 'react';
import {StyleSheet, TouchableOpacity, View, ViewStyle} from 'react-native';
import Input from './Input';
import {colors} from '../theme';

interface Props {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  placeholder?: string;
  containerStyle?: ViewStyle;
}

export default function PasswordInput({
  label,
  value,
  onChangeText,
  error,
  placeholder = 'Şifre',
  containerStyle,
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <Input
        label={label}
        value={value}
        onChangeText={onChangeText}
        error={error}
        placeholder={placeholder}
        secureTextEntry={!visible}
        autoCapitalize="none"
        containerStyle={styles.inputContainer}
      />
      <TouchableOpacity
        style={styles.toggle}
        onPress={() => setVisible(v => !v)}
        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
        <Eye visible={visible} />
      </TouchableOpacity>
    </View>
  );
}

function Eye({visible}: {visible: boolean}) {
  // Basit metin tabanlı toggle — ikon kütüphanesi Faz 2'de bağlanacak
  const {Text} = require('react-native');
  return (
    <Text style={{color: colors.textSecondary, fontSize: 13}}>
      {visible ? 'GİZLE' : 'GÖSTER'}
    </Text>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  inputContainer: {
    marginBottom: 0,
  },
  toggle: {
    position: 'absolute',
    right: 16,
    bottom: 14,
  },
});
