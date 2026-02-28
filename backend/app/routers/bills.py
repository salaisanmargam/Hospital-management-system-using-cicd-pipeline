from fastapi import APIRouter, Depends, HTTPException, status
from ..db import get_conn
from ..auth import get_current_user

router = APIRouter(prefix="/bills", tags=["bills"])

@router.get("/")
def list_bills(conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = conn.cursor(dictionary=True)
    role = user.get("role", "")

    base_query = "SELECT b.*, p.full_name as patient_name FROM bills b LEFT JOIN patients p ON b.patient_id = p.id"

    if role == "Patient":
        # Patients see only their own bills
        cursor.execute(
            base_query + " WHERE b.patient_id IN (SELECT id FROM patients WHERE user_id = %s)",
            (user["id"],),
        )
    else:
        # Admin, Receptionist see all bills
        cursor.execute(base_query)

    rows = cursor.fetchall() or []
    cursor.close()
    return rows

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_bill(payload: dict, conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "INSERT INTO bills (patient_id, date, amount, status, created_by) VALUES (%s, %s, %s, %s, %s)",
        (payload.get("patient_id"), payload.get("date"), payload.get("amount"), payload.get("status", "Pending"), user["id"]),
    )
    conn.commit()
    new_id = cursor.lastrowid

    # Audit log
    cursor.execute(
        "INSERT INTO audit_logs (action, user_id, user_role, details) VALUES (%s, %s, %s, %s)",
        ("Bill created", user["id"], user.get("role"), f"Bill #{new_id} for patient {payload.get('patient_id')}, amount {payload.get('amount')}"),
    )
    conn.commit()

    cursor.close()
    return {"id": new_id, **payload}
