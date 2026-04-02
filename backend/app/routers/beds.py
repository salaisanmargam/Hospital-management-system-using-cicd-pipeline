from fastapi import APIRouter, Depends
from ..db import get_conn, dict_cursor
from ..auth import get_current_user

router = APIRouter(prefix="/beds", tags=["beds"])

DEFAULT_DAILY_BED_RATE = 1500.0

@router.get("/")
def list_beds(conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = dict_cursor(conn)
    cursor.execute("SELECT b.*, p.full_name as patient_name FROM beds b LEFT JOIN patients p ON b.patient_id = p.id")
    rows = cursor.fetchall() or []
    cursor.close()
    return rows

@router.patch("/{bed_id}/status")
def update_bed_status(bed_id: int, payload: dict, conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = dict_cursor(conn)
    cursor.execute("SELECT id, status, patient_id FROM beds WHERE id = %s", (bed_id,))
    existing = cursor.fetchone()
    if not existing:
        cursor.close()
        return {"status": "error", "detail": "Bed not found"}

    old_status = existing.get("status")
    old_patient_id = existing.get("patient_id")
    new_status = payload.get("status")
    new_patient_id = payload.get("patient_id")

    cursor.execute(
        "UPDATE beds SET status = %s, patient_id = %s WHERE id = %s",
        (new_status, new_patient_id, bed_id),
    )

    daily_rate = float(payload.get("daily_rate") or DEFAULT_DAILY_BED_RATE)

    # Close previous active stay if bed stops being occupied by that patient.
    if old_patient_id and (new_status != "Occupied" or new_patient_id != old_patient_id):
        cursor.execute(
            """
            UPDATE bed_stays
            SET discharged_at = NOW()
            WHERE bed_id = %s AND patient_id = %s AND discharged_at IS NULL
            """,
            (bed_id, old_patient_id),
        )

    # Open a new stay when bed becomes occupied by a patient.
    if new_status == "Occupied" and new_patient_id and (old_status != "Occupied" or old_patient_id != new_patient_id):
        cursor.execute(
            """
            INSERT INTO bed_stays (patient_id, bed_id, admitted_at, daily_rate, created_by)
            VALUES (%s, %s, NOW(), %s, %s)
            """,
            (new_patient_id, bed_id, daily_rate, user["id"]),
        )

    # Audit log
    action = "Patient admitted" if new_status == "Occupied" else "Bed status updated"
    cursor.execute(
        "INSERT INTO audit_logs (action, user_id, user_role, details) VALUES (%s, %s, %s, %s)",
        (action, user["id"], user.get("role"), f"Bed #{bed_id} → {new_status}"),
    )
    conn.commit()
    cursor.close()
    return {"status": "success"}


@router.get("/stays")
def list_bed_stays(patient_id: int | None = None, conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = dict_cursor(conn)
    base_query = """
        SELECT
            bs.*,
            p.full_name AS patient_name,
            b.ward,
            b.bed_number
        FROM bed_stays bs
        LEFT JOIN patients p ON p.id = bs.patient_id
        LEFT JOIN beds b ON b.id = bs.bed_id
    """

    if patient_id is not None:
        cursor.execute(base_query + " WHERE bs.patient_id = %s ORDER BY bs.admitted_at DESC", (patient_id,))
    else:
        cursor.execute(base_query + " ORDER BY bs.admitted_at DESC")

    rows = cursor.fetchall() or []
    cursor.close()
    return rows
