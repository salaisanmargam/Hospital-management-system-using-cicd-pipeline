import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Users, Calendar, AlertCircle, IndianRupee, TrendingUp, Activity, Clock, FileText, BedDouble, ShieldCheck, Stethoscope, Mail, Phone, Sun, FlaskConical, Microscope, ScanLine, Package, AlertTriangle, Pill, ArrowRight, HeartPulse, ClipboardList, Plus, X, AlertCircle as AlertCircleIcon } from 'lucide-react';
import { User, UserRole, AppointmentStatus, NurseOrderType, Staff } from '../types';
import { useData } from '../contexts/DataContext';
import { createNurseOrder, AUTH_STORAGE_KEY } from '../services/api';

const StatCard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  color: string;
  delay?: number;
}> = ({ title, value, icon, trend, color, delay = 0 }) => (
  <div
    className="glass-card rounded-2xl p-6 card-hover group relative overflow-hidden animate-fade-in-up opacity-0"
    style={{ animationDelay: `${delay}s`, animationFillMode: 'forwards' }}
  >
    {/* Gradient accent bar */}
    <div className={`absolute top-0 left-0 w-1 h-full ${color} rounded-l-2xl opacity-60 group-hover:opacity-100 transition-opacity`}></div>
    <div className={`absolute top-0 left-0 w-full h-0.5 ${color} opacity-0 group-hover:opacity-30 transition-opacity`}></div>

    <div className="flex justify-between items-start relative">
      <div>
        <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-display font-bold text-slate-900">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${color} text-white shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
        {icon}
      </div>
    </div>
    {trend && (
      <div className="mt-4 flex items-center text-sm">
        <div className="flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full">
          <TrendingUp size={14} className="text-emerald-500" />
          <span className="text-emerald-600 font-semibold text-xs">{trend}</span>
        </div>
        <span className="text-slate-400 text-xs ml-2">vs last month</span>
      </div>
    )}
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-xl px-4 py-3 shadow-xl border border-white/20">
        <p className="font-semibold text-slate-700 text-sm">{label}</p>
        {payload.map((item: any, idx: number) => (
          <p key={idx} className="text-xs mt-1" style={{ color: item.color }}>
            <span className="font-bold">{item.value}</span> {item.dataKey}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface DashboardProps {
  user: User;
}

type LabDepartment = 'Pathology' | 'Radiology' | 'Microbiology' | 'Biochemistry';
type MachineOperationalStatus = 'Online' | 'Running' | 'Maintenance' | 'Offline';

type MachineRecord = {
  id: string;
  name: string;
  department: LabDepartment;
  status: MachineOperationalStatus;
  updatedBy?: string;
  updatedAt?: string;
};

const MACHINE_STATUS_STORAGE_KEY = 'medcore_machine_status_v1';

const LAB_TEST_CATALOG: Record<string, LabDepartment> = {
  'Complete Blood Count (CBC)': 'Pathology',
  'Blood Sugar (Fasting)': 'Pathology',
  'Urine Culture': 'Microbiology',
  'Lipid Profile': 'Biochemistry',
  'Liver Function Test (LFT)': 'Biochemistry',
  'X-Ray Chest': 'Radiology',
  'MRI Scan': 'Radiology',
};

const DEFAULT_MACHINES: MachineRecord[] = [
  { id: 'm1', name: 'MRI Scanner A', department: 'Radiology', status: 'Online' },
  { id: 'm2', name: 'X-Ray Unit 2', department: 'Radiology', status: 'Maintenance' },
  { id: 'm3', name: 'Centrifuge C2', department: 'Pathology', status: 'Running' },
  { id: 'm4', name: 'Biochemistry Analyzer B1', department: 'Biochemistry', status: 'Online' },
  { id: 'm5', name: 'Culture Incubator M3', department: 'Microbiology', status: 'Running' },
];

const normalizeLabDepartment = (value?: string): LabDepartment | undefined => {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  const map: Record<string, LabDepartment> = {
    pathology: 'Pathology',
    'pathology department': 'Pathology',
    radiology: 'Radiology',
    'radiology department': 'Radiology',
    microbiology: 'Microbiology',
    'microbiology department': 'Microbiology',
    biochemistry: 'Biochemistry',
    'biochemistry department': 'Biochemistry',
  };
  return map[normalized];
};

// ─── Doctor Dashboard (extracted for hooks support) ──────────────────────────
const DoctorDashboard: React.FC<{ user: User; myAppointments: any[]; myPatientsCount: number }> = ({
  user, myAppointments, myPatientsCount,
}) => {
  const { staff, patients, updateAppointmentStatus } = useData();

  const [orderModal, setOrderModal] = useState<{ nurse: Staff } | null>(null);
  const [orderForm, setOrderForm] = useState({
    patient_id: '',
    order_type: 'Medication' as NurseOrderType,
    instructions: '',
    priority: 'Normal' as 'Normal' | 'Urgent',
  });
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState('');

  const shiftNurses = staff.filter(s => s.role === UserRole.NURSE && s.shift === (user.shift || 'Morning'));

  const getToken = () => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;
    try { return (JSON.parse(stored) as { token: string }).token; } catch { return null; }
  };

  const handleOpenOrder = (nurse: Staff) => {
    setOrderForm({ patient_id: '', order_type: 'Medication', instructions: '', priority: 'Normal' });
    setOrderError('');
    setOrderSuccess('');
    setOrderModal({ nurse });
  };

  const handleSubmitOrder = async () => {
    setOrderError('');
    const token = getToken();
    if (!token || !orderModal) return;
    if (!orderForm.patient_id || !orderForm.instructions.trim()) {
      setOrderError('Patient and instructions are required.');
      return;
    }
    try {
      await createNurseOrder(token, {
        patient_id: Number(orderForm.patient_id),
        nurse_id: Number(orderModal.nurse.id),
        order_type: orderForm.order_type,
        instructions: orderForm.instructions,
        priority: orderForm.priority,
      });
      setOrderSuccess(`Order sent to ${orderModal.nurse.name}!`);
      setTimeout(() => setOrderModal(null), 1400);
    } catch (e: any) {
      setOrderError(e.message ?? 'Failed to send order');
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6 animate-fade-in-up">
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-sky-400 to-teal-400 rounded-full opacity-30 group-hover:opacity-60 transition-opacity blur-md"></div>
            <img src={user.avatarUrl} alt={user.name} className="relative w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <h2 className="text-2xl font-display font-bold text-slate-800">{user.name}</h2>
              <span className="bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 text-xs px-3 py-1 rounded-full font-semibold border border-emerald-200">Active</span>
            </div>
            <p className="text-slate-500 font-medium mt-1">{user.department || 'Specialist'}</p>
            <div className="flex flex-wrap gap-4 mt-3 justify-center md:justify-start text-sm text-slate-600">
              <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full"><Mail size={14} className="text-slate-400" /> {user.email}</span>
              <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full"><Phone size={14} className="text-slate-400" /> {user.contact || 'No contact info'}</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-5 rounded-xl text-center min-w-[150px] border border-indigo-100">
            <p className="text-[10px] text-indigo-500 uppercase font-bold tracking-wider">Today's Shift</p>
            <p className="text-lg font-display font-bold text-indigo-700 mt-1">{user.shift || 'Not set'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="My Patients" value={myPatientsCount.toString()} icon={<Users size={20} />} color="bg-blue-500" delay={0.05} />
        <StatCard title="My Appointments" value={myAppointments.length.toString()} icon={<Calendar size={20} />} color="bg-purple-500" delay={0.1} />
        <StatCard title="Nurses On Shift" value={shiftNurses.length.toString()} icon={<HeartPulse size={20} />} color="bg-rose-500" delay={0.15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Schedule */}
        <div className="lg:col-span-2 glass-card rounded-2xl overflow-hidden animate-fade-in-up opacity-0" style={{ animationDelay: '0.25s', animationFillMode: 'forwards' }}>
          <div className="p-4 border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-sky-50 flex justify-between items-center">
            <h3 className="font-display font-bold text-slate-800 flex items-center gap-2">
              <Stethoscope size={18} className="text-teal-500" />
              My Schedule
            </h3>
          </div>
          {myAppointments.length > 0 ? (
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myAppointments.map(app => (
                  <tr key={app.id} className="text-sm hover:bg-sky-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-600">{app.time}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{app.patientName}</td>
                    <td className="px-4 py-3 text-slate-600">{app.type}</td>
                    <td className="px-4 py-3">
                      <select
                        value={app.status}
                        onChange={e => updateAppointmentStatus(app.id, e.target.value as any)}
                        className={`text-xs font-semibold rounded-full px-2.5 py-1 border-0 outline-none cursor-pointer focus:ring-2 focus:ring-sky-300 ${
                          app.status === 'Emergency' ? 'bg-red-100 text-red-700' :
                          app.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                          app.status === 'Cancelled' ? 'bg-slate-100 text-slate-500' :
                          'bg-sky-100 text-sky-700'
                        }`}
                      >
                        <option value="Scheduled">Scheduled</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                        <option value="Emergency">Emergency</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-500">No appointments assigned.</div>
          )}
        </div>

        {/* My Nursing Team */}
        <div className="glass-card rounded-2xl overflow-hidden animate-fade-in-up opacity-0" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
          <div className="p-4 border-b border-slate-200/50 bg-gradient-to-r from-rose-50 to-pink-50 flex justify-between items-center">
            <h3 className="font-display font-bold text-rose-900 flex items-center gap-2">
              <HeartPulse size={18} className="text-rose-500" />
              My Nursing Team
            </h3>
            <span className="text-[10px] font-bold text-rose-500 uppercase bg-white px-2.5 py-1 rounded-full border border-rose-100 tracking-wider">
              {user.shift || 'Morning'} Shift
            </span>
          </div>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {shiftNurses.length > 0 ? (
              shiftNurses.map(nurse => (
                <div key={nurse.id} className="p-4 hover:bg-sky-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img src={nurse.avatarUrl} alt={nurse.name} className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover" />
                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${nurse.status === 'Active' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{nurse.name}</p>
                      <p className="text-xs text-slate-500">{nurse.department}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Phone size={11} />{nurse.contact || '—'}</span>
                    <button
                      onClick={() => handleOpenOrder(nurse)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition shrink-0"
                      title={`Send care order to ${nurse.name}`}
                    >
                      <ClipboardList size={12} /> Assign Order
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <HeartPulse className="mx-auto text-slate-300 mb-2" size={28} />
                <p className="text-sm text-slate-500">No nurses on your current shift.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nurse Order Modal */}
      {orderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200/50">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-teal-50/30">
              <div className="flex items-center gap-2">
                <ClipboardList size={18} className="text-teal-600" />
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Assign Care Order</h3>
                  <p className="text-xs text-slate-500">To: {orderModal.nurse.name} · {orderModal.nurse.department}</p>
                </div>
              </div>
              <button onClick={() => setOrderModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-4">
              {orderError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm p-3 rounded-lg">
                  <AlertCircleIcon size={15} /> {orderError}
                </div>
              )}
              {orderSuccess && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm p-3 rounded-lg font-semibold">
                  ✓ {orderSuccess}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Patient <span className="text-red-500">*</span></label>
                <select
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 bg-white"
                  value={orderForm.patient_id}
                  onChange={e => setOrderForm(f => ({ ...f, patient_id: e.target.value }))}
                >
                  <option value="">Select patient…</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Order Type</label>
                  <select
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 bg-white"
                    value={orderForm.order_type}
                    onChange={e => setOrderForm(f => ({ ...f, order_type: e.target.value as NurseOrderType }))}
                  >
                    {(['Medication','Observation','Procedure','Diet','Mobility','Other'] as NurseOrderType[]).map(t => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 bg-white"
                    value={orderForm.priority}
                    onChange={e => setOrderForm(f => ({ ...f, priority: e.target.value as 'Normal' | 'Urgent' }))}
                  >
                    <option>Normal</option>
                    <option>Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Instructions <span className="text-red-500">*</span></label>
                <textarea
                  className="w-full p-3 border border-slate-300 rounded-lg text-sm h-24 resize-none focus:outline-none focus:border-teal-500"
                  placeholder="Describe the task for the nurse in detail…"
                  value={orderForm.instructions}
                  onChange={e => setOrderForm(f => ({ ...f, instructions: e.target.value }))}
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 flex gap-3 bg-slate-50">
              <button onClick={() => setOrderModal(null)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-white transition text-sm">
                Cancel
              </button>
              <button
                onClick={handleSubmitOrder}
                className="flex-1 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition flex items-center justify-center gap-2 text-sm"
              >
                <ClipboardList size={15} /> Send Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const {
    patients,
    appointments,
    medicines,
    labTests,
    beds,
    prescriptions,
    staff,
    vitals,
    revenueData,
    appointmentStats,
    auditLogs,
    updateAppointmentStatus,
    updateVitals,
    addLabTest,
  } = useData();
  const role = user.role;

  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [selectedPatientForVitals, setSelectedPatientForVitals] = useState<{ id: string; name: string } | null>(null);
  const [vitalsForm, setVitalsForm] = useState({ bp: '', heartRate: '', temperature: '', spO2: '' });
  const [savingVitals, setSavingVitals] = useState(false);

  const [showNewLabEntryModal, setShowNewLabEntryModal] = useState(false);
  const [selectedLabPatientId, setSelectedLabPatientId] = useState('');
  const [selectedLabTestType, setSelectedLabTestType] = useState<string>('Complete Blood Count (CBC)');
  const [selectedLabPriority, setSelectedLabPriority] = useState<'Normal' | 'Urgent'>('Normal');

  const [machineFilter, setMachineFilter] = useState<'My Department' | 'All'>('My Department');
  const [machineRecords, setMachineRecords] = useState<MachineRecord[]>(DEFAULT_MACHINES);
  const [machineInfo, setMachineInfo] = useState('');

  const technicianDepartment = useMemo(() => normalizeLabDepartment(user.department), [user.department]);

  const availableLabTestTypes = useMemo(() => {
    const entries = Object.entries(LAB_TEST_CATALOG);
    if (!technicianDepartment) return entries.map(([testName]) => testName);
    return entries.filter(([, dept]) => dept === technicianDepartment).map(([testName]) => testName);
  }, [technicianDepartment]);

  useEffect(() => {
    if (availableLabTestTypes.length === 0) return;
    if (!availableLabTestTypes.includes(selectedLabTestType)) {
      setSelectedLabTestType(availableLabTestTypes[0]);
    }
  }, [availableLabTestTypes, selectedLabTestType]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(MACHINE_STATUS_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as MachineRecord[];
      if (!Array.isArray(parsed) || parsed.length === 0) return;
      setMachineRecords(parsed);
    } catch {
      // ignore invalid local storage payload
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(MACHINE_STATUS_STORAGE_KEY, JSON.stringify(machineRecords));
  }, [machineRecords]);

  const visibleMachines = useMemo(() => {
    if (machineFilter === 'All') return machineRecords;
    if (!technicianDepartment) return [];
    return machineRecords.filter(machine => machine.department === technicianDepartment);
  }, [machineFilter, machineRecords, technicianDepartment]);

  const canUpdateMachine = useCallback((machine: MachineRecord) => {
    if (role === UserRole.ADMIN) return true;
    if (role !== UserRole.LAB_TECHNICIAN) return false;
    if (!technicianDepartment) return false;
    return machine.department === technicianDepartment;
  }, [role, technicianDepartment]);

  const handleMachineStatusChange = useCallback((machineId: string, status: MachineOperationalStatus) => {
    const now = new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    setMachineRecords(prev => prev.map(machine => (
      machine.id === machineId
        ? { ...machine, status, updatedBy: user.name, updatedAt: now }
        : machine
    )));
    setMachineInfo(`Machine status updated by ${user.name} at ${now}`);
  }, [user.name]);

  const handleCreateLabEntry = useCallback(() => {
    const patient = patients.find(p => p.id === selectedLabPatientId);
    if (!patient || !selectedLabTestType) return;

    const inferredDepartment = technicianDepartment || LAB_TEST_CATALOG[selectedLabTestType];
    addLabTest({
      id: `t${Date.now()}`,
      patientName: patient.name,
      testName: selectedLabTestType,
      doctorName: 'Doctor Order',
      date: new Date().toISOString().split('T')[0],
      department: inferredDepartment,
      priority: selectedLabPriority,
      status: 'Pending',
    });

    setShowNewLabEntryModal(false);
    setSelectedLabPatientId('');
    setSelectedLabPriority('Normal');
  }, [patients, selectedLabPatientId, selectedLabTestType, technicianDepartment, addLabTest, selectedLabPriority]);

  const getCareStatus = useCallback((patientId: string) => {
    const current = vitals[patientId];
    if (!current) return 'Under Observation';

    const hr = Number(current.heartRate);
    const temp = Number(current.temperature);
    const spo2 = Number(current.spO2);

    if (!Number.isNaN(spo2) && spo2 < 92) return 'Critical';
    if (!Number.isNaN(hr) && (hr > 120 || hr < 45)) return 'Critical';
    if (!Number.isNaN(temp) && temp >= 101) return 'Watch';
    return 'Stable';
  }, [vitals]);

  const openVitalsEditor = useCallback((patientId: string, patientName: string) => {
    const current = vitals[patientId];
    setVitalsForm({
      bp: current?.bp || '',
      heartRate: current?.heartRate || '',
      temperature: current?.temperature || '',
      spO2: current?.spO2 || '',
    });
    setSelectedPatientForVitals({ id: patientId, name: patientName });
    setShowVitalsModal(true);
  }, [vitals]);

  const handleSaveVitals = useCallback(async () => {
    if (!selectedPatientForVitals) return;
    setSavingVitals(true);
    try {
      await updateVitals(selectedPatientForVitals.id, {
        ...vitalsForm,
        lastUpdated: new Date().toISOString(),
      });
      setShowVitalsModal(false);
    } finally {
      setSavingVitals(false);
    }
  }, [selectedPatientForVitals, updateVitals, vitalsForm]);

  // PATIENT DASHBOARD
  if (role === UserRole.PATIENT) {
    const nextAppt = appointments.find(a =>
      (a.patientId === user.id || a.patientName === user.name) &&
      (a.status === AppointmentStatus.SCHEDULED || a.status === AppointmentStatus.EMERGENCY)
    );

    const myPatient = patients.find(p => String((p as any).user_id) === String(user.id));
    const myVitalsData = myPatient ? vitals[myPatient.id] : null;
    const myVitalsDisplay = myVitalsData?.bp ? `${myVitalsData.bp} mmHg` : 'No data yet';
    const myReports = labTests.filter(t => (t.patientName === user.name) && t.status === 'Pending').length;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center animate-fade-in-up">
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-800">Welcome back, {user.name}</h2>
            <p className="text-slate-500 mt-1">Here is your health summary.</p>
          </div>
          <button className="bg-gradient-to-r from-sky-500 to-teal-500 text-white px-6 py-2.5 rounded-xl hover:from-sky-600 hover:to-teal-600 transition-all shadow-lg shadow-sky-500/20 font-semibold text-sm hover:scale-[1.02] active:scale-[0.98]">
            Book Appointment
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-500 rounded-2xl p-6 text-white shadow-xl shadow-sky-500/20 card-hover animate-fade-in-up opacity-0" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
            <h3 className="text-lg font-display font-semibold mb-1 opacity-90">Next Appointment</h3>
            <div className="mt-4 flex items-center gap-3">
              <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
                <Calendar size={24} />
              </div>
              <div>
                {nextAppt ? (
                  <>
                    <p className="font-bold text-xl">{nextAppt.date}</p>
                    <p className="text-sky-100 text-sm">{nextAppt.time} • {nextAppt.doctorName}</p>
                  </>
                ) : (
                  <p className="font-bold text-xl">No upcoming appointments</p>
                )}
              </div>
            </div>
          </div>
          <StatCard title="Recent Vitals" value={myVitalsDisplay} icon={<Activity size={20} />} color="bg-blue-500" delay={0.15} />
          <StatCard title="Pending Reports" value={`${myReports} Reports`} icon={<FileText size={20} />} color="bg-amber-500" delay={0.2} />
        </div>

        {myVitalsData && (
          <div className="glass-card rounded-2xl p-6 animate-fade-in-up opacity-0" style={{ animationDelay: '0.25s', animationFillMode: 'forwards' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-display font-bold text-slate-800 flex items-center gap-2">
                <HeartPulse size={20} className="text-sky-500" />
                My Latest Vitals
              </h3>
              {myVitalsData.lastUpdated && (
                <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Last updated: {myVitalsData.lastUpdated}</span>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 text-center">
                <p className="text-xs font-bold text-sky-500 uppercase tracking-wider mb-2">Blood Pressure</p>
                <p className="text-2xl font-display font-bold text-slate-800">{myVitalsData.bp || '—'}</p>
                <p className="text-xs text-slate-400 mt-1">mmHg</p>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2">Heart Rate</p>
                <p className="text-2xl font-display font-bold text-slate-800">{myVitalsData.heartRate || '—'}</p>
                <p className="text-xs text-slate-400 mt-1">bpm</p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">Temperature</p>
                <p className="text-2xl font-display font-bold text-slate-800">{myVitalsData.temperature || '—'}</p>
                <p className="text-xs text-slate-400 mt-1">°F</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2">SpO2</p>
                <p className="text-2xl font-display font-bold text-slate-800">{myVitalsData.spO2 || '—'}</p>
                <p className="text-xs text-slate-400 mt-1">%</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // NURSE DASHBOARD
  if (role === UserRole.NURSE) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 glass-card p-6 rounded-2xl animate-fade-in-up">
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-800">Nurse Station</h2>
            <p className="text-slate-500 mt-1">Ward overview and patient vitals monitoring.</p>
          </div>
          <div className="flex items-center gap-4 bg-gradient-to-r from-indigo-50 to-purple-50 px-5 py-3 rounded-xl border border-indigo-100">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-2 rounded-full text-white shadow-md">
              <Sun size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Current Shift</p>
              <p className="font-bold text-indigo-900 text-lg font-display">Morning (07:00 - 15:00)</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard title="Occupied Beds" value={`${beds.filter(b => b.status === 'Occupied').length}/${beds.length}`} icon={<BedDouble size={20} />} color="bg-blue-500" delay={0.05} />
          <StatCard title="Critical Patients" value="2" icon={<Activity size={20} />} color="bg-red-500" delay={0.1} />
          <StatCard title="Discharges Today" value="4" icon={<Clock size={20} />} color="bg-emerald-500" delay={0.15} />
          <StatCard title="Doctors on Duty" value={`${staff.filter(s => s.role === UserRole.DOCTOR && s.status === 'Active').length}`} icon={<Users size={20} />} color="bg-purple-500" delay={0.2} />
        </div>

        <div className="glass-card rounded-2xl p-6 animate-fade-in-up opacity-0" style={{ animationDelay: '0.25s', animationFillMode: 'forwards' }}>
          <h3 className="text-lg font-display font-bold text-slate-800 mb-4">Current Admitted Patients</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase font-semibold tracking-wider">
                  <th className="pb-3 pl-1">Patient</th>
                  <th className="pb-3">Ward/Bed</th>
                  <th className="pb-3">Condition</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {beds.filter(b => b.status === 'Occupied').map(bed => {
                  const patient = patients.find(p => p.id === String(bed.patientId));
                  const patientId = patient?.id ?? String(bed.patientId || '');
                  const careStatus = patientId ? getCareStatus(patientId) : 'Under Observation';
                  const statusClass =
                    careStatus === 'Critical'
                      ? 'bg-red-100 text-red-700'
                      : careStatus === 'Watch'
                        ? 'bg-amber-100 text-amber-700'
                        : careStatus === 'Stable'
                          ? 'bg-sky-100 text-sky-700'
                          : 'bg-slate-100 text-slate-700';

                  return (
                    <tr key={bed.id} className="text-sm hover:bg-sky-50/50 transition-colors">
                      <td className="py-3.5 pl-1 font-medium text-slate-900">{bed.patientName}</td>
                      <td className="py-3.5 text-slate-600">{bed.ward} - {bed.number}</td>
                      <td className="py-3.5 text-slate-600">{patient?.condition || '—'}</td>
                      <td className="py-3.5">
                        <span className={`${statusClass} px-2.5 py-1 rounded-full text-xs font-semibold`}>{careStatus}</span>
                      </td>
                      <td className="py-3.5">
                        {patientId ? (
                          <button
                            onClick={() => openVitalsEditor(patientId, bed.patientName || patient?.name || 'Patient')}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition"
                          >
                            Update Vitals
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">No patient record</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {showVitalsModal && selectedPatientForVitals && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200/50">
              <div className="p-5 border-b border-slate-200/50 flex justify-between items-center bg-gradient-to-r from-sky-50 to-teal-50/30">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Activity size={18} className="text-sky-500" /> Update Vitals
                  </h3>
                  <p className="text-xs text-slate-500">{selectedPatientForVitals.name}</p>
                </div>
                <button onClick={() => setShowVitalsModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>

              <div className="p-6 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Blood Pressure</label>
                  <input
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-sky-500"
                    placeholder="120/80"
                    value={vitalsForm.bp}
                    onChange={e => setVitalsForm(v => ({ ...v, bp: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Heart Rate</label>
                  <input
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-sky-500"
                    placeholder="72"
                    value={vitalsForm.heartRate}
                    onChange={e => setVitalsForm(v => ({ ...v, heartRate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Temperature</label>
                  <input
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-sky-500"
                    placeholder="98.6"
                    value={vitalsForm.temperature}
                    onChange={e => setVitalsForm(v => ({ ...v, temperature: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">SpO2</label>
                  <input
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-sky-500"
                    placeholder="98"
                    value={vitalsForm.spO2}
                    onChange={e => setVitalsForm(v => ({ ...v, spO2: e.target.value }))}
                  />
                </div>
              </div>

              <div className="p-5 border-t border-slate-200 flex gap-3 bg-slate-50">
                <button onClick={() => setShowVitalsModal(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-white transition">
                  Cancel
                </button>
                <button
                  onClick={handleSaveVitals}
                  disabled={savingVitals}
                  className="flex-1 py-2.5 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 transition disabled:opacity-60"
                >
                  {savingVitals ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // LAB TECHNICIAN DASHBOARD
  if (role === UserRole.LAB_TECHNICIAN) {
    const scopedTests = technicianDepartment
      ? labTests.filter(test => test.department === technicianDepartment)
      : [];

    const pendingTests = scopedTests.filter(t => t.status === 'Pending').length;
    const processingTests = scopedTests.filter(t => t.status === 'In Progress').length;
    const completedToday = scopedTests.filter(t => t.status === 'Completed').length;
    const urgentTests = scopedTests.filter(t => t.priority === 'Urgent' && t.status !== 'Completed');

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center glass-card p-6 rounded-2xl animate-fade-in-up">
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-800">Laboratory Operations</h2>
            <p className="text-slate-500 mt-1">
              Technician Control Panel {technicianDepartment ? `· ${technicianDepartment}` : '· Department not assigned'}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setMachineFilter(prev => prev === 'My Department' ? 'All' : 'My Department')}
              className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl font-medium hover:bg-slate-200 transition-all text-sm"
            >
              <Activity size={18} />
              Equipment Status ({machineFilter})
            </button>
            <button
              onClick={() => setShowNewLabEntryModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-teal-500 text-white px-4 py-2.5 rounded-xl font-medium hover:from-sky-600 hover:to-teal-600 transition-all shadow-lg shadow-sky-500/20 text-sm"
            >
              <FlaskConical size={18} />
              New Test Entry
            </button>
          </div>
        </div>

        {!technicianDepartment && (
          <div className="glass-card rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-700">
            Your account needs a valid lab department (Pathology, Radiology, Microbiology, or Biochemistry) to process requests and update machine statuses.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard title="Samples Pending" value={pendingTests.toString()} icon={<FlaskConical size={20} />} color="bg-amber-500" delay={0.05} />
          <StatCard title="Processing" value={processingTests.toString()} icon={<Microscope size={20} />} color="bg-blue-500" delay={0.1} />
          <StatCard title="Completed Today" value={completedToday.toString()} icon={<ShieldCheck size={20} />} color="bg-emerald-500" delay={0.15} />
          <StatCard title="Urgent Requests" value={urgentTests.length.toString()} icon={<AlertCircle size={20} />} color="bg-red-500" delay={0.2} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Urgent Worklist */}
          <div className="lg:col-span-2 glass-card rounded-2xl overflow-hidden border-red-100 animate-fade-in-up opacity-0" style={{ animationDelay: '0.25s', animationFillMode: 'forwards' }}>
            <div className="p-4 border-b border-slate-200/50 bg-gradient-to-r from-red-50 to-orange-50 flex justify-between items-center">
              <h3 className="font-display font-bold text-red-900 flex items-center gap-2">
                <AlertCircle size={18} className="text-red-500" />
                Urgent Worklist
              </h3>
              <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-red-600 border border-red-200 shadow-sm">{urgentTests.length} Pending</span>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 text-slate-500 text-xs uppercase font-semibold tracking-wider">
                <tr>
                  <th className="px-6 py-3">Patient</th>
                  <th className="px-6 py-3">Test</th>
                  <th className="px-6 py-3">Dept</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {urgentTests.length > 0 ? urgentTests.map(test => (
                  <tr key={test.id} className="hover:bg-sky-50/50 text-sm transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{test.patientName}</td>
                    <td className="px-6 py-4">{test.testName}</td>
                    <td className="px-6 py-4 text-slate-500">{test.department}</td>
                    <td className="px-6 py-4">
                      <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-xs font-bold">{test.status}</span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">No urgent tests pending. Great job!</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Equipment/Machine Status */}
          <div className="glass-card rounded-2xl p-5 animate-fade-in-up opacity-0" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
            <h3 className="font-display font-bold text-slate-800 mb-4 flex items-center gap-2">
              <ScanLine size={18} className="text-teal-500" />
              Machine Status
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Maintained by lab technicians of each department; only your department's machines are editable from this panel.
            </p>
            <div className="space-y-3">
              {visibleMachines.length > 0 ? visibleMachines.map(machine => {
                const isEditable = canUpdateMachine(machine);
                const badgeClass = machine.status === 'Maintenance' || machine.status === 'Offline'
                  ? 'bg-red-100 text-red-700'
                  : machine.status === 'Running'
                    ? 'bg-sky-100 text-sky-700'
                    : 'bg-emerald-50 text-emerald-700';

                const dotClass = machine.status === 'Maintenance' || machine.status === 'Offline'
                  ? 'bg-red-500 shadow-red-500/50'
                  : machine.status === 'Running'
                    ? 'bg-sky-500 shadow-sky-500/50'
                    : 'bg-emerald-400 shadow-emerald-400/50';

                return (
                  <div key={machine.id} className="p-3 border border-slate-100 rounded-xl hover:border-sky-200 transition-colors">
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full shadow-lg ${dotClass}`}></div>
                        <div>
                          <p className="text-sm font-bold text-slate-700">{machine.name}</p>
                          <p className="text-xs text-slate-500">{machine.department}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badgeClass}`}>{machine.status}</span>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <select
                        value={machine.status}
                        onChange={(e) => handleMachineStatusChange(machine.id, e.target.value as MachineOperationalStatus)}
                        disabled={!isEditable}
                        className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <option value="Online">Online</option>
                        <option value="Running">Running</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Offline">Offline</option>
                      </select>
                      <span className="text-[11px] text-slate-400">
                        {isEditable ? 'Managed by you' : `Managed by ${machine.department} technician`}
                      </span>
                    </div>

                    {machine.updatedBy && machine.updatedAt && (
                      <p className="text-[11px] text-slate-400 mt-1">Updated by {machine.updatedBy} · {machine.updatedAt}</p>
                    )}
                  </div>
                );
              }) : (
                <div className="p-6 text-center text-sm text-slate-500 border border-slate-100 rounded-xl bg-slate-50">
                  No machines found for this filter.
                </div>
              )}

              {machineInfo && (
                <div className="text-[11px] text-teal-700 bg-teal-50 border border-teal-100 rounded-lg px-2.5 py-2">
                  {machineInfo}
                </div>
              )}
            </div>
          </div>
        </div>

        {showNewLabEntryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in border border-slate-200/50">
              <div className="p-5 border-b border-slate-200/50 flex justify-between items-center bg-gradient-to-r from-slate-50 to-sky-50/30">
                <h3 className="font-display font-bold text-slate-800 flex items-center gap-2">
                  <FlaskConical size={20} className="text-teal-500" />
                  New Test Entry
                </h3>
                <button onClick={() => setShowNewLabEntryModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Patient</label>
                  <select
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                    value={selectedLabPatientId}
                    onChange={(e) => setSelectedLabPatientId(e.target.value)}
                  >
                    <option value="">-- Choose a Patient --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Test</label>
                  <select
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                    value={selectedLabTestType}
                    onChange={(e) => setSelectedLabTestType(e.target.value)}
                  >
                    {availableLabTestTypes.map(test => (
                      <option key={test} value={test}>{test}</option>
                    ))}
                  </select>
                  <p className="text-xs text-teal-600 mt-1">
                    Routed to: <span className="font-bold">{technicianDepartment || LAB_TEST_CATALOG[selectedLabTestType]}</span>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <div className="flex bg-slate-100 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setSelectedLabPriority('Normal')}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${selectedLabPriority === 'Normal' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
                    >
                      Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedLabPriority('Urgent')}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${selectedLabPriority === 'Urgent' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500'}`}
                    >
                      Urgent
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => setShowNewLabEntryModal(false)}
                    className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateLabEntry}
                    disabled={!selectedLabPatientId || !selectedLabTestType || !technicianDepartment}
                    className="flex-1 py-2.5 bg-gradient-to-r from-sky-500 to-teal-500 text-white rounded-xl font-medium hover:from-sky-600 hover:to-teal-600 transition-all shadow-lg shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Entry
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // PHARMACIST DASHBOARD
  if (role === UserRole.PHARMACIST) {
    const totalSales = 3450;
    const lowStockItems = medicines.filter(m => m.stock <= 20);
    const pendingRequests = prescriptions.filter(p => p.status === 'Pending').length;
    const totalMedicines = medicines.length;

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 glass-card p-6 rounded-2xl animate-fade-in-up">
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-800">Pharmacy Dashboard</h2>
            <p className="text-slate-500 mt-1">Inventory tracking and prescription fulfillment overview.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl font-medium hover:bg-slate-200 transition-all text-sm">
              <Package size={18} /> Check Stock
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard title="Daily Sales" value={`₹${totalSales}`} icon={<IndianRupee size={20} />} trend="+5%" color="bg-emerald-500" delay={0.05} />
          <StatCard title="Pending Dispense" value={pendingRequests.toString()} icon={<Clock size={20} />} color="bg-amber-500" delay={0.1} />
          <StatCard title="Low Stock Items" value={lowStockItems.length.toString()} icon={<AlertTriangle size={20} />} color="bg-red-500" delay={0.15} />
          <StatCard title="Total Medicines" value={totalMedicines.toString()} icon={<Pill size={20} />} color="bg-blue-500" delay={0.2} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Low Stock Alerts */}
          <div className="lg:col-span-2 glass-card rounded-2xl overflow-hidden animate-fade-in-up opacity-0" style={{ animationDelay: '0.25s', animationFillMode: 'forwards' }}>
            <div className="p-4 border-b border-slate-200/50 bg-gradient-to-r from-red-50 to-orange-50 flex justify-between items-center">
              <h3 className="font-display font-bold text-red-900 flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-500" />
                Low Stock Alerts
              </h3>
              <span className="text-xs font-bold text-red-700 bg-red-100 px-3 py-1 rounded-full border border-red-200">{lowStockItems.length} Items Critical</span>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 text-slate-500 text-xs uppercase font-semibold tracking-wider">
                <tr>
                  <th className="px-6 py-3">Medicine Name</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Current Stock</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStockItems.length > 0 ? lowStockItems.map(med => (
                  <tr key={med.id} className="hover:bg-sky-50/50 text-sm transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">{med.name}</td>
                    <td className="px-6 py-4 text-slate-600">{med.category}</td>
                    <td className="px-6 py-4 font-mono font-bold text-red-600">{med.stock} {med.unit}</td>
                    <td className="px-6 py-4">
                      <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold">Reorder Now</span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">Inventory levels are healthy.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Sales Chart */}
          <div className="glass-card p-6 rounded-2xl flex flex-col animate-fade-in-up opacity-0" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
            <h3 className="font-display font-bold text-slate-800 mb-6 flex items-center gap-2">
              <TrendingUp size={18} className="text-teal-500" />
              Sales Trend (Weekly)
            </h3>
            <div className="flex-1 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" />
                      <stop offset="100%" stopColor="#0ea5e9" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // RECEPTIONIST DASHBOARD
  if (role === UserRole.RECEPTIONIST) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center animate-fade-in-up">
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-800">Front Desk</h2>
            <p className="text-slate-500 mt-1">Manage queues and patient check-ins.</p>
          </div>
          <button className="bg-gradient-to-r from-sky-500 to-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-sky-500/20 hover:from-sky-600 hover:to-teal-600 transition-all hover:scale-[1.02] active:scale-[0.98]">Register New Patient</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Today's Appointments" value={appointments.filter(a => a.date === new Date().toISOString().split('T')[0]).length.toString()} icon={<Calendar size={20} />} color="bg-blue-500" delay={0.05} />
          <StatCard title="Checked In" value={appointments.filter(a => a.status === AppointmentStatus.COMPLETED && a.date === new Date().toISOString().split('T')[0]).length.toString()} icon={<Users size={20} />} color="bg-emerald-500" delay={0.1} />
          <StatCard title="Waiting Queue" value={appointments.filter(a => a.status === AppointmentStatus.SCHEDULED && a.date === new Date().toISOString().split('T')[0]).length.toString()} icon={<Clock size={20} />} color="bg-amber-500" delay={0.15} />
        </div>
      </div>
    );
  }

  // DOCTOR DASHBOARD
  if (role === UserRole.DOCTOR) {
    const myAppointments = appointments.filter(a => a.doctorId === user.id);
    const myPatientsCount = new Set(myAppointments.map(a => a.patientId)).size;

    return <DoctorDashboard user={user} myAppointments={myAppointments} myPatientsCount={myPatientsCount} />;
  }

  // ADMIN DASHBOARD (Enhanced)
  const lowStockCount = medicines.filter(m => m.stock <= 20).length;
  const urgentLabCount = labTests.filter(t => t.priority === 'Urgent' && t.status !== 'Completed').length;
  const occupancyRate = Math.round((beds.filter(b => b.status === 'Occupied').length / beds.length) * 100);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center animate-fade-in-up">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-800">Hospital Control Center</h2>
          <p className="text-sm text-slate-500 mt-1">System-wide operational overview.</p>
        </div>
        <div className="text-sm text-slate-600 glass px-4 py-2 rounded-full font-medium">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Patients" value={patients.length.toString()} icon={<Users size={20} />} trend="+12%" color="bg-blue-500" delay={0.05} />
        <StatCard title="Staff Active" value={`${staff.filter(s => s.status === 'Active').length} / ${staff.length}`} icon={<Stethoscope size={20} />} color="bg-purple-500" delay={0.1} />
        <StatCard title="Revenue (MTD)" value="₹124.5k" icon={<IndianRupee size={20} />} trend="+8.2%" color="bg-emerald-500" delay={0.15} />
        <StatCard title="Bed Occupancy" value={`${occupancyRate}%`} icon={<BedDouble size={20} />} color={occupancyRate > 80 ? 'bg-amber-500' : 'bg-slate-500'} delay={0.2} />
      </div>

      {/* Departmental Operational Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between card-hover cursor-pointer group animate-fade-in-up opacity-0" style={{ animationDelay: '0.25s', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${lowStockCount > 0 ? 'bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/20' : 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20'}`}>
              <Pill size={22} />
            </div>
            <div>
              <h4 className="font-display font-bold text-slate-800">Pharmacy</h4>
              <p className={`text-xs font-semibold ${lowStockCount > 0 ? 'text-red-500' : 'text-slate-500'}`}>
                {lowStockCount > 0 ? `${lowStockCount} Low Stock Alerts` : 'Inventory Healthy'}
              </p>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-300 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
        </div>

        <div className="glass-card p-5 rounded-2xl flex items-center justify-between card-hover cursor-pointer group animate-fade-in-up opacity-0" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${urgentLabCount > 0 ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20' : 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/20'}`}>
              <FlaskConical size={22} />
            </div>
            <div>
              <h4 className="font-display font-bold text-slate-800">Laboratory</h4>
              <p className={`text-xs font-semibold ${urgentLabCount > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                {urgentLabCount > 0 ? `${urgentLabCount} Urgent Pending` : 'Operating Normal'}
              </p>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-300 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
        </div>

        <div className="glass-card p-5 rounded-2xl flex items-center justify-between card-hover cursor-pointer group animate-fade-in-up opacity-0" style={{ animationDelay: '0.35s', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 text-white shadow-lg shadow-sky-500/20">
              <Clock size={22} />
            </div>
            <div>
              <h4 className="font-display font-bold text-slate-800">OPD Wait Time</h4>
              <p className="text-xs font-semibold text-slate-500">Avg. 15 mins</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-300 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl animate-fade-in-up opacity-0" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-display font-bold text-slate-800">Hospital Traffic</h3>
            <select className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none text-slate-600 focus:ring-2 focus:ring-sky-100 focus:border-sky-300 transition-all">
              <option>This Week</option>
              <option>Last Week</option>
            </select>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={appointmentStats}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl flex flex-col animate-fade-in-up opacity-0" style={{ animationDelay: '0.45s', animationFillMode: 'forwards' }}>
          <h3 className="text-lg font-display font-bold text-slate-800 mb-4">Recent System Activity</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 max-h-72">
            {auditLogs.map((log, idx) => (
              <div key={log.id} className="flex gap-3 items-start border-b border-slate-50 pb-3 last:border-0 last:pb-0 group hover:bg-sky-50/50 -mx-2 px-2 py-1 rounded-lg transition-colors">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-400 mt-0.5 shrink-0">
                  <Activity size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{log.action}</p>
                  <p className="text-xs text-slate-500">{log.user} • {log.role}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{log.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 pt-3 text-center text-xs font-bold text-sky-600 hover:text-sky-700 border-t border-slate-100 transition-colors">View Full Audit Log</button>
        </div>
      </div>
    </div>
  );
};
