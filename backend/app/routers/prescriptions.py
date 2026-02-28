from fastapi import APIRouter, Depends, HTTPException, status
from ..db import get_conn
from ..auth import get_current_user

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])

@router.get("/")
def list_prescriptions(conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = conn.cursor(dictionary=True)
    role = user.get("role", "")

    base_query = "SELECT pr.*, p.full_name as patient_name, u.full_name as doctor_name FROM prescriptions pr LEFT JOIN patients p ON pr.patient_id = p.id LEFT JOIN users u ON pr.doctor_id = u.id"

    if role == "Doctor":
        cursor.execute(base_query + " WHERE pr.doctor_id = %s", (user["id"],))
    elif role == "Patient":
        cursor.execute(
            base_query + " WHERE pr.patient_id IN (SELECT id FROM patients WHERE user_id = %s)",
            (user["id"],),
        )
    else:
        # Admin, Nurse, Pharmacist see all
        cursor.execute(base_query)

    rows = cursor.fetchall() or []

    # Attach prescription items (medicines) per prescription
    for row in rows:
        cursor.execute(
            "SELECT medicine_name as name, dosage, quantity FROM prescription_items WHERE prescription_id = %s",
            (row["id"],),
        )
        row["medicines"] = cursor.fetchall() or []

    cursor.close()
    return rows

@router.patch("/{prescription_id}/status")
def update_prescription_status(prescription_id: int, payload: dict, conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = conn.cursor(dictionary=True)
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
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        INSERT INTO prescriptions (patient_id, doctor_id, date, time, status, priority)
        VALUES (%s, %s, %s, %s, %s, %s)
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
    pres_id = cursor.lastrowid
    
    for item in payload.get("items", []):
        cursor.execute(
            "INSERT INTO prescription_items (prescription_id, medicine_name, dosage, quantity) VALUES (%s, %s, %s, %s)",
            (pres_id, item["medicine_name"], item["dosage"], item["quantity"]),
        )
    
    conn.commit()
    cursor.close()
    return {"id": pres_id, **payload}
