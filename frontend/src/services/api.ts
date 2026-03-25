/// <reference types="vite/client" />
import { User, UserRole, Staff } from '../types';
import { MOCK_AUTH_USERS, MockAuthUser } from './mockData';

type ApiToken = {
  access_token: string;
  token_type: string;
};

type ApiUser = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  department?: string | null;
  contact?: string | null;
  status?: string | null;
  shift?: string | null;
  bio?: string | null;
  consultation_fee?: number | null;
  avatar_url?: string | null;
  created_at?: string;
};

type RegisterPayload = {
  full_name: string;
  email: string;
  password: string;
  role: string;
  department?: string;
  contact?: string;
  shift?: string;
  bio?: string;
  consultation_fee?: number;
};

type LoginPayload = {
  email: string;
  password: string;
};

export type AuthResult = {
  token: string;
  user: User;
};

export const AUTH_STORAGE_KEY = 'medcore_auth';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';
const USE_MOCK_AUTH = (import.meta.env.VITE_USE_MOCK_AUTH as string | undefined) === 'true';
const MOCK_USERS_KEY = 'medcore_mock_users';

/** Returns the Authorization header object for authenticated requests. */
const authHeaders = (token: string): HeadersInit => ({ Authorization: `Bearer ${token}` });

const normalizeRole = (role: string): UserRole => {
  const roles = Object.values(UserRole) as string[];
  return roles.includes(role) ? (role as UserRole) : UserRole.PATIENT;
};

