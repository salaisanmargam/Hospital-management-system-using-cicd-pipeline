import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Plus, Search, Filter, Pencil, Trash2, User as UserIcon, X, Activity, FileText, Pill, Thermometer, Syringe, Stethoscope, Clipboard, CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { User, UserRole } from '../types';
import { AUTH_STORAGE_KEY, updatePatient, deletePatient } from '../services/api';
import { useData } from '../contexts/DataContext';

interface PatientsProps {
   user?: User;
}

interface NursingOrder {
   id: string;
   medication: string;
   dosage: string;
   type: 'Oral' | 'IV/Vial' | 'Injection';
   timing: string;
   status: 'Pending' | 'Administered';
   prescribedBy: string;
}

export const Patients: React.FC<PatientsProps> = ({ user }) => {
   const { patients, appointments, beds, vitals, updateVitals, refreshPatients, isLoading } = useData();
   const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
   const [activeTab, setActiveTab] = useState<'overview' | 'vitals' | 'records'>('overview');

   const [nurseTab, setNurseTab] = useState<'care' | 'meds' | 'notes'>('care');
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
      status: 'Outpatient' as 'Outpatient' | 'Inpatient',
      blood_type: '', allergies: '',
   });

   const openEditPatient = (p: any) => {
      setEditingPatient(p);
      setEditPatientForm({
         full_name: p.full_name || p.name || '',
         age: p.age != null ? String(p.age) : '',
         gender: p.gender || 'Male',
         contact: p.contact || '',
         last_visit: p.last_visit || p.lastVisit || '',
         medical_condition: p.medical_condition || p.condition || '',
         status: p.status as 'Outpatient' | 'Inpatient' || 'Outpatient',
         blood_type: p.blood_type || p.bloodType || '',
         allergies: p.allergies || '',
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

   const handlePatientClick = (patient: any) => {
      setSelectedPatient(patient);
      const pVitals = vitals[patient.id];
      setBpValue(pVitals?.bp || '');
      setHrValue(pVitals?.heartRate || '');
      setTempValue(pVitals?.temperature || '');
      setSpo2Value(pVitals?.spO2 || '');

      if (isNurse) {
         setShowNurseModal(true);
         setNurseTab('care');
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

   const mockNurseOrders: NursingOrder[] = [
      { id: 'o1', medication: 'Morphine Sulfate', dosage: '4mg', type: 'IV/Vial', timing: 'Every 4 hours', status: 'Pending', prescribedBy: getAttendingDoctor(selectedPatient?.name || '') },
      { id: 'o2', medication: 'Paracetamol', dosage: '500mg', type: 'Oral', timing: 'After lunch', status: 'Administered', prescribedBy: getAttendingDoctor(selectedPatient?.name || '') },
      { id: 'o3', medication: 'Ceftriaxone', dosage: '1g', type: 'Injection', timing: 'Twice Daily', status: 'Pending', prescribedBy: getAttendingDoctor(selectedPatient?.name || '') },
   ];

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
                                 <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${patient.status === 'Inpatient'
                                       ? 'bg-amber-100 text-amber-800'
                                       : 'bg-emerald-100 text-emerald-800'
                                    }`}>
                                    {patient.status}
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
                              <span className="bg-white/10 px-2.5 py-0.5 rounded-full text-xs text-white border border-white/10">{selectedPatient.status}</span>
                           </div>
                        </div>
                     </div>
                     <button onClick={() => setShowNurseModal(false)} className="text-slate-300 hover:text-white transition bg-white/10 p-2 rounded-xl hover:bg-white/20 relative z-10"><X size={20} /></button>
                  </div>

                  <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                     {/* Nurse Sidebar */}
                     <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-4 flex flex-col gap-1">
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
                           <Clipboard size={18} /> Nursing Notes
                        </button>
                     </div>

                     {/* Main Content Area */}
                     <div className="flex-1 overflow-y-auto p-6 bg-white">
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
                                 {mockNurseOrders.map((order) => (
                                    <div key={order.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border border-slate-200 rounded-2xl hover:shadow-md hover:border-sky-200 transition-all bg-white group">
                                       <div className="flex items-start gap-4 mb-3 sm:mb-0">
                                          <div className={`p-3 rounded-xl ${order.type === 'IV/Vial' ? 'bg-gradient-to-br from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/20' : order.type === 'Injection' ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/20' : 'bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-lg shadow-sky-500/20'}`}>
                                             {order.type === 'IV/Vial' || order.type === 'Injection' ? <Syringe size={22} /> : <Pill size={22} />}
                                          </div>
                                          <div>
                                             <h4 className="font-display font-bold text-slate-800">{order.medication}</h4>
                                             <p className="text-sm text-slate-600">{order.dosage} • {order.type}</p>
                                             <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                                <span className="flex items-center gap-1"><Clock size={12} /> {order.timing}</span>
                                                <span className="flex items-center gap-1"><Stethoscope size={12} /> Ordered by: {order.prescribedBy}</span>
                                             </div>
                                          </div>
                                       </div>

                                       {order.status === 'Pending' ? (
                                          <button className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-xl text-sm font-semibold hover:from-sky-600 hover:to-teal-600 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-sky-500/20">
                                             Administer
                                          </button>
                                       ) : (
                                          <button disabled className="w-full sm:w-auto px-5 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 cursor-default">
                                             <CheckCircle2 size={16} />
                                             Given
                                          </button>
                                       )}
                                    </div>
                                 ))}
                              </div>
                           </div>
                        )}

                        {nurseTab === 'notes' && (
                           <div className="h-full flex flex-col animate-fade-in">
                              <h3 className="text-lg font-display font-bold text-slate-800 flex items-center gap-2 mb-4">
                                 <Clipboard size={20} className="text-teal-500" />
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
                     <button onClick={() => setSelectedPatient(null)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-all"><X size={22} /></button>
                  </div>

                  <div className="flex border-b border-slate-200 bg-white">
                     <button onClick={() => setActiveTab('overview')} className={`px-6 py-3 text-sm font-medium transition-all ${activeTab === 'overview' ? 'border-b-2 border-sky-500 text-sky-700' : 'text-slate-500 hover:text-slate-700'}`}>Overview</button>
                     <button onClick={() => setActiveTab('vitals')} className={`px-6 py-3 text-sm font-medium transition-all ${activeTab === 'vitals' ? 'border-b-2 border-sky-500 text-sky-700' : 'text-slate-500 hover:text-slate-700'}`}>Vitals & Nursing</button>
                     <button onClick={() => setActiveTab('records')} className={`px-6 py-3 text-sm font-medium transition-all ${activeTab === 'records' ? 'border-b-2 border-sky-500 text-sky-700' : 'text-slate-500 hover:text-slate-700'}`}>Medical Records</button>
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
                  </div>
               </div>
               </div>
            </div>
         , document.body)}
      </div>
   );
};