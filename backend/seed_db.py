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
            # Patient login accounts (linked to clinical records)
            ("John Doe",           "john.doe@medcore.com",       default_hash, "Patient",        "General",         "555-1001", "Active", "Morning", "https://ui-avatars.com/api/?name=John+Doe&background=0EA5E9&color=fff",             "Patient portal account.",                       None),
            ("Jane Smith",         "jane.smith@medcore.com",     default_hash, "Patient",        "General",         "555-1002", "Active", "Morning", "https://ui-avatars.com/api/?name=Jane+Smith&background=0EA5E9&color=fff",           "Patient portal account.",                       None),
            ("Carlos Mendez",      "carlos.mendez@medcore.com",  default_hash, "Patient",        "General",         "555-1005", "Active", "Morning", "https://ui-avatars.com/api/?name=Carlos+Mendez&background=0EA5E9&color=fff",        "Patient portal account.",                       None),
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
            ("John Doe",           45, "Male",   "555-1001", "2026-02-01", "Hypertension",                "Outpatient", "O+",  "Peanuts"),
            ("Jane Smith",         32, "Female", "555-1002", "2026-02-02", "Pregnancy",                    "Outpatient", "A+",  "None"),
            ("Robert Brown",       67, "Male",   "555-1003", "2026-02-03", "Cardiac Arrest Recovery",     "Inpatient",  "B-",  "Penicillin"),
            ("Emily White",        28, "Female", "555-1004", "2026-02-04", "Flu",                          "Outpatient", "AB+", "None"),
            ("Carlos Mendez",      53, "Male",   "555-1005", "2026-02-05", "Diabetes Type 2",              "Inpatient",  "A-",  "Sulfa drugs"),
            ("Aisha Patel",        38, "Female", "555-1006", "2026-02-06", "Asthma",                       "Outpatient", "O-",  "Aspirin"),
            ("Rahul Verma",        41, "Male",   "555-1007", "2026-02-07", "Coronary Artery Disease",      "Outpatient", "B+",  "None"),
            ("Priya Nair",         29, "Female", "555-1008", "2026-02-08", "Iron Deficiency Anemia",       "Outpatient", "A+",  "None"),
            ("Michael Lee",        36, "Male",   "555-1009", "2026-02-09", "Gastroenteritis",              "Outpatient", "O+",  "None"),
            ("Sofia Khan",         27, "Female", "555-1010", "2026-02-10", "Migraine",                     "Outpatient", "AB-", "NSAIDs"),
            ("Daniel Kim",         50, "Male",   "555-1011", "2026-02-11", "Type 2 Diabetes",              "Outpatient", "B+",  "None"),
            ("Ananya Iyer",        34, "Female", "555-1012", "2026-02-12", "Gestational Hypertension",     "Outpatient", "O+",  "None"),
            ("Samuel Davis",       60, "Male",   "555-1013", "2026-02-13", "Chronic Heart Failure",        "Inpatient",  "A-",  "None"),
            ("Fatima Noor",        25, "Female", "555-1014", "2026-02-14", "Urinary Tract Infection",      "Outpatient", "B-",  "Penicillin"),
            ("Arjun Reddy",        47, "Male",   "555-1015", "2026-02-15", "Acute Bronchitis",             "Outpatient", "O-",  "None"),
            ("Meera Joshi",        31, "Female", "555-1016", "2026-02-16", "Thyroid Disorder",             "Outpatient", "A+",  "None"),
            ("Noah Martinez",      44, "Male",   "555-1017", "2026-02-17", "Dyslipidemia",                 "Outpatient", "AB+", "None"),
            ("Zara Ali",           39, "Female", "555-1018", "2026-02-18", "Pneumonia",                    "Inpatient",  "O+",  "None"),
            ("Ethan Clark",        58, "Male",   "555-1019", "2026-02-19", "Atrial Fibrillation",          "Outpatient", "B+",  "None"),
            ("Nisha Rao",          33, "Female", "555-1020", "2026-02-20", "Polycystic Ovary Syndrome",    "Outpatient", "A-",  "None"),
            ("Vikram Singh",       48, "Male",   "555-1021", "2026-02-21", "Acid Peptic Disease",          "Outpatient", "O+",  "None"),
            ("Grace Thompson",     26, "Female", "555-1022", "2026-02-22", "Allergic Rhinitis",            "Outpatient", "AB+", "None"),
            ("Leo Anderson",       54, "Male",   "555-1023", "2026-02-23", "Chronic Kidney Disease",       "Inpatient",  "B-",  "None"),
            ("Pooja Menon",        37, "Female", "555-1024", "2026-02-24", "Vitamin D Deficiency",         "Outpatient", "O-",  "None"),
            ("Henry Walker",       62, "Male",   "555-1025", "2026-02-25", "Post-MI Follow-up",            "Outpatient", "A+",  "None"),
            ("Kavya Sharma",       30, "Female", "555-1026", "2026-02-26", "Morning Sickness",             "Outpatient", "B+",  "None"),
            ("Oliver Scott",       42, "Male",   "555-1027", "2026-02-27", "Fever with Body Pain",         "Outpatient", "AB-", "None"),
            ("Sneha Kulkarni",     35, "Female", "555-1028", "2026-02-28", "Reactive Airway Disease",      "Outpatient", "A+",  "Aspirin"),
            ("Benjamin Young",     57, "Male",   "555-1029", "2026-03-01", "Uncontrolled Hypertension",    "Outpatient", "O+",  "None"),
            ("Ritika Desai",       24, "Female", "555-1030", "2026-03-02", "Acute Pharyngitis",            "Outpatient", "B+",  "None"),
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

        # Link seeded patient accounts to clinical patient records (for role-based patient views)
        cursor.execute(
            """
            WITH candidate_links AS (
                SELECT DISTINCT ON (u.id)
                    p.id AS patient_id,
                    u.id AS user_id
                FROM users u
                JOIN patients p ON p.contact = u.contact
                WHERE u.role = 'Patient'
                  AND u.contact IS NOT NULL
                ORDER BY u.id, p.id DESC
            )
            UPDATE patients p
            SET user_id = cl.user_id
            FROM candidate_links cl
            WHERE p.id = cl.patient_id
              AND (p.user_id IS NULL OR p.user_id = cl.user_id)
              AND NOT EXISTS (
                  SELECT 1
                  FROM patients p2
                  WHERE p2.user_id = cl.user_id
                    AND p2.id <> p.id
              )
            """
        )
        conn.commit()
        print("✓ Patient accounts linked")

        demo_contacts = [row[3] for row in patients_data]
        cursor.execute(
            """
            SELECT DISTINCT ON (contact) id, full_name, medical_condition, status, contact
            FROM patients
            WHERE contact = ANY(%s)
            ORDER BY contact, id DESC
            """,
            (demo_contacts,),
        )
        demo_patient_rows = cursor.fetchall() or []

        if demo_contacts:
            cursor.execute(
                """
                DELETE FROM prescription_items
                WHERE prescription_id IN (
                    SELECT pr.id
                    FROM prescriptions pr
                    JOIN patients p ON p.id = pr.patient_id
                    WHERE p.contact = ANY(%s)
                )
                """,
                (demo_contacts,),
            )
            cursor.execute(
                """
                DELETE FROM prescriptions
                WHERE patient_id IN (SELECT id FROM patients WHERE contact = ANY(%s))
                """,
                (demo_contacts,),
            )
            cursor.execute(
                "DELETE FROM lab_tests WHERE patient_id IN (SELECT id FROM patients WHERE contact = ANY(%s))",
                (demo_contacts,),
            )
            cursor.execute(
                "DELETE FROM appointments WHERE patient_id IN (SELECT id FROM patients WHERE contact = ANY(%s))",
                (demo_contacts,),
            )
            cursor.execute(
                "DELETE FROM bills WHERE patient_id IN (SELECT id FROM patients WHERE contact = ANY(%s))",
                (demo_contacts,),
            )
            cursor.execute(
                "DELETE FROM vitals WHERE patient_id IN (SELECT id FROM patients WHERE contact = ANY(%s))",
                (demo_contacts,),
            )
            cursor.execute(
                "UPDATE beds SET patient_id = NULL, status = 'Available' WHERE patient_id IN (SELECT id FROM patients WHERE contact = ANY(%s))",
                (demo_contacts,),
            )
            conn.commit()

        # ── Medicines (100+ unique tablet names, deduplicated each seed run) ─
        tablet_catalog = [
            ("Amlodipine", "Cardiology - Hypertension", [2.5, 5, 10, 20]),
            ("Telmisartan", "Cardiology - Hypertension", [20, 40, 80, 120]),
            ("Losartan", "Cardiology - Hypertension", [25, 50, 75, 100]),
            ("Metoprolol", "Cardiology - Rate Control", [12.5, 25, 50, 100]),
            ("Bisoprolol", "Cardiology - Rate Control", [1.25, 2.5, 5, 10]),
            ("Atorvastatin", "Cardiology - Lipid Control", [10, 20, 40, 80]),
            ("Rosuvastatin", "Cardiology - Lipid Control", [5, 10, 20, 40]),
            ("Aspirin", "Cardiology - Antiplatelet", [75, 100, 150, 325]),
            ("Clopidogrel", "Cardiology - Antiplatelet", [75, 150, 300, 450]),
            ("Furosemide", "Cardiology - Diuretic", [20, 40, 60, 80]),
            ("Metformin", "Endocrinology - Diabetes", [250, 500, 750, 1000]),
            ("Glimepiride", "Endocrinology - Diabetes", [1, 2, 3, 4]),
            ("Sitagliptin", "Endocrinology - Diabetes", [25, 50, 75, 100]),
            ("Vildagliptin", "Endocrinology - Diabetes", [25, 50, 75, 100]),
            ("Empagliflozin", "Endocrinology - Diabetes", [10, 12.5, 20, 25]),
            ("Paracetamol", "Emergency - Fever/Pain", [325, 500, 650, 1000]),
            ("Ibuprofen", "Emergency - Pain/Inflammation", [200, 400, 600, 800]),
            ("Diclofenac", "Emergency - Pain/Inflammation", [25, 50, 75, 100]),
            ("Aceclofenac", "Emergency - Pain/Inflammation", [50, 100, 150, 200]),
            ("Tramadol", "Emergency - Severe Pain", [25, 50, 75, 100]),
            ("Pantoprazole", "Gastroenterology - Gastric Protection", [20, 40, 60, 80]),
            ("Rabeprazole", "Gastroenterology - Gastric Protection", [10, 20, 30, 40]),
            ("Omeprazole", "Gastroenterology - Gastric Protection", [10, 20, 40, 60]),
            ("Ondansetron", "Emergency - Antiemetic", [4, 8, 12, 16]),
            ("Domperidone", "Gastroenterology - Antiemetic", [5, 10, 15, 20]),
            ("Amoxicillin", "Infectious Disease - Antibiotic", [250, 500, 625, 875]),
            ("Azithromycin", "Infectious Disease - Antibiotic", [250, 500, 750, 1000]),
            ("Doxycycline", "Infectious Disease - Antibiotic", [50, 100, 150, 200]),
            ("Cefixime", "Infectious Disease - Antibiotic", [100, 200, 300, 400]),
            ("Levofloxacin", "Infectious Disease - Antibiotic", [250, 500, 750, 1000]),
            ("Montelukast", "Pulmonology - Allergy/Asthma", [4, 5, 10, 20]),
            ("Levocetirizine", "Pulmonology - Allergy/Asthma", [2.5, 5, 10, 20]),
        ]

        medicines_data = []
        for family_idx, (base_name, category, strengths) in enumerate(tablet_catalog):
            for strength_idx, strength in enumerate(strengths):
                strength_label = f"{strength:g}mg"
                name = f"{base_name} {strength_label}"
                stock = 80 + ((family_idx * 47 + strength_idx * 29) % 950)
                price = round(2.0 + ((family_idx * 1.7 + strength_idx * 0.8) % 48), 2)
                expiry_date = f"20{28 + ((family_idx + strength_idx) % 2)}-{((family_idx + 2) % 12) + 1:02d}-{((strength_idx * 7 + family_idx) % 28) + 1:02d}"
                status = "In Stock" if stock > 20 else ("Low Stock" if stock > 0 else "Out of Stock")
                medicines_data.append((name, category, stock, "Tablets", price, expiry_date, status))

        # Force a few realistic critical items
        critical_overrides = {
            "Ibuprofen 400mg": 0,
            "Insulin Glargine 100mg": 12,
            "Paracetamol 650mg": 18,
        }
        medicines_data.append(("Insulin Glargine 100mg", "Endocrinology - Diabetes", 12, "Tablets", 45.00, "2028-08-20", "Low Stock"))

        normalized = []
        seen_names = set()
        for row in medicines_data:
            if row[0] in seen_names:
                continue
            seen_names.add(row[0])
            if row[0] in critical_overrides:
                override_stock = critical_overrides[row[0]]
                override_status = "Out of Stock" if override_stock <= 0 else ("Low Stock" if override_stock <= 20 else "In Stock")
                normalized.append((row[0], row[1], override_stock, row[3], row[4], row[5], override_status))
            else:
                normalized.append(row)
        medicines_data = normalized

        # Clear existing medicines to remove duplicate-name rows from previous runs
        cursor.execute("DELETE FROM medicines")
        psycopg2.extras.execute_batch(
            cursor,
            """
            INSERT INTO medicines (name, category, stock, unit, price, expiry_date, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            medicines_data,
        )
        conn.commit()
        print(f"✓ Medicines seeded ({len(medicines_data)} unique names)")

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
        cursor.execute("SELECT id, full_name, department FROM users WHERE role = 'Doctor' ORDER BY id")
        doctor_rows = cursor.fetchall() or []

        if doctor_rows and demo_patient_rows:
            appt_types = ["General Checkup", "Follow-up", "Consultation", "General Checkup", "Follow-up"]
            appt_times = ["09:00", "10:00", "11:30", "14:00", "16:00"]
            appt_data = []
            for idx, patient_row in enumerate(demo_patient_rows):
                patient_id = patient_row[0]
                doctor_id, _, doctor_department = doctor_rows[idx % len(doctor_rows)]
                appt_data.append(
                    (
                        patient_id,
                        doctor_id,
                        doctor_department or "General Medicine",
                        f"2026-03-{10 + (idx % 20):02d}",
                        appt_times[idx % len(appt_times)],
                        appt_types[idx % len(appt_types)],
                        "Completed" if idx % 6 == 0 else "Scheduled",
                    )
                )

            psycopg2.extras.execute_batch(
                cursor,
                """
                INSERT INTO appointments (patient_id, doctor_id, department, appointment_date, appointment_time, type, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                appt_data,
            )
            conn.commit()
        print("✓ Appointments seeded")

        # ── Prescriptions (30 patients, multiple doctors) ───────
        medicine_templates = [
            [
                ("Aspirin 75mg", "1 tablet once daily after breakfast", 30),
                ("Amlodipine 5mg", "1 tablet once daily at night", 30),
                ("Atorvastatin 20mg", "1 tablet once daily after dinner", 30),
            ],
            [
                ("Metformin 500mg", "1 tablet twice daily after meals", 60),
                ("Sitagliptin 50mg", "1 tablet once daily", 30),
                ("Empagliflozin 10mg", "1 tablet once daily before breakfast", 30),
            ],
            [
                ("Losartan 50mg", "1 tablet once daily", 30),
                ("Paracetamol 500mg", "1 tablet once daily after meals", 10),
                ("Levocetirizine 5mg", "1 tablet once daily at bedtime", 15),
            ],
            [
                ("Paracetamol 650mg", "1 tablet every 8 hours as needed", 10),
                ("Pantoprazole 40mg", "1 tablet before breakfast", 7),
                ("Ondansetron 4mg", "1 tablet as needed", 6),
            ],
            [
                ("Montelukast 10mg", "1 tablet at night", 30),
                ("Levocetirizine 5mg", "1 tablet once daily", 20),
                ("Paracetamol 500mg", "1 tablet if fever persists", 10),
            ],
            [
                ("Amoxicillin 500mg", "1 tablet every 8 hours for 5 days", 15),
                ("Azithromycin 500mg", "1 tablet once daily for 3 days", 3),
                ("Pantoprazole 20mg", "1 tablet before breakfast", 5),
            ],
            [
                ("Telmisartan 40mg", "1 tablet once daily in the morning", 30),
                ("Clopidogrel 75mg", "1 tablet once daily after breakfast", 30),
                ("Rosuvastatin 10mg", "1 tablet once daily after dinner", 30),
            ],
            [
                ("Ibuprofen 400mg", "1 tablet every 12 hours after food", 10),
                ("Rabeprazole 20mg", "1 tablet before breakfast", 7),
                ("Domperidone 10mg", "1 tablet before meals as needed", 6),
            ],
        ]

        created_prescription_ids = []
        for idx, patient_row in enumerate(demo_patient_rows):
            patient_id = patient_row[0]
            primary_doctor_id = doctor_rows[idx % len(doctor_rows)][0]
            secondary_doctor_id = doctor_rows[(idx + 1) % len(doctor_rows)][0]

            for doc_offset, doctor_id in enumerate((primary_doctor_id, secondary_doctor_id)):
                cursor.execute(
                    """
                    INSERT INTO prescriptions (patient_id, doctor_id, date, time, status, priority)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (
                        patient_id,
                        doctor_id,
                        f"2026-03-{12 + ((idx + doc_offset) % 18):02d}",
                        ["09:15", "10:45", "12:00", "15:30", "18:10"][(idx + doc_offset) % 5],
                        "Dispensed" if (idx + doc_offset) % 3 == 0 else "Pending",
                        "Urgent" if (idx + doc_offset) % 7 == 0 else "Normal",
                    ),
                )
                created_prescription_ids.append((cursor.fetchone()[0], idx, doc_offset))

        for prescription_id, idx, doc_offset in created_prescription_ids:
            selected_template = medicine_templates[(idx + doc_offset) % len(medicine_templates)]
            for medicine_name, dosage, quantity in selected_template:
                cursor.execute(
                    """
                    INSERT INTO prescription_items (prescription_id, medicine_name, dosage, quantity)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (prescription_id, medicine_name, dosage, quantity),
                )
        conn.commit()
        print("✓ Prescriptions seeded")

        # ── Lab Tests ─────────────────────────────────────────────
        test_catalog = [
            ("Complete Blood Count", "Pathology"),
            ("Chest X-Ray", "Radiology"),
            ("Blood Glucose", "Biochemistry"),
            ("Urine Culture", "Microbiology"),
            ("Lipid Profile", "Biochemistry"),
            ("ECG", "Radiology"),
        ]
        lab_data = []
        for idx, patient_row in enumerate(demo_patient_rows):
            patient_id = patient_row[0]
            doctor_id = doctor_rows[(idx + 2) % len(doctor_rows)][0]
            test_name, test_department = test_catalog[idx % len(test_catalog)]
            lab_data.append(
                (
                    patient_id,
                    doctor_id,
                    test_name,
                    test_department,
                    f"2026-03-{10 + (idx % 20):02d}",
                    "Urgent" if idx % 8 == 0 else "Normal",
                    "Completed" if idx % 5 == 0 else ("In Progress" if idx % 4 == 0 else "Pending"),
                )
            )

        if lab_data:
            psycopg2.extras.execute_batch(
                cursor,
                """
                INSERT INTO lab_tests (patient_id, doctor_id, test_name, department, test_date, priority, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                lab_data,
            )
            conn.commit()
        print("✓ Lab tests seeded")

        # ── Bills ─────────────────────────────────────────────────
        bills_data = []
        for idx, patient_row in enumerate(demo_patient_rows):
            patient_id = patient_row[0]
            bills_data.append(
                (
                    patient_id,
                    f"2026-03-{1 + (idx % 25):02d}",
                    round(180.0 + (idx * 37.5), 2),
                    "Paid" if idx % 4 == 0 else ("Overdue" if idx % 9 == 0 else "Pending"),
                )
            )
        if bills_data:
            psycopg2.extras.execute_batch(
                cursor,
                "INSERT INTO bills (patient_id, date, amount, status) VALUES (%s, %s, %s, %s)",
                bills_data,
            )
            conn.commit()
        print("✓ Bills seeded")

        # ── Vitals ────────────────────────────────────────────────
        for idx, patient_row in enumerate(demo_patient_rows):
            patient_id = patient_row[0]
            systolic = 110 + (idx % 35)
            diastolic = 70 + (idx % 18)
            heart_rate = 68 + (idx % 26)
            temperature = 98.2 + ((idx % 6) * 0.2)
            spo2 = 95 + (idx % 5)
            cursor.execute(
                """
                INSERT INTO vitals (patient_id, bp, heart_rate, temperature, spo2)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (patient_id, f"{systolic}/{diastolic}", str(heart_rate), f"{temperature:.1f}", str(spo2)),
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
