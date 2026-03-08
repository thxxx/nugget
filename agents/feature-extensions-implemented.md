# 추가 기능 구현 내역 (2026-03-06)

이번 턴에서 즉시 반영한 4개 기능:

1. 내 저장목록 페이지
- `/saves` 라우트 추가
- 최신순/이름순 정렬, 방문상태 필터(전체/예정/완료)

2. 방문 체크 기능
- `place_saves.visit_status` 컬럼 추가 (`planned` | `visited`)
- 지도 내 내 마커 아이콘에 방문상태 반영

3. 장소 태그 기능
- `place_saves.tags` 컬럼 추가 (text[])
- 저장/수정 시 태그 입력 및 저장, 목록/시트에서 태그 표시

4. 지도에서 팔로우 사용자별 토글
- `/map` 상단에 팔로우 유저 토글 버튼 추가
- 유저별로 마커 표시/숨김 제어

필수 DB 반영 SQL:
- `agents/supabase-migration-add-visit-tags.sql`
