import React, {useState, useCallback} from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import MaterialIcon from '@react-native-vector-icons/material-icons';
import {showMessage} from 'react-native-flash-message';
import {apiClient} from '../../api/client';
import {dmApi} from '../../api/dm';
import Avatar from '../../components/Avatar';
import AppText from '../../components/AppText';
import {colors, spacing, radius} from '../../theme';
import type {AppStackParamList} from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Route = RouteProp<AppStackParamList, 'Search'>;

interface UserResult {
  id: string;
  username: string;
  avatar_url: string;
  bio?: string;
}

export default function SearchScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const isDmMode = route.params?.mode === 'dm';

  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (q.length < 2) {
      setUsers([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/search', {params: {q, limit: 20}});
        setUsers(res.data?.users ?? []);
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    setDebounceTimer(timer);
  }, [debounceTimer]);

  const handleChangeText = (text: string) => {
    setQuery(text);
    search(text);
  };

  const handleUserPress = useCallback(async (user: UserResult) => {
    if (isDmMode) {
      setCreating(true);
      try {
        const res = await dmApi.createRoom([user.id]);
        const roomId: string = res.data?.room?.id ?? res.data?.id;
        navigation.replace('DMConversation', {roomId, name: user.username});
      } catch {
        showMessage({message: 'Mesaj başlatılamadı', type: 'danger'});
      } finally {
        setCreating(false);
      }
    } else {
      navigation.navigate('Profile', {username: user.username});
    }
  }, [isDmMode, navigation]);

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcon name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.inputWrap}>
          <MaterialIcon name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder={isDmMode ? 'Kullanıcı ara...' : 'Ara...'}
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={handleChangeText}
            autoFocus
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setUsers([]); }}>
              <MaterialIcon name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading || creating ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          renderItem={({item}) => (
            <TouchableOpacity
              style={styles.userRow}
              onPress={() => handleUserPress(item)}
              activeOpacity={0.75}>
              <Avatar uri={item.avatar_url} username={item.username} size={44} />
              <View style={styles.userInfo}>
                <AppText variant="body" style={styles.username}>{item.username}</AppText>
                {item.bio ? (
                  <AppText variant="caption" numberOfLines={1}>{item.bio}</AppText>
                ) : null}
              </View>
              <MaterialIcon
                name={isDmMode ? 'send' : 'chevron-right'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            query.length >= 2 ? (
              <View style={styles.empty}>
                <AppText variant="caption">Kullanıcı bulunamadı</AppText>
              </View>
            ) : null
          }
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    height: 42,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    paddingVertical: 0,
  },
  loader: {marginTop: spacing.xl},
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  userInfo: {flex: 1, gap: 2},
  username: {fontWeight: '600'},
  empty: {
    alignItems: 'center',
    padding: spacing.xl,
  },
});
