import React from 'react';
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
import {usersApi} from '../../api/users';
import {apiClient} from '../../api/client';
import {useAuthStore} from '../../stores/authStore';
import {colors, spacing} from '../../theme';
import Input from '../../components/Input';
import PasswordInput from '../../components/PasswordInput';
import Button from '../../components/Button';
import Logo from '../../components/Logo';
import type {AuthStackParamList} from '../../navigation/RootNavigator';

const schema = z.object({
  email: z.string().email('Geçerli bir email girin'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
});
type FormData = z.infer<typeof schema>;

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({navigation}: Props) {
  const {setAuth} = useAuthStore();
  const {
    control,
    handleSubmit,
    setError,
    formState: {errors, isSubmitting},
  } = useForm<FormData>({resolver: zodResolver(schema)});

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authApi.login(data.email, data.password);
      const {access_token, refresh_token} = res.data;
      apiClient.defaults.headers.common.Authorization = `Bearer ${access_token}`;
      const meRes = await usersApi.getMe();
      setAuth(meRes.data, access_token, refresh_token);
    } catch (err: unknown) {
      const msg =
        (err as {response?: {data?: {error?: string}}})?.response?.data?.error ??
        'Giriş başarısız';
      setError('password', {message: msg});
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
          <Logo height={30} />
        </View>
        <Text style={styles.subtitle}>Hesabına giriş yap</Text>

        <View style={styles.form}>
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
                autoComplete="email"
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({field: {onChange, value}}) => (
              <PasswordInput
                label="Şifre"
                value={value}
                onChangeText={onChange}
                error={errors.password?.message}
                containerStyle={styles.mb}
              />
            )}
          />

          <Button
            label="Giriş Yap"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            style={styles.btn}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.link}>
            <Text style={styles.linkText}>Şifremi unuttum</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Hesabın yok mu? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Kayıt Ol</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: colors.bg},
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  logoWrap: {alignItems: 'center'},
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  form: {gap: 0},
  mb: {marginBottom: spacing.md},
  btn: {width: '100%', marginTop: spacing.sm},
  link: {alignSelf: 'center', marginTop: spacing.md},
  linkText: {color: colors.textSecondary, fontSize: 14},
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: {color: colors.textSecondary, fontSize: 14},
  footerLink: {color: colors.primary, fontSize: 14, fontWeight: '600'},
});
