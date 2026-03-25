from fastapi import APIRouter, Depends, HTTPException, status

from ..auth import get_current_user
from ..db import get_conn, dict_cursor
from ..models import PatientCreate, PatientOut

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("/")
def list_patients(conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = dict_cursor(conn)
    role = user.get("role", "")

    if role == "Patient":
        # Patient users see only their own clinical record
        cursor.execute("SELECT * FROM patients WHERE user_id = %s ORDER BY created_at DESC", (user["id"],))
    else:
        # Admin, Doctor, Nurse, Receptionist see all patients
        cursor.execute("SELECT * FROM patients ORDER BY created_at DESC")

    rows = cursor.fetchall() or []
    cursor.close()
    return rows


@router.post("/", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def create_patient(payload: PatientCreate, conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = dict_cursor(conn)
    cursor.execute(
        """
        INSERT INTO patients (full_name, age, gender, contact, last_visit, medical_condition, status, blood_type, allergies, created_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (
            payload.full_name,
            payload.age,
            payload.gender,
            payload.contact,
            payload.last_visit,
            payload.medical_condition,
            payload.status,
            payload.blood_type,
            payload.allergies,
            user["id"],
        ),
    )
    patient_id = cursor.fetchone()["id"]

    # Audit log
    cursor.execute(
        "INSERT INTO audit_logs (action, user_id, user_role, details) VALUES (%s, %s, %s, %s)",
        ("Patient created", user["id"], user.get("role"), f"Created patient: {payload.full_name}"),
    )
    conn.commit()

    cursor.execute("SELECT * FROM patients WHERE id = %s", (patient_id,))
    patient = cursor.fetchone()
    cursor.close()
    return patient


@router.patch("/{patient_id}/status")
def update_patient_status(patient_id: int, payload: dict, conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = dict_cursor(conn)
    new_status = payload.get("status")
    if new_status not in ("Inpatient", "Outpatient", "Discharged"):
        raise HTTPException(status_code=400, detail="Invalid status")
    cursor.execute("UPDATE patients SET status = %s WHERE id = %s", (new_status, patient_id))
    if cursor.rowcount == 0:
        cursor.close()
        raise HTTPException(status_code=404, detail="Patient not found")
    cursor.execute(
        "INSERT INTO audit_logs (action, user_id, user_role, details) VALUES (%s, %s, %s, %s)",
        ("Patient status updated", user["id"], user.get("role"), f"Patient #{patient_id} → {new_status}"),
    )
    conn.commit()
    cursor.close()
    return {"status": "success"}


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(patient_id: int, conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = dict_cursor(conn)
    cursor.execute("SELECT * FROM patients WHERE id = %s", (patient_id,))
    patient = cursor.fetchone()
    cursor.close()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return dict(patient)


@router.put("/{patient_id}", response_model=PatientOut)
def update_patient(patient_id: int, payload: PatientCreate, conn=Depends(get_conn), user=Depends(get_current_user)):
    role = user.get("role", "")
    allowed_roles = {"Admin", "Doctor", "Receptionist"}
    if role not in allowed_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    cursor = dict_cursor(conn)
    cursor.execute(
        """
        UPDATE patients
        SET full_name=%s, age=%s, gender=%s, contact=%s, last_visit=%s, medical_condition=%s, status=%s, blood_type=%s, allergies=%s
        WHERE id=%s
        """,
        (
            payload.full_name,
            payload.age,
            payload.gender,
            payload.contact,
            payload.last_visit,
            payload.medical_condition,
            payload.status,
            payload.blood_type,
            payload.allergies,
            patient_id,
        ),
    )
    if cursor.rowcount == 0:
        cursor.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    cursor.execute(
        "INSERT INTO audit_logs (action, user_id, user_role, details) VALUES (%s, %s, %s, %s)",
        ("Patient updated", user["id"], user.get("role"), f"Updated patient #{patient_id}: {payload.full_name}"),
    )
    conn.commit()
    cursor.execute("SELECT * FROM patients WHERE id = %s", (patient_id,))
    patient = cursor.fetchone()
    cursor.close()
    return patient


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(patient_id: int, conn=Depends(get_conn), user=Depends(get_current_user)):
    role = user.get("role", "")
    if role != "Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    cursor = dict_cursor(conn)
    cursor.execute("SELECT id, full_name FROM patients WHERE id = %s", (patient_id,))
    patient = cursor.fetchone()
    if not patient:
        cursor.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    cursor.execute("DELETE FROM patients WHERE id = %s", (patient_id,))
    cursor.execute(
        "INSERT INTO audit_logs (action, user_id, user_role, details) VALUES (%s, %s, %s, %s)",
        ("Patient deleted", user["id"], user.get("role"), f"Deleted patient #{patient_id}: {patient['full_name']}"),
    )
    conn.commit()
    cursor.close()
    return None
