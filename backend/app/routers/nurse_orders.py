from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional
from pydantic import BaseModel

from ..auth import get_current_user
from ..db import get_conn, dict_cursor

router = APIRouter(prefix="/nurse-orders", tags=["nurse-orders"])

_ORDER_JOIN = """
    SELECT
        no.id, no.patient_id, no.doctor_id, no.nurse_id,
        no.order_type, no.instructions, no.priority, no.status,
        no.notes, no.created_at, no.updated_at,
        p.full_name  AS patient_name,
        d.full_name  AS doctor_name,
        n.full_name  AS nurse_name
    FROM nurse_orders no
    LEFT JOIN patients p ON no.patient_id = p.id
    LEFT JOIN users    d ON no.doctor_id  = d.id
    LEFT JOIN users    n ON no.nurse_id   = n.id
"""


class NurseOrderCreate(BaseModel):
    patient_id: int
    nurse_id: Optional[int] = None
    order_type: str   # 'Medication','Observation','Procedure','Diet','Mobility','Other'
    instructions: str
    priority: str = "Normal"


class NurseOrderStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


class NurseOrderAssign(BaseModel):
    nurse_id: int


class MedicationAdministrationCreate(BaseModel):
    patient_id: int
    medicine_id: int
    quantity: float
    unit_price: Optional[float] = None
    nurse_order_id: Optional[int] = None
    administered_at: Optional[str] = None
    notes: Optional[str] = None


