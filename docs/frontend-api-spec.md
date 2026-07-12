# 프론트엔드 연동 API 명세

현재 `SSD_FE` 화면과 `SSD_BE` 구현을 기준으로 작성한다.

- `✅`: 백엔드에 현재 구현됨
- `🆕`: 프론트 연동을 위해 백엔드 구현 필요
- Base URL: `EXPO_PUBLIC_API_URL`
- 인증: `Authorization: Bearer {accessToken}`
- 날짜/시각: ISO-8601 (`2026-07-12T17:00:00+09:00` 권장)
- 금액: 정수 원 단위. 상품명, 단가, 할인율, 총액은 서버가 상품 ID로 다시 계산한다.

## 1. 공통 규격

### 성공 응답

```json
{ "success": true, "data": {} }
```

인증/판매자 프로필 API 일부는 현재 `data` 래퍼 없이 객체를 직접 반환하므로, 전 API를 위 형식으로 통일하는 것을 권장한다.

### 실패 응답

```json
{ "success": false, "code": "PRODUCT_SOLD_OUT", "message": "판매 가능한 수량이 부족합니다." }
```

### 페이지 응답

```json
{
  "content": [], "page": 0, "size": 10,
  "totalElements": 0, "totalPages": 0, "last": true
}
```

## 2. 인증·회원 공통

| 상태 | Method | Endpoint | 용도 |
|---|---|---|---|
| ✅ | POST | `/api/auth/kakao` | 카카오 로그인 |
| ✅ | GET | `/api/auth/me` | 내 회원 정보 |
| ✅ | DELETE | `/api/auth/me` | 회원 탈퇴 |
| 🆕 | PATCH | `/api/users/me` | 닉네임/프로필 수정 |
| 🆕 | POST | `/api/auth/logout` | 서버 refresh token을 사용할 경우 로그아웃 |

`POST /api/auth/kakao`

```json
{ "accessToken": "kakao_access_token" }
```

응답 필드: `accessToken`(서비스 JWT), `userId`, `email`, `nickname`, `isNewUser`.

`GET /api/auth/me` 응답 필드: `id`, `email`, `nickname`, `profileImageUrl`, `role`.

`PATCH /api/users/me`

```json
{ "nickname": "로컬이", "profileImageUrl": "https://..." }
```

닉네임 규칙은 프론트와 동일하게 2~10자로 검증한다.

## 3. 구매자 API

### 3.1 상품 탐색

| 상태 | Method | Endpoint | 용도 |
|---|---|---|---|
| 🆕 | GET | `/api/products` | 판매 중 상품 검색/목록 |
| 🆕 | GET | `/api/products/{productId}` | 상품 상세 |

목록 query:

- `query`: 검색어
- `businessType`: `RESTAURANT`, `LODGING`, `EXPERIENCE`, `RENTAL_MOBILITY`
- `category`: `SAME_DAY_INVENTORY`, `EMPTY_TIME_RESOURCE`, `SAME_DAY_ROOM`, `TOUR_REMAINDER`
- `lat`, `lng`, `radiusKm`: 거리 검색
- `sort`: `AI_RECOMMENDED`, `DEADLINE_ASC`, `DISTANCE_ASC`, `DISCOUNT_DESC`, `PRICE_ASC`
- `urgent`: 마감 임박 여부
- `page`, `size`

상품 카드 응답 필드:

```json
{
  "id": 1,
  "name": "흑돼지 도시락",
  "businessName": "춘자네 흑돼지 협재점",
  "businessType": "RESTAURANT",
  "category": "SAME_DAY_INVENTORY",
  "description": "당일 재고 · 마감 22:00",
  "originalPrice": 20000,
  "currentPrice": 7500,
  "minimumPrice": 7000,
  "discountRate": 62.5,
  "remainingQuantity": 2,
  "availableStartAt": "2026-07-12T17:00:00+09:00",
  "reservationCloseAt": "2026-07-12T22:00:00+09:00",
  "address": "제주시 한림읍 한림로 341",
  "latitude": 33.0,
  "longitude": 126.0,
  "distanceMeters": 850,
  "urgent": true,
  "aiInsight": "지금 구매하면 가장 할인율이 높아요.",
  "imageUrls": []
}
```

