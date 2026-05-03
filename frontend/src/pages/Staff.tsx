import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Plus, Search, Phone, Clock, X, Lock, User as UserIcon, Mail, Loader2, CreditCard, Trash2, Pencil, Stethoscope, FlaskConical, ShieldPlus, Pill, ClipboardList } from 'lucide-react';
import { UserRole, Staff as StaffType, User } from '../types';
import { registerUser, AUTH_STORAGE_KEY, deleteStaffMember, updateStaffShift, updateStaffMember, listNurseOrders, updateNurseOrderStatus } from '../services/api';
import { useData } from '../contexts/DataContext';

/* ── role-specific config ─────────────────────────────────────── */
const ROLE_META: Record<string, { icon: React.ReactNode; color: string; gradient: string; departments: string[]; namePlaceholder: string; descLabel?: string; descPlaceholder?: string }> = {
  [UserRole.DOCTOR]: {
    icon: <Stethoscope size={18} />,
    color: 'bg-teal-100 text-teal-700',
    gradient: 'from-teal-500 to-emerald-600',
    departments: ['General Doctor', 'Cardiology', 'Neurology', 'Pediatrics', 'Dermatology', 'Orthopedics', 'ENT', 'Ophthalmology', 'Dentist'],
    namePlaceholder: 'Dr. Sarah Wilson',
    descLabel: 'Professional Bio',
    descPlaceholder: "Enter doctor's professional background, specialty, and experience...",
  },
  [UserRole.NURSE]: {
    icon: <ShieldPlus size={18} />,
    color: 'bg-blue-100 text-blue-700',
    gradient: 'from-blue-500 to-indigo-600',
    departments: ['General Ward', 'ICU', 'Emergency', 'Pediatrics', 'Surgery', 'Maternity'],
    namePlaceholder: 'Nurse Priya Sharma',
    descLabel: 'Specialization / Notes',
    descPlaceholder: 'E.g. ICU-trained, wound care specialist...',
  },
  [UserRole.RECEPTIONIST]: {
    icon: <ClipboardList size={18} />,
    color: 'bg-amber-100 text-amber-700',
    gradient: 'from-amber-500 to-orange-600',
    departments: ['Front Desk', 'Emergency Reception'],
    namePlaceholder: 'Ravi Kumar',
  },
  [UserRole.LAB_TECHNICIAN]: {
    icon: <FlaskConical size={18} />,
    color: 'bg-purple-100 text-purple-700',
    gradient: 'from-purple-500 to-violet-600',
    departments: ['Pathology', 'Radiology', 'Microbiology', 'Biochemistry'],
    namePlaceholder: 'Arun Mehta',
    descLabel: 'Certifications / Notes',
    descPlaceholder: 'E.g. NABL trained, CBC specialist...',
  },
  [UserRole.PHARMACIST]: {
    icon: <Pill size={18} />,
    color: 'bg-rose-100 text-rose-700',
    gradient: 'from-rose-500 to-pink-600',
    departments: ['Pharmacy'],
    namePlaceholder: 'Meena Joshi',
  },
};

type RoleTab = 'All' | 'Doctor' | 'Nurse' | 'Receptionist' | 'Lab Technician' | 'Pharmacist';
const TABS: RoleTab[] = ['All', 'Doctor', 'Nurse', 'Receptionist', 'Lab Technician', 'Pharmacist'];

