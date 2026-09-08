# WorshipBandApp (WBA)

찬양팀을 위한 악보 취합 및 송폼 관리 앱.

## 주요 기능

- 악보 취합 및 송폼(song form) 등록
- 악보 코드 스캔 (MVP)
- 간편하고 자유로운 전조(transpose)

## 기술 스택

- [Expo](https://expo.dev) (React Native + TypeScript)

## 폴더 구조

```
src/
  features/
    song-form/    # 악보 취합, 송폼 등록
    chord-scan/    # 악보 코드 스캔 (MVP)
    transpose/     # 전조 로직
  components/      # 공용 UI 컴포넌트
  navigation/      # 화면 네비게이션
  types/           # 공용 타입 정의
  utils/           # 공용 유틸 함수
```

## 시작하기

```bash
npm install
npm run start   # Expo 개발 서버 실행
npm run ios     # iOS 시뮬레이터
npm run android # Android 에뮬레이터
npm run web     # 웹
```

> Node 버전: `package.json`의 엔진 요구사항에 맞춰 Node 20.19.4 이상 권장 (현재 개발 환경 20.11.0에서는 npm 설치 시 경고가 발생할 수 있습니다).
