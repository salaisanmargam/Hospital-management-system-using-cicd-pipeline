from fastapi import APIRouter, Depends, HTTPException, status
from ..db import get_conn
from ..auth import get_current_user

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])

@router.get("/")
def list_logs(conn=Depends(get_conn), user=Depends(get_current_user)):
    role = user.get("role", "")
    if role != "Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT al.*, u.full_name as user_name
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.timestamp DESC
        LIMIT 200
    """)
    rows = cursor.fetchall() or []
    cursor.close()
    return rows
