CREATE DATABASE IF NOT EXISTS medcore_hms;

USE medcore_hms;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('Admin', 'Doctor', 'Nurse', 'Patient', 'Receptionist', 'Lab Technician', 'Pharmacist') NOT NULL,
  department VARCHAR(50),
  contact VARCHAR(20),
  status ENUM('Active', 'On Leave', 'Inactive') DEFAULT 'Active',
  shift ENUM('Morning', 'Evening', 'Night') DEFAULT 'Morning',
  avatar_url VARCHAR(255),
  bio TEXT,
  consultation_fee DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  role ENUM('Admin', 'Doctor', 'Nurse', 'Receptionist', 'Lab Technician', 'Pharmacist') NOT NULL,
  department VARCHAR(50),
  contact VARCHAR(20),
  status ENUM('Active', 'On Leave', 'Inactive') DEFAULT 'Active',
  shift ENUM('Morning', 'Evening', 'Night') DEFAULT 'Morning',
  avatar_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  age INT,
  gender ENUM('Male', 'Female', 'Other'),
  contact VARCHAR(20),
  last_visit DATE,
  medical_condition VARCHAR(255),
  status ENUM('Inpatient', 'Outpatient', 'Discharged') DEFAULT 'Outpatient',
  blood_type VARCHAR(5),
  allergies TEXT,
  user_id INT UNIQUE NULL COMMENT 'Links Patient-role user to this clinical record',
  created_by INT NULL COMMENT 'User who registered this patient',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS vitals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  bp VARCHAR(20) COMMENT 'Blood Pressure e.g. 120/80',
  heart_rate VARCHAR(10),
  temperature VARCHAR(10),
  spo2 VARCHAR(10),
  recorded_by INT NULL COMMENT 'Nurse who recorded this entry',
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS medicines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  stock INT DEFAULT 0,
  min_required_stock INT DEFAULT 20,
  unit VARCHAR(20) COMMENT 'e.g. Tablets, Vials',
  price DECIMAL(10, 2),
  expiry_date DATE,
  status ENUM('In Stock', 'Low Stock', 'Out of Stock') DEFAULT 'In Stock',
  added_by INT NULL COMMENT 'User who added this medicine',
  FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS beds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ward VARCHAR(50) NOT NULL,
  bed_number VARCHAR(10) NOT NULL,
  status ENUM('Available', 'Occupied', 'Maintenance') DEFAULT 'Available',
  patient_id INT UNIQUE NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  department VARCHAR(50),
  appointment_date DATE,
  appointment_time VARCHAR(10),
  status ENUM('Scheduled', 'Completed', 'Cancelled', 'Emergency') DEFAULT 'Scheduled',
  type ENUM('General Checkup', 'Surgery', 'Consultation', 'Follow-up') DEFAULT 'General Checkup',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS prescriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  date DATE,
  time VARCHAR(10),
  status ENUM('Pending', 'Dispensed') DEFAULT 'Pending',
  priority ENUM('Normal', 'Urgent') DEFAULT 'Normal',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS prescription_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prescription_id INT NOT NULL,
  medicine_name VARCHAR(100) NOT NULL,
  dosage VARCHAR(100),
  quantity INT,
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lab_tests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  test_name VARCHAR(100),
  department ENUM('Pathology', 'Radiology', 'Microbiology', 'Biochemistry'),
  test_date DATE,
  priority ENUM('Normal', 'Urgent') DEFAULT 'Normal',
  status ENUM('Pending', 'In Progress', 'Completed') DEFAULT 'Pending',
  result_text TEXT,
  result_file_url VARCHAR(255),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  date DATE,
  amount DECIMAL(10, 2),
  status ENUM('Paid', 'Pending', 'Overdue') DEFAULT 'Pending',
  created_by INT NULL COMMENT 'User who generated this bill',
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS billing_contributions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  source_role VARCHAR(30) NOT NULL,
  source_module VARCHAR(30) NOT NULL,
  source_id VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  event_date DATE,
  submitted_by INT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('Submitted','Accepted','Rejected') DEFAULT 'Submitted',
  UNIQUE KEY uq_billing_source (source_module, source_id),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_billing_contrib_patient (patient_id, submitted_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS finalized_bills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  generated_by INT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  due_date DATE,
  total_amount DECIMAL(10, 2) NOT NULL,
  paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  balance_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status ENUM('Paid','Pending','Overdue') NOT NULL,
  snapshot_json JSON,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_finalized_bills_patient (patient_id, generated_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bill_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  method ENUM('Cash','Card','UPI','NetBanking','Insurance','Other') DEFAULT 'Cash',
  notes TEXT,
  received_by INT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_bill_payments_patient_paid_at (patient_id, paid_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS nurse_medication_administrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  nurse_order_id INT NULL,
  medicine_id INT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  administered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  administered_by INT NULL,
  notes TEXT,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (nurse_order_id) REFERENCES nurse_orders(id) ON DELETE SET NULL,
  FOREIGN KEY (medicine_id) REFERENCES medicines(id),
  FOREIGN KEY (administered_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_nurse_med_admin_patient_time (patient_id, administered_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bed_stays (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  bed_id INT NOT NULL,
  admitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  discharged_at TIMESTAMP NULL,
  daily_rate DECIMAL(10, 2) NOT NULL DEFAULT 1500.00,
  created_by INT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (bed_id) REFERENCES beds(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_bed_stays_patient_dates (patient_id, admitted_at, discharged_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  action VARCHAR(255),
  user_id INT,
  user_role VARCHAR(50),
  details TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS doctor_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  department VARCHAR(100) NOT NULL,
  phone_number VARCHAR(15),
  shift VARCHAR(20),
  status VARCHAR(20) DEFAULT 'Active',
  bio TEXT,
  consultation_fee DECIMAL(10, 2),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS nurse_orders (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  patient_id   INT NOT NULL,
  doctor_id    INT NOT NULL,
  nurse_id     INT NULL COMMENT 'Assigned nurse (NULL = unassigned)',
  order_type   ENUM('Medication','Observation','Procedure','Diet','Mobility','Other') NOT NULL,
  instructions TEXT NOT NULL,
  priority     ENUM('Normal','Urgent') DEFAULT 'Normal',
  status       ENUM('Pending','In Progress','Completed','Cancelled') DEFAULT 'Pending',
  notes        TEXT COMMENT 'Nurse acknowledgement / completion notes',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id)  REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (nurse_id)   REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
