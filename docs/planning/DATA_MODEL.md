# 데이터 모델 — WBA

상태: 초안 v1 · 2026-10-19

클라우드 대상은 Postgres(Supabase)입니다. 같은 모델의 **일부**를 1단계부터 기기의 SQLite에 그대로 두기 때문에, 클라우드가 생기기 전부터 기기 스키마가 동기화를 받을 준비가 되어 있습니다.

---

## 1. 핵심 분리

```
Song (음악 작품)                  "How Great Is Our God" — 제목, 작곡/작사자, CCLI 번호
 └─ ScoreAsset (변경 불가 파일)   누군가 올린 PDF/사진, sha256 주소
     └─ ScorePage                 그 파일의 n번째 페이지 (+ 캐시된 래스터)
     └─ RecognitionJob → RecognitionResult → MusicalElement[]   (초안, 원본 bbox 포함)
 └─ ScoreDocument (변경 불가 버전)  검토된 구조화 콘텐츠: ChordChartDoc 또는 ScoreIR/MusicXML
 └─ Arrangement (편집 가능)       "주일 풀 밴드": 기준 문서, 키, BPM, 흐름, 메모
     └─ FlowItem[]                반복/지시사항이 있는 섹션 블록의 순서
     └─ PerformanceVersion        특정 날짜 / 송폼에 쓰인 고정 스냅샷
Setlist → SetlistItem → PerformanceVersion (또는 Arrangement + 키 지정)
Annotation → (ScorePage | ScoreDocument) · 범위 personal | team
```

규칙:
- `score_assets`와 `score_documents` 행은 **추가만 가능**합니다. 수정하면 새 `score_documents` 버전이 생깁니다.
- 전조된 결과는 **원본 데이터로 저장하지 않습니다.** `(score_document, key)`에서 다시 생성하며, `render_cache`에 캐시할 수는 있습니다.
- 교회 소유의 모든 행에는 `church_id`가 있습니다. 개인 데이터에는 `owner_id`가 있고, `church_id`는 개인 워크스페이스이거나 교회입니다.

개인 워크스페이스는 `kind = 'personal'`인 교회일 뿐입니다. 그래서 개인 사용자와 팀이 같은 코드 경로와 RLS 모델을 씁니다.

## 2. 테이블 (Postgres)

규칙: `id uuid`(UUIDv7, 오프라인 생성이 되도록 클라이언트에서 생성), `created_at`, `updated_at`, `deleted_at`(소프트 삭제 / 동기화 툼스톤), `version int`(낙관적 동시성 제어).

### 테넌시와 계정
```sql
churches (id, name, kind text check (kind in ('personal','church')), locale, country,
          plan text, created_at, ...)
profiles (id uuid pk references auth.users, display_name, locale, instrument, ...)
church_memberships (church_id, user_id, role text check (role in ('admin','leader','musician','viewer')),
                    status text ('invited','active','removed'), invited_by, primary key (church_id, user_id))
```

### 라이브러리
```sql
songs (id, church_id, title, title_alt,            -- 예: 한국어 + 영어 제목
       artists text[], writers text[], ccli_number, copyright,
       default_key text, bpm int, time_signature text, tags text[], category text,
       search tsvector generated, ...)

score_assets (id, church_id, song_id null, uploaded_by,
              sha256 text not null, storage_key text not null, mime text, byte_size bigint,
              page_count int, original_filename, created_at,
              unique (church_id, sha256))           -- 중복 제거. 변경 불가: UPDATE 정책 없음

score_pages (id, asset_id, page_number int, width_px int, height_px int,
             raster_storage_key text null, quality_score real null,
             unique (asset_id, page_number))
```

### 인식
```sql
recognition_jobs (id, church_id, asset_id, pages int[] , mode text ('chords','full_score'),
                  status text ('queued','running','succeeded','failed','canceled'),
                  pipeline_version text, providers jsonb,   -- {"ocr":"gcv-2026","omr":"homr-0.6.2","llm":"..."}
                  cost_units numeric, error text, requested_by, started_at, finished_at)

recognition_results (id, job_id, page_number, stage text ('ocr','omr','llm','merged','validated'),
                     provider text, payload jsonb,          -- 감사 / 재병합을 위해 엔진 원본 출력 보관
                     created_at)

musical_elements (id, job_id, page_number,
                  kind text ('chord','note','rest','key_sig','time_sig','barline','repeat',
                             'lyric','section_label','title','text'),
                  measure_index int null, value jsonb,      -- 예: {"root":"B","alter":-1,"quality":"maj7","bass":null}
                  bbox real[4],                             -- 페이지 기준 정규화 [x,y,w,h]
                  confidence real, provenance text,
                  flags text[],                             -- 예: {'measure_duration','key_conflict'}
                  review_status text ('pending','accepted','corrected','rejected'),
                  corrected_value jsonb, reviewed_by, reviewed_at)
```
`musical_elements`는 **검토 작업 공간**입니다. 인식된 기호마다 한 행이라서, 검토 UI가 "2페이지에서 표시된 항목 전부"를 조회할 수 있습니다. 검토가 끝나면 `score_documents` 버전으로 묶이고, 이후 주요 경로에서는 읽지 않습니다.

