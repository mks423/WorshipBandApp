# WorshipBandApp (WBA)

찬양팀을 위한 악보 취합 및 송폼 관리 앱.

## 주요 기능

- 악보 취합 및 송폼(song form) 등록
- 악보 코드 스캔 (MVP)
- 간편하고 자유로운 전조(transpose)

## 기술 스택

- [Expo](https://expo.dev) (React Native + TypeScript)
- OCR: Google Cloud Vision API (`DOCUMENT_TEXT_DETECTION`)

## MVP 플로우

1. 다운로드 받은 악보 이미지를 사진 보관함에서 선택하거나 촬영 (`ScanScreen`)
2. Google Cloud Vision으로 이미지의 텍스트를 단어 단위 좌표와 함께 인식
3. 좌표 기반으로 라인을 묶고, 코드 심볼 / 가사 / 섹션 라벨(Verse, Chorus 등)을 구분해 코드를 가사 위치에 정렬 (`chord-scan`)
4. 결과를 곡 구조(Song) 데이터로 변환해 편집 화면에 표시 — 코드·가사 텍스트 수정, 세그먼트 나누기/합치기, 줄·섹션 추가/삭제 (`SongEditorScreen`)
5. 반음 단위 전조 버튼으로 자유롭게 키 변경 (`transpose`)

OCR 정확도는 초안일 뿐이므로, 인식 신뢰도가 낮은 세그먼트는 편집 화면에서 노란색으로 표시됩니다.

## 환경변수 설정

Google Cloud Vision API 키가 필요합니다.

```bash
cp .env.example .env
```

`.env`를 열어 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)에서 발급받은 Vision API 키를 `EXPO_PUBLIC_GOOGLE_VISION_API_KEY`에 입력하세요. `EXPO_PUBLIC_` 접두사가 붙은 값은 앱 번들에 그대로 포함되므로, 발급한 키는 반드시 Vision API로 사용 범위를 제한해두는 것을 권장합니다. `.env`는 `.gitignore`에 포함되어 있어 커밋되지 않습니다.

## 폴더 구조

```
src/
  features/
    chord-scan/        # 악보 코드 스캔 (OCR → 분류)
      ocrProviders/     # OCR 엔진 어댑터 (현재: Google Cloud Vision)
      screens/          # ScanScreen
    song-form/          # 악보 취합, 송폼 등록/편집
      screens/          # SongEditorScreen
    transpose/          # 전조 로직
  components/      # 공용 UI 컴포넌트
  navigation/      # 화면 네비게이션
  types/           # 공용 타입 정의 (Song 모델)
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
