import AsyncStorage from '@react-native-async-storage/async-storage';

const baseUrl = (process.env.EXPO_PUBLIC_API_URL ?? 'https://jeju-localtime-api.onrender.com').replace(/\/$/, '');
export const ACCESS_TOKEN_KEY = 'localtime:access-token';

type QueryValue = string | number | boolean | null | undefined;
type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  query?: Record<string, QueryValue>;
  auth?: boolean;
};

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

function makeUrl(path: string, query?: Record<string, QueryValue>) {
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const params = Object.entries(query ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== '').map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return params.length ? `${url}?${params.join('&')}` : url;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, auth = true, headers: customHeaders, ...request } = options;
  const headers = new Headers(customHeaders);
  if (auth) {
    const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isFormData) headers.set('Content-Type', 'application/json');

  const response = await fetch(makeUrl(path, query), {
    ...request,
    headers,
    body: body === undefined ? undefined : isFormData ? body as FormData : JSON.stringify(body),
  });
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get('content-type') ?? '';
  const payload: unknown = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const error = payload as { code?: string; message?: string } | null;
    throw new ApiError(response.status, error?.code ?? `HTTP_${response.status}`, error?.message ?? '요청 처리 중 오류가 발생했습니다.', payload);
  }
  // 현재 백엔드는 일반 객체와 {success,data} 응답이 혼재하므로 둘 다 지원한다.
  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) return (payload as { data: T }).data;
  return payload as T;
}

export const setAccessToken = (token: string) => AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
export const clearAccessToken = () => AsyncStorage.removeItem(ACCESS_TOKEN_KEY);

