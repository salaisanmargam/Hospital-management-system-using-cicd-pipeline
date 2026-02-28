import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  Settings, 
  Activity, 
  LogOut,
  CreditCard,
  Stethoscope,
  FlaskConical,
  Pill,
  Shield,
  BedDouble
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  userRole: UserRole;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, userRole, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, allowed: ['all'] },
    { id: 'patients', label: 'Patients', icon: <Users size={20} />, allowed: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.RECEPTIONIST] },
    { id: 'ward', label: 'Ward & Beds', icon: <BedDouble size={20} />, allowed: [UserRole.ADMIN, UserRole.NURSE, UserRole.RECEPTIONIST] },
    { id: 'staff', label: 'Staff', icon: <Stethoscope size={20} />, allowed: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.RECEPTIONIST] },
    { id: 'appointments', label: 'Appointments', icon: <Calendar size={20} />, allowed: ['all'] },
    { id: 'laboratory', label: 'Laboratory', icon: <FlaskConical size={20} />, allowed: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.LAB_TECHNICIAN] },
    { id: 'pharmacy', label: 'Pharmacy', icon: <Pill size={20} />, allowed: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.PHARMACIST] },
    { id: 'records', label: 'Medical Records', icon: <FileText size={20} />, allowed: [UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT] },
    { id: 'billing', label: 'Billing & Finance', icon: <CreditCard size={20} />, allowed: [UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.PATIENT] },
    { id: 'admin', label: 'Admin Panel', icon: <Shield size={20} />, allowed: [UserRole.ADMIN] },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} />, allowed: ['all'] },
  ];

  const filteredItems = menuItems.filter(item => 
    item.allowed.includes('all') || item.allowed.includes(userRole)
  );

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 border-r border-slate-800 z-50">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="bg-teal-500 p-2 rounded-lg">
          <Activity size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">MedCore</h1>
          <p className="text-xs text-slate-400">Hospital System</p>
        </div>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
              activePage === item.id 
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/20' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-slate-800 rounded-lg transition-colors text-sm font-medium"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </div>
  );
};