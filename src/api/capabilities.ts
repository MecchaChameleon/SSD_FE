/** 2026-07-13 배포 Swagger(/v3/api-docs) 기준 */
export const apiCapabilities = {
  auth: true,
  sellerApplication: true,
  sellerProfile: true,
  sellerProducts: true,
  sellerAiRecommendation: true,
  buyerProducts: true,
  purchases: true,
  reservations: true,
  wishlist: true,
  notifications: true,
  dashboard: true,
  salesReport: true,
} as const;
