import React, { useState } from 'react';
import { Shield, Users, Activity, Lock, Search, Filter, Database, Server, Plus, MoreVertical, FlaskConical, Pill, AlertTriangle, CheckCircle, Smartphone, X, Mail, User as UserIcon } from 'lucide-react';
import { UserRole } from '../types';
import { registerUser, AUTH_STORAGE_KEY } from '../services/api';
import { useData } from '../contexts/DataContext';

export const AdminPanel: React.FC = () => {
  const { staff, refreshStaff, auditLogs, medicines, labTests, beds } = useData();

  React.useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const { token } = JSON.parse(stored);
        if (token) {
          refreshStaff(token);
        }
      } catch (err) {
        console.error('Failed to auto-refresh staff in Admin Panel:', err);
      }
    }
  }, [refreshStaff]);

  const [activeTab, setActiveTab] = useState<'users' | 'system' | 'departments' | 'logs'>('users');
  const [roleFilter, setRoleFilter] = useState<string>('All');

  // New User Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.DOCTOR);
  const [department, setDepartment] = useState('General Doctor');
  const [contact, setContact] = useState('');
  const [shift, setShift] = useState<'Morning' | 'Evening' | 'Night'>('Morning');
  const [bio, setBio] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      await registerUser({
        full_name: name,
        email,
        password,
        role,
        department: role === UserRole.DOCTOR ? department : undefined,
        contact: role === UserRole.DOCTOR ? contact : undefined,
        shift: role === UserRole.DOCTOR ? shift : undefined,
        bio: role === UserRole.DOCTOR ? bio : undefined,
        consultation_fee: role === UserRole.DOCTOR ? Number(consultationFee) : undefined
      });
      setMessage({ type: 'success', text: `User ${name} registered successfully.` });
      // Reset form
      setName('');
      setEmail('');
      setPassword('');
      setBio('');
      setConsultationFee('');
      // Keep modal open briefly to show success or close it
      setTimeout(() => {
        setIsModalOpen(false);
        setMessage(null);
      }, 2000);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Registration failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stats for System Health
  const dbStatus = 'Connected';
  const apiStatus = 'Online (42ms)';
  const lastBackup = 'Today, 03:00 AM';

  // Stats for Departments
  const totalStockValue = medicines.reduce((acc, curr) => acc + (curr.price * curr.stock), 0);
  const lowStockCount = medicines.filter(m => m.stock <= 20).length;
  const labPending = labTests.filter(t => t.status === 'Pending').length;
  const wardOccupancy = Math.round((beds.filter(b => b.status === 'Occupied').length / beds.length) * 100);

  // Filter Staff
  const filteredStaff = roleFilter === 'All' 
    ? staff 
    : staff.filter(s => s.role === roleFilter);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Admin Control Panel</h2>
           <p className="text-slate-500">Manage users, system configuration, and hospital departments.</p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
           <button 
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'users' ? 'bg-slate-800 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
           >
              Users
           </button>
           <button 
              onClick={() => setActiveTab('departments')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'departments' ? 'bg-slate-800 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
           >
              Departments
           </button>
           <button 
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'logs' ? 'bg-slate-800 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
           >
              Audit Logs
           </button>
           <button 
              onClick={() => setActiveTab('system')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'system' ? 'bg-slate-800 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
           >
              System Health
           </button>
        </div>
      </div>

      {/* USER MANAGEMENT TAB */}
      {activeTab === 'users' && (
         <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row gap-4 justify-between items-center">
               <div className="flex gap-2 items-center">
                  <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search staff..." 
                        className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 w-64"
                      />
                  </div>
                  <div className="relative">
                      <select 
                         value={roleFilter}
                         onChange={(e) => setRoleFilter(e.target.value)}
                         className="pl-3 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none bg-white appearance-none cursor-pointer"
                      >
                         <option value="All">All Roles</option>
                         {Object.values(UserRole).filter(r => r !== 'Patient' && r !== 'Admin').map(r => (
                             <option key={r} value={r}>{r}</option>
                         ))}
                      </select>
                      <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
               </div>
               <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition"
               >
                  <Plus size={16} /> Add User
               </button>
            </div>
            
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                     <tr>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Department</th>
                        <th className="px-6 py-4">Shift</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {filteredStaff.map(staff => (
                        <tr key={staff.id} className="hover:bg-slate-50 transition">
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                 <img src={staff.avatarUrl} alt="" className="w-8 h-8 rounded-full bg-slate-200" />
                                 <span className="text-sm font-bold text-slate-900">{staff.name}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4 text-sm text-slate-600">{staff.role}</td>
                           <td className="px-6 py-4 text-sm text-slate-600">{staff.department}</td>
                           <td className="px-6 py-4 text-sm text-slate-500">{staff.shift}</td>
                           <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                 staff.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                 {staff.status}
                              </span>
                           </td>
                           <td className="px-6 py-4 text-right text-slate-400">
                              <button className="hover:text-slate-600"><MoreVertical size={18} /></button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      )}

      {/* DEPARTMENTS OVERVIEW TAB */}
      {activeTab === 'departments' && (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pharmacy Monitor */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                     <Pill size={18} className="text-teal-600" /> Pharmacy Monitor
                  </h3>
                  <span className="text-xs bg-white border border-slate-200 px-2 py-1 rounded text-slate-500 font-mono">Inventory Value: ${totalStockValue.toLocaleString()}</span>
               </div>
               <div className="p-6 grid grid-cols-2 gap-4">
                  <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                      <div className="flex items-center gap-2 mb-2">
                         <AlertTriangle size={18} className="text-red-500" />
                         <span className="text-sm font-bold text-red-700">Low Stock Alerts</span>
                      </div>
                      <p className="text-2xl font-bold text-red-800">{lowStockCount}</p>
                      <p className="text-xs text-red-600 mt-1">Items below threshold</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                      <div className="flex items-center gap-2 mb-2">
                         <CheckCircle size={18} className="text-green-500" />
                         <span className="text-sm font-bold text-green-700">Healthy Stock</span>
                      </div>
                      <p className="text-2xl font-bold text-green-800">{medicines.length - lowStockCount}</p>
                      <p className="text-xs text-green-600 mt-1">Items available</p>
                  </div>
               </div>
            </div>

            {/* Lab Monitor */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                     <FlaskConical size={18} className="text-indigo-600" /> Laboratory Monitor
                  </h3>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">Machines Online</span>
               </div>
               <div className="p-6 grid grid-cols-2 gap-4">
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                      <div className="flex items-center gap-2 mb-2">
                         <Activity size={18} className="text-amber-500" />
                         <span className="text-sm font-bold text-amber-700">Pending Tests</span>
                      </div>
                      <p className="text-2xl font-bold text-amber-800">{labPending}</p>
                      <p className="text-xs text-amber-600 mt-1">In Queue</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                         <Database size={18} className="text-slate-500" />
                         <span className="text-sm font-bold text-slate-700">Total Volume</span>
                      </div>
                      <p className="text-2xl font-bold text-slate-800">{labTests.length}</p>
                      <p className="text-xs text-slate-500 mt-1">Tests Today</p>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* SYSTEM HEALTH TAB */}
      {activeTab === 'system' && (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
               <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                  <Database size={24} />
               </div>
               <h3 className="font-bold text-slate-800">Database Connection</h3>
               <p className="text-green-600 font-semibold text-sm mt-1">{dbStatus}</p>
               <p className="text-xs text-slate-400 mt-2">MySQL Instance: medcore_primary</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
               <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                  <Server size={24} />
               </div>
               <h3 className="font-bold text-slate-800">API Gateway</h3>
               <p className="text-blue-600 font-semibold text-sm mt-1">{apiStatus}</p>
               <p className="text-xs text-slate-400 mt-2">Flask Backend v2.1.0</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
               <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4">
                  <Shield size={24} />
               </div>
               <h3 className="font-bold text-slate-800">Data Backup</h3>
               <p className="text-purple-600 font-semibold text-sm mt-1">{lastBackup}</p>
               <p className="text-xs text-slate-400 mt-2">Encrypted Snapshot</p>
            </div>

            <div className="md:col-span-3 bg-slate-900 rounded-xl p-6 text-white font-mono text-sm">
               <div className="flex items-center gap-2 text-green-400 mb-4 border-b border-slate-700 pb-2">
                  <Smartphone size={16} /> System Logs (Live Tail)
               </div>
               <div className="space-y-2 opacity-80">
                  <p>[INFO] 10:45:23 - User login successful (u1)</p>
                  <p>[INFO] 10:46:12 - API Request: GET /api/patients/p3/vitals 200 OK</p>
                  <p>[WARN] 10:48:05 - High memory usage detected on worker-2</p>
                  <p>[INFO] 10:50:01 - Scheduled task 'inventory_check' completed</p>
               </div>
            </div>
         </div>
      )}

      {/* AUDIT LOGS TAB */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
           <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Activity size={18} /> Security Audit Trails</h3>
              <div className="flex gap-2">
                 <button className="text-xs bg-white border border-slate-200 px-3 py-1 rounded text-slate-600">Export CSV</button>
              </div>
           </div>
           <div className="p-0">
              <table className="w-full text-left">
                 <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr>
                       <th className="px-6 py-4">Action</th>
                       <th className="px-6 py-4">User</th>
                       <th className="px-6 py-4">Role</th>
                       <th className="px-6 py-4">Details</th>
                       <th className="px-6 py-4">Timestamp</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 text-sm">
                    {auditLogs.map(log => (
                       <tr key={log.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-bold text-slate-700">{log.action}</td>
                          <td className="px-6 py-4 text-slate-600">{log.user}</td>
                          <td className="px-6 py-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs">{log.role}</span></td>
                          <td className="px-6 py-4 text-slate-500">{log.details}</td>
                          <td className="px-6 py-4 text-slate-400 font-mono text-xs">{log.timestamp}</td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* ADD USER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Register New Staff</h3>
                <p className="text-slate-400 text-sm">Create credentials for hospital personnel</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              {message && (
                <div className={`p-3 rounded-lg text-sm mb-4 ${
                  message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {message.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Full Name</label>
                <div className="relative">
                  <UserIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dr. Sarah Wilson"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sarah.wilson@medcore.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Initial Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Role</label>
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                  >
                    {Object.values(UserRole).filter(r => r !== UserRole.ADMIN && r !== UserRole.PATIENT).map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Department</label>
                  <select 
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white font-medium"
                  >
                    <option value="Cardiology">Cardiology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="General Doctor">General Doctor</option>
                    <option value="Dentist">Dentist</option>
                  </select>
                </div>

                {role === UserRole.DOCTOR && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Contact #</label>
                      <input 
                        type="text" 
                        required
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        placeholder="555-01XX"
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Shift</label>
                      <select 
                        value={shift}
                        onChange={(e) => setShift(e.target.value as any)}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                      >
                        <option value="Morning">Morning</option>
                        <option value="Evening">Evening</option>
                        <option value="Night">Night</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Consultation Fee (₹)</label>
                      <input 
                        type="number" 
                        required
                        value={consultationFee}
                        onChange={(e) => setConsultationFee(e.target.value)}
                        placeholder="500"
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div className="col-span-2">
                       <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Professional Bio</label>
                       <textarea 
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={2}
                        placeholder="Short bio for doctor profile..."
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none"
                       />
                    </div>
                  </>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-teal-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Register User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
