import React from 'react';
import { Download, CreditCard, IndianRupee, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { User, UserRole } from '../types';
import { useData } from '../contexts/DataContext';

interface BillingProps {
  user?: User | null;
}

export const Billing: React.FC<BillingProps> = ({ user }) => {
  const { bills } = useData();
  const isPatient = user?.role === UserRole.PATIENT;

  const displayedBills = isPatient
    ? bills.filter(bill => bill.patientName === user?.name)
    : bills;

  const pendingAmount = displayedBills
    .filter(b => b.status === 'Pending')
    .reduce((sum, b) => sum + b.amount, 0);

  const paidAmount = displayedBills
    .filter(b => b.status === 'Paid')
    .reduce((sum, b) => sum + b.amount, 0);

  const overdueAmount = displayedBills
    .filter(b => b.status === 'Overdue')
    .reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center animate-fade-in-up">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-800">
            {isPatient ? 'My Billing History' : 'Billing & Invoices'}
          </h2>
          <p className="text-slate-500 mt-1">
            {isPatient ? 'View your invoices and payment status.' : 'Track payments and generate patient invoices.'}
          </p>
        </div>
        {!isPatient && (
          <button className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-5 py-2.5 rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg shadow-indigo-500/20 font-semibold text-sm hover:scale-[1.02] active:scale-[0.98]">
            <CreditCard size={18} />
            <span>Create New Invoice</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
        <div className="glass-card p-6 rounded-2xl card-hover relative overflow-hidden animate-fade-in-up opacity-0" style={{ animationDelay: '0.05s', animationFillMode: 'forwards' }}>
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-2xl"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">Pending Payments</p>
              <h3 className="text-2xl font-display font-bold text-slate-900 mt-2">₹{pendingAmount.toFixed(2)}</h3>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20">
              <Clock size={20} />
            </div>
          </div>
        </div>
        <div className="glass-card p-6 rounded-2xl card-hover relative overflow-hidden animate-fade-in-up opacity-0" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-l-2xl"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">
                {isPatient ? 'Total Paid' : 'Collected (Total)'}
              </p>
              <h3 className="text-2xl font-display font-bold text-slate-900 mt-2">₹{paidAmount.toFixed(2)}</h3>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
              <TrendingUp size={20} />
            </div>
          </div>
        </div>
        <div className="glass-card p-6 rounded-2xl card-hover relative overflow-hidden animate-fade-in-up opacity-0" style={{ animationDelay: '0.15s', animationFillMode: 'forwards' }}>
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500 rounded-l-2xl"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">Overdue</p>
              <h3 className="text-2xl font-display font-bold text-red-600 mt-2">₹{overdueAmount.toFixed(2)}</h3>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/20">
              <AlertCircle size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden animate-fade-in-up opacity-0" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
        {displayedBills.length > 0 ? (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 text-slate-400 text-xs uppercase font-semibold border-b border-slate-200/50 tracking-wider">
                <th className="px-6 py-4">Invoice ID</th>
                <th className="px-6 py-4">Patient Name</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayedBills.map((bill) => (
                <tr key={bill.id} className="hover:bg-sky-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-slate-500">#{bill.id.toUpperCase()}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{bill.patientName}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{bill.date}</td>
                  <td className="px-6 py-4 text-sm font-display font-bold text-slate-900">₹{bill.amount.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize
                      ${bill.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                        bill.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'}`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-sky-600 hover:text-sky-700 font-medium text-sm flex items-center justify-end gap-1.5 ml-auto hover:bg-sky-50 px-3 py-1.5 rounded-lg transition-all">
                      <Download size={16} />
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-slate-400">
            <IndianRupee size={32} className="mx-auto mb-3 text-slate-300" />
            <p>No billing records found.</p>
          </div>
        )}
      </div>
    </div>
  );
};
