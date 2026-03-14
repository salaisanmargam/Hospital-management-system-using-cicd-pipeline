-- ============================================================
--  MedCore HMS – PostgreSQL schema (Neon DB compatible)
--  Run once to initialise:
--    psql "$DATABASE_URL" -f schema_pg.sql
-- ============================================================

-- ── Users (staff + patient accounts) ─────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id               SERIAL PRIMARY KEY,
  full_name        VARCHAR(100) NOT NULL,
  email            VARCHAR(100) UNIQUE NOT NULL,
  password_hash    VARCHAR(255) NOT NULL,
  role             VARCHAR(50)  NOT NULL
                     CHECK (role IN ('Admin','Doctor','Nurse','Patient','Receptionist','Lab Technician','Pharmacist')),
  department       VARCHAR(50),
  contact          VARCHAR(20),
  status           VARCHAR(20)  DEFAULT 'Active'
                     CHECK (status IN ('Active','On Leave','Inactive')),
  shift            VARCHAR(20)  DEFAULT 'Morning'
                     CHECK (shift IN ('Morning','Evening','Night')),
  avatar_url       VARCHAR(255),
  bio              TEXT,
  consultation_fee DECIMAL(10,2),
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Staff directory (separate from user accounts) ─────────────
CREATE TABLE IF NOT EXISTS staff (
  id          SERIAL PRIMARY KEY,
  full_name   VARCHAR(100) NOT NULL,
  email       VARCHAR(100) UNIQUE,
  role        VARCHAR(50)  NOT NULL
                CHECK (role IN ('Admin','Doctor','Nurse','Receptionist','Lab Technician','Pharmacist')),
  department  VARCHAR(50),
  contact     VARCHAR(20),
  status      VARCHAR(20)  DEFAULT 'Active'
                CHECK (status IN ('Active','On Leave','Inactive')),
  shift       VARCHAR(20)  DEFAULT 'Morning'
                CHECK (shift IN ('Morning','Evening','Night')),
  avatar_url  VARCHAR(255),
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Patients (clinical records) ───────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id                SERIAL PRIMARY KEY,
  full_name         VARCHAR(100) NOT NULL,
  age               INT,
  gender            VARCHAR(10)  CHECK (gender IN ('Male','Female','Other')),
  contact           VARCHAR(20),
  last_visit        DATE,
  medical_condition VARCHAR(255),
  status            VARCHAR(20)  DEFAULT 'Outpatient'
                      CHECK (status IN ('Inpatient','Outpatient')),
  blood_type        VARCHAR(5),
  allergies         TEXT,
  user_id           INT UNIQUE,   -- links a Patient-role user to their clinical record
  created_by        INT,
  created_at        TIMESTAMPTZ  DEFAULT NOW(),
  FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ── Vitals ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vitals (
  id           SERIAL PRIMARY KEY,
  patient_id   INT NOT NULL,
  bp           VARCHAR(20),   -- e.g. "120/80"
  heart_rate   VARCHAR(10),
  temperature  VARCHAR(10),
  spo2         VARCHAR(10),
  recorded_by  INT,           -- nurse who recorded this entry
  last_updated TIMESTAMPTZ    DEFAULT NOW(),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ── Medicines / Pharmacy ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS medicines (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  category    VARCHAR(50),
  stock       INT          DEFAULT 0,
  unit        VARCHAR(20),   -- e.g. "Tablets", "Vials"
  price       DECIMAL(10,2),
  expiry_date DATE,
  status      VARCHAR(20)  DEFAULT 'In Stock'
                CHECK (status IN ('In Stock','Low Stock','Out of Stock')),
  added_by    INT,
  FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ── Beds / Ward ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS beds (
  id         SERIAL PRIMARY KEY,
  ward       VARCHAR(50) NOT NULL,
  bed_number VARCHAR(10) NOT NULL,
  status     VARCHAR(20) DEFAULT 'Available'
               CHECK (status IN ('Available','Occupied','Maintenance')),
  patient_id INT UNIQUE,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL
);

-- ── Appointments ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id               SERIAL PRIMARY KEY,
  patient_id       INT NOT NULL,
  doctor_id        INT NOT NULL,
  department       VARCHAR(50),
  appointment_date DATE,
  appointment_time VARCHAR(10),
  status           VARCHAR(20) DEFAULT 'Scheduled'
                     CHECK (status IN ('Scheduled','Completed','Cancelled','Emergency')),
  type             VARCHAR(50) DEFAULT 'General Checkup'
                     CHECK (type IN ('General Checkup','Surgery','Consultation','Follow-up')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id)  REFERENCES users(id)
);

-- ── Prescriptions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescriptions (
  id         SERIAL PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id  INT NOT NULL,
  date       DATE,
  time       VARCHAR(10),
  status     VARCHAR(20) DEFAULT 'Pending'
               CHECK (status IN ('Pending','Dispensed')),
  priority   VARCHAR(20) DEFAULT 'Normal'
               CHECK (priority IN ('Normal','Urgent')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id)  REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS prescription_items (
  id              SERIAL PRIMARY KEY,
  prescription_id INT NOT NULL,
  medicine_name   VARCHAR(100) NOT NULL,
  dosage          VARCHAR(100),
  quantity        INT,
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
);

-- ── Lab Tests ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lab_tests (
  id              SERIAL PRIMARY KEY,
  patient_id      INT NOT NULL,
  doctor_id       INT NOT NULL,
  test_name       VARCHAR(100),
  department      VARCHAR(50)
                    CHECK (department IN ('Pathology','Radiology','Microbiology','Biochemistry')),
  test_date       DATE,
  priority        VARCHAR(20) DEFAULT 'Normal'
                    CHECK (priority IN ('Normal','Urgent')),
  status          VARCHAR(30) DEFAULT 'Pending'
                    CHECK (status IN ('Pending','In Progress','Completed')),
  result_file_url VARCHAR(255),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id)  REFERENCES users(id)
);

-- ── Bills ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bills (
  id         SERIAL PRIMARY KEY,
  patient_id INT NOT NULL,
  date       DATE,
  amount     DECIMAL(10,2),
  status     VARCHAR(20) DEFAULT 'Pending'
               CHECK (status IN ('Paid','Pending','Overdue')),
  created_by INT,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ── Audit Logs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id        SERIAL PRIMARY KEY,
  action    VARCHAR(255),
  user_id   INT,
  user_role VARCHAR(50),
  details   TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ── Nurse Orders (Doctor → Nurse clinical orders) ─────────────
CREATE TABLE IF NOT EXISTS nurse_orders (
  id           SERIAL PRIMARY KEY,
  patient_id   INT NOT NULL,
  doctor_id    INT NOT NULL,
  nurse_id     INT,                 -- assigned nurse (nullable = unassigned)
  order_type   VARCHAR(50) NOT NULL
                 CHECK (order_type IN ('Medication','Observation','Procedure','Diet','Mobility','Other')),
  instructions TEXT NOT NULL,
  priority     VARCHAR(20) DEFAULT 'Normal'
                 CHECK (priority IN ('Normal','Urgent')),
  status       VARCHAR(20) DEFAULT 'Pending'
                 CHECK (status IN ('Pending','In Progress','Completed','Cancelled')),
  notes        TEXT,                -- nurse's completion / acknowledgement notes
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id)  REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (nurse_id)   REFERENCES users(id) ON DELETE SET NULL
);

-- ── Doctor Profiles ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctor_profiles (
  id               SERIAL PRIMARY KEY,
  user_id          INT NOT NULL UNIQUE,
  department       VARCHAR(100) NOT NULL,
  phone_number     VARCHAR(15),
  shift            VARCHAR(20),
  status           VARCHAR(20) DEFAULT 'Active',
  bio              TEXT,
  consultation_fee DECIMAL(10,2),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
