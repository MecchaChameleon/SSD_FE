# 배포 Swagger 기준 실제 API

확인일: 2026-07-13  
원본: `https://jeju-localtime-api.onrender.com/v3/api-docs`

## 인증

- `POST /api/auth/kakao`
- `GET /api/auth/me`
- `DELETE /api/auth/me`

## 판매자 신청/프로필

- `POST /api/seller/application`
- `GET /api/seller/application/me`
- `POST /api/seller/profile`
- `GET /api/seller/profile`
- `PUT /api/seller/profile`

## 판매자 상품

- `POST /api/seller/products`
- `GET /api/seller/products?status=&page=`
- `GET /api/seller/products/{productId}`
- `PUT /api/seller/products/{productId}`
- `DELETE /api/seller/products/{productId}`
- `PATCH /api/seller/products/{productId}/status`
- `POST /api/seller/products/{productId}/images` (`multipart/form-data`, field `images`)
- `GET /api/seller/products/{productId}/price`
- `GET /api/seller/products/{productId}/strategy`

## 관리자/상태 확인

- `POST /api/admin/application/{applicationId}/approve`
- `POST /api/admin/application/{applicationId}/reject`
- `GET /`

구매자 상품, 구매, 예약, 찜, 알림, 판매자 대시보드와 매출 API는 현재 Swagger에 없다. 프론트에서는 `planned*Api`로만 정의하고 화면에서 호출하지 않는다.

주의: Swagger 컴포넌트 이름이 `CreateRequest`, `UpdateRequest`, `Response`로 중복되어 서로 다른 DTO 스키마가 덮여 보인다. 백엔드에서 `@Schema(name = "SellerProfileCreateRequest")`처럼 고유 이름을 부여하는 것이 좋다.
