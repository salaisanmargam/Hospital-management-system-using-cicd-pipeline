from fastapi import APIRouter, Depends, HTTPException, status

from ..auth import create_access_token, get_current_user, hash_password, verify_password
from ..db import get_conn
from ..models import Token, UserCreate, UserLogin, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserCreate, conn=Depends(get_conn)):
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id FROM users WHERE email = %s", (payload.email,))
    existing = cursor.fetchone()
    if existing:
        cursor.close()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    password_hash = hash_password(payload.password)
    cursor.execute(
        """
        INSERT INTO users (email, full_name, password_hash, role, avatar_url, department, contact, status, shift, bio, consultation_fee)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            payload.email,
            payload.full_name,
            password_hash,
            payload.role,
            payload.avatar_url,
            payload.department,
            payload.contact,
            payload.status or "Active",
            payload.shift or "Morning",
            payload.bio,
            payload.consultation_fee,
        ),
    )
    user_id = cursor.lastrowid

    # Save to doctor_profiles if role is Doctor
    if payload.role == "Doctor":
        cursor.execute(
            """
            INSERT INTO doctor_profiles (user_id, bio, consultation_fee, department, phone_number, shift, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                user_id,
                payload.bio,
                payload.consultation_fee,
                payload.department or "General",
                payload.contact,
                payload.shift or "Morning",
                payload.status or "Active",
            ),
        )

    # Auto-create a patients record when a Patient registers
    if payload.role == "Patient":
        cursor.execute(
            """
            INSERT INTO patients (full_name, contact, status, user_id, created_by)
            VALUES (%s, %s, 'Outpatient', %s, %s)
            """,
            (payload.full_name, payload.contact, user_id, user_id),
        )

    # Audit log
    cursor.execute(
        "INSERT INTO audit_logs (action, user_id, user_role, details) VALUES (%s, %s, %s, %s)",
        (f"User registered", user_id, payload.role, f"{payload.full_name} ({payload.email}) registered as {payload.role}"),
    )

    conn.commit()
    cursor.execute(
        """
        SELECT id, email, full_name, role, avatar_url, department, contact, status, shift, bio, consultation_fee, created_at
        FROM users WHERE id = %s
        """,
        (user_id,),
    )
    user = cursor.fetchone() or {}
    cursor.close()
    return user


@router.post("/login")
def login_user(payload: UserLogin, conn=Depends(get_conn)):
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, email, full_name, role, password_hash FROM users WHERE email = %s", (payload.email,))
        user = cursor.fetchone()
        cursor.close()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        if not verify_password(payload.password, user["password_hash"]):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        token = create_access_token({"id": user["id"], "email": user["email"], "role": user["role"]})

        # Audit log
        cursor2 = conn.cursor()
        cursor2.execute(
            "INSERT INTO audit_logs (action, user_id, user_role, details) VALUES (%s, %s, %s, %s)",
            ("User logged in", user["id"], user["role"], f"{user['full_name']} logged in"),
        )
        conn.commit()
        cursor2.close()

        return {"access_token": token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Login error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")


@router.get("/me", response_model=UserOut)
def get_me(user=Depends(get_current_user)):
    return user
