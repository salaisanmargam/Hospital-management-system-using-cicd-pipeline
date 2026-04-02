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
  patientId: string;
  patientName: string;
  date: string;
  dueDate?: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  paidAmount?: number;
  balanceAmount?: number;
  appointmentAmount?: number;
  nurseMedicationAmount?: number;
  labAmount?: number;
  bedAmount?: number;
  medicineAmount?: number;
  nurseMedicationOrders?: number;
  bedDays?: number;
}

export interface BillDetailResponse {
  summary: Bill;
  appointments: Array<{
    id: number;
    appointment_date: string;
    appointment_time?: string;
    type: string;
    status: string;
    doctor_name?: string;
    amount: number;
  }>;
  nurse_medications: Array<{
    id: number;
    administered_at: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    medicine_name?: string;
    administered_by_name?: string;
    nurse_order_id?: number;
  }>;
  bed_stays: Array<{
    id: number;
    admitted_at: string;
    discharged_at?: string;
    daily_rate: number;
    ward?: string;
    bed_number?: string;
    days: number;
    line_total: number;
  }>;
  medicine_items: Array<{
    prescription_id: number;
    date: string;
    status: string;
    item_id: number;
    medicine_name: string;
    dosage?: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  lab_tests: Array<{
    id: number;
    test_date: string;
    test_name: string;
    department: string;
    priority: string;
    status: string;
    line_total: number;
  }>;
  payments: Array<{
    id: number;
    amount: number;
    paid_at: string;
    method: string;
    notes?: string;
    received_by_name?: string;
  }>;
}

export interface BillingContributionItem {
  id: number;
  source_role: string;
  source_module: string;
  source_id: string;
  description: string;
  amount: number;
  event_date?: string;
  status: string;
  submitted_at?: string;
}

export interface BillingContributionResponse {
  patient_id: string;
  total_amount: number;
  items: BillingContributionItem[];
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