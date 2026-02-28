from fastapi import APIRouter, Depends, HTTPException, status
from ..db import get_conn
from ..auth import get_current_user

router = APIRouter(prefix="/vitals", tags=["vitals"])


@router.get("/{patient_id}")
def get_vitals(patient_id: int, conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT * FROM vitals WHERE patient_id = %s ORDER BY last_updated DESC LIMIT 1",
        (patient_id,),
    )
    row = cursor.fetchone()
    cursor.close()
    if not row:
        return None
    return row


@router.get("/")
def list_all_vitals(conn=Depends(get_conn), user=Depends(get_current_user)):
    cursor = conn.cursor(dictionary=True)
    # Get the latest vitals per patient
    cursor.execute(
        """
        SELECT v.* FROM vitals v
        INNER JOIN (
            SELECT patient_id, MAX(last_updated) as max_updated
            FROM vitals GROUP BY patient_id
        ) latest ON v.patient_id = latest.patient_id AND v.last_updated = latest.max_updated
        """
    )
    rows = cursor.fetchall() or []
    cursor.close()
    return rows


@router.post("/", status_code=status.HTTP_201_CREATED)
def upsert_vitals(payload: dict, conn=Depends(get_conn), user=Depends(get_current_user)):
    """Create or update vitals for a patient."""
    cursor = conn.cursor(dictionary=True)
    patient_id = payload.get("patient_id")
    if not patient_id:
        raise HTTPException(status_code=400, detail="patient_id is required")

    # Check if vitals record exists
    cursor.execute("SELECT id FROM vitals WHERE patient_id = %s ORDER BY last_updated DESC LIMIT 1", (patient_id,))
    existing = cursor.fetchone()

    if existing:
        cursor.execute(
            """
            UPDATE vitals SET bp = %s, heart_rate = %s, temperature = %s, spo2 = %s
            WHERE id = %s
            """,
            (
                payload.get("bp"),
                payload.get("heart_rate"),
                payload.get("temperature"),
                payload.get("spo2"),
                existing["id"],
            ),
        )
    else:
        cursor.execute(
            """
            INSERT INTO vitals (patient_id, bp, heart_rate, temperature, spo2)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                patient_id,
                payload.get("bp"),
                payload.get("heart_rate"),
                payload.get("temperature"),
                payload.get("spo2"),
            ),
        )

    # Audit log
    cursor.execute(
        "INSERT INTO audit_logs (action, user_id, user_role, details) VALUES (%s, %s, %s, %s)",
        ("Vitals updated", user["id"], user.get("role"), f"Vitals for patient #{patient_id}"),
    )
    conn.commit()
    cursor.close()
    return {"status": "success", "patient_id": patient_id}
