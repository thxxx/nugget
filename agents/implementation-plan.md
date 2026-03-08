# nugget 구현 문서 v0.1

작성일: 2026-03-06

## 1) 요구사항 확정본

- 서비스명: `nugget`
- 핵심 기능: 유저가 맛집/카페를 저장하고, 서로 팔로우하여 상대 저장 목록을 지도에서 확인
- 플랫폼: 모바일 우선 (데스크탑도 모바일 폭으로 고정 렌더링)
- 인증: Supabase Auth 미사용, 닉네임 기반 간편 로그인
- 세션: `localStorage + Zustand`
- 닉네임 중복 기준: 대소문자 구분 없음
- 저장 메모 공개 범위: 본인 + 팔로워만 조회 가능
- 장소 저장 중복: 유저 간 중복 저장 허용 (동일 장소를 여러 유저가 저장 가능)
- 지도 마커 정책:
  - 내 장소: 전용 아이콘
  - 타인 장소: 사용자별 색상 구분
- 팔로우 정책: 단방향 팔로우
- 장소 저장 UX:
  - 검색 결과 클릭 -> 지도에 핀 표시 + BottomSheet로 정보 표시
  - BottomSheet의 저장 버튼 클릭 시 메모 작성/저장
- 메인 IA:
  - Bottom Navigator: `지도`, `Follows`
  - `Follows` 탭: `내가 팔로우`, `나를 팔로우`, `유저 검색`
- 지도 API: 네이버 지도 API
- 스택: Next.js + Supabase

## 2) 구현 범위 (MVP+)

- 포함
  - 닉네임 로그인/가입
  - 장소 검색/지도 표시/저장/메모 수정
  - 팔로우/언팔로우
  - 팔로잉 사용자 저장 장소 지도 오버레이
  - Follows 3개 탭
  - 기본 프로필(닉네임, 저장 수, 팔로워/팔로잉 수)
- 제외 (추후)
  - 푸시 알림
  - 신고/차단
  - 이미지 업로드
  - 실시간 동기화(웹소켓)

## 3) 아키텍처

## 3.1 앱 구조

- App Router 기준 라우트
  - `/` : 닉네임 로그인/가입 진입
  - `/map` : 지도 메인 + 장소 검색 + 저장 BottomSheet
  - `/follows` : 팔로우 목록/팔로워 목록/유저 검색
- 공통 레이아웃
  - 화면 최대 폭 `430px`
  - 중앙 정렬 + 하단 탭 고정
  - iOS safe-area 대응

## 3.2 데이터 접근 방식

- 원칙: 브라우저에서 Supabase 테이블 직접 호출 최소화
- Next.js Route Handler(`app/api/*`)에서 DB와 Kakao 검색 API 호출
- 클라이언트는 API 호출 + Zustand 캐시
- 이유
  - Kakao Local Search API secret 보호
  - 로직 일원화 (팔로워 권한 체크, 입력 검증)

## 3.3 세션 모델

- `localStorage` 키 예시: `nugget_session_v1`
- 저장 값
  - `userId`
  - `nickname`
  - `loggedInAt`
- 앱 시작 시:
  - 세션 restore
  - DB의 유저 존재 여부 재검증 실패 시 세션 폐기

주의: 현재 모델은 "간편 로그인"이므로 보안 강도는 낮다. MVP에서는 기능 우선으로 진행하고, 추후 Supabase Auth로 전환한다.

## 4) Tailwind + shadcn 디자인 시스템

## 4.1 디자인 원칙

- 모바일 우선, 터치 타겟 최소 `44px`
- 정보 밀도 낮추고 지도 중심
- 컴포넌트 재사용 우선

## 4.2 토큰 (Tailwind v4 CSS 변수)

- color
  - `--nugget-bg`: 앱 배경
  - `--nugget-surface`: 카드/시트 배경
  - `--nugget-text`: 기본 텍스트
  - `--nugget-muted`: 보조 텍스트
  - `--nugget-primary`: CTA
  - `--nugget-border`: 경계
  - `--nugget-my-pin`: 내 마커 색
- spacing/radius
  - `--radius-sm|md|lg|xl`
  - `--space-1..8`

## 4.3 공통 컴포넌트 (shadcn 기반)

- `AppShell` (최대폭, safe area, 하단 탭)
- `TopSearchBar` (지도 상단 검색)
- `BottomNav` (`지도`, `Follows`)
- `PlaceBottomSheet` (장소 정보, 저장/수정)
- `UserRow` (닉네임, 관계 상태, 팔로우 버튼)
- `EmptyState`
- `ConfirmDialog`
- 기본 UI primitive
  - Button, Input, Tabs, Dialog, Drawer, Badge, Avatar, Separator, Skeleton

