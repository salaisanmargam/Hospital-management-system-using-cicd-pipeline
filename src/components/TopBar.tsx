import React from 'react';
import { Bell, Search, ChevronDown, Sparkles } from 'lucide-react';
import { User, UserRole } from '../types';

interface TopBarProps {
  user: User;
}

export const TopBar: React.FC<TopBarProps> = ({ user }) => {
  return (
    <header className="h-16 glass border-b border-slate-200/50 flex items-center justify-between px-8 sticky top-0 z-10">
      {/* Search Bar */}
      <div className="flex items-center w-96 bg-slate-100/80 rounded-xl px-4 py-2 border border-slate-200/50 focus-within:border-sky-300 focus-within:ring-2 focus-within:ring-sky-100 focus-within:bg-white transition-all duration-300 group">
        <Search size={18} className="text-slate-400 mr-3 group-focus-within:text-sky-500 transition-colors" />
        <input
          type="text"
          placeholder="Search patients, doctors, records..."
          className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder-slate-400"
        />
      </div>

      <div className="flex items-center gap-4">
        {/* Greeting chip */}
        <div className="hidden lg:flex items-center gap-1.5 bg-gradient-to-r from-sky-50 to-teal-50 px-3 py-1.5 rounded-full border border-sky-100">
          <Sparkles size={14} className="text-sky-500" />
          <span className="text-xs font-medium text-slate-600">Welcome back!</span>
        </div>

        {/* Notifications */}
        <button className="relative p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-200 group">
          <Bell size={20} className="group-hover:rotate-12 transition-transform duration-200" />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-full border-2 border-white animate-bounce-subtle"></span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-4 border-l border-slate-200/70">
          <div className="text-right hidden md:block">
            <p className="text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="text-[11px] text-slate-500 font-medium">{user.role}</p>
          </div>
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-400 to-teal-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="relative w-10 h-10 rounded-full border-2 border-white shadow-md object-cover group-hover:scale-105 transition-transform duration-200"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white"></span>
          </div>
          <ChevronDown size={16} className="text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" />
        </div>
      </div>
    </header>
  );
};