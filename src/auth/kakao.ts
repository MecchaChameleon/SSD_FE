import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { ApiError, authApi } from '../api';

WebBrowser.maybeCompleteAuthSession();

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://kauth.kakao.com/oauth/authorize',
  tokenEndpoint: 'https://kauth.kakao.com/oauth/token',
};

const kakaoClientId = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? '';
export async function withdrawAccount() {
  try { await authApi.withdraw(); }
  catch (error) { if (!(error instanceof ApiError && error.status === 404)) throw error; }
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
  const processedCodeRef = useRef<string | null>(null);
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'jejulocaltime',
    path: 'oauth/kakao',
  });
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: kakaoClientId,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: false,
    },
    discovery,
  );

  useEffect(() => {
    if (!response) return;
    if (response.type !== 'success') {
      setLoading(false);
      if (response.type === 'error') setError('카카오 인증에 실패했습니다.');
      return;
    }

    void (async () => {
      try {
        const authorizationCode = response.params.code;
        if (!authorizationCode || processedCodeRef.current === authorizationCode) return;
        processedCodeRef.current = authorizationCode;
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        const token = await AuthSession.exchangeCodeAsync(
          { clientId: kakaoClientId, code: authorizationCode, redirectUri },
          discovery,
        );
        const user = await authApi.kakaoLogin(token.accessToken);
        await AsyncStorage.multiSet([
          ['localtime:access-token', user.accessToken],
          ['localtime:user', JSON.stringify(user)],
          ['localtime:member', 'true'],
        ]);
        onSuccess(user);
      } catch (e) {
        const message = e instanceof Error ? e.message : '';
        setError(message.includes('429') || message.includes('KOE237')
          ? '카카오 로그인 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'
          : message || '로그인 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, [onSuccess, redirectUri, response]);

  const login = async () => {
    setError(null);
    if (!kakaoClientId) {
      setError('EXPO_PUBLIC_KAKAO_REST_API_KEY가 설정되지 않았습니다.');
      return;
    }
    setLoading(true);
    const result = await promptAsync();
    if (result.type === 'cancel' || result.type === 'dismiss') setLoading(false);
  };

  return { login, loading, error, ready: Boolean(request), redirectUri };
}
