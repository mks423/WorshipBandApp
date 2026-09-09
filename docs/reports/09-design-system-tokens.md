# 09. 디자인 목업에서 스타일 토큰만 추출해 `src/design-system/` 구성

- **커밋:** `96c6c02a3189980de011bd522810b51fcc9c8d60`
- **날짜:** 2026-09-09

## 배경 / 문제

별도로 전달받은 "Worship App" 디자인 목업(`.dc.html`)에서, 레이아웃/컴포넌트 로직은 그대로 두고 **스타일 값만** 뽑아 재사용 가능한 형태로 관리해달라는 요청.

## 변경 내용

`src/design-system/` 신설, 목업의 인라인 스타일에서 값을 추출:

- **colors.ts** — 목업의 밝은 "종이" 팔레트(배경 `#F5F4EF`, 텍스트 `#1B1C18`, 액센트 `#8BB13A` 등)와, 라이브 연주 화면용 어두운 "스테이지" 팔레트(`colors.live`, 배경 `#14150F`, 액센트 `#A9D14D`)를 별도 그룹으로 분리. 앱이 라이트/다크 테마로 전환하는 구조가 아니라 화면 성격 자체가 다르기 때문.
- **typography.ts** — 폰트 크기(8.5~22px)/굵기(500~800) 스케일과, 목업에서 반복되는 조합(제목/카드타이틀/코드텍스트/가사텍스트 등)을 `textStyles` 프리셋으로 정리. Pretendard 폰트 파일 자체는 아직 로드되어 있지 않다는 점을 주석으로 명시(별도 `expo-font` 작업 필요).
- **spacing.ts / radii.ts** — 목업의 padding/gap, border-radius 값을 이름 붙인 스케일로 정리.
- **shadows.ts** — CSS `box-shadow` 3종을 RN의 `shadowColor/Offset/Opacity/Radius` + Android `elevation`으로 변환.
- **motion.ts** — transition 지속시간과 `fadeIn` 키프레임의 시작/끝 값 (RN에는 CSS keyframes가 없어 `Animated`로 재현해야 한다는 주석 포함).

**의도적으로 하지 않은 것**: 이 토큰들을 기존 화면(`SongEditorScreen` 등)에 적용하는 리스타일링. 기존 화면은 여전히 `#2f6feb`, `#eee` 같은 자체 색상을 쓴다 — 순수 토큰 추출까지만 요청받았기 때문.

## 검증

- 타입체크·전체 테스트 통과. 새 모듈이 아직 어디서도 import되지 않으므로 앱 번들/동작에는 영향 없음.
