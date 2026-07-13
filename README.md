# Local Time App

Expo 기반 React Native + TypeScript 앱입니다. 하나의 코드로 iOS, Android, Web 미리보기를 실행합니다.

```bash
npm install
npm run web       # 브라우저 미리보기
npm run android   # Android
npm run ios       # macOS에서 iOS
npm run typecheck
```

Windows PowerShell에서 실행 정책 오류로 `npm.ps1`이 차단되는 경우에는 아래처럼
`npm.cmd`를 사용합니다.

```powershell
npm.cmd install
npm.cmd run dev:web
```

웹 개발 서버는 `http://localhost:8081`에서 열립니다. `--dev-client`는 Android/iOS
개발 빌드용 옵션이므로 웹 미리보기에는 사용하지 않습니다. 캐시를 초기화하며 모바일
개발 서버를 실행하려면 `npm.cmd run dev -- --dev-client --clear`를 사용합니다.

환경 변수는 프로젝트 루트의 `.env`에 설정합니다.

```dotenv
EXPO_PUBLIC_KAKAO_REST_API_KEY=카카오_REST_API_키
EXPO_PUBLIC_API_URL=백엔드_API_URL
```

## 화면 흐름

스플래시 → 온보딩 3단계 → 카카오 로그인 → 신규 회원가입 → 가입 완료 → 홈

- 온보딩 완료 여부: AsyncStorage `localtime:onboarding-complete`
- 임시 회원 여부: AsyncStorage `localtime:member`
- 실제 카카오 SDK와 백엔드 토큰 API는 로그인 화면의 `onLogin` 자리에 연결합니다.
- 홈 화면의 `컴포넌트 미리보기`를 누르면 React Native 기본 컴포넌트 갤러리를 볼 수 있습니다.

`components/preview.html`은 Figma 컴포넌트 비교용 정적 자료입니다. 실제 온보딩과 로그인 화면은 `src/screens/`의 React Native 코드만 사용합니다.
# 카카오 지도 설정

구매자 지도 화면은 카카오맵 JavaScript SDK를 사용합니다. Kakao Developers에서 앱의 JavaScript 키를 확인하고 `.env`에 등록하세요.

```env
EXPO_PUBLIC_KAKAO_JAVASCRIPT_KEY=카카오_JavaScript_키
```

Kakao Developers의 플랫폼 > Web에 로컬 개발 주소(예: `http://localhost:8081`)와 배포 도메인을 등록해야 지도가 로드됩니다. REST API 키와 JavaScript 키는 서로 다른 키입니다.
