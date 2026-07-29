import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { authApi } from '../api';

WebBrowser.maybeCompleteAuthSession();

export async function withdrawAccount() {
  await authApi.withdraw();
}

export type LoginUser = {
  accessToken: string;
  userId: number;
  email: string | null;
  nickname: string | null;
  isNewUser: boolean;
};

export function useKakaoLogin(onSuccess: (user: LoginUser) => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'jejulocaltime',
    path: 'oauth/kakao',
  });

  const login = async () => {
    setError(null);
    setLoading(true);
    try {
      const client = Platform.OS === 'web' ? 'web' : 'app';
      const result = await WebBrowser.openAuthSessionAsync(authApi.kakaoLoginStartUrl(client), redirectUri);
      if (result.type !== 'success') return;

      const params = new URL(result.url).searchParams;
      const ticket = params.get('ticket');
      const loginError = params.get('error');
      if (!ticket) throw new Error(loginError ?? '카카오 로그인 결과를 확인할 수 없습니다.');

      const user = await authApi.exchangeKakaoTicket(ticket);
      await AsyncStorage.multiSet([
        ['localtime:access-token', user.accessToken],
        ['localtime:user', JSON.stringify(user)],
        ['localtime:member', 'true'],
      ]);
      onSuccess(user);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error, ready: true, redirectUri };
}
