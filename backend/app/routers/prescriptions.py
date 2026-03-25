from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from ..db import get_conn, dict_cursor
from ..auth import get_current_user

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])

@router.get("/")
def list_prescriptions(
    patient_id: int | None = Query(default=None),
    conn=Depends(get_conn),
    user=Depends(get_current_user),
):
    cursor = dict_cursor(conn)
    role = user.get("role", "")

    base_query = "SELECT pr.*, p.full_name as patient_name, u.full_name as doctor_name FROM prescriptions pr LEFT JOIN patients p ON pr.patient_id = p.id LEFT JOIN users u ON pr.doctor_id = u.id"
    params = []

    if role == "Doctor":
        where_clauses = [
            "(pr.patient_id IN (SELECT DISTINCT patient_id FROM appointments WHERE doctor_id = %s) OR pr.doctor_id = %s)"
        ]
        params.extend([user["id"], user["id"]])
    
        if patient_id is not None:
            where_clauses.append("pr.patient_id = %s")
            params.append(patient_id)

        cursor.execute(base_query + " WHERE " + " AND ".join(where_clauses), tuple(params))
    elif role == "Patient":
        where_query = base_query + " WHERE pr.patient_id IN (SELECT id FROM patients WHERE user_id = %s)"
        params = [user["id"]]
        if patient_id is not None:
            where_query += " AND pr.patient_id = %s"
            params.append(patient_id)
        cursor.execute(where_query, tuple(params))
    else:
        # Admin, Nurse, Pharmacist see all
        where_query = base_query
        if patient_id is not None:
            where_query += " WHERE pr.patient_id = %s"
            params = [patient_id]
        if params:
            cursor.execute(where_query, tuple(params))
        else:
            cursor.execute(where_query)

    rows = cursor.fetchall() or []

    # Attach prescription items (medicines) per prescription
    for row in rows:
        cursor.execute(
            """
            SELECT
                pi.medicine_name as name,
                pi.dosage,
                pi.quantity,
                COALESCE(m.price, 0) AS unit_price,
                COALESCE(pi.quantity, 0) * COALESCE(m.price, 0) AS line_total
            FROM prescription_items pi
            LEFT JOIN medicines m ON LOWER(m.name) = LOWER(pi.medicine_name)
            WHERE pi.prescription_id = %s
            ORDER BY pi.id ASC
            """,
            (row["id"],),
        )
        meds = cursor.fetchall() or []
        prescription_total = Decimal("0")
        for med in meds:
            line_total = med.get("line_total") or Decimal("0")
            prescription_total += line_total
            med["unit_price"] = float(med.get("unit_price") or 0)
            med["line_total"] = float(line_total)

        row["total_cost"] = float(prescription_total)
        row["medicines"] = meds

    cursor.close()
    return rows

@router.patch("/{prescription_id}/status")
def update_prescription_status(prescription_id: int, payload: dict, conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = dict_cursor(conn)
    new_status = payload.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status is required")
    cursor.execute("UPDATE prescriptions SET status = %s WHERE id = %s", (new_status, prescription_id))
    if cursor.rowcount == 0:
        cursor.close()
        raise HTTPException(status_code=404, detail="Prescription not found")
    cursor.execute(
        "INSERT INTO audit_logs (action, user_id, user_role, details) VALUES (%s, %s, %s, %s)",
        ("Prescription status updated", user["id"], user.get("role"), f"Prescription #{prescription_id} → {new_status}"),
    )
    conn.commit()
    cursor.close()
    return {"status": "success"}


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_prescription(payload: dict, conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = dict_cursor(conn)
    cursor.execute(
        """
        INSERT INTO prescriptions (patient_id, doctor_id, date, time, status, priority)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (
            payload.get("patient_id"),
            payload.get("doctor_id"),
            payload.get("date"),
            payload.get("time"),
            payload.get("status", "Pending"),
            payload.get("priority", "Normal"),
        ),
    )
    pres_id = cursor.fetchone()["id"]
    
    for item in payload.get("items", []):
        cursor.execute(
            "INSERT INTO prescription_items (prescription_id, medicine_name, dosage, quantity) VALUES (%s, %s, %s, %s)",
            (pres_id, item["medicine_name"], item["dosage"], item["quantity"]),
        )
    
    conn.commit()
    cursor.close()
    return {"id": pres_id, **payload}
