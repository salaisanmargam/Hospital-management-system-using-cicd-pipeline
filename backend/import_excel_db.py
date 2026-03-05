"""
import_excel_db.py – Import HMS_Data_Base.xlsx into the Neon PostgreSQL database.

Reads all sheets (Patient, Doctor, Nurse, Receptionist, Lab Technician, Pharmacist)
and inserts/updates records in the users, staff, and patients tables.

Usage (from the backend/ directory):
    python import_excel_db.py

Or from the project root:
    python backend/import_excel_db.py
"""

import os
import sys
from pathlib import Path

import psycopg2
import psycopg2.extras
import openpyxl
from dotenv import load_dotenv

# ── Resolve paths & load .env ─────────────────────────────────────────────────
_script_dir   = Path(__file__).resolve().parent
_project_root = _script_dir.parent

load_dotenv(_script_dir / ".env")
load_dotenv(_project_root / ".env", override=False)

sys.path.insert(0, str(_script_dir))
from app.auth import hash_password  # noqa: E402

# ── Config ────────────────────────────────────────────────────────────────────
EXCEL_PATH     = _project_root / "HMS_Data_Base.xlsx"
DEFAULT_PW     = "Medcore@123"

ROLE_COLORS = {
    "Doctor":         "3B82F6",
    "Nurse":          "10B981",
    "Receptionist":   "F59E0B",
    "Lab Technician": "8B5CF6",
    "Pharmacist":     "EC4899",
    "Patient":        "6B7280",
}


def avatar(name: str, role: str) -> str:
    color  = ROLE_COLORS.get(role, "6B7280")
    encoded = "+".join(name.replace("Dr. ", "").split())
    return f"https://ui-avatars.com/api/?name={encoded}&background={color}&color=fff"


def normalise_shift(raw: str | None) -> str:
    """Map 'Morning Shift' / 'Morning' etc. to the DB-allowed values."""
    if not raw:
        return "Morning"
    r = str(raw).strip().lower()
    if "morning" in r:
        return "Morning"
    if "evening" in r:
        return "Evening"
    if "night" in r:
        return "Night"
    return "Morning"


def load_sheet(wb: openpyxl.Workbook, sheet_name: str) -> list[dict]:
    """
    Each sheet has one blank row, then a header row, then data rows.
    Returns a list of dicts keyed by header column names.
    """
    ws = wb[sheet_name]
    rows = list(ws.iter_rows(values_only=True))

    # Find the header row (first row that has at least 2 non-None cells)
    header_idx = None
    for i, row in enumerate(rows):
        non_null = [c for c in row if c is not None]
        if len(non_null) >= 2:
            header_idx = i
            break

    if header_idx is None:
        return []

    headers = [str(h).strip() if h is not None else f"col_{i}"
               for i, h in enumerate(rows[header_idx])]

    records = []
    for row in rows[header_idx + 1:]:
        if not any(v is not None for v in row):
            continue
        records.append(dict(zip(headers, row)))
    return records


# ── Main ──────────────────────────────────────────────────────────────────────

