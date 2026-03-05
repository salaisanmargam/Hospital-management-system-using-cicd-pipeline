import React, { useState } from 'react';
import { BedDouble, User, Activity, FileText, PenTool as Tool, LogOut, Sparkles, UserPlus, Lock, X, Check, Search } from 'lucide-react';
import { User as UserType, UserRole } from '../types';
import { useData } from '../contexts/DataContext';

interface WardProps {
   user?: UserType;
}

export const Ward: React.FC<WardProps> = ({ user }) => {
   const { beds, patients, admitPatient, dischargePatient } = useData();

   const [showAdmitModal, setShowAdmitModal] = useState(false);
   const [selectedBed, setSelectedBed] = useState<{ id: string, number: string, ward: string } | null>(null);
   const [selectedPatientId, setSelectedPatientId] = useState('');

   const isNurse = user?.role === UserRole.NURSE;
   const isReceptionist = user?.role === UserRole.RECEPTIONIST;
   const isAdmin = user?.role === UserRole.ADMIN;

   // Stats
   const totalBeds = beds.length;
   const occupied = beds.filter(b => b.status === 'Occupied').length;
   const available = beds.filter(b => b.status === 'Available').length;
   const maintenance = beds.filter(b => b.status === 'Maintenance').length;

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

   return (
      <div className="space-y-6">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
               <h2 className="text-2xl font-display font-bold text-slate-800">Ward Management</h2>
               <p className="text-slate-500">
                  {isNurse ? 'Manage patient discharge and bed hygiene status.' :
                     isReceptionist ? 'Check bed availability and allocate new admissions.' :
                        'Track bed availability and patient allocation.'}
               </p>
            </div>
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
                                 <button className="flex items-center justify-center gap-1 py-2 bg-slate-50 text-slate-600 rounded text-xs font-medium hover:bg-slate-100 border border-slate-100">
                                    <Activity size={14} /> Vitals
                                 </button>
                                 <button className="flex items-center justify-center gap-1 py-2 bg-slate-50 text-slate-600 rounded text-xs font-medium hover:bg-slate-100 border border-slate-100">
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
                              <button className="w-full py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 shadow-sm transition flex items-center justify-center gap-2">
                                 <Sparkles size={14} /> Finish Cleaning & Ready
                              </button>
                           )}
                           {bed.status === 'Available' && (
                              <button className="w-full py-2 bg-slate-200 text-slate-500 rounded-lg text-xs font-bold hover:bg-slate-300 transition flex items-center justify-center gap-2">
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
      </div>
   );
};