# 07. 웹 localStorage 용량 초과로 스캔 실패하는 버그 수정 (IndexedDB 전환)

- **커밋:** `93182fdea00c4743768f80b33de160bed1e6d329`
- **날짜:** 2026-09-09

## 배경 / 문제

06번 수정 덕분에 이번엔 실제 에러 메시지가 사용자 화면에 떴다:

> Failed to execute 'setItem' on 'Storage': Setting the value of 'wba.library.v1' exceeded the quota.

## 원인

웹에서는 스캔한 이미지를 base64로 인코딩해 라이브러리 JSON 안에 그대로 저장하고 있었다. 사진 한 장만으로도 브라우저 localStorage의 per-origin 용량 한도(보통 5~10MB)를 넘어설 수 있는데, 네이티브에서는 이미지를 파일시스템에 별도 저장(02번 커밋)하는 반면 웹에서는 그 경로가 빠져 있었다.

## 변경 내용

- `src/utils/webImageStore.ts` 신설 (라이브러리 기능이 아니라 `utils/`에 둔 이유: `song-form`도 이 모듈을 참조해야 하는데 `library`가 이미 `song-form`을 참조하고 있어 순환 참조를 피하기 위함).
- 웹에서 `ensureDurableImage`가 `data:`/`blob:` 형태의 sourceImage를 **IndexedDB**(용량 한도가 훨씬 큼)로 옮기고, 저장된 song에는 `wba-idb://<id>` 참조만 남김.
- `SourceOverlayScreen`이 렌더링 전에 이 참조를 `blob:` object URL로 변환(`resolveWebImageUri`)하고, 더 이상 필요 없을 때 해제.
- 네이티브는 영향 없음(이미 문서 디렉토리로 복사하는 경로 사용).

## 검증

- 타입체크·전체 테스트 통과.
- 같은 이미지를 15회 연속 스캔해 강제로 용량 압박 테스트 — 에러 없이 저장, localStorage 라이브러리 블롭은 14KB로 유지(이미지가 전부 IndexedDB로 빠짐), 페이지 리로드 후에도 이미지 정상 표시 확인.
