-- 기존 place_saves 테이블에 방문 상태/태그 컬럼을 추가합니다.
alter table public.place_saves
  add column if not exists visit_status text not null default 'planned',
  add column if not exists tags text[] not null default '{}',
  add column if not exists is_public boolean not null default true,
  add column if not exists rating smallint not null default 3;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'place_saves_visit_status'
  ) then
    alter table public.place_saves
      add constraint place_saves_visit_status check (visit_status in ('planned', 'visited'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'place_saves_tags_count'
  ) then
    alter table public.place_saves
      add constraint place_saves_tags_count check (coalesce(array_length(tags, 1), 0) <= 10);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'place_saves_rating_range'
  ) then
    alter table public.place_saves
      add constraint place_saves_rating_range check (rating between 1 and 3);
  end if;
end $$;
