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
  status ENUM('Inpatient', 'Outpatient') DEFAULT 'Outpatient',
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
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS medicines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  stock INT DEFAULT 0,
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
