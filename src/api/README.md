# API 계층 사용법

화면에서는 `fetch`를 직접 호출하지 않고 역할별 API 객체를 사용한다.

```tsx
const {data, loading, error, reload} = useApiQuery(
  () => sellerApi.products({page: 0}),
  [],
);

const create = useApiMutation(sellerApi.createProduct);
await create.mutate(payload);
```

`apiRequest`가 자동으로 `localtime:access-token`을 읽어 Bearer 헤더를 추가하고, `{success,data}` 응답과 기존 직접 응답을 모두 변환한다. HTTP 오류는 `ApiError(status, code, message)`로 전달된다.

현재 Swagger에 없는 API는 실수로 운영 서버에 호출하지 않도록 `plannedAuthApi`, `plannedBuyerApi`, `plannedSellerApi`, `plannedNotificationApi`로 분리했다. 백엔드가 배포되면 일반 API 객체로 승격하고 화면의 mock state를 교체한다. 실제 배포 목록은 `docs/swagger-implemented-api.md`, 전체 예정 계약은 `docs/frontend-api-spec.md`를 따른다.
