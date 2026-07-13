import { apiRequest } from './client';
import type { BusinessType, Page, Product, ProductCategory, Purchase, PurchaseStatus } from './types';

export type ProductSearch = {query?:string;businessType?:BusinessType;category?:ProductCategory;lat?:number;lng?:number;radiusKm?:number;sort?:'AI_RECOMMENDED'|'DEADLINE_ASC'|'DISTANCE_ASC'|'DISCOUNT_DESC'|'PRICE_ASC';urgent?:boolean;page?:number;size?:number};
export type MapPin = {id:number;name:string;businessName:string;category:ProductCategory;originalPrice:number;currentPrice:number;discountRate:number;latitude:number;longitude:number;address:string|null;deadline:string;urgent:boolean};
export const buyerApi = {
  products: (query:ProductSearch={}) => apiRequest<Page<Product>>('/api/products', {query}),
  mapPins: (query:{swLat?:number;swLng?:number;neLat?:number;neLng?:number}={}) => apiRequest<MapPin[]>('/api/products/map', {query}),
  product: (id:number) => apiRequest<Product>(`/api/products/${id}`),
  purchase: (body:{productId:number;quantity:number}) => apiRequest<Purchase>('/api/buyer/purchases', {method:'POST', body}),
  purchases: (query:{status?:PurchaseStatus;page?:number;size?:number}={}) => apiRequest<Page<Purchase>>('/api/buyer/purchases', {query}),
  purchaseDetail: (id:number) => apiRequest<Purchase>(`/api/buyer/purchases/${id}`),
  hidePurchase: (id:number) => apiRequest<void>(`/api/buyer/purchases/${id}/history`, {method:'DELETE'}),
  wishlist: (query:{page?:number;size?:number}={}) => apiRequest<Page<Product>>('/api/buyer/wishlist', {query}),
  addWishlist: (productId:number) => apiRequest<void>(`/api/buyer/wishlist/${productId}`, {method:'POST'}),
  removeWishlist: (productId:number) => apiRequest<void>(`/api/buyer/wishlist/${productId}`, {method:'DELETE'}),
};
