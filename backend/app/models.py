from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str = "Patient"
    department: Optional[str] = None
    contact: Optional[str] = None
    status: Optional[str] = None
    shift: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    consultation_fee: Optional[float] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    department: Optional[str] = None
    contact: Optional[str] = None
    status: Optional[str] = None
    shift: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    consultation_fee: Optional[float] = None
    created_at: datetime


class PatientCreate(BaseModel):
    full_name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    contact: Optional[str] = None
    last_visit: Optional[date] = None
    medical_condition: Optional[str] = None
    status: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: Optional[str] = None


class PatientOut(PatientCreate):
    id: int
    created_at: datetime


class StaffCreate(BaseModel):
    full_name: str
    role: str
    email: Optional[EmailStr] = None
    department: Optional[str] = None
    contact: Optional[str] = None
    status: Optional[str] = None
    shift: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    consultation_fee: Optional[float] = None


class StaffOut(StaffCreate):
    id: int
    created_at: datetime


class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_id: int
    department: Optional[str] = None
    appointment_date: Optional[date] = None
    appointment_time: Optional[str] = None
    status: str = "Scheduled"
    type: str = "General Checkup"


class AppointmentOut(AppointmentCreate):
    id: int
    created_at: datetime
