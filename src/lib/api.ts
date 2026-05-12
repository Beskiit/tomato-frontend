const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw { status: res.status, message: err.message ?? 'Request failed', errors: err.errors };
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get:    <T>(path: string)                   => request<T>('GET',    path),
  post:   <T>(path: string, body?: unknown)   => request<T>('POST',   path, body),
  put:    <T>(path: string, body?: unknown)   => request<T>('PUT',    path, body),
  patch:  <T>(path: string, body?: unknown)   => request<T>('PATCH',  path, body),
  delete: <T>(path: string)                   => request<T>('DELETE', path),
};

// ── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  login:    (email: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/login', { email, password }),
  register: (data: RegisterPayload) =>
    api.post<{ token: string; user: User }>('/auth/register', data),
  logout:   () => api.post('/auth/logout'),
  me:       () => api.get<User>('/auth/me'),
};

// ── Dashboard ─────────────────────────────────────────────────────────────
export const dashboardApi = {
  get: () => api.get<DashboardData>('/dashboard'),
};

// ── Appointments ──────────────────────────────────────────────────────────
export const appointmentApi = {
  list:         ()                           => api.get<Paginated<Appointment>>('/appointments'),
  get:          (id: number)                 => api.get<Appointment>(`/appointments/${id}`),
  create:       (data: AppointmentPayload)   => api.post<Appointment>('/appointments', data),
  update:       (id: number, data: Partial<AppointmentPayload>) =>
    api.put<Appointment>(`/appointments/${id}`, data),
  delete:       (id: number)                 => api.delete(`/appointments/${id}`),
  updateStatus: (id: number, status: string) =>
    api.patch<Appointment>(`/appointments/${id}/status`, { status }),
};

// ── Sorting Sessions ──────────────────────────────────────────────────────
export const sessionApi = {
  create:   (appointmentId: number, raspberry_pi_id: string) =>
    api.post<SortingSession>(`/appointments/${appointmentId}/sessions`, { raspberry_pi_id }),
  get:      (id: number)  => api.get<SortingSession>(`/sessions/${id}`),
  complete: (id: number)  => api.post<SortingSession>(`/sessions/${id}/complete`),
};

// ── Sorting Logs ──────────────────────────────────────────────────────────
export const logApi = {
  list:   (sessionId: number) => api.get<Paginated<SortingLog>>(`/sessions/${sessionId}/logs`),
  create: (sessionId: number, data: LogPayload) =>
    api.post<SortingLog>(`/sessions/${sessionId}/logs`, data),
};

// ── Notifications ─────────────────────────────────────────────────────────
export const notificationApi = {
  list:       () => api.get<Paginated<Notification>>('/notifications'),
  markRead:   (id: number) => api.patch(`/notifications/${id}/read`),
  markAllRead: ()           => api.patch('/notifications/read-all'),
};

// ── Users (admin) ─────────────────────────────────────────────────────────
export const userApi = {
  list:   (role?: string) => api.get<Paginated<User>>(`/users${role ? `?role=${role}` : ''}`),
  create: (data: unknown) => api.post<User>('/users', data),
  update: (id: number, data: unknown) => api.put<User>(`/users/${id}`, data),
  delete: (id: number)    => api.delete(`/users/${id}`),
};

// ── Types ─────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  full_name: string;
  email: string;
  role: 'admin' | 'sorter' | 'farmer';
  farmer?: Farmer;
  sorter?: Sorter;
}

export interface Farmer {
  id: number;
  user_id: number;
  farm_name: string;
  contact_number?: string;
  address?: string;
}

export interface Sorter {
  id: number;
  user_id: number;
  location?: string;
  contact_number?: string;
  is_available: boolean;
}

export interface Appointment {
  id: number;
  farmer_id: number;
  sorter_id: number;
  scheduled_date: string;
  scheduled_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  farmer?: Farmer & { user: User };
  sorter?: Sorter & { user: User };
  sorting_session?: SortingSession;
  created_at: string;
}

export interface SortingSession {
  id: number;
  appointment_id: number;
  started_at?: string;
  ended_at?: string;
  ripe_count: number;
  unripe_count: number;
  rotten_count: number;
  raspberry_pi_id?: string;
  session_status: 'in_progress' | 'completed' | 'failed';
  sorting_logs?: SortingLog[];
}

export interface SortingLog {
  id: number;
  session_id: number;
  logged_at: string;
  tomato_classification: 'ripe' | 'unripe' | 'rotten';
  image_path?: string;
  ai_confidence?: number;
}

export interface Notification {
  id: number;
  user_id: number;
  appointment_id?: number;
  message: string;
  is_read: boolean;
  sent_at: string;
}

export interface DashboardData {
  total_appointments: number;
  pending_appointments: number;
  confirmed_appointments: number;
  completed_appointments: number;
  total_users?: number;
  total_farmers?: number;
  total_sorters?: number;
  recent_appointments: Appointment[];
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: 'farmer' | 'sorter';
  farm_name?: string;
  address?: string;
  location?: string;
  contact_number?: string;
}

export interface AppointmentPayload {
  sorter_id: number;
  scheduled_date: string;
  scheduled_time: string;
  notes?: string;
}

export interface LogPayload {
  tomato_classification: 'ripe' | 'unripe' | 'rotten';
  image_path?: string;
  ai_confidence?: number;
}
