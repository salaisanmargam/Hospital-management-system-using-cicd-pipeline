import React, { useMemo, useState } from 'react';
import {
  Download,
  CreditCard,
  Search,
  IndianRupee,
  TrendingUp,
  AlertCircle,
  Clock,
  X,
  Loader2,
} from 'lucide-react';
import { BillDetailResponse, BillingContributionResponse, User, UserRole } from '../types';
import { useData } from '../contexts/DataContext';
import {
  AUTH_STORAGE_KEY,
  createBillPayment,
  downloadBillPdf,
  generateFinalBill,
  getBillDetails,
  getBillingContributions,
} from '../services/api';

interface BillingProps {
  user?: User | null;
}

const getStatusRank = (status: string) => {
  if (status === 'Overdue') return 0;
  if (status === 'Pending') return 1;
  return 2;
};

const fmtCurrency = (value: number) => `₹${value.toFixed(2)}`;

const getAuthToken = (): string | null => {
  const auth = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!auth) return null;
  try {
    const parsed = JSON.parse(auth);
    return parsed?.token || null;
  } catch {
    return null;
  }
};

export const Billing: React.FC<BillingProps> = ({ user }) => {
  const { bills, refreshAllData } = useData();
  const isPatient = user?.role === UserRole.PATIENT;
  const canRecordPayment = user?.role === UserRole.RECEPTIONIST || user?.role === UserRole.ADMIN || isPatient;
  const canGenerateBill = user?.role === UserRole.RECEPTIONIST || user?.role === UserRole.ADMIN;

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedPatientName, setSelectedPatientName] = useState<string>('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [detail, setDetail] = useState<BillDetailResponse | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [pageError, setPageError] = useState<string>('');
  const [contributions, setContributions] = useState<BillingContributionResponse | null>(null);
  const [isGeneratingBill, setIsGeneratingBill] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const displayedBills = useMemo(() => {
    return [...bills].sort((a, b) => {
      const statusRank = getStatusRank(a.status) - getStatusRank(b.status);
      if (statusRank !== 0) return statusRank;

      const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      if (dueA !== dueB) return dueA - dueB;

      return (b.balanceAmount || 0) - (a.balanceAmount || 0);
    });
  }, [bills]);

  const contributionStatus = useMemo(() => {
    const requiredRoles = ['Doctor', 'Pharmacist', 'Lab Technician', 'Nurse', 'Ward'];
    const presentRoles = new Set((contributions?.items || []).map((item) => item.source_role));

    return requiredRoles.map((role) => ({
      role,
      present: presentRoles.has(role),
    }));
  }, [contributions]);

  const filteredBills = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return displayedBills;

    return displayedBills.filter((bill) => {
      const invoiceId = bill.id?.toLowerCase() || '';
      const patientName = bill.patientName?.toLowerCase() || '';
      const status = bill.status?.toLowerCase() || '';
      const billDate = bill.date?.toLowerCase() || '';
      const dueDate = bill.dueDate?.toLowerCase() || '';

      return (
        invoiceId.includes(query) ||
        patientName.includes(query) ||
        status.includes(query) ||
        billDate.includes(query) ||
        dueDate.includes(query)
      );
    });
  }, [displayedBills, searchQuery]);

  const pendingAmount = displayedBills
    .filter((b) => b.status === 'Pending')
    .reduce((sum, b) => sum + (b.balanceAmount ?? b.amount), 0);

  const paidAmount = displayedBills
    .reduce((sum, b) => sum + (b.paidAmount || 0), 0);

  const overdueAmount = displayedBills
    .filter((b) => b.status === 'Overdue')
    .reduce((sum, b) => sum + (b.balanceAmount ?? b.amount), 0);

  const openDetails = async (patientId: string, patientName: string) => {
    const token = getAuthToken();
    if (!token) {
      setDetailError('Authentication missing. Please login again.');
      return;
    }

    setIsDrawerOpen(true);
    setSelectedPatientId(patientId);
    setSelectedPatientName(patientName);
    setDetail(null);
    setDetailError('');
    setPaymentAmount('');
    setPaymentMethod('Cash');
    setPaymentNotes('');
    setIsLoadingDetail(true);
    setContributions(null);

    try {
      const detailRes = await getBillDetails(token, patientId);
      setDetail(detailRes);

      if (canGenerateBill) {
        try {
          const contributionRes = await getBillingContributions(token, patientId);
          setContributions(contributionRes);
        } catch {
          // Keep details visible even if contribution sync fails.
          setContributions(null);
        }
      }
    } catch (err: any) {
      setDetailError(err?.message || 'Failed to load billing details.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleGenerateFinalBill = async () => {
    const token = getAuthToken();
    if (!token || !selectedPatientId) return;

    setIsGeneratingBill(true);
    setDetailError('');
    try {
      await generateFinalBill(token, selectedPatientId);
      const [updatedDetail, updatedContrib] = await Promise.all([
        getBillDetails(token, selectedPatientId),
        getBillingContributions(token, selectedPatientId),
      ]);
      setDetail(updatedDetail);
      setContributions(updatedContrib);
      await refreshAllData(token);
    } catch (err: any) {
      setDetailError(err?.message || 'Failed to generate final bill.');
    } finally {
      setIsGeneratingBill(false);
    }
  };

  const openBillingConsole = async () => {
    if (displayedBills.length === 0) {
      setPageError('No billing records available to open in console.');
      return;
    }

    const topBill = displayedBills[0];
    await openDetails(topBill.patientId, topBill.patientName);
  };

  const submitPayment = async () => {
    const token = getAuthToken();
    if (!token || !selectedPatientId) return;

    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      setDetailError('Enter a valid payment amount.');
      return;
    }

    setDetailError('');
    setIsSubmittingPayment(true);
    try {
      await createBillPayment(token, selectedPatientId, {
        amount,
        method: paymentMethod,
        notes: paymentNotes || undefined,
      });

      const updated = await getBillDetails(token, selectedPatientId);
      setDetail(updated);
      await refreshAllData(token);
      setPaymentAmount('');
      setPaymentNotes('');
    } catch (err: any) {
      setDetailError(err?.message || 'Failed to record payment.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleDownloadPdf = async (patientId: string, patientName: string) => {
    const token = getAuthToken();
    if (!token) {
      const msg = 'Authentication missing. Please login again.';
      setDetailError(msg);
      setPageError(msg);
      return;
    }

    try {
      setPageError('');
      const { blob, filename } = await downloadBillPdf(token, patientId);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      const safeName = (patientName || 'patient').replace(/[^a-zA-Z0-9_-]/g, '_') || 'patient';
      link.download = filename || `invoice_${safeName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Revoke URL after a short delay to avoid race conditions in some browsers.
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
    } catch (err: any) {
      const msg = err?.message || 'Failed to download PDF.';
      setDetailError(msg);
      setPageError(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center animate-fade-in-up">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-800">
            {isPatient ? 'My Billing History' : 'Billing & Invoices'}
          </h2>
          <p className="text-slate-500 mt-1">
            {isPatient ? 'View your invoices, breakdown, and payments.' : 'Track complete patient billing and payments.'}
          </p>
        </div>
        {!isPatient && (
          <button
            onClick={openBillingConsole}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-5 py-2.5 rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg shadow-indigo-500/20 font-semibold text-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            <CreditCard size={18} />
            <span>Billing Console</span>
          </button>
        )}
      </div>

      {pageError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      )}

      <div className="glass-card rounded-2xl p-4 animate-fade-in-up opacity-0" style={{ animationDelay: '0.04s', animationFillMode: 'forwards' }}>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name, invoice ID, date, or status"
              className="w-full border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
            />
          </div>
          {searchQuery.trim() && (
            <button
              onClick={() => setSearchQuery('')}
              className="border border-slate-300 text-slate-600 rounded-xl px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Clear
            </button>
          )}
        </div>

        {searchQuery.trim() && (
          <div className="mt-3 text-sm text-slate-600">
            Showing {filteredBills.length} result{filteredBills.length === 1 ? '' : 's'} for "{searchQuery.trim()}".
          </div>
        )}

        {searchQuery.trim() && filteredBills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {filteredBills.slice(0, 6).map((bill) => (
              <button
                key={`search-${bill.id}`}
                onClick={() => openDetails(bill.patientId, bill.patientName)}
                className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100"
              >
                <span className="font-mono">#{bill.id.toUpperCase()}</span>
                <span>{bill.patientName}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
        <div className="glass-card p-6 rounded-2xl card-hover relative overflow-hidden animate-fade-in-up opacity-0" style={{ animationDelay: '0.05s', animationFillMode: 'forwards' }}>
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-2xl"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">Pending Payments</p>
              <h3 className="text-2xl font-display font-bold text-slate-900 mt-2">{fmtCurrency(pendingAmount)}</h3>
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
              <h3 className="text-2xl font-display font-bold text-slate-900 mt-2">{fmtCurrency(paidAmount)}</h3>
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
              <h3 className="text-2xl font-display font-bold text-red-600 mt-2">{fmtCurrency(overdueAmount)}</h3>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/20">
              <AlertCircle size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden animate-fade-in-up opacity-0" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
        {filteredBills.length > 0 ? (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] table-fixed text-left">
            <thead className="whitespace-nowrap">
              <tr className="bg-slate-50/80 text-slate-400 text-xs uppercase font-semibold border-b border-slate-200/50 tracking-wider">
                <th className="px-6 py-4 w-[140px]">Invoice ID</th>
                <th className="px-6 py-4 w-[220px]">Patient Name</th>
                <th className="px-6 py-4 w-[140px]">Date</th>
                <th className="px-6 py-4 w-[140px]">Due</th>
                <th className="px-6 py-4 w-[130px] text-right">Total</th>
                <th className="px-6 py-4 w-[120px] text-right">Paid</th>
                <th className="px-6 py-4 w-[130px] text-right">Balance</th>
                <th className="px-6 py-4 w-[130px] text-center">Status</th>
                <th className="px-6 py-4 w-[130px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 whitespace-nowrap">
              {filteredBills.map((bill) => (
                <tr key={bill.id} className="hover:bg-sky-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-slate-500">#{bill.id.toUpperCase()}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900 truncate">
                    <button
                      onClick={() => openDetails(bill.patientId, bill.patientName)}
                      className="text-left hover:text-sky-600 transition-colors truncate max-w-[180px]"
                    >
                      {bill.patientName}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{bill.date}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{bill.dueDate || '-'}</td>
                  <td className="px-6 py-4 text-sm font-display font-bold text-slate-900 text-right">{fmtCurrency(bill.amount)}</td>
                  <td className="px-6 py-4 text-sm text-emerald-700 text-right">{fmtCurrency(bill.paidAmount || 0)}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900 text-right">{fmtCurrency(bill.balanceAmount || 0)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize
                      ${bill.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                        bill.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'}`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDownloadPdf(bill.patientId, bill.patientName)}
                      className="text-sky-600 hover:text-sky-700 font-medium text-sm flex items-center justify-end gap-1.5 ml-auto hover:bg-sky-50 px-3 py-1.5 rounded-lg transition-all"
                    >
                      <Download size={16} />
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">
            <IndianRupee size={32} className="mx-auto mb-3 text-slate-300" />
            <p>{searchQuery.trim() ? 'No billing records match your search.' : 'No billing records found.'}</p>
          </div>
        )}
      </div>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button className="absolute inset-0 bg-slate-900/30" onClick={() => setIsDrawerOpen(false)} aria-label="Close drawer" />
          <div className="relative w-full max-w-2xl h-full bg-white shadow-2xl border-l border-slate-200 overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-display font-bold text-slate-900">Billing Details</h3>
                <p className="text-sm text-slate-500 mt-1">{selectedPatientName}</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedPatientId && (
                  <button
                    onClick={() => handleDownloadPdf(selectedPatientId, selectedPatientName)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Download size={15} /> PDF
                  </button>
                )}
                <button onClick={() => setIsDrawerOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                  <X size={18} />
                </button>
              </div>
            </div>

            {isLoadingDetail && (
              <div className="py-16 text-center text-slate-500">
                <Loader2 size={22} className="mx-auto mb-3 animate-spin" />
                Loading billing details...
              </div>
            )}

            {!isLoadingDetail && detailError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{detailError}</div>
            )}

            {!isLoadingDetail && detail && (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-slate-50 p-3"><span className="text-slate-500">Appointment</span><p className="font-semibold">{fmtCurrency(detail.summary.appointmentAmount || 0)}</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><span className="text-slate-500">Nurse Medication</span><p className="font-semibold">{fmtCurrency(detail.summary.nurseMedicationAmount || 0)}</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><span className="text-slate-500">Laboratory</span><p className="font-semibold">{fmtCurrency(detail.summary.labAmount || 0)}</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><span className="text-slate-500">Bed Charges</span><p className="font-semibold">{fmtCurrency(detail.summary.bedAmount || 0)}</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><span className="text-slate-500">Pharmacy</span><p className="font-semibold">{fmtCurrency(detail.summary.medicineAmount || 0)}</p></div>
                </div>

                {canGenerateBill && (
                  <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-slate-900">Department Contributions</h4>
                      <button
                        onClick={handleGenerateFinalBill}
                        disabled={isGeneratingBill}
                        className="bg-indigo-600 text-white rounded-lg px-3 py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isGeneratingBill ? 'Generating...' : 'Generate Final Bill'}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {contributionStatus.map((entry) => (
                        <div key={entry.role} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                          <span className="text-slate-700">{entry.role}</span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                              entry.present ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {entry.present ? 'Received' : 'Missing'}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {(!contributions || contributions.items.length === 0) && <p className="text-sm text-slate-500">No contribution data available yet.</p>}
                      {contributions?.items.map((item) => (
                        <div key={item.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm flex justify-between gap-2">
                          <span className="truncate">{item.source_role}: {item.description}</span>
                          <span className="font-semibold">{fmtCurrency(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <p>Total: <span className="font-semibold">{fmtCurrency(detail.summary.amount)}</span></p>
                    <p>Paid: <span className="font-semibold text-emerald-700">{fmtCurrency(detail.summary.paidAmount || 0)}</span></p>
                    <p>Balance: <span className="font-semibold">{fmtCurrency(detail.summary.balanceAmount || 0)}</span></p>
                    <p>Status: <span className="font-semibold">{detail.summary.status}</span></p>
                  </div>
                </div>

                {canRecordPayment && (
                  <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                    <h4 className="font-semibold text-slate-900">Record Payment</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="Amount"
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      />
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      >
                        <option>Cash</option>
                        <option>Card</option>
                        <option>UPI</option>
                        <option>NetBanking</option>
                        <option>Insurance</option>
                        <option>Other</option>
                      </select>
                      <button
                        onClick={submitPayment}
                        disabled={isSubmittingPayment}
                        className="bg-sky-600 text-white rounded-lg px-3 py-2 text-sm font-semibold hover:bg-sky-700 disabled:opacity-60"
                      >
                        {isSubmittingPayment ? 'Saving...' : 'Add Payment'}
                      </button>
                    </div>
                    <textarea
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="Notes (optional)"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      rows={2}
                    />
                  </div>
                )}

                <section>
                  <h4 className="font-semibold text-slate-900 mb-2">Recent Payments</h4>
                  <div className="space-y-2">
                    {detail.payments.length === 0 && <p className="text-sm text-slate-500">No payments recorded yet.</p>}
                    {detail.payments.map((payment) => (
                      <div key={payment.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm flex justify-between">
                        <span>{payment.paid_at?.slice(0, 10)} • {payment.method}</span>
                        <span className="font-semibold text-emerald-700">{fmtCurrency(payment.amount)}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="font-semibold text-slate-900 mb-2">Appointment Charges</h4>
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {detail.appointments.length === 0 && <p className="text-sm text-slate-500">No appointment charges.</p>}
                    {detail.appointments.map((appt) => (
                      <div key={appt.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm flex justify-between">
                        <span>{appt.appointment_date} • {appt.doctor_name || 'Doctor'} • {appt.type}</span>
                        <span className="font-semibold">{fmtCurrency(appt.amount)}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="font-semibold text-slate-900 mb-2">Nurse Medication Events</h4>
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {detail.nurse_medications.length === 0 && <p className="text-sm text-slate-500">No nurse medication events.</p>}
                    {detail.nurse_medications.map((item) => (
                      <div key={item.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm flex justify-between">
                        <span>{item.administered_at?.slice(0, 10)} • {item.medicine_name || 'Medicine'} × {item.quantity}</span>
                        <span className="font-semibold">{fmtCurrency(item.line_total)}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="font-semibold text-slate-900 mb-2">Bed Stay Events</h4>
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {detail.bed_stays.length === 0 && <p className="text-sm text-slate-500">No bed stay events.</p>}
                    {detail.bed_stays.map((stay) => (
                      <div key={stay.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm flex justify-between">
                        <span>{stay.ward || 'Ward'}-{stay.bed_number || '-'} • {stay.days} day(s)</span>
                        <span className="font-semibold">{fmtCurrency(stay.line_total)}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="font-semibold text-slate-900 mb-2">Pharmacy Items</h4>
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {detail.medicine_items.length === 0 && <p className="text-sm text-slate-500">No pharmacy charges.</p>}
                    {detail.medicine_items.map((item) => (
                      <div key={item.item_id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm flex justify-between">
                        <span>{item.medicine_name} × {item.quantity}</span>
                        <span className="font-semibold">{fmtCurrency(item.line_total)}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="font-semibold text-slate-900 mb-2">Laboratory Items</h4>
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {detail.lab_tests.length === 0 && <p className="text-sm text-slate-500">No laboratory charges.</p>}
                    {detail.lab_tests.map((test) => (
                      <div key={test.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm flex justify-between">
                        <span>{test.test_date} • {test.test_name} ({test.department})</span>
                        <span className="font-semibold">{fmtCurrency(test.line_total)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
