import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { 
  APPOINTMENTS, 
  PATIENTS, 
  MEDICINES, 
  LAB_TESTS, 
  BEDS, 
  PRESCRIPTIONS, 
  BILLS,
  MOCK_VITALS,
  REVENUE_DATA, 
  APPOINTMENT_STATS, 
  AUDIT_LOGS
} from '../services/mockData';
import { 
  Appointment, 
  Patient, 
  Medicine, 
  LabTest, 
  Bed, 
  Prescription, 
  Bill,
  Staff,
  Vitals,
  AppointmentStatus,
  AuditLog
} from '../types';
import { 
    listStaffMembers, 
    listPatients, 
    listAppointments, 
    listMedicines, 
    listBeds, 
    listLabTests, 
    listPrescriptions, 
    listBills, 
    listAuditLogs, 
    listVitals,
    createAppointment,
    updateAppointmentStatus as apiUpdateAppointmentStatus,
    createPrescription,
    updatePrescriptionStatus as apiUpdatePrescriptionStatus,
    createLabTest,
    updateLabTestStatus as apiUpdateLabTestStatus,
    updateMedicineStock as apiUpdateMedicineStock,
    updateBedStatus,
    updatePatientStatus,
    upsertVitals,
    AUTH_STORAGE_KEY 
} from '../services/api';

const DEFAULT_MIN_REQUIRED_STOCK = 20;

const getMedicineStatusFromStock = (stock: number, minRequiredStock: number): Medicine['status'] => {
  if (stock <= 0) return 'Out of Stock';
  if (stock <= minRequiredStock) return 'Low Stock';
  return 'In Stock';
};

interface DataContextType {
  patients: Patient[];
  appointments: Appointment[];
  medicines: Medicine[];
  labTests: LabTest[];
  beds: Bed[];
  prescriptions: Prescription[];
  bills: Bill[];
  staff: Staff[];
  vitals: Record<string, Vitals>;
  revenueData: any[];
  appointmentStats: any[];
  auditLogs: AuditLog[];
  isLoading: boolean;
  
