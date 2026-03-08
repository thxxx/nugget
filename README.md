## Stack
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Zustand
- Supabase (`@supabase/supabase-js`)
- Kakao Maps JS + Kakao Local Search API

## Setup

1. Install dependencies:
```bash
npm install
```

2. Fill in environment values in `.env.local`:
```bash
# Public
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_KAKAO_MAP_APP_KEY=your-kakao-javascript-key

# Server only
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
KAKAO_REST_API_KEY=your-kakao-rest-api-key

```

3. Apply DB schema in Supabase SQL editor:
- `agents/supabase-schema.sql`
- 이미 초기 스키마를 적용했다면 추가 마이그레이션도 실행:
  - `agents/supabase-migration-add-visit-tags.sql`

4. Run dev server:
```bash
npm run dev
```

Open `http://localhost:3000`.

## Main Routes
- `/`: 닉네임 로그인/가입
- `/map`: 지도 + 장소 검색 + 저장/메모
- `/follows`: 팔로잉/팔로워/유저검색
- `/saves`: 내 저장 목록 (정렬/방문상태 필터)

## Notes
- `.env.local` is ignored by git.
- `SUPABASE_SERVICE_ROLE_KEY`, `KAKAO_REST_API_KEY`는 서버에서만 사용됩니다.
