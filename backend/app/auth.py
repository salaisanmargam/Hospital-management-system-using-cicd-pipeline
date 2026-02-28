import os
import logging
import json
from datetime import datetime, timedelta
from typing import Any, Dict

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from .db import get_conn, dict_cursor

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")
security = HTTPBearer()

JWT_SECRET = os.getenv("JWT_SECRET", "change_this_secret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(subject: Dict[str, Any]) -> str:
    expires = datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)
    # Convert dict to JSON string for JWT "sub" claim (must be string)
    to_encode = {"sub": json.dumps(subject), "exp": expires}
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), conn=Depends(get_conn)) -> Dict[str, Any]:
    token = credentials.credentials
    logger.info(f"Token received: {token[:20]}...")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        logger.info(f"Token decoded successfully, payload: {payload}")
        # Parse subject back from JSON string
        subject = json.loads(payload.get("sub", "{}"))
        if not subject:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError as exc:
        logger.error(f"JWT decode error: {exc}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    cursor = dict_cursor(conn)
    cursor.execute(
        """
        SELECT id, email, full_name, role, avatar_url, department, contact, status, shift, bio, consultation_fee, created_at
        FROM users WHERE id = %s
        """,
        (subject.get("id"),),
    )
    user = cursor.fetchone() or {}
    cursor.close()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return dict(user)