  // Actions
  refreshAllData: (token: string) => Promise<void>;
  refreshPatients: () => Promise<void>;
  refreshStaff: (token: string) => Promise<void>;
  addAppointment: (appt: Appointment) => void;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => void;
  addPrescription: (rx: Prescription) => void;
  updatePrescriptionStatus: (id: string, status: Prescription['status']) => void;
  addLabTest: (test: LabTest) => void;
  updateLabTestStatus: (id: string, status: LabTest['status'], resultText?: string, resultFileUrl?: string) => void;
  restockMedicine: (medicineId: string, quantity: number) => void;
  admitPatient: (bedId: string, patientId: string, patientName: string) => void;
  dischargePatient: (bedId: string) => void;
  blockBedForMaintenance: (bedId: string) => void;
  markBedReady: (bedId: string) => void;
  updateVitals: (patientId: string, vitals: Vitals) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state (Starts empty, will be replaced by backend)
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [beds, setBeds] = useState<Bed[]>(BEDS);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [vitals, setVitals] = useState<Record<string, Vitals>>({});
  const [revenueData] = useState<any[]>(REVENUE_DATA); // These charts can stay for now or be fetched too
  const [appointmentStats] = useState<any[]>(APPOINTMENT_STATS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // --- Actions ---

  const refreshAllData = useCallback(async (token: string) => {
    setIsLoading(true);
    try {
      const [
        staffRes,
        patientsRes,
        appointmentsRes,
        medicinesRes,
        bedsRes,
        labTestsRes,
        prescriptionsRes,
        billsRes,
        logsRes,
        vitalsRes,
      ] = await Promise.allSettled([
        listStaffMembers(token),
        listPatients(token),
        listAppointments(token),
        listMedicines(token),
        listBeds(token),
        listLabTests(token),
        listPrescriptions(token),
        listBills(token),
        listAuditLogs(token),
        listVitals(token),
      ]);

      const dbStaff        = staffRes.status        === 'fulfilled' ? staffRes.value        : null;
      const dbPatients     = patientsRes.status     === 'fulfilled' ? patientsRes.value     : null;
      const dbAppointments = appointmentsRes.status === 'fulfilled' ? appointmentsRes.value : null;
      const dbMedicines    = medicinesRes.status    === 'fulfilled' ? medicinesRes.value    : null;
      const dbBeds         = bedsRes.status         === 'fulfilled' ? bedsRes.value         : null;
      const dbLabTests     = labTestsRes.status     === 'fulfilled' ? labTestsRes.value     : null;
      const dbPrescriptions= prescriptionsRes.status=== 'fulfilled' ? prescriptionsRes.value: null;
      const dbBills        = billsRes.status        === 'fulfilled' ? billsRes.value        : null;
      const dbLogs         = logsRes.status         === 'fulfilled' ? logsRes.value         : null;
      const dbVitals       = vitalsRes.status       === 'fulfilled' ? vitalsRes.value       : null;

      // Log any individual failures for debugging
      [staffRes, patientsRes, appointmentsRes, medicinesRes, bedsRes,
       labTestsRes, prescriptionsRes, billsRes, logsRes, vitalsRes
      ].forEach((r, i) => {
        if (r.status === 'rejected') {
          const names = ['staff','patients','appointments','medicines','beds','labTests','prescriptions','bills','logs','vitals'];
          console.warn(`[MedCore] Failed to load ${names[i]}:`, r.reason);
        }
      });

      setStaff(dbStaff || []);
      
      if (Array.isArray(dbPatients)) {
        setPatients(dbPatients.map(p => ({
          ...p,
          id: String(p.id),
          name: p.full_name,
          condition: p.medical_condition,   // Patient interface uses 'condition'
          lastVisit: p.last_visit,
          bloodType: p.blood_type,
        })));
      }
      
      if (Array.isArray(dbAppointments)) {
        setAppointments(dbAppointments.map((a: any) => ({
          ...a,
          id: String(a.id),
          patientId: String(a.patient_id),
          patientName: a.patient_name || 'Unknown Patient',
          doctorId: String(a.doctor_id),
          doctorName: a.doctor_name || 'Unknown Doctor',
          date: a.appointment_date,
          time: a.appointment_time,
          status: a.status as AppointmentStatus,
          type: a.type
        })));
      }

      if (Array.isArray(dbMedicines)) {
        setMedicines(dbMedicines.map(m => {
          const stock = Number(m.stock || 0);
          const minRequiredStock = Number(m.min_required_stock || m.minRequiredStock || DEFAULT_MIN_REQUIRED_STOCK);
          return {
            ...m,
            id: String(m.id),
            stock,
            minRequiredStock,
            expiryDate: m.expiry_date,
            status: getMedicineStatusFromStock(stock, minRequiredStock),
          };
        }));
      }

      if (Array.isArray(dbBeds)) {
        const mapped = dbBeds.map(b => ({ ...b, id: String(b.id), number: b.bed_number, patientId: b.patient_id ? String(b.patient_id) : undefined, patientName: b.patient_name }));
        // Deduplicate by (ward, number) — keep the occupied row if there's a conflict
        const seen = new Map<string, typeof mapped[0]>();
        for (const bed of mapped) {
          const key = `${bed.ward}||${bed.number}`;
          const existing = seen.get(key);
          if (!existing || (!existing.patientId && bed.patientId)) seen.set(key, bed);
        }
        setBeds(Array.from(seen.values()));
      }

      if (Array.isArray(dbLabTests)) {
        setLabTests(dbLabTests.map(t => ({
          ...t,
          id: String(t.id),
          patientId: String(t.patient_id),
          doctorId: String(t.doctor_id),
          date: t.test_date,
          patientName: t.patient_name || 'Unknown Patient',
          testName: t.test_name,
          doctorName: t.doctor_name || 'Unknown Doctor',
          resultText: t.result_text || undefined,
          resultFileUrl: t.result_file_url || undefined,
        })));
      }

      if (Array.isArray(dbPrescriptions)) {
        setPrescriptions(dbPrescriptions.map(p => ({
          ...p,
          id: String(p.id),
          patientId: String(p.patient_id),
          doctorId: String(p.doctor_id),
          patientName: p.patient_name || 'Unknown Patient',
          doctorName: p.doctor_name || 'Unknown Doctor',
          totalCost: typeof p.total_cost === 'number' ? p.total_cost : (typeof p.totalCost === 'number' ? p.totalCost : 0),
          medicines: (p.medicines || []).map((m: any) => ({
            name: m.name,
            dosage: m.dosage,
            quantity: Number(m.quantity || 0),
            unitPrice: typeof m.unit_price === 'number' ? m.unit_price : (typeof m.unitPrice === 'number' ? m.unitPrice : 0),
            lineTotal: typeof m.line_total === 'number' ? m.line_total : (typeof m.lineTotal === 'number' ? m.lineTotal : 0),
          })),
        })));
      }

      if (Array.isArray(dbBills)) {
        setBills(dbBills.map(b => ({ ...b, id: String(b.id), patientId: String(b.patient_id), patientName: b.patient_name || 'Unknown Patient' })));
      }

      if (Array.isArray(dbLogs)) {
        setAuditLogs(dbLogs.map(l => ({ ...l, id: String(l.id), user: l.user_name || 'System', role: l.user_role || '', timestamp: l.timestamp })));
      }

      // Map vitals: array to Record<patientId, Vitals>
      if (Array.isArray(dbVitals)) {
        const vitalsMap: Record<string, Vitals> = {};
        for (const v of dbVitals) {
          vitalsMap[String(v.patient_id)] = {
            bp: v.bp || '',
            heartRate: v.heart_rate || '',
            temperature: v.temperature || '',
            spO2: v.spo2 || '',
            lastUpdated: v.last_updated ? new Date(v.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          };
        }
        setVitals(vitalsMap);
      }

    } catch (err) {
      console.error('Failed to refresh data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshPatients = useCallback(async () => {
    const auth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!auth) return;
    try {
      const { token } = JSON.parse(auth);
      if (token) await refreshAllData(token);
    } catch {}
  }, [refreshAllData]);

  const refreshStaff = useCallback(async (token: string) => {
    console.log('Refreshing staff with token...');
    try {
      const dbStaff = await listStaffMembers(token);
      console.log(`Fetched ${dbStaff.length} staff members total`);
      setStaff(dbStaff);
    } catch (err) {
      console.error('Failed to refresh staff:', err);
    }
  }, []);

  // auto refresh on token load
  useEffect(() => {
    const auth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (auth) {
        try {
            const { token } = JSON.parse(auth);
            if (token) refreshAllData(token);
        } catch {}
    }
  }, [refreshAllData]);

  // Helper to get current token
  const getToken = useCallback((): string | null => {
    const auth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!auth) return null;
    try {
      const { token } = JSON.parse(auth);
      return token || null;
    } catch { return null; }
  }, []);

  const addAppointment = useCallback(async (appt: Appointment) => {
    const token = getToken();
    if (!token) { setAppointments(prev => [...prev, appt]); return; }
    try {
      // Find the patient_id from the patients list
      const patient = patients.find(p => p.name === appt.patientName);
      const doctor = staff.find(s => s.name === appt.doctorName);
      await createAppointment(token, {
        patient_id: patient ? Number(patient.id) : Number(appt.patientId),
        doctor_id: doctor ? Number(doctor.id) : Number(appt.doctorId),
        department: appt.department,
        appointment_date: appt.date,
        appointment_time: appt.time,
        status: appt.status,
        type: appt.type,
      });
      await refreshAllData(token);
    } catch (err) {
      console.error('Failed to create appointment:', err);
      setAppointments(prev => [...prev, appt]);
    }
  }, [getToken, patients, staff, refreshAllData]);

  const updateAppointmentStatus = useCallback(async (id: string, status: Appointment['status']) => {
    const token = getToken();
    if (!token) { setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a)); return; }
    try {
      await apiUpdateAppointmentStatus(token, id, status);
      await refreshAllData(token);
    } catch (err) {
      console.error('Failed to update appointment status:', err);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    }
  }, [getToken, refreshAllData]);

  const addPrescription = useCallback(async (rx: Prescription) => {
    const token = getToken();
    if (!token) { setPrescriptions(prev => [...prev, rx]); return; }
    try {
      const patient = patients.find(p => p.name === rx.patientName);
      const doctor = staff.find(s => s.name === rx.doctorName);
      await createPrescription(token, {
        patient_id: patient ? Number(patient.id) : Number(rx.patientId),
        doctor_id: doctor ? Number(doctor.id) : undefined,
        date: rx.date,
        time: rx.time,
        status: rx.status || 'Pending',
        priority: rx.priority || 'Normal',
        items: rx.medicines.map(m => ({
          medicine_name: m.name,
          dosage: m.dosage,
          quantity: m.quantity,
        })),
      });
      await refreshAllData(token);
    } catch (err) {
      console.error('Failed to create prescription:', err);
      setPrescriptions(prev => [...prev, rx]);
    }
  }, [getToken, patients, staff, refreshAllData]);

  const updatePrescriptionStatus = useCallback(async (id: string, status: Prescription['status']) => {
    const token = getToken();
    if (!token) { setPrescriptions(prev => prev.map(p => p.id === id ? { ...p, status } : p)); return; }
    try {
      await apiUpdatePrescriptionStatus(token, id, status);
      await refreshAllData(token);
    } catch (err) {
      console.error('Failed to update prescription status:', err);
      setPrescriptions(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    }
  }, [getToken, refreshAllData]);

  const addLabTest = useCallback(async (test: LabTest) => {
    const token = getToken();
    if (!token) { setLabTests(prev => [...prev, test]); return; }
    try {
      const patient = patients.find(p => p.name === test.patientName);
      await createLabTest(token, {
        patient_id: patient ? Number(patient.id) : undefined,
        test_name: test.testName,
        department: test.department,
        test_date: test.date,
        priority: test.priority || 'Normal',
        status: 'Pending',
      });
      await refreshAllData(token);
    } catch (err) {
      console.error('Failed to create lab test:', err);
      setLabTests(prev => [...prev, test]);
    }
  }, [getToken, patients, refreshAllData]);

  const updateLabTestStatus = useCallback(async (id: string, status: LabTest['status'], resultText?: string, resultFileUrl?: string) => {
    const token = getToken();
    if (!token) {
      setLabTests(prev => prev.map(t => t.id === id ? { ...t, status, resultText: resultText ?? t.resultText, resultFileUrl: resultFileUrl ?? t.resultFileUrl } : t));
      return;
    }
    try {
      await apiUpdateLabTestStatus(token, id, status, resultText, resultFileUrl);
      await refreshAllData(token);
    } catch (err) {
      console.error('Failed to update lab test status:', err);
      setLabTests(prev => prev.map(t => t.id === id ? { ...t, status, resultText: resultText ?? t.resultText, resultFileUrl: resultFileUrl ?? t.resultFileUrl } : t));
    }
  }, [getToken, refreshAllData]);

  const restockMedicine = useCallback(async (medicineId: string, quantity: number) => {
    const safeQuantity = Math.max(0, Math.floor(Number(quantity || 0)));
    if (safeQuantity <= 0) return;

    const token = getToken();
    if (!token) {
      setMedicines(prev => prev.map(m => {
        if (m.id !== medicineId) return m;
        const newStock = m.stock + safeQuantity;
        const minRequiredStock = m.minRequiredStock ?? DEFAULT_MIN_REQUIRED_STOCK;
        return { ...m, stock: newStock, status: getMedicineStatusFromStock(newStock, minRequiredStock) };
      }));
      return;
    }

    try {
      await apiUpdateMedicineStock(token, medicineId, safeQuantity);
      await refreshAllData(token);
    } catch (err) {
      console.error('Failed to restock medicine:', err);
      setMedicines(prev => prev.map(m => {
        if (m.id !== medicineId) return m;
        const newStock = m.stock + safeQuantity;
        const minRequiredStock = m.minRequiredStock ?? DEFAULT_MIN_REQUIRED_STOCK;
        return { ...m, stock: newStock, status: getMedicineStatusFromStock(newStock, minRequiredStock) };
      }));
    }
  }, [getToken, refreshAllData]);

  const admitPatient = useCallback(async (bedId: string, patientId: string, patientName: string) => {
    const token = getToken();
    if (!token) {
      setBeds(prev => prev.map(b => b.id === bedId ? { ...b, status: 'Occupied', patientId, patientName } : b));
      setPatients(prev => prev.map(p => p.id === patientId ? { ...p, status: 'Inpatient' } : p));
      return;
    }
    try {
      await updateBedStatus(token, bedId, 'Occupied', patientId);
      await updatePatientStatus(token, patientId, 'Inpatient');
      await refreshAllData(token);
    } catch (err) {
      console.error('Failed to admit patient:', err);
      setBeds(prev => prev.map(b => b.id === bedId ? { ...b, status: 'Occupied', patientId, patientName } : b));
      setPatients(prev => prev.map(p => p.id === patientId ? { ...p, status: 'Inpatient' } : p));
    }
  }, [getToken, refreshAllData]);

  const dischargePatient = useCallback(async (bedId: string) => {
    const token = getToken();
    if (!token) {
      setBeds(prev => {
        const bed = prev.find(b => b.id === bedId);
        if (bed && bed.patientId) {
           setPatients(pp => pp.map(p => p.id === bed.patientId ? { ...p, status: 'Discharged' } : p));
        }
        return prev.map(b => b.id === bedId ? { ...b, status: 'Available', patientId: undefined, patientName: undefined } : b);
      });
      return;
    }
    try {
      // Find the patient before clearing the bed
      const bed = beds.find(b => b.id === bedId);
      await updateBedStatus(token, bedId, 'Maintenance');
      if (bed?.patientId) {
        await updatePatientStatus(token, bed.patientId, 'Discharged');
      }
      await refreshAllData(token);
    } catch (err) {
      console.error('Failed to discharge patient:', err);
      setBeds(prev => prev.map(b => b.id === bedId ? { ...b, status: 'Maintenance', patientId: undefined, patientName: undefined } : b));
    }
  }, [getToken, beds, refreshAllData]);

  const blockBedForMaintenance = useCallback(async (bedId: string) => {
    const token = getToken();
    setBeds(prev => prev.map(b => b.id === bedId ? { ...b, status: 'Maintenance' } : b));
    if (!token) return;
    try {
      await updateBedStatus(token, bedId, 'Maintenance');
    } catch (err) {
      console.error('Failed to block bed for maintenance:', err);
    }
  }, [getToken]);

  const markBedReady = useCallback(async (bedId: string) => {
    const token = getToken();
    setBeds(prev => prev.map(b => b.id === bedId ? { ...b, status: 'Available' } : b));
    if (!token) return;
    try {
      await updateBedStatus(token, bedId, 'Available');
    } catch (err) {
      console.error('Failed to mark bed as ready:', err);
    }
  }, [getToken]);

  const updateVitals = useCallback(async (patientId: string, newVitals: Vitals) => {
    const token = getToken();
    setVitals(prev => ({ ...prev, [patientId]: newVitals }));
    if (!token) return;
    try {
      await upsertVitals(token, {
        patient_id: Number(patientId),
        bp: newVitals.bp,
        heart_rate: newVitals.heartRate,
        temperature: newVitals.temperature,
        spo2: newVitals.spO2,
      });
    } catch (err) {
      console.error('Failed to save vitals:', err);
    }
  }, [getToken]);

  return (
    <DataContext.Provider value={{
      patients,
      appointments,
      medicines,
      labTests,
      beds,
      prescriptions,
      bills,
      staff,
      vitals,
      revenueData,
      appointmentStats,
      auditLogs,
      isLoading,
      refreshAllData,
      refreshPatients,
      refreshStaff,
      addAppointment,
      updateAppointmentStatus,
      addPrescription,
      updatePrescriptionStatus,
      addLabTest,
      updateLabTestStatus,
      restockMedicine,
      admitPatient,
      dischargePatient,
      blockBedForMaintenance,
      markBedReady,
      updateVitals
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};