const NurseOrdersList: React.FC<{ nurseId: string; userRole?: UserRole }> = ({ nurseId, userRole }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_STORAGE_KEY) || '';
    if (token) {
        listNurseOrders(token)
            .then(data => setOrders(data.filter(o => o.assigned_to === nurseId && o.status !== 'Completed')))
            .catch(console.error)
            .finally(() => setLoading(false));
    }
  }, [nurseId]);

  if (loading) return <div className="text-sm text-slate-500 mt-4 animate-pulse">Loading pending orders...</div>;
  if (orders.length === 0) return <div className="text-sm text-slate-500 mt-4 italic">No pending orders for this nurse.</div>;

  return (
    <div className="mt-6 bg-slate-50 rounded-2xl p-5 border border-slate-100">
      <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><ClipboardList size={16} className="text-sky-500"/>Pending Orders</h4>
      <div className="space-y-3">
        {orders.map(o => (
          <div key={o.id} className="p-3 bg-white rounded-xl shadow-sm border border-slate-200/60">
            <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-slate-800 text-sm">{o.order_type}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{o.priority}</span>
            </div>
            <p className="text-slate-600 text-xs line-clamp-2 mb-2">{o.instructions}</p>
            {userRole === UserRole.DOCTOR && (
                <div className="flex gap-2 justify-end">
                  <button onClick={() => {
                        const token = localStorage.getItem(AUTH_STORAGE_KEY) || '';
                        updateNurseOrderStatus(token, o.id, 'Cancelled').then(() => setOrders(prev => prev.filter(p => p.id !== o.id)));
                  }} className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 font-semibold rounded-lg transition-colors duration-200">Cancel Order</button>
                </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const Staff: React.FC<{user?: User}> = ({user}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingStaff, setViewingStaff] = useState<StaffType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<RoleTab>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const { staff, refreshStaff } = useData();
  // ── Form state ──
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.DOCTOR);
  const [department, setDepartment] = useState('General Doctor');
  const [contact, setContact] = useState('');
  const [shift, setShift] = useState<'Morning' | 'Evening' | 'Night'>('Morning');
  const [bio, setBio] = useState('');
  const [consultationFee, setConsultationFee] = useState('');

  // ── Edit staff state ──
  const [isEditStaffOpen, setIsEditStaffOpen] = useState(false);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editMessage, setEditMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '', department: '', contact: '',
    status: 'Active' as 'Active' | 'On Leave',
    shift: 'Morning' as 'Morning' | 'Evening' | 'Night',
    bio: '', consultation_fee: '',
  });

  const meta = ROLE_META[role] || ROLE_META[UserRole.DOCTOR];

  // Sync default department when role changes
  useEffect(() => {
    const m = ROLE_META[role];
    if (m) setDepartment(m.departments[0]);
  }, [role]);

  useEffect(() => {
    const fetchStaff = async () => {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        try {
          const { token } = JSON.parse(stored);
          if (token) {
            setLoading(true);
            await refreshStaff(token);
          }
        } catch (err) {
          console.error('Failed to auto-refresh staff:', err);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchStaff();
  }, [refreshStaff]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const { token } = JSON.parse(stored);
        if (token) await refreshStaff(token);
      }
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Filtered list ──
  const filteredStaff = useMemo(() => {
    let list = staff;
    if (activeTab !== 'All') list = list.filter(s => s.role === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.department.toLowerCase().includes(q) || s.role.toLowerCase().includes(q));
    }
    return list;
  }, [staff, activeTab, searchQuery]);

  // ── Role counts for tab badges ──
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { All: staff.length };
    TABS.forEach(t => { if (t !== 'All') counts[t] = staff.filter(s => s.role === t).length; });
    return counts;
  }, [staff]);

  /* ── handlers ─────────────────────────────────────────────── */
  const resetForm = () => {
    setName(''); setEmail(''); setPassword(''); setBio(''); setConsultationFee(''); setContact('');
    setRole(UserRole.DOCTOR); setDepartment('General Doctor'); setShift('Morning');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      await registerUser({
        full_name: name, email, password, role, department, contact, shift,
        bio: (role === UserRole.DOCTOR || role === UserRole.NURSE || role === UserRole.LAB_TECHNICIAN) ? bio : undefined,
        consultation_fee: role === UserRole.DOCTOR ? Number(consultationFee) : undefined,
      });
      setMessage({ type: 'success', text: `${role} "${name}" registered successfully.` });
      resetForm();
      handleRefresh();
      setTimeout(() => { setIsModalOpen(false); setMessage(null); }, 2000);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Registration failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!window.confirm('Are you sure you want to permanently remove this staff member? This cannot be undone.')) return;
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const { token } = JSON.parse(stored);
        if (token) { await deleteStaffMember(token, staffId); setViewingStaff(null); handleRefresh(); }
      }
    } catch (err: any) { alert('Failed to delete staff: ' + (err.message || 'Unknown error')); }
  };

  const handleUpdateShift = async (staffId: string, newShift: any) => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const { token } = JSON.parse(stored);
        if (token) { await updateStaffShift(token, staffId, newShift); setViewingStaff(prev => prev ? { ...prev, shift: newShift } : null); handleRefresh(); }
      }
    } catch (err: any) { alert('Failed to update shift: ' + (err.message || 'Unknown error')); }
  };

  const openEditStaff = (s: StaffType) => {
    setEditForm({
      full_name: s.name,
      department: s.department || '',
      contact: s.contact || '',
      status: (s.status as 'Active' | 'On Leave') || 'Active',
      shift: (s.shift as 'Morning' | 'Evening' | 'Night') || 'Morning',
      bio: s.bio || '',
      consultation_fee: s.consultationFee ? String(s.consultationFee) : '',
    });
    setIsEditStaffOpen(true);
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingStaff) return;
    setIsEditSubmitting(true);
    setEditMessage(null);
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      const token = stored ? JSON.parse(stored)?.token : null;
      if (!token) throw new Error('Not authenticated. Please log in again.');

      const updated = await updateStaffMember(token, viewingStaff.id, {
        full_name: editForm.full_name,
        department: editForm.department || null,
        contact: editForm.contact || null,
        status: editForm.status,
        shift: editForm.shift,
        bio: editForm.bio || null,
        consultation_fee:
          viewingStaff.role === 'Doctor' && editForm.consultation_fee
            ? Number(editForm.consultation_fee)
            : null,
      });

      setViewingStaff(prev =>
        prev ? {
          ...prev,
          name: updated.full_name,
          department: updated.department ?? prev.department,
          contact: updated.contact ?? prev.contact,
          status: updated.status ?? prev.status,
          shift: updated.shift ?? prev.shift,
          bio: updated.bio ?? undefined,
          consultationFee: updated.consultation_fee ?? undefined,
        } : null
      );
      setEditMessage({ type: 'success', text: 'Staff updated successfully.' });
      handleRefresh();
      setTimeout(() => { setIsEditStaffOpen(false); setEditMessage(null); }, 1800);
    } catch (err: any) {
      console.error('[EditStaff] Update failed:', err);
      setEditMessage({ type: 'error', text: err.message || 'Update failed. Please try again.' });
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const getRoleMeta = (r: string) => ROLE_META[r] || ROLE_META[UserRole.DOCTOR];

  /* ── render ───────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-800">Hospital Staff</h2>
          <p className="text-slate-500">Manage all hospital staff — doctors, nurses, receptionists, lab techs &amp; pharmacists.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-teal-500 text-white px-5 py-2.5 rounded-xl hover:from-sky-600 hover:to-teal-600 transition-all shadow-lg shadow-sky-500/20 font-semibold text-sm hover:scale-[1.02] active:scale-[0.98]">
          <Plus size={18} />
          <span>Add New Staff</span>
        </button>
      </div>

      {/* Role Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${activeTab === tab
                ? 'bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-lg shadow-sky-500/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            {tab}
            <span className={`ml-1.5 text-xs font-bold ${activeTab === tab ? 'bg-white/20 px-1.5 py-0.5 rounded-full' : 'text-slate-400'}`}>
              {roleCounts[tab] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Staff Grid */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-sky-50/30">
          <div className="relative w-full sm:w-96">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search staff by name, role or department..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-300 transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {loading ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
              <p className="text-slate-500 font-medium tracking-wide">Fetching staff records...</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="col-span-full py-20 bg-slate-50/50 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 border border-slate-100">
                <UserIcon className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                {activeTab === 'All' ? 'No Staff Found' : `No ${activeTab}s Found`}
              </h3>
              <p className="text-slate-500 max-w-xs mx-auto">
                {searchQuery ? 'Try a different search term.' : `Register your first ${activeTab === 'All' ? 'staff member' : activeTab.toLowerCase()} to get started.`}
              </p>
              {!searchQuery && (
                <button onClick={() => setIsModalOpen(true)} className="mt-6 flex items-center gap-2 text-teal-600 font-semibold hover:text-teal-700 transition">
                  <Plus size={18} /><span>Add staff member</span>
                </button>
              )}
            </div>
          ) : (
            filteredStaff.map((s) => {
              const rm = getRoleMeta(s.role);
              return (
                <div key={s.id} className="border border-slate-200 rounded-2xl p-5 card-hover bg-white flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <img src={s.avatarUrl} alt={s.name} className="w-12 h-12 rounded-full object-cover border border-slate-100" />
                      <div>
                        <h3 className="font-display font-bold text-slate-900">{s.name}</h3>
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${rm.color}`}>
                          {rm.icon} {s.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 flex-1">
                    <div className="flex items-center text-sm text-slate-600">
                      <span className="w-20 text-slate-400 text-xs uppercase font-semibold">Dept</span>
                      {s.department}
                    </div>
                    <div className="flex items-center text-sm text-slate-600">
                      <Phone size={14} className="mr-2 text-slate-400" />{s.contact || '—'}
                    </div>
                    <div className="flex items-center text-sm text-slate-600">
                      <Clock size={14} className="mr-2 text-slate-400" />{s.shift} Shift
                    </div>
                    {s.role === 'Doctor' && s.consultationFee && (
                      <div className="flex items-center text-sm font-semibold text-teal-700">
                        <span className="w-20 text-slate-400 text-xs uppercase font-semibold">Fee</span>₹{s.consultationFee}
                      </div>
                    )}
                    {s.bio && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-2 italic font-serif">"{s.bio}"</p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>{s.status}</span>
                    <button onClick={() => setViewingStaff(s)} className="text-sm font-medium text-sky-600 hover:text-sky-700">View Profile</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── PROFILE DETAIL MODAL ─────────────────────────────── */}
      {viewingStaff && (() => {
        const vm = getRoleMeta(viewingStaff.role);
        return ReactDOM.createPortal(
          <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[60] flex justify-center p-4 overflow-y-auto py-12">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl h-fit overflow-hidden animate-scale-in border border-slate-200/50">
              <div className={`relative h-44 bg-gradient-to-r ${vm.gradient}`}>
                <div className="absolute top-4 right-4 flex gap-2 z-20">
                  {user?.role === UserRole.ADMIN && (
                    <>
                      <button onClick={() => openEditStaff(viewingStaff)} className="p-2 bg-sky-500/80 hover:bg-sky-600 text-white rounded-full transition-colors" title="Edit Staff"><Pencil size={20} /></button>
                      <button onClick={() => handleDeleteStaff(viewingStaff.id)} className="p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-full transition-colors" title="Delete Staff"><Trash2 size={20} /></button>
                    </>
                  )}
                  <button onClick={() => setViewingStaff(null)} className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors" title="Close"><X size={20} /></button>
                </div>
              </div>

              <div className="px-8 pb-8">
                <div className="flex justify-center -mt-16 relative z-10 mb-6">
                  <img src={viewingStaff.avatarUrl} alt={viewingStaff.name} className="w-32 h-32 rounded-3xl object-cover border-4 border-white shadow-xl bg-white" />
                </div>

                <div className="text-center mb-2">
                  <h3 className="text-2xl font-display font-bold text-slate-900 mb-1">{viewingStaff.name}</h3>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${vm.color}`}>
                    {vm.icon} {viewingStaff.role}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6 mb-8">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Department</p>
                    <p className="font-semibold text-slate-800">{viewingStaff.department}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                    <p className="font-semibold text-slate-800 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${viewingStaff.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                      {viewingStaff.status}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contact</p>
                    <p className="font-semibold text-slate-800">{viewingStaff.contact || 'No contact'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Working Shift</p>
                    <div className="flex items-center gap-1">
                      <select value={viewingStaff.shift} onChange={(e) => handleUpdateShift(viewingStaff.id, e.target.value)} className="bg-transparent font-semibold text-slate-800 text-sm focus:outline-none cursor-pointer hover:text-teal-600 transition">
                        <option value="Morning">Morning</option>
                        <option value="Evening">Evening</option>
                        <option value="Night">Night</option>
                      </select>
                      <Clock size={12} className="text-slate-400" />
                    </div>
                  </div>
                </div>

                {viewingStaff.role === 'Nurse' && <NurseOrdersList nurseId={viewingStaff.id} userRole={user?.role} />}

                {viewingStaff.bio && (
                  <div className="mb-8 p-5 bg-teal-50/50 rounded-2xl border border-teal-100">
                    <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider mb-2">
                      {viewingStaff.role === 'Doctor' ? 'Professional Bio' : viewingStaff.role === 'Lab Technician' ? 'Certifications / Notes' : 'Specialization / Notes'}
                    </p>
                    <p className="text-sm text-slate-600 leading-relaxed italic">"{viewingStaff.bio}"</p>
                  </div>
                )}

                {/* Doctor-specific: consultation fee + book appointment */}
                {viewingStaff.role === 'Doctor' && (
                  <div className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl text-white shadow-xl">
                    <div className="flex items-center gap-3">
                      <div className="bg-teal-500/20 p-2 rounded-lg"><CreditCard size={20} className="text-teal-400" /></div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Consultation Fee</p>
                        <p className="text-lg font-bold">₹{viewingStaff.consultationFee || '0'}</p>
                      </div>
                    </div>
                    <button className="bg-teal-600 hover:bg-teal-500 px-6 py-2 rounded-xl text-sm font-bold transition">Book Appointment</button>
                  </div>
                )}

                {/* Non-doctor: role summary footer */}
                {viewingStaff.role !== 'Doctor' && (
                  <div className={`flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r ${vm.gradient} text-white shadow-xl`}>
                    <div className="bg-white/20 p-2 rounded-lg">{vm.icon}</div>
                    <div>
                      <p className="text-[10px] font-bold text-white/60 uppercase">Role</p>
                      <p className="text-lg font-bold">{viewingStaff.role}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        , document.body);
      })()}

      {/* ── EDIT STAFF MODAL ──────────────────────────────── */}
      {isEditStaffOpen && viewingStaff && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[70] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8 overflow-hidden animate-scale-in border border-slate-200/50">
            <div className="bg-gradient-to-r from-sky-600 to-teal-600 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-display font-bold">Edit Staff Member</h3>
                <p className="text-sky-100 text-sm">{viewingStaff.role} — {viewingStaff.name}</p>
              </div>
              <button onClick={() => { setIsEditStaffOpen(false); setEditMessage(null); }} className="text-sky-200 hover:text-white transition"><X size={24} /></button>
            </div>
            <form onSubmit={handleUpdateStaff} className="p-6 space-y-4">
              {editMessage && (
                <div className={`p-3 rounded-xl text-sm ${ editMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{editMessage.text}</div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Full Name</label>
                  <input type="text" required value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Department</label>
                  <select value={editForm.department} onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none bg-white">
                    {(ROLE_META[viewingStaff.role] || ROLE_META[UserRole.DOCTOR]).departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Working Shift</label>
                  <select value={editForm.shift} onChange={e => setEditForm(f => ({ ...f, shift: e.target.value as any }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none bg-white">
                    <option value="Morning">Morning</option>
                    <option value="Evening">Evening</option>
                    <option value="Night">Night</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Contact</label>
                  <input type="text" value={editForm.contact} onChange={e => setEditForm(f => ({ ...f, contact: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Status</label>
                  <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as any }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none bg-white">
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>
                {viewingStaff.role === 'Doctor' && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Consultation Fee (₹)</label>
                    <input type="number" value={editForm.consultation_fee} onChange={e => setEditForm(f => ({ ...f, consultation_fee: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none" />
                  </div>
                )}
                {(viewingStaff.role === 'Doctor' || viewingStaff.role === 'Nurse' || viewingStaff.role === 'Lab Technician') && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Bio / Notes</label>
                    <textarea rows={3} value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none resize-none" />
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button type="button" onClick={() => { setIsEditStaffOpen(false); setEditMessage(null); }} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition">Cancel</button>
                <button type="submit" disabled={isEditSubmitting} className="flex-1 bg-gradient-to-r from-sky-500 to-teal-500 text-white px-4 py-2.5 rounded-xl font-bold hover:from-sky-600 hover:to-teal-600 transition-all disabled:opacity-50">
                  {isEditSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* ── REGISTRATION MODAL (role-adaptive) ──────────────── */}
      {isModalOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden animate-scale-in border border-slate-200/50">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-display font-bold">Register New Staff</h3>
                <p className="text-slate-400 text-sm">Choose role and fill in the details below</p>
              </div>
              <button onClick={() => { setIsModalOpen(false); resetForm(); setMessage(null); }} className="text-slate-400 hover:text-white transition"><X size={24} /></button>
            </div>

            {/* Role Selector Chips */}
            <div className="px-8 pt-6 pb-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Select Role</label>
              <div className="flex flex-wrap gap-2">
                {([UserRole.DOCTOR, UserRole.NURSE, UserRole.RECEPTIONIST, UserRole.LAB_TECHNICIAN, UserRole.PHARMACIST] as UserRole[]).map(r => {
                  const rm = ROLE_META[r];
                  return (
                    <button
                      key={r} type="button"
                      onClick={() => setRole(r)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition ${role === r
                          ? 'bg-gradient-to-r from-sky-500 to-teal-500 text-white border-sky-500 shadow-lg shadow-sky-500/20'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:bg-sky-50'
                        }`}
                    >
                      {rm.icon} {r}
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleRegister} className="px-8 pb-8 pt-4 space-y-6">
              {message && (
                <div className={`p-4 rounded-xl text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{message.text}</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column — account */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Account Information</h4>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Full Name</label>
                    <div className="relative">
                      <UserIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder={meta.namePlaceholder} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@medcore.com" className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Password</label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Phone (Indian Format)</label>
                    <input type="text" required value={contact} onChange={e => setContact(e.target.value)} placeholder="+91 XXXXX XXXXX" className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none" />
                  </div>
                </div>

                {/* Right column — profile (dynamic) */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{role} Profile</h4>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Department</label>
                    <select value={department} onChange={e => setDepartment(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none bg-white font-medium">
                      {meta.departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Working Shift</label>
                    <select value={shift} onChange={e => setShift(e.target.value as any)} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none bg-white font-medium">
                      <option value="Morning">Morning Shift</option>
                      <option value="Evening">Evening Shift</option>
                      <option value="Night">Night Shift</option>
                    </select>
                  </div>

                  {/* Doctor-only: consultation fee */}
                  {role === UserRole.DOCTOR && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 flex justify-between">Consultation Fee <span>(₹)</span></label>
                      <input type="number" required value={consultationFee} onChange={e => setConsultationFee(e.target.value)} placeholder="500" className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none" />
                    </div>
                  )}
                </div>
              </div>

              {/* Bio / Notes — for Doctor, Nurse, Lab Technician */}
              {meta.descLabel && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{meta.descLabel}</label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder={meta.descPlaceholder} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none resize-none" />
                </div>
              )}

              <div className="pt-6 border-t border-slate-100 flex gap-4">
                <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); setMessage(null); }} className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-gradient-to-r from-sky-500 to-teal-500 text-white px-4 py-3 rounded-xl font-bold hover:from-sky-600 hover:to-teal-600 transition-all disabled:opacity-50 shadow-lg shadow-sky-500/20">
                  {isSubmitting ? 'Registering...' : `Register ${role}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}
    </div>
  );
};
