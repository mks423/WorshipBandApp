# 04. BPM·곡별 메모·섹션 라벨(Verse/Chorus/Bridge) 추가

- **커밋:** `5310732cca539c5821c3a2c5898bbce93ee21198`
- **날짜:** 2026-09-09

## 배경 / 문제

MVP 검증 이후 다음 단계로 요청받은 기능 목록(A~D) 중, 서버가 필요 없는 로컬 기능들을 우선 구현:

- A) 곡별 Verse/Chorus/Bridge 등 섹션 라벨 표기 (정해진 라벨 + 커스텀 라벨 등록)
- B) BPM/키 메타데이터 등록 (향후 라이브 재생·셋 타임 계산용 데이터)
- D) 곡별 주제 말씀/나눔 내용 메모

## 변경 내용

- `Song` 모델에 `bpm`(number | null), `notes`(string), `sectionMarkers`(SectionMarker[]) 필드 추가.
- 편집 화면 헤더에 BPM 입력 필드와 "+ 메모" 버튼(→ `NotesModal`) 추가.
- **섹션 라벨**: 코드 배지와 동일한 상호작용 패턴 재사용 — "+ 섹션 라벨" 모드 토글 후 빈 자리를 탭하면 `SectionLabelModal`(사전 정의 라벨 버튼 + 커스텀 텍스트 입력)이 뜨고, 확인하면 그 위치에 태그가 표시됨. 기존 태그를 탭하면 라벨 수정/삭제, 드래그하면 위치 이동 — 코드 배지의 tap-vs-drag `PanResponder` 로직(및 이전에 고친 stale-closure 참조 패턴)을 그대로 재사용.
- 기존에 저장된 라이브러리 항목은 이 필드들이 없으므로, `loadLibrary()`에서 `bpm: null / notes: "" / sectionMarkers: []` 기본값을 채워주는 마이그레이션 로직(`withDefaults`) 추가.

## 검증

- 타입체크·전체 테스트(75개, 신규 섹션 마커 CRUD 테스트 포함) 통과.
- 웹 빌드 컴파일 확인.
