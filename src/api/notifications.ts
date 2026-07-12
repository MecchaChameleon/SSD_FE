import { apiRequest } from './client';
import type { Notification, NotificationSettings, Page } from './types';

export const notificationApi = {
  list: (query:{filter?:'ALL'|'UNREAD';page?:number;size?:number}={}) => apiRequest<Page<Notification>>('/api/notifications',{query}),
  read: (id:number) => apiRequest<void>(`/api/notifications/${id}/read`,{method:'PATCH'}),
  readAll: () => apiRequest<void>('/api/notifications/read-all',{method:'PATCH'}),
  settings: () => apiRequest<NotificationSettings>('/api/users/me/notification-settings'),
  updateSettings: (body:NotificationSettings) => apiRequest<NotificationSettings>('/api/users/me/notification-settings',{method:'PUT',body}),
  registerPushToken: (body:{deviceToken:string;platform:'FCM'|'APNS'}) => apiRequest<void>('/api/users/me/push-tokens',{method:'POST',body}),
  removePushToken: (token:string) => apiRequest<void>(`/api/users/me/push-tokens/${encodeURIComponent(token)}`,{method:'DELETE'}),
};
