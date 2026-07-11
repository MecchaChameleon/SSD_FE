# Local Time App

Expo 기반 React Native + TypeScript 앱입니다. 하나의 코드로 iOS, Android, Web 미리보기를 실행합니다.

```bash
npm install
npm run web       # 브라우저 미리보기
npm run android   # Android
npm run ios       # macOS에서 iOS
npm run typecheck
```

## 화면 흐름

스플래시 → 온보딩 3단계 → 카카오 로그인 → 신규 회원가입 → 가입 완료 → 홈

- 온보딩 완료 여부: AsyncStorage `localtime:onboarding-complete`
- 임시 회원 여부: AsyncStorage `localtime:member`
- 실제 카카오 SDK와 백엔드 토큰 API는 로그인 화면의 `onLogin` 자리에 연결합니다.
- 홈 화면의 `컴포넌트 미리보기`를 누르면 React Native 기본 컴포넌트 갤러리를 볼 수 있습니다.

`components/preview.html`은 Figma 컴포넌트 비교용 정적 자료입니다. 실제 온보딩과 로그인 화면은 `src/screens/`의 React Native 코드만 사용합니다.