### 3.2 즉시 구매·예약 내역

| 상태 | Method | Endpoint | 용도 |
|---|---|---|---|
| 🆕 | POST | `/api/buyer/purchases` | 즉시 구매 |
| 🆕 | POST | `/api/buyer/reservations` | 판매자 승인형 예약 요청 |
| 🆕 | GET | `/api/buyer/reservations` | 구매자 예약 내역 |
| 🆕 | GET | `/api/buyer/reservations/{reservationId}` | 예약 상세 |
| 🆕 | PATCH | `/api/buyer/reservations/{reservationId}/cancel` | 예약 취소 |
| 🆕 | DELETE | `/api/buyer/reservations/{reservationId}/history` | 거절/취소 내역 숨김 |

즉시 구매 요청은 프론트의 `PurchasePayload` 중 서버에 다음 값만 보낸다.

```json
{ "productId": 1, "quantity": 2 }
```

`productName`, `originalPrice`, `unitPrice`, `totalPrice`는 조작 방지를 위해 요청에서 제외하고 서버가 계산한다.

예약 요청:

```json
{
  "productId": 1,
  "quantity": 2,
  "visitStartAt": "2026-07-12T19:00:00+09:00",
  "visitEndAt": null
}
```

예약 응답:

```json
{
  "id": 10,
  "product": { "id": 1, "name": "흑돼지 도시락", "businessName": "춘자네 흑돼지 협재점" },
  "quantity": 2,
  "unitPrice": 7500,
  "totalAmount": 15000,
  "visitStartAt": "2026-07-12T19:00:00+09:00",
  "status": "REQUESTED",
  "rejectReason": null,
  "requestedAt": "2026-07-12T18:10:00+09:00"
}
```

상태: `REQUESTED`, `APPROVED`, `REJECTED`, `CANCELED`, `COMPLETED`, `NO_SHOW`.

취소 요청: `{ "reason": "일정 변경" }`.

### 3.3 찜

| 상태 | Method | Endpoint | 용도 |
|---|---|---|---|
| 🆕 | GET | `/api/buyer/wishlist` | 찜 목록 |
| 🆕 | POST | `/api/buyer/wishlist/{productId}` | 찜 추가 |
| 🆕 | DELETE | `/api/buyer/wishlist/{productId}` | 찜 해제 |

찜 목록은 상품 카드 응답에 `wishlisted: true`를 추가한다.

## 4. 판매자 API

### 4.1 입점 신청·사업자 정보

| 상태 | Method | Endpoint | 용도 |
|---|---|---|---|
| ✅ | POST | `/api/seller/application` | 최초 입점 신청 |
| ✅ | GET | `/api/seller/application/me` | 신청 상태 조회 |
| ✅ | POST | `/api/seller/profile` | 승인 후 매장/정산 정보 생성 |
| ✅ | GET | `/api/seller/profile` | 사업자 정보 조회 |
| ✅ | PUT | `/api/seller/profile` | 사업자 정보 수정 |

입점 신청:

```json
{
  "businessName": "춘자네 흑돼지 협재점",
  "businessNumber": "120-23-45678",
  "representativeName": "홍길동",
  "businessDocumentUrl": "https://..."
}
```

신청 상태: `PENDING`, `APPROVED`, `REJECTED`. 응답에 `rejectionReason`, `appliedAt`, `reviewedAt` 포함.

프로필 생성/수정:

```json
{
  "address": "제주시 한림읍 한림로 341",
  "latitude": 33.393,
  "longitude": 126.239,
  "bankName": "제주은행",
  "accountNumber": "123-04-0567890",
  "accountHolder": "홍길동"
}
```

조회 응답에는 위 필드와 `businessName`, `businessNumber`, `representativeName`, `verificationStatus`가 포함된다.

### 4.2 상품 등록·관리

