import { apiRequest } from './client';
import type { LoginResponse, MeResponse } from './types';

export const authApi = {
  kakaoLogin: (accessToken:string) => apiRequest<LoginResponse>('/api/auth/kakao', {method:'POST', body:{accessToken}, auth:false}),
  me: () => apiRequest<MeResponse>('/api/auth/me'),
  updateMe: (body:{nickname?:string;profileImageUrl?:string}) => apiRequest<MeResponse>('/api/users/me', {method:'PATCH', body}),
  withdraw: () => apiRequest<void>('/api/auth/me', {method:'DELETE'}),
  logout: () => apiRequest<void>('/api/auth/logout', {method:'POST'}),
};
