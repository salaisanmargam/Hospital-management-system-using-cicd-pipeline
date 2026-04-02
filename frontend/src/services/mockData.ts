import { User, UserRole, Patient, Appointment, AppointmentStatus, Bill, Staff, LabTest, Medicine, Bed, AuditLog, Vitals, Prescription } from '../types';

export type MockAuthUser = {
  user: User;
  password: string;
};

type DoctorSeed = {
  id: string;
  name: string;
  department: string;
  contact: string;
  status: 'Active' | 'On Leave';
  shift: 'Morning' | 'Evening' | 'Night';
  email: string;
};

const DOCTOR_SEED: DoctorSeed[] = [
  { id: 'd1', name: 'Dr. Aarav Patel', department: 'Cardiology', contact: '555-0110', status: 'Active', shift: 'Morning', email: 'aarav.patel@medcore.com' },
  { id: 'd2', name: 'Dr. Meera Iyer', department: 'Cardiology', contact: '555-0111', status: 'Active', shift: 'Evening', email: 'meera.iyer@medcore.com' },
  { id: 'd3', name: 'Dr. Rohan Mehta', department: 'Cardiology', contact: '555-0112', status: 'Active', shift: 'Night', email: 'rohan.mehta@medcore.com' },
  { id: 'd4', name: 'Dr. Ananya Rao', department: 'Cardiology', contact: '555-0113', status: 'On Leave', shift: 'Morning', email: 'ananya.rao@medcore.com' },
  { id: 'd5', name: 'Dr. Vivaan Sharma', department: 'Pediatrics', contact: '555-0114', status: 'Active', shift: 'Morning', email: 'vivaan.sharma@medcore.com' },
  { id: 'd6', name: 'Dr. Kiara Nair', department: 'Pediatrics', contact: '555-0115', status: 'Active', shift: 'Evening', email: 'kiara.nair@medcore.com' },
  { id: 'd7', name: 'Dr. Arjun Verma', department: 'Pediatrics', contact: '555-0116', status: 'Active', shift: 'Night', email: 'arjun.verma@medcore.com' },
  { id: 'd8', name: 'Dr. Sana Qureshi', department: 'Pediatrics', contact: '555-0117', status: 'On Leave', shift: 'Morning', email: 'sana.qureshi@medcore.com' },
  { id: 'd9', name: 'Dr. Neha Kulkarni', department: 'Dermatology', contact: '555-0118', status: 'Active', shift: 'Morning', email: 'neha.kulkarni@medcore.com' },
  { id: 'd10', name: 'Dr. Aditya Singh', department: 'Dermatology', contact: '555-0119', status: 'Active', shift: 'Evening', email: 'aditya.singh@medcore.com' },
  { id: 'd11', name: 'Dr. Isha Kapoor', department: 'Dermatology', contact: '555-0120', status: 'Active', shift: 'Night', email: 'isha.kapoor@medcore.com' },
  { id: 'd12', name: 'Dr. Rahul Desai', department: 'Pulmonology', contact: '555-0121', status: 'Active', shift: 'Morning', email: 'rahul.desai@medcore.com' },
  { id: 'd13', name: 'Dr. Pooja Menon', department: 'Pulmonology', contact: '555-0122', status: 'Active', shift: 'Evening', email: 'pooja.menon@medcore.com' },
  { id: 'd14', name: 'Dr. Sameer Bansal', department: 'Pulmonology', contact: '555-0123', status: 'Active', shift: 'Night', email: 'sameer.bansal@medcore.com' },
  { id: 'd15', name: 'Dr. Devansh Gupta', department: 'General Doctor', contact: '555-0124', status: 'Active', shift: 'Morning', email: 'devansh.gupta@medcore.com' },
  { id: 'd16', name: 'Dr. Riya Malhotra', department: 'General Doctor', contact: '555-0125', status: 'Active', shift: 'Evening', email: 'riya.malhotra@medcore.com' },
  { id: 'd17', name: 'Dr. Naveen Rao', department: 'General Doctor', contact: '555-0126', status: 'Active', shift: 'Night', email: 'naveen.rao@medcore.com' },
  { id: 'd18', name: 'Dr. Karan Das', department: 'Dentist', contact: '555-0127', status: 'Active', shift: 'Morning', email: 'karan.das@medcore.com' },
  { id: 'd19', name: 'Dr. Leena Thomas', department: 'Dentist', contact: '555-0128', status: 'Active', shift: 'Evening', email: 'leena.thomas@medcore.com' },
  { id: 'd20', name: 'Dr. Priya Shah', department: 'Dentist', contact: '555-0129', status: 'Active', shift: 'Night', email: 'priya.shah@medcore.com' },
];

