import json
from datetime import date, timedelta
from decimal import Decimal
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from reportlab.lib import colors  # pyright: ignore[reportMissingImports]
from reportlab.lib.pagesizes import A4  # pyright: ignore[reportMissingImports]
from reportlab.pdfgen import canvas  # pyright: ignore[reportMissingImports]

from ..auth import get_current_user
from ..db import dict_cursor, get_conn

router = APIRouter(prefix="/bills", tags=["bills"])

PAYMENT_METHODS = {"Cash", "Card", "UPI", "NetBanking", "Insurance", "Other"}
LAB_DEPARTMENT_BASE_RATES = {
    "Pathology": 450.0,
    "Radiology": 1500.0,
    "Microbiology": 700.0,
    "Biochemistry": 550.0,
}


def _to_float(value) -> float:
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def _to_iso(value):
    if value is None:
        return None
    return value.isoformat()


def _status_priority(status: str) -> int:
    if status == "Overdue":
        return 0
    if status == "Pending":
        return 1
    return 2


def _build_consolidated_bills(cursor, patient_ids=None, include_zero_amounts: bool = True):
    params = []
    where_clause = ""
    if patient_ids is not None:
        where_clause = "WHERE p.id = ANY(%s)"
        params.append(patient_ids)

    cursor.execute(
        f"""
        WITH target_patients AS (
            SELECT p.id, p.full_name
            FROM patients p
            {where_clause}
        ),
        appointment_totals AS (
            SELECT
                a.patient_id,
                COALESCE(SUM(COALESCE(d.consultation_fee, 0)), 0) AS appointment_amount,
                MAX(a.appointment_date) AS last_appointment_date
            FROM appointments a
            LEFT JOIN users d ON d.id = a.doctor_id
            WHERE a.status <> 'Cancelled'
            GROUP BY a.patient_id
        ),
        medicine_totals AS (
            SELECT
                pr.patient_id,
                COALESCE(SUM(COALESCE(pi.quantity, 0) * COALESCE(m.price, 0)), 0) AS medicine_amount,
                MAX(pr.date) AS last_prescription_date
            FROM prescriptions pr
            JOIN prescription_items pi ON pi.prescription_id = pr.id
            LEFT JOIN medicines m ON LOWER(m.name) = LOWER(pi.medicine_name)
            WHERE pr.status IN ('Pending', 'Dispensed')
            GROUP BY pr.patient_id
        ),
        nurse_medication_totals AS (
            SELECT
                nma.patient_id,
                COALESCE(SUM(COALESCE(nma.quantity, 0) * COALESCE(nma.unit_price, 0)), 0) AS nurse_medication_amount,
                COUNT(*) AS nurse_medication_orders,
                MAX(nma.administered_at::date) AS last_nurse_order_date
            FROM nurse_medication_administrations nma
            GROUP BY nma.patient_id
        ),
        lab_totals AS (
            SELECT
                lt.patient_id,
                COALESCE(
                    SUM(
                        CASE
                            WHEN lt.department = 'Radiology' THEN 1500
                            WHEN lt.department = 'Microbiology' THEN 700
                            WHEN lt.department = 'Biochemistry' THEN 550
                            ELSE 450
                        END
                        + CASE WHEN lt.priority = 'Urgent' THEN 250 ELSE 0 END
                    ),
                    0
                ) AS lab_amount,
                MAX(lt.test_date) AS last_lab_date
            FROM lab_tests lt
            WHERE lt.status IN ('In Progress', 'Completed')
            GROUP BY lt.patient_id
        ),
        bed_stay_totals AS (
            SELECT
                bs.patient_id,
                COALESCE(
                    SUM(
                        GREATEST(
                            1,
                            CEIL(
                                EXTRACT(
                                    EPOCH FROM (COALESCE(bs.discharged_at, NOW()) - bs.admitted_at)
                                ) / 86400.0
                            )
                        ) * COALESCE(bs.daily_rate, 0)
                    ),
                    0
                ) AS bed_amount,
                COALESCE(
                    SUM(
                        GREATEST(
                            1,
                            CEIL(
                                EXTRACT(
                                    EPOCH FROM (COALESCE(bs.discharged_at, NOW()) - bs.admitted_at)
                                ) / 86400.0
                            )
                        )
                    ),
                    0
                ) AS bed_days,
                MAX(COALESCE(bs.discharged_at, NOW())::date) AS last_bed_date
            FROM bed_stays bs
            GROUP BY bs.patient_id
        ),
        payment_totals AS (
            SELECT
                bp.patient_id,
                COALESCE(SUM(COALESCE(bp.amount, 0)), 0) AS paid_amount,
                MAX(bp.paid_at::date) AS last_payment_date
            FROM bill_payments bp
            GROUP BY bp.patient_id
        ),
        latest_manual_bills AS (
            SELECT DISTINCT ON (b.patient_id)
                b.patient_id,
                COALESCE(b.amount, 0) AS manual_amount,
                b.date AS manual_date
            FROM bills b
            ORDER BY b.patient_id, b.date DESC NULLS LAST, b.id DESC
        )
        SELECT
            tp.id,
            tp.id AS patient_id,
            tp.full_name AS patient_name,
            COALESCE(
                GREATEST(
                    at.last_appointment_date,
                    mt.last_prescription_date,
                    nmt.last_nurse_order_date,
                    lt.last_lab_date,
                    bst.last_bed_date,
                    lmb.manual_date
                ),
                lmb.manual_date,
                CURRENT_DATE
            ) AS date,
            (
                COALESCE(
                    GREATEST(
                        at.last_appointment_date,
                        mt.last_prescription_date,
                        nmt.last_nurse_order_date,
                        lt.last_lab_date,
                        bst.last_bed_date,
                        lmb.manual_date
                    ),
                    lmb.manual_date,
                    CURRENT_DATE
                ) + INTERVAL '7 days'
            )::date AS due_date,
            COALESCE(at.appointment_amount, 0) AS appointment_amount,
            COALESCE(nmt.nurse_medication_amount, 0) AS nurse_medication_amount,
            COALESCE(lt.lab_amount, 0) AS lab_amount,
            COALESCE(bst.bed_amount, 0) AS bed_amount,
            COALESCE(mt.medicine_amount, 0) AS medicine_amount,
            COALESCE(nmt.nurse_medication_orders, 0) AS nurse_medication_orders,
            COALESCE(bst.bed_days, 0) AS bed_days,
            GREATEST(
                COALESCE(at.appointment_amount, 0)
                + COALESCE(nmt.nurse_medication_amount, 0)
                + COALESCE(lt.lab_amount, 0)
                + COALESCE(bst.bed_amount, 0)
                + COALESCE(mt.medicine_amount, 0),
                COALESCE(lmb.manual_amount, 0)
            ) AS amount,
            COALESCE(pt.paid_amount, 0) AS paid_amount
        FROM target_patients tp
        LEFT JOIN appointment_totals at ON at.patient_id = tp.id
        LEFT JOIN medicine_totals mt ON mt.patient_id = tp.id
        LEFT JOIN nurse_medication_totals nmt ON nmt.patient_id = tp.id
        LEFT JOIN lab_totals lt ON lt.patient_id = tp.id
        LEFT JOIN bed_stay_totals bst ON bst.patient_id = tp.id
        LEFT JOIN payment_totals pt ON pt.patient_id = tp.id
        LEFT JOIN latest_manual_bills lmb ON lmb.patient_id = tp.id
        """,
        tuple(params),
    )

    rows = cursor.fetchall() or []
    normalized = []
    today = date.today()
    for row in rows:
        total_amount = _to_float(row.get("amount"))
        if not include_zero_amounts and total_amount <= 0:
            continue

        paid_amount = _to_float(row.get("paid_amount"))
        balance_amount = max(total_amount - paid_amount, 0.0)

        due_date_raw = row.get("due_date")
        status = "Paid"
        if balance_amount > 0:
            status = "Overdue" if due_date_raw is not None and due_date_raw < today else "Pending"

        normalized.append(
            {
                "id": str(row.get("id")),
                "patient_id": str(row.get("patient_id")),
                "patient_name": row.get("patient_name"),
                "date": _to_iso(row.get("date")),
                "due_date": _to_iso(due_date_raw),
                "status": status,
                "appointment_amount": _to_float(row.get("appointment_amount")),
                "nurse_medication_amount": _to_float(row.get("nurse_medication_amount")),
                "lab_amount": _to_float(row.get("lab_amount")),
                "bed_amount": _to_float(row.get("bed_amount")),
                "medicine_amount": _to_float(row.get("medicine_amount")),
                "nurse_medication_orders": int(row.get("nurse_medication_orders") or 0),
                "bed_days": int(_to_float(row.get("bed_days"))),
                "amount": total_amount,
                "paid_amount": paid_amount,
                "balance_amount": balance_amount,
            }
        )

    normalized.sort(
        key=lambda item: (
            _status_priority(item["status"]),
            item["due_date"] or "9999-12-31",
            -(item["amount"] - item["paid_amount"]),
            item["patient_name"] or "",
        )
    )

    return normalized