| 상태 | Method | Endpoint | 용도 |
|---|---|---|---|
| ✅ | POST | `/api/seller/products` | 상품/자원 등록 |
| ✅ | GET | `/api/seller/products?status=&page=` | 내 등록 상품 목록 |
| ✅ | GET | `/api/seller/products/{productId}` | 내 상품 상세 |
| ✅ | PUT | `/api/seller/products/{productId}` | 상품 수정 |
| ✅ | DELETE | `/api/seller/products/{productId}` | 상품 삭제 |
| ✅ | PATCH | `/api/seller/products/{productId}/status` | 판매 상태 변경 |
| ✅ | POST | `/api/seller/products/{productId}/images` | 이미지 multipart 업로드 |

프론트 상품등록 필드 매핑:

| 화면 필드 | API 필드 | 값 |
|---|---|---|
| 상품/자원 이름 | `name` | string |
| 카테고리(음식점 등) | `businessType` | `RESTAURANT` 등 |
| 유형(당일 재고 등) | `category` | `SAME_DAY_INVENTORY` 등 |
| 등록 수량 | `qty` | integer |
| 정가/원가 | `price` | integer |
| 최소 판매가 | `minPrice` | integer |
| 판매 시작 시각 | `openTime` | ISO datetime |
| 판매 마감 시각 | `deadline` | ISO datetime |
| 매장 위치 | `address`, `lat`, `lng` | 생략 시 판매자 프로필 값 사용 |

등록 요청 예시:

```json
{
  "name": "흑돼지 도시락",
  "businessType": "RESTAURANT",
  "category": "SAME_DAY_INVENTORY",
  "type": "INDOOR",
  "qty": 7,
  "price": 20000,
  "minPrice": 13000,
  "openTime": "2026-07-12T17:00:00+09:00",
  "deadline": "2026-07-12T22:00:00+09:00",
  "foot": "HIGH",
  "address": null,
  "lat": null,
  "lng": null
}
```

`businessType`별 허용 `category`:

- `RESTAURANT`: `SAME_DAY_INVENTORY`, `EMPTY_TIME_RESOURCE`
- `LODGING`: `SAME_DAY_ROOM`, `EMPTY_TIME_RESOURCE`
- `EXPERIENCE`: `EMPTY_TIME_RESOURCE`
- `RENTAL_MOBILITY`: `TOUR_REMAINDER`, `EMPTY_TIME_RESOURCE`

상품 상태: `ACTIVE`, `PAUSED`, `CLOSED`.

상품 목록 응답의 주요 필드: `id`, `sellerProfileId`, `name`, `businessType`, `category`, `type`, `totalQty`, `qty`, `price`, `minPrice`, `currentPrice`, `openTime`, `deadline`, `address`, `lat`, `lng`, `status`, `createdAt`, `updatedAt`.

삭제 시 `REQUESTED` 또는 `APPROVED` 예약이 있으면 `409 PRODUCT_HAS_ACTIVE_RESERVATION`을 반환한다.

### 4.3 AI 추천가

| 상태 | Method | Endpoint | 용도 |
|---|---|---|---|
| ✅ | GET | `/api/seller/products/{productId}/price` | AI 추천 가격/가격 그래프 |
| ✅ | GET | `/api/seller/products/{productId}/strategy` | AI 판매 전략 문구 |
| 🆕 | POST | `/api/seller/products/{productId}/price/apply` | 추천 가격 적용 |

가격 응답: `currentPrice`, `discountPct`, `minutesLeft`, `priceTimeline[{time, price}]`.

전략 응답: `{ "message": "마감 1시간 전 20% 추가 할인을 권장합니다." }`.

추천가 적용 요청: `{ "price": 12900, "recommendationId": 3 }`.

### 4.4 예약 관리

| 상태 | Method | Endpoint | 용도 |
|---|---|---|---|
| 🆕 | GET | `/api/seller/reservations` | 요청/확정/노쇼 예약 목록 |
| 🆕 | PATCH | `/api/seller/reservations/{id}/approve` | 예약 승인 |
| 🆕 | PATCH | `/api/seller/reservations/{id}/reject` | 예약 거절 |
| 🆕 | PATCH | `/api/seller/reservations/{id}/complete` | 방문 확인 |
| 🆕 | PATCH | `/api/seller/reservations/{id}/no-show` | 미방문 처리 |

