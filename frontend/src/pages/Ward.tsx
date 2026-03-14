import React, { useState, useEffect, useCallback } from 'react';
import { BedDouble, User, Activity, FileText, PenTool as Tool, LogOut, Sparkles, UserPlus, Lock, X, Check, Search, ClipboardList, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { User as UserType, UserRole, NurseOrder, NurseOrderType, NurseOrderStatus, Vitals } from '../types';
import { useData } from '../contexts/DataContext';
import { listNurseOrders, createNurseOrder, updateNurseOrderStatus, assignNurseToOrder, AUTH_STORAGE_KEY } from '../services/api';

interface WardProps {
   user?: UserType;
}

export const Ward: React.FC<WardProps> = ({ user }) => {
   const { beds, patients, admitPatient, dischargePatient, blockBedForMaintenance, markBedReady, staff, vitals, updateVitals } = useData();

   const [showAdmitModal, setShowAdmitModal] = useState(false);
   const [selectedBed, setSelectedBed] = useState<{ id: string, number: string, ward: string } | null>(null);
   const [selectedPatientId, setSelectedPatientId] = useState('');

   // ── Nurse Orders state ──────────────────────────────────────────────────────
   const [nurseOrders, setNurseOrders] = useState<NurseOrder[]>([]);
   const [ordersLoading, setOrdersLoading] = useState(false);
   const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
   const [showUpdateOrderModal, setShowUpdateOrderModal] = useState(false);
   const [selectedOrder, setSelectedOrder] = useState<NurseOrder | null>(null);
   const [orderForm, setOrderForm] = useState({
      patient_id: '',
      nurse_id: '',
      order_type: 'Medication' as NurseOrderType,
      instructions: '',
      priority: 'Normal' as 'Normal' | 'Urgent',
   });
   const [updateForm, setUpdateForm] = useState({ status: '' as NurseOrderStatus, notes: '' });
   const [orderError, setOrderError] = useState('');

   // ── Vitals modal state ─────────────────────────────────────────────────────
   const [showVitalsModal, setShowVitalsModal] = useState(false);
   const [vitalsPatient, setVitalsPatient] = useState<{ id: string; name: string } | null>(null);
   const [vitalsForm, setVitalsForm] = useState({ bp: '', heartRate: '', temperature: '', spO2: '' });
   const [vitalsSaving, setVitalsSaving] = useState(false);

   // ── Notes modal state ──────────────────────────────────────────────────────
   const [showNotesModal, setShowNotesModal] = useState(false);
   const [notesPatient, setNotesPatient] = useState<{ id: string; name: string } | null>(null);
   const [patientNotes, setPatientNotes] = useState<Record<string, string>>({});
   const [currentNote, setCurrentNote] = useState('');

   const isNurse = user?.role === UserRole.NURSE;
   const isDoctor = user?.role === UserRole.DOCTOR;
   const isReceptionist = user?.role === UserRole.RECEPTIONIST;
   const isAdmin = user?.role === UserRole.ADMIN;

   const getToken = () => {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!stored) return null;
      try { return (JSON.parse(stored) as { token: string }).token; } catch { return null; }
   };

   const fetchOrders = useCallback(async () => {
      const token = getToken();
      if (!token) return;
      setOrdersLoading(true);
      try {
         const data = await listNurseOrders(token);
         setNurseOrders(data.map((o: any) => ({
            ...o,
            id: String(o.id),
            patient_id: String(o.patient_id),
            doctor_id: String(o.doctor_id),
            nurse_id: o.nurse_id ? String(o.nurse_id) : undefined,
         })));
      } catch (e) {
         // silently ignore — orders panel will just be empty
      } finally {
         setOrdersLoading(false);
      }
   }, []);

   useEffect(() => {
      fetchOrders();
   }, [fetchOrders]);

   // Stats
   const totalBeds = beds.length;
   const occupied = beds.filter(b => b.status === 'Occupied').length;
   const available = beds.filter(b => b.status === 'Available').length;
   const maintenance = beds.filter(b => b.status === 'Maintenance').length;

   const handleOpenVitals = (patientId: string, patientName: string) => {
      const existing = vitals[patientId];
      setVitalsForm({
         bp: existing?.bp || '',
         heartRate: existing?.heartRate || '',
         temperature: existing?.temperature || '',
         spO2: existing?.spO2 || '',
      });
      setVitalsPatient({ id: patientId, name: patientName });
      setShowVitalsModal(true);
   };

   const handleSaveVitals = async () => {
      if (!vitalsPatient) return;
      setVitalsSaving(true);
      try {
         await updateVitals(vitalsPatient.id, {
            ...vitalsForm,
            lastUpdated: new Date().toISOString(),
         });
         setShowVitalsModal(false);
      } finally {
         setVitalsSaving(false);
      }
   };

   const handleOpenNotes = (patientId: string, patientName: string) => {
      setCurrentNote(patientNotes[patientId] || '');
      setNotesPatient({ id: patientId, name: patientName });
      setShowNotesModal(true);
   };

   const handleSaveNote = () => {
      if (!notesPatient) return;
      setPatientNotes(prev => ({ ...prev, [notesPatient.id]: currentNote }));
      setShowNotesModal(false);
   };

   const handleAdmitClick = (bed: typeof beds[0]) => {
      setSelectedBed({ id: bed.id, number: bed.number, ward: bed.ward });
      setShowAdmitModal(true);
   };

   const handleConfirmAdmission = () => {
      if (!selectedBed || !selectedPatientId) return;

      const patient = patients.find(p => p.id === selectedPatientId);
      if (patient) {
         admitPatient(selectedBed.id, patient.id, patient.name);
      }

      setShowAdmitModal(false);
      setSelectedBed(null);
      setSelectedPatientId('');
   };

   const handleDischarge = (bedId: string) => {
      if (confirm('Are you sure you want to discharge this patient?')) {
         dischargePatient(bedId);
      }
   };

   // ── Nurse Order handlers ──────────────────────────────────────────────────
   const nurseStaff = staff.filter(s => s.role === UserRole.NURSE);

   const handleCreateOrder = async () => {
      setOrderError('');
      const token = getToken();
      if (!token) return;
      if (!orderForm.patient_id || !orderForm.instructions.trim()) {
         setOrderError('Patient and instructions are required.');
         return;
      }
      try {
         await createNurseOrder(token, {
            patient_id: Number(orderForm.patient_id),
            nurse_id: orderForm.nurse_id ? Number(orderForm.nurse_id) : null,
            order_type: orderForm.order_type,
            instructions: orderForm.instructions,
            priority: orderForm.priority,
         });
         setShowCreateOrderModal(false);
         setOrderForm({ patient_id: '', nurse_id: '', order_type: 'Medication', instructions: '', priority: 'Normal' });
         fetchOrders();
      } catch (e: any) {
         setOrderError(e.message ?? 'Failed to create order');
      }
   };

   const handleUpdateOrder = async () => {
      if (!selectedOrder) return;
      const token = getToken();
      if (!token) return;
      try {
         await updateNurseOrderStatus(token, selectedOrder.id, updateForm.status, updateForm.notes);
         setShowUpdateOrderModal(false);
         setSelectedOrder(null);
         fetchOrders();
      } catch (e: any) {
         setOrderError(e.message ?? 'Failed to update order');
      }
   };

   const openUpdateModal = (order: NurseOrder) => {
      setSelectedOrder(order);
      setUpdateForm({ status: order.status, notes: order.notes ?? '' });
      setOrderError('');
      setShowUpdateOrderModal(true);
   };

   const statusColor = (s: NurseOrderStatus) => {
      if (s === 'Completed') return 'bg-emerald-100 text-emerald-700';
      if (s === 'In Progress') return 'bg-sky-100 text-sky-700';
      if (s === 'Cancelled') return 'bg-red-100 text-red-600';
      return 'bg-amber-100 text-amber-700';
   };

   const priorityColor = (p: string) =>
      p === 'Urgent' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600';

   const orderTypeIcon: Record<NurseOrderType, string> = {
      Medication: '💊',
      Observation: '👁️',
      Procedure: '🩺',
      Diet: '🥗',
      Mobility: '🚶',
      Other: '📋',
   };

   return (
      <div className="space-y-6">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
               <h2 className="text-2xl font-display font-bold text-slate-800">Ward Management</h2>
               <p className="text-slate-500">
                  {isNurse ? 'Manage patient discharge, bed hygiene status, and your care orders.' :
                     isDoctor ? 'Create nursing care orders for admitted patients.' :
                     isReceptionist ? 'Check bed availability and allocate new admissions.' :
                        'Track bed availability and patient allocation.'}
               </p>
            </div>
            <div className="flex items-center gap-3">
               {isDoctor && (
                  <button
                     onClick={() => { setOrderError(''); setShowCreateOrderModal(true); }}
                     className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 shadow-sm transition"
                  >
                     <Plus size={16} /> Create Nurse Order
                  </button>
               )}
               <div className="flex gap-4 text-sm font-medium glass px-3 py-2 rounded-xl">
                  <div className="flex items-center gap-2 px-2">
                     <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30"></div> Available: {available}
                  </div>
                  <div className="flex items-center gap-2 px-2 border-l border-slate-200">
                     <div className="w-3 h-3 rounded-full bg-sky-500 shadow-lg shadow-sky-500/30"></div> Occupied: {occupied}
                  </div>
                  <div className="flex items-center gap-2 px-2 border-l border-slate-200">
                     <div className="w-3 h-3 rounded-full bg-slate-400"></div> Maintenance: {maintenance}
                  </div>
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {beds.map((bed) => (
               <div key={bed.id} className={`relative p-0 rounded-2xl border-2 transition-all overflow-hidden flex flex-col card-hover ${bed.status === 'Available' ? 'border-emerald-100 bg-white hover:border-emerald-300 shadow-sm' :
                     bed.status === 'Occupied' ? 'border-sky-100 bg-white hover:border-sky-300 shadow-sm' :
                        'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}>
                  {/* Header Card */}
                  <div className={`p-4 flex justify-between items-start ${bed.status === 'Available' ? 'bg-emerald-50/50' :
                        bed.status === 'Occupied' ? 'bg-sky-50/50' : 'bg-slate-100'
                     }`}>
                     <div>
                        <h3 className="text-lg font-display font-bold text-slate-800">Bed {bed.number}</h3>
                        <p className="text-xs text-slate-500 uppercase font-semibold">{bed.ward}</p>
                     </div>
                     <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${bed.status === 'Available' ? 'bg-emerald-100 text-emerald-700' :
                           bed.status === 'Occupied' ? 'bg-sky-100 text-sky-700' : 'bg-slate-200 text-slate-600'
                        }`}>
                        {bed.status}
                     </span>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex-1 flex flex-col">
                     {bed.status === 'Occupied' ? (
                        <div className="space-y-4">
                           <div className="flex items-center gap-3">
                              <div className="bg-gradient-to-br from-sky-100 to-blue-100 p-2 rounded-full text-sky-600">
                                 <User size={20} />
                              </div>
                              <div>
                                 <p className="font-bold text-slate-800 text-sm">{bed.patientName}</p>
                                 <p className="text-xs text-slate-500">Patient ID: {bed.patientId?.toUpperCase()}</p>
                              </div>
                           </div>

                           {(isNurse || isAdmin) && (
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                 <button
                                    onClick={() => handleOpenVitals(String(bed.patientId!), bed.patientName!)}
                                    className="flex items-center justify-center gap-1 py-2 bg-sky-50 text-sky-700 rounded text-xs font-medium hover:bg-sky-100 border border-sky-100 transition"
                                 >
                                    <Activity size={14} /> Vitals
                                 </button>
                                 <button
                                    onClick={() => handleOpenNotes(String(bed.patientId!), bed.patientName!)}
                                    className="flex items-center justify-center gap-1 py-2 bg-slate-50 text-slate-600 rounded text-xs font-medium hover:bg-slate-100 border border-slate-100 transition"
                                 >
                                    <FileText size={14} /> Notes
                                 </button>
                              </div>
                           )}
                        </div>
                     ) : bed.status === 'Available' ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-4 text-center">
                           <BedDouble size={32} className="text-emerald-200 mb-2" />
                           <p className="text-sm text-slate-400">Ready for admission</p>
                        </div>
                     ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-4 text-center">
                           <Tool size={32} className="text-slate-300 mb-2" />
                           <p className="text-sm text-slate-400">Maintenance / Cleaning</p>
                        </div>
                     )}
                  </div>

                  {/* Footer Actions - Role Based */}
                  <div className="p-3 border-t border-slate-100 bg-slate-50">

                     {/* NURSE ACTIONS: PHYSICAL STATE */}
                     {(isNurse || isAdmin) && (
                        <>
                           {bed.status === 'Occupied' && (
                              <button
                                 onClick={() => handleDischarge(bed.id)}
                                 className="w-full py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 border border-red-100 flex items-center justify-center gap-2 transition"
                              >
                                 <LogOut size={14} /> Discharge & Mark Cleaning
                              </button>
                           )}
                           {bed.status === 'Maintenance' && (
                              <button
                                 onClick={() => markBedReady(bed.id)}
                                 className="w-full py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 shadow-sm transition flex items-center justify-center gap-2">
                                 <Sparkles size={14} /> Finish Cleaning & Ready
                              </button>
                           )}
                           {bed.status === 'Available' && (
                              <button
                                 onClick={() => blockBedForMaintenance(bed.id)}
                                 className="w-full py-2 bg-slate-200 text-slate-500 rounded-lg text-xs font-bold hover:bg-slate-300 transition flex items-center justify-center gap-2">
                                 <Tool size={14} /> Block for Maintenance
                              </button>
                           )}
                        </>
                     )}

                     {/* RECEPTIONIST ACTIONS: ALLOCATION */}
                     {isReceptionist && (
                        <>
                           {bed.status === 'Available' && (
                              <button
                                 onClick={() => handleAdmitClick(bed)}
                                 className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-teal-500 text-white rounded-xl text-xs font-bold hover:from-sky-600 hover:to-teal-600 shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-2"
                              >
                                 <UserPlus size={14} /> Admit New Patient
                              </button>
                           )}
                           {bed.status !== 'Available' && (
                              <button disabled className="w-full py-2 bg-slate-100 text-slate-400 rounded-lg text-xs font-bold cursor-not-allowed flex items-center justify-center gap-2">
                                 <Lock size={14} /> {bed.status === 'Occupied' ? 'Occupied' : 'Cleaning in Progress'}
                              </button>
                           )}
                        </>
                     )}
                  </div>
               </div>
            ))}
         </div>

         {/* ── NURSE ORDERS PANEL ──────────────────────────────────────────────── */}
         {(isNurse || isDoctor || isAdmin) && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-teal-50/30">
                  <div className="flex items-center gap-2">
                     <ClipboardList size={18} className="text-teal-600" />
                     <h3 className="font-display font-bold text-slate-800">
                        {isNurse ? 'My Care Orders' : 'Nurse Orders'}
                     </h3>
                     <span className="text-xs bg-teal-100 text-teal-700 font-bold px-2 py-0.5 rounded-full">
                        {nurseOrders.filter(o => o.status !== 'Completed' && o.status !== 'Cancelled').length} active
                     </span>
                  </div>
                  <button onClick={fetchOrders} className="text-slate-400 hover:text-teal-600 transition" title="Refresh">
                     <RefreshCw size={15} className={ordersLoading ? 'animate-spin' : ''} />
                  </button>
               </div>

               {ordersLoading ? (
                  <div className="p-8 text-center text-slate-400 text-sm">Loading orders…</div>
               ) : nurseOrders.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">
                     {isDoctor ? 'No orders created yet. Use "Create Nurse Order" to assign tasks to a nurse.' : 'No care orders assigned yet.'}
                  </div>
               ) : (
                  <div className="divide-y divide-slate-100">
                     {nurseOrders.map(order => (
                        <div key={order.id} className="p-4 flex items-start gap-4 hover:bg-slate-50 transition">
                           <div className="text-2xl leading-none mt-0.5">{orderTypeIcon[order.order_type]}</div>
                           <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                 <span className="font-semibold text-slate-800 text-sm">{order.order_type}</span>
                                 <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${priorityColor(order.priority)}`}>{order.priority}</span>
                                 <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColor(order.status)}`}>{order.status}</span>
                              </div>
                              <p className="text-sm text-slate-700 mb-1">{order.instructions}</p>
                              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                                 <span>Patient: <strong className="text-slate-700">{order.patient_name}</strong></span>
                                 <span>Dr: <strong className="text-slate-700">{order.doctor_name}</strong></span>
                                 {order.nurse_name
                                    ? <span>Nurse: <strong className="text-slate-700">{order.nurse_name}</strong></span>
                                    : <span className="text-amber-600 font-medium">Unassigned</span>
                                 }
                              </div>
                              {order.notes && (
                                 <p className="text-xs text-slate-500 mt-1 italic">Note: {order.notes}</p>
                              )}
                           </div>
                           {(isNurse || isAdmin || isDoctor) && order.status !== 'Completed' && order.status !== 'Cancelled' && (
                              <button
                                 onClick={() => openUpdateModal(order)}
                                 className="shrink-0 text-xs px-3 py-1.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg font-semibold hover:bg-teal-100 transition"
                              >
                                 Update
                              </button>
                           )}
                        </div>
                     ))}
                  </div>
               )}
            </div>
         )}

         {/* ADMISSION MODAL FOR RECEPTIONIST */}
         {showAdmitModal && selectedBed && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in flex flex-col border border-slate-200/50">
                  <div className="p-5 border-b border-slate-200/50 flex justify-between items-center bg-gradient-to-r from-slate-50 to-sky-50/30">
                     <div>
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                           <BedDouble size={20} className="text-teal-500" />
                           Admit Patient
                        </h3>
                        <p className="text-xs text-slate-500">Assigning to Bed {selectedBed.number} ({selectedBed.ward})</p>
                     </div>
                     <button onClick={() => setShowAdmitModal(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                     </button>
                  </div>

                  <div className="p-6 space-y-4">
                     <div className="bg-green-50 border border-green-100 p-3 rounded-lg flex items-center gap-3">
                        <Check className="text-green-600" size={18} />
                        <p className="text-sm text-green-800 font-medium">Bed is clean and ready for admission.</p>
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Select Patient</label>
                        <div className="relative">
                           <select
                              className="w-full p-2.5 pl-9 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 appearance-none bg-white"
                              value={selectedPatientId}
                              onChange={(e) => setSelectedPatientId(e.target.value)}
                           >
                              <option value="">-- Search Outpatient List --</option>
                              {patients.filter(p => p.status === 'Outpatient').map(p => (
                                 <option key={p.id} value={p.id}>{p.name} (ID: {p.id.toUpperCase()})</option>
                              ))}
                           </select>
                           <Search size={16} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Only displaying patients currently marked as 'Outpatient'.</p>
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Admission Type</label>
                        <div className="grid grid-cols-3 gap-2">
                           <button className="py-2 border border-teal-500 bg-teal-50 text-teal-700 rounded-lg text-xs font-bold">Emergency</button>
                           <button className="py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:border-slate-300">Observation</button>
                           <button className="py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:border-slate-300">Elective</button>
                        </div>
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                        <textarea
                           className="w-full p-3 border border-slate-300 rounded-lg text-sm h-20 resize-none focus:outline-none focus:border-teal-500"
                           placeholder="Reason for admission..."
                        ></textarea>
                     </div>
                  </div>

                  <div className="p-5 border-t border-slate-200 flex gap-3 bg-slate-50">
                     <button
                        onClick={() => setShowAdmitModal(false)}
                        className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-white transition"
                     >
                        Cancel
                     </button>
                     <button
                        onClick={handleConfirmAdmission}
                        disabled={!selectedPatientId}
                        className={`flex-1 py-2.5 rounded-lg font-medium transition shadow-sm flex justify-center items-center gap-2 ${selectedPatientId
                              ? 'bg-teal-600 text-white hover:bg-teal-700'
                              : 'bg-slate-300 text-white cursor-not-allowed'
                           }`}
                     >
                        <UserPlus size={18} />
                        Confirm Admission
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* CREATE NURSE ORDER MODAL (Doctor) */}
         {showCreateOrderModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-200/50">
                  <div className="p-5 border-b border-slate-200/50 flex justify-between items-center bg-gradient-to-r from-slate-50 to-teal-50/30">
                     <div className="flex items-center gap-2">
                        <ClipboardList size={20} className="text-teal-500" />
                        <h3 className="font-bold text-slate-800">Create Nurse Order</h3>
                     </div>
                     <button onClick={() => setShowCreateOrderModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                  </div>

                  <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                     {orderError && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm p-3 rounded-lg">
                           <AlertCircle size={16} /> {orderError}
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

                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Assign Nurse (optional)</label>
                        <select
                           className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 bg-white"
                           value={orderForm.nurse_id}
                           onChange={e => setOrderForm(f => ({ ...f, nurse_id: e.target.value }))}
                        >
                           <option value="">— Unassigned —</option>
                           {nurseStaff.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                        </select>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
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
                           className="w-full p-3 border border-slate-300 rounded-lg text-sm h-28 resize-none focus:outline-none focus:border-teal-500"
                           placeholder="Describe the care task in detail…"
                           value={orderForm.instructions}
                           onChange={e => setOrderForm(f => ({ ...f, instructions: e.target.value }))}
                        />
                     </div>
                  </div>

                  <div className="p-5 border-t border-slate-200 flex gap-3 bg-slate-50">
                     <button onClick={() => setShowCreateOrderModal(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-white transition">
                        Cancel
                     </button>
                     <button
                        onClick={handleCreateOrder}
                        className="flex-1 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition flex items-center justify-center gap-2"
                     >
                        <ClipboardList size={16} /> Create Order
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* VITALS MODAL */}
         {showVitalsModal && vitalsPatient && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200/50">
                  <div className="p-5 border-b border-slate-200/50 flex justify-between items-center bg-gradient-to-r from-sky-50 to-teal-50/30">
                     <div>
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                           <Activity size={18} className="text-sky-500" /> Patient Vitals
                        </h3>
                        <p className="text-xs text-slate-500">{vitalsPatient.name}</p>
                     </div>
                     <button onClick={() => setShowVitalsModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                  </div>

                  <div className="p-6 space-y-4">
                     {/* Current vitals summary */}
                     {vitals[vitalsPatient.id] && (
                        <div className="grid grid-cols-2 gap-3 bg-sky-50 rounded-xl p-4 text-center">
                           <div>
                              <p className="text-xs text-slate-500 uppercase tracking-wide">Blood Pressure</p>
                              <p className="text-lg font-bold text-sky-700">{vitals[vitalsPatient.id].bp || '—'}</p>
                           </div>
                           <div>
                              <p className="text-xs text-slate-500 uppercase tracking-wide">Heart Rate</p>
                              <p className="text-lg font-bold text-rose-600">{vitals[vitalsPatient.id].heartRate || '—'} <span className="text-xs font-normal">bpm</span></p>
                           </div>
                           <div>
                              <p className="text-xs text-slate-500 uppercase tracking-wide">Temperature</p>
                              <p className="text-lg font-bold text-amber-600">{vitals[vitalsPatient.id].temperature || '—'} <span className="text-xs font-normal">°F</span></p>
                           </div>
                           <div>
                              <p className="text-xs text-slate-500 uppercase tracking-wide">SpO₂</p>
                              <p className="text-lg font-bold text-emerald-600">{vitals[vitalsPatient.id].spO2 || '—'} <span className="text-xs font-normal">%</span></p>
                           </div>
                        </div>
                     )}

                     <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Update Vitals</p>

                     <div className="grid grid-cols-2 gap-3">
                        <div>
                           <label className="block text-xs text-slate-500 mb-1">Blood Pressure</label>
                           <input
                              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-sky-500"
                              placeholder="e.g. 120/80"
                              value={vitalsForm.bp}
                              onChange={e => setVitalsForm(f => ({ ...f, bp: e.target.value }))}
                           />
                        </div>
                        <div>
                           <label className="block text-xs text-slate-500 mb-1">Heart Rate (bpm)</label>
                           <input
                              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-sky-500"
                              placeholder="e.g. 72"
                              value={vitalsForm.heartRate}
                              onChange={e => setVitalsForm(f => ({ ...f, heartRate: e.target.value }))}
                           />
                        </div>
                        <div>
                           <label className="block text-xs text-slate-500 mb-1">Temperature (°F)</label>
                           <input
                              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-sky-500"
                              placeholder="e.g. 98.6"
                              value={vitalsForm.temperature}
                              onChange={e => setVitalsForm(f => ({ ...f, temperature: e.target.value }))}
                           />
                        </div>
                        <div>
                           <label className="block text-xs text-slate-500 mb-1">SpO₂ (%)</label>
                           <input
                              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-sky-500"
                              placeholder="e.g. 98"
                              value={vitalsForm.spO2}
                              onChange={e => setVitalsForm(f => ({ ...f, spO2: e.target.value }))}
                           />
                        </div>
                     </div>
                  </div>

                  <div className="p-5 border-t border-slate-200 flex gap-3 bg-slate-50">
                     <button onClick={() => setShowVitalsModal(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-white transition">
                        Cancel
                     </button>
                     <button
                        onClick={handleSaveVitals}
                        disabled={vitalsSaving}
                        className="flex-1 py-2.5 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 transition flex items-center justify-center gap-2 disabled:opacity-60"
                     >
                        <Check size={16} /> {vitalsSaving ? 'Saving…' : 'Save Vitals'}
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* NOTES MODAL */}
         {showNotesModal && notesPatient && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200/50">
                  <div className="p-5 border-b border-slate-200/50 flex justify-between items-center bg-gradient-to-r from-slate-50 to-slate-100/50">
                     <div>
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                           <FileText size={18} className="text-slate-500" /> Nursing Notes
                        </h3>
                        <p className="text-xs text-slate-500">{notesPatient.name}</p>
                     </div>
                     <button onClick={() => setShowNotesModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                  </div>

                  <div className="p-6">
                     <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                     <textarea
                        className="w-full p-3 border border-slate-300 rounded-lg text-sm h-40 resize-none focus:outline-none focus:border-teal-500"
                        placeholder="Enter nursing observations, care notes, patient status updates…"
                        value={currentNote}
                        onChange={e => setCurrentNote(e.target.value)}
                     />
                     <p className="text-xs text-slate-400 mt-1">Notes are saved for this session.</p>
                  </div>

                  <div className="p-5 border-t border-slate-200 flex gap-3 bg-slate-50">
                     <button onClick={() => setShowNotesModal(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-white transition">
                        Cancel
                     </button>
                     <button
                        onClick={handleSaveNote}
                        className="flex-1 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition flex items-center justify-center gap-2"
                     >
                        <Check size={16} /> Save Notes
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* UPDATE NURSE ORDER MODAL (Nurse / Doctor / Admin) */}
         {showUpdateOrderModal && selectedOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200/50">
                  <div className="p-5 border-b border-slate-200/50 flex justify-between items-center bg-gradient-to-r from-slate-50 to-sky-50/30">
                     <div>
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                           <Activity size={18} className="text-sky-500" /> Update Order Status
                        </h3>
                        <p className="text-xs text-slate-500">{selectedOrder.order_type} — {selectedOrder.patient_name}</p>
                     </div>
                     <button onClick={() => setShowUpdateOrderModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                  </div>

                  <div className="p-6 space-y-4">
                     {orderError && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm p-3 rounded-lg">
                           <AlertCircle size={16} /> {orderError}
                        </div>
                     )}

                     <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">
                        <p className="font-medium mb-1">Instructions:</p>
                        <p>{selectedOrder.instructions}</p>
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">New Status</label>
                        <select
                           className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 bg-white"
                           value={updateForm.status}
                           onChange={e => setUpdateForm(f => ({ ...f, status: e.target.value as NurseOrderStatus }))}
                        >
                           {(['Pending','In Progress','Completed','Cancelled'] as NurseOrderStatus[]).map(s => (
                              <option key={s}>{s}</option>
                           ))}
                        </select>
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
                        <textarea
                           className="w-full p-3 border border-slate-300 rounded-lg text-sm h-20 resize-none focus:outline-none focus:border-teal-500"
                           placeholder="Add completion notes or observations…"
                           value={updateForm.notes}
                           onChange={e => setUpdateForm(f => ({ ...f, notes: e.target.value }))}
                        />
                     </div>
                  </div>

                  <div className="p-5 border-t border-slate-200 flex gap-3 bg-slate-50">
                     <button onClick={() => setShowUpdateOrderModal(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-white transition">
                        Cancel
                     </button>
                     <button
                        onClick={handleUpdateOrder}
                        className="flex-1 py-2.5 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 transition flex items-center justify-center gap-2"
                     >
                        <Check size={16} /> Save Update
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};