def _authorized_patient_ids(cursor, user, patient_id: int | None):
    role = user.get("role", "")
    if role != "Patient":
        return [patient_id] if patient_id is not None else None

    cursor.execute("SELECT id FROM patients WHERE user_id = %s", (user["id"],))
    own_patient_ids = [row["id"] for row in (cursor.fetchall() or [])]
    if not own_patient_ids:
        return []

    if patient_id is not None and patient_id not in own_patient_ids:
        raise HTTPException(status_code=403, detail="You can only access your own bill")

    return [patient_id] if patient_id is not None else own_patient_ids


def _collect_bill_details(cursor, patient_id: int):
    bill_rows = _build_consolidated_bills(cursor, [patient_id])
    if not bill_rows:
        raise HTTPException(status_code=404, detail="Patient bill not found")
    bill_summary = bill_rows[0]

    cursor.execute(
        """
        SELECT a.id, a.appointment_date, a.appointment_time, a.type, a.status,
               u.full_name AS doctor_name, COALESCE(u.consultation_fee, 0) AS amount
        FROM appointments a
        LEFT JOIN users u ON u.id = a.doctor_id
        WHERE a.patient_id = %s AND a.status <> 'Cancelled'
        ORDER BY a.appointment_date DESC, a.id DESC
        """,
        (patient_id,),
    )
    appointments = cursor.fetchall() or []

    cursor.execute(
        """
        SELECT nma.id, nma.administered_at, nma.quantity, nma.unit_price,
               (COALESCE(nma.quantity, 0) * COALESCE(nma.unit_price, 0)) AS line_total,
               m.name AS medicine_name,
               u.full_name AS administered_by_name,
               no.id AS nurse_order_id
        FROM nurse_medication_administrations nma
        LEFT JOIN medicines m ON m.id = nma.medicine_id
        LEFT JOIN users u ON u.id = nma.administered_by
        LEFT JOIN nurse_orders no ON no.id = nma.nurse_order_id
        WHERE nma.patient_id = %s
        ORDER BY nma.administered_at DESC, nma.id DESC
        """,
        (patient_id,),
    )
    nurse_medications = cursor.fetchall() or []

    cursor.execute(
        """
        SELECT bs.id, bs.admitted_at, bs.discharged_at, bs.daily_rate,
               b.ward, b.bed_number,
               GREATEST(
                   1,
                   CEIL(
                       EXTRACT(EPOCH FROM (COALESCE(bs.discharged_at, NOW()) - bs.admitted_at)) / 86400.0
                   )
               ) AS days,
               (
                   GREATEST(
                       1,
                       CEIL(
                           EXTRACT(EPOCH FROM (COALESCE(bs.discharged_at, NOW()) - bs.admitted_at)) / 86400.0
                       )
                   ) * COALESCE(bs.daily_rate, 0)
               ) AS line_total
        FROM bed_stays bs
        LEFT JOIN beds b ON b.id = bs.bed_id
        WHERE bs.patient_id = %s
        ORDER BY bs.admitted_at DESC, bs.id DESC
        """,
        (patient_id,),
    )
    bed_stays = cursor.fetchall() or []

    cursor.execute(
        """
        SELECT pr.id AS prescription_id, pr.date, pr.status,
               pi.id AS item_id, pi.medicine_name, pi.dosage, pi.quantity,
               COALESCE(m.price, 0) AS unit_price,
               (COALESCE(pi.quantity, 0) * COALESCE(m.price, 0)) AS line_total
        FROM prescriptions pr
        JOIN prescription_items pi ON pi.prescription_id = pr.id
        LEFT JOIN medicines m ON LOWER(m.name) = LOWER(pi.medicine_name)
        WHERE pr.patient_id = %s
        ORDER BY pr.date DESC, pr.id DESC, pi.id DESC
        """,
        (patient_id,),
    )
    medicine_items = cursor.fetchall() or []

    cursor.execute(
        """
        SELECT
            lt.id,
            lt.test_date,
            lt.test_name,
            lt.department,
            lt.priority,
            lt.status,
            (
                CASE
                    WHEN lt.department = 'Radiology' THEN 1500
                    WHEN lt.department = 'Microbiology' THEN 700
                    WHEN lt.department = 'Biochemistry' THEN 550
                    ELSE 450
                END
                + CASE WHEN lt.priority = 'Urgent' THEN 250 ELSE 0 END
            ) AS line_total
        FROM lab_tests lt
        WHERE lt.patient_id = %s AND lt.status IN ('In Progress', 'Completed')
        ORDER BY lt.test_date DESC, lt.id DESC
        """,
        (patient_id,),
    )
    lab_tests = cursor.fetchall() or []

    cursor.execute(
        """
        SELECT bp.id, bp.amount, bp.paid_at, bp.method, bp.notes, u.full_name AS received_by_name
        FROM bill_payments bp
        LEFT JOIN users u ON u.id = bp.received_by
        WHERE bp.patient_id = %s
        ORDER BY bp.paid_at DESC, bp.id DESC
        """,
        (patient_id,),
    )
    payments = cursor.fetchall() or []

    for row in appointments:
        row["appointment_date"] = _to_iso(row.get("appointment_date"))
        row["amount"] = _to_float(row.get("amount"))

    for row in nurse_medications:
        row["administered_at"] = _to_iso(row.get("administered_at"))
        row["quantity"] = _to_float(row.get("quantity"))
        row["unit_price"] = _to_float(row.get("unit_price"))
        row["line_total"] = _to_float(row.get("line_total"))

    for row in bed_stays:
        row["admitted_at"] = _to_iso(row.get("admitted_at"))
        row["discharged_at"] = _to_iso(row.get("discharged_at"))
        row["daily_rate"] = _to_float(row.get("daily_rate"))
        row["days"] = int(_to_float(row.get("days")))
        row["line_total"] = _to_float(row.get("line_total"))

    for row in medicine_items:
        row["date"] = _to_iso(row.get("date"))
        row["unit_price"] = _to_float(row.get("unit_price"))
        row["line_total"] = _to_float(row.get("line_total"))

    for row in lab_tests:
        row["test_date"] = _to_iso(row.get("test_date"))
        row["line_total"] = _to_float(row.get("line_total"))

    for row in payments:
        row["paid_at"] = _to_iso(row.get("paid_at"))
        row["amount"] = _to_float(row.get("amount"))

    return {
        "summary": bill_summary,
        "appointments": appointments,
        "nurse_medications": nurse_medications,
        "bed_stays": bed_stays,
        "medicine_items": medicine_items,
        "lab_tests": lab_tests,
        "payments": payments,
    }


