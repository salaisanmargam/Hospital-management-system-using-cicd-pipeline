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
                      CHECK (status IN ('Inpatient','Outpatient','Discharged')),
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
  min_required_stock INT   DEFAULT 20,
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
  result_text     TEXT,
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

-- ── Billing Contributions (department handoff to receptionist) ──
CREATE TABLE IF NOT EXISTS billing_contributions (
  id            SERIAL PRIMARY KEY,
  patient_id    INT NOT NULL,
  source_role   VARCHAR(30) NOT NULL,
  source_module VARCHAR(30) NOT NULL,
  source_id     VARCHAR(50) NOT NULL,
  description   TEXT NOT NULL,
  amount        DECIMAL(10,2) NOT NULL DEFAULT 0,
  event_date    DATE,
  submitted_by  INT,
  submitted_at  TIMESTAMPTZ DEFAULT NOW(),
  status        VARCHAR(20) DEFAULT 'Submitted'
                CHECK (status IN ('Submitted','Accepted','Rejected')),
  UNIQUE (source_module, source_id),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ── Finalized bills generated by receptionist ───────────────────
CREATE TABLE IF NOT EXISTS finalized_bills (
  id             SERIAL PRIMARY KEY,
  patient_id     INT NOT NULL,
  generated_by   INT,
  generated_at   TIMESTAMPTZ DEFAULT NOW(),
  due_date       DATE,
  total_amount   DECIMAL(10,2) NOT NULL,
  paid_amount    DECIMAL(10,2) NOT NULL DEFAULT 0,
  balance_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status         VARCHAR(20) NOT NULL
                 CHECK (status IN ('Paid','Pending','Overdue')),
  snapshot_json  JSONB,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_billing_contrib_patient
  ON billing_contributions(patient_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_finalized_bills_patient
  ON finalized_bills(patient_id, generated_at DESC);

-- ── Bill Payments (actual payment transactions) ──────────────
CREATE TABLE IF NOT EXISTS bill_payments (
  id          SERIAL PRIMARY KEY,
  patient_id  INT NOT NULL,
  amount      DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  paid_at     TIMESTAMPTZ   DEFAULT NOW(),
  method      VARCHAR(30)   DEFAULT 'Cash'
                CHECK (method IN ('Cash','Card','UPI','NetBanking','Insurance','Other')),
  notes       TEXT,
  received_by INT,
  FOREIGN KEY (patient_id)  REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ── Nurse Medication Administrations (exact vial usage) ──────
CREATE TABLE IF NOT EXISTS nurse_medication_administrations (
  id              SERIAL PRIMARY KEY,
  patient_id      INT NOT NULL,
  nurse_order_id  INT,
  medicine_id     INT NOT NULL,
  quantity        DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
  unit_price      DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  administered_at TIMESTAMPTZ   DEFAULT NOW(),
  administered_by INT,
  notes           TEXT,
  FOREIGN KEY (patient_id)      REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (nurse_order_id)  REFERENCES nurse_orders(id) ON DELETE SET NULL,
  FOREIGN KEY (medicine_id)     REFERENCES medicines(id),
  FOREIGN KEY (administered_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ── Bed Stays (admission/discharge intervals for billing) ────
CREATE TABLE IF NOT EXISTS bed_stays (
  id            SERIAL PRIMARY KEY,
  patient_id    INT NOT NULL,
  bed_id        INT NOT NULL,
  admitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  discharged_at TIMESTAMPTZ,
  daily_rate    DECIMAL(10,2) NOT NULL DEFAULT 1500.00 CHECK (daily_rate >= 0),
  created_by    INT,
  CHECK (discharged_at IS NULL OR discharged_at >= admitted_at),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (bed_id) REFERENCES beds(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_bill_payments_patient_paid_at
  ON bill_payments(patient_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_nurse_med_admin_patient_time
  ON nurse_medication_administrations(patient_id, administered_at DESC);
CREATE INDEX IF NOT EXISTS idx_bed_stays_patient_dates
  ON bed_stays(patient_id, admitted_at DESC, discharged_at DESC);

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
