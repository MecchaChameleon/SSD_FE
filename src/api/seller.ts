import { apiRequest } from './client';
import type { Page, Product, ProductInput, ProductStatus, Reservation, ReservationStatus, SellerApplication, SellerProfile } from './types';

export type SellerProfileInput = {address:string;latitude:number|null;longitude:number|null;bankName:string;accountNumber:string;accountHolder:string};
export type Dashboard = {date:string;reservationCounts:{requested:number;approved:number;noShow:number};dailyRevenue:number;periodRevenue:number;registeredProductCount:number};
export type SalesReport = {startDate:string;endDate:string;totalRevenue:number;totalQuantity:number;items:{productId:number;productName:string;quantity:number;revenue:number}[]};

let latestDashboard: Dashboard | null = null;

export const sellerApi = {
  apply: (body:{businessName:string;businessNumber:string;representativeName:string;businessDocumentUrl?:string|null}) => apiRequest<SellerApplication>('/api/seller/application', {method:'POST', body}),
  myApplication: () => apiRequest<SellerApplication>('/api/seller/application/me'),
  createProfile: (body:SellerProfileInput) => apiRequest<SellerProfile>('/api/seller/profile', {method:'POST', body}),
  profile: () => apiRequest<SellerProfile>('/api/seller/profile'),
  updateProfile: (body:Partial<SellerProfileInput>) => apiRequest<SellerProfile>('/api/seller/profile', {method:'PUT', body}),
  createProduct: async (body:ProductInput) => {
    const product=await apiRequest<Product>('/api/seller/products', {method:'POST', body});
    if(latestDashboard) latestDashboard.registeredProductCount += 1;
    return product;
  },
  products: (query:{status?:ProductStatus;page?:number}={}) => apiRequest<Page<Product>>('/api/seller/products', {query}),
  product: (id:number) => apiRequest<Product>(`/api/seller/products/${id}`),
  updateProduct: (id:number, body:Partial<ProductInput>) => apiRequest<Product>(`/api/seller/products/${id}`, {method:'PUT', body}),
  deleteProduct: async (id:number) => {await apiRequest<void>(`/api/seller/products/${id}`, {method:'DELETE'});if(latestDashboard)latestDashboard.registeredProductCount=Math.max(0,latestDashboard.registeredProductCount-1)},
  updateProductStatus: (id:number,status:ProductStatus) => apiRequest<Product>(`/api/seller/products/${id}/status`, {method:'PATCH',body:{status}}),
  uploadProductImages: (id:number, images:{uri:string;name:string;type:string}[]) => { const form=new FormData(); images.forEach(image=>form.append('images',image as unknown as Blob)); return apiRequest<{imageUrls:string[]}>(`/api/seller/products/${id}/images`,{method:'POST',body:form}); },
  price: (id:number) => apiRequest<{currentPrice:number;discountPct:number;minutesLeft:number;priceTimeline:{time:string;price:number}[]}>(`/api/seller/products/${id}/price`),
  strategy: (id:number) => apiRequest<{message:string}>(`/api/seller/products/${id}/strategy`),
  applyPrice: (id:number,body:{price:number;recommendationId?:number}) => apiRequest<Product>(`/api/seller/products/${id}/price/apply`,{method:'POST',body}),
  reservations: (query:{status?:ReservationStatus;date?:string;page?:number;size?:number}={}) => apiRequest<Page<Reservation>>('/api/seller/reservations',{query}),
  approveReservation: async (id:number) => {const value=await apiRequest<Reservation>(`/api/seller/reservations/${id}/approve`,{method:'PATCH'});if(latestDashboard){latestDashboard.reservationCounts.requested=Math.max(0,latestDashboard.reservationCounts.requested-1);latestDashboard.reservationCounts.approved+=1}return value},
  rejectReservation: async (id:number,body:{reasonCode:'SOLD_OUT'|'CAPACITY_FULL'|'EARLY_CLOSE'|'OTHER';reason:string}) => {const value=await apiRequest<Reservation>(`/api/seller/reservations/${id}/reject`,{method:'PATCH',body});if(latestDashboard)latestDashboard.reservationCounts.requested=Math.max(0,latestDashboard.reservationCounts.requested-1);return value},
  completeReservation: async (id:number) => {const value=await apiRequest<Reservation>(`/api/seller/reservations/${id}/complete`,{method:'PATCH'});if(latestDashboard){latestDashboard.reservationCounts.approved=Math.max(0,latestDashboard.reservationCounts.approved-1);latestDashboard.dailyRevenue+=value.totalAmount;latestDashboard.periodRevenue+=value.totalAmount}return value},
  noShowReservation: async (id:number) => {const value=await apiRequest<Reservation>(`/api/seller/reservations/${id}/no-show`,{method:'PATCH'});if(latestDashboard){latestDashboard.reservationCounts.approved=Math.max(0,latestDashboard.reservationCounts.approved-1);latestDashboard.reservationCounts.noShow+=1}return value},
  dashboard: async (date:string) => {
    const value=await apiRequest<Dashboard>('/api/seller/dashboard',{query:{date}});
    latestDashboard=value;
    return value;
  },
  salesReport: (query:{startDate:string;endDate:string;sort?:'REVENUE_DESC'|'REVENUE_ASC'}) => apiRequest<SalesReport>('/api/seller/sales/report',{query}),
};
