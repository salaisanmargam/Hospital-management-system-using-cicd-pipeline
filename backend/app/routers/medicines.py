from fastapi import APIRouter, Depends, status
from ..db import get_conn, dict_cursor
from ..auth import get_current_user

router = APIRouter(prefix="/medicines", tags=["medicines"])

@router.get("/")
def list_medicines(conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = dict_cursor(conn)
    cursor.execute("SELECT * FROM medicines")
    rows = cursor.fetchall() or []
    cursor.close()
    return rows

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_medicine(payload: dict, conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = dict_cursor(conn)
    cursor.execute(
        """
        INSERT INTO medicines (name, category, stock, unit, price, expiry_date, status, added_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (
            payload.get("name"),
            payload.get("category"),
            payload.get("stock"),
            payload.get("unit"),
            payload.get("price"),
            payload.get("expiry_date"),
            payload.get("status", "In Stock"),
            user["id"],
        ),
    )
    new_id = cursor.fetchone()["id"]

    # Audit log
    cursor.execute(
        "INSERT INTO audit_logs (action, user_id, user_role, details) VALUES (%s, %s, %s, %s)",
        ("Medicine added", user["id"], user.get("role"), f"Added medicine: {payload.get('name')}"),
    )
    conn.commit()

    cursor.close()
    return {"id": new_id, **payload}
