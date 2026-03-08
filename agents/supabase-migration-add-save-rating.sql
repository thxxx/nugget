-- place_saves 별점(1~3) 컬럼 추가
alter table public.place_saves
  add column if not exists rating smallint not null default 3;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'place_saves_rating_range'
  ) then
    alter table public.place_saves
      add constraint place_saves_rating_range check (rating between 1 and 3);
  end if;
end $$;
