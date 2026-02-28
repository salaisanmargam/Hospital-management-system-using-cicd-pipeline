# MedCore HMS — Hospital Management System

A full-stack Hospital Management System with a **React + TypeScript** frontend and a **FastAPI + MySQL** backend. Features role-based access control, real-time data from a MySQL database, and a clean modular architecture.

---

## Quick Start

### Prerequisites

| Tool       | Version    |
|------------|------------|
| Node.js    | >= 18      |
| Python     | >= 3.11    |
| MySQL      | >= 8.0     |

### 1. Clone & Install

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend
pip install -r requirements.txt
cd ..
```

### 2. Configure Environment

**Frontend** — create `.env` in root:
```env
VITE_API_URL=http://127.0.0.1:8000
VITE_USE_MOCK_AUTH=false
```

**Backend** — create `backend/.env`:
```env
APP_NAME=MedCore API
APP_ENV=development
APP_HOST=0.0.0.0
APP_PORT=8000
APP_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=medcore_hms
MYSQL_POOL_SIZE=5

JWT_SECRET=change_this_secret
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60
```

### 3. Setup Database

```bash
# Create the database and tables
mysql -u root -p < backend/schema.sql

# Seed sample data (patients, medicines, beds, staff, etc.)
cd backend
python seed_db.py
cd ..
```

### 4. Run

Open **two terminals**:

```bash
# Terminal 1 — Backend (from backend/ folder)
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2 — Frontend (from root folder)
npm run dev
```

Open the frontend URL shown by Vite (default: `http://localhost:3000`).

### 5. Login

All seeded users share the password: **`Medcore@123`**

| Email                        | Role    |
|------------------------------|---------|
| salai@gmail.com              | Admin   |
| sarah.bennett@medcore.com    | Doctor  |
| james.wilson@medcore.com     | Doctor  |
| rakesh@medcore.com           | Doctor  |

Or register a new account from the Sign Up page.

---

## Project Structure

```
medcore/
├── index.html              # Vite entry HTML
├── package.json            # Frontend dependencies & scripts
├── vite.config.ts          # Vite config (alias @/ → src/)
├── tsconfig.json           # TypeScript config
├── .env                    # Frontend env vars (VITE_API_URL)
│
├── src/                    # Frontend source (React + TypeScript)
│   ├── index.tsx           # React DOM entry point
│   ├── App.tsx             # Root component, routing, auth guard
│   ├── types.ts            # Shared TypeScript interfaces & enums
│   ├── components/
│   │   ├── Sidebar.tsx     # Navigation sidebar (role-aware)
│   │   └── TopBar.tsx      # Header bar (user info, search)
│   ├── pages/
│   │   ├── Auth.tsx        # Login / Register page
│   │   ├── Dashboard.tsx   # Stats, charts, overview
│   │   ├── Patients.tsx    # Patient management
│   │   ├── Appointments.tsx# Appointment scheduling
│   │   ├── Billing.tsx     # Invoice & payment tracking
│   │   ├── Staff.tsx       # Staff directory & management
│   │   ├── Laboratory.tsx  # Lab test management
│   │   ├── Pharmacy.tsx    # Medicine & prescription management
│   │   ├── Ward.tsx        # Bed & ward management
│   │   └── AdminPanel.tsx  # Admin: users, audit logs, system
│   ├── contexts/
│   │   └── DataContext.tsx  # Global state provider (fetches from API)
│   └── services/
│       ├── api.ts          # API client (fetch wrapper, auth helpers)
│       └── mockData.ts     # Fallback mock data (dev only)
│
└── backend/                # Backend (FastAPI + MySQL)
    ├── .env                # Backend env vars (DB, JWT config)
    ├── requirements.txt    # Python dependencies
    ├── schema.sql          # Database schema (13 tables)
    ├── seed_db.py          # Sample data seeder
    ├── init_db.py          # Database initializer
    └── app/
        ├── main.py         # FastAPI app, CORS, router registration
        ├── db.py           # MySQL connection pool
        ├── auth.py         # JWT auth, password hashing, get_current_user
        ├── models.py       # Pydantic request/response models
        └── routers/
            ├── auth.py         # POST /auth/register, /auth/login, GET /auth/me
            ├── patients.py     # CRUD /patients
            ├── appointments.py # CRUD /appointments
            ├── staff.py        # GET /staff (non-patient users)
            ├── medicines.py    # CRUD /medicines
            ├── beds.py         # GET /beds, PATCH /beds/:id/status
            ├── lab_tests.py    # GET /lab-tests, PATCH /lab-tests/:id/status
            ├── prescriptions.py# CRUD /prescriptions
            ├── bills.py        # CRUD /bills
            ├── audit_logs.py   # GET /audit-logs
            └── health.py       # GET /health
```

