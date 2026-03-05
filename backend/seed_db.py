"""
seed_db.py – Populate the Neon PostgreSQL database with initial demo data.

Usage (from the backend/ directory):
    python seed_db.py
"""
import os
import sys
from pathlib import Path

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

_script_dir = Path(__file__).resolve().parent
# Load .env from backend/ first, then fall back to project root
load_dotenv(_script_dir / ".env")
load_dotenv(_script_dir.parent / ".env", override=False)

sys.path.insert(0, str(_script_dir))
from app.auth import hash_password  # noqa: E402


def seed_db():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set in .env")

    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()

        default_hash = hash_password("Medcore@123")

        # ── Users (all roles — these are login accounts) ──────────
        # Columns: full_name, email, password_hash, role, department, contact,
        #          status, shift, avatar_url, bio, consultation_fee
        users_data = [
            # Admins
            ("Admin User",         "admin@medcore.com",          default_hash, "Admin",          "Administration",  "555-0001", "Active", "Morning", "https://ui-avatars.com/api/?name=Admin+User&background=0D9488&color=fff",           "System administrator with full access.",        None),
            # Doctors
            ("Dr. Rakesh Gupta",   "rakesh@medcore.com",         default_hash, "Doctor",         "Cardiology",      "555-0101", "Active", "Morning", "https://ui-avatars.com/api/?name=Rakesh+Gupta&background=3B82F6&color=fff",         "Senior cardiologist with 15 years experience.", 500.00),
            ("Dr. Sarah Bennett",  "sarah.bennett@medcore.com",  default_hash, "Doctor",         "Obstetrics",      "555-0102", "Active", "Morning", "https://ui-avatars.com/api/?name=Sarah+Bennett&background=3B82F6&color=fff",        "OB-GYN specialist.",                            450.00),
            ("Dr. James Wilson",   "james.wilson@medcore.com",   default_hash, "Doctor",         "Emergency",       "555-0103", "Active", "Evening", "https://ui-avatars.com/api/?name=James+Wilson&background=3B82F6&color=fff",         "Emergency medicine consultant.",                400.00),
            # Nurses
            ("Nurse Jackie",       "jackie@medcore.com",         default_hash, "Nurse",          "General Ward",    "555-0201", "Active", "Night",   "https://ui-avatars.com/api/?name=Jackie+Nurse&background=10B981&color=fff",         "ICU specialist nurse.",                         None),
            ("Nurse Ben",          "ben@medcore.com",            default_hash, "Nurse",          "ICU",             "555-0202", "Active", "Evening", "https://ui-avatars.com/api/?name=Ben+Nurse&background=10B981&color=fff",             "Senior ward nurse.",                            None),
            # Receptionist
            ("Reception Mary",     "mary@medcore.com",           default_hash, "Receptionist",   "Front Desk",      "555-0301", "Active", "Morning", "https://ui-avatars.com/api/?name=Mary+Reception&background=F59E0B&color=fff",       "Front desk coordinator.",                       None),
            # Lab Technician
            ("Tech. Mike",         "mike@medcore.com",           default_hash, "Lab Technician", "Pathology",       "555-0401", "Active", "Morning", "https://ui-avatars.com/api/?name=Mike+Tech&background=8B5CF6&color=fff",            "Certified lab technician.",                     None),
            # Pharmacist
            ("Pharm. Lisa",        "lisa@medcore.com",           default_hash, "Pharmacist",     "Pharmacy",        "555-0501", "Active", "Morning", "https://ui-avatars.com/api/?name=Lisa+Pharm&background=EC4899&color=fff",           "Lead pharmacist.",                              None),
        ]
        psycopg2.extras.execute_batch(
            cursor,
            """
            INSERT INTO users (full_name, email, password_hash, role, department, contact,
                               status, shift, avatar_url, bio, consultation_fee)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (email) DO UPDATE SET
                full_name        = EXCLUDED.full_name,
                role             = EXCLUDED.role,
                department       = EXCLUDED.department,
                contact          = EXCLUDED.contact,
                status           = EXCLUDED.status,
                shift            = EXCLUDED.shift,
                avatar_url       = EXCLUDED.avatar_url,
                bio              = EXCLUDED.bio,
                consultation_fee = EXCLUDED.consultation_fee
            """,
            users_data,
        )
        conn.commit()
        print("✓ Users seeded")

        # ── Patients (clinical records) ───────────────────────────
        patients_data = [
            ("John Doe",      45, "Male",   "555-1001", "2025-10-25", "Hypertension",            "Outpatient", "O+",  "Peanuts"),
            ("Jane Smith",    32, "Female", "555-1002", "2025-10-28", "Pregnancy",                "Outpatient", "A+",  "None"),
            ("Robert Brown",  67, "Male",   "555-1003", "2025-10-29", "Cardiac Arrest Recovery", "Inpatient",  "B-",  "Penicillin"),
            ("Emily White",   28, "Female", "555-1004", "2025-11-05", "Flu",                      "Outpatient", "AB+", "None"),
            ("Carlos Mendez", 53, "Male",   "555-1005", "2026-01-12", "Diabetes Type 2",          "Inpatient",  "A-",  "Sulfa drugs"),
            ("Aisha Patel",   38, "Female", "555-1006", "2026-02-01", "Asthma",                   "Outpatient", "O-",  "Aspirin"),
        ]
        psycopg2.extras.execute_batch(
            cursor,
            """
            INSERT INTO patients (full_name, age, gender, contact, last_visit, medical_condition, status, blood_type, allergies)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            """,
            patients_data,
        )
        conn.commit()
        print("✓ Patients seeded")

        # ── Medicines ─────────────────────────────────────────────
        medicines_data = [
            ("Amoxicillin",       "Antibiotic",        500,  "Tablets",  12.50, "2027-12-01", "In Stock"),
            ("Paracetamol",       "Painkiller",        1200, "Tablets",   5.00, "2027-06-15", "In Stock"),
            ("Insulin Glargine",  "Diabetic",            15, "Vials",    45.00, "2027-02-20", "Low Stock"),
            ("Ibuprofen",         "Anti-inflammatory",    0, "Tablets",   8.00, "2026-10-10", "Out of Stock"),
            ("Metformin",         "Diabetic",           800, "Tablets",   7.50, "2027-08-30", "In Stock"),
            ("Salbutamol Inhaler","Respiratory",         60, "Inhalers", 22.00, "2027-05-01", "In Stock"),
            ("Atorvastatin",      "Cardiovascular",     350, "Tablets",  15.00, "2027-11-15", "In Stock"),
            ("Morphine Sulfate",  "Analgesic",           25, "Vials",    85.00, "2026-09-01", "Low Stock"),
        ]
        psycopg2.extras.execute_batch(
            cursor,
            """
            INSERT INTO medicines (name, category, stock, unit, price, expiry_date, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            """,
            medicines_data,
        )
        conn.commit()
        print("✓ Medicines seeded")

        # ── Beds ──────────────────────────────────────────────────
        beds_data = [
            ("General Ward A", "101", "Available",   None),
            ("General Ward A", "102", "Available",   None),
            ("General Ward A", "103", "Maintenance", None),
            ("General Ward B", "201", "Available",   None),
            ("General Ward B", "202", "Available",   None),
            ("ICU",            "301", "Occupied",    None),
            ("ICU",            "302", "Available",   None),
            ("ICU",            "303", "Available",   None),
            ("Maternity",      "401", "Available",   None),
            ("Maternity",      "402", "Available",   None),
        ]
        psycopg2.extras.execute_batch(
            cursor,
            """
            INSERT INTO beds (ward, bed_number, status, patient_id)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            """,
            beds_data,
        )
        conn.commit()
        print("✓ Beds seeded")

        # ── Link ICU bed to an inpatient ──────────────────────────
        cursor.execute("SELECT id FROM patients WHERE status = 'Inpatient' LIMIT 1")
        row = cursor.fetchone()
        if row:
            inpatient_id = row[0]
            cursor.execute(
                """UPDATE beds SET patient_id = %s, status = 'Occupied'
                   WHERE ward = 'ICU' AND bed_number = '301'
                   AND NOT EXISTS (SELECT 1 FROM beds WHERE patient_id = %s)""",
                (inpatient_id, inpatient_id),
            )
            conn.commit()

        # ── Appointments ──────────────────────────────────────────
        cursor.execute("SELECT id FROM users WHERE role = 'Doctor' ORDER BY id LIMIT 3")
        doctors = [r[0] for r in cursor.fetchall()]

        cursor.execute("SELECT id FROM patients ORDER BY id")
        patients = [r[0] for r in cursor.fetchall()]

        if doctors and len(patients) >= 4:
            appt_data = [
                (patients[0], doctors[0], "Cardiology", "2026-03-10", "10:00", "General Checkup", "Scheduled"),
                (patients[1], doctors[1], "Obstetrics",  "2026-03-10", "11:30", "Follow-up",       "Scheduled"),
                (patients[2], doctors[0], "Cardiology", "2026-03-11", "09:00", "Consultation",    "Completed"),
                (patients[3], doctors[2], "Emergency",  "2026-03-12", "08:00", "General Checkup", "Scheduled"),
                (patients[4] if len(patients) > 4 else patients[0], doctors[1], "General Medicine", "2026-03-13", "14:00", "Follow-up", "Scheduled"),
                (patients[5] if len(patients) > 5 else patients[1], doctors[2], "Emergency",        "2026-03-13", "16:30", "Consultation", "Emergency" if False else "Scheduled"),
            ]
            psycopg2.extras.execute_batch(
                cursor,
                """
                INSERT INTO appointments (patient_id, doctor_id, department, appointment_date, appointment_time, type, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
                """,
                appt_data,
            )
            conn.commit()
        print("✓ Appointments seeded")

        # ── Lab Tests ─────────────────────────────────────────────
        cursor.execute("SELECT id FROM patients LIMIT 3")
        lab_patients = [r[0] for r in cursor.fetchall()]

        cursor.execute("SELECT id FROM users WHERE role = 'Doctor' LIMIT 2")
        lab_doctors = [r[0] for r in cursor.fetchall()]

        if lab_patients and lab_doctors:
            p0, p1, p2 = lab_patients[0], lab_patients[min(1, len(lab_patients)-1)], lab_patients[min(2, len(lab_patients)-1)]
            d0, d1 = lab_doctors[0], lab_doctors[min(1, len(lab_doctors)-1)]
            lab_data = [
                (p0, d0, "Complete Blood Count",  "Pathology",    "2026-03-10", "Normal", "Pending"),
                (p0, d0, "Chest X-Ray",           "Radiology",    "2026-03-10", "Urgent", "In Progress"),
                (p1, d1, "Blood Glucose",         "Biochemistry", "2026-03-11", "Normal", "Completed"),
                (p2, d0, "Urine Culture",         "Microbiology", "2026-03-12", "Normal", "Pending"),
            ]
            psycopg2.extras.execute_batch(
                cursor,
                """
                INSERT INTO lab_tests (patient_id, doctor_id, test_name, department, test_date, priority, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
                """,
                lab_data,
            )
            conn.commit()
        print("✓ Lab tests seeded")

        # ── Bills ─────────────────────────────────────────────────
        cursor.execute("SELECT id FROM patients ORDER BY id LIMIT 4")
        bill_patients = [r[0] for r in cursor.fetchall()]

        if bill_patients:
            bills_data = [
                (bill_patients[0], "2026-03-01",  150.00, "Pending"),
                (bill_patients[0], "2026-02-15",  250.00, "Paid"),
                (bill_patients[1], "2026-03-05",  320.00, "Pending"),
                (bill_patients[2], "2026-01-20", 1500.00, "Paid"),
                (bill_patients[3] if len(bill_patients) > 3 else bill_patients[0], "2026-02-28", 420.00, "Overdue"),
            ]
            psycopg2.extras.execute_batch(
                cursor,
                "INSERT INTO bills (patient_id, date, amount, status) VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING",
                bills_data,
            )
            conn.commit()
        print("✓ Bills seeded")

        # ── Vitals ────────────────────────────────────────────────
        cursor.execute("SELECT id FROM patients ORDER BY id LIMIT 4")
        vital_patients = [r[0] for r in cursor.fetchall()]

        vitals_data = [
            (vital_patients[0], "128/84", "76", "98.6", "98"),
            (vital_patients[1], "110/70", "82", "98.4", "99"),
            (vital_patients[2], "145/95", "91", "99.1", "96"),
        ]
        for pid, bp, hr, temp, spo2 in vitals_data[:len(vital_patients)]:
            cursor.execute(
                """
                INSERT INTO vitals (patient_id, bp, heart_rate, temperature, spo2)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
                """,
                (pid, bp, hr, temp, spo2),
            )
        conn.commit()
        print("✓ Vitals seeded")

        cursor.close()
        conn.close()
        print("\n✅ All demo data seeded successfully.")
        print("\n📋 Login credentials (password for all: Medcore@123):")
        print("   admin@medcore.com          → Admin")
        print("   rakesh@medcore.com         → Doctor (Cardiology)")
        print("   sarah.bennett@medcore.com  → Doctor (Obstetrics)")
        print("   james.wilson@medcore.com   → Doctor (Emergency)")
        print("   jackie@medcore.com         → Nurse")
        print("   ben@medcore.com            → Nurse")
        print("   mary@medcore.com           → Receptionist")
        print("   mike@medcore.com           → Lab Technician")
        print("   lisa@medcore.com           → Pharmacist")

    except psycopg2.Error as err:
        print(f"✗ Seed error: {err}")
        raise


if __name__ == "__main__":
    seed_db()
