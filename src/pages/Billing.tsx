import React from 'react';
import { Download, CreditCard, IndianRupee } from 'lucide-react';
import { User, UserRole } from '../types';
import { useData } from '../contexts/DataContext';

interface BillingProps {
  user?: User | null;
}

export const Billing: React.FC<BillingProps> = ({ user }) => {
  const { bills } = useData();
  const isPatient = user?.role === UserRole.PATIENT;

  // Filter bills: Patients see only their own, others (Admin/Receptionist) see all
  const displayedBills = isPatient
    ? bills.filter(bill => bill.patientName === user?.name)
    : bills;

  // Calculate stats based on the filtered view
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {isPatient ? 'My Billing History' : 'Billing & Invoices'}
          </h2>
          <p className="text-slate-500">
            {isPatient ? 'View your invoices and payment status.' : 'Track payments and generate patient invoices.'}
          </p>
        </div>
        {!isPatient && (
          <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm">
            <CreditCard size={18} />
            <span>Create New Invoice</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm font-medium">Pending Payments</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-2">₹{pendingAmount.toFixed(2)}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm font-medium">
              {isPatient ? 'Total Paid' : 'Collected (Total)'}
            </p>
            <h3 className="text-2xl font-bold text-slate-900 mt-2">₹{paidAmount.toFixed(2)}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm font-medium">Overdue</p>
            <h3 className="text-2xl font-bold text-red-600 mt-2">₹{overdueAmount.toFixed(2)}</h3>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {displayedBills.length > 0 ? (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                <th className="px-6 py-4">Invoice ID</th>
                <th className="px-6 py-4">Patient Name</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedBills.map((bill) => (
                <tr key={bill.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 text-sm font-mono text-slate-500">#{bill.id.toUpperCase()}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{bill.patientName}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{bill.date}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">₹{bill.amount.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                      ${bill.status === 'Paid' ? 'bg-green-100 text-green-800' : 
                        bill.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'}`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-teal-600 hover:text-teal-800 font-medium text-sm flex items-center justify-end gap-1 ml-auto">
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
            <p>No billing records found.</p>
          </div>
        )}
      </div>
    </div>
  );
};
