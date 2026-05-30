import React, {useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import ImageCropPicker from 'react-native-image-crop-picker';
import {showMessage} from 'react-native-flash-message';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import MaterialIcon from '@react-native-vector-icons/material-icons';
import {useAuthStore} from '../../stores/authStore';
import {usersApi} from '../../api/users';
import {mediaApi} from '../../api/media';
import Avatar from '../../components/Avatar';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import {colors, spacing, radius} from '../../theme';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const {user, updateUser, logout} = useAuthStore();
  const queryClient = useQueryClient();

  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const profileMutation = useMutation({
    mutationFn: () =>
      usersApi.updateMe({username: username.trim(), bio: bio.trim()}),
    onSuccess: res => {
      const updated = res.data?.user ?? res.data;
      updateUser({username: updated.username, bio: updated.bio});
      showMessage({message: 'Profil güncellendi', type: 'success'});
    },
    onError: () =>
      showMessage({message: 'Güncelleme başarısız', type: 'danger'}),
  });

  const passwordMutation = useMutation({
    mutationFn: () =>
      usersApi.updatePassword({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      showMessage({message: 'Şifre güncellendi', type: 'success'});
    },
    onError: () =>
      showMessage({message: 'Şifre değiştirilemedi', type: 'danger'}),
  });

  const handleAvatarPick = async () => {
    if (avatarUploading) return;
    let image;
    try {
      image = await ImageCropPicker.openPicker({
        width: 400,
        height: 400,
        cropping: true,
        cropperCircleOverlay: false,
        mediaType: 'photo',
        compressImageQuality: 0.8,
        cropperToolbarTitle: 'Fotoğrafı Kırp',
        cropperChooseText: 'Seç',
        cropperCancelText: 'İptal',
      });
    } catch {
      return;
    }
    setAvatarUploading(true);
    const formData = new FormData();
    formData.append('avatar', {
      uri: image.path,
      type: image.mime ?? 'image/jpeg',
      name: 'avatar.jpg',
    } as unknown as Blob);
    try {
      const res = await mediaApi.uploadAvatar(formData);
      const avatarUrl = res.data?.avatar_url ?? res.data?.url;
      if (avatarUrl) {
        updateUser({avatar_url: avatarUrl});
        queryClient.invalidateQueries({queryKey: ['profile', user?.username]});
        showMessage({message: 'Profil fotoğrafı güncellendi', type: 'success'});
      }
    } catch {
      showMessage({message: 'Fotoğraf yüklenemedi', type: 'danger'});
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Çıkış', 'Çıkış yapmak istediğine emin misin?', [
      {text: 'İptal', style: 'cancel'},
      {text: 'Çıkış Yap', style: 'destructive', onPress: logout},
    ]);
  };

  return (
    <View style={styles.root}>
      <View style={styles.navHeader}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}>
          <MaterialIcon name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <AppText variant="subheading">Ayarlar</AppText>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handleAvatarPick} activeOpacity={0.8} disabled={avatarUploading}>
            <Avatar
              uri={user?.avatar_url}
              username={user?.username ?? ''}
              size={80}
            />
            {avatarUploading ? (
              <View style={styles.avatarLoadingOverlay}>
                <ActivityIndicator size="small" color={colors.textPrimary} />
              </View>
            ) : (
            <View style={styles.avatarEditBadge}>
              <MaterialIcon
                name="photo-camera"
                size={14}
                color={colors.textPrimary}
              />
            </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <AppText variant="label" style={styles.sectionLabel}>
            Profil
          </AppText>
          <View style={styles.card}>
            <View style={styles.field}>
              <AppText variant="caption" style={styles.fieldLabel}>
                Kullanıcı adı
              </AppText>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="kullaniciadi"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.field}>
              <AppText variant="caption" style={styles.fieldLabel}>
                Biyografi
              </AppText>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={bio}
                onChangeText={setBio}
                placeholder="Kendinden bahset..."
                placeholderTextColor={colors.textSecondary}
                multiline
                maxLength={200}
                textAlignVertical="top"
              />
            </View>
          </View>
          <Button
            label="Kaydet"
            onPress={() => profileMutation.mutate()}
            loading={profileMutation.isPending}
            style={styles.saveBtn}
          />
        </View>

        <View style={styles.section}>
          <AppText variant="label" style={styles.sectionLabel}>
            Şifre Değiştir
          </AppText>
          <View style={styles.card}>
            <View style={styles.field}>
              <AppText variant="caption" style={styles.fieldLabel}>
                Mevcut şifre
              </AppText>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.field}>
              <AppText variant="caption" style={styles.fieldLabel}>
                Yeni şifre
              </AppText>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
          <Button
            label="Şifreyi Güncelle"
            onPress={() => passwordMutation.mutate()}
            loading={passwordMutation.isPending}
            disabled={!currentPassword || !newPassword}
            style={styles.saveBtn}
          />
        </View>

        <View style={styles.section}>
          <Button label="Çıkış Yap" variant="danger" onPress={handleLogout} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  iconBtn: {width: 40, height: 40, justifyContent: 'center', alignItems: 'center'},
  scroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  field: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  fieldLabel: {
    marginBottom: 4,
  },
  input: {
    color: colors.textPrimary,
    fontSize: 15,
    paddingVertical: spacing.xs,
  },
  bioInput: {
    minHeight: 60,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  saveBtn: {
    marginTop: spacing.sm,
  },
});
