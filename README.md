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

1. 저장된 악보 목록(`LibraryScreen`)에서 "새로 스캔하기"를 눌러 악보 이미지/PDF를 선택하거나 촬영 (`ScanScreen`)
2. Google Cloud Vision으로 이미지의 텍스트를 단어 단위 좌표와 함께 인식
3. 좌표 기반으로 라인을 묶고, 코드 심볼 / 가사 / 섹션 라벨(Verse, Chorus 등)을 구분해 코드를 가사 위치에 정렬 (`chord-scan`)
4. 결과를 곡 구조(Song) 데이터로 변환해, 원본 악보 이미지 위에 인식된 코드를 그대로 겹쳐 보여줌 (`SourceOverlayScreen`) — 코드를 탭해 수정/삭제(확인 모달 포함), 드래그로 위치 이동, 빈 자리에 새 코드 추가, 다중 페이지는 편집 화면 안에서 바로 앞뒤로 넘기며 검토 (`SongEditorScreen`)
5. "편집" 버튼의 키 변경 모달로 반음 단위 또는 원하는 키로 바로 전조 (`transpose`)
6. 스캔·수정한 모든 곡은 기기에 자동 저장되어(`library`) 다음 실행에도 유지됨

OCR 정확도는 초안일 뿐이므로, 잘못 인식된 코드는 원본 위에서 직접 고치거나 삭제하면 됩니다.

## 환경변수 설정

Google Cloud Vision API 키가 필요합니다.

```bash
cp .env.example .env
```

`.env`를 열어 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)에서 발급받은 Vision API 키를 `EXPO_PUBLIC_GOOGLE_VISION_API_KEY`에 입력하세요. `.env`는 `.gitignore`에 포함되어 있어 커밋되지 않습니다.

`EXPO_PUBLIC_` 접두사가 붙은 값은 앱 번들에 그대로 포함되므로, 앱을 빌드해서 배포하기 전에 발급한 키를 Google Cloud Console에서 **두 가지 모두** 제한해두는 것을 강력히 권장합니다. 하나만 걸어두면 번들에서 키를 추출해 다른 곳에서 그대로 도용할 수 있습니다.

- **API 제한**: "Cloud Vision API"로만 사용 범위 제한
- **애플리케이션 제한**: iOS 앱 → 이 앱의 Bundle ID(`app.json`의 `expo.ios.bundleIdentifier`), Android 앱 → 패키지 이름 + SHA-1로 제한. 아직 Bundle ID를 정하지 않았다면 실제 기기 빌드(EAS build 등) 전에 먼저 설정해야 합니다.

## 폴더 구조

```
src/
  features/
    chord-scan/        # 악보 코드 스캔 (OCR → 분류)
      ocrProviders/     # OCR 엔진 어댑터 (현재: Google Cloud Vision)
      pdf/              # PDF 페이지를 이미지로 렌더링 (pdf.js, 네이티브/웹 분리)
      screens/          # ScanScreen
    song-form/          # 악보 리뷰/편집, 원본 코드 오버레이, 키 변경, 내보내기
      screens/          # SongEditorScreen, SourceOverlayScreen, KeyChangeModal, ExportModal, ConfirmModal 등
    transpose/          # 전조 로직
    library/            # 스캔한 곡을 기기에 저장/조회/삭제 (AsyncStorage + 이미지 영속화)
      screens/          # LibraryScreen
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
