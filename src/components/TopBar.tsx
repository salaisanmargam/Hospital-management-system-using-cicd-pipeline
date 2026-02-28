import React from 'react';
import { Bell, Search, ChevronDown } from 'lucide-react';
import { User, UserRole } from '../types';

interface TopBarProps {
  user: User;
}

export const TopBar: React.FC<TopBarProps> = ({ user }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex items-center w-96 bg-slate-100 rounded-lg px-4 py-2">
        <Search size={18} className="text-slate-400 mr-3" />
        <input 
          type="text" 
          placeholder="Search patients, doctors, records..." 
          className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder-slate-400"
        />
      </div>

      <div className="flex items-center gap-6">
        <button className="relative p-2 text-slate-400 hover:text-slate-600 transition">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>

        <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
          <div className="text-right hidden md:block">
            <p className="text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-500">{user.role}</p>
          </div>
          <img 
            src={user.avatarUrl} 
            alt={user.name} 
            className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover"
          />
          <ChevronDown size={16} className="text-slate-400 cursor-pointer" />
        </div>
      </div>
    </header>
  );
};