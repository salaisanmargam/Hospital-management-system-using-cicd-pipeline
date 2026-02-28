import React, { useState } from 'react';
import { Plus, Search, Filter, MoreHorizontal, User as UserIcon, X, Activity, FileText, Pill, Thermometer, Syringe, Stethoscope, Clipboard, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { User, UserRole } from '../types';
import { useData } from '../contexts/DataContext';

interface PatientsProps {
  user?: User;
}

// Mock interface for Medication Orders (specific to Nurse View idea)
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
  const { patients, appointments, beds, vitals, updateVitals } = useData();
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'vitals' | 'records'>('overview');
  
  // Nurse specific states
  const [nurseTab, setNurseTab] = useState<'care' | 'meds' | 'notes'>('care');
  const [showNurseModal, setShowNurseModal] = useState(false);

  const isNurse = user?.role === UserRole.NURSE;
  const isDoctor = user?.role === UserRole.DOCTOR;

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

  // Filter patients based on user role
  const displayedPatients = React.useMemo(() => {
    if (isDoctor) {
      // Doctor sees only their own patients
      return patients.filter(patient => 
        appointments.some(appt => 
          (appt.patientId === patient.id || appt.patientName === patient.name) && 
          (appt.doctorId === user.id || appt.doctorName === user.name)
        )
      );
    }
    // Nurse, Admin, Receptionist see ALL patients
    return patients; 
  }, [user, isDoctor, patients, appointments]);

  // Helper to find attending doctor (mock logic based on appointments)
  const getAttendingDoctor = (patientName: string) => {
    const appt = appointments.find(a => a.patientName === patientName);
    return appt ? appt.doctorName : 'Unassigned';
  };

  // Helper to find Bed info
  const getBedInfo = (patientName: string) => {
    const bed = beds.find(b => b.patientName === patientName);
    return bed ? `${bed.ward} - Bed ${bed.number}` : 'No Bed Assigned';
  };


  // Mock Nurse Orders for the selected patient
  const mockNurseOrders: NursingOrder[] = [
    { id: 'o1', medication: 'Morphine Sulfate', dosage: '4mg', type: 'IV/Vial', timing: 'Every 4 hours', status: 'Pending', prescribedBy: getAttendingDoctor(selectedPatient?.name || '') },
    { id: 'o2', medication: 'Paracetamol', dosage: '500mg', type: 'Oral', timing: 'After lunch', status: 'Administered', prescribedBy: getAttendingDoctor(selectedPatient?.name || '') },
    { id: 'o3', medication: 'Ceftriaxone', dosage: '1g', type: 'Injection', timing: 'Twice Daily', status: 'Pending', prescribedBy: getAttendingDoctor(selectedPatient?.name || '') },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {isDoctor ? 'My Patients' : isNurse ? 'Nursing Station & Patients' : 'Patients'}
          </h2>
          <p className="text-slate-500">
             {isDoctor ? 'Manage records for your assigned patients.' : 
              isNurse ? 'Monitor patient vitals, administer meds, and log care.' :
              'Manage patient records and admission status.'}
          </p>
        </div>
        {(user?.role === UserRole.RECEPTIONIST || user?.role === UserRole.ADMIN) && (
          <button className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition shadow-sm">
            <Plus size={18} />
            <span>Register Patient</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name, ID, or condition..." 
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <button className="flex items-center gap-2 text-slate-600 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-sm font-medium">
            <Filter size={16} />
            Filters
          </button>
        </div>

        <div className="overflow-x-auto">
          {displayedPatients.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                <th className="px-6 py-4">Patient Name</th>
                {isNurse && <th className="px-6 py-4">Attending Doctor</th>}
                {isNurse && <th className="px-6 py-4">Ward / Bed</th>}
                <th className="px-6 py-4">Condition</th>
                {!isNurse && <th className="px-6 py-4">Last Visit</th>}
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedPatients.map((patient) => (
                <tr key={patient.id} className="hover:bg-slate-50 transition cursor-pointer" onClick={() => handlePatientClick(patient)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 relative">
                         <UserIcon size={20} />
                         {isNurse && patient.status === 'Inpatient' && (
                           <span className="absolute bottom-0 right-0 w-3 h-3 bg-teal-500 border-2 border-white rounded-full"></span>
                         )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{patient.name}</p>
                        <p className="text-xs text-slate-500">ID: {patient.id.toUpperCase()}</p>
                      </div>
                    </div>
                  </td>
                  {isNurse && (
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Stethoscope size={14} className="text-teal-600" />
                        {getAttendingDoctor(patient.name)}
                      </div>
                    </td>
                  )}
                  {isNurse && (
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {patient.status === 'Inpatient' ? (
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium border border-blue-100">
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
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      patient.status === 'Inpatient' 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {patient.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-teal-600 transition">
                      {isNurse ? <Clipboard size={20} /> : <MoreHorizontal size={20} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          ) : (
            <div className="p-12 text-center text-slate-400">
              <p>No patients found.</p>
            </div>
          )}
        </div>
      </div>

      {/* NURSE SPECIFIC ACTION MODAL */}
      {showNurseModal && selectedPatient && isNurse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col">
             {/* Header */}
             <div className="p-6 border-b border-slate-200 bg-slate-900 text-white flex justify-between items-start">
                <div className="flex gap-4">
                   <div className="w-16 h-16 rounded-lg bg-teal-500 text-white flex items-center justify-center text-2xl font-bold shadow-lg">
                      {selectedPatient.name.charAt(0)}
                   </div>
                   <div>
                      <h2 className="text-2xl font-bold">{selectedPatient.name}</h2>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-300 mt-2">
                         <span className="flex items-center gap-1"><UserIcon size={14} /> ID: {selectedPatient.id.toUpperCase()}</span>
                         <span className="flex items-center gap-1"><AlertCircle size={14} /> {selectedPatient.condition}</span>
                         <span className="flex items-center gap-1"><Stethoscope size={14} /> Dr: {getAttendingDoctor(selectedPatient.name)}</span>
                         <span className="bg-slate-700 px-2 py-0.5 rounded text-xs text-white border border-slate-600">{selectedPatient.status}</span>
                      </div>
                   </div>
                </div>
                <button onClick={() => setShowNurseModal(false)} className="text-slate-400 hover:text-white transition bg-slate-800 p-2 rounded-full"><X size={20} /></button>
             </div>

             <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                {/* Nurse Sidebar */}
                <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-4 flex flex-col gap-2">
                   <button 
                     onClick={() => setNurseTab('care')}
                     className={`text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition ${nurseTab === 'care' ? 'bg-white shadow text-teal-700 border border-slate-100' : 'text-slate-600 hover:bg-slate-100'}`}
                   >
                      <Activity size={18} /> Vitals Monitor
                   </button>
                   <button 
                     onClick={() => setNurseTab('meds')}
                     className={`text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition ${nurseTab === 'meds' ? 'bg-white shadow text-teal-700 border border-slate-100' : 'text-slate-600 hover:bg-slate-100'}`}
                   >
                      <Syringe size={18} /> Medications (Vials)
                   </button>
                   <button 
                     onClick={() => setNurseTab('notes')}
                     className={`text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition ${nurseTab === 'notes' ? 'bg-white shadow text-teal-700 border border-slate-100' : 'text-slate-600 hover:bg-slate-100'}`}
                   >
                      <Clipboard size={18} /> Nursing Notes
                   </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-white">
                   {nurseTab === 'care' && (
                      <div className="space-y-6">
                         <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                               <Thermometer size={20} className="text-teal-600" /> 
                               Record Vitals
                            </h3>
                            <span className="text-xs text-slate-400">Last updated: {vitals[selectedPatient.id]?.lastUpdated || 'Never'}</span>
                         </div>
                         
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="p-4 border border-slate-200 rounded-xl hover:border-teal-400 transition group">
                               <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Blood Pressure (mmHg)</label>
                               <div className="flex items-center gap-2">
                                  <input type="text" value={bpValue} onChange={(e) => setBpValue(e.target.value)} placeholder="120/80" className="flex-1 text-2xl font-bold text-slate-800 outline-none placeholder:text-slate-200" />
                                  <Activity size={24} className="text-slate-300 group-hover:text-teal-500 transition" />
                               </div>
                            </div>
                            <div className="p-4 border border-slate-200 rounded-xl hover:border-red-400 transition group">
                               <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Heart Rate (bpm)</label>
                               <div className="flex items-center gap-2">
                                  <input type="text" value={hrValue} onChange={(e) => setHrValue(e.target.value)} placeholder="72" className="flex-1 text-2xl font-bold text-slate-800 outline-none placeholder:text-slate-200" />
                                  <Activity size={24} className="text-slate-300 group-hover:text-red-500 transition" />
                               </div>
                            </div>
                            <div className="p-4 border border-slate-200 rounded-xl hover:border-amber-400 transition group">
                               <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Temperature (°F)</label>
                               <div className="flex items-center gap-2">
                                  <input type="text" value={tempValue} onChange={(e) => setTempValue(e.target.value)} placeholder="98.6" className="flex-1 text-2xl font-bold text-slate-800 outline-none placeholder:text-slate-200" />
                                  <Thermometer size={24} className="text-slate-300 group-hover:text-amber-500 transition" />
                               </div>
                            </div>
                            <div className="p-4 border border-slate-200 rounded-xl hover:border-blue-400 transition group">
                               <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">SpO2 (%)</label>
                               <div className="flex items-center gap-2">
                                  <input type="text" value={spo2Value} onChange={(e) => setSpo2Value(e.target.value)} placeholder="98" className="flex-1 text-2xl font-bold text-slate-800 outline-none placeholder:text-slate-200" />
                                  <Activity size={24} className="text-slate-300 group-hover:text-blue-500 transition" />
                               </div>
                            </div>
                         </div>

                         <div className="flex justify-end pt-4">
                            <button onClick={handleSaveVitals} className="bg-teal-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-teal-700 shadow-sm flex items-center gap-2">
                               <CheckCircle2 size={18} />
                               Log Vitals Entry
                            </button>
                         </div>
                      </div>
                   )}

                   {nurseTab === 'meds' && (
                      <div className="space-y-6">
                         <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                               <Syringe size={20} className="text-teal-600" /> 
                               Medication Administration Record (MAR)
                            </h3>
                         </div>

                         <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg mb-6">
                            <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
                               <AlertCircle size={16} />
                               Please verify patient ID band before administering any vials or injections.
                            </p>
                         </div>

                         <div className="space-y-3">
                            {mockNurseOrders.map((order) => (
                               <div key={order.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-slate-200 rounded-xl hover:shadow-sm transition bg-white">
                                  <div className="flex items-start gap-4 mb-3 sm:mb-0">
                                     <div className={`p-3 rounded-lg ${order.type === 'IV/Vial' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}`}>
                                        {order.type === 'IV/Vial' || order.type === 'Injection' ? <Syringe size={24} /> : <Pill size={24} />}
                                     </div>
                                     <div>
                                        <h4 className="font-bold text-slate-800">{order.medication}</h4>
                                        <p className="text-sm text-slate-600">{order.dosage} • {order.type}</p>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                           <span className="flex items-center gap-1"><Clock size={12} /> {order.timing}</span>
                                           <span className="flex items-center gap-1"><Stethoscope size={12} /> Ordered by: {order.prescribedBy}</span>
                                        </div>
                                     </div>
                                  </div>
                                  
                                  {order.status === 'Pending' ? (
                                    <button className="w-full sm:w-auto px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition flex items-center justify-center gap-2">
                                        Administer
                                    </button>
                                  ) : (
                                    <button disabled className="w-full sm:w-auto px-4 py-2 bg-green-100 text-green-700 border border-green-200 rounded-lg text-sm font-medium flex items-center justify-center gap-2 cursor-default">
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
                      <div className="h-full flex flex-col">
                         <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                            <Clipboard size={20} className="text-teal-600" /> 
                            Shift Notes
                         </h3>
                         
                         <div className="flex-1 border border-slate-200 rounded-xl p-4 mb-4 bg-slate-50 overflow-y-auto space-y-4">
                            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                               <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-bold text-slate-700">Nurse Jackie</span>
                                  <span className="text-xs text-slate-400">Today, 09:15 AM</span>
                               </div>
                               <p className="text-sm text-slate-600">Patient reported mild nausea after breakfast. Administered anti-emetic as per standing order. Resting comfortably now.</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                               <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-bold text-slate-700">Nurse Ben</span>
                                  <span className="text-xs text-slate-400">Yesterday, 10:00 PM</span>
                               </div>
                               <p className="text-sm text-slate-600">Night rounds completed. Vitals stable. Patient sleeping.</p>
                            </div>
                         </div>

                         <div className="mt-auto">
                            <label className="text-sm font-medium text-slate-700 mb-2 block">Add New Note (Logged as: {user?.name})</label>
                            <textarea className="w-full p-3 border border-slate-300 rounded-lg text-sm h-24 resize-none focus:outline-none focus:border-teal-500" placeholder="Type observation here..."></textarea>
                            <div className="flex justify-end mt-2">
                               <button className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700">Add Note</button>
                            </div>
                         </div>
                      </div>
                   )}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* STANDARD PATIENT DETAIL MODAL (For Doctors/Admins/Receptionists) */}
      {selectedPatient && !isNurse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col">
              <div className="p-6 border-b border-slate-200 flex justify-between items-start bg-slate-50">
                 <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-2xl font-bold">
                       {selectedPatient.name.charAt(0)}
                    </div>
                    <div>
                       <h2 className="text-2xl font-bold text-slate-800">{selectedPatient.name}</h2>
                       <div className="flex gap-4 text-sm text-slate-500 mt-1">
                          <span>ID: {selectedPatient.id.toUpperCase()}</span>
                          <span>{selectedPatient.age} yrs, {selectedPatient.gender}</span>
                          <span>{selectedPatient.bloodType}</span>
                       </div>
                    </div>
                 </div>
                 <button onClick={() => setSelectedPatient(null)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>

              <div className="flex border-b border-slate-200">
                 <button onClick={() => setActiveTab('overview')} className={`px-6 py-3 text-sm font-medium ${activeTab === 'overview' ? 'border-b-2 border-teal-600 text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}>Overview</button>
                 <button onClick={() => setActiveTab('vitals')} className={`px-6 py-3 text-sm font-medium ${activeTab === 'vitals' ? 'border-b-2 border-teal-600 text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}>Vitals & Nursing</button>
                 <button onClick={() => setActiveTab('records')} className={`px-6 py-3 text-sm font-medium ${activeTab === 'records' ? 'border-b-2 border-teal-600 text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}>Medical Records</button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                 {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Activity size={18} /> Current Condition</h3>
                          <p className="text-slate-600">{selectedPatient.condition}</p>
                          <div className="mt-4 pt-4 border-t border-slate-100">
                             <p className="text-xs text-slate-400 uppercase font-semibold">Allergies</p>
                             <p className="text-red-500 font-medium">{selectedPatient.allergies}</p>
                          </div>
                       </div>
                       <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><UserIcon size={18} /> Contact Info</h3>
                          <p className="text-slate-600">{selectedPatient.contact}</p>
                          <p className="text-sm text-slate-500 mt-1">Emergency Contact: Jane Doe (Wife) - 555-9999</p>
                       </div>
                    </div>
                 )}

                 {activeTab === 'vitals' && (
                    <div className="space-y-6">
                       {/* Standard Vital View for Doctors/Admins */}
                       <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                          <h3 className="font-bold text-slate-800 mb-3">Vitals History</h3>
                          <div className="space-y-3">
                             <div className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded">
                                <span>{vitals[selectedPatient.id]?.lastUpdated || 'No recent data'}</span>
                                <span className="font-mono">{vitals[selectedPatient.id]?.bp || '--/--'} mmHg</span>
                                <span className="font-mono">{vitals[selectedPatient.id]?.heartRate || '--'} bpm</span>
                                <span className="font-mono">{vitals[selectedPatient.id]?.temperature || '--'} °F</span>
                             </div>
                          </div>
                       </div>
                    </div>
                 )}

                 {activeTab === 'records' && (
                    <div className="space-y-6">
                       {isDoctor && (
                          <div className="bg-white p-5 rounded-lg border border-indigo-200 shadow-sm">
                             <h3 className="font-bold text-indigo-800 mb-4 flex items-center gap-2"><FileText size={18} /> Add Diagnosis & Treatment</h3>
                             <textarea className="w-full p-3 border border-slate-300 rounded text-sm h-24" placeholder="Enter clinical notes, diagnosis, or prescription..."></textarea>
                             <div className="mt-4 text-right">
                                <button className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-indigo-700">Add Record</button>
                             </div>
                          </div>
                       )}
                       
                       <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                          <h3 className="font-bold text-slate-800 mb-3">Past Medical History</h3>
                          <div className="space-y-4">
                             <div className="border-l-4 border-teal-500 pl-4 py-1">
                                <p className="text-sm font-bold text-slate-900">General Checkup - Oct 25, 2023</p>
                                <p className="text-sm text-slate-600 mt-1">Patient reported mild headaches. Prescribed Paracetamol. BP normal.</p>
                                <div className="mt-2 flex gap-2">
                                   <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 flex items-center gap-1"><UserIcon size={10} /> Dr. Sarah Bennett</span>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};