## 4.4 Confirm/대화상자 정책

- 회원가입 확인:
  - 없는 닉네임 입력 시 `없는 닉네임입니다. 가입하시겠습니까?`
- 언팔로우 확인:
  - `정말 언팔로우할까요?`
- 저장 취소(unsave) 확인:
  - `저장을 취소할까요?`
- 단순 저장/메모수정은 confirm 없이 즉시 처리 + 토스트

## 5) DB 스키마 설계 (Supabase/Postgres)

## 5.1 테이블 개요

- `users`
  - 닉네임 유니크(대소문자 무시)
- `places`
  - 네이버 장소 마스터
- `place_saves`
  - 유저가 저장한 장소 + 메모
- `follows`
  - 단방향 팔로우 관계

## 5.2 SQL (초안)

```sql
-- 필요 확장
create extension if not exists pgcrypto;

-- updated_at 자동 갱신 트리거
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- users
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  nickname_normalized text generated always as (lower(trim(nickname))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_nickname_not_blank check (char_length(trim(nickname)) between 2 and 20),
  constraint users_nickname_unique_ci unique (nickname_normalized)
);

create trigger trg_users_updated_at
before update on public.users
for each row execute function set_updated_at();

-- places (네이버 장소 마스터)
create table if not exists public.places (
  id bigint generated always as identity primary key,
  external_place_key text not null unique,
  name text not null,
  road_address text,
  jibun_address text,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  category text,
  phone text,
  raw_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_places_lat_lng on public.places (latitude, longitude);
create trigger trg_places_updated_at
before update on public.places
for each row execute function set_updated_at();

-- place_saves (유저별 장소 저장 + 메모)
create table if not exists public.place_saves (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  place_id bigint not null references public.places(id) on delete cascade,
  memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint place_saves_memo_length check (char_length(memo) <= 500),
  constraint place_saves_user_place_unique unique (user_id, place_id)
);

create index if not exists idx_place_saves_user_created_at on public.place_saves (user_id, created_at desc);
create index if not exists idx_place_saves_place_id on public.place_saves (place_id);
create trigger trg_place_saves_updated_at
before update on public.place_saves
for each row execute function set_updated_at();

-- follows (단방향)
create table if not exists public.follows (
  id bigint generated always as identity primary key,
  follower_user_id uuid not null references public.users(id) on delete cascade,
  following_user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint follows_no_self check (follower_user_id <> following_user_id),
  constraint follows_unique unique (follower_user_id, following_user_id)
);

create index if not exists idx_follows_follower on public.follows (follower_user_id);
create index if not exists idx_follows_following on public.follows (following_user_id);

-- MVP에서는 API 레이어로 권한 통제
alter table public.users disable row level security;
alter table public.places disable row level security;
alter table public.place_saves disable row level security;
alter table public.follows disable row level security;
```

## 5.3 조회 규칙

- 지도 표시 데이터
  - 내 저장 + 내가 팔로우한 유저 저장
- 메모 조회 권한
  - 내 메모: 항상 가능
  - 타인 메모: "내가 그 유저를 팔로우한 경우"만 가능

## 6) API 스펙 (Route Handler)

- `POST /api/session/login-or-signup`
  - input: `{ nickname, signupOnMissing }`
  - flow
    - `nickname_normalized`로 users 조회
    - 존재: 로그인 성공 반환
    - 미존재 + signupOnMissing=false: `NOT_FOUND`
    - 미존재 + signupOnMissing=true: users insert 후 반환

- `GET /api/users/search?q=...&viewerId=...`
  - 닉네임 부분검색
  - 각 유저별 관계 상태(`isFollowing`, `isFollower`) 함께 반환

- `POST /api/follows`
  - input: `{ followerUserId, followingUserId }`
  - 중복/self-follow 방지 후 생성

- `DELETE /api/follows`
  - input: `{ followerUserId, followingUserId }`
  - 관계 삭제

- `POST /api/places/search`
  - input: `{ query }`
  - 서버에서 Kakao Local Search API 호출 후 정규화 반환

- `POST /api/saves`
  - input: `{ userId, placePayload, memo }`
  - places upsert -> place_saves upsert

- `PATCH /api/saves/:saveId`
  - input: `{ userId, memo }`
  - 본인 저장 건만 수정

- `DELETE /api/saves/:saveId`
  - input: `{ userId }`
  - 본인 저장 건만 삭제

- `GET /api/map/feed?viewerId=...`
  - 내 저장 + 팔로잉 저장 목록 반환
  - 타인 메모는 팔로우 관계 검증 후만 포함

## 7) 페이지/기능 상세

## 7.1 `/` 로그인/가입 페이지

- 구성
  - 앱 로고/서비스명
  - 닉네임 입력
  - 시작하기 버튼
- 동작
  - 입력값 trim
  - 조회 결과
    - 있으면 즉시 로그인
    - 없으면 ConfirmDialog 노출
      - 문구: `없는 닉네임입니다. 가입하시겠습니까?`
      - 확인 시 가입 + 로그인
- 예외처리
  - 2~20자 벗어나면 에러
  - 공백만 입력 불가

## 7.2 `/map` 지도 페이지

- 레이아웃
  - 상단 고정 검색바
  - 본문 네이버 지도
  - 하단 고정 BottomNav
- 검색
  - 검색어 입력 후 제출 -> 결과 목록/시트
  - 아이템 클릭 -> 지도 이동 + 임시 핀 + `PlaceBottomSheet`
- `PlaceBottomSheet`
  - 장소명, 주소, 카테고리
  - 내 저장 상태
    - 미저장: `저장하기`
    - 저장됨: `메모 수정`, `저장 취소`
  - 메모 입력(최대 500자)
- 지도 마커
  - 내 저장: 내 아이콘
  - 타인 저장: 유저별 색상 할당
  - 마커 클릭 시
    - 장소 기본정보 + 저장한 유저 목록
    - 메모는 권한 있을 때만 표시

## 7.3 `/follows` 페이지

- 상단 탭 3개
  - `내가 팔로우`
  - `나를 팔로우`
  - `유저 검색`
- 내가 팔로우
  - `UserRow` + 언팔로우 버튼
- 나를 팔로우
  - 팔로워 목록
  - 내가 아직 팔로우하지 않았으면 `맞팔로우` 버튼
- 유저 검색
  - 닉네임 검색
  - 검색 결과에 `팔로우/팔로잉` 상태 표시

## 7.4 공통 내비게이션

- BottomNav
  - `지도` -> `/map`
  - `Follows` -> `/follows`
- 현재 탭 active 표시

## 8) Zustand 스토어 구조

- `useSessionStore`
  - `sessionUser`, `hydrateSession`, `login`, `logout`
- `useMapStore`
  - `mapCenter`, `searchQuery`, `searchResults`, `selectedPlace`, `feedMarkers`
- `useFollowStore`
  - `following`, `followers`, `searchResults`
- `persist` 미들웨어로 세션만 localStorage 동기화

## 9) 구현 순서

## Phase 1. 기초 세팅

1. shadcn init + 공통 컴포넌트 추가
2. 글로벌 스타일/디자인 토큰 적용
3. 모바일 AppShell + BottomNav 구현

## Phase 2. DB/API

1. Supabase SQL 적용 (테이블/인덱스/트리거)
2. `/api/session/login-or-signup`
3. `/api/follows`, `/api/users/search`
4. `/api/places/search` (Kakao 프록시)
5. `/api/saves`, `/api/map/feed`

## Phase 3. 화면 구현

1. 로그인/가입 페이지
2. 지도 페이지 + 검색 + BottomSheet + 저장
3. Follows 페이지 3탭

## Phase 4. 고도화

1. 로딩/에러/empty state 정리
2. 토스트/confirm UX 정교화
3. 마커 색상 알고리즘 고정화(유저ID hash 기반)
4. QA 및 버그 수정

## 10) 테스트 체크리스트

- 닉네임
  - 대소문자 다르게 입력해도 동일 계정으로 로그인되는가
- 회원가입 Confirm
  - 없는 닉네임에서 가입 확인/취소가 정상 동작하는가
- 팔로우
  - 자기 자신 팔로우 방지되는가
  - 언팔로우 시 지도에서 즉시 마커 제거되는가
- 저장
  - 동일 유저의 동일 장소 중복 저장이 막히는가
  - 다른 유저는 동일 장소 저장 가능한가
- 메모 권한
  - 팔로우하지 않은 유저 메모는 비노출되는가
  - 팔로우 후에는 메모가 노출되는가
- 모바일 UI
  - 데스크탑에서도 430px 내 모바일 레이아웃 유지되는가

## 11) 현재 시점에서 추가 결정하면 좋은 항목 (선택)

- Kakao 검색 API의 정확한 소스
  - Local Search API + Maps JS 조합으로 갈지 최종 확정
- 장소 정렬 기본값
  - 최신 저장순 vs 지도 중심 거리순
- 언팔로우/저장취소 confirm 문구 톤
  - 현재 문구로 시작 후 브랜드 톤 반영 가능
