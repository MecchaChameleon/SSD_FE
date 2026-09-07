import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { authApi } from '../api';

// On web, the backend returns to /oauth/kakao in the popup. Complete that
// browser session instead of rendering another copy of the app in the popup.
WebBrowser.maybeCompleteAuthSession({ skipRedirectCheck: true });

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

const LAST_LOGIN_TICKET_KEY = 'localtime:last-login-ticket';

export function useKakaoLogin(onSuccess: (user: LoginUser) => void | Promise<void>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const exchangingTickets = useRef(new Set<string>());
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'jejulocaltime',
    path: 'oauth/kakao',
  });

  const completeLogin = useCallback(async (url: string): Promise<boolean> => {
    if (url !== redirectUri && !url.startsWith(`${redirectUri}?`)) return false;

    const params = new URL(url).searchParams;
    const ticket = params.get('ticket');
    const loginError = params.get('error');
    if (!ticket) {
      setError(loginError ?? '카카오 로그인 결과를 확인할 수 없습니다.');
      return true;
    }

    // Android can deliver the callback through both openAuthSessionAsync and
    // Linking. The backend ticket is single-use, so exchange it only once.
    if (exchangingTickets.current.has(ticket)) return true;
    exchangingTickets.current.add(ticket);
    setError(null);
    setLoading(true);

    try {
      const lastTicket = await AsyncStorage.getItem(LAST_LOGIN_TICKET_KEY);
      if (lastTicket === ticket) {
        // The process may have restarted after storage completed but before
        // navigation. Resume navigation from the cached login response.
        const cachedUser = await AsyncStorage.getItem('localtime:user');
        if (cachedUser) await onSuccess(JSON.parse(cachedUser) as LoginUser);
        return true;
      }

      const user = await authApi.exchangeKakaoTicket(ticket);
      await AsyncStorage.multiSet([
        ['localtime:access-token', user.accessToken],
        ['localtime:user', JSON.stringify(user)],
        ['localtime:member', 'true'],
        [LAST_LOGIN_TICKET_KEY, ticket],
      ]);
      await onSuccess(user);
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : '로그인 중 오류가 발생했습니다.');
    } finally {
      exchangingTickets.current.delete(ticket);
      setLoading(false);
    }
    return true;
  }, [onSuccess, redirectUri]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    // On some Android devices AppState becomes active before WebBrowser sees
    // the redirect, causing openAuthSessionAsync to return `dismiss`.
    const subscription = Linking.addEventListener('url', ({ url }) => {
      void completeLogin(url);
    });
    void Linking.getInitialURL().then(url => {
      if (url) void completeLogin(url);
    });
    return () => subscription.remove();
  }, [completeLogin]);

  const login = async () => {
    setError(null);
    setLoading(true);
    try {
      const client = Platform.OS === 'web' ? 'web' : 'app';
      const webReturnUri =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? `${window.location.origin}/oauth/kakao`
          : undefined;
      const result = await WebBrowser.openAuthSessionAsync(
        authApi.kakaoLoginStartUrl(client, webReturnUri),
        webReturnUri ?? redirectUri,
      );

      if (result.type === 'success') {
        await completeLogin(result.url);
      } else if (Platform.OS === 'android') {
        // Recover the URL attached to the activity even if WebBrowser won the
        // AppState/redirect race and reported `dismiss`.
        const url = await Linking.getInitialURL();
        if (url) await completeLogin(url);
      }
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error, ready: true, redirectUri };
}
