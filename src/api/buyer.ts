import { apiRequest } from './client';
import type { BusinessType, Page, Product, ProductCategory, Reservation, ReservationStatus } from './types';

export type ProductSearch = {query?:string;businessType?:BusinessType;category?:ProductCategory;lat?:number;lng?:number;radiusKm?:number;sort?:'AI_RECOMMENDED'|'DEADLINE_ASC'|'DISTANCE_ASC'|'DISCOUNT_DESC'|'PRICE_ASC';urgent?:boolean;page?:number;size?:number};
export type MapPin = {id:number;name:string;businessName:string;category:ProductCategory;originalPrice:number;currentPrice:number;discountRate:number;latitude:number;longitude:number;address:string|null;deadline:string;urgent:boolean};
export const buyerApi = {
  products: (query:ProductSearch={}) => apiRequest<Page<Product>>('/api/products', {query}),
  mapPins: (query:{swLat?:number;swLng?:number;neLat?:number;neLng?:number}={}) => apiRequest<MapPin[]>('/api/products/map', {query}),
  product: (id:number) => apiRequest<Product>(`/api/products/${id}`),
  purchase: (body:{productId:number;quantity:number}) => apiRequest<Reservation>('/api/buyer/purchases', {method:'POST', body}),
  reserve: (body:{productId:number;quantity:number;visitStartAt?:string;visitEndAt?:string|null}) => apiRequest<Reservation>('/api/buyer/reservations', {method:'POST', body}),
  reservations: (query:{status?:ReservationStatus;page?:number;size?:number}={}) => apiRequest<Page<Reservation>>('/api/buyer/reservations', {query}),
  reservation: (id:number) => apiRequest<Reservation>(`/api/buyer/reservations/${id}`),
  cancelReservation: (id:number, reason:string) => apiRequest<Reservation>(`/api/buyer/reservations/${id}/cancel`, {method:'PATCH', body:{reason}}),
  hideReservation: (id:number) => apiRequest<void>(`/api/buyer/reservations/${id}/history`, {method:'DELETE'}),
  wishlist: (query:{page?:number;size?:number}={}) => apiRequest<Page<Product>>('/api/buyer/wishlist', {query}),
  addWishlist: (productId:number) => apiRequest<void>(`/api/buyer/wishlist/${productId}`, {method:'POST'}),
  removeWishlist: (productId:number) => apiRequest<void>(`/api/buyer/wishlist/${productId}`, {method:'DELETE'}),
};
