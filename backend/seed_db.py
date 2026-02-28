import os
import sys
from pathlib import Path

import mysql.connector
from dotenv import load_dotenv

# Load .env from the same directory as this script
_script_dir = Path(__file__).resolve().parent
load_dotenv(dotenv_path=_script_dir / ".env")

# Add backend to path so we can reuse auth helpers
sys.path.insert(0, str(_script_dir))
from app.auth import hash_password  # noqa: E402


def seed_db():
    try:
        conn = mysql.connector.connect(
            host=os.getenv("MYSQL_HOST", "localhost"),
            port=int(os.getenv("MYSQL_PORT", "3306")),
            user=os.getenv("MYSQL_USER", "root"),
            password=os.getenv("MYSQL_PASSWORD", ""),
            database=os.getenv("MYSQL_DATABASE", "medcore_hms"),
        )
        cursor = conn.cursor()

        # Seed initial users (password: Medcore@123) — generate real hash
        default_hash = hash_password("Medcore@123")
        
        users_data = [
            ("Dr. Rakesh Gupta", "rakesh@medcore.com", default_hash, "Doctor", "https://picsum.photos/200/200"),
            ("Dr. Sarah Bennett", "sarah.bennett@medcore.com", default_hash, "Doctor", "https://picsum.photos/201/201"),
            ("Dr. James Wilson", "james.wilson@medcore.com", default_hash, "Doctor", "https://picsum.photos/202/202"),
        ]

        cursor.executemany(
            "INSERT IGNORE INTO users (full_name, email, password_hash, role, avatar_url) VALUES (%s, %s, %s, %s, %s)",
            users_data
        )

        # Get doctor and patient IDs for appointments
        cursor.execute("SELECT id FROM users WHERE role = 'Doctor' LIMIT 1")
        doc_id = cursor.fetchone()[0]
        cursor.execute("SELECT id FROM patients LIMIT 2")
        patient_ids = [r[0] for r in cursor.fetchall()]

        # Seed appointments
        if patient_ids:
            appointments_data = [
                (patient_ids[0], doc_id, "2023-11-20", "10:00:00", "Checkup", "Scheduled"),
                (patient_ids[1], doc_id, "2023-11-20", "11:30:00", "Follow-up", "Scheduled"),
            ]
            cursor.executemany(
                "INSERT IGNORE INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, type, status) VALUES (%s, %s, %s, %s, %s, %s)",
                appointments_data
            )

        # Seed staff
        staff_data = [
            ("Nurse Jackie", "jackie@medcore.com", "Nurse", "General Doctor", "555-0301", "Active", "Night", "https://picsum.photos/203/203"),
            ("Nurse Ben", "ben@medcore.com", "Nurse", "General Ward", "555-0302", "Active", "Evening", "https://picsum.photos/204/204"),
            ("Tech. Mike", "mike@medcore.com", "Lab Technician", "Dentist", "555-0401", "Active", "Morning", "https://picsum.photos/205/205"),
            ("Pharm. Lisa", "lisa@medcore.com", "Pharmacist", "Pharmacy", "555-0501", "Active", "Morning", "https://picsum.photos/206/206"),
        ]

        cursor.executemany(
            "INSERT IGNORE INTO staff (full_name, email, role, department, contact, status, shift, avatar_url) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
            staff_data
        )

        # Seed patients
        patients_data = [
            ("John Doe", 45, "Male", "555-0101", "2023-10-25", "Hypertension", "Outpatient", "O+", "Peanuts"),
            ("Jane Smith", 32, "Female", "555-0102", "2023-10-28", "Pregnancy", "Outpatient", "A+", "None"),
            ("Robert Brown", 67, "Male", "555-0103", "2023-10-29", "Cardiac Arrest Recovery", "Inpatient", "B-", "Penicillin"),
            ("Emily White", 28, "Female", "555-0104", "2023-10-20", "Flu", "Outpatient", "AB+", "None"),
        ]

        cursor.executemany(
            "INSERT IGNORE INTO patients (full_name, age, gender, contact, last_visit, medical_condition, status, blood_type, allergies) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
            patients_data
        )

        # Seed medicines
        medicines_data = [
            ("Amoxicillin", "Antibiotic", 500, "Tablets", 12.50, "2024-12-01", "In Stock"),
            ("Paracetamol", "Painkiller", 1200, "Tablets", 5.00, "2025-06-15", "In Stock"),
            ("Insulin Glargine", "Diabetic", 15, "Vials", 45.00, "2024-02-20", "Low Stock"),
            ("Ibuprofen", "Anti-inflammatory", 0, "Tablets", 8.00, "2024-10-10", "Out of Stock"),
        ]

        cursor.executemany(
            "INSERT IGNORE INTO medicines (name, category, stock, unit, price, expiry_date, status) VALUES (%s, %s, %s, %s, %s, %s, %s)",
            medicines_data
        )

        # Seed beds
        beds_data = [
            ("General Ward A", "101", "Occupied", 3), # Robert Brown id=3 after patients seed
            ("General Ward A", "102", "Available", None),
            ("General Ward A", "103", "Maintenance", None),
            ("ICU", "201", "Occupied", None),
            ("ICU", "202", "Available", None),
        ]

        cursor.executemany(
            "INSERT IGNORE INTO beds (ward, bed_number, status, patient_id) VALUES (%s, %s, %s, %s)",
            beds_data
        )

        # Seed lab tests
        cursor.execute("SELECT id FROM patients LIMIT 1")
        p_id = cursor.fetchone()[0]
        cursor.execute("SELECT id FROM users WHERE role = 'Doctor' LIMIT 1")
        d_id = cursor.fetchone()[0]

        lab_tests_data = [
            (p_id, d_id, "Blood Count", "Pathology", "2023-11-20", "Normal", "Pending"),
            (p_id, d_id, "Chest X-Ray", "Radiology", "2023-11-20", "Urgent", "In Progress"),
        ]
        cursor.executemany(
            "INSERT IGNORE INTO lab_tests (patient_id, doctor_id, test_name, department, test_date, priority, status) VALUES (%s, %s, %s, %s, %s, %s, %s)",
            lab_tests_data
        )

        # Seed bills
        bills_data = [
            (p_id, "2023-11-20", 150.00, "Pending"),
            (p_id, "2023-11-15", 250.00, "Paid"),
        ]
        cursor.executemany(
            "INSERT IGNORE INTO bills (patient_id, date, amount, status) VALUES (%s, %s, %s, %s)",
            bills_data
        )

        conn.commit()
        cursor.close()
        conn.close()
        print("Initial data seeded successfully!")
    except mysql.connector.Error as err:
        print(f"Error: {err}")

if __name__ == "__main__":
    seed_db()
