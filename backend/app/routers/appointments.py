from fastapi import APIRouter, Depends, HTTPException, status

from ..auth import get_current_user
from ..db import get_conn, dict_cursor
from ..models import AppointmentCreate, AppointmentOut

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.get("/")
def list_appointments(conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = dict_cursor(conn)
    role = user.get("role", "")

    base_query = """
    SELECT a.*, p.full_name as patient_name, u.full_name as doctor_name
    FROM appointments a
    LEFT JOIN patients p ON a.patient_id = p.id
    LEFT JOIN users u ON a.doctor_id = u.id
    """

    if role == "Doctor":
        # Doctors see only their own appointments
        cursor.execute(base_query + " WHERE a.doctor_id = %s ORDER BY a.appointment_date DESC", (user["id"],))
    elif role == "Patient":
        # Patients see only their own appointments (find patient_id via user_id)
        cursor.execute(
            base_query + " WHERE a.patient_id IN (SELECT id FROM patients WHERE user_id = %s) ORDER BY a.appointment_date DESC",
            (user["id"],),
        )
    else:
        # Admin, Nurse, Receptionist see all
        cursor.execute(base_query + " ORDER BY a.appointment_date DESC")

    rows = cursor.fetchall() or []
    cursor.close()
    return rows


@router.post("/", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def create_appointment(payload: AppointmentCreate, conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = dict_cursor(conn)
    cursor.execute(
        """
        INSERT INTO appointments (patient_id, doctor_id, department, appointment_date, appointment_time, status, type)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (
            payload.patient_id,
            payload.doctor_id,
            payload.department,
            payload.appointment_date,
            payload.appointment_time,
            payload.status,
            payload.type,
        ),
    )
    appointment_id = cursor.fetchone()["id"]

    # Audit log
    cursor.execute(
        "INSERT INTO audit_logs (action, user_id, user_role, details) VALUES (%s, %s, %s, %s)",
        ("Appointment created", user["id"], user.get("role"), f"Appointment #{appointment_id} for patient {payload.patient_id}"),
    )
    conn.commit()

    cursor.execute("SELECT * FROM appointments WHERE id = %s", (appointment_id,))
    appointment = cursor.fetchone()
    cursor.close()
    return appointment


@router.patch("/{appointment_id}/status")
def update_appointment_status(appointment_id: int, payload: dict, conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = dict_cursor(conn)
    new_status = payload.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status is required")
    cursor.execute("UPDATE appointments SET status = %s WHERE id = %s", (new_status, appointment_id))
    if cursor.rowcount == 0:
        cursor.close()
        raise HTTPException(status_code=404, detail="Appointment not found")
    cursor.execute(
        "INSERT INTO audit_logs (action, user_id, user_role, details) VALUES (%s, %s, %s, %s)",
        ("Appointment status updated", user["id"], user.get("role"), f"Appointment #{appointment_id} → {new_status}"),
    )
    conn.commit()
    cursor.close()
    return {"status": "success"}


@router.get("/{appointment_id}", response_model=AppointmentOut)
def get_appointment(appointment_id: int, conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = dict_cursor(conn)
    cursor.execute("SELECT * FROM appointments WHERE id = %s", (appointment_id,))
    appointment = cursor.fetchone()
    cursor.close()
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    return dict(appointment)


@router.put("/{appointment_id}", response_model=AppointmentOut)
def update_appointment(appointment_id: int, payload: AppointmentCreate, conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = dict_cursor(conn)
    cursor.execute(
        """
        UPDATE appointments
        SET patient_id=%s, doctor_id=%s, department=%s, appointment_date=%s, appointment_time=%s, status=%s, type=%s
        WHERE id=%s
        """,
        (
            payload.patient_id,
            payload.doctor_id,
            payload.department,
            payload.appointment_date,
            payload.appointment_time,
            payload.status,
            payload.type,
            appointment_id,
        ),
    )
    if cursor.rowcount == 0:
        cursor.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    conn.commit()
    cursor.execute("SELECT * FROM appointments WHERE id = %s", (appointment_id,))
    appointment = cursor.fetchone()
    cursor.close()
    return appointment


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(appointment_id: int, conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM appointments WHERE id = %s", (appointment_id,))
    if cursor.rowcount == 0:
        cursor.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    conn.commit()
    cursor.close()
    return None
