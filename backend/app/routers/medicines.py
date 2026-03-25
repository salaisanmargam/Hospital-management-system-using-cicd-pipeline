from fastapi import APIRouter, Depends, HTTPException, status
from ..db import get_conn, dict_cursor
from ..auth import get_current_user

router = APIRouter(prefix="/medicines", tags=["medicines"])

DEFAULT_MIN_REQUIRED_STOCK = 20


def _status_from_stock(stock: int, min_required_stock: int) -> str:
    if stock <= 0:
        return "Out of Stock"
    if stock <= min_required_stock:
        return "Low Stock"
    return "In Stock"

@router.get("/")
def list_medicines(conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = dict_cursor(conn)
    cursor.execute("SELECT * FROM medicines")
    rows = cursor.fetchall() or []
    cursor.close()
    return rows

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_medicine(payload: dict, conn=Depends(get_conn), user=Depends(get_current_user)):
    stock = int(payload.get("stock") or 0)
    min_required_stock = int(payload.get("min_required_stock") or DEFAULT_MIN_REQUIRED_STOCK)
    status_value = _status_from_stock(stock, min_required_stock)
    cursor = dict_cursor(conn)
    cursor.execute(
        """
        INSERT INTO medicines (name, category, stock, unit, price, expiry_date, status, min_required_stock, added_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (
            payload.get("name"),
            payload.get("category"),
            stock,
            payload.get("unit"),
            payload.get("price"),
            payload.get("expiry_date"),
            status_value,
            min_required_stock,
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


@router.patch("/{medicine_id}/stock")
def update_medicine_stock(medicine_id: int, payload: dict, conn=Depends(get_conn), user=Depends(get_current_user)):
    restock_units = int(payload.get("quantity") or payload.get("restock_quantity") or payload.get("add_units") or 0)
    if restock_units <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0")

    cursor = dict_cursor(conn)
    cursor.execute("SELECT id, name, stock, min_required_stock FROM medicines WHERE id = %s", (medicine_id,))
    medicine = cursor.fetchone()
    if not medicine:
        cursor.close()
        raise HTTPException(status_code=404, detail="Medicine not found")

    new_stock = int(medicine["stock"] or 0) + restock_units
    min_required_stock = int(medicine.get("min_required_stock") or DEFAULT_MIN_REQUIRED_STOCK)
    new_status = _status_from_stock(new_stock, min_required_stock)

    cursor.execute(
        "UPDATE medicines SET stock = %s, status = %s WHERE id = %s",
        (new_stock, new_status, medicine_id),
    )

    cursor.execute(
        "INSERT INTO audit_logs (action, user_id, user_role, details) VALUES (%s, %s, %s, %s)",
        (
            "Medicine restocked",
            user["id"],
            user.get("role"),
            f"Restocked {medicine['name']} by {restock_units} units. New stock: {new_stock}",
        ),
    )
    conn.commit()
    cursor.close()

    return {
        "id": medicine_id,
        "stock": new_stock,
        "min_required_stock": min_required_stock,
        "status": new_status,
        "restocked": restock_units,
    }
