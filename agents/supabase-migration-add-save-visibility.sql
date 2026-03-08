-- place_saves 공개/비공개 설정 컬럼 추가
alter table public.place_saves
  add column if not exists is_public boolean not null default true;

-- 조회 최적화 (viewer + 공개 필터 시)
create index if not exists idx_place_saves_user_public_created
  on public.place_saves (user_id, is_public, created_at desc);