def _ensure_billing_workflow_tables(cursor):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS billing_contributions (
            id SERIAL PRIMARY KEY,
            patient_id INT NOT NULL,
            source_role VARCHAR(30) NOT NULL,
            source_module VARCHAR(30) NOT NULL,
            source_id VARCHAR(50) NOT NULL,
            description TEXT NOT NULL,
            amount DECIMAL(10,2) NOT NULL DEFAULT 0,
            event_date DATE,
            submitted_by INT,
            submitted_at TIMESTAMPTZ DEFAULT NOW(),
            status VARCHAR(20) DEFAULT 'Submitted'
                CHECK (status IN ('Submitted','Accepted','Rejected')),
            UNIQUE (source_module, source_id),
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS finalized_bills (
            id SERIAL PRIMARY KEY,
            patient_id INT NOT NULL,
            generated_by INT,
            generated_at TIMESTAMPTZ DEFAULT NOW(),
            due_date DATE,
            total_amount DECIMAL(10,2) NOT NULL,
            paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
            balance_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
            status VARCHAR(20) NOT NULL
                CHECK (status IN ('Paid','Pending','Overdue')),
            snapshot_json JSONB,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
        )
        """
    )


def _sync_patient_contributions(cursor, patient_id: int):
    _ensure_billing_workflow_tables(cursor)

    cursor.execute(
        """
        INSERT INTO billing_contributions (patient_id, source_role, source_module, source_id, description, amount, event_date, submitted_by, status)
        SELECT
            a.patient_id,
            'Doctor',
            'appointments',
            a.id::text,
            CONCAT('Doctor consultation - ', COALESCE(u.full_name, 'Doctor')),
            COALESCE(u.consultation_fee, 0),
            a.appointment_date,
            a.doctor_id,
            'Submitted'
        FROM appointments a
        LEFT JOIN users u ON u.id = a.doctor_id
        WHERE a.patient_id = %s
          AND a.status <> 'Cancelled'
        ON CONFLICT (source_module, source_id)
        DO UPDATE SET
            amount = EXCLUDED.amount,
            description = EXCLUDED.description,
            event_date = EXCLUDED.event_date,
            submitted_by = EXCLUDED.submitted_by,
            submitted_at = NOW(),
            status = 'Submitted'
        """,
        (patient_id,),
    )

    cursor.execute(
        """
        INSERT INTO billing_contributions (patient_id, source_role, source_module, source_id, description, amount, event_date, submitted_by, status)
        SELECT
            pr.patient_id,
            'Pharmacist',
            'pharmacy',
            pr.id::text,
            CONCAT('Prescription medicines - Rx #', pr.id::text),
            COALESCE(SUM(COALESCE(pi.quantity, 0) * COALESCE(m.price, 0)), 0),
            pr.date,
            NULL,
            'Submitted'
        FROM prescriptions pr
        JOIN prescription_items pi ON pi.prescription_id = pr.id
        LEFT JOIN medicines m ON LOWER(m.name) = LOWER(pi.medicine_name)
        WHERE pr.patient_id = %s
        GROUP BY pr.patient_id, pr.id, pr.date
        ON CONFLICT (source_module, source_id)
        DO UPDATE SET
            amount = EXCLUDED.amount,
            description = EXCLUDED.description,
            event_date = EXCLUDED.event_date,
            submitted_at = NOW(),
            status = 'Submitted'
        """,
        (patient_id,),
    )

    cursor.execute(
        """
        INSERT INTO billing_contributions (patient_id, source_role, source_module, source_id, description, amount, event_date, submitted_by, status)
        SELECT
            lt.patient_id,
            'Lab Technician',
            'laboratory',
            lt.id::text,
            CONCAT('Lab test - ', COALESCE(lt.test_name, 'Test'), ' (', COALESCE(lt.department, 'General'), ')'),
            (
                CASE
                    WHEN lt.department = 'Radiology' THEN 1500
                    WHEN lt.department = 'Microbiology' THEN 700
                    WHEN lt.department = 'Biochemistry' THEN 550
                    ELSE 450
                END
                + CASE WHEN lt.priority = 'Urgent' THEN 250 ELSE 0 END
            ),
            lt.test_date,
            lt.doctor_id,
            'Submitted'
        FROM lab_tests lt
        WHERE lt.patient_id = %s
          AND lt.status IN ('In Progress', 'Completed')
        ON CONFLICT (source_module, source_id)
        DO UPDATE SET
            amount = EXCLUDED.amount,
            description = EXCLUDED.description,
            event_date = EXCLUDED.event_date,
            submitted_by = EXCLUDED.submitted_by,
            submitted_at = NOW(),
            status = 'Submitted'
        """,
        (patient_id,),
    )

    cursor.execute(
        """
        INSERT INTO billing_contributions (patient_id, source_role, source_module, source_id, description, amount, event_date, submitted_by, status)
        SELECT
            nma.patient_id,
            'Nurse',
            'nurse-medications',
            nma.id::text,
            CONCAT('Nurse-administered medicine - ', COALESCE(m.name, 'Medicine')),
            COALESCE(nma.quantity, 0) * COALESCE(nma.unit_price, 0),
            nma.administered_at::date,
            nma.administered_by,
            'Submitted'
        FROM nurse_medication_administrations nma
        LEFT JOIN medicines m ON m.id = nma.medicine_id
        WHERE nma.patient_id = %s
        ON CONFLICT (source_module, source_id)
        DO UPDATE SET
            amount = EXCLUDED.amount,
            description = EXCLUDED.description,
            event_date = EXCLUDED.event_date,
            submitted_by = EXCLUDED.submitted_by,
            submitted_at = NOW(),
            status = 'Submitted'
        """,
        (patient_id,),
    )

    cursor.execute(
        """
        INSERT INTO billing_contributions (patient_id, source_role, source_module, source_id, description, amount, event_date, submitted_by, status)
        SELECT
            bs.patient_id,
            'Ward',
            'bed-stay',
            bs.id::text,
            CONCAT('Bed stay - ', COALESCE(b.ward, 'Ward'), ' / Bed ', COALESCE(b.bed_number, '-')),
            GREATEST(
                1,
                CEIL(
                    EXTRACT(EPOCH FROM (COALESCE(bs.discharged_at, NOW()) - bs.admitted_at)) / 86400.0
                )
            ) * COALESCE(bs.daily_rate, 0),
            bs.admitted_at::date,
            bs.created_by,
            'Submitted'
        FROM bed_stays bs
        LEFT JOIN beds b ON b.id = bs.bed_id
        WHERE bs.patient_id = %s
        ON CONFLICT (source_module, source_id)
        DO UPDATE SET
            amount = EXCLUDED.amount,
            description = EXCLUDED.description,
            event_date = EXCLUDED.event_date,
            submitted_by = EXCLUDED.submitted_by,
            submitted_at = NOW(),
            status = 'Submitted'
        """,
        (patient_id,),
    )


@router.get("/")
def list_bills(
    patient_id: int | None = Query(default=None),
    conn=Depends(get_conn),
    user=Depends(get_current_user),
):
    cursor = dict_cursor(conn)
    scoped_patient_ids = _authorized_patient_ids(cursor, user, patient_id)
    if scoped_patient_ids == []:
        cursor.close()
        return []

    bills = _build_consolidated_bills(cursor, scoped_patient_ids, include_zero_amounts=False)
    cursor.close()
    return bills


@router.get("/{patient_id}/details")
def get_bill_details(patient_id: int, conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = dict_cursor(conn)
    _authorized_patient_ids(cursor, user, patient_id)
    details = _collect_bill_details(cursor, patient_id)
    cursor.close()
    return details


@router.get("/{patient_id}/contributions")
def get_billing_contributions(patient_id: int, conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = dict_cursor(conn)
    _authorized_patient_ids(cursor, user, patient_id)
    _sync_patient_contributions(cursor, patient_id)

    cursor.execute(
        """
        SELECT id, source_role, source_module, source_id, description, amount, event_date, status, submitted_at
        FROM billing_contributions
        WHERE patient_id = %s
        ORDER BY event_date DESC NULLS LAST, submitted_at DESC
        """,
        (patient_id,),
    )
    rows = cursor.fetchall() or []
    cursor.close()

    total = 0.0
    for row in rows:
        row["amount"] = _to_float(row.get("amount"))
        row["event_date"] = _to_iso(row.get("event_date"))
        row["submitted_at"] = _to_iso(row.get("submitted_at"))
        total += row["amount"]

    return {
        "patient_id": str(patient_id),
        "total_amount": total,
        "items": rows,
    }


@router.post("/{patient_id}/generate", status_code=status.HTTP_201_CREATED)
def generate_final_bill(patient_id: int, conn=Depends(get_conn), user=Depends(get_current_user)):
    role = user.get("role", "")
    if role not in ("Receptionist", "Admin"):
        raise HTTPException(status_code=403, detail="Only Receptionist/Admin can generate final bills")

    cursor = dict_cursor(conn)
    cursor.execute("SELECT id, full_name FROM patients WHERE id = %s", (patient_id,))
    patient = cursor.fetchone()
    if not patient:
        cursor.close()
        raise HTTPException(status_code=404, detail="Patient not found")

    _sync_patient_contributions(cursor, patient_id)

    cursor.execute(
        """
        SELECT source_role, source_module, source_id, description, amount, event_date
        FROM billing_contributions
        WHERE patient_id = %s AND status = 'Submitted'
        ORDER BY event_date ASC NULLS LAST, id ASC
        """,
        (patient_id,),
    )
    items = cursor.fetchall() or []

    total_amount = sum(_to_float(item.get("amount")) for item in items)

    cursor.execute("SELECT COALESCE(SUM(amount), 0) AS paid_amount FROM bill_payments WHERE patient_id = %s", (patient_id,))
    paid_amount = _to_float((cursor.fetchone() or {}).get("paid_amount"))
    balance_amount = max(total_amount - paid_amount, 0.0)
    due_date = date.today() + timedelta(days=7)
    status_value = "Paid" if balance_amount <= 0 else "Pending"

    snapshot = {
        "patient_id": patient_id,
        "patient_name": patient.get("full_name"),
        "generated_on": date.today().isoformat(),
        "items": [
            {
                "source_role": item.get("source_role"),
                "source_module": item.get("source_module"),
                "source_id": item.get("source_id"),
                "description": item.get("description"),
                "amount": _to_float(item.get("amount")),
                "event_date": _to_iso(item.get("event_date")),
            }
            for item in items
        ],
        "totals": {
            "total_amount": total_amount,
            "paid_amount": paid_amount,
            "balance_amount": balance_amount,
        },
    }

    _ensure_billing_workflow_tables(cursor)
    cursor.execute(
        """
        INSERT INTO finalized_bills (patient_id, generated_by, due_date, total_amount, paid_amount, balance_amount, status, snapshot_json)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb)
        RETURNING id, generated_at
        """,
        (
            patient_id,
            user["id"],
            due_date,
            total_amount,
            paid_amount,
            balance_amount,
            status_value,
            json.dumps(snapshot),
        ),
    )
    finalized = cursor.fetchone()

    cursor.execute(
        """
        INSERT INTO bills (patient_id, date, amount, status, created_by)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id
        """,
        (patient_id, date.today(), total_amount, status_value, user["id"]),
    )
    bill_row = cursor.fetchone()

    cursor.execute(
        "INSERT INTO audit_logs (action, user_id, user_role, details) VALUES (%s, %s, %s, %s)",
        (
            "Final bill generated",
            user["id"],
            role,
            f"Final bill #{finalized.get('id')} for patient {patient_id} created from {len(items)} contributions",
        ),
    )
    conn.commit()

    cursor.close()
    return {
        "id": finalized.get("id"),
        "bill_id": bill_row.get("id"),
        "patient_id": str(patient_id),
        "generated_at": _to_iso(finalized.get("generated_at")),
        "total_amount": total_amount,
        "paid_amount": paid_amount,
        "balance_amount": balance_amount,
        "status": status_value,
    }


@router.get("/{patient_id}/pdf")
def download_bill_pdf(patient_id: int, conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = dict_cursor(conn)
    _authorized_patient_ids(cursor, user, patient_id)
    details = _collect_bill_details(cursor, patient_id)
    cursor.close()

    summary = details["summary"]
    patient_name = summary.get("patient_name") or f"Patient-{patient_id}"
    invoice_no = f"INV-{summary.get('id', patient_id)}"

    pdf_buffer = BytesIO()
    pdf = canvas.Canvas(pdf_buffer, pagesize=A4)
    width, height = A4
    margin_x = 34
    content_width = width - (2 * margin_x)
    footer_h = 34
    y = height - 36

    def safe_text(value, fallback="-") -> str:
        text = str(value).strip() if value is not None else ""
        return text if text else fallback

    def truncate(value: str, max_len: int) -> str:
        return value if len(value) <= max_len else f"{value[: max_len - 3]}..."

    def money(value) -> str:
        return f"INR {_to_float(value):,.2f}"

    def draw_footer() -> None:
        pdf.setStrokeColor(colors.HexColor("#CBD5E1"))
        pdf.line(margin_x, footer_h + 6, width - margin_x, footer_h + 6)
        pdf.setFillColor(colors.HexColor("#64748B"))
        pdf.setFont("Helvetica", 8)
        pdf.drawString(margin_x, footer_h - 4, "This is a system-generated invoice from MedCore Hospital.")
        pdf.drawRightString(width - margin_x, footer_h - 4, f"Page {pdf.getPageNumber()}")

    def draw_header() -> None:
        nonlocal y
        header_h = 84
        pdf.setFillColor(colors.HexColor("#0E7490"))
        pdf.rect(0, height - header_h, width, header_h, stroke=0, fill=1)

        pdf.setFillColor(colors.white)
        pdf.setFont("Helvetica-Bold", 18)
        pdf.drawString(margin_x, height - 30, "MEDCORE HOSPITAL")
        pdf.setFont("Helvetica", 9)
        pdf.drawString(margin_x, height - 45, "24x7 Multispeciality Care Center")
        pdf.drawString(margin_x, height - 58, "City Health District | Phone: +91-555-0100")

        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawRightString(width - margin_x, height - 30, "PATIENT INVOICE")
        pdf.setFont("Helvetica", 9)
        pdf.drawRightString(width - margin_x, height - 44, f"Invoice No: {invoice_no}")
        pdf.drawRightString(width - margin_x, height - 57, f"Generated: {date.today().isoformat()}")

        y = height - header_h - 16

    def next_page() -> None:
        draw_footer()
        pdf.showPage()
        draw_header()

    def ensure_space(required_h: float) -> None:
        nonlocal y
        if y - required_h < footer_h + 14:
            next_page()

    def draw_info_box(top_y: float, left_title: str, left_value: str, right_title: str, right_value: str) -> None:
        box_h = 42
        pdf.setStrokeColor(colors.HexColor("#CBD5E1"))
        pdf.setFillColor(colors.HexColor("#F8FAFC"))
        pdf.roundRect(margin_x, top_y - box_h, content_width, box_h, 6, stroke=1, fill=1)

        left_x = margin_x + 12
        right_x = margin_x + (content_width / 2)

        pdf.setFillColor(colors.HexColor("#64748B"))
        pdf.setFont("Helvetica", 8)
        pdf.drawString(left_x, top_y - 15, left_title)
        pdf.drawString(right_x, top_y - 15, right_title)

        pdf.setFillColor(colors.HexColor("#0F172A"))
        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawString(left_x, top_y - 30, truncate(left_value, 34))
        pdf.drawString(right_x, top_y - 30, truncate(right_value, 30))

    def draw_table(section_title: str, headers: list[str], widths: list[float], rows: list[list[str]], right_aligned: set[int] | None = None):
        nonlocal y
        if right_aligned is None:
            right_aligned = set()

        ensure_space(34)
        pdf.setFillColor(colors.HexColor("#1E293B"))
        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawString(margin_x, y, section_title)
        y -= 8

        row_h = 20
        ensure_space(row_h + 4)
        pdf.setFillColor(colors.HexColor("#E2E8F0"))
        pdf.rect(margin_x, y - row_h, content_width, row_h, stroke=0, fill=1)
        pdf.setFillColor(colors.HexColor("#0F172A"))
        pdf.setFont("Helvetica-Bold", 9)

        current_x = margin_x
        for idx, header in enumerate(headers):
            col_left = current_x + 6
            col_right = current_x + widths[idx] - 6
            if idx in right_aligned:
                pdf.drawRightString(col_right, y - 13, header)
            else:
                pdf.drawString(col_left, y - 13, header)
            current_x += widths[idx]
        y -= row_h

        if not rows:
            ensure_space(row_h)
            pdf.setFont("Helvetica", 9)
            pdf.setFillColor(colors.HexColor("#64748B"))
            pdf.drawString(margin_x + 6, y - 13, "No records")
            pdf.setStrokeColor(colors.HexColor("#E2E8F0"))
            pdf.line(margin_x, y - row_h, margin_x + content_width, y - row_h)
            y -= row_h
            return

        for idx, row in enumerate(rows):
            ensure_space(row_h)
            if idx % 2 == 0:
                pdf.setFillColor(colors.HexColor("#F8FAFC"))
                pdf.rect(margin_x, y - row_h, content_width, row_h, stroke=0, fill=1)

            current_x = margin_x
            for col_idx, cell_value in enumerate(row):
                cell_text = safe_text(cell_value, "")
                max_len = max(int(widths[col_idx] / 5.5), 8)
                cell_text = truncate(cell_text, max_len)

                col_left = current_x + 6
                col_right = current_x + widths[col_idx] - 6
                pdf.setFillColor(colors.HexColor("#0F172A"))
                pdf.setFont("Helvetica", 8.8)
                if col_idx in right_aligned:
                    pdf.drawRightString(col_right, y - 13, cell_text)
                else:
                    pdf.drawString(col_left, y - 13, cell_text)
                current_x += widths[col_idx]

            pdf.setStrokeColor(colors.HexColor("#E2E8F0"))
            pdf.line(margin_x, y - row_h, margin_x + content_width, y - row_h)
            y -= row_h

    draw_header()

    ensure_space(46)
    draw_info_box(
        y,
        "Patient Name",
        safe_text(patient_name),
        "Invoice Status",
        safe_text(summary.get("status"), "Pending"),
    )
    y -= 54

    ensure_space(46)
    draw_info_box(
        y,
        "Invoice Date",
        safe_text(summary.get("date")),
        "Due Date",
        safe_text(summary.get("due_date")),
    )
    y -= 58

    summary_rows = [
        ["Doctor Appointments", money(summary.get("appointment_amount"))],
        [
            f"Nurse Administered Medicines ({int(summary.get('nurse_medication_orders') or 0)} events)",
            money(summary.get("nurse_medication_amount")),
        ],
        ["Laboratory Tests", money(summary.get("lab_amount"))],
        [
            f"Inpatient Bed Charges ({int(summary.get('bed_days') or 0)} days)",
            money(summary.get("bed_amount")),
        ],
        ["Pharmacy / Prescription Medicines", money(summary.get("medicine_amount"))],
    ]
    draw_table(
        "Charge Breakdown",
        ["Component", "Amount"],
        [content_width * 0.72, content_width * 0.28],
        summary_rows,
        right_aligned={1},
    )
    y -= 10

    service_rows: list[list[str]] = []
    for appt in details.get("appointments", []):
        service_rows.append(
            [
                safe_text(appt.get("appointment_date"))[:10],
                f"Appointment - {safe_text(appt.get('doctor_name'), 'Doctor')} ({safe_text(appt.get('type'))})",
                money(appt.get("amount")),
            ]
        )

    for item in details.get("nurse_medications", []):
        service_rows.append(
            [
                safe_text(item.get("administered_at"))[:10],
                f"Nurse Med - {safe_text(item.get('medicine_name'))} x {safe_text(item.get('quantity'))}",
                money(item.get("line_total")),
            ]
        )

    for stay in details.get("bed_stays", []):
        service_rows.append(
            [
                safe_text(stay.get("admitted_at"))[:10],
                f"Bed Stay - {safe_text(stay.get('ward'))} / Bed {safe_text(stay.get('bed_number'))} ({safe_text(stay.get('days'))} days)",
                money(stay.get("line_total")),
            ]
        )

    for med in details.get("medicine_items", []):
        service_rows.append(
            [
                safe_text(med.get("date"))[:10],
                f"Pharmacy - {safe_text(med.get('medicine_name'))} x {safe_text(med.get('quantity'))}",
                money(med.get("line_total")),
            ]
        )

    for test in details.get("lab_tests", []):
        service_rows.append(
            [
                safe_text(test.get("test_date"))[:10],
                f"Lab - {safe_text(test.get('test_name'))} ({safe_text(test.get('department'))})",
                money(test.get("line_total")),
            ]
        )

    draw_table(
        "Service Line Items",
        ["Date", "Description", "Amount"],
        [content_width * 0.16, content_width * 0.58, content_width * 0.26],
        service_rows,
        right_aligned={2},
    )
    y -= 10

    payment_rows = [
        [
            safe_text(p.get("paid_at"))[:10],
            safe_text(p.get("method")),
            safe_text(p.get("received_by_name"), "Front Desk"),
            money(p.get("amount")),
        ]
        for p in (details.get("payments") or [])
    ]
    draw_table(
        "Payment Ledger",
        ["Date", "Method", "Received By", "Amount"],
        [content_width * 0.17, content_width * 0.18, content_width * 0.39, content_width * 0.26],
        payment_rows,
        right_aligned={3},
    )
    y -= 8

    ensure_space(86)
    totals_w = content_width * 0.50
    totals_x = margin_x + content_width - totals_w
    totals_top = y

    pdf.setStrokeColor(colors.HexColor("#CBD5E1"))
    pdf.setFillColor(colors.HexColor("#F8FAFC"))
    pdf.roundRect(totals_x, totals_top - 78, totals_w, 78, 6, stroke=1, fill=1)

    pdf.setFont("Helvetica", 10)
    pdf.setFillColor(colors.HexColor("#334155"))
    pdf.drawString(totals_x + 10, totals_top - 17, "Gross Total")
    pdf.drawString(totals_x + 10, totals_top - 35, "Amount Paid")
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(totals_x + 10, totals_top - 55, "Balance Due")

    pdf.setFont("Helvetica", 10)
    pdf.setFillColor(colors.HexColor("#0F172A"))
    pdf.drawRightString(totals_x + totals_w - 10, totals_top - 17, money(summary.get("amount")))
    pdf.setFillColor(colors.HexColor("#047857"))
    pdf.drawRightString(totals_x + totals_w - 10, totals_top - 35, money(summary.get("paid_amount")))
    pdf.setFillColor(colors.HexColor("#B91C1C") if _to_float(summary.get("balance_amount")) > 0 else colors.HexColor("#0F172A"))
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawRightString(totals_x + totals_w - 10, totals_top - 55, money(summary.get("balance_amount")))

    y = totals_top - 92
    ensure_space(34)
    pdf.setFillColor(colors.HexColor("#64748B"))
    pdf.setFont("Helvetica", 8)
    pdf.drawString(margin_x, y, "Please retain this invoice for records. For billing support, contact the reception desk.")
    pdf.drawRightString(width - margin_x, y, "Authorized Billing Officer")

    draw_footer()
    pdf.save()
    pdf_buffer.seek(0)

    safe_name = "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in patient_name).strip("_") or f"patient_{patient_id}"
    filename = f"invoice_{safe_name}_{summary.get('date') or date.today().isoformat()}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/{patient_id}/payments", status_code=status.HTTP_201_CREATED)
def create_bill_payment(patient_id: int, payload: dict, conn=Depends(get_conn), user=Depends(get_current_user)):
    role = user.get("role", "")
    if role not in ("Admin", "Receptionist", "Patient"):
        raise HTTPException(status_code=403, detail="Access denied")

    cursor = dict_cursor(conn)
    _authorized_patient_ids(cursor, user, patient_id)

    amount = payload.get("amount")
    if amount is None:
        cursor.close()
        raise HTTPException(status_code=400, detail="amount is required")

    try:
        amount = Decimal(str(amount))
    except Exception as exc:
        cursor.close()
        raise HTTPException(status_code=400, detail="amount must be a number") from exc

    if amount <= 0:
        cursor.close()
        raise HTTPException(status_code=400, detail="amount must be greater than 0")

    method = payload.get("method", "Cash")
    if method not in PAYMENT_METHODS:
        cursor.close()
        raise HTTPException(status_code=400, detail=f"method must be one of {sorted(PAYMENT_METHODS)}")

    cursor.execute("SELECT id FROM patients WHERE id = %s", (patient_id,))
    if not cursor.fetchone():
        cursor.close()
        raise HTTPException(status_code=404, detail="Patient not found")

    cursor.execute(
        """
        INSERT INTO bill_payments (patient_id, amount, paid_at, method, notes, received_by)
        VALUES (%s, %s, COALESCE(%s::timestamptz, NOW()), %s, %s, %s)
        RETURNING id, patient_id, amount, paid_at, method, notes
        """,
        (
            patient_id,
            amount,
            payload.get("paid_at"),
            method,
            payload.get("notes"),
            user["id"],
        ),
    )
    payment = cursor.fetchone()

    cursor.execute(
        "INSERT INTO audit_logs (action, user_id, user_role, details) VALUES (%s, %s, %s, %s)",
        (
            "Bill payment recorded",
            user["id"],
            role,
            f"Patient #{patient_id}, amount {amount}, method {method}",
        ),
    )
    conn.commit()

    cursor.close()
    payment["amount"] = _to_float(payment.get("amount"))
    payment["paid_at"] = _to_iso(payment.get("paid_at"))
    return payment


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_bill(payload: dict, conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = dict_cursor(conn)
    cursor.execute(
        "INSERT INTO bills (patient_id, date, amount, status, created_by) VALUES (%s, %s, %s, %s, %s) RETURNING id",
        (
            payload.get("patient_id"),
            payload.get("date"),
            payload.get("amount"),
            payload.get("status", "Pending"),
            user["id"],
        ),
    )
    new_id = cursor.fetchone()["id"]

    cursor.execute(
        "INSERT INTO audit_logs (action, user_id, user_role, details) VALUES (%s, %s, %s, %s)",
        (
            "Bill created",
            user["id"],
            user.get("role"),
            f"Bill #{new_id} for patient {payload.get('patient_id')}, amount {payload.get('amount')}",
        ),
    )
    conn.commit()

    cursor.close()
    return {"id": new_id, **payload}
