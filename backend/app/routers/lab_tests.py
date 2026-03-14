from fastapi import APIRouter, Depends, HTTPException, status
from ..db import get_conn, dict_cursor
from ..auth import get_current_user

router = APIRouter(prefix="/lab-tests", tags=["lab-tests"])

LAB_DEPARTMENT_ALIASES = {
    "pathology": "Pathology",
    "pathology department": "Pathology",
    "radiology": "Radiology",
    "radiology department": "Radiology",
    "microbiology": "Microbiology",
    "microbiology department": "Microbiology",
    "biochemistry": "Biochemistry",
    "biochemistry department": "Biochemistry",
}


def normalize_lab_department(value):
    if not value:
        return None
    normalized = " ".join(str(value).strip().split()).lower()
    return LAB_DEPARTMENT_ALIASES.get(normalized)


def get_lab_technician_department(user):
    department = normalize_lab_department(user.get("department"))
    if not department:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lab technician is not assigned to a supported laboratory department",
        )
    return department

@router.get("/")
def list_lab_tests(conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = dict_cursor(conn)
    role = user.get("role", "")

    base_query = "SELECT l.*, p.full_name as patient_name, u.full_name as doctor_name FROM lab_tests l LEFT JOIN patients p ON l.patient_id = p.id LEFT JOIN users u ON l.doctor_id = u.id"

    if role == "Doctor":
        cursor.execute(base_query + " WHERE l.doctor_id = %s ORDER BY l.test_date DESC NULLS LAST, l.id DESC", (user["id"],))
    elif role == "Patient":
        cursor.execute(
            base_query + " WHERE l.patient_id IN (SELECT id FROM patients WHERE user_id = %s) ORDER BY l.test_date DESC NULLS LAST, l.id DESC",
            (user["id"],),
        )
    elif role == "Lab Technician":
        department = get_lab_technician_department(user)
        cursor.execute(
            base_query + " WHERE LOWER(TRIM(l.department)) = LOWER(%s) ORDER BY l.test_date DESC NULLS LAST, l.id DESC",
            (department,),
        )
    else:
        # Admin sees all
        cursor.execute(base_query + " ORDER BY l.test_date DESC NULLS LAST, l.id DESC")

    rows = cursor.fetchall() or []
    cursor.close()
    return rows

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_lab_test(payload: dict, conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = dict_cursor(conn)
    cursor.execute(
        """
        INSERT INTO lab_tests (patient_id, doctor_id, test_name, department, test_date, priority, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id
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
    new_id = cursor.fetchone()["id"]
    cursor.execute(
        "INSERT INTO audit_logs (action, user_id, user_role, details) VALUES (%s, %s, %s, %s)",
        ("Lab test created", user["id"], user.get("role"), f"Test #{new_id}: {payload.get('test_name')} for patient {payload.get('patient_id')}"),
    )
    conn.commit()
    cursor.close()
    return {"id": new_id, **payload}


@router.patch("/{test_id}/status")
def update_test_status(test_id: int, payload: dict, conn=Depends(get_conn), user=Depends(get_current_user)):
    role = user.get("role", "")
    if role not in ("Admin", "Doctor", "Lab Technician"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    cursor = dict_cursor(conn)

    if role == "Lab Technician":
        department = get_lab_technician_department(user)
        cursor.execute("SELECT department FROM lab_tests WHERE id = %s", (test_id,))
        test_row = cursor.fetchone()
        if not test_row:
            cursor.close()
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab test not found")

        test_department = normalize_lab_department(test_row.get("department"))
        if test_department != department:
            cursor.close()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update tests assigned to your department",
            )

    cursor.execute(
        "UPDATE lab_tests SET status = %s WHERE id = %s",
        (payload.get("status"), test_id),
    )
    if cursor.rowcount == 0:
        cursor.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lab test not found")
    # Audit log
    cursor.execute(
        "INSERT INTO audit_logs (action, user_id, user_role, details) VALUES (%s, %s, %s, %s)",
        ("Lab test updated", user["id"], user.get("role"), f"Test #{test_id} → {payload.get('status')}"),
    )
    conn.commit()
    cursor.close()
    return {"status": "success"}
