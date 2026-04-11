# Eonpulse — frontend

Next.js (App Router) client for the Eonpulse API.

## Documentation

- **[../docs/PRODUCT_AND_WIRING.md](../docs/PRODUCT_AND_WIRING.md)** — routes, role-based dashboards, and how `NEXT_PUBLIC_API_URL` / `/api/backend` proxy connect to Nest

## Local development

```bash
npm install
npm run dev
```

Default: [http://localhost:3000](http://localhost:3000).

Point the UI at the API:

- **Direct:** `NEXT_PUBLIC_API_URL=http://127.0.0.1:4000` in `.env.local`
- **Proxy (default):** leave `NEXT_PUBLIC_API_URL` unset or use `/api/backend`; run the Nest server on port 4000 so `frontend`’s `app/api/backend/[...path]` can forward requests

## Key paths in this app

| Area | Path pattern |
|------|----------------|
| Auth | `/login`, `/register` |
| Delivery | `/dashboard`, `/dashboard/tasks`, `/dashboard/tasks/[taskId]` |
| Role dashboards | `/dashboard/client`, `/dashboard/finance`, `/dashboard/auditor` |
| Admin | `/admin`, `/admin/reviews`, … |

Role checks use `GET /auth/me` → `user.role` (global role). See `src/lib/auth/role-gates.ts`.
