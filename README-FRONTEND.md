# Tomato Sorting Frontend (React + Vite)

Frontend for the AIgriculture tomato sorting platform.

This app provides:
- Authentication screens and protected layout
- Role-based dashboard UI (`admin`, `farmer`, `sorter`)
- Appointment management
- Sorting session workflow
- Notifications and activity logs
- Admin user management

## Tech Stack

- React 19 + TypeScript
- Vite
- React Router
- Tailwind CSS + UI components
- Recharts for charts

## Run Locally

1. Install dependencies:
```bash
npm install
```

2. Create `.env`:
```env
VITE_API_URL=http://127.0.0.1:8000/api
```

3. Start dev server:
```bash
npm run dev
```

## Project Structure

- `src/App.tsx` - route shell + sidebar/tab navigation
- `src/hooks/useAuth.tsx` - auth state, login/logout, `me()` hydration
- `src/lib/api.ts` - centralized API client and typed endpoint wrappers
- `src/lib/queryCache.ts` - in-memory cache helpers
- `src/pages/`
  - `Login.tsx`
  - `Dashboard.tsx`
  - `Appointments.tsx`
  - `AppointmentDetail.tsx`
  - `Notifications.tsx`
  - `ActivityLog.tsx`
  - `Users.tsx`
- `src/components/ChartAreaInteractive.tsx` - interactive chart panels

## How Frontend Calls the API

All requests go through `src/lib/api.ts`.

- Base URL:
  - `const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';`
- Token:
  - Read from `localStorage.getItem('token')`
  - Sent as `Authorization: Bearer <token>`
- Response handling:
  - Non-2xx throws `{ status, message, errors }`

### Example in code

- Dashboard data:
  - `dashboardApi.get()` -> `GET /dashboard`
- Appointments:
  - `appointmentApi.list()` -> `GET /appointments`
  - `appointmentApi.create(data)` -> `POST /appointments`
- Notifications:
  - `notificationApi.markRead(id)` -> `PATCH /notifications/{id}/read`

## Frontend Routes and Navigation

Browser routes:
- `/login`
- `/dashboard`

Inside `/dashboard`, views are tab-driven using query params:
- `?tab=overview`
- `?tab=appointments`
- `?tab=users`
- `?tab=activity-log`
- `?tab=notifications`
- `?tab=appointment-detail&id=<appointmentId>`

## Auth Flow

1. User logs in from `Login.tsx`
2. `useAuth` calls `POST /auth/login`
3. Token is stored in `localStorage`
4. App calls `GET /auth/me` to hydrate user profile
5. Protected layout is shown
6. On logout, app calls `POST /auth/logout` and clears token/user

## Role-Based UI Behavior

- `admin`:
  - sees Users page
  - broader system data
- `farmer`:
  - books appointments
  - sees own appointments
- `sorter`:
  - handles appointment status and session actions

Note: backend still enforces roles. UI checks are convenience only.

## CRUD from Frontend (Appointments)

- Create:
  - `appointmentApi.create({ sorter_id, scheduled_date, scheduled_time, notes })`
- Read:
  - `appointmentApi.list()`
  - `appointmentApi.get(id)`
- Update:
  - `appointmentApi.update(id, payload)`
  - `appointmentApi.updateStatus(id, 'confirmed' | 'cancelled' | 'completed')`
- Delete:
  - `appointmentApi.delete(id)`

## Environment Files

Recommended setup:

- `.env.local` (local dev)
  - `VITE_API_URL=http://127.0.0.1:8000/api`
- `.env.production` (production build)
  - `VITE_API_URL=https://your-domain.com/api`

Vite auto-loads these by mode.

## Backend Documentation

Complete backend endpoint documentation and `curl` examples are in:
- `../tomato-api/README.md`
