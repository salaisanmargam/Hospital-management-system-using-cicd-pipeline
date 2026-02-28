from fastapi import APIRouter, Depends, HTTPException, status
from ..db import get_conn
from ..auth import get_current_user

router = APIRouter(prefix="/lab-tests", tags=["lab-tests"])

@router.get("/")
def list_lab_tests(conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = conn.cursor(dictionary=True)
    role = user.get("role", "")

    base_query = "SELECT l.*, p.full_name as patient_name, u.full_name as doctor_name FROM lab_tests l LEFT JOIN patients p ON l.patient_id = p.id LEFT JOIN users u ON l.doctor_id = u.id"

    if role == "Doctor":
        cursor.execute(base_query + " WHERE l.doctor_id = %s", (user["id"],))
    elif role == "Patient":
        cursor.execute(
            base_query + " WHERE l.patient_id IN (SELECT id FROM patients WHERE user_id = %s)",
            (user["id"],),
        )
    elif role == "Lab Technician":
        # Lab techs see all tests (they process them all)
        cursor.execute(base_query)
    else:
        # Admin sees all
        cursor.execute(base_query)

    rows = cursor.fetchall() or []
    cursor.close()
    return rows

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_lab_test(payload: dict, conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        INSERT INTO lab_tests (patient_id, doctor_id, test_name, department, test_date, priority, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (
            payload.get("patient_id"),
            payload.get("doctor_id", user["id"]),
            payload.get("test_name"),
            payload.get("department"),
            payload.get("test_date"),
            payload.get("priority", "Normal"),
            payload.get("status", "Pending"),
        ),
    )
    conn.commit()
    new_id = cursor.lastrowid
    cursor.execute(
        "INSERT INTO audit_logs (action, user_id, user_role, details) VALUES (%s, %s, %s, %s)",
        ("Lab test created", user["id"], user.get("role"), f"Test #{new_id}: {payload.get('test_name')} for patient {payload.get('patient_id')}"),
    )
    conn.commit()
    cursor.close()
    return {"id": new_id, **payload}


@router.patch("/{test_id}/status")
def update_test_status(test_id: int, payload: dict, conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "UPDATE lab_tests SET status = %s WHERE id = %s",
        (payload.get("status"), test_id),
    )
    # Audit log
    cursor.execute(
        "INSERT INTO audit_logs (action, user_id, user_role, details) VALUES (%s, %s, %s, %s)",
        ("Lab test updated", user["id"], user.get("role"), f"Test #{test_id} → {payload.get('status')}"),
    )
    conn.commit()
    cursor.close()
    return {"status": "success"}
