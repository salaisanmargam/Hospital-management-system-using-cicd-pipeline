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

        # ── Users (doctors) ───────────────────────────────────────
        users_data = [
            ("Dr. Rakesh Gupta",   "rakesh@medcore.com",         default_hash, "Doctor", "https://picsum.photos/200/200"),
            ("Dr. Sarah Bennett",  "sarah.bennett@medcore.com",  default_hash, "Doctor", "https://picsum.photos/201/201"),
            ("Dr. James Wilson",   "james.wilson@medcore.com",   default_hash, "Doctor", "https://picsum.photos/202/202"),
            ("Admin User",         "admin@medcore.com",          default_hash, "Admin",  "https://picsum.photos/210/210"),
        ]
        psycopg2.extras.execute_batch(
            cursor,
            """
            INSERT INTO users (full_name, email, password_hash, role, avatar_url)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (email) DO NOTHING
            """,
            users_data,
        )
        conn.commit()

        # ── Patients ──────────────────────────────────────────────
        patients_data = [
            ("John Doe",      45, "Male",   "555-0101", "2023-10-25", "Hypertension",            "Outpatient", "O+",  "Peanuts"),
            ("Jane Smith",    32, "Female", "555-0102", "2023-10-28", "Pregnancy",                "Outpatient", "A+",  "None"),
            ("Robert Brown",  67, "Male",   "555-0103", "2023-10-29", "Cardiac Arrest Recovery", "Inpatient",  "B-",  "Penicillin"),
            ("Emily White",   28, "Female", "555-0104", "2023-10-20", "Flu",                      "Outpatient", "AB+", "None"),
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

        # ── Staff ─────────────────────────────────────────────────
        staff_data = [
            ("Nurse Jackie",  "jackie@medcore.com", "Nurse",          "General Doctor", "555-0301", "Active", "Night",   "https://picsum.photos/203/203"),
            ("Nurse Ben",     "ben@medcore.com",    "Nurse",          "General Ward",   "555-0302", "Active", "Evening", "https://picsum.photos/204/204"),
            ("Tech. Mike",    "mike@medcore.com",   "Lab Technician", "Dentist",        "555-0401", "Active", "Morning", "https://picsum.photos/205/205"),
            ("Pharm. Lisa",   "lisa@medcore.com",   "Pharmacist",     "Pharmacy",       "555-0501", "Active", "Morning", "https://picsum.photos/206/206"),
        ]
        psycopg2.extras.execute_batch(
            cursor,
            """
            INSERT INTO staff (full_name, email, role, department, contact, status, shift, avatar_url)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (email) DO NOTHING
            """,
            staff_data,
        )
        conn.commit()

        # ── Medicines ─────────────────────────────────────────────
        medicines_data = [
            ("Amoxicillin",      "Antibiotic",       500,  "Tablets", 12.50, "2024-12-01", "In Stock"),
            ("Paracetamol",      "Painkiller",       1200, "Tablets",  5.00, "2025-06-15", "In Stock"),
            ("Insulin Glargine", "Diabetic",           15, "Vials",   45.00, "2024-02-20", "Low Stock"),
            ("Ibuprofen",        "Anti-inflammatory",   0, "Tablets",  8.00, "2024-10-10", "Out of Stock"),
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

        # ── Beds ──────────────────────────────────────────────────
        beds_data = [
            ("General Ward A", "101", "Available",   None),
            ("General Ward A", "102", "Available",   None),
            ("General Ward A", "103", "Maintenance", None),
            ("ICU",            "201", "Occupied",    None),
            ("ICU",            "202", "Available",   None),
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

        # ── Appointments ──────────────────────────────────────────
        cursor.execute("SELECT id FROM users WHERE role = 'Doctor' LIMIT 1")
        row = cursor.fetchone()
        doc_id = row[0] if row else None

        cursor.execute("SELECT id FROM patients LIMIT 2")
        patient_ids = [r[0] for r in cursor.fetchall()]

        if doc_id and len(patient_ids) >= 2:
            appt_data = [
                (patient_ids[0], doc_id, "2026-03-10", "10:00", "General Checkup", "Scheduled"),
                (patient_ids[1], doc_id, "2026-03-10", "11:30", "Follow-up",       "Scheduled"),
            ]
            psycopg2.extras.execute_batch(
                cursor,
                """
                INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, type, status)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
                """,
                appt_data,
            )
            conn.commit()

        # ── Lab Tests ─────────────────────────────────────────────
        cursor.execute("SELECT id FROM patients LIMIT 1")
        row = cursor.fetchone()
        p_id = row[0] if row else None

        cursor.execute("SELECT id FROM users WHERE role = 'Doctor' LIMIT 1")
        row = cursor.fetchone()
        d_id = row[0] if row else None

        if p_id and d_id:
            lab_data = [
                (p_id, d_id, "Blood Count",  "Pathology", "2026-03-10", "Normal", "Pending"),
                (p_id, d_id, "Chest X-Ray",  "Radiology", "2026-03-10", "Urgent", "In Progress"),
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

        # ── Bills ─────────────────────────────────────────────────
        if p_id:
            bills_data = [
                (p_id, "2026-03-01", 150.00, "Pending"),
                (p_id, "2026-02-15", 250.00, "Paid"),
            ]
            psycopg2.extras.execute_batch(
                cursor,
                "INSERT INTO bills (patient_id, date, amount, status) VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING",
                bills_data,
            )
            conn.commit()

        cursor.close()
        conn.close()
        print("✓ Demo data seeded successfully.")

    except psycopg2.Error as err:
        print(f"✗ Seed error: {err}")
        raise


if __name__ == "__main__":
    seed_db()