def run():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set in .env")

    if not EXCEL_PATH.exists():
        raise FileNotFoundError(f"Excel file not found at: {EXCEL_PATH}")

    print(f"📂 Loading workbook: {EXCEL_PATH.name}")
    wb = openpyxl.load_workbook(EXCEL_PATH)

    default_hash = hash_password(DEFAULT_PW)

    conn = psycopg2.connect(database_url)
    cur  = conn.cursor()

    # ── DOCTORS ───────────────────────────────────────────────────────────────
    doctors = load_sheet(wb, "Doctor")
    doctor_rows = []
    for d in doctors:
        name  = str(d.get("Name", "")).strip()
        email = str(d.get("Email", "")).strip().lower()
        phone = str(d.get("Phone No", "") or "").strip()
        dept  = str(d.get("Department", "") or "").strip()
        shift = normalise_shift(d.get("Working Shift"))
        bio   = str(d.get("Professional Bio", "") or "").strip()
        if not name or not email:
            continue
        doctor_rows.append((
            name, email, default_hash, "Doctor",
            dept, phone, "Active", shift, avatar(name, "Doctor"), bio, None
        ))

    psycopg2.extras.execute_batch(
        cur,
        """
        INSERT INTO users
            (full_name, email, password_hash, role, department, contact,
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
            bio              = EXCLUDED.bio
        """,
        doctor_rows,
    )

    # Staff table for doctors
    staff_doctor_rows = [
        (r[0], r[1], "Doctor", r[4], r[5], r[6], r[7], r[8])
        for r in doctor_rows
    ]
    psycopg2.extras.execute_batch(
        cur,
        """
        INSERT INTO staff
            (full_name, email, role, department, contact, status, shift, avatar_url)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (email) DO UPDATE SET
            full_name  = EXCLUDED.full_name,
            role       = EXCLUDED.role,
            department = EXCLUDED.department,
            contact    = EXCLUDED.contact,
            status     = EXCLUDED.status,
            shift      = EXCLUDED.shift,
            avatar_url = EXCLUDED.avatar_url
        """,
        staff_doctor_rows,
    )
    conn.commit()
    print(f"✓ Doctors   – {len(doctor_rows)} records inserted/updated")

    # ── NURSES ────────────────────────────────────────────────────────────────
    nurses = load_sheet(wb, "Nurse")
    nurse_rows = []
    for n in nurses:
        name  = str(n.get("Name", "")).strip()
        email = str(n.get("Email", "")).strip().lower()
        phone = str(n.get("Phone", "") or "").strip()
        dept  = str(n.get("Department", "") or "").strip()
        shift = normalise_shift(n.get("Shift"))
        bio   = str(n.get("Specialization / Notes", "") or "").strip()
        if not name or not email:
            continue
        nurse_rows.append((
            name, email, default_hash, "Nurse",
            dept, phone, "Active", shift, avatar(name, "Nurse"), bio, None
        ))

    psycopg2.extras.execute_batch(
        cur,
        """
        INSERT INTO users
            (full_name, email, password_hash, role, department, contact,
             status, shift, avatar_url, bio, consultation_fee)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (email) DO NOTHING
        """,
        nurse_rows,
    )

    staff_nurse_rows = [
        (r[0], r[1], "Nurse", r[4], r[5], r[6], r[7], r[8])
        for r in nurse_rows
    ]
    psycopg2.extras.execute_batch(
        cur,
        """
        INSERT INTO staff
            (full_name, email, role, department, contact, status, shift, avatar_url)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (email) DO NOTHING
        """,
        staff_nurse_rows,
    )
    conn.commit()
    print(f"✓ Nurses    – {len(nurse_rows)} records inserted/updated")

    # ── RECEPTIONISTS ─────────────────────────────────────────────────────────
    receptionists = load_sheet(wb, "Receptionist")
    recept_rows = []
    for r in receptionists:
        name  = str(r.get("Name", "")).strip()
        email = str(r.get("Email", "")).strip().lower()
        phone = str(r.get("Phone No", "") or "").strip()
        dept  = str(r.get("Department", "") or "").strip()
        shift = normalise_shift(r.get("Working Shift"))
        if not name or not email:
            continue
        recept_rows.append((
            name, email, default_hash, "Receptionist",
            dept, phone, "Active", shift, avatar(name, "Receptionist"), None, None
        ))

    psycopg2.extras.execute_batch(
        cur,
        """
        INSERT INTO users
            (full_name, email, password_hash, role, department, contact,
             status, shift, avatar_url, bio, consultation_fee)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (email) DO NOTHING
        """,
        recept_rows,
    )

    staff_recept_rows = [
        (r[0], r[1], "Receptionist", r[4], r[5], r[6], r[7], r[8])
        for r in recept_rows
    ]
    psycopg2.extras.execute_batch(
        cur,
        """
        INSERT INTO staff
            (full_name, email, role, department, contact, status, shift, avatar_url)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (email) DO NOTHING
        """,
        staff_recept_rows,
    )
    conn.commit()
    print(f"✓ Receptnst – {len(recept_rows)} records inserted/updated")

    # ── LAB TECHNICIANS ───────────────────────────────────────────────────────
    lab_techs = load_sheet(wb, "Lab Technician")
    lt_rows = []
    for lt in lab_techs:
        name  = str(lt.get("Name", "")).strip()
        email = str(lt.get("Email", "")).strip().lower()
        phone = str(lt.get("Phone No", "") or "").strip()
        dept  = str(lt.get("Department", "") or "").strip()
        shift = normalise_shift(lt.get("Working Shift"))
        bio   = str(lt.get("Certification / Notes", "") or "").strip()
        if not name or not email:
            continue
        lt_rows.append((
            name, email, default_hash, "Lab Technician",
            dept, phone, "Active", shift, avatar(name, "Lab Technician"), bio, None
        ))

    psycopg2.extras.execute_batch(
        cur,
        """
        INSERT INTO users
            (full_name, email, password_hash, role, department, contact,
             status, shift, avatar_url, bio, consultation_fee)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (email) DO NOTHING
        """,
        lt_rows,
    )

    staff_lt_rows = [
        (r[0], r[1], "Lab Technician", r[4], r[5], r[6], r[7], r[8])
        for r in lt_rows
    ]
    psycopg2.extras.execute_batch(
        cur,
        """
        INSERT INTO staff
            (full_name, email, role, department, contact, status, shift, avatar_url)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (email) DO NOTHING
        """,
        staff_lt_rows,
    )
    conn.commit()
    print(f"✓ Lab Techs – {len(lt_rows)} records inserted/updated")

    # ── PHARMACISTS ───────────────────────────────────────────────────────────
    pharmacists = load_sheet(wb, "Pharmacist")
    ph_rows = []
    for ph in pharmacists:
        name  = str(ph.get("Name", "")).strip()
        email = str(ph.get("Email", "")).strip().lower()
        phone = str(ph.get("Phone No", "") or "").strip()
        dept  = str(ph.get("Department", "") or "").strip()
        shift = normalise_shift(ph.get("Working Shift"))
        if not name or not email:
            continue
        ph_rows.append((
            name, email, default_hash, "Pharmacist",
            dept, phone, "Active", shift, avatar(name, "Pharmacist"), None, None
        ))

    psycopg2.extras.execute_batch(
        cur,
        """
        INSERT INTO users
            (full_name, email, password_hash, role, department, contact,
             status, shift, avatar_url, bio, consultation_fee)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (email) DO NOTHING
        """,
        ph_rows,
    )

    staff_ph_rows = [
        (r[0], r[1], "Pharmacist", r[4], r[5], r[6], r[7], r[8])
        for r in ph_rows
    ]
    psycopg2.extras.execute_batch(
        cur,
        """
        INSERT INTO staff
            (full_name, email, role, department, contact, status, shift, avatar_url)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (email) DO NOTHING
        """,
        staff_ph_rows,
    )
    conn.commit()
    print(f"✓ Pharmacst – {len(ph_rows)} records inserted/updated")

    # ── PATIENTS ──────────────────────────────────────────────────────────────
    patients = load_sheet(wb, "Patient")

    inserted_patients  = 0
    linked_patients    = 0
    skipped_patients   = 0

    for p in patients:
        name  = str(p.get("Patient Name", "")).strip()
        email = str(p.get("Email ID", "")).strip().lower()
        if not name or not email:
            continue

        # 1. Try to create a Patient user account (skip if email already belongs to staff)
        cur.execute("SELECT id, role FROM users WHERE email = %s", (email,))
        existing = cur.fetchone()

        if existing is None:
            # New email – create a Patient user
            cur.execute(
                """
                INSERT INTO users
                    (full_name, email, password_hash, role, status, avatar_url)
                VALUES (%s, %s, %s, 'Patient', 'Active', %s)
                RETURNING id
                """,
                (name, email, default_hash, avatar(name, "Patient")),
            )
            user_id = cur.fetchone()[0]
            inserted_patients += 1
        else:
            # Email already used by a staff member – just link to their user id
            user_id = existing[0]
            linked_patients += 1

        # 2. Create the patient clinical record (link via user_id; skip if already exists)
        cur.execute("SELECT id FROM patients WHERE user_id = %s", (user_id,))
        if cur.fetchone() is None:
            cur.execute(
                """
                INSERT INTO patients (full_name, user_id)
                VALUES (%s, %s)
                """,
                (name, user_id),
            )
        else:
            skipped_patients += 1

    conn.commit()
    print(
        f"✓ Patients  – {inserted_patients} new users, "
        f"{linked_patients} linked to existing staff accounts, "
        f"{skipped_patients} already in DB"
    )

    cur.close()
    conn.close()

    print("\n✅ Excel data fully imported into Neon DB.")
    print(f"\n🔑 Default password for ALL imported accounts: {DEFAULT_PW}")
    print("   (Doctors use their email, e.g. arvindkumar@gmail.com)")


if __name__ == "__main__":
    run()