---

## Features

### Authentication & Authorization
- JWT-based authentication (argon2 password hashing)
- User registration with role selection
- Role-based route access control (frontend + backend)

### Roles (7 roles)
| Role            | Access                                                    |
|-----------------|-----------------------------------------------------------|
| Admin           | Full access — all modules + admin panel + audit logs      |
| Doctor          | Dashboard, patients, appointments, lab, pharmacy          |
| Nurse           | Dashboard, patients, appointments, ward                   |
| Receptionist    | Dashboard, patients, appointments, ward, billing          |
| Lab Technician  | Dashboard, appointments, laboratory                       |
| Pharmacist      | Dashboard, appointments, pharmacy                         |
| Patient         | Dashboard, appointments, billing (own records)            |

### Modules
| Module        | Description                                                       |
|---------------|-------------------------------------------------------------------|
| Dashboard     | KPI cards, revenue chart, appointment trends, quick stats         |
| Patients      | Patient registry with vitals, records, conditions, allergies      |
| Appointments  | Schedule, reschedule, cancel; filtered by role                    |
| Billing       | Invoice management, payment status (Paid/Pending/Overdue)        |
| Staff         | Staff directory, add/remove, shift management                    |
| Laboratory    | Lab test ordering, department tabs, status tracking               |
| Pharmacy      | Medicine inventory, prescription dispensing                       |
| Ward          | Bed occupancy, admit/discharge, ward-level overview               |
| Admin Panel   | User management, system stats, department overview, audit logs    |

---

## Tech Stack

| Layer    | Technology                                                                  |
|----------|-----------------------------------------------------------------------------|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS (CDN), Recharts, Lucide Icons   |
| Backend  | Python 3.11+, FastAPI, Uvicorn, MySQL Connector                            |
| Database | MySQL 8.0 (13 tables, InnoDB)                                              |
| Auth     | JWT (python-jose), Argon2 (passlib)                                        |

---

## API Endpoints

| Method | Endpoint                  | Auth | Description               |
|--------|---------------------------|------|---------------------------|
| GET    | /health                   | No   | Health check              |
| POST   | /auth/register            | No   | Register new user         |
| POST   | /auth/login               | No   | Login, returns JWT        |
| GET    | /auth/me                  | Yes  | Current user profile      |
| GET    | /patients                 | Yes  | List all patients         |
| POST   | /patients                 | Yes  | Create patient            |
| GET    | /staff                    | Yes  | List staff members        |
| GET    | /appointments             | Yes  | List appointments         |
| POST   | /appointments             | Yes  | Create appointment        |
| GET    | /medicines                | Yes  | List medicines            |
| POST   | /medicines                | Yes  | Add medicine              |
| GET    | /beds                     | Yes  | List beds with patients   |
| PATCH  | /beds/{id}/status         | Yes  | Update bed status         |
| GET    | /lab-tests                | Yes  | List lab tests            |
| PATCH  | /lab-tests/{id}/status    | Yes  | Update test status        |
| GET    | /prescriptions            | Yes  | List prescriptions        |
| POST   | /prescriptions            | Yes  | Create prescription       |
| GET    | /bills                    | Yes  | List bills                |
| POST   | /bills                    | Yes  | Create bill               |
| GET    | /audit-logs               | Yes  | List audit logs           |

---

## Database Schema

13 tables: `users`, `staff`, `patients`, `vitals`, `medicines`, `beds`, `appointments`, `prescriptions`, `prescription_items`, `lab_tests`, `bills`, `audit_logs`, `doctor_profiles`

See [backend/schema.sql](backend/schema.sql) for the full schema.

---

## License

This project is for educational / demo purposes.
