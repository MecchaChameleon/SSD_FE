import AsyncStorage from '@react-native-async-storage/async-storage';

export const USER_CACHE_KEY = 'localtime:user';
export const SELLER_DASHBOARD_CACHE_KEY = 'localtime:seller-dashboard';

export type CachedUser = {
  nickname?: string | null;
  profileImageUrl?: string | null;
};

export type CachedSellerDashboard = {
  date: string;
  dailyRevenue: number;
  periodRevenue: number;
  registeredProductCount: number;
  paymentCounts: { pending: number; accepted: number; refunded: number };
};

function parse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export function readWebCache<T>(key: string): T | null {
  if (typeof localStorage === 'undefined') return null;
  return parse<T>(localStorage.getItem(key));
}

export async function readCache<T>(key: string): Promise<T | null> {
  const webValue = readWebCache<T>(key);
  if (webValue) return webValue;
  try { return parse<T>(await AsyncStorage.getItem(key)); } catch { return null; }
}

export async function writeCache(key: string, value: unknown): Promise<void> {
  const raw = JSON.stringify(value);
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, raw);
  try { await AsyncStorage.setItem(key, raw); } catch { /* 캐시는 실패해도 앱 동작을 막지 않는다. */ }
}

export async function removeCaches(keys: string[]): Promise<void> {
  if (typeof localStorage !== 'undefined') keys.forEach(key => localStorage.removeItem(key));
  try { await AsyncStorage.multiRemove(keys); } catch { /* best effort */ }
}
