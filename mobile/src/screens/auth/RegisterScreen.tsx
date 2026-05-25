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
import type {AuthStackParamList} from '../../navigation/RootNavigator';

const schema = z
  .object({
    invite_code: z.string().min(1, 'Davet kodu gerekli'),
    username: z
      .string()
      .min(3, 'En az 3 karakter')
      .max(50, 'En fazla 50 karakter')
      .regex(/^[a-z0-9_]+$/, 'Sadece küçük harf, rakam ve _ kullanılabilir'),
    email: z.string().email('Geçerli bir email girin'),
    password: z.string().min(6, 'En az 6 karakter'),
    passwordConfirm: z.string(),
  })
  .refine(d => d.password === d.passwordConfirm, {
    path: ['passwordConfirm'],
    message: 'Şifreler eşleşmiyor',
  });
type FormData = z.infer<typeof schema>;

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({navigation}: Props) {
  const {setAuth} = useAuthStore();
  const {
    control,
    handleSubmit,
    setError,
    formState: {errors, isSubmitting},
  } = useForm<FormData>({resolver: zodResolver(schema)});

  const onSubmit = async (data: FormData) => {
    try {
      await authApi.register(data.username, data.email, data.password, data.invite_code);
      const loginRes = await authApi.login(data.email, data.password);
      const {access_token, refresh_token} = loginRes.data;
      apiClient.defaults.headers.common.Authorization = `Bearer ${access_token}`;
      const meRes = await usersApi.getMe();
      setAuth(meRes.data, access_token, refresh_token);
    } catch (err: unknown) {
      const msg =
        (err as {response?: {data?: {error?: string}}})?.response?.data?.error ??
        'Kayıt başarısız';
      setError('email', {message: msg});
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>MINOR.fm</Text>
        <Text style={styles.subtitle}>Hesap oluştur</Text>

        <View style={styles.form}>
          <Controller
            control={control}
            name="invite_code"
            render={({field: {onChange, value}}) => (
              <Input
                label="Davet Kodu"
                value={value}
                onChangeText={onChange}
                error={errors.invite_code?.message}
                placeholder="XXXX-XXXX"
                autoCapitalize="characters"
              />
            )}
          />
          <Controller
            control={control}
            name="username"
            render={({field: {onChange, value}}) => (
              <Input
                label="Kullanıcı Adı"
                value={value}
                onChangeText={onChange}
                error={errors.username?.message}
                placeholder="kullanici_adi"
                autoCapitalize="none"
                autoComplete="username-new"
              />
            )}
          />
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
          <Controller
            control={control}
            name="passwordConfirm"
            render={({field: {onChange, value}}) => (
              <PasswordInput
                label="Şifre Tekrar"
                value={value}
                onChangeText={onChange}
                error={errors.passwordConfirm?.message}
                placeholder="Şifreyi tekrar girin"
                containerStyle={styles.mb}
              />
            )}
          />

          <Button
            label="Kayıt Ol"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            style={styles.btn}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Zaten hesabın var mı? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Giriş Yap</Text>
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
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: 1,
  },
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: {color: colors.textSecondary, fontSize: 14},
  footerLink: {color: colors.primary, fontSize: 14, fontWeight: '600'},
});
