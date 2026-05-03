import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Activity, 
  LogOut,
  CreditCard,
  Stethoscope,
  FlaskConical,
  Pill,
  Shield,
  BedDouble,
  ClipboardList
} from 'lucide-react';
import { UserRole } from '../types';
import { AUTH_STORAGE_KEY, listNurseOrders } from '../services/api';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  userRole: UserRole;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, userRole, onLogout }) => {
  const [pendingOrderCount, setPendingOrderCount] = useState(0);

  useEffect(() => {
    if (userRole !== UserRole.NURSE) return;
    const load = async () => {
      try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        const token = stored ? JSON.parse(stored)?.token : null;
        if (!token) return;
        const orders = await listNurseOrders(token);
        setPendingOrderCount(orders.filter((o: any) => o.status === 'Pending' || o.status === 'In Progress').length);
      } catch {}
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [userRole]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, allowed: ['all'] },
    { id: 'patients', label: 'Patients', icon: <Users size={20} />, allowed: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.RECEPTIONIST] },
    { id: 'ward', label: 'Ward & Beds', icon: <BedDouble size={20} />, allowed: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.RECEPTIONIST] },
    { id: 'nurse-orders', label: "Doctor's Orders", icon: <ClipboardList size={20} />, allowed: [UserRole.NURSE] },
    { id: 'staff', label: 'Staff', icon: <Stethoscope size={20} />, allowed: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.RECEPTIONIST] },
    { id: 'appointments', label: 'Appointments', icon: <Calendar size={20} />, allowed: ['all'] },
    { id: 'laboratory', label: 'Laboratory', icon: <FlaskConical size={20} />, allowed: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.LAB_TECHNICIAN] },
    { id: 'pharmacy', label: 'Pharmacy', icon: <Pill size={20} />, allowed: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.PHARMACIST] },
    { id: 'billing', label: 'Billing & Finance', icon: <CreditCard size={20} />, allowed: [UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.PATIENT] },
    { id: 'admin', label: 'Admin Panel', icon: <Shield size={20} />, allowed: [UserRole.ADMIN] },
  ];

  const filteredItems = menuItems.filter(item => 
    item.allowed.includes('all') || item.allowed.includes(userRole)
  );

  return (
    <div className="w-64 bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-white flex flex-col h-screen fixed left-0 top-0 z-50 noise-overlay overflow-hidden">
      {/* Brand Area */}
      <div className="p-6 flex items-center gap-3 border-b border-white/10 relative z-10">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-400 to-teal-400 rounded-xl blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
          <div className="relative bg-gradient-to-br from-sky-500 to-teal-500 p-2.5 rounded-xl shadow-lg shadow-sky-500/20">
            <Activity size={22} className="text-white" />
          </div>
        </div>
        <div>
          <h1 className="text-lg font-display font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">MedCore</h1>
          <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Hospital System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto relative z-10">
        {filteredItems.map((item, index) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            style={{ animationDelay: `${index * 0.04}s` }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium group relative overflow-hidden animate-fade-in opacity-0 ${
              activePage === item.id 
                ? 'nav-active text-white shadow-lg shadow-sky-500/5' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className={`transition-all duration-200 ${
              activePage === item.id ? 'text-sky-400 scale-110' : 'group-hover:text-sky-400 group-hover:scale-110'
            }`}>
              {item.icon}
            </span>
            <span className="relative z-10 flex-1 text-left">{item.label}</span>
            {item.id === 'nurse-orders' && pendingOrderCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm">
                {pendingOrderCount}
              </span>
            )}
            {activePage === item.id && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse-glow shadow-lg shadow-sky-400/50"></span>
            )}
          </button>
        ))}
      </nav>

      {/* Sign Out */}
      <div className="p-4 border-t border-white/10 relative z-10">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200 text-sm font-medium group"
        >
          <LogOut size={18} className="group-hover:rotate-[-12deg] transition-transform duration-200" />
          Sign Out
        </button>
      </div>
    </div>
  );
};