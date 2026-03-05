import React from 'react';
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
import { Users, Calendar, AlertCircle, IndianRupee, TrendingUp, Activity, Clock, FileText, BedDouble, ShieldCheck, Stethoscope, Mail, Phone, Sun, FlaskConical, Microscope, ScanLine, Package, AlertTriangle, Pill, ArrowRight, HeartPulse } from 'lucide-react';
import { User, UserRole, AppointmentStatus } from '../types';
import { useData } from '../contexts/DataContext';

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

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const {
    patients,
    appointments,
    medicines,
    labTests,
    beds,
    prescriptions,
    staff,
    revenueData,
    appointmentStats,
    auditLogs
  } = useData();
  const role = user.role;

  // PATIENT DASHBOARD
  if (role === UserRole.PATIENT) {
    const nextAppt = appointments.find(a =>
      (a.patientId === user.id || a.patientName === user.name) &&
      (a.status === AppointmentStatus.SCHEDULED || a.status === AppointmentStatus.EMERGENCY)
    );

    const myVitals = "120/80 bpm";
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
          <StatCard title="Recent Vitals" value={myVitals} icon={<Activity size={20} />} color="bg-blue-500" delay={0.15} />
          <StatCard title="Pending Reports" value={`${myReports} Reports`} icon={<FileText size={20} />} color="bg-amber-500" delay={0.2} />
        </div>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {beds.filter(b => b.status === 'Occupied').map(bed => (
                  <tr key={bed.id} className="text-sm hover:bg-sky-50/50 transition-colors">
                    <td className="py-3.5 pl-1 font-medium text-slate-900">{bed.patientName}</td>
                    <td className="py-3.5 text-slate-600">{bed.ward} - {bed.number}</td>
                    <td className="py-3.5 text-slate-600">Post-Surgery</td>
                    <td className="py-3.5"><span className="bg-sky-100 text-sky-700 px-2.5 py-1 rounded-full text-xs font-semibold">Stable</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // LAB TECHNICIAN DASHBOARD
  if (role === UserRole.LAB_TECHNICIAN) {
    const pendingTests = labTests.filter(t => t.status === 'Pending').length;
    const processingTests = labTests.filter(t => t.status === 'In Progress').length;
    const completedToday = labTests.filter(t => t.status === 'Completed').length;
    const urgentTests = labTests.filter(t => t.priority === 'Urgent' && t.status !== 'Completed');

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center glass-card p-6 rounded-2xl animate-fade-in-up">
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-800">Laboratory Operations</h2>
            <p className="text-slate-500 mt-1">Technician Control Panel</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl font-medium hover:bg-slate-200 transition-all text-sm">
              <Activity size={18} />
              Equipment Status
            </button>
            <button className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-teal-500 text-white px-4 py-2.5 rounded-xl font-medium hover:from-sky-600 hover:to-teal-600 transition-all shadow-lg shadow-sky-500/20 text-sm">
              <FlaskConical size={18} />
              New Test Entry
            </button>
          </div>
        </div>

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
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 border border-slate-100 rounded-xl hover:border-sky-200 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50"></div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">MRI Scanner A</p>
                    <p className="text-xs text-slate-500">Radiology</p>
                  </div>
                </div>
                <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium">Online</span>
              </div>
              <div className="flex justify-between items-center p-3 border border-slate-100 rounded-xl hover:border-sky-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50"></div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">Centrifuge C2</p>
                    <p className="text-xs text-slate-500">Pathology</p>
                  </div>
                </div>
                <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium">Running</span>
              </div>
              <div className="flex justify-between items-center p-3 border border-red-100 rounded-xl bg-red-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50"></div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">X-Ray Unit 2</p>
                    <p className="text-xs text-slate-500">Radiology</p>
                  </div>
                </div>
                <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium">Maintenance</span>
              </div>
            </div>
          </div>
        </div>
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
    const myRevenue = myAppointments.filter(a => a.status === AppointmentStatus.COMPLETED || a.status === AppointmentStatus.SCHEDULED).length * 150;

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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard title="My Patients" value={myPatientsCount.toString()} icon={<Users size={20} />} color="bg-blue-500" delay={0.05} />
          <StatCard title="My Appointments" value={myAppointments.length.toString()} icon={<Calendar size={20} />} color="bg-purple-500" delay={0.1} />
          <StatCard title="My Estimated Revenue" value={`₹${myRevenue}`} icon={<IndianRupee size={20} />} color="bg-emerald-500" delay={0.15} />
          <StatCard title="Nurses On Shift" value={staff.filter(s => s.role === UserRole.NURSE && s.shift === (user.shift || 'Morning')).length.toString()} icon={<HeartPulse size={20} />} color="bg-rose-500" delay={0.2} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${app.status === 'Emergency' ? 'bg-red-100 text-red-700' :
                            app.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-sky-100 text-sky-700'
                          }`}>
                          {app.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-slate-500">
                No appointments assigned.
              </div>
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
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {staff.filter(s => s.role === UserRole.NURSE && s.shift === (user.shift || 'Morning')).length > 0 ? (
                staff.filter(s => s.role === UserRole.NURSE && s.shift === (user.shift || 'Morning')).map(nurse => (
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
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Phone size={11} />{nurse.contact || '—'}</span>
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
      </div>
    );
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
