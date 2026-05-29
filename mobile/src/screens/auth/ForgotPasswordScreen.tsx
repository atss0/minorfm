import React, {useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useForm, Controller} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {authApi} from '../../api/auth';
import {colors, spacing} from '../../theme';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Logo from '../../components/Logo';
import type {AuthStackParamList} from '../../navigation/RootNavigator';

const schema = z.object({
  email: z.string().email('Geçerli bir email girin'),
});
type FormData = z.infer<typeof schema>;

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({navigation}: Props) {
  const [sent, setSent] = useState(false);
  const {
    control,
    handleSubmit,
    setError,
    formState: {errors, isSubmitting},
  } = useForm<FormData>({resolver: zodResolver(schema)});

  const onSubmit = async (data: FormData) => {
    try {
      await authApi.forgotPassword(data.email);
      setSent(true);
    } catch {
      setError('email', {message: 'Bu email ile kayıtlı hesap bulunamadı'});
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior="padding">
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}>
        <View style={styles.logoWrap}>
          <Logo height={28} />
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>Şifre Sıfırla</Text>

        {sent ? (
          <View style={styles.sentBox}>
            <Text style={styles.sentTitle}>Email gönderildi ✓</Text>
            <Text style={styles.sentBody}>
              Şifre sıfırlama bağlantısı email adresinize gönderildi. Gelen
              kutunuzu kontrol edin.
            </Text>
            <Button
              label="Giriş Ekranına Dön"
              onPress={() => navigation.navigate('Login')}
              variant="ghost"
              style={styles.btn}
            />
          </View>
        ) : (
          <>
            <Text style={styles.description}>
              Email adresinizi girin, şifre sıfırlama bağlantısı gönderelim.
            </Text>
            <Controller
              control={control}
              name="email"
              render={({field: {onChange, value}}) => (
                <Input
                  label="Email"
                  value={value}
                  onChangeText={onChange}
                  error={errors.email?.message}
                  placeholder="ornek@mail.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              )}
            />
            <Button
              label="Bağlantı Gönder"
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              style={styles.btn}
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: colors.bg},
  logoWrap: {alignItems: 'center', marginBottom: spacing.xl},
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  back: {marginBottom: spacing.xl},
  backText: {color: colors.textSecondary, fontSize: 15},
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  btn: {width: '100%', marginTop: spacing.sm},
  sentBox: {alignItems: 'center', marginTop: spacing.xl},
  sentTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.success,
    marginBottom: spacing.md,
  },
  sentBody: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