const buildAvatarUrl = (name: string, fallback?: string | null): string => {
  if (fallback) {
    return fallback;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D9488&color=fff`;
};

const loadMockUsers = (): MockAuthUser[] => {
  if (typeof localStorage === 'undefined') {
    return [...MOCK_AUTH_USERS];
  }

  const stored = localStorage.getItem(MOCK_USERS_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as MockAuthUser[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // Ignore parse errors and reseed below.
    }
  }

  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(MOCK_AUTH_USERS));
  return [...MOCK_AUTH_USERS];
};

const saveMockUsers = (users: MockAuthUser[]) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
};

const findMockUserByEmail = (users: MockAuthUser[], email: string) =>
  users.find((entry) => entry.user.email.toLowerCase() === email.toLowerCase());

const buildMockToken = (userId: string) => `mock-${userId}`;

const parseMockToken = (token: string) => {
  if (!token.startsWith('mock-')) return null;
  return token.slice('mock-'.length);
};

const toUser = (apiUser: ApiUser): User => ({
  id: String(apiUser.id),
  name: apiUser.full_name,
  email: apiUser.email,
  role: normalizeRole(apiUser.role),
  department: apiUser.department ?? undefined,
  contact: apiUser.contact ?? undefined,
  shift: apiUser.shift ?? undefined,
  bio: apiUser.bio ?? undefined,
  consultationFee: apiUser.consultation_fee ?? undefined,
  avatarUrl: buildAvatarUrl(apiUser.full_name, apiUser.avatar_url ?? undefined),
});

const toStaff = (apiUser: ApiUser): Staff => ({
  id: String(apiUser.id),
  name: apiUser.full_name,
  role: normalizeRole(apiUser.role),
  department: apiUser.department ?? 'General',
  contact: apiUser.contact ?? 'No contact',
  status: (apiUser.status as 'Active' | 'On Leave') ?? 'Active',
  shift: (apiUser.shift as 'Morning' | 'Evening' | 'Night') ?? 'Morning',
  bio: apiUser.bio ?? undefined,
  consultationFee: apiUser.consultation_fee ?? undefined,
  avatarUrl: buildAvatarUrl(apiUser.full_name, apiUser.avatar_url ?? undefined),
});

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!response.ok) {
    // Session expired — notify the app so it can log the user out
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('medcore:unauthorized'));
    }
    let message = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      if (data?.detail) {
        message = data.detail;
      }
    } catch {
      // Ignore JSON parse errors for non-JSON responses.
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
};

export const registerUser = async (payload: RegisterPayload): Promise<User> => {
  if (USE_MOCK_AUTH) {
    const users = loadMockUsers();
    if (findMockUserByEmail(users, payload.email)) {
      throw new Error('Email already registered.');
    }

    const newUser: User = {
      id: `u${users.length + 1}`,
      name: payload.full_name,
      email: payload.email,
      role: normalizeRole(payload.role),
      department: payload.department,
      contact: payload.contact,
      shift: payload.shift,
      bio: payload.bio,
      consultationFee: payload.consultation_fee,
      avatarUrl: buildAvatarUrl(payload.full_name),
    };

    const updated = [...users, { user: newUser, password: payload.password }];
    saveMockUsers(updated);
    return newUser;
  }

  const apiUser = await request<ApiUser>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return toUser(apiUser);
};

export const loginUser = async (payload: LoginPayload): Promise<ApiToken> =>
  USE_MOCK_AUTH
    ? (() => {
        const users = loadMockUsers();
        const entry = findMockUserByEmail(users, payload.email);
        if (!entry || entry.password !== payload.password) {
          throw new Error('Invalid email or password.');
        }
        return { access_token: buildMockToken(entry.user.id), token_type: 'bearer' };
      })()
    : request<ApiToken>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

export const getCurrentUser = async (token: string): Promise<User> => {
  if (USE_MOCK_AUTH) {
    const userId = parseMockToken(token);
    if (!userId) {
      throw new Error('Invalid token.');
    }
    const users = loadMockUsers();
    const entry = users.find((item) => item.user.id === userId);
    if (!entry) {
      throw new Error('User not found.');
    }
    return entry.user;
  }

  const apiUser = await request<ApiUser>('/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return toUser(apiUser);
};

export const loginWithProfile = async (payload: LoginPayload): Promise<AuthResult> => {
  const tokenResponse = await loginUser(payload);
  const user = await getCurrentUser(tokenResponse.access_token);
  return { token: tokenResponse.access_token, user };
};

export const registerAndLogin = async (payload: RegisterPayload): Promise<AuthResult> => {
  await registerUser(payload);
  return loginWithProfile({ email: payload.email, password: payload.password });
};

// ─── Staff ───────────────────────────────────────────────────────────────────

export const listStaffMembers = async (token: string): Promise<Staff[]> => {
  const staffList = await request<ApiUser[]>('/staff/', { method: 'GET', headers: authHeaders(token) });
  return staffList.map(toStaff);
};

export const updateStaffMember = async (token: string, staffId: string, payload: any): Promise<any> =>
  request<any>(`/staff/${staffId}`, { method: 'PUT', headers: authHeaders(token), body: JSON.stringify(payload) });

export const deleteStaffMember = async (token: string, staffId: string): Promise<void> => {
  await request(`/staff/${staffId}`, { method: 'DELETE', headers: authHeaders(token) });
};

export const updateStaffShift = async (token: string, staffId: string, shift: string): Promise<void> => {
  await request(`/staff/${staffId}/shift`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ shift }) });
};

// ─── Patients ─────────────────────────────────────────────────────────────────

export const listPatients = async (token: string): Promise<any[]> =>
  request<any[]>('/patients/', { method: 'GET', headers: authHeaders(token) });

export const createPatient = async (token: string, payload: any): Promise<any> =>
  request<any>('/patients/', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(payload) });

export const updatePatient = async (token: string, patientId: string, payload: any): Promise<any> =>
  request<any>(`/patients/${patientId}`, { method: 'PUT', headers: authHeaders(token), body: JSON.stringify(payload) });

export const updatePatientStatus = async (token: string, patientId: string, status: string): Promise<any> =>
  request<any>(`/patients/${patientId}/status`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ status }) });

export const deletePatient = async (token: string, patientId: string): Promise<void> => {
  await request(`/patients/${patientId}`, { method: 'DELETE', headers: authHeaders(token) });
};

// ─── Appointments ─────────────────────────────────────────────────────────────

export const listAppointments = async (token: string): Promise<any[]> =>
  request<any[]>('/appointments/', { method: 'GET', headers: authHeaders(token) });

export const createAppointment = async (token: string, payload: any): Promise<any> =>
  request<any>('/appointments/', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(payload) });

export const updateAppointmentStatus = async (token: string, appointmentId: string, status: string): Promise<any> =>
  request<any>(`/appointments/${appointmentId}/status`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ status }) });

// ─── Medicines ────────────────────────────────────────────────────────────────

export const listMedicines = async (token: string): Promise<any[]> =>
  request<any[]>('/medicines/', { method: 'GET', headers: authHeaders(token) });

export const createMedicine = async (token: string, payload: any): Promise<any> =>
  request<any>('/medicines/', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(payload) });

export const updateMedicineStock = async (token: string, medicineId: string, quantity: number): Promise<any> =>
  request<any>(`/medicines/${medicineId}/stock`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ quantity }),
  });

// ─── Beds ─────────────────────────────────────────────────────────────────────

export const listBeds = async (token: string): Promise<any[]> =>
  request<any[]>('/beds/', { method: 'GET', headers: authHeaders(token) });

export const updateBedStatus = async (token: string, bedId: string, status: string, patientId?: string): Promise<any> =>
  request<any>(`/beds/${bedId}/status`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ status, patient_id: patientId || null }) });

// ─── Lab Tests ────────────────────────────────────────────────────────────────

export const listLabTests = async (token: string): Promise<any[]> =>
  request<any[]>('/lab-tests/', { method: 'GET', headers: authHeaders(token) });

export const createLabTest = async (token: string, payload: any): Promise<any> =>
  request<any>('/lab-tests/', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(payload) });

export const updateLabTestStatus = async (
  token: string,
  testId: string,
  status: string,
  resultText?: string,
  resultFileUrl?: string,
): Promise<any> =>
  request<any>(`/lab-tests/${testId}/status`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ status, result_text: resultText, result_file_url: resultFileUrl }),
  });

// ─── Prescriptions ────────────────────────────────────────────────────────────

export const listPrescriptions = async (token: string): Promise<any[]> =>
  request<any[]>('/prescriptions/', { method: 'GET', headers: authHeaders(token) });

export const createPrescription = async (token: string, payload: any): Promise<any> =>
  request<any>('/prescriptions/', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(payload) });

export const updatePrescriptionStatus = async (token: string, prescriptionId: string, status: string): Promise<any> =>
  request<any>(`/prescriptions/${prescriptionId}/status`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ status }) });

// ─── Bills ────────────────────────────────────────────────────────────────────

export const listBills = async (token: string): Promise<any[]> =>
  request<any[]>('/bills/', { method: 'GET', headers: authHeaders(token) });

export const createBill = async (token: string, payload: any): Promise<any> =>
  request<any>('/bills/', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(payload) });

// ─── Vitals ───────────────────────────────────────────────────────────────────

export const listVitals = async (token: string): Promise<any[]> =>
  request<any[]>('/vitals/', { method: 'GET', headers: authHeaders(token) });

export const upsertVitals = async (token: string, payload: any): Promise<any> =>
  request<any>('/vitals/', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(payload) });

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const listAuditLogs = async (token: string): Promise<any[]> =>
  request<any[]>('/audit-logs/', { method: 'GET', headers: authHeaders(token) });

// ─── Nurse Orders ─────────────────────────────────────────────────────────────

export const listNurseOrders = async (token: string): Promise<any[]> =>
  request<any[]>('/nurse-orders/', { method: 'GET', headers: authHeaders(token) });

export const createNurseOrder = async (token: string, payload: {
  patient_id: number;
  nurse_id?: number | null;
  order_type: string;
  instructions: string;
  priority?: string;
}): Promise<any> =>
  request<any>('/nurse-orders/', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(payload) });

export const updateNurseOrderStatus = async (
  token: string,
  orderId: string,
  status: string,
  notes?: string,
): Promise<any> =>
  request<any>(`/nurse-orders/${orderId}/status`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ status, notes }),
  });

export const assignNurseToOrder = async (
  token: string,
  orderId: string,
  nurseId: number,
): Promise<any> =>
  request<any>(`/nurse-orders/${orderId}/assign`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ nurse_id: nurseId }),
  });