### 구조화 콘텐츠와 편곡
```sql
score_documents (id, church_id, song_id, source_asset_id null, source_job_id null,
                 kind text ('chord_chart','score'),
                 doc jsonb,                  -- ChordChartDoc 또는 ScoreIR (AI_RECOGNITION_RESEARCH §3 참고)
                 musicxml_storage_key null,  -- kind='score'일 때
                 doc_version int, parent_id null, created_by, created_at)   -- 추가만 가능

song_sections (id, score_document_id, label text, ordinal int,
               start_measure int null, end_measure int null,              -- 모드 ③
               page_number int null, anchor_x real null, anchor_y real null, -- 모드 ① (현재의 SectionMarker)
               bar_count int null)

arrangements (id, church_id, song_id, name, score_document_id, key text, capo int,
              bpm int, notes text, is_default bool, created_by, version int, ...)

arrangement_flow_items (id, arrangement_id, position int, section_id null,  -- null = "자유 찬양" 같은 자유 블록
                        label_override text, repeat_count int default 1, skipped bool,
                        bar_count int null, directions text[], note text)

performance_versions (id, church_id, arrangement_id, label, key, capo,
                      snapshot jsonb,         -- 배포 시점의 편곡 + 흐름을 고정
                      published_by, published_at)                -- 추가만 가능
```

### 송폼
```sql
setlists (id, church_id, title, service_date date null, status text ('draft','published'),
          notes, created_by, version int, ...)
setlist_items (id, setlist_id, position int, song_id,
               arrangement_id null, performance_version_id null,  -- 배포된 셋은 performance_version을 고정
               key_override text null, note text)
```

### 필기, 공유, 히스토리, 사용량
```sql
annotations (id, church_id, owner_id, scope text ('personal','team'),
             target_kind text ('score_page','score_document'), target_id uuid,
             arrangement_id null,                    -- 팀 필기는 편곡별로 둘 수 있음
             layer text, strokes jsonb,              -- [{tool,color,width,points:[[x,y,p],...]}] 페이지 기준 정규화
             text_items jsonb, bookmarks jsonb, updated_at)

shares (id, church_id, resource_kind text, resource_id uuid,
        grantee_kind text ('user','role','link'), grantee text, permission text ('view','comment','edit'),
        expires_at null, created_by)

change_log (id bigserial, church_id, entity_kind text, entity_id uuid, entity_version int,
            command text,          -- 예: 'arrangement.reorderFlow'
            patch jsonb, actor_id, actor_kind text ('user','agent'), created_at)

usage_events (id, church_id, kind text ('ocr_page','llm_call','omr_page','storage_bytes'),
              units numeric, cost_usd numeric, job_id null, created_at)
church_quotas (church_id, kind, period text, limit_units numeric)
```

## 3. 관계

```
churches 1─* church_memberships *─1 profiles
churches 1─* songs 1─* score_assets 1─* score_pages
score_assets 1─* recognition_jobs 1─* recognition_results
recognition_jobs 1─* musical_elements
songs 1─* score_documents (버전; parent_id 체인) 1─* song_sections
songs 1─* arrangements *─1 score_documents
arrangements 1─* arrangement_flow_items *─0..1 song_sections
arrangements 1─* performance_versions
setlists 1─* setlist_items *─1 songs / arrangements / performance_versions
annotations *─1 (score_pages | score_documents)
```

## 4. Row Level Security

```sql
create function is_member(c uuid, min_role text) returns bool ...  -- 역할 순위: viewer<musician<leader<admin

-- 읽기: 활성 멤버 누구나
create policy read on songs for select using (is_member(church_id,'viewer'));
-- 라이브러리/편곡/송폼 쓰기: leader 이상
create policy write on arrangements for all using (is_member(church_id,'leader'));
-- 변경 불가 테이블: 추가만
create policy ins on score_assets for insert with check (is_member(church_id,'musician'));
-- (score_assets, score_documents, performance_versions에는 update/delete 정책 없음)
-- 필기: personal = 본인만, team = leader가 쓰고 멤버가 읽음
create policy ann_read on annotations for select
  using ((scope='personal' and owner_id=auth.uid()) or (scope='team' and is_member(church_id,'viewer')));
```
스토리지 버킷 키는 `/{church_id}/originals/{sha256}` 형식이고, 스토리지 정책도 같은 `is_member`를 씁니다.

## 5. 현재 기기 모델과의 대응

| 현재 (`src/types/song.ts`) | 새 모델 |
|---|---|
| `Song` (페이지마다 하나!) + `groupId`/`pageNumber` | `songs` (작품마다 하나) + `score_assets` (파일마다 하나, 즉 `groupId`) + `score_pages` |
| `Song.sourceImage` | `score_pages.raster_storage_key` (원본은 그대로 보관, 래스터는 캐시) |
| `sections/lines/segments` + `confidence` + `chordPosition` | `score_documents.doc` (`kind='chord_chart'`), segment에 `SourceRef` 추가 |
| `originalKey` + `transposeSteps` | `songs.default_key` + `arrangements.key` (반음 수가 아니라 목표 키를 저장해서 표기가 명확함) |
| `sectionMarkers` | 페이지 위치가 있는 `song_sections` |
| `bpm`, `notes` | `arrangements.bpm`, `arrangements.notes` (곡 단위 기본값은 `songs`에) |
| `Setlist.songIds` | `setlists` + `setlist_items` |

일회성 마이그레이션이 AsyncStorage의 `wba.library.v1` 덩어리를 읽어 SQLite에 기록합니다(로드맵 1.3).

## 6. 기기 SQLite (1단계)

`church_memberships`, `shares`, `usage_events`, `church_quotas`를 뺀 같은 테이블을 쓰고, `kind='personal'`인 로컬 `churches` 행 하나를 둡니다. 추가로:

```sql
outbox (seq integer primary key, command text, payload json, created_at, synced_at null)
sync_state (table_name text primary key, cursor text)
```
모든 커맨드는 엔티티 변경, `change_log` 행, `outbox` 행을 **하나의 트랜잭션**으로 기록합니다. 5단계 전까지 outbox는 비워지지 않지만 비용이 들지 않고, 쓰기 경로를 처음부터 최종 형태로 유지할 수 있습니다.
