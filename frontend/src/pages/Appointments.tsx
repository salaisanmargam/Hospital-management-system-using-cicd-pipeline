import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Calendar as CalendarIcon, Clock, MoreVertical, Plus, CheckCircle, XCircle, AlertTriangle, X, ChevronRight, Stethoscope, Activity, Siren, User as UserIcon, FileText, CheckSquare, ArrowRightCircle, TestTube, Microscope, Pill, PackageCheck, History, Filter } from 'lucide-react';
import { Appointment, AppointmentStatus, User, UserRole } from '../types';
import { useData } from '../contexts/DataContext';

interface AppointmentsProps {
  user?: User;
}

export const Appointments: React.FC<AppointmentsProps> = ({ user }) => {
  const { appointments, prescriptions, addAppointment, updateAppointmentStatus, updatePrescriptionStatus, staff } = useData();

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [activeFilter, setActiveFilter] = useState<'All' | AppointmentStatus>('All');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
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
    if (!selectedDoctor || !selectedDept || !selectedSlot || !selectedDate) return;

    const newAppt: Appointment = {
      id: `a${Date.now()}`,
      patientId: user?.id || 'p_guest',
      patientName: user?.name || 'Guest Patient',
      doctorId: staff.find(s => s.name === selectedDoctor)?.id || 'unknown_doc',
      doctorName: selectedDoctor,
      department: selectedDept,
      date: selectedDate,
      time: selectedSlot,
      status: appointmentPriority === 'Emergency' ? AppointmentStatus.EMERGENCY : AppointmentStatus.SCHEDULED,
      type: appointmentPriority === 'Emergency' ? 'Consultation' : 'General Checkup'
    };

    addAppointment(newAppt);
    handleBookingClose();
  };

  // Shift-based slot definitions
  const SHIFT_SLOTS: Record<string, string[]> = {
    Morning: ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM'],
    Evening: ['02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM'],
    Night:   ['07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM'],
  };
  const selectedDoctorStaff = staff.find(s => s.name === selectedDoctor);
  const doctorShift = selectedDoctorStaff?.shift || 'Morning';
  const availableSlots = SHIFT_SLOTS[doctorShift] ?? SHIFT_SLOTS.Morning;

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.SCHEDULED: return 'bg-sky-50 text-sky-700 border-sky-100';
      case AppointmentStatus.EMERGENCY: return 'bg-red-50 text-red-700 border-red-100';
      case AppointmentStatus.COMPLETED: return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getStatusIcon = (status: AppointmentStatus) => {
    switch (status) {
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
    setSelectedSlot('');
    setSelectedDate('');
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
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-800">Prescription Fulfillment</h2>
            <p className="text-slate-500">Review requests from doctors and dispense medication.</p>
          </div>
          <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
            <Clock size={18} />
            {prescriptions.filter(p => p.status === 'Pending').length} Pending Requests
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {prescriptions.map((prescription) => (
            <div key={prescription.id} className="glass-card rounded-2xl p-0 overflow-hidden flex flex-col md:flex-row card-hover">
              {/* Left: Info */}
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      <UserIcon size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-display font-bold text-slate-900">{prescription.patientName}</h3>
                      <p className="text-sm text-slate-500">ID: P-{prescription.patientId.toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-1 ${prescription.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
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
                      className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-teal-500 text-white rounded-xl text-sm font-bold hover:from-sky-600 hover:to-teal-600 shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-2"
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
    const filterOptions: Array<'All' | AppointmentStatus> = ['All', AppointmentStatus.SCHEDULED, AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.EMERGENCY];
    const filteredAppointments = activeFilter === 'All'
      ? displayedAppointments
      : displayedAppointments.filter(a => a.status === activeFilter);

    const filterColors: Record<string, string> = {
      All: 'bg-slate-800 text-white',
      Scheduled: 'bg-sky-500 text-white',
      Completed: 'bg-emerald-500 text-white',
      Cancelled: 'bg-slate-400 text-white',
      Emergency: 'bg-red-500 text-white',
    };
    const filterInactive: Record<string, string> = {
      All: 'text-slate-600 hover:bg-slate-100',
      Scheduled: 'text-sky-600 hover:bg-sky-50',
      Completed: 'text-emerald-600 hover:bg-emerald-50',
      Cancelled: 'text-slate-500 hover:bg-slate-50',
      Emergency: 'text-red-600 hover:bg-red-50',
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-800 flex items-center gap-2">
              <History size={22} className="text-sky-500" />
              {isDoctor ? 'Appointment History' : isLabTech ? 'Sample Collection Queue' : 'OPD Queue Management'}
            </h2>
            <p className="text-slate-500">
              {isDoctor ? 'Full history of all your patient appointments.' : isLabTech ? 'Patients scheduled for blood draw and sample collection.' : 'Triaging and managing patient flow for doctors.'}
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

        {/* Filter tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={15} className="text-slate-400" />
          {filterOptions.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeFilter === f ? filterColors[f] : `bg-white border border-slate-200 ${filterInactive[f]}`
              }`}
            >
              {f} {f !== 'All' && `(${displayedAppointments.filter(a => a.status === f).length})`}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-400">{filteredAppointments.length} record{filteredAppointments.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-sky-50/30 flex justify-between items-center">
            <h3 className="font-display font-bold text-slate-800 flex items-center gap-2">
              {isLabTech ? <TestTube size={18} className="text-teal-600" /> : <Stethoscope size={18} className="text-teal-600" />}
              {isDoctor ? 'All Appointments' : isLabTech ? "Today's Collection List" : "Today's Queue"}
            </h3>
            <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
              {filteredAppointments.length} record{filteredAppointments.length !== 1 ? 's' : ''}
            </span>
          </div>

          {filteredAppointments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/80 text-slate-400 text-xs uppercase border-b border-slate-200/50 tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Time</th>
                    <th className="px-6 py-4">Patient Details</th>
                    {isNurse && <th className="px-6 py-4">Assigned Doctor</th>}
                    <th className="px-6 py-4">{isLabTech ? 'Test Type' : 'Purpose'}</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAppointments.map(apt => (
                    <tr key={apt.id} className="hover:bg-sky-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <CalendarIcon size={14} className="text-slate-400" />
                          <span className="text-sm text-slate-600">{apt.date}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-slate-400" />
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
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex w-fit items-center gap-1 border ${getStatusColor(apt.status)}`}>
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
                          <button
                            onClick={() => setSelectedAppointment(apt)}
                            className="text-teal-600 hover:text-teal-800 text-sm font-semibold flex items-center justify-end gap-1 hover:underline"
                          >
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
              <History size={28} className="mx-auto mb-3 text-slate-300" />
              <p>No appointments found{activeFilter !== 'All' ? ` with status "${activeFilter}"` : ''}.</p>
            </div>
          )}
        </div>

        {/* Appointment Detail Modal */}
        {selectedAppointment && ReactDOM.createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in border border-slate-200/50">
              {/* Header */}
              <div className={`p-6 text-white flex justify-between items-center ${
                selectedAppointment.status === AppointmentStatus.EMERGENCY
                  ? 'bg-gradient-to-r from-red-600 to-orange-600'
                  : selectedAppointment.status === AppointmentStatus.COMPLETED
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600'
                  : 'bg-gradient-to-r from-slate-800 to-sky-900'
              }`}>
                <div>
                  <h3 className="text-xl font-display font-bold">Appointment Details</h3>
                  <p className="text-white/70 text-sm mt-0.5">Record #{selectedAppointment.id.toUpperCase()}</p>
                </div>
                <button onClick={() => setSelectedAppointment(null)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Patient */}
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
                    <UserIcon size={22} />
                  </div>
                  <div>
                    <p className="font-display font-bold text-slate-900 text-lg">{selectedAppointment.patientName}</p>
                    <p className="text-xs text-slate-500 font-mono">Patient ID: {selectedAppointment.patientId.toUpperCase()}</p>
                  </div>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Date</p>
                    <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                      <CalendarIcon size={14} className="text-sky-500" />{selectedAppointment.date}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Time</p>
                    <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                      <Clock size={14} className="text-sky-500" />{selectedAppointment.time}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Doctor</p>
                    <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                      <Stethoscope size={14} className="text-teal-500" />{selectedAppointment.doctorName}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Department</p>
                    <p className="text-sm font-semibold text-slate-800">{selectedAppointment.department}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 col-span-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Type</p>
                    <p className="text-sm font-semibold text-slate-800">{selectedAppointment.type}</p>
                  </div>
                </div>

                {/* Status — editable for doctors */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Appointment Status</p>
                  {isDoctor ? (
                    <div className="grid grid-cols-2 gap-2">
                      {([AppointmentStatus.SCHEDULED, AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.EMERGENCY] as AppointmentStatus[]).map(s => (
                        <button
                          key={s}
                          onClick={() => {
                            updateAppointmentStatus(selectedAppointment.id, s);
                            setSelectedAppointment({ ...selectedAppointment, status: s });
                          }}
                          className={`py-2.5 px-4 rounded-xl text-sm font-semibold border-2 transition-all ${
                            selectedAppointment.status === s
                              ? s === AppointmentStatus.COMPLETED ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : s === AppointmentStatus.CANCELLED ? 'border-slate-400 bg-slate-100 text-slate-600'
                                : s === AppointmentStatus.EMERGENCY ? 'border-red-500 bg-red-50 text-red-700'
                                : 'border-sky-500 bg-sky-50 text-sky-700'
                              : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                          }`}
                        >
                          <span className="flex items-center justify-center gap-1.5">
                            {getStatusIcon(s)}{s}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className={`px-3 py-1.5 rounded-full text-sm font-semibold flex items-center w-fit gap-1 border ${getStatusColor(selectedAppointment.status)}`}>
                      {getStatusIcon(selectedAppointment.status)}{selectedAppointment.status}
                    </span>
                  )}
                </div>
              </div>

              <div className="px-6 pb-6">
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="w-full py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  // DEFAULT VIEW (Patient, Admin, Receptionist)
  return (
    <div className="space-y-8 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-800">
            {isPatient ? 'My Appointments' : 'Appointments'}
          </h2>
          <p className="text-slate-500">
            {isPatient ? 'View your upcoming visits and history.' : 'Manage doctor schedules and patient bookings.'}
          </p>
        </div>
        {(isPatient || user?.role === UserRole.RECEPTIONIST) && (
          <button
            onClick={() => setShowBookingModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-teal-500 text-white px-5 py-2.5 rounded-xl hover:from-sky-600 hover:to-teal-600 transition-all shadow-lg shadow-sky-500/20 font-semibold text-sm hover:scale-[1.02] active:scale-[0.98]"
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
            <div key={apt.id} className="glass-card p-5 rounded-2xl card-hover flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                {isPatient && apt.status === AppointmentStatus.SCHEDULED && (
                  <button
                    onClick={() => updateAppointmentStatus(apt.id, AppointmentStatus.CANCELLED)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition"
                  >
                    <XCircle size={14} />
                    Cancel
                  </button>
                )}
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
        <div className="glass-card rounded-2xl p-6 h-fit">
          <h3 className="font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Stethoscope size={18} className="text-teal-500" />
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
                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${doc.status === 'Active' ? 'bg-green-500' : 'bg-slate-400'
                        }`}></span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{doc.name}</p>
                      <p className="text-xs text-slate-500">{doc.department}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${doc.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in flex flex-col max-h-[90vh] border border-slate-200/50">
            <div className="p-4 border-b border-slate-200/50 flex justify-between items-center bg-gradient-to-r from-slate-50 to-sky-50/30">
              <div>
                <h3 className="font-display font-bold text-slate-800">Book Appointment</h3>
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
                        className={`p-4 rounded-xl border-2 text-left transition-all ${appointmentPriority === 'Normal'
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
                        className={`p-4 rounded-xl border-2 text-left transition-all ${appointmentPriority === 'Emergency'
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
                          onClick={() => { setSelectedDoctor(doc.name); setSelectedSlot(''); setStep(3); }}
                          className="w-full flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition"
                        >
                          <div className="flex items-center gap-3">
                            <img src={doc.avatarUrl} className="w-10 h-10 rounded-full object-cover" alt="" />
                            <div className="text-left">
                              <p className="font-medium text-slate-900">{doc.name}</p>
                              <p className="text-xs text-slate-500">
                                {appointmentPriority === 'Emergency' ? 'Available Immediately' : `${doc.shift} shift`}
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
                  <div className={`p-4 rounded-lg border mb-4 flex justify-between items-center ${appointmentPriority === 'Emergency' ? 'bg-red-50 border-red-100' : 'bg-teal-50 border-teal-100'
                    }`}>
                    <div>
                      <p className={`text-sm font-bold ${appointmentPriority === 'Emergency' ? 'text-red-800' : 'text-teal-800'}`}>
                        {selectedDoctor}
                      </p>
                      <p className={`text-xs ${appointmentPriority === 'Emergency' ? 'text-red-600' : 'text-teal-600'}`}>
                        {selectedDept} • {appointmentPriority}
                      </p>
                      <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        doctorShift === 'Morning' ? 'bg-amber-100 text-amber-700' :
                        doctorShift === 'Evening' ? 'bg-orange-100 text-orange-700' :
                        'bg-indigo-100 text-indigo-700'
                      }`}>
                        {doctorShift === 'Morning' ? '🌅' : doctorShift === 'Evening' ? '🌆' : '🌙'} {doctorShift} Shift
                      </span>
                    </div>
                    {appointmentPriority === 'Emergency' && <Siren className="text-red-500" />}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Select Date</label>
                    <input
                      type="date"
                      value={selectedDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setSelectedDate(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Available Slots
                      <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        doctorShift === 'Morning' ? 'bg-amber-100 text-amber-700' :
                        doctorShift === 'Evening' ? 'bg-orange-100 text-orange-700' :
                        'bg-indigo-100 text-indigo-700'
                      }`}>
                        {doctorShift === 'Morning' ? '🌅' : doctorShift === 'Evening' ? '🌆' : '🌙'} {doctorShift} Shift
                      </span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map(slot => (
                        <button
                          key={slot}
                          onClick={() => setSelectedSlot(slot)}
                          className={`px-3 py-2 border rounded-md text-sm font-medium transition ${
                            selectedSlot === slot
                              ? (appointmentPriority === 'Emergency' ? 'bg-red-600 text-white border-red-600' : 'bg-teal-600 text-white border-teal-600')
                              : (appointmentPriority === 'Emergency'
                                  ? 'border-red-200 text-red-700 hover:bg-red-600 hover:text-white'
                                  : 'border-slate-200 text-slate-600 hover:bg-teal-600 hover:text-white')
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleCreateAppointment}
                    disabled={!selectedSlot || !selectedDate}
                    className={`w-full text-white font-medium py-3 rounded-lg transition mt-4 ${
                      !selectedSlot || !selectedDate
                        ? 'bg-slate-300 cursor-not-allowed'
                        : appointmentPriority === 'Emergency' ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'
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