@router.get("/")
def list_nurse_orders(conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = dict_cursor(conn)
    role = user.get("role", "")

    if role == "Nurse":
        # Nurses see orders assigned to them AND unassigned orders
        cursor.execute(
            _ORDER_JOIN + " WHERE no.nurse_id = %s OR no.nurse_id IS NULL ORDER BY no.created_at DESC",
            (user["id"],),
        )
    elif role == "Doctor":
        # Doctors see only their own issued orders
        cursor.execute(
            _ORDER_JOIN + " WHERE no.doctor_id = %s ORDER BY no.created_at DESC",
            (user["id"],),
        )
    else:
        cursor.execute(_ORDER_JOIN + " ORDER BY no.created_at DESC")

    rows = cursor.fetchall() or []
    cursor.close()
    return rows


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_nurse_order(payload: NurseOrderCreate, conn=Depends(get_conn), user=Depends(get_current_user)):
    role = user.get("role", "")
    if role not in ("Doctor", "Admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Doctors can create nurse orders")

    valid_types = ("Medication", "Observation", "Procedure", "Diet", "Mobility", "Other")
    if payload.order_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"order_type must be one of {valid_types}")
    if payload.priority not in ("Normal", "Urgent"):
        raise HTTPException(status_code=400, detail="priority must be Normal or Urgent")

    cursor = dict_cursor(conn)

    # Verify patient exists
    cursor.execute("SELECT id FROM patients WHERE id = %s", (payload.patient_id,))
    if not cursor.fetchone():
        cursor.close()
        raise HTTPException(status_code=404, detail="Patient not found")

    # If a nurse is pre-assigned, verify they exist and have Nurse role
    if payload.nurse_id is not None:
        cursor.execute("SELECT id FROM users WHERE id = %s AND role = 'Nurse'", (payload.nurse_id,))
        if not cursor.fetchone():
            cursor.close()
            raise HTTPException(status_code=404, detail="Nurse not found")

    cursor.execute(
        """
        INSERT INTO nurse_orders (patient_id, doctor_id, nurse_id, order_type, instructions, priority)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (payload.patient_id, user["id"], payload.nurse_id, payload.order_type,
         payload.instructions, payload.priority),
    )
    order_id = cursor.fetchone()["id"]

    cursor.execute(
        "INSERT INTO audit_logs (action, user_id, user_role, details) VALUES (%s, %s, %s, %s)",
        ("Nurse order created", user["id"], role,
         f"Order #{order_id} ({payload.order_type}) for patient {payload.patient_id}"),
    )
    conn.commit()

    cursor.execute(_ORDER_JOIN + " WHERE no.id = %s", (order_id,))
    order = cursor.fetchone()
    cursor.close()
    return order


@router.patch("/{order_id}/status")
def update_order_status(
    order_id: int,
    payload: NurseOrderStatusUpdate,
    conn=Depends(get_conn),
    user=Depends(get_current_user),
):
    role = user.get("role", "")
    if role not in ("Nurse", "Doctor", "Admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    valid_statuses = ("Pending", "In Progress", "Completed", "Cancelled")
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"status must be one of {valid_statuses}")

    cursor = dict_cursor(conn)
    cursor.execute("SELECT id FROM nurse_orders WHERE id = %s", (order_id,))
    if not cursor.fetchone():
        cursor.close()
        raise HTTPException(status_code=404, detail="Order not found")

    cursor.execute(
        "UPDATE nurse_orders SET status = %s, notes = %s, updated_at = NOW() WHERE id = %s",
        (payload.status, payload.notes, order_id),
    )
    cursor.execute(
        "INSERT INTO audit_logs (action, user_id, user_role, details) VALUES (%s, %s, %s, %s)",
        ("Nurse order status updated", user["id"], role,
         f"Order #{order_id} → {payload.status}"),
    )
    conn.commit()
    cursor.close()
    return {"status": "success"}


@router.patch("/{order_id}/assign")
def assign_nurse(
    order_id: int,
    payload: NurseOrderAssign,
    conn=Depends(get_conn),
    user=Depends(get_current_user),
):
    role = user.get("role", "")
    if role not in ("Doctor", "Admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Doctors/Admins can assign nurses")

    cursor = dict_cursor(conn)
    cursor.execute("SELECT id FROM users WHERE id = %s AND role = 'Nurse'", (payload.nurse_id,))
    if not cursor.fetchone():
        cursor.close()
        raise HTTPException(status_code=404, detail="Nurse not found")

    cursor.execute(
        "UPDATE nurse_orders SET nurse_id = %s, updated_at = NOW() WHERE id = %s",
        (payload.nurse_id, order_id),
    )
    if cursor.rowcount == 0:
        cursor.close()
        raise HTTPException(status_code=404, detail="Order not found")

    conn.commit()
    cursor.close()
    return {"status": "success"}


@router.get("/{order_id}")
def get_nurse_order(order_id: int, conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = dict_cursor(conn)
    cursor.execute(_ORDER_JOIN + " WHERE no.id = %s", (order_id,))
    order = cursor.fetchone()
    cursor.close()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.post("/medication-admin", status_code=status.HTTP_201_CREATED)
def record_medication_administration(
    payload: MedicationAdministrationCreate,
    conn=Depends(get_conn),
    user=Depends(get_current_user),
):
    role = user.get("role", "")
    if role not in ("Nurse", "Doctor", "Admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="quantity must be greater than 0")

    cursor = dict_cursor(conn)

    cursor.execute("SELECT id FROM patients WHERE id = %s", (payload.patient_id,))
    if not cursor.fetchone():
        cursor.close()
        raise HTTPException(status_code=404, detail="Patient not found")

    cursor.execute("SELECT id, price, name FROM medicines WHERE id = %s", (payload.medicine_id,))
    medicine = cursor.fetchone()
    if not medicine:
        cursor.close()
        raise HTTPException(status_code=404, detail="Medicine not found")

    if payload.nurse_order_id is not None:
        cursor.execute(
            "SELECT id FROM nurse_orders WHERE id = %s AND patient_id = %s",
            (payload.nurse_order_id, payload.patient_id),
        )
        if not cursor.fetchone():
            cursor.close()
            raise HTTPException(status_code=404, detail="Nurse order not found for patient")

    unit_price = payload.unit_price if payload.unit_price is not None else float(medicine.get("price") or 0)
    if unit_price < 0:
        cursor.close()
        raise HTTPException(status_code=400, detail="unit_price cannot be negative")

    cursor.execute(
        """
        INSERT INTO nurse_medication_administrations
            (patient_id, nurse_order_id, medicine_id, quantity, unit_price, administered_at, administered_by, notes)
        VALUES (%s, %s, %s, %s, %s, COALESCE(%s::timestamptz, NOW()), %s, %s)
        RETURNING id, patient_id, nurse_order_id, medicine_id, quantity, unit_price, administered_at, notes
        """,
        (
            payload.patient_id,
            payload.nurse_order_id,
            payload.medicine_id,
            payload.quantity,
            unit_price,
            payload.administered_at,
            user["id"],
            payload.notes,
        ),
    )
    event = cursor.fetchone()

    cursor.execute(
        "INSERT INTO audit_logs (action, user_id, user_role, details) VALUES (%s, %s, %s, %s)",
        (
            "Medication administration recorded",
            user["id"],
            role,
            f"Patient {payload.patient_id}, medicine {medicine.get('name')}, qty {payload.quantity}, unit price {unit_price}",
        ),
    )

    conn.commit()
    cursor.close()

    event["quantity"] = float(event.get("quantity") or 0)
    event["unit_price"] = float(event.get("unit_price") or 0)
    event["line_total"] = event["quantity"] * event["unit_price"]
    event["administered_at"] = event["administered_at"].isoformat() if event.get("administered_at") else None
    return event
