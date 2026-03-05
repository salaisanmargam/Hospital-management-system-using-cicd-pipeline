from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional
from pydantic import BaseModel
from ..auth import get_current_user
from ..db import get_conn, dict_cursor

router = APIRouter(prefix="/staff", tags=["staff"])


class StaffUpdate(BaseModel):
    full_name: str
    department: Optional[str] = None
    contact: Optional[str] = None
    status: Optional[str] = None
    shift: Optional[str] = None
    bio: Optional[str] = None
    consultation_fee: Optional[float] = None


@router.get("/")
def list_staff(conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = dict_cursor(conn)
    cursor.execute("SELECT id, full_name, email, role, department, contact, status, shift, avatar_url, bio, consultation_fee FROM users WHERE role != 'Patient'")
    rows = cursor.fetchall() or []
    cursor.close()
    return rows


@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_staff(staff_id: int, conn=Depends(get_conn), user=Depends(get_current_user)):
    role = user.get("role", "")
    if role != "Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    cursor = dict_cursor(conn)
    cursor.execute("SELECT id, full_name, role FROM users WHERE id = %s AND role != 'Patient'", (staff_id,))
    staff = cursor.fetchone()
    if not staff:
        cursor.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found")

    cursor.execute("DELETE FROM users WHERE id = %s", (staff_id,))

    # Audit log
    cursor.execute(
        "INSERT INTO audit_logs (action, user_id, user_role, details) VALUES (%s, %s, %s, %s)",
        ("Staff deleted", user["id"], user.get("role"), f"Deleted staff: {staff['full_name']} (ID {staff_id})"),
    )
    conn.commit()
    cursor.close()
    return None


@router.put("/{staff_id}")
def update_staff(staff_id: int, payload: StaffUpdate, conn=Depends(get_conn), user=Depends(get_current_user)):
    role = user.get("role", "")
    if role != "Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    cursor = dict_cursor(conn)
    cursor.execute("SELECT id FROM users WHERE id = %s AND role != 'Patient'", (staff_id,))
    if not cursor.fetchone():
        cursor.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found")

    cursor.execute(
        """
        UPDATE users
        SET full_name=%s, department=%s, contact=%s, status=%s, shift=%s, bio=%s, consultation_fee=%s
        WHERE id=%s
        """,
        (payload.full_name, payload.department, payload.contact, payload.status,
         payload.shift, payload.bio, payload.consultation_fee, staff_id),
    )

    cursor.execute(
        "INSERT INTO audit_logs (action, user_id, user_role, details) VALUES (%s, %s, %s, %s)",
        ("Staff updated", user["id"], user.get("role"), f"Updated staff #{staff_id}: {payload.full_name}"),
    )
    conn.commit()

    cursor.execute(
        "SELECT id, full_name, email, role, department, contact, status, shift, avatar_url, bio, consultation_fee FROM users WHERE id = %s",
        (staff_id,),
    )
    updated = cursor.fetchone()
    cursor.close()
    return updated


@router.patch("/{staff_id}/shift")
def update_staff_shift(staff_id: int, payload: dict, conn=Depends(get_conn), user=Depends(get_current_user)):
    new_shift = payload.get("shift")
    if new_shift not in ("Morning", "Evening", "Night"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid shift value")

    cursor = dict_cursor(conn)
    cursor.execute("UPDATE users SET shift = %s WHERE id = %s AND role != 'Patient'", (new_shift, staff_id))
    if cursor.rowcount == 0:
        cursor.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff member not found")

    # Audit log
    cursor.execute(
        "INSERT INTO audit_logs (action, user_id, user_role, details) VALUES (%s, %s, %s, %s)",
        ("Shift updated", user["id"], user.get("role"), f"Staff #{staff_id} shift → {new_shift}"),
    )
    conn.commit()
    cursor.close()
    return {"status": "success"}
