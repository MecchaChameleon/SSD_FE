import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://kauth.kakao.com/oauth/authorize',
  tokenEndpoint: 'https://kauth.kakao.com/oauth/token',
};

const kakaoClientId = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? '';
const apiUrl = (process.env.EXPO_PUBLIC_API_URL ?? 'https://jeju-localtime-api.onrender.com').replace(/\/$/, '');

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
        const token = await AuthSession.exchangeCodeAsync(
          { clientId: kakaoClientId, code: response.params.code, redirectUri },
          discovery,
        );
        const backendResponse = await fetch(`${apiUrl}/api/auth/kakao`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: token.accessToken }),
        });
        if (!backendResponse.ok) throw new Error(`백엔드 로그인 실패 (${backendResponse.status})`);

        const user = (await backendResponse.json()) as LoginUser;
        await AsyncStorage.multiSet([
          ['localtime:access-token', user.accessToken],
          ['localtime:user', JSON.stringify(user)],
          ['localtime:member', 'true'],
        ]);
        onSuccess(user);
      } catch (e) {
        setError(e instanceof Error ? e.message : '로그인 중 오류가 발생했습니다.');
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
