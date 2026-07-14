export type Page<T> = { content:T[]; page?:number; number?:number; size:number; totalElements:number; totalPages:number; last:boolean };
export type UserRole = 'USER'|'SELLER'|'ADMIN';
export type BusinessType = 'RESTAURANT'|'LODGING'|'EXPERIENCE'|'RENTAL_MOBILITY';
export type ProductCategory = 'SAME_DAY_INVENTORY'|'EMPTY_TIME_RESOURCE'|'SAME_DAY_ROOM'|'TOUR_REMAINDER';
export type ProductStatus = 'ACTIVE'|'PAUSED'|'CLOSED';
export type PurchaseStatus = 'PENDING'|'ACCEPTED'|'REFUNDED';

export type LoginResponse = { accessToken:string; userId:number; email:string|null; nickname:string|null; isNewUser:boolean };
export type MeResponse = { id:number; email:string|null; nickname:string; profileImageUrl:string|null; role:UserRole };
export type Product = { id:number; sellerProfileId?:number; name:string; businessName?:string; businessType:BusinessType; category:ProductCategory; type?:'INDOOR'|'OUTDOOR'|null; totalQty:number; qty:number; price:number; minPrice:number; currentPrice:number; discountRate?:number; openTime:string|null; deadline:string; address:string|null; lat:number|null; lng:number|null; distanceMeters?:number; urgent?:boolean; aiInsight?:string; imageUrls?:string[]; status:ProductStatus; createdAt:string; updatedAt:string };
export type ProductInput = { name:string; businessType:BusinessType; category:ProductCategory; type?:'INDOOR'|'OUTDOOR'; qty:number; price:number; minPrice:number; openTime?:string; deadline:string; foot?:'HIGH'|'LOW'; address?:string|null; lat?:number|null; lng?:number|null; status?:ProductStatus };
export type Purchase = { id:number; productId:number; productName:string; businessName?:string; buyerId?:number; buyerNickname?:string; quantity:number; unitPrice:number; totalAmount:number; status:PurchaseStatus; rejectReason?:string|null; requestedAt:string; paymentStatus:'PAID'|'REFUNDED' };
export type Notification = { id:number; type:string; title:string; message:string; referenceType:'PRODUCT'|'PAYMENT'|'SELLER_APPLICATION'|null; referenceId:number|null; read:boolean; createdAt:string };
export type NotificationSettings = { commonEvent:boolean; sellerPayment:boolean; sellerAiPrice:boolean; sellerSettlement:boolean; buyerDeadline:boolean; buyerPaymentResult:boolean };
export type SellerProfile = { id:number; userId:number; sellerApplicationId:number; businessName:string; businessNumber:string; representativeName:string; address:string; latitude:number|null; longitude:number|null; bankName:string; accountNumber:string; accountHolder:string; verificationStatus:'UNVERIFIED'|'VERIFIED'; createdAt:string; updatedAt:string };
export type SellerApplication = { id:number;userId:number;businessName:string;businessNumber:string;openDate:string;representativeName:string;businessDocumentUrl:string|null;status:'PENDING'|'APPROVED'|'REJECTED';rejectionReason:string|null;appliedAt:string;reviewedAt:string|null };
