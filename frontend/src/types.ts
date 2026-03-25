export enum UserRole {
  ADMIN = 'Admin',
  DOCTOR = 'Doctor',
  NURSE = 'Nurse',
  PATIENT = 'Patient',
  RECEPTIONIST = 'Receptionist',
  LAB_TECHNICIAN = 'Lab Technician',
  PHARMACIST = 'Pharmacist'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  contact?: string;
  shift?: string;
  bio?: string;
  consultationFee?: number;
  avatarUrl?: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  contact: string;
  lastVisit: string;
  condition: string;
  status: 'Inpatient' | 'Outpatient' | 'Discharged';
  bloodType: string;
  allergies?: string;
}

export interface Vitals {
  bp: string;
  heartRate: string;
  temperature: string;
  spO2: string;
  lastUpdated: string;
}

export interface Bed {
  id: string;
  ward: string;
  number: string;
  status: 'Available' | 'Occupied' | 'Maintenance';
  patientId?: string;
  patientName?: string;
}

export interface Staff {
  id: string;
  name: string;
  role: UserRole;
  department: string;
  contact: string;
  status: 'Active' | 'On Leave';
  shift: 'Morning' | 'Evening' | 'Night';
  avatarUrl?: string;
  bio?: string;
  consultationFee?: number;
}

export enum AppointmentStatus {
  SCHEDULED = 'Scheduled',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
  EMERGENCY = 'Emergency'
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  department: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  type: 'General Checkup' | 'Surgery' | 'Consultation' | 'Follow-up';
}

export interface StatMetric {
  label: string;
  value: string | number;
  change: number; // percentage
  trend: 'up' | 'down' | 'neutral';
}

export interface Bill {
  id: string;
  patientName: string;
  date: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
}

export interface LabTest {
  id: string;
  patientId?: string;
  patientName: string;
  doctorId?: string;
  testName: string;
  doctorName: string;
  date: string;
  department: 'Pathology' | 'Radiology' | 'Microbiology' | 'Biochemistry'; 
  priority: 'Normal' | 'Urgent';
  status: 'Pending' | 'In Progress' | 'Completed';
  resultText?: string;
  resultFileUrl?: string;
}

export interface Medicine {
  id: string;
  name: string;
  category: string;
  stock: number;
  minRequiredStock?: number;
  unit: string;
  price: number;
  expiryDate: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

export interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  medicines: {
    name: string;
    dosage: string;
    quantity: number;
    unitPrice?: number;
    lineTotal?: number;
  }[];
  totalCost?: number;
  status: 'Dispensed' | 'Pending';
  doctorName: string;
  priority: 'Normal' | 'Urgent';
}

export interface AuditLog {
  id: string;
  action: string;
  user: string;
  role: string;
  timestamp: string;
  details: string;
}

export type NurseOrderType = 'Medication' | 'Observation' | 'Procedure' | 'Diet' | 'Mobility' | 'Other';
export type NurseOrderStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';

export interface NurseOrder {
  id: string;
  patient_id: string;
  patient_name: string;
  doctor_id: string;
  doctor_name: string;
  nurse_id?: string;
  nurse_name?: string;
  order_type: NurseOrderType;
  instructions: string;
  priority: 'Normal' | 'Urgent';
  status: NurseOrderStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}