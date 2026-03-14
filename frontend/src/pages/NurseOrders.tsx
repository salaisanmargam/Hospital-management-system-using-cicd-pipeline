import React, { useState, useEffect } from 'react';
import { Clipboard, RefreshCw, AlertCircle, Stethoscope, Clock, CheckCircle2, Activity, User as UserIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { User, NurseOrder, NurseOrderType } from '../types';
import { AUTH_STORAGE_KEY, listNurseOrders, updateNurseOrderStatus } from '../services/api';

interface NurseOrdersProps {
  user?: User;
}

const TYPE_COLORS: Record<string, string> = {
  Medication: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  Observation: 'bg-sky-100 text-sky-700 border-sky-200',
  Procedure: 'bg-amber-100 text-amber-700 border-amber-200',
  Diet: 'bg-lime-100 text-lime-700 border-lime-200',
  Mobility: 'bg-violet-100 text-violet-700 border-violet-200',
  Other: 'bg-slate-100 text-slate-600 border-slate-200',
};

const STATUS_ORDER: Record<string, number> = {
  'Pending': 0,
  'In Progress': 1,
  'Completed': 2,
  'Cancelled': 3,
};

export const NurseOrders: React.FC<NurseOrdersProps> = ({ user }) => {
  const [orders, setOrders] = useState<NurseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('active');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      const token = stored ? JSON.parse(stored)?.token : null;
      if (!token) return;
      const data = await listNurseOrders(token);
      // Sort: Urgent first, then by status order, then newest first
      data.sort((a: NurseOrder, b: NurseOrder) => {
        if (a.priority === 'Urgent' && b.priority !== 'Urgent') return -1;
        if (b.priority === 'Urgent' && a.priority !== 'Urgent') return 1;
        const statusDiff = (STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0);
        if (statusDiff !== 0) return statusDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setOrders(data);
      setLastRefreshed(new Date());
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: 'In Progress' | 'Completed') => {
    setUpdatingId(orderId);
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      const token = stored ? JSON.parse(stored)?.token : null;
      if (!token) return;
      await updateNurseOrderStatus(token, orderId, newStatus);
      const now = new Date().toISOString();
      setOrders(prev =>
        prev.map(o => o.id === orderId ? { ...o, status: newStatus as any, updated_at: now } : o)
      );
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter(o => {
    if (filterStatus === 'active') return o.status === 'Pending' || o.status === 'In Progress';
    if (filterStatus === 'completed') return o.status === 'Completed' || o.status === 'Cancelled';
    return true;
  });

  const pendingCount = orders.filter(o => o.status === 'Pending' || o.status === 'In Progress').length;

  const groupedByPatient: Record<string, NurseOrder[]> = {};
  filteredOrders.forEach(o => {
    const key = o.patient_name || o.patient_id;
    if (!groupedByPatient[key]) groupedByPatient[key] = [];
    groupedByPatient[key].push(o);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in-up">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-800 flex items-center gap-3">
            <Clipboard size={24} className="text-teal-500" />
            Doctor's Orders
            {pendingCount > 0 && (
              <span className="bg-amber-500 text-white text-sm font-bold rounded-full px-2.5 py-0.5 shadow-sm shadow-amber-500/30">
                {pendingCount} pending
              </span>
            )}
          </h2>
          <p className="text-slate-500 mt-1 text-sm">
            View and execute care orders issued by doctors.
            {lastRefreshed && (
              <span className="ml-2 text-xs text-slate-400">Last refreshed: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </p>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl hover:bg-sky-50 hover:border-sky-300 hover:text-sky-600 text-sm font-medium transition-all disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
        {(['active', 'completed', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterStatus(f)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${filterStatus === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {f === 'active' ? `Active${pendingCount > 0 ? ` (${pendingCount})` : ''}` : f === 'completed' ? 'Completed' : 'All'}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="glass-card rounded-2xl p-16 text-center text-slate-400">
          <RefreshCw size={28} className="mx-auto mb-3 animate-spin text-slate-300" />
          <p>Loading orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center text-slate-400 animate-fade-in-up">
          <Clipboard size={36} className="mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-lg text-slate-500">
            {filterStatus === 'active' ? 'No pending orders' : 'No orders found'}
          </p>
          <p className="text-sm mt-1">
            {filterStatus === 'active' ? "You're all caught up! No active orders at this time." : 'Try switching to a different filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {Object.entries(groupedByPatient).map(([patientName, patientOrders]) => (
            <div key={patientName} className="glass-card rounded-2xl overflow-hidden">
              {/* Patient group header */}
              <div className="px-5 py-3.5 bg-gradient-to-r from-slate-50 to-sky-50/40 border-b border-slate-200/60 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-100 to-teal-100 text-sky-600 flex items-center justify-center text-sm font-bold">
                  {patientName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{patientName}</p>
                  <p className="text-xs text-slate-400">{patientOrders.length} order{patientOrders.length !== 1 ? 's' : ''}</p>
                </div>
                {patientOrders.some(o => o.priority === 'Urgent' && (o.status === 'Pending' || o.status === 'In Progress')) && (
                  <span className="ml-auto flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                    <AlertCircle size={12} /> Urgent Orders
                  </span>
                )}
              </div>

              {/* Orders for this patient */}
              <div className="divide-y divide-slate-100">
                {patientOrders.map(order => {
                  const orderedAt = new Date(order.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  const updatedAt = new Date(order.updated_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  const isExpanded = expandedId === order.id;

                  return (
                    <div
                      key={order.id}
                      className={`transition-colors ${order.status === 'Completed' ? 'bg-emerald-50/40' : order.status === 'Cancelled' ? 'bg-slate-50/60 opacity-70' : order.priority === 'Urgent' ? 'bg-red-50/50' : 'bg-white'}`}
                    >
                      {/* Main row */}
                      <div className="px-5 py-4 flex items-start gap-4">
                        {/* Type + priority indicator */}
                        <div className="flex flex-col items-center gap-1.5 pt-0.5 flex-shrink-0">
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${TYPE_COLORS[order.order_type] || TYPE_COLORS.Other}`}>
                            {order.order_type}
                          </span>
                          {order.priority === 'Urgent' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200 flex items-center gap-0.5">
                              <AlertCircle size={9} /> URGENT
                            </span>
                          )}
                        </div>

                        {/* Instructions + meta */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 leading-snug">{order.instructions}</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-400">
                            <span className="flex items-center gap-1"><Stethoscope size={11} /> {order.doctor_name}</span>
                            <span className="flex items-center gap-1"><Clock size={11} /> Ordered: {orderedAt}</span>
                            {order.status === 'Completed' && (
                              <span className="flex items-center gap-1 text-emerald-600 font-semibold"><CheckCircle2 size={11} /> Executed: {updatedAt}</span>
                            )}
                            {order.status === 'In Progress' && (
                              <span className="flex items-center gap-1 text-amber-600 font-semibold"><Activity size={11} /> Started: {updatedAt}</span>
                            )}
                          </div>
                        </div>

                        {/* Status badge + actions */}
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${order.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : order.status === 'In Progress' ? 'bg-amber-100 text-amber-700' : order.status === 'Cancelled' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                            {order.status}
                          </span>
                          {order.status === 'Pending' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'In Progress')}
                              disabled={updatingId === order.id}
                              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm shadow-amber-500/20"
                            >
                              {updatingId === order.id ? <RefreshCw size={13} className="animate-spin" /> : <Activity size={13} />}
                              Start
                            </button>
                          )}
                          {order.status === 'In Progress' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'Completed')}
                              disabled={updatingId === order.id}
                              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm shadow-emerald-500/20"
                            >
                              {updatingId === order.id ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                              Done
                            </button>
                          )}
                          {order.status === 'Completed' && (
                            <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                              <CheckCircle2 size={14} /> Executed
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
