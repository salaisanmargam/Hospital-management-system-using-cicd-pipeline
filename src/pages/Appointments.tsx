import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, MoreVertical, Plus, CheckCircle, XCircle, AlertTriangle, X, ChevronRight, Stethoscope, Activity, Siren, User as UserIcon, FileText, CheckSquare, ArrowRightCircle, TestTube, Microscope, Pill, PackageCheck } from 'lucide-react';
import { Appointment, AppointmentStatus, User, UserRole } from '../types';
import { useData } from '../contexts/DataContext';

interface AppointmentsProps {
  user?: User;
}

export const Appointments: React.FC<AppointmentsProps> = ({ user }) => {
  const { appointments, prescriptions, addAppointment, updateAppointmentStatus, updatePrescriptionStatus, staff } = useData();

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [appointmentPriority, setAppointmentPriority] = useState<'Normal' | 'Emergency'>('Normal');
  const [step, setStep] = useState(1);
  
  const isPatient = user?.role === UserRole.PATIENT;
  const isDoctor = user?.role === UserRole.DOCTOR;
  const isNurse = user?.role === UserRole.NURSE;
  const isLabTech = user?.role === UserRole.LAB_TECHNICIAN;
  const isPharmacist = user?.role === UserRole.PHARMACIST;

  // Filter appointments based on user role
  const displayedAppointments = React.useMemo(() => {
    if (isPatient) {
      return appointments.filter(a => a.patientName === user?.name);
    }
    if (isDoctor) {
      return appointments.filter(a => a.doctorName === user?.name);
    }
    if (isLabTech) {
        // Lab techs see 'Laboratory' department appointments
        return appointments.filter(a => a.department === 'Laboratory');
    }
    // Nurses and Admins see all
    return appointments;
  }, [user, isPatient, isDoctor, isLabTech, appointments]);

  const handleDispense = (id: string) => {
    updatePrescriptionStatus(id, 'Dispensed');
  };

  const handleCreateAppointment = () => {
    // Basic validation
    if (!selectedDoctor || !selectedDept) return;

    const newAppt: Appointment = {
        id: `a${Date.now()}`,
        patientId: user?.id || 'p_guest',
        patientName: user?.name || 'Guest Patient',
        doctorId: staff.find(s => s.name === selectedDoctor)?.id || 'unknown_doc',
        doctorName: selectedDoctor,
        department: selectedDept,
        date: new Date().toISOString().split('T')[0],
        time: '09:00 AM', // In real app, select time
        status: appointmentPriority === 'Emergency' ? AppointmentStatus.EMERGENCY : AppointmentStatus.SCHEDULED,
        type: appointmentPriority === 'Emergency' ? 'Consultation' : 'General Checkup'
    };

    addAppointment(newAppt);
    handleBookingClose();
  };

  // Mock slots generation
  const availableSlots = ['09:00 AM', '10:30 AM', '02:00 PM', '04:15 PM'];

  const getStatusColor = (status: AppointmentStatus) => {
    switch(status) {
      case AppointmentStatus.SCHEDULED: return 'bg-blue-50 text-blue-700 border-blue-100';
      case AppointmentStatus.EMERGENCY: return 'bg-red-50 text-red-700 border-red-100';
      case AppointmentStatus.COMPLETED: return 'bg-green-50 text-green-700 border-green-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getStatusIcon = (status: AppointmentStatus) => {
    switch(status) {
        case AppointmentStatus.EMERGENCY: return <AlertTriangle size={14} className="mr-1" />;
        case AppointmentStatus.COMPLETED: return <CheckCircle size={14} className="mr-1" />;
        case AppointmentStatus.CANCELLED: return <XCircle size={14} className="mr-1" />;
        default: return <Clock size={14} className="mr-1" />;
    }
  }

  const handleBookingClose = () => {
    setShowBookingModal(false);
    setStep(1);
    setSelectedDept('');
    setSelectedDoctor('');
    setAppointmentPriority('Normal');
  }

  const handleBookSpecificDoctor = (doctorName: string, dept: string) => {
    setSelectedDoctor(doctorName);
    setSelectedDept(dept);
    setStep(3); // Jump to time selection
    setShowBookingModal(true);
  }

  // PHARMACIST VIEW: Prescription Request & Response Queue
  if (isPharmacist) {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Prescription Fulfillment</h2>
                <p className="text-slate-500">Review requests from doctors and dispense medication.</p>
            </div>
            <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                <Clock size={18} /> 
                {prescriptions.filter(p => p.status === 'Pending').length} Pending Requests
            </div>
           </div>

           <div className="grid grid-cols-1 gap-6">
              {prescriptions.map((prescription) => (
                  <div key={prescription.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-0 overflow-hidden flex flex-col md:flex-row">
                      {/* Left: Info */}
                      <div className="p-6 flex-1">
                          <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                      <UserIcon size={24} />
                                  </div>
                                  <div>
                                      <h3 className="text-lg font-bold text-slate-900">{prescription.patientName}</h3>
                                      <p className="text-sm text-slate-500">ID: P-{prescription.patientId.toUpperCase()}</p>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-1 ${
                                      prescription.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                                  }`}>
                                      {prescription.status}
                                  </span>
                                  <p className="text-xs text-slate-400">{prescription.date} • {prescription.time}</p>
                              </div>
                          </div>
                          
                          <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 mb-4">
                              <p className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                  <Pill size={14} /> Prescribed Medication
                              </p>
                              <div className="space-y-2">
                                  {prescription.medicines.map((med, idx) => (
                                      <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                                          <div>
                                              <span className="font-bold text-slate-700">{med.name}</span>
                                              <span className="text-slate-500 ml-2">({med.dosage})</span>
                                          </div>
                                          <span className="font-mono font-medium text-slate-600">x{med.quantity}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                              <Stethoscope size={16} className="text-teal-600" />
                              Requested by <span className="font-medium text-slate-700">{prescription.doctorName}</span>
                          </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="bg-slate-50 p-6 border-t md:border-t-0 md:border-l border-slate-200 w-full md:w-48 flex flex-col justify-center gap-3">
                          {prescription.status === 'Pending' ? (
                              <>
                                <button 
                                    onClick={() => handleDispense(prescription.id)}
                                    className="w-full py-2 bg-teal-600 text-white rounded-lg text-sm font-bold hover:bg-teal-700 shadow-sm transition flex items-center justify-center gap-2"
                                >
                                    <PackageCheck size={18} /> Dispense
                                </button>
                                <button className="w-full py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-100 transition">
                                    Print Label
                                </button>
                              </>
                          ) : (
                              <div className="text-center">
                                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                      <CheckCircle size={24} />
                                  </div>
                                  <p className="text-sm font-bold text-green-700">Completed</p>
                                  <p className="text-xs text-slate-400 mt-1">Dispensed on {prescription.time}</p>
                              </div>
                          )}
                      </div>
                  </div>
              ))}
           </div>
        </div>
    );
  }

  // DOCTOR & NURSE & LAB TECH TABLE VIEW
  if (isDoctor || isNurse || isLabTech) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {isDoctor ? 'My Consultation Schedule' : isLabTech ? 'Sample Collection Queue' : 'OPD Queue Management'}
            </h2>
            <p className="text-slate-500">
              {isDoctor ? 'Manage your patient visits for today.' : isLabTech ? 'Patients scheduled for blood draw and sample collection.' : 'Triaging and managing patient flow for doctors.'}
            </p>
          </div>
          {isNurse && (
             <div className="flex gap-2">
                <div className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div> 
                    Doctors Active: {staff.filter(s => s.role === UserRole.DOCTOR && s.status === 'Active').length}
                </div>
             </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  {isLabTech ? <TestTube size={18} className="text-teal-600" /> : <Stethoscope size={18} className="text-teal-600" />}
                  {isDoctor ? 'My Appointments' : isLabTech ? "Today's Collection List" : "Today's Queue"}
                </h3>
                 <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                   {displayedAppointments.length} Patients
                 </span>
            </div>
            
            {displayedAppointments.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                         <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                            <tr>
                               <th className="px-6 py-4">Time</th>
                               <th className="px-6 py-4">Patient Details</th>
                               {isNurse && <th className="px-6 py-4">Assigned Doctor</th>}
                               <th className="px-6 py-4">{isLabTech ? 'Test Type' : 'Purpose'}</th>
                               <th className="px-6 py-4">Status</th>
                               <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                            {displayedAppointments.map(apt => (
                               <tr key={apt.id} className="hover:bg-slate-50 transition">
                                  <td className="px-6 py-4">
                                     <div className="flex items-center gap-2">
                                        <Clock size={16} className="text-slate-400" />
                                        <span className="text-sm font-bold text-slate-800 font-mono">{apt.time}</span>
                                     </div>
                                  </td>
                                  <td className="px-6 py-4">
                                     <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                           <UserIcon size={14} />
                                        </div>
                                        <div>
                                            <span className="block text-sm font-bold text-slate-900">{apt.patientName}</span>
                                            <span className="block text-xs text-slate-500">ID: P-{apt.patientId.toUpperCase()}</span>
                                        </div>
                                     </div>
                                  </td>
                                  {isNurse && (
                                      <td className="px-6 py-4">
                                          <span className="text-sm font-medium text-slate-700 block">{apt.doctorName}</span>
                                          <span className="text-xs text-slate-500">{apt.department}</span>
                                      </td>
                                  )}
                                  <td className="px-6 py-4">
                                     <p className="text-sm text-slate-700 font-medium">{apt.type}</p>
                                  </td>
                                  <td className="px-6 py-4">
                                     <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex w-fit items-center gap-1 ${getStatusColor(apt.status)}`}>
                                        {getStatusIcon(apt.status)}
                                        {apt.status === AppointmentStatus.COMPLETED && isLabTech ? 'Collected' : apt.status}
                                     </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                     <div className="flex justify-end gap-2">
                                        {(isNurse || isLabTech) && apt.status === AppointmentStatus.SCHEDULED && (
                                            <button 
                                                onClick={() => updateAppointmentStatus(apt.id, AppointmentStatus.COMPLETED)}
                                                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-md text-xs font-bold hover:bg-indigo-100 transition flex items-center gap-1"
                                            >
                                                <CheckSquare size={14} /> {isLabTech ? 'Collect Sample' : 'Check In'}
                                            </button>
                                        )}
                                        <button className="text-teal-600 hover:text-teal-800 text-sm font-medium flex items-center justify-end gap-1">
                                            {isNurse ? 'Triage' : 'Details'} <ChevronRight size={14} />
                                        </button>
                                     </div>
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                    </table>
                </div>
            ) : (
                <div className="p-12 text-center text-slate-400">
                    <p>No appointments found for today.</p>
                </div>
            )}
        </div>
      </div>
    );
  }

  // DEFAULT VIEW (Patient, Admin, Receptionist)
  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {isPatient ? 'My Appointments' : 'Appointments'}
          </h2>
          <p className="text-slate-500">
            {isPatient ? 'View your upcoming visits and history.' : 'Manage doctor schedules and patient bookings.'}
          </p>
        </div>
        {(isPatient || user?.role === UserRole.RECEPTIONIST) && (
          <button 
            onClick={() => setShowBookingModal(true)}
            className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition shadow-sm"
          >
            <Plus size={18} />
            <span>Book New Appointment</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointments List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
             <h3 className="font-bold text-slate-800">Upcoming Schedule</h3>
          </div>
          
          {displayedAppointments.length > 0 ? displayedAppointments.map((apt) => (
            <div key={apt.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="bg-slate-100 p-3 rounded-lg text-slate-600 text-center min-w-[70px]">
                   <span className="block text-xs uppercase font-bold text-slate-400">{new Date(apt.date).toLocaleString('default', { month: 'short' })}</span>
                   <span className="block text-xl font-bold text-slate-900">{apt.date.split('-')[2]}</span>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{apt.patientName}</h4>
                  <div className="flex items-center text-sm text-slate-500 mt-1">
                    <CalendarIcon size={14} className="mr-1" />
                    <span className="mr-3">{apt.department} - {apt.type}</span>
                    <Clock size={14} className="mr-1" />
                    <span>{apt.time}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    with <span className="text-teal-600 font-medium">{apt.doctorName}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center border ${getStatusColor(apt.status)}`}>
                  {getStatusIcon(apt.status)}
                  {apt.status}
                </span>
                {!isPatient && (
                  <button className="text-slate-400 hover:text-slate-600">
                    <MoreVertical size={20} />
                  </button>
                )}
              </div>
            </div>
          )) : (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-500">No appointments found.</p>
            </div>
          )}
        </div>

        {/* Doctor Availability Directory - Hidden for Doctors */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 h-fit">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Stethoscope size={18} className="text-teal-600" />
              Available Doctors
            </h3>
            <p className="text-xs text-slate-500 mb-4">Real-time status of hospital staff.</p>
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {staff.filter(s => s.role === UserRole.DOCTOR).map((doc) => (
                 <div key={doc.id} className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition group">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <img src={doc.avatarUrl} alt={doc.name} className="w-10 h-10 rounded-full object-cover" />
                                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                                    doc.status === 'Active' ? 'bg-green-500' : 'bg-slate-400'
                                }`}></span>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900">{doc.name}</p>
                                <p className="text-xs text-slate-500">{doc.department}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                         <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                            doc.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'
                          }`}>
                          {doc.status === 'Active' ? 'Available Today' : doc.status}
                        </span>
                        
                        {isPatient && doc.status === 'Active' && (
                            <button 
                                onClick={() => handleBookSpecificDoctor(doc.name, doc.department)}
                                className="text-xs bg-teal-50 text-teal-700 px-3 py-1 rounded font-medium hover:bg-teal-100"
                            >
                                Book Now
                            </button>
                        )}
                    </div>
                </div>
              ))}
            </div>
            
            <button className="w-full mt-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition">
                View Full Staff Directory
            </button>
        </div>
      </div>

      {/* Enhanced Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800">Book Appointment</h3>
                <p className="text-xs text-slate-500">Step {step} of 3</p>
              </div>
              <button onClick={handleBookingClose} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {step === 1 && (
                <div className="space-y-6">
                  {/* Priority Selection */}
                  <div>
                      <p className="text-sm font-bold text-slate-700 mb-3">Appointment Priority</p>
                      <div className="grid grid-cols-2 gap-4">
                          <button 
                              onClick={() => setAppointmentPriority('Normal')}
                              className={`p-4 rounded-xl border-2 text-left transition-all ${
                                  appointmentPriority === 'Normal' 
                                  ? 'border-teal-500 bg-teal-50' 
                                  : 'border-slate-200 hover:border-teal-200'
                              }`}
                          >
                              <div className="bg-teal-100 w-10 h-10 rounded-full flex items-center justify-center mb-2 text-teal-600">
                                  <Activity size={20} />
                              </div>
                              <p className="font-bold text-slate-800 text-sm">Normal Checkup</p>
                              <p className="text-xs text-slate-500 mt-1">Regular visit, follow-ups, or consultations.</p>
                          </button>

                          <button 
                              onClick={() => setAppointmentPriority('Emergency')}
                              className={`p-4 rounded-xl border-2 text-left transition-all ${
                                  appointmentPriority === 'Emergency' 
                                  ? 'border-red-500 bg-red-50' 
                                  : 'border-slate-200 hover:border-red-200'
                              }`}
                          >
                              <div className="bg-red-100 w-10 h-10 rounded-full flex items-center justify-center mb-2 text-red-600">
                                  <Siren size={20} />
                              </div>
                              <p className="font-bold text-slate-800 text-sm">Emergency</p>
                              <p className="text-xs text-slate-500 mt-1">Urgent care for sudden illness or pain.</p>
                          </button>
                      </div>
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-700 mb-3">Select Department</p>
                    <div className="grid grid-cols-2 gap-3">
                        {['Cardiology', 'Neurology', 'Pediatrics', 'Dermatology', 'General Doctor', 'Dentist'].map(dept => (
                        <button 
                            key={dept}
                            onClick={() => { setSelectedDept(dept); setStep(2); }}
                            className="p-3 border border-slate-200 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition text-left text-sm font-medium text-slate-700"
                        >
                            {dept}
                        </button>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                   <div className="flex items-center gap-2 mb-4 text-sm text-slate-500 cursor-pointer hover:text-teal-600" onClick={() => setStep(1)}>
                      <span>&larr; Back to Departments</span>
                   </div>
                   <p className="text-sm font-medium text-slate-700">Available Doctors in {selectedDept}</p>
                   
                   {appointmentPriority === 'Emergency' && (
                       <div className="bg-red-50 border border-red-100 p-3 rounded-lg flex items-start gap-3 mb-4">
                           <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                           <div>
                               <p className="text-sm font-bold text-red-800">Emergency Priority</p>
                               <p className="text-xs text-red-600">Showing doctors available for immediate consultation.</p>
                           </div>
                       </div>
                   )}

                   <div className="space-y-3">
                     {staff.filter(s => s.role === UserRole.DOCTOR && (selectedDept === 'General Medicine' || s.department === selectedDept)).length > 0 ? (
                       staff.filter(s => s.role === UserRole.DOCTOR && (selectedDept === 'General Medicine' || s.department === selectedDept)).map(doc => (
                         <button 
                          key={doc.id} 
                          onClick={() => { setSelectedDoctor(doc.name); setStep(3); }}
                          className="w-full flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition"
                         >
                            <div className="flex items-center gap-3">
                               <img src={doc.avatarUrl} className="w-10 h-10 rounded-full object-cover" alt="" />
                               <div className="text-left">
                                  <p className="font-medium text-slate-900">{doc.name}</p>
                                  <p className="text-xs text-slate-500">
                                      {appointmentPriority === 'Emergency' ? 'Available Immediately' : 'Next Slot: Today 2:00 PM'}
                                  </p>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-slate-400" />
                         </button>
                       ))
                     ) : (
                       <p className="text-sm text-slate-400 italic">No doctors available in this department.</p>
                     )}
                   </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                   <div className="flex items-center gap-2 mb-4 text-sm text-slate-500 cursor-pointer hover:text-teal-600" onClick={() => setStep(2)}>
                      <span>&larr; Back to Doctors</span>
                   </div>
                   <div className={`p-4 rounded-lg border mb-4 flex justify-between items-center ${
                       appointmentPriority === 'Emergency' ? 'bg-red-50 border-red-100' : 'bg-teal-50 border-teal-100'
                   }`}>
                      <div>
                        <p className={`text-sm font-bold ${appointmentPriority === 'Emergency' ? 'text-red-800' : 'text-teal-800'}`}>
                            {selectedDoctor}
                        </p>
                        <p className={`text-xs ${appointmentPriority === 'Emergency' ? 'text-red-600' : 'text-teal-600'}`}>
                            {selectedDept} • {appointmentPriority}
                        </p>
                      </div>
                      {appointmentPriority === 'Emergency' && <Siren className="text-red-500" />}
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-2">Select Date</label>
                     <input type="date" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:border-teal-500" />
                   </div>

                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Available Slots</label>
                      <div className="grid grid-cols-3 gap-2">
                        {availableSlots.map(slot => (
                          <button key={slot} className={`px-3 py-2 border rounded-md text-sm transition ${
                              appointmentPriority === 'Emergency' 
                              ? 'border-red-200 text-red-700 hover:bg-red-600 hover:text-white' 
                              : 'border-slate-200 text-slate-600 hover:bg-teal-600 hover:text-white'
                          }`}>
                            {slot}
                          </button>
                        ))}
                      </div>
                   </div>

                   <button 
                     onClick={handleCreateAppointment}
                     className={`w-full text-white font-medium py-3 rounded-lg transition mt-4 ${
                         appointmentPriority === 'Emergency' ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'
                     }`}
                   >
                     Confirm Appointment
                   </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};