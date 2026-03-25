import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Plus, Search, Filter, Pencil, Trash2, User as UserIcon, X, Activity, FileText, Thermometer, Syringe, Stethoscope, Clipboard, CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { User, UserRole, NurseOrder, NurseOrderType } from '../types';
import { AUTH_STORAGE_KEY, updatePatient, deletePatient, listNurseOrders, updateNurseOrderStatus, createNurseOrder } from '../services/api';
import { useData } from '../contexts/DataContext';

interface PatientsProps {
   user?: User;
}



export const Patients: React.FC<PatientsProps> = ({ user }) => {
   const { patients, appointments, beds, vitals, updateVitals, refreshPatients, isLoading } = useData();
   const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
   const [activeTab, setActiveTab] = useState<'overview' | 'vitals' | 'records' | 'orders'>('overview');

   const [nurseTab, setNurseTab] = useState<'care' | 'meds' | 'notes' | 'orders'>('orders');
   const [showNurseModal, setShowNurseModal] = useState(false);

   const isNurse = user?.role === UserRole.NURSE;
   const isDoctor = user?.role === UserRole.DOCTOR;
   const isAdmin = user?.role === UserRole.ADMIN;
   const isReceptionist = user?.role === UserRole.RECEPTIONIST;

   // ── Edit Patient state ──
   const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
   const [editingPatient, setEditingPatient] = useState<any | null>(null);
   const [isEditPatientSubmitting, setIsEditPatientSubmitting] = useState(false);
   const [editPatientMsg, setEditPatientMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
   const [editPatientForm, setEditPatientForm] = useState({
      full_name: '', age: '', gender: 'Male',
      contact: '', last_visit: '', medical_condition: '',
      status: 'Outpatient' as 'Outpatient' | 'Inpatient' | 'Discharged',
      blood_type: '', allergies: '',
   });

   const [editVitalsForm, setEditVitalsForm] = useState({ bp: '', heartRate: '', temperature: '', spO2: '' });

   const openEditPatient = (p: any) => {
      setEditingPatient(p);
      setEditPatientForm({
         full_name: p.full_name || p.name || '',
         age: p.age != null ? String(p.age) : '',
         gender: p.gender || 'Male',
         contact: p.contact || '',
         last_visit: p.last_visit || p.lastVisit || '',
         medical_condition: p.medical_condition || p.condition || '',
         status: p.status as 'Outpatient' | 'Inpatient' | 'Discharged' || 'Outpatient',
         blood_type: p.blood_type || p.bloodType || '',
         allergies: p.allergies || '',
      });
      const pVitals = vitals[p.id];
      setEditVitalsForm({
         bp: pVitals?.bp || '',
         heartRate: pVitals?.heartRate || '',
         temperature: pVitals?.temperature || '',
         spO2: pVitals?.spO2 || '',
      });
      setEditPatientMsg(null);
      setIsEditPatientOpen(true);
   };

   const handleUpdatePatient = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingPatient) return;
      setIsEditPatientSubmitting(true);
      setEditPatientMsg(null);
      try {
         const stored = localStorage.getItem(AUTH_STORAGE_KEY);
         const token = stored ? JSON.parse(stored)?.token : null;
         if (!token) throw new Error('Not authenticated. Please log in again.');

         const base = {
            full_name: editingPatient.full_name || editingPatient.name || '',
            age: editingPatient.age ?? null,
            gender: editingPatient.gender || null,
            contact: editingPatient.contact || null,
            last_visit: editingPatient.last_visit || editingPatient.lastVisit || null,
            medical_condition: editingPatient.medical_condition || editingPatient.condition || null,
            status: editingPatient.status || null,
            blood_type: editingPatient.blood_type || editingPatient.bloodType || null,
            allergies: editingPatient.allergies || null,
         };
         const payload = isAdmin
            ? { ...base, full_name: editPatientForm.full_name, age: editPatientForm.age ? Number(editPatientForm.age) : null, gender: editPatientForm.gender, contact: editPatientForm.contact, last_visit: editPatientForm.last_visit || null, medical_condition: editPatientForm.medical_condition, status: editPatientForm.status, blood_type: editPatientForm.blood_type || null, allergies: editPatientForm.allergies || null }
            : isDoctor
            ? { ...base, medical_condition: editPatientForm.medical_condition, status: editPatientForm.status }
            : { ...base, contact: editPatientForm.contact, status: editPatientForm.status };

         await updatePatient(token, editingPatient.id, payload);
         if (isDoctor) {
            await updateVitals(String(editingPatient.id), {
               bp: editVitalsForm.bp,
               heartRate: editVitalsForm.heartRate,
               temperature: editVitalsForm.temperature,
               spO2: editVitalsForm.spO2,
               lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            });
         }
         setEditPatientMsg({ type: 'success', text: 'Patient updated successfully.' });
         await refreshPatients();
         setTimeout(() => { setIsEditPatientOpen(false); setEditPatientMsg(null); }, 1800);
      } catch (err: any) {
         console.error('[EditPatient] Update failed:', err);
         setEditPatientMsg({ type: 'error', text: err.message || 'Update failed. Please try again.' });
      } finally {
         setIsEditPatientSubmitting(false);
      }
   };

   const handleDeletePatient = async (patientId: string, patientName: string) => {
      if (!window.confirm(`Are you sure you want to permanently delete "${patientName}"? This cannot be undone.`)) return;
      try {
         const stored = localStorage.getItem(AUTH_STORAGE_KEY);
         if (stored) {
            const { token } = JSON.parse(stored);
            if (token) {
               await deletePatient(token, patientId);
               await refreshPatients();
            }
         }
      } catch (err: any) {
         alert('Failed to delete patient: ' + (err.message || 'Unknown error'));
      }
   };

   const [bpValue, setBpValue] = useState('');
   const [hrValue, setHrValue] = useState('');
   const [tempValue, setTempValue] = useState('');
   const [spo2Value, setSpo2Value] = useState('');

   const [patientNurseOrders, setPatientNurseOrders] = useState<NurseOrder[]>([]);
   const [loadingOrders, setLoadingOrders] = useState(false);
   const [administeringId, setAdministeringId] = useState<string | null>(null);
   const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

   const handleUpdateOrderStatus = async (orderId: string, newStatus: 'In Progress' | 'Completed') => {
      setUpdatingOrderId(orderId);
      try {
         const stored = localStorage.getItem(AUTH_STORAGE_KEY);
         const token = stored ? JSON.parse(stored)?.token : null;
         if (!token) return;
         await updateNurseOrderStatus(token, orderId, newStatus);
         const completedAt = new Date().toISOString();
         setPatientNurseOrders(prev =>
            prev.map(o =>
               o.id === orderId ? { ...o, status: newStatus as any, updated_at: completedAt } : o
            )
         );
      } finally { setUpdatingOrderId(null); }
   };
   const [showOrderForm, setShowOrderForm] = useState(false);
   const [orderForm, setOrderForm] = useState({ order_type: 'Medication' as NurseOrderType, instructions: '', priority: 'Normal' as 'Normal' | 'Urgent' });
   const [orderMsg, setOrderMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
   const [submittingOrder, setSubmittingOrder] = useState(false);

   const fetchPatientOrders = async (patientId: string) => {
      setLoadingOrders(true);
      try {
         const stored = localStorage.getItem(AUTH_STORAGE_KEY);
         const token = stored ? JSON.parse(stored)?.token : null;
         if (!token) return;
         const all = await listNurseOrders(token);
         setPatientNurseOrders(all.filter((o: NurseOrder) => String(o.patient_id) === String(patientId)));
      } catch { /* silently fail */ }
      finally { setLoadingOrders(false); }
   };

   const handleAdminister = async (orderId: string) => {
      setAdministeringId(orderId);
      try {
         const stored = localStorage.getItem(AUTH_STORAGE_KEY);
         const token = stored ? JSON.parse(stored)?.token : null;
         if (!token) return;
         await updateNurseOrderStatus(token, orderId, 'Completed');
         setPatientNurseOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'Completed' as const } : o));
      } finally { setAdministeringId(null); }
   };

   const handleCreateOrder = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedPatient || !orderForm.instructions.trim()) return;
      setSubmittingOrder(true);
      setOrderMsg(null);
      try {
         const stored = localStorage.getItem(AUTH_STORAGE_KEY);
         const token = stored ? JSON.parse(stored)?.token : null;
         if (!token) throw new Error('Not authenticated');
         await createNurseOrder(token, {
            patient_id: selectedPatient.id,
            order_type: orderForm.order_type,
            instructions: orderForm.instructions,
            priority: orderForm.priority,
         });
         setOrderMsg({ type: 'success', text: 'Order sent to nursing team.' });
         setOrderForm({ order_type: 'Medication', instructions: '', priority: 'Normal' });
         setShowOrderForm(false);
         await fetchPatientOrders(selectedPatient.id);
      } catch (err: any) {
         setOrderMsg({ type: 'error', text: err.message || 'Failed to create order.' });
      } finally { setSubmittingOrder(false); }
   };

   useEffect(() => {
      if (selectedPatient) {
         fetchPatientOrders(selectedPatient.id);
      }
   }, [selectedPatient]);

   const handlePatientClick = (patient: any) => {
      setSelectedPatient(patient);
      const pVitals = vitals[patient.id];
      setBpValue(pVitals?.bp || '');
      setHrValue(pVitals?.heartRate || '');
      setTempValue(pVitals?.temperature || '');
      setSpo2Value(pVitals?.spO2 || '');

      if (isNurse) {
         setShowNurseModal(true);
         setNurseTab('orders');
      } else {
         setActiveTab('overview');
         setShowOrderForm(false);
         setOrderMsg(null);
      }
   };

   const handleSaveVitals = () => {
      if (selectedPatient) {
         updateVitals(selectedPatient.id, {
            bp: bpValue,
            heartRate: hrValue,
            temperature: tempValue,
            spO2: spo2Value,
            lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
         });
      }
   };

   const displayedPatients = React.useMemo(() => {
      if (isDoctor) {
         return patients.filter(patient =>
            appointments.some(appt =>
               (appt.patientId === patient.id || appt.patientName === patient.name) &&
               (appt.doctorId === user.id || appt.doctorName === user.name)
            )
         );
      }
      return patients;
   }, [user, isDoctor, patients, appointments]);

   const getAttendingDoctor = (patientName: string) => {
      const appt = appointments.find(a => a.patientName === patientName);
      return appt ? appt.doctorName : 'Unassigned';
   };

   const getBedInfo = (patientName: string) => {
      const bed = beds.find(b => b.patientName === patientName);
      return bed ? `${bed.ward} - Bed ${bed.number}` : 'No Bed Assigned';
   };

   const isPatientAdmitted = (patientId: string) =>
      beds.some(b => b.status === 'Occupied' && String(b.patientId) === String(patientId));

   return (
      <div className="space-y-6">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in-up">
            <div>
               <h2 className="text-2xl font-display font-bold text-slate-800">
                  {isDoctor ? 'My Patients' : isNurse ? 'Nursing Station & Patients' : 'Patients'}
               </h2>
               <p className="text-slate-500 mt-1">
                  {isDoctor ? 'Manage records for your assigned patients.' :
                     isNurse ? 'Monitor patient vitals, administer meds, and log care.' :
                        'Manage patient records and admission status.'}
               </p>
            </div>
            {(user?.role === UserRole.RECEPTIONIST || user?.role === UserRole.ADMIN) && (
               <button className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-teal-500 text-white px-5 py-2.5 rounded-xl hover:from-sky-600 hover:to-teal-600 transition-all shadow-lg shadow-sky-500/20 font-semibold text-sm hover:scale-[1.02] active:scale-[0.98]">
                  <Plus size={18} />
                  <span>Register Patient</span>
               </button>
            )}
         </div>

         <div className="glass-card rounded-2xl overflow-hidden animate-fade-in-up opacity-0" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
            <div className="p-4 border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-sky-50/30 flex flex-col sm:flex-row gap-4 justify-between items-center">
               <div className="relative w-full sm:w-96 group">
                  <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                  <input
                     type="text"
                     placeholder="Search by name, ID, or condition..."
                     className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-300 transition-all"
                  />
               </div>
               <div className="flex items-center gap-2">
                  <button
                     onClick={() => refreshPatients()}
                     disabled={isLoading}
                     title="Refresh patient list"
                     className="flex items-center gap-2 text-slate-600 px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-sky-50 hover:border-sky-300 hover:text-sky-600 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                     {isLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                  <button className="flex items-center gap-2 text-slate-600 px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 text-sm font-medium transition-all">
                     <Filter size={16} />
                     Filters
                  </button>
               </div>
            </div>

            <div className="overflow-x-auto">
               {displayedPatients.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-slate-50/80 text-slate-400 text-xs uppercase font-semibold tracking-wider">
                           <th className="px-6 py-4">Patient Name</th>
                           {isNurse && <th className="px-6 py-4">Attending Doctor</th>}
                           {isNurse && <th className="px-6 py-4">Ward / Bed</th>}
                           <th className="px-6 py-4">Condition</th>
                           {!isNurse && <th className="px-6 py-4">Last Visit</th>}
                           <th className="px-6 py-4">Status</th>
                           <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {displayedPatients.map((patient) => (
                           <tr key={patient.id} className="hover:bg-sky-50/50 transition-colors cursor-pointer group" onClick={() => handlePatientClick(patient)}>
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 relative group-hover:from-sky-100 group-hover:to-sky-200 group-hover:text-sky-600 transition-all">
                                       <UserIcon size={18} />
                                       {isNurse && patient.status === 'Inpatient' && (
                                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-teal-500 border-2 border-white rounded-full"></span>
                                       )}
                                    </div>
                                    <div>
                                       <p className="font-semibold text-slate-900 text-sm">{patient.name}</p>
                                       <p className="text-xs text-slate-400 font-mono">ID: {patient.id.toUpperCase()}</p>
                                    </div>
                                 </div>
                              </td>
                              {isNurse && (
                                 <td className="px-6 py-4 text-sm">
                                    <div className="flex items-center gap-2 text-slate-700">
                                       <Stethoscope size={14} className="text-teal-500" />
                                       {getAttendingDoctor(patient.name)}
                                    </div>
                                 </td>
                              )}
                              {isNurse && (
                                 <td className="px-6 py-4 text-sm text-slate-600">
                                    {patient.status === 'Inpatient' ? (
                                       <span className="bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full text-xs font-medium border border-sky-100">
                                          {getBedInfo(patient.name)}
                                       </span>
                                    ) : (
                                       <span className="text-slate-400 italic">No Bed</span>
                                    )}
                                 </td>
                              )}
                              <td className="px-6 py-4 text-sm text-slate-700 font-medium">
                                 {patient.condition}
                              </td>
                              {!isNurse && (
                                 <td className="px-6 py-4 text-sm text-slate-500">
                                    {patient.lastVisit}
                                 </td>
                              )}
                              <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${(isPatientAdmitted(patient.id) || patient.status === 'Inpatient')
                                       ? 'bg-amber-100 text-amber-800'
                                       : patient.status === 'Discharged'
                                       ? 'bg-slate-200 text-slate-700'
                                       : 'bg-emerald-100 text-emerald-800'
                                    }`}>
                                       {isPatientAdmitted(patient.id) ? 'Admitted' : patient.status}
                                 </span>
                              </td>
                              <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                 <div className="flex items-center justify-end gap-1">
                                    {isNurse ? (
                                       <button onClick={() => handlePatientClick(patient)} className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"><Clipboard size={18} /></button>
                                    ) : (
                                       <>
                                          {(isAdmin || isDoctor || isReceptionist) && (
                                             <button onClick={() => openEditPatient(patient)} className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all" title="Edit Patient"><Pencil size={16} /></button>
                                          )}
                                          {isAdmin && (
                                             <button onClick={() => handleDeletePatient(patient.id, patient.name)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete Patient"><Trash2 size={16} /></button>
                                          )}
                                       </>
                                    )}
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               ) : (
                  <div className="p-12 text-center text-slate-400">
                     <UserIcon size={32} className="mx-auto mb-3 text-slate-300" />
                     <p>No patients found.</p>
                  </div>
               )}
            </div>
         </div>

         {/* NURSE SPECIFIC ACTION MODAL */}
         {showNurseModal && selectedPatient && isNurse && ReactDOM.createPortal(
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-md">
               <div className="flex min-h-full items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden animate-scale-in flex flex-col border border-slate-200/50">
                  {/* Header */}
                  <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-900 to-indigo-900 text-white flex justify-between items-start relative overflow-hidden">
                     <div className="absolute inset-0 opacity-5 bg-[url('data:image/svg+xml,%3Csvg width=\\'40\\' height=\\'40\\' viewBox=\\'0 0 40 40\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'%23fff\\' fill-opacity=\\'0.4\\' fill-rule=\\'evenodd\\'%3E%3Cpath d=\\'M0 38.59l2.83-2.83 1.41 1.41L1.41 40H0v-1.41zM0 20l20-20h1.41L0 21.41V20zM40 0v1.41L1.41 40H0v-1.41L38.59 0H40z\\'/%3E%3C/g%3E%3C/svg%3E')]"></div>
                     <div className="flex gap-4 relative z-10">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-teal-500 text-white flex items-center justify-center text-2xl font-display font-bold shadow-xl shadow-sky-500/20">
                           {selectedPatient.name.charAt(0)}
                        </div>
                        <div>
                           <h2 className="text-2xl font-display font-bold">{selectedPatient.name}</h2>
                           <div className="flex flex-wrap gap-4 text-sm text-slate-300 mt-2">
                              <span className="flex items-center gap-1"><UserIcon size={14} /> ID: {selectedPatient.id.toUpperCase()}</span>
                              <span className="flex items-center gap-1"><AlertCircle size={14} /> {selectedPatient.condition}</span>
                              <span className="flex items-center gap-1"><Stethoscope size={14} /> Dr: {getAttendingDoctor(selectedPatient.name)}</span>
                              <span className="bg-white/10 px-2.5 py-0.5 rounded-full text-xs text-white border border-white/10">
                                 {isPatientAdmitted(selectedPatient.id) ? 'Admitted' : selectedPatient.status}
                              </span>
                           </div>
                        </div>
                     </div>
                     <button onClick={() => setShowNurseModal(false)} className="text-slate-300 hover:text-white transition bg-white/10 p-2 rounded-xl hover:bg-white/20 relative z-10"><X size={20} /></button>
                  </div>

                  <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                     {/* Nurse Sidebar */}
                     <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-4 flex flex-col gap-1">
                        {/* Doctor's Orders tab — shown first, highlighted when there are pending orders */}
                        <button
                           onClick={() => setNurseTab('orders')}
                           className={`text-left px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3 transition-all ${nurseTab === 'orders' ? 'bg-white shadow-md text-sky-700 border border-slate-100' : 'text-slate-600 hover:bg-white/60'}`}
                        >
                           <Clipboard size={18} className={patientNurseOrders.filter(o => o.status === 'Pending' || o.status === 'In Progress').length > 0 ? 'text-amber-500' : ''} />
                           <span className="flex-1">Doctor's Orders</span>
                           {patientNurseOrders.filter(o => o.status === 'Pending' || o.status === 'In Progress').length > 0 && (
                              <span className="bg-amber-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                                 {patientNurseOrders.filter(o => o.status === 'Pending' || o.status === 'In Progress').length}
                              </span>
                           )}
                        </button>
                        <button
                           onClick={() => setNurseTab('care')}
                           className={`text-left px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3 transition-all ${nurseTab === 'care' ? 'bg-white shadow-md text-sky-700 border border-slate-100' : 'text-slate-600 hover:bg-white/60'}`}
                        >
                           <Activity size={18} /> Vitals Monitor
                        </button>
                        <button
                           onClick={() => setNurseTab('meds')}
                           className={`text-left px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3 transition-all ${nurseTab === 'meds' ? 'bg-white shadow-md text-sky-700 border border-slate-100' : 'text-slate-600 hover:bg-white/60'}`}
                        >
                           <Syringe size={18} /> Medications (Vials)
                        </button>
                        <button
                           onClick={() => setNurseTab('notes')}
                           className={`text-left px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3 transition-all ${nurseTab === 'notes' ? 'bg-white shadow-md text-sky-700 border border-slate-100' : 'text-slate-600 hover:bg-white/60'}`}
                        >
                           <FileText size={18} /> Nursing Notes
                        </button>
                     </div>

                     {/* Main Content Area */}
                     <div className="flex-1 overflow-y-auto p-6 bg-white">

                        {/* ── DOCTOR'S ORDERS TAB ── */}
                        {nurseTab === 'orders' && (
                           <div className="space-y-5 animate-fade-in">
                              <div className="flex justify-between items-center">
                                 <h3 className="text-lg font-display font-bold text-slate-800 flex items-center gap-2">
                                    <Clipboard size={20} className="text-teal-500" />
                                    Doctor's Orders
                                 </h3>
                                 <button
                                    onClick={() => fetchPatientOrders(selectedPatient.id)}
                                    disabled={loadingOrders}
                                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-sky-600 px-3 py-1.5 bg-slate-100 hover:bg-sky-50 rounded-lg transition-all"
                                 >
                                    <RefreshCw size={13} className={loadingOrders ? 'animate-spin' : ''} />
                                    Refresh
                                 </button>
                              </div>

                              {loadingOrders ? (
                                 <div className="text-center py-12 text-slate-400">
                                    <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-slate-300" />
                                    Loading orders...
                                 </div>
                              ) : patientNurseOrders.length === 0 ? (
                                 <div className="text-center py-14 text-slate-400">
                                    <Clipboard size={32} className="mx-auto mb-3 text-slate-300" />
                                    <p className="font-semibold">No orders yet.</p>
                                    <p className="text-xs mt-1">When a doctor issues orders they will appear here.</p>
                                 </div>
                              ) : (
                                 <div className="space-y-3">
                                    {patientNurseOrders.map(order => {
                                       const orderedAt = new Date(order.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                                       const updatedAt = new Date(order.updated_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                                       const typeColors: Record<string, string> = {
                                          Medication: 'bg-indigo-100 text-indigo-700 border-indigo-200',
                                          Observation: 'bg-sky-100 text-sky-700 border-sky-200',
                                          Procedure: 'bg-amber-100 text-amber-700 border-amber-200',
                                          Diet: 'bg-lime-100 text-lime-700 border-lime-200',
                                          Mobility: 'bg-violet-100 text-violet-700 border-violet-200',
                                          Other: 'bg-slate-100 text-slate-600 border-slate-200',
                                       };
                                       return (
                                          <div
                                             key={order.id}
                                             className={`rounded-2xl border p-5 transition-all ${order.status === 'Completed' ? 'bg-emerald-50/60 border-emerald-200' : order.status === 'Cancelled' ? 'bg-slate-50 border-slate-200 opacity-60' : order.priority === 'Urgent' ? 'bg-red-50/60 border-red-200 shadow-sm' : 'bg-white border-slate-200 hover:shadow-md hover:border-sky-200'}`}
                                          >
                                             {/* Top row: type + priority + status */}
                                             <div className="flex flex-wrap items-center gap-2 mb-3">
                                                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${typeColors[order.order_type] || typeColors.Other}`}>
                                                   {order.order_type}
                                                </span>
                                                {order.priority === 'Urgent' && (
                                                   <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                                                      <AlertCircle size={10} /> Urgent
                                                   </span>
                                                )}
                                                <span className={`ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full ${order.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : order.status === 'In Progress' ? 'bg-amber-100 text-amber-700' : order.status === 'Cancelled' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                                                   {order.status}
                                                </span>
                                             </div>

                                             {/* Instructions */}
                                             <p className="text-sm font-semibold text-slate-800 leading-snug mb-3">{order.instructions}</p>

                                             {/* Meta row */}
                                             <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mb-4">
                                                <span className="flex items-center gap-1"><Stethoscope size={11} /> {order.doctor_name}</span>
                                                <span className="flex items-center gap-1"><Clock size={11} /> Ordered: {orderedAt}</span>
                                                {order.status === 'Completed' && (
                                                   <span className="flex items-center gap-1 text-emerald-600 font-medium"><CheckCircle2 size={11} /> Executed: {updatedAt}</span>
                                                )}
                                                {order.status === 'In Progress' && (
                                                   <span className="flex items-center gap-1 text-amber-600 font-medium"><Clock size={11} /> Started: {updatedAt}</span>
                                                )}
                                             </div>

                                             {/* Action buttons */}
                                             {order.status === 'Pending' && (
                                                <button
                                                   onClick={() => handleUpdateOrderStatus(order.id, 'In Progress')}
                                                   disabled={updatingOrderId === order.id}
                                                   className="w-full py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                                                >
                                                   {updatingOrderId === order.id ? <RefreshCw size={15} className="animate-spin" /> : <Activity size={15} />}
                                                   {updatingOrderId === order.id ? 'Updating...' : 'Start Order'}
                                                </button>
                                             )}
                                             {order.status === 'In Progress' && (
                                                <button
                                                   onClick={() => handleUpdateOrderStatus(order.id, 'Completed')}
                                                   disabled={updatingOrderId === order.id}
                                                   className="w-full py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                                                >
                                                   {updatingOrderId === order.id ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                                                   {updatingOrderId === order.id ? 'Saving...' : 'Mark as Executed'}
                                                </button>
                                             )}
                                             {order.status === 'Completed' && (
                                                <div className="flex items-center gap-2 py-2 px-3 bg-emerald-100 rounded-xl text-xs font-semibold text-emerald-700">
                                                   <CheckCircle2 size={15} />
                                                   Executed at {updatedAt}
                                                </div>
                                             )}
                                          </div>
                                       );
                                    })}
                                 </div>
                              )}
                           </div>
                        )}

                        {nurseTab === 'care' && (
                           <div className="space-y-6 animate-fade-in">
                              <div className="flex justify-between items-center mb-4">
                                 <h3 className="text-lg font-display font-bold text-slate-800 flex items-center gap-2">
                                    <Thermometer size={20} className="text-teal-500" />
                                    Record Vitals
                                 </h3>
                                 <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Last updated: {vitals[selectedPatient.id]?.lastUpdated || 'Never'}</span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                 <div className="p-5 border border-slate-200 rounded-2xl hover:border-sky-300 hover:shadow-md transition-all group">
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block tracking-wider">Blood Pressure (mmHg)</label>
                                    <div className="flex items-center gap-2">
                                       <input type="text" value={bpValue} onChange={(e) => setBpValue(e.target.value)} placeholder="120/80" className="flex-1 text-2xl font-display font-bold text-slate-800 outline-none placeholder:text-slate-200" />
                                       <Activity size={24} className="text-slate-300 group-hover:text-sky-500 transition-colors" />
                                    </div>
                                 </div>
                                 <div className="p-5 border border-slate-200 rounded-2xl hover:border-red-300 hover:shadow-md transition-all group">
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block tracking-wider">Heart Rate (bpm)</label>
                                    <div className="flex items-center gap-2">
                                       <input type="text" value={hrValue} onChange={(e) => setHrValue(e.target.value)} placeholder="72" className="flex-1 text-2xl font-display font-bold text-slate-800 outline-none placeholder:text-slate-200" />
                                       <Activity size={24} className="text-slate-300 group-hover:text-red-500 transition-colors" />
                                    </div>
                                 </div>
                                 <div className="p-5 border border-slate-200 rounded-2xl hover:border-amber-300 hover:shadow-md transition-all group">
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block tracking-wider">Temperature (°F)</label>
                                    <div className="flex items-center gap-2">
                                       <input type="text" value={tempValue} onChange={(e) => setTempValue(e.target.value)} placeholder="98.6" className="flex-1 text-2xl font-display font-bold text-slate-800 outline-none placeholder:text-slate-200" />
                                       <Thermometer size={24} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
                                    </div>
                                 </div>
                                 <div className="p-5 border border-slate-200 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all group">
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block tracking-wider">SpO2 (%)</label>
                                    <div className="flex items-center gap-2">
                                       <input type="text" value={spo2Value} onChange={(e) => setSpo2Value(e.target.value)} placeholder="98" className="flex-1 text-2xl font-display font-bold text-slate-800 outline-none placeholder:text-slate-200" />
                                       <Activity size={24} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                 </div>
                              </div>

                              <div className="flex justify-end pt-4">
                                 <button onClick={handleSaveVitals} className="bg-gradient-to-r from-sky-500 to-teal-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:from-sky-600 hover:to-teal-600 shadow-lg shadow-sky-500/20 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                    <CheckCircle2 size={18} />
                                    Log Vitals Entry
                                 </button>
                              </div>
                           </div>
                        )}

                        {nurseTab === 'meds' && (
                           <div className="space-y-6 animate-fade-in">
                              <div className="flex justify-between items-center mb-4">
                                 <h3 className="text-lg font-display font-bold text-slate-800 flex items-center gap-2">
                                    <Syringe size={20} className="text-teal-500" />
                                    Medication Administration Record (MAR)
                                 </h3>
                              </div>

                              <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-100 p-4 rounded-xl mb-6">
                                 <p className="text-sm text-sky-800 font-medium flex items-center gap-2">
                                    <AlertCircle size={16} />
                                    Please verify patient ID band before administering any vials or injections.
                                 </p>
                              </div>

                              <div className="space-y-3">
                                 {loadingOrders ? (
                                    <div className="text-center py-8 text-slate-400">
                                       <RefreshCw size={22} className="mx-auto mb-2 animate-spin text-slate-300" />
                                       Loading orders...
                                    </div>
                                 ) : patientNurseOrders.filter(o => o.order_type === 'Medication').length === 0 ? (
                                    <div className="text-center py-10 text-slate-400">
                                       <Syringe size={28} className="mx-auto mb-2 text-slate-300" />
                                       <p className="font-medium">No medication orders found.</p>
                                       <p className="text-xs mt-1">Orders will appear when a doctor prescribes medications.</p>
                                    </div>
                                 ) : (
                                    patientNurseOrders.filter(o => o.order_type === 'Medication').map((order) => (
                                       <div key={order.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border border-slate-200 rounded-2xl hover:shadow-md hover:border-sky-200 transition-all bg-white group">
                                          <div className="flex items-start gap-4 mb-3 sm:mb-0">
                                             <div className={`p-3 rounded-xl flex-shrink-0 ${order.priority === 'Urgent' ? 'bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/20' : 'bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-lg shadow-sky-500/20'}`}>
                                                <Syringe size={22} />
                                             </div>
                                             <div>
                                                <h4 className="font-display font-bold text-slate-800">{order.instructions}</h4>
                                                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                                                   <span className={`px-2 py-0.5 rounded-full font-semibold ${order.priority === 'Urgent' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{order.priority}</span>
                                                   <span className="flex items-center gap-1"><Stethoscope size={12} /> Ordered by: {order.doctor_name}</span>
                                                   <span className="flex items-center gap-1"><Clock size={12} /> {new Date(order.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                   {order.status === 'Completed' && (
                                                      <span className="flex items-center gap-1 text-emerald-600 font-semibold"><CheckCircle2 size={12} /> Done: {new Date(order.updated_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                   )}
                                                </div>
                                             </div>
                                          </div>

                                          {order.status === 'Completed' ? (
                                             <button disabled className="w-full sm:w-auto px-5 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 cursor-default">
                                                <CheckCircle2 size={16} />
                                                Given
                                             </button>
                                          ) : order.status === 'Cancelled' ? (
                                             <span className="w-full sm:w-auto px-5 py-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-sm font-semibold flex items-center justify-center">Cancelled</span>
                                          ) : (
                                             <button
                                                onClick={() => handleAdminister(order.id)}
                                                disabled={administeringId === order.id}
                                                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-xl text-sm font-semibold hover:from-sky-600 hover:to-teal-600 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-sky-500/20 disabled:opacity-50"
                                             >
                                                {administeringId === order.id ? 'Saving...' : 'Administer'}
                                             </button>
                                          )}
                                       </div>
                                    ))
                                 )}
                              </div>
                           </div>
                        )}

                        {nurseTab === 'notes' && (
                           <div className="h-full flex flex-col animate-fade-in">
                              <h3 className="text-lg font-display font-bold text-slate-800 flex items-center gap-2 mb-4">
                                 <FileText size={20} className="text-teal-500" />
                                 Shift Notes
                              </h3>

                              <div className="flex-1 border border-slate-200 rounded-2xl p-4 mb-4 bg-slate-50 overflow-y-auto space-y-3">
                                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-center mb-2">
                                       <span className="text-xs font-bold text-slate-700">Nurse Jackie</span>
                                       <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Today, 09:15 AM</span>
                                    </div>
                                    <p className="text-sm text-slate-600">Patient reported mild nausea after breakfast. Administered anti-emetic as per standing order. Resting comfortably now.</p>
                                 </div>
                                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-center mb-2">
                                       <span className="text-xs font-bold text-slate-700">Nurse Ben</span>
                                       <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Yesterday, 10:00 PM</span>
                                    </div>
                                    <p className="text-sm text-slate-600">Night rounds completed. Vitals stable. Patient sleeping.</p>
                                 </div>
                              </div>

                              <div className="mt-auto">
                                 <label className="text-sm font-medium text-slate-700 mb-2 block">Add New Note (Logged as: {user?.name})</label>
                                 <textarea className="w-full p-4 border border-slate-200 rounded-xl text-sm h-24 resize-none focus:outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all" placeholder="Type observation here..."></textarea>
                                 <div className="flex justify-end mt-3">
                                    <button className="bg-gradient-to-r from-sky-500 to-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:from-sky-600 hover:to-teal-600 shadow-lg shadow-sky-500/20 transition-all">Add Note</button>
                                 </div>
                              </div>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
               </div>
            </div>
         , document.body)}

         {/* EDIT PATIENT MODAL */}
         {isEditPatientOpen && editingPatient && ReactDOM.createPortal(
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-md">
               <div className="flex min-h-full items-center justify-center p-4">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in border border-slate-200/50">
                  <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-sky-600 to-teal-600 text-white flex justify-between items-center">
                     <div>
                        <h3 className="text-xl font-display font-bold">Edit Patient</h3>
                        <p className="text-sky-100 text-sm">{editingPatient.full_name || editingPatient.name}</p>
                     </div>
                     <button onClick={() => { setIsEditPatientOpen(false); setEditPatientMsg(null); }} className="text-sky-200 hover:text-white transition"><X size={22} /></button>
                  </div>
                  <form onSubmit={handleUpdatePatient} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                     {editPatientMsg && (
                        <div className={`p-3 rounded-xl text-sm ${editPatientMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{editPatientMsg.text}</div>
                     )}
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Admin-only fields */}
                        {isAdmin && (
                           <>
                              <div className="sm:col-span-2">
                                 <label className="block text-xs font-semibold text-slate-500 mb-1">Full Name</label>
                                 <input type="text" required value={editPatientForm.full_name} onChange={e => setEditPatientForm(f => ({ ...f, full_name: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
                              </div>
                              <div>
                                 <label className="block text-xs font-semibold text-slate-500 mb-1">Age</label>
                                 <input type="number" value={editPatientForm.age} onChange={e => setEditPatientForm(f => ({ ...f, age: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none" />
                              </div>
                              <div>
                                 <label className="block text-xs font-semibold text-slate-500 mb-1">Gender</label>
                                 <select value={editPatientForm.gender} onChange={e => setEditPatientForm(f => ({ ...f, gender: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none bg-white">
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                 </select>
                              </div>
                              <div>
                                 <label className="block text-xs font-semibold text-slate-500 mb-1">Blood Type</label>
                                 <input type="text" value={editPatientForm.blood_type} onChange={e => setEditPatientForm(f => ({ ...f, blood_type: e.target.value }))} placeholder="A+, B-, O+" className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none" />
                              </div>
                              <div>
                                 <label className="block text-xs font-semibold text-slate-500 mb-1">Last Visit</label>
                                 <input type="date" value={editPatientForm.last_visit} onChange={e => setEditPatientForm(f => ({ ...f, last_visit: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none" />
                              </div>
                              <div className="sm:col-span-2">
                                 <label className="block text-xs font-semibold text-slate-500 mb-1">Allergies</label>
                                 <input type="text" value={editPatientForm.allergies} onChange={e => setEditPatientForm(f => ({ ...f, allergies: e.target.value }))} placeholder="None known" className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none" />
                              </div>
                           </>
                        )}
                        {/* Doctor / Admin editable */}
                        {(isAdmin || isDoctor) && (
                           <div className="sm:col-span-2">
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Medical Condition</label>
                              <input type="text" value={editPatientForm.medical_condition} onChange={e => setEditPatientForm(f => ({ ...f, medical_condition: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
                           </div>
                        )}
                        {/* Vitals – Doctor editable */}
                        {isDoctor && (
                           <div className="sm:col-span-2">
                              <div className="mt-1 mb-3 flex items-center gap-2">
                                 <Activity size={15} className="text-sky-500" />
                                 <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Vitals</span>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                 <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Blood Pressure (mmHg)</label>
                                    <input type="text" value={editVitalsForm.bp} onChange={e => setEditVitalsForm(f => ({ ...f, bp: e.target.value }))} placeholder="120/80" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-sky-400" />
                                 </div>
                                 <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Heart Rate (bpm)</label>
                                    <input type="text" value={editVitalsForm.heartRate} onChange={e => setEditVitalsForm(f => ({ ...f, heartRate: e.target.value }))} placeholder="72" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-400" />
                                 </div>
                                 <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Temperature (°F)</label>
                                    <input type="text" value={editVitalsForm.temperature} onChange={e => setEditVitalsForm(f => ({ ...f, temperature: e.target.value }))} placeholder="98.6" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-400" />
                                 </div>
                                 <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">SpO2 (%)</label>
                                    <input type="text" value={editVitalsForm.spO2} onChange={e => setEditVitalsForm(f => ({ ...f, spO2: e.target.value }))} placeholder="98" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
                                 </div>
                              </div>
                           </div>
                        )}
                        {/* Receptionist / Admin editable */}
                        {(isAdmin || isReceptionist) && (
                           <div className={isAdmin ? '' : 'sm:col-span-2'}>
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Contact</label>
                              <input type="text" value={editPatientForm.contact} onChange={e => setEditPatientForm(f => ({ ...f, contact: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
                           </div>
                        )}
                        {/* All editors can change status */}
                        <div>
                           <label className="block text-xs font-semibold text-slate-500 mb-1">Status</label>
                           <select value={editPatientForm.status} onChange={e => setEditPatientForm(f => ({ ...f, status: e.target.value as any }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none bg-white">
                              <option value="Outpatient">Outpatient</option>
                              <option value="Inpatient">Inpatient</option>
                              <option value="Discharged">Discharged</option>
                           </select>
                        </div>
                     </div>
                     <div className="pt-4 border-t border-slate-100 flex gap-3">
                        <button type="button" onClick={() => { setIsEditPatientOpen(false); setEditPatientMsg(null); }} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition">Cancel</button>
                        <button type="submit" disabled={isEditPatientSubmitting} className="flex-1 bg-gradient-to-r from-sky-500 to-teal-500 text-white px-4 py-2.5 rounded-xl font-bold hover:from-sky-600 hover:to-teal-600 transition-all disabled:opacity-50">
                           {isEditPatientSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                     </div>
                  </form>
               </div>
               </div>
            </div>
         , document.body)}

         {/* STANDARD PATIENT DETAIL MODAL */}
         {selectedPatient && !isNurse && ReactDOM.createPortal(
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-md">
               <div className="flex min-h-full items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-scale-in flex flex-col border border-slate-200/50">
                  <div className="p-6 border-b border-slate-200 flex justify-between items-start bg-gradient-to-r from-slate-50 to-sky-50/50">
                     <div className="flex gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-100 to-teal-100 text-sky-600 flex items-center justify-center text-2xl font-display font-bold">
                           {selectedPatient.name.charAt(0)}
                        </div>
                        <div>
                           <h2 className="text-2xl font-display font-bold text-slate-800">{selectedPatient.name}</h2>
                           <div className="flex gap-4 text-sm text-slate-500 mt-1">
                              <span className="font-mono">ID: {selectedPatient.id.toUpperCase()}</span>
                              <span>{selectedPatient.age} yrs, {selectedPatient.gender}</span>
                              <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full text-xs font-semibold">{selectedPatient.bloodType}</span>
                           </div>
                        </div>
                     </div>
                     <button onClick={() => { setSelectedPatient(null); setShowOrderForm(false); setOrderMsg(null); }} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-all"><X size={22} /></button>
                  </div>

                  <div className="flex border-b border-slate-200 bg-white">
                     <button onClick={() => setActiveTab('overview')} className={`px-6 py-3 text-sm font-medium transition-all ${activeTab === 'overview' ? 'border-b-2 border-sky-500 text-sky-700' : 'text-slate-500 hover:text-slate-700'}`}>Overview</button>
                     <button onClick={() => setActiveTab('vitals')} className={`px-6 py-3 text-sm font-medium transition-all ${activeTab === 'vitals' ? 'border-b-2 border-sky-500 text-sky-700' : 'text-slate-500 hover:text-slate-700'}`}>Vitals & Nursing</button>
                     <button onClick={() => setActiveTab('records')} className={`px-6 py-3 text-sm font-medium transition-all ${activeTab === 'records' ? 'border-b-2 border-sky-500 text-sky-700' : 'text-slate-500 hover:text-slate-700'}`}>Medical Records</button>
                     {isDoctor && <button onClick={() => setActiveTab('orders')} className={`px-6 py-3 text-sm font-medium transition-all ${activeTab === 'orders' ? 'border-b-2 border-sky-500 text-sky-700' : 'text-slate-500 hover:text-slate-700'}`}>Nurse Orders</button>}
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                     {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                           <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                              <h3 className="font-display font-bold text-slate-800 mb-3 flex items-center gap-2"><Activity size={18} className="text-sky-500" /> Current Condition</h3>
                              <p className="text-slate-600">{selectedPatient.condition}</p>
                              <div className="mt-4 pt-4 border-t border-slate-100">
                                 <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Allergies</p>
                                 <p className="text-red-500 font-medium">{selectedPatient.allergies}</p>
                              </div>
                           </div>
                           <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                              <h3 className="font-display font-bold text-slate-800 mb-3 flex items-center gap-2"><UserIcon size={18} className="text-sky-500" /> Contact Info</h3>
                              <p className="text-slate-600">{selectedPatient.contact}</p>
                              <p className="text-sm text-slate-500 mt-1">Emergency Contact: Jane Doe (Wife) - 555-9999</p>
                           </div>
                        </div>
                     )}

                     {activeTab === 'vitals' && (
                        <div className="space-y-6 animate-fade-in">
                           <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                              <h3 className="font-display font-bold text-slate-800 mb-3">Vitals History</h3>
                              <div className="space-y-3">
                                 <div className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-xl">
                                    <span className="text-slate-600">{vitals[selectedPatient.id]?.lastUpdated || 'No recent data'}</span>
                                    <span className="font-mono text-slate-700">{vitals[selectedPatient.id]?.bp || '--/--'} mmHg</span>
                                    <span className="font-mono text-slate-700">{vitals[selectedPatient.id]?.heartRate || '--'} bpm</span>
                                    <span className="font-mono text-slate-700">{vitals[selectedPatient.id]?.temperature || '--'} °F</span>
                                 </div>
                              </div>
                           </div>
                        </div>
                     )}

                     {activeTab === 'records' && (
                        <div className="space-y-6 animate-fade-in">
                           {isDoctor && (
                              <div className="bg-white p-5 rounded-xl border border-indigo-200 shadow-sm">
                                 <h3 className="font-display font-bold text-indigo-800 mb-4 flex items-center gap-2"><FileText size={18} /> Add Diagnosis & Treatment</h3>
                                 <textarea className="w-full p-4 border border-slate-200 rounded-xl text-sm h-24 focus:outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all" placeholder="Enter clinical notes, diagnosis, or prescription..."></textarea>
                                 <div className="mt-4 text-right">
                                    <button className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:from-indigo-600 hover:to-purple-600 shadow-lg shadow-indigo-500/20 transition-all">Add Record</button>
                                 </div>
                              </div>
                           )}

                           <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                              <h3 className="font-display font-bold text-slate-800 mb-3">Past Medical History</h3>
                              <div className="space-y-4">
                                 <div className="border-l-4 border-sky-500 pl-4 py-1">
                                    <p className="text-sm font-bold text-slate-900">General Checkup - Oct 25, 2023</p>
                                    <p className="text-sm text-slate-600 mt-1">Patient reported mild headaches. Prescribed Paracetamol. BP normal.</p>
                                    <div className="mt-2 flex gap-2">
                                       <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-full text-slate-500 flex items-center gap-1"><UserIcon size={10} /> Dr. Sarah Bennett</span>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     )}

                     {activeTab === 'orders' && isDoctor && (
                        <div className="space-y-5 animate-fade-in">
                           <div className="flex justify-between items-center">
                              <h3 className="font-display font-bold text-slate-800 flex items-center gap-2">
                                 <Clipboard size={18} className="text-teal-500" />
                                 Nursing Care Orders
                              </h3>
                              <button
                                 onClick={() => { setShowOrderForm(v => !v); setOrderMsg(null); }}
                                 className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:from-sky-600 hover:to-teal-600 transition-all shadow-lg shadow-sky-500/20"
                              >
                                 <Plus size={16} />
                                 New Order
                              </button>
                           </div>

                           {showOrderForm && (
                              <form onSubmit={handleCreateOrder} className="bg-sky-50 border border-sky-200 rounded-2xl p-5 space-y-4">
                                 <h4 className="font-semibold text-sky-800 text-sm">Create Nursing Order for {selectedPatient?.name}</h4>
                                 {orderMsg && (
                                    <div className={`p-3 rounded-xl text-sm ${orderMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{orderMsg.text}</div>
                                 )}
                                 <div className="grid grid-cols-2 gap-4">
                                    <div>
                                       <label className="block text-xs font-semibold text-slate-500 mb-1">Order Type</label>
                                       <select
                                          value={orderForm.order_type}
                                          onChange={e => setOrderForm(f => ({ ...f, order_type: e.target.value as NurseOrderType }))}
                                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-sky-400"
                                       >
                                          {(['Medication', 'Observation', 'Procedure', 'Diet', 'Mobility', 'Other'] as NurseOrderType[]).map(t => (
                                             <option key={t} value={t}>{t}</option>
                                          ))}
                                       </select>
                                    </div>
                                    <div>
                                       <label className="block text-xs font-semibold text-slate-500 mb-1">Priority</label>
                                       <select
                                          value={orderForm.priority}
                                          onChange={e => setOrderForm(f => ({ ...f, priority: e.target.value as 'Normal' | 'Urgent' }))}
                                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-sky-400"
                                       >
                                          <option value="Normal">Normal</option>
                                          <option value="Urgent">Urgent</option>
                                       </select>
                                    </div>
                                 </div>
                                 <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Instructions</label>
                                    <textarea
                                       required
                                       value={orderForm.instructions}
                                       onChange={e => setOrderForm(f => ({ ...f, instructions: e.target.value }))}
                                       placeholder="e.g., Morphine 4mg IV every 4 hours for pain management"
                                       className="w-full p-3 border border-slate-200 rounded-lg text-sm h-20 resize-none focus:outline-none focus:ring-1 focus:ring-sky-400"
                                    />
                                 </div>
                                 <div className="flex gap-3 justify-end">
                                    <button type="button" onClick={() => setShowOrderForm(false)} className="px-4 py-2 text-slate-600 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition">Cancel</button>
                                    <button type="submit" disabled={submittingOrder} className="bg-gradient-to-r from-sky-500 to-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:from-sky-600 hover:to-teal-600 transition-all disabled:opacity-50">
                                       {submittingOrder ? 'Sending...' : 'Send Order'}
                                    </button>
                                 </div>
                              </form>
                           )}

                           {loadingOrders ? (
                              <div className="text-center py-8 text-slate-400">
                                 <RefreshCw size={22} className="mx-auto mb-2 animate-spin text-slate-300" />
                                 Loading orders...
                              </div>
                           ) : patientNurseOrders.length === 0 ? (
                              <div className="text-center py-10 text-slate-400">
                                 <Clipboard size={28} className="mx-auto mb-2 text-slate-300" />
                                 <p className="font-medium">No nurse orders yet.</p>
                                 <p className="text-xs mt-1">Create an order above to instruct the nursing team.</p>
                              </div>
                           ) : (
                              <div className="space-y-3">
                                 {patientNurseOrders.map(order => (
                                    <div key={order.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                       <div className="flex justify-between items-start gap-3">
                                          <div className="flex items-start gap-3 min-w-0">
                                             <span className={`mt-0.5 flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${order.order_type === 'Medication' ? 'bg-indigo-100 text-indigo-700' : order.order_type === 'Observation' ? 'bg-sky-100 text-sky-700' : order.order_type === 'Procedure' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {order.order_type}
                                             </span>
                                             <div className="min-w-0">
                                                <p className="text-sm font-medium text-slate-800">{order.instructions}</p>
                                                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                                                   {order.nurse_name ? <span>Assigned to: {order.nurse_name}</span> : <span className="italic">Unassigned</span>}
                                                   <span>{new Date(order.created_at).toLocaleDateString()}</span>
                                                </div>
                                             </div>
                                          </div>
                                          <div className="flex items-center gap-2 flex-shrink-0">
                                             {order.priority === 'Urgent' && (
                                                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Urgent</span>
                                             )}
                                             <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${order.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : order.status === 'Cancelled' ? 'bg-rose-100 text-rose-700' : order.status === 'In Progress' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {order.status}
                                             </span>
                                          </div>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           )}
                        </div>
                     )}
                  </div>
               </div>
               </div>
            </div>
         , document.body)}
      </div>
   );
};