from fastapi import APIRouter, Depends, HTTPException, status
from ..db import get_conn, dict_cursor
from ..auth import get_current_user

router = APIRouter(prefix="/beds", tags=["beds"])

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
    cursor.execute(
        "UPDATE beds SET status = %s, patient_id = %s WHERE id = %s",
        (payload.get("status"), payload.get("patient_id"), bed_id),
    )
    # Audit log
    action = "Patient admitted" if payload.get("status") == "Occupied" else "Bed status updated"
    cursor.execute(
        "INSERT INTO audit_logs (action, user_id, user_role, details) VALUES (%s, %s, %s, %s)",
        (action, user["id"], user.get("role"), f"Bed #{bed_id} → {payload.get('status')}"),
    )
    conn.commit()
    cursor.close()
    return {"status": "success"}