목록 query: `status`, `date`, `page`, `size`.

목록 응답 필드: `id`, `productId`, `productName`, `buyerId`, `buyerNickname`, `quantity`, `unitPrice`, `totalAmount`, `visitStartAt`, `status`, `requestedAt`.

거절 요청:

```json
{ "reasonCode": "SOLD_OUT", "reason": "당일 재고 소진" }
```

`reasonCode`: `SOLD_OUT`, `CAPACITY_FULL`, `EARLY_CLOSE`, `OTHER`.

승인 시 재고를 원자적으로 차감하고 부족하면 `409 INSUFFICIENT_STOCK`, 취소 시 재고를 복원한다.

### 4.5 판매자 홈·매출 리포트

| 상태 | Method | Endpoint | 용도 |
|---|---|---|---|
| 🆕 | GET | `/api/seller/dashboard?date=2026-07-12` | 홈 요약 |
| 🆕 | GET | `/api/seller/sales/report` | 기간 매출 리포트 |

대시보드 응답:

```json
{
  "date": "2026-07-12",
  "reservationCounts": { "requested": 3, "approved": 1, "noShow": 1 },
  "dailyRevenue": 163900,
  "periodRevenue": 0,
  "registeredProductCount": 3
}
```

리포트 query: `startDate`, `endDate`, `sort=REVENUE_DESC|REVENUE_ASC`.

리포트 응답:

```json
{
  "startDate": "2026-07-10",
  "endDate": "2026-07-12",
  "totalRevenue": 163900,
  "totalQuantity": 5,
  "items": [
    { "productId": 1, "productName": "제주 갈치 세트", "quantity": 4, "revenue": 106000 }
  ]
}
```

매출에는 `APPROVED`가 아니라 결제 또는 방문 완료 기준인 `COMPLETED` 거래만 포함할 것을 권장한다.

## 5. 알림·알림 설정 공통

| 상태 | Method | Endpoint | 용도 |
|---|---|---|---|
| 🆕 | GET | `/api/notifications?filter=ALL|UNREAD&page=0` | 알림 목록 |
| 🆕 | PATCH | `/api/notifications/{id}/read` | 읽음 처리 |
| 🆕 | PATCH | `/api/notifications/read-all` | 전체 읽음 |
| 🆕 | GET | `/api/users/me/notification-settings` | 설정 조회 |
| 🆕 | PUT | `/api/users/me/notification-settings` | 설정 저장 |
| 🆕 | POST | `/api/users/me/push-tokens` | FCM/APNS 토큰 등록 |
| 🆕 | DELETE | `/api/users/me/push-tokens/{token}` | 토큰 해제 |

알림 응답 필드:

```json
{
  "id": 1,
  "type": "RESERVATION_REQUESTED",
  "title": "새로운 예약 요청이 들어왔습니다!",
  "message": "흑돼지 도시락 2개 예약 요청",
  "referenceType": "RESERVATION",
  "referenceId": 10,
  "read": false,
  "createdAt": "2026-07-12T18:15:00+09:00"
}
```

알림 설정:

```json
{
  "commonEvent": true,
  "sellerReservation": true,
  "sellerAiPrice": true,
  "sellerSettlement": true,
  "buyerDeadline": true,
  "buyerReservationApproved": true
}
```

## 6. 프론트 연동 우선순위

1. 공통 API 클라이언트/JWT 및 `/api/auth/me`
2. 구매자 상품 목록/상세
3. 구매자 즉시 구매·예약·찜
4. 판매자 프로필과 상품 CRUD
5. 판매자 예약 승인/거절과 재고 트랜잭션
6. 판매자 대시보드/매출 집계
7. 알림/알림 설정/푸시 토큰
8. AI 추천가 적용

현재 DB에는 예약, 찜, 알림, push token 테이블이 있지만 해당 Controller/Service API는 아직 구현되어 있지 않다. `V2__remove_payment_and_review.sql` 때문에 결제 테이블은 제거됐을 수 있으므로 즉시 구매의 최종 확정 기준과 외부 결제 연동 여부를 백엔드 구현 전에 확정해야 한다.
