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
}> = ({ title, value, icon, trend, color }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${color} text-white`}>
        {icon}
      </div>
    </div>
    {trend && (
      <div className="mt-4 flex items-center text-sm">
        <TrendingUp size={16} className="text-emerald-500 mr-1" />
        <span className="text-emerald-600 font-medium mr-1">{trend}</span>
        <span className="text-slate-400">vs last month</span>
      </div>
    )}
  </div>
);

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
    
    // In a real app we'd fetch specific vitals for this patient
    const myVitals = "120/80 bpm"; 
    const myReports = labTests.filter(t => (t.patientName === user.name) && t.status === 'Pending').length;

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Welcome back, {user.name}</h2>
            <p className="text-slate-500">Here is your health summary.</p>
          </div>
          <button className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition shadow-sm font-medium">
            Book Appointment
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
            <h3 className="text-lg font-semibold mb-1">Next Appointment</h3>
            <div className="mt-4 flex items-center gap-3">
               <div className="bg-white/20 p-2 rounded-lg">
                 <Calendar size={24} />
               </div>
               <div>
                 {nextAppt ? (
                   <>
                     <p className="font-bold text-xl">{nextAppt.date}</p>
                     <p className="text-teal-100 text-sm">{nextAppt.time} • {nextAppt.doctorName}</p>
                   </>
                 ) : (
                   <p className="font-bold text-xl">No upcoming appointments</p>
                 )}
               </div>
            </div>
          </div>
          <StatCard title="Recent Vitals" value={myVitals} icon={<Activity size={20} />} color="bg-blue-500" />
          <StatCard title="Pending Reports" value={`${myReports} Reports`} icon={<FileText size={20} />} color="bg-amber-500" />
        </div>
      </div>
    );
  }

  // NURSE DASHBOARD
  if (role === UserRole.NURSE) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Nurse Station</h2>
            <p className="text-slate-500">Ward overview and patient vitals monitoring.</p>
          </div>
          <div className="flex items-center gap-4 bg-indigo-50 px-4 py-3 rounded-lg border border-indigo-100">
             <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
                <Sun size={20} />
             </div>
             <div>
                <p className="text-xs font-bold text-indigo-500 uppercase">Current Shift</p>
                <p className="font-bold text-indigo-900 text-lg">Morning (07:00 - 15:00)</p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <StatCard title="Occupied Beds" value={`${beds.filter(b => b.status === 'Occupied').length}/${beds.length}`} icon={<BedDouble size={20} />} color="bg-blue-500" />
           <StatCard title="Critical Patients" value="2" icon={<Activity size={20} />} color="bg-red-500" />
           <StatCard title="Discharges Today" value="4" icon={<Clock size={20} />} color="bg-green-500" />
           <StatCard title="Doctors on Duty" value={`${staff.filter(s => s.role === UserRole.DOCTOR && s.status === 'Active').length}`} icon={<Users size={20} />} color="bg-purple-500" />
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
           <h3 className="text-lg font-bold text-slate-800 mb-4">Current Admitted Patients</h3>
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead>
                 <tr className="border-b border-slate-100 text-sm text-slate-500">
                   <th className="pb-3">Patient</th>
                   <th className="pb-3">Ward/Bed</th>
                   <th className="pb-3">Condition</th>
                   <th className="pb-3">Status</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {beds.filter(b => b.status === 'Occupied').map(bed => (
                   <tr key={bed.id} className="text-sm">
                     <td className="py-3 font-medium text-slate-900">{bed.patientName}</td>
                     <td className="py-3 text-slate-600">{bed.ward} - {bed.number}</td>
                     <td className="py-3 text-slate-600">Post-Surgery</td>
                     <td className="py-3"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">Stable</span></td>
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
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Laboratory Operations</h2>
            <p className="text-slate-500">Technician Control Panel</p>
          </div>
          <div className="flex gap-4">
            <button className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-200 transition">
              <Activity size={18} />
              Equipment Status
            </button>
            <button className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-teal-700 transition shadow-sm">
              <FlaskConical size={18} />
              New Test Entry
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <StatCard title="Samples Pending" value={pendingTests.toString()} icon={<FlaskConical size={20} />} color="bg-amber-500" />
           <StatCard title="Processing" value={processingTests.toString()} icon={<Microscope size={20} />} color="bg-blue-500" />
           <StatCard title="Completed Today" value={completedToday.toString()} icon={<ShieldCheck size={20} />} color="bg-green-500" />
           <StatCard title="Urgent Requests" value={urgentTests.length.toString()} icon={<AlertCircle size={20} />} color="bg-red-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* Urgent Worklist */}
           <div className="lg:col-span-2 bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-red-50 flex justify-between items-center">
                 <h3 className="font-bold text-red-900 flex items-center gap-2">
                   <AlertCircle size={18} className="text-red-600" />
                   Urgent Worklist
                 </h3>
                 <span className="bg-white px-2 py-0.5 rounded text-xs font-bold text-red-600 border border-red-200">{urgentTests.length} Pending</span>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-3">Patient</th>
                    <th className="px-6 py-3">Test</th>
                    <th className="px-6 py-3">Dept</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {urgentTests.length > 0 ? urgentTests.map(test => (
                     <tr key={test.id} className="hover:bg-slate-50 text-sm">
                        <td className="px-6 py-4 font-medium text-slate-900">{test.patientName}</td>
                        <td className="px-6 py-4">{test.testName}</td>
                        <td className="px-6 py-4 text-slate-500">{test.department}</td>
                        <td className="px-6 py-4">
                           <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-bold">{test.status}</span>
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

           {/* Equipment/Machine Status Mockup */}
           <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                 <ScanLine size={18} className="text-teal-600" /> 
                 Machine Status
              </h3>
              <div className="space-y-4">
                 <div className="flex justify-between items-center p-3 border border-slate-100 rounded-lg">
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-green-500"></div>
                       <div>
                          <p className="text-sm font-bold text-slate-700">MRI Scanner A</p>
                          <p className="text-xs text-slate-500">Radiology</p>
                       </div>
                    </div>
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">Online</span>
                 </div>
                 <div className="flex justify-between items-center p-3 border border-slate-100 rounded-lg">
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-green-500"></div>
                       <div>
                          <p className="text-sm font-bold text-slate-700">Centrifuge C2</p>
                          <p className="text-xs text-slate-500">Pathology</p>
                       </div>
                    </div>
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">Running</span>
                 </div>
                 <div className="flex justify-between items-center p-3 border border-slate-100 rounded-lg">
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                       <div>
                          <p className="text-sm font-bold text-slate-700">X-Ray Unit 2</p>
                          <p className="text-xs text-slate-500">Radiology</p>
                       </div>
                    </div>
                    <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded">Maintenance</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  }

  // PHARMACIST DASHBOARD
  if (role === UserRole.PHARMACIST) {
    const totalSales = 3450; // Mocked for daily total
    const lowStockItems = medicines.filter(m => m.stock <= 20); // Threshold 20
    const pendingRequests = prescriptions.filter(p => p.status === 'Pending').length;
    const totalMedicines = medicines.length;

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Pharmacy Dashboard</h2>
            <p className="text-slate-500">Inventory tracking and prescription fulfillment overview.</p>
          </div>
          <div className="flex items-center gap-3">
             <button className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-200 transition">
                <Package size={18} /> Check Stock
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <StatCard title="Daily Sales" value={`₹${totalSales}`} icon={<IndianRupee size={20} />} trend="+5%" color="bg-emerald-500" />
           <StatCard title="Pending Dispense" value={pendingRequests.toString()} icon={<Clock size={20} />} color="bg-amber-500" />
           <StatCard title="Low Stock Items" value={lowStockItems.length.toString()} icon={<AlertTriangle size={20} />} color="bg-red-500" />
           <StatCard title="Total Medicines" value={totalMedicines.toString()} icon={<Pill size={20} />} color="bg-blue-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* Low Stock Alerts */}
           <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-red-50 flex justify-between items-center">
                 <h3 className="font-bold text-red-900 flex items-center gap-2">
                   <AlertTriangle size={18} className="text-red-600" />
                   Low Stock Alerts
                 </h3>
                 <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded-full">{lowStockItems.length} Items Critical</span>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-3">Medicine Name</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Current Stock</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {lowStockItems.length > 0 ? lowStockItems.map(med => (
                     <tr key={med.id} className="hover:bg-slate-50 text-sm">
                        <td className="px-6 py-4 font-bold text-slate-800">{med.name}</td>
                        <td className="px-6 py-4 text-slate-600">{med.category}</td>
                        <td className="px-6 py-4 font-mono font-bold text-red-600">{med.stock} {med.unit}</td>
                        <td className="px-6 py-4">
                           <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold">Reorder Now</span>
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

           {/* Sales Chart Mockup */}
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                 <TrendingUp size={18} className="text-teal-600" /> 
                 Sales Trend (Weekly)
              </h3>
              <div className="flex-1 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
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
       <div className="space-y-6 animate-in fade-in duration-500">
         <div className="flex justify-between items-center">
           <div>
             <h2 className="text-2xl font-bold text-slate-800">Front Desk</h2>
             <p className="text-slate-500">Manage queues and patient check-ins.</p>
           </div>
           <button className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Register New Patient</button>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title="Today's Appointments" value={appointments.filter(a => a.date === new Date().toISOString().split('T')[0]).length.toString()} icon={<Calendar size={20} />} color="bg-blue-500" />
            <StatCard title="Checked In" value={appointments.filter(a => a.status === AppointmentStatus.COMPLETED && a.date === new Date().toISOString().split('T')[0]).length.toString()} icon={<Users size={20} />} color="bg-green-500" />
            <StatCard title="Waiting Queue" value={appointments.filter(a => a.status === AppointmentStatus.SCHEDULED && a.date === new Date().toISOString().split('T')[0]).length.toString()} icon={<Clock size={20} />} color="bg-amber-500" />
         </div>
       </div>
     );
  }

  // DOCTOR DASHBOARD (PERSONAL PROFILE)
  if (role === UserRole.DOCTOR) {
    const myAppointments = appointments.filter(a => a.doctorId === user.id);
    const myPatientsCount = new Set(myAppointments.map(a => a.patientId)).size;
    // Estimated revenue based on completed appointments for visualization
    const myRevenue = myAppointments.filter(a => a.status === AppointmentStatus.COMPLETED || a.status === AppointmentStatus.SCHEDULED).length * 150; 

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
             <img src={user.avatarUrl} alt={user.name} className="w-24 h-24 rounded-full border-4 border-slate-50" />
             <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2">
                   <h2 className="text-2xl font-bold text-slate-800">{user.name}</h2>
                   <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium border border-green-200">Active</span>
                </div>
                <p className="text-slate-500 font-medium">{user.department || 'Specialist'}</p>
                <div className="flex flex-wrap gap-4 mt-3 justify-center md:justify-start text-sm text-slate-600">
                   <span className="flex items-center gap-1"><Mail size={14} /> {user.email}</span>
                   <span className="flex items-center gap-1"><Phone size={14} /> {user.contact || 'No contact info'}</span>
                </div>
             </div>
             <div className="bg-indigo-50 p-4 rounded-lg text-center min-w-[150px]">
                <p className="text-xs text-indigo-500 uppercase font-bold">Today's Shift</p>
                <p className="text-lg font-bold text-indigo-700">{user.shift || 'Not set'}</p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard title="My Patients" value={myPatientsCount.toString()} icon={<Users size={20} />} color="bg-blue-500" />
            <StatCard title="My Appointments" value={myAppointments.length.toString()} icon={<Calendar size={20} />} color="bg-purple-500" />
            <StatCard title="My Estimated Revenue" value={`₹${myRevenue}`} icon={<IndianRupee size={20} />} color="bg-emerald-500" />
            <StatCard title="Nurses On Shift" value={staff.filter(s => s.role === UserRole.NURSE && s.shift === (user.shift || 'Morning')).length.toString()} icon={<HeartPulse size={20} />} color="bg-rose-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Stethoscope size={18} className="text-teal-600" />
                  My Schedule
                </h3>
             </div>
             {myAppointments.length > 0 ? (
               <table className="w-full text-left">
                 <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                       <th className="px-4 py-3">Time</th>
                       <th className="px-4 py-3">Patient</th>
                       <th className="px-4 py-3">Type</th>
                       <th className="px-4 py-3">Status</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {myAppointments.map(app => (
                       <tr key={app.id} className="text-sm hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-slate-600">{app.time}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">{app.patientName}</td>
                          <td className="px-4 py-3 text-slate-600">{app.type}</td>
                          <td className="px-4 py-3">
                             <span className={`px-2 py-0.5 rounded text-xs ${
                                app.status === 'Emergency' ? 'bg-red-100 text-red-700' :
                                app.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                'bg-blue-100 text-blue-700'
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
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-slate-200 bg-rose-50 flex justify-between items-center">
                <h3 className="font-bold text-rose-900 flex items-center gap-2">
                  <HeartPulse size={18} className="text-rose-600" />
                  My Nursing Team
                </h3>
                <span className="text-[10px] font-bold text-rose-500 uppercase bg-white px-2 py-1 rounded border border-rose-100">
                  {user.shift || 'Morning'} Shift
                </span>
             </div>
             <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {staff.filter(s => s.role === UserRole.NURSE && s.shift === (user.shift || 'Morning')).length > 0 ? (
                  staff.filter(s => s.role === UserRole.NURSE && s.shift === (user.shift || 'Morning')).map(nurse => (
                    <div key={nurse.id} className="p-4 hover:bg-slate-50 transition">
                       <div className="flex items-center gap-3">
                          <img src={nurse.avatarUrl} alt={nurse.name} className="w-10 h-10 rounded-full border border-slate-100 object-cover" />
                          <div className="flex-1 min-w-0">
                             <p className="text-sm font-bold text-slate-900 truncate">{nurse.name}</p>
                             <p className="text-xs text-slate-500">{nurse.department}</p>
                          </div>
                          <span className={`w-2 h-2 rounded-full shrink-0 ${nurse.status === 'Active' ? 'bg-green-500' : 'bg-amber-500'}`} title={nurse.status}></span>
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Hospital Control Center</h2>
          <p className="text-sm text-slate-500">System-wide operational overview.</p>
        </div>
        <div className="text-sm text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Patients" value={patients.length.toString()} icon={<Users size={20} />} trend="+12%" color="bg-blue-500" />
        <StatCard title="Staff Active" value={`${staff.filter(s => s.status === 'Active').length} / ${staff.length}`} icon={<Stethoscope size={20} />} color="bg-purple-500" />
        <StatCard title="Revenue (MTD)" value="₹124.5k" icon={<IndianRupee size={20} />} trend="+8.2%" color="bg-emerald-500" />
        <StatCard title="Bed Occupancy" value={`${occupancyRate}%`} icon={<BedDouble size={20} />} color={occupancyRate > 80 ? 'bg-amber-500' : 'bg-slate-500'} />
      </div>

      {/* Departmental Operational Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-teal-400 transition cursor-pointer">
              <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${lowStockCount > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      <Pill size={24} />
                  </div>
                  <div>
                      <h4 className="font-bold text-slate-800">Pharmacy</h4>
                      <p className={`text-xs font-semibold ${lowStockCount > 0 ? 'text-red-500' : 'text-slate-500'}`}>
                          {lowStockCount > 0 ? `${lowStockCount} Low Stock Alerts` : 'Inventory Healthy'}
                      </p>
                  </div>
              </div>
              <ArrowRight size={18} className="text-slate-300" />
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-indigo-400 transition cursor-pointer">
              <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${urgentLabCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                      <FlaskConical size={24} />
                  </div>
                  <div>
                      <h4 className="font-bold text-slate-800">Laboratory</h4>
                      <p className={`text-xs font-semibold ${urgentLabCount > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                          {urgentLabCount > 0 ? `${urgentLabCount} Urgent Pending` : 'Operating Normal'}
                      </p>
                  </div>
              </div>
              <ArrowRight size={18} className="text-slate-300" />
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-400 transition cursor-pointer">
              <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                      <Clock size={24} />
                  </div>
                  <div>
                      <h4 className="font-bold text-slate-800">OPD Wait Time</h4>
                      <p className="text-xs font-semibold text-slate-500">Avg. 15 mins</p>
                  </div>
              </div>
              <ArrowRight size={18} className="text-slate-300" />
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold text-slate-800">Hospital Traffic</h3>
             <select className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none text-slate-600">
                <option>This Week</option>
                <option>Last Week</option>
             </select>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={appointmentStats}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Recent System Activity</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-72">
             {auditLogs.map(log => (
                 <div key={log.id} className="flex gap-3 items-start border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                     <div className="w-2 h-2 rounded-full bg-slate-300 mt-2 shrink-0"></div>
                     <div>
                         <p className="text-sm font-semibold text-slate-800">{log.action}</p>
                         <p className="text-xs text-slate-500">{log.user} • {log.role}</p>
                         <p className="text-[10px] text-slate-400 mt-1">{log.timestamp}</p>
                     </div>
                 </div>
             ))}
          </div>
          <button className="w-full mt-auto pt-3 text-center text-xs font-bold text-teal-600 hover:text-teal-700">View Full Audit Log</button>
        </div>
      </div>
    </div>
  );
};