const buildAvatarUrl = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D9488&color=fff`;

const DOCTOR_STAFF: Staff[] = DOCTOR_SEED.map((doctor) => ({
  id: doctor.id,
  name: doctor.name,
  role: UserRole.DOCTOR,
  department: doctor.department,
  contact: doctor.contact,
  status: doctor.status,
  shift: doctor.shift,
  avatarUrl: buildAvatarUrl(doctor.name),
}));

export const MOCK_AUTH_USERS: MockAuthUser[] = DOCTOR_SEED.map((doctor) => ({
  user: {
    id: doctor.id,
    name: doctor.name,
    email: doctor.email,
    role: UserRole.DOCTOR,
    department: doctor.department,
    avatarUrl: buildAvatarUrl(doctor.name),
  },
  password: 'Medcore@123',
}));

export const CURRENT_USER: User = {
  id: 'u1',
  name: 'Dr. Sarah Bennett',
  email: 'sarah.bennett@medcore.com',
  role: UserRole.DOCTOR,
  avatarUrl: 'https://picsum.photos/200/200'
};

export const STAFF_DATA: Staff[] = [
  { id: 's1', name: 'Dr. Sarah Bennett', role: UserRole.DOCTOR, department: 'Cardiology', contact: '555-0201', status: 'Active', shift: 'Morning', avatarUrl: 'https://picsum.photos/200/200' },
  { id: 's2', name: 'Dr. James Wilson', role: UserRole.DOCTOR, department: 'Neurology', contact: '555-0202', status: 'On Leave', shift: 'Evening', avatarUrl: 'https://picsum.photos/201/201' },
  { id: 's3', name: 'Dr. Emily Chen', role: UserRole.DOCTOR, department: 'Pediatrics', contact: '555-0203', status: 'Active', shift: 'Morning', avatarUrl: 'https://picsum.photos/202/202' },
  { id: 's4', name: 'Nurse Jackie', role: UserRole.NURSE, department: 'General Doctor', contact: '555-0301', status: 'Active', shift: 'Night', avatarUrl: 'https://picsum.photos/203/203' },
  { id: 's5', name: 'Nurse Ben', role: UserRole.NURSE, department: 'General Ward', contact: '555-0302', status: 'Active', shift: 'Evening', avatarUrl: 'https://picsum.photos/204/204' },
  { id: 's6', name: 'Tech. Mike', role: UserRole.LAB_TECHNICIAN, department: 'Dentist', contact: '555-0401', status: 'Active', shift: 'Morning', avatarUrl: 'https://picsum.photos/205/205' },
  { id: 's7', name: 'Pharm. Lisa', role: UserRole.PHARMACIST, department: 'Pharmacy', contact: '555-0501', status: 'Active', shift: 'Morning', avatarUrl: 'https://picsum.photos/206/206' },
  ...DOCTOR_STAFF,
];

export const PATIENTS: Patient[] = [
  { id: 'p1', name: 'John Doe', age: 45, gender: 'Male', contact: '555-0101', lastVisit: '2023-10-25', condition: 'Hypertension', status: 'Outpatient', bloodType: 'O+', allergies: 'Peanuts' },
  { id: 'p2', name: 'Jane Smith', age: 32, gender: 'Female', contact: '555-0102', lastVisit: '2023-10-28', condition: 'Pregnancy', status: 'Outpatient', bloodType: 'A+', allergies: 'None' },
  { id: 'p3', name: 'Robert Brown', age: 67, gender: 'Male', contact: '555-0103', lastVisit: '2023-10-29', condition: 'Cardiac Arrest Recovery', status: 'Inpatient', bloodType: 'B-', allergies: 'Penicillin' },
  { id: 'p4', name: 'Emily White', age: 28, gender: 'Female', contact: '555-0104', lastVisit: '2023-10-20', condition: 'Flu', status: 'Outpatient', bloodType: 'AB+', allergies: 'None' },
];

export const MOCK_VITALS: Record<string, Vitals> = {
  'p1': { bp: '120/80', heartRate: '72', temperature: '98.6', spO2: '98', lastUpdated: '10:00 AM' },
  'p3': { bp: '140/90', heartRate: '85', temperature: '99.1', spO2: '96', lastUpdated: '09:30 AM' },
};

export const APPOINTMENTS: Appointment[] = [
  { id: 'a1', patientId: 'p1', patientName: 'John Doe', doctorId: 'u1', doctorName: 'Dr. Sarah Bennett', department: 'Cardiology', date: '2023-10-30', time: '09:00 AM', status: AppointmentStatus.SCHEDULED, type: 'Follow-up' },
  { id: 'a2', patientId: 'p4', patientName: 'Emily White', doctorId: 'u1', doctorName: 'Dr. Sarah Bennett', department: 'Cardiology', date: '2023-10-30', time: '10:30 AM', status: AppointmentStatus.EMERGENCY, type: 'Consultation' },
  { id: 'a3', patientId: 'p2', patientName: 'Jane Smith', doctorId: 'u2', doctorName: 'Dr. James Wilson', department: 'Neurology', date: '2023-10-31', time: '02:00 PM', status: AppointmentStatus.SCHEDULED, type: 'General Checkup' },
  // Lab Appointments
  { id: 'a4', patientId: 'p2', patientName: 'Jane Smith', doctorId: 's6', doctorName: 'Tech. Mike', department: 'Dentist', date: '2023-10-30', time: '08:00 AM', status: AppointmentStatus.COMPLETED, type: 'General Checkup' },
  { id: 'a5', patientId: 'p3', patientName: 'Robert Brown', doctorId: 's6', doctorName: 'Tech. Mike', department: 'Dentist', date: '2023-10-30', time: '09:15 AM', status: AppointmentStatus.SCHEDULED, type: 'Follow-up' },
  { id: 'a6', patientId: 'p1', patientName: 'John Doe', doctorId: 's6', doctorName: 'Tech. Mike', department: 'Dentist', date: '2023-10-30', time: '11:00 AM', status: AppointmentStatus.SCHEDULED, type: 'Consultation' },
];

export const BILLS: Bill[] = [
  { id: 'b1', patientId: 'p1', patientName: 'John Doe', date: '2023-10-25', amount: 150.00, status: 'Paid' },
  { id: 'b2', patientId: 'p3', patientName: 'Robert Brown', date: '2023-10-29', amount: 5400.00, status: 'Pending' },
  { id: 'b3', patientId: 'p4', patientName: 'Emily White', date: '2023-10-20', amount: 75.00, status: 'Overdue' },
];

export const LAB_TESTS: LabTest[] = [
  { id: 't1', patientName: 'John Doe', testName: 'Complete Blood Count (CBC)', doctorName: 'Dr. Sarah Bennett', date: '2023-10-30', priority: 'Normal', status: 'Completed', department: 'Pathology' },
  { id: 't2', patientName: 'Emily White', testName: 'X-Ray Chest', doctorName: 'Dr. Sarah Bennett', date: '2023-10-30', priority: 'Urgent', status: 'Pending', department: 'Radiology' },
  { id: 't3', patientName: 'Robert Brown', testName: 'Lipid Profile', doctorName: 'Dr. James Wilson', date: '2023-10-31', priority: 'Normal', status: 'In Progress', department: 'Biochemistry' },
  { id: 't4', patientName: 'Jane Smith', testName: 'Urine Culture', doctorName: 'Dr. Sarah Bennett', date: '2023-10-31', priority: 'Normal', status: 'Pending', department: 'Microbiology' },
];

export const MEDICINES: Medicine[] = [
  { id: 'm1', name: 'Amoxicillin', category: 'Antibiotic', stock: 500, unit: 'Tablets', price: 12.50, expiryDate: '2024-12-01', status: 'In Stock' },
  { id: 'm2', name: 'Paracetamol', category: 'Painkiller', stock: 1200, unit: 'Tablets', price: 5.00, expiryDate: '2025-06-15', status: 'In Stock' },
  { id: 'm3', name: 'Insulin Glargine', category: 'Diabetic', stock: 15, unit: 'Vials', price: 45.00, expiryDate: '2024-02-20', status: 'Low Stock' },
  { id: 'm4', name: 'Ibuprofen', category: 'Anti-inflammatory', stock: 0, unit: 'Tablets', price: 8.00, expiryDate: '2024-10-10', status: 'Out of Stock' },
];

export const PRESCRIPTIONS: Prescription[] = [
  {
    id: 'pr1',
    patientId: 'p1',
    patientName: 'John Doe',
    date: '2023-10-30',
    time: '09:30 AM',
    medicines: [
      { name: 'Amoxicillin', dosage: '500mg - 2x daily', quantity: 10 },
      { name: 'Paracetamol', dosage: '500mg - SOS', quantity: 15 }
    ],
    status: 'Dispensed',
    doctorName: 'Dr. Sarah Bennett',
    priority: 'Normal'
  },
  {
    id: 'pr2',
    patientId: 'p4',
    patientName: 'Emily White',
    date: '2023-10-30',
    time: '11:00 AM',
    medicines: [{ name: 'Ibuprofen', dosage: '400mg - 1x daily', quantity: 20 }],
    status: 'Pending',
    doctorName: 'Dr. Sarah Bennett',
    priority: 'Urgent'
  },
  {
    id: 'pr3',
    patientId: 'p3',
    patientName: 'Robert Brown',
    date: '2023-10-30',
    time: '12:15 PM',
    medicines: [{ name: 'Insulin Glargine', dosage: '10 units - Nightly', quantity: 1 }],
    status: 'Pending',
    doctorName: 'Dr. James Wilson',
    priority: 'Normal'
  }
];

export const BEDS: Bed[] = [
  { id: 'bd1', ward: 'General Ward A', number: '101', status: 'Occupied', patientName: 'Robert Brown' },
  { id: 'bd2', ward: 'General Ward A', number: '102', status: 'Available' },
  { id: 'bd3', ward: 'General Ward A', number: '103', status: 'Maintenance' },
  { id: 'bd4', ward: 'ICU', number: '201', status: 'Occupied', patientName: 'Michael Green' },
  { id: 'bd5', ward: 'ICU', number: '202', status: 'Available' },
];

export const AUDIT_LOGS: AuditLog[] = [
  { id: 'l1', action: 'User Login', user: 'Dr. Sarah Bennett', role: 'Doctor', timestamp: '2023-10-30 08:55 AM', details: 'Successful login from IP 192.168.1.5' },
  { id: 'l2', action: 'Update Vitals', user: 'Nurse Jackie', role: 'Nurse', timestamp: '2023-10-30 09:10 AM', details: 'Updated vitals for Patient p3' },
  { id: 'l3', action: 'Prescription Added', user: 'Dr. James Wilson', role: 'Doctor', timestamp: '2023-10-30 10:00 AM', details: 'Prescribed Amoxicillin to Patient p4' },
  { id: 'l4', action: 'Bill Generated', user: 'Admin User', role: 'Receptionist', timestamp: '2023-10-30 11:30 AM', details: 'Generated Invoice #B2 for ₹5400' },
];

export const REVENUE_DATA = [
  { name: 'Jan', revenue: 4000 },
  { name: 'Feb', revenue: 3000 },
  { name: 'Mar', revenue: 2000 },
  { name: 'Apr', revenue: 2780 },
  { name: 'May', revenue: 1890 },
  { name: 'Jun', revenue: 2390 },
  { name: 'Jul', revenue: 3490 },
];

export const APPOINTMENT_STATS = [
  { name: 'Mon', count: 12 },
  { name: 'Tue', count: 19 },
  { name: 'Wed', count: 15 },
  { name: 'Thu', count: 22 },
  { name: 'Fri', count: 18 },
  { name: 'Sat', count: 8 },
  { name: 'Sun', count: 4 },
];