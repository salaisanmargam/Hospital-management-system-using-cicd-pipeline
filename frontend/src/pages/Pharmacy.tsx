import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, AlertTriangle, Package, IndianRupee, FileText, Pill, X, Check, User as UserIcon, Clock } from 'lucide-react';
import { User, UserRole } from '../types';
import { useData } from '../contexts/DataContext';

interface PharmacyProps {
    user?: User;
}

export const Pharmacy: React.FC<PharmacyProps> = ({ user }) => {
    const { medicines, prescriptions, patients, appointments, addPrescription, updatePrescriptionStatus, restockMedicine } = useData();

    const [showPrescribeModal, setShowPrescribeModal] = useState(false);
    const [showRestockModal, setShowRestockModal] = useState(false);
    const [restockTarget, setRestockTarget] = useState<{ id: string; name: string; unit: string; stock: number; minRequiredStock: number } | null>(null);
    const [restockQty, setRestockQty] = useState('50');
    const [activeTab, setActiveTab] = useState<'Inventory' | 'Prescriptions History'>('Inventory');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedHistoryPatientId, setSelectedHistoryPatientId] = useState<string | null>(null);
    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [selectedMeds, setSelectedMeds] = useState<string[]>([]);
    const [dosageMap, setDosageMap] = useState<Record<string, string>>({});

    const isDoctor = user?.role === UserRole.DOCTOR;

    // Filter logic
    const myPrescriptions = useMemo(() => {
        if (isDoctor) {
            return prescriptions.filter(p => p.doctorName === user?.name);
        }
        return prescriptions;
    }, [user, isDoctor, prescriptions]);

    const myPatients = useMemo(() => {
        if (isDoctor) {
            return patients.filter(patient =>
                appointments.some(appt =>
                    appt.patientName === patient.name && appt.doctorName === user?.name
                )
            );
        }
        return patients;
    }, [user, isDoctor, patients, appointments]);

    const historyPatients = useMemo(() => {
        const map = new Map<string, { id: string; name: string; count: number }>();
        prescriptions.forEach((rx) => {
            const key = rx.patientId || rx.patientName;
            const existing = map.get(key);
            if (existing) {
                existing.count += 1;
            } else {
                map.set(key, {
                    id: rx.patientId || key,
                    name: rx.patientName,
                    count: 1,
                });
            }
        });

        return Array.from(map.values())
            .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [prescriptions, searchTerm]);

    const selectedPatientHistory = useMemo(() => {
        if (!selectedHistoryPatientId) return [];
        return prescriptions
            .filter((rx) => (rx.patientId || rx.patientName) === selectedHistoryPatientId)
            .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
    }, [prescriptions, selectedHistoryPatientId]);

    const toggleMedSelection = (medName: string) => {
        if (selectedMeds.includes(medName)) {
            setSelectedMeds(selectedMeds.filter(m => m !== medName));
            const newDosage = { ...dosageMap };
            delete newDosage[medName];
            setDosageMap(newDosage);
        } else {
            setSelectedMeds([...selectedMeds, medName]);
        }
    };

    const handleDosageChange = (medName: string, dosage: string) => {
        setDosageMap(prev => ({ ...prev, [medName]: dosage }));
    };

    const handleCreatePrescription = () => {
        const patient = patients.find(p => p.id === selectedPatientId);
        if (!patient || selectedMeds.length === 0) return;

        const newPrescription = {
            id: `pr${Date.now()}`,
            patientId: patient.id,
            patientName: patient.name,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            medicines: selectedMeds.map(name => ({
                name,
                dosage: dosageMap[name] || 'As directed',
                quantity: 1
            })),
            status: 'Pending' as const,
            doctorName: user?.name || 'Unknown Doctor',
            priority: 'Normal' as const
        };

        addPrescription(newPrescription);
        setShowPrescribeModal(false);
        setSelectedMeds([]);
        setSelectedPatientId('');
        setDosageMap({});
    };

    const openRestockModal = (medicine: { id: string; name: string; unit: string; stock: number; minRequiredStock?: number }) => {
        setRestockTarget({
            id: medicine.id,
            name: medicine.name,
            unit: medicine.unit,
            stock: medicine.stock,
            minRequiredStock: medicine.minRequiredStock ?? 20,
        });
        setRestockQty('50');
        setShowRestockModal(true);
    };

    const closeRestockModal = () => {
        setShowRestockModal(false);
        setRestockTarget(null);
        setRestockQty('50');
    };

    const handleConfirmRestock = () => {
        if (!restockTarget) return;
        const quantity = Number(restockQty);
        if (!Number.isFinite(quantity) || quantity <= 0) {
            return;
        }
        restockMedicine(restockTarget.id, Math.floor(quantity));
        closeRestockModal();
    };

    // DOCTOR VIEW
    if (isDoctor) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-display font-bold text-slate-800">Prescription Management</h2>
                        <p className="text-slate-500">History of medicines prescribed to your patients.</p>
                    </div>
                    <button
                        onClick={() => setShowPrescribeModal(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-teal-500 text-white px-5 py-2.5 rounded-xl hover:from-sky-600 hover:to-teal-600 transition-all shadow-lg shadow-sky-500/20 font-semibold text-sm"
                    >
                        <Plus size={18} />
                        <span>New Prescription</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-card p-6 rounded-2xl card-hover">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Prescriptions Today</p>
                                <h3 className="text-2xl font-display font-bold text-slate-900 mt-2">
                                    {myPrescriptions.filter(p => p.date === new Date().toISOString().split('T')[0]).length}
                                </h3>
                            </div>
                            <div className="p-3 rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 text-white shadow-lg shadow-sky-500/20">
                                <FileText size={24} />
                            </div>
                        </div>
                    </div>
                    <div className="glass-card p-6 rounded-2xl card-hover">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Pending Dispense</p>
                                <h3 className="text-2xl font-display font-bold text-amber-600 mt-2">{myPrescriptions.filter(p => p.status === 'Pending').length}</h3>
                            </div>
                            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20">
                                <Clock size={24} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-sky-50/30 flex items-center justify-between">
                        <h3 className="font-display font-bold text-slate-700">Prescription History</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/80 text-slate-400 text-xs uppercase font-semibold border-b border-slate-200/50 tracking-wider">
                                <tr className="text-left">
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Patient</th>
                                    <th className="px-6 py-4">Medicines Prescribed</th>
                                    <th className="px-6 py-4">Total Cost</th>
                                    <th className="px-6 py-4">Pharmacy Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {myPrescriptions.length > 0 ? myPrescriptions.map(p => (
                                    <tr key={p.id} className="hover:bg-sky-50/50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-slate-600">{p.date}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                    <UserIcon size={14} />
                                                </div>
                                                <span className="text-sm font-medium text-slate-900">{p.patientName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                {p.medicines.map((m, idx) => (
                                                    <div key={idx} className="text-sm flex items-center gap-2">
                                                        <Pill size={12} className="text-teal-500" />
                                                        <span className="text-slate-900 font-medium">{m.name}</span>
                                                        <span className="text-slate-500 text-xs">({m.dosage})</span>
                                                        <span className="text-slate-400 text-xs">x{m.quantity}</span>
                                                        <span className="text-slate-500 text-xs">₹{(m.lineTotal || ((m.unitPrice || 0) * m.quantity)).toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-semibold text-slate-700">₹{(p.totalCost || 0).toFixed(2)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${p.status === 'Dispensed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                {p.status}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-slate-400">No prescriptions found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Create Prescription Modal */}
                {showPrescribeModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh] border border-slate-200/50">
                            <div className="p-5 border-b border-slate-200/50 flex justify-between items-center bg-gradient-to-r from-slate-50 to-sky-50/30">
                                <h3 className="font-display font-bold text-slate-800 flex items-center gap-2">
                                    <Pill size={20} className="text-teal-500" />
                                    Send to Pharmacy
                                </h3>
                                <button onClick={() => setShowPrescribeModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1 space-y-6">
                                {/* Patient Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Select Patient</label>
                                    <select
                                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                                        value={selectedPatientId}
                                        onChange={(e) => setSelectedPatientId(e.target.value)}
                                    >
                                        <option value="">-- Choose a Patient --</option>
                                        {myPatients.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Medicine Selection (From Available Inventory) */}
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <label className="block text-sm font-medium text-slate-700">Available Medicines (Select to Add)</label>
                                        <span className="text-xs text-slate-500">Checking Pharmacy Inventory...</span>
                                    </div>
                                    <div className="border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 sticky top-0">
                                                <tr className="text-slate-500 text-xs uppercase">
                                                    <th className="px-4 py-2">Select</th>
                                                    <th className="px-4 py-2">Medicine</th>
                                                    <th className="px-4 py-2">Availability</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {medicines.map(med => (
                                                    <tr key={med.id} className={`hover:bg-slate-50 transition ${selectedMeds.includes(med.name) ? 'bg-teal-50' : ''}`}>
                                                        <td className="px-4 py-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedMeds.includes(med.name)}
                                                                onChange={() => toggleMedSelection(med.name)}
                                                                disabled={med.stock === 0}
                                                                className="rounded text-teal-600 focus:ring-teal-500"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2 font-medium text-slate-900">
                                                            {med.name}
                                                            <span className="block text-xs text-slate-500">{med.category}</span>
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${med.stock > 10 ? 'bg-green-100 text-green-700' :
                                                                    med.stock > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                                                }`}>
                                                                {med.stock > 0 ? `${med.stock} ${med.unit}` : 'Out of Stock'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Dosage Configuration for Selected Meds */}
                                {selectedMeds.length > 0 && (
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                        <h4 className="font-bold text-slate-800 text-sm mb-3">Dosage Instructions</h4>
                                        <div className="space-y-3">
                                            {selectedMeds.map(med => (
                                                <div key={med} className="flex gap-3 items-center">
                                                    <span className="text-sm font-medium w-32 truncate">{med}</span>
                                                    <input
                                                        type="text"
                                                        value={dosageMap[med] || ''}
                                                        onChange={(e) => handleDosageChange(med, e.target.value)}
                                                        placeholder="e.g. 500mg - 2x daily after food"
                                                        className="flex-1 p-2 border border-slate-300 rounded text-sm"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Additional Notes to Pharmacist</label>
                                    <textarea className="w-full p-2 border border-slate-300 rounded-lg text-sm h-20 resize-none"></textarea>
                                </div>
                            </div>

                            <div className="p-5 border-t border-slate-200 flex gap-3 bg-slate-50">
                                <button
                                    onClick={() => setShowPrescribeModal(false)}
                                    className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-white transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreatePrescription}
                                    className="flex-1 py-2.5 bg-gradient-to-r from-sky-500 to-teal-500 text-white rounded-xl font-medium hover:from-sky-600 hover:to-teal-600 transition-all shadow-lg shadow-sky-500/20 flex justify-center items-center gap-2"
                                >
                                    <Check size={18} />
                                    Send to Pharmacy
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // DEFAULT VIEW (Pharmacist / Admin)
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-display font-bold text-slate-800">Pharmacy Inventory</h2>
                    <p className="text-slate-500">Manage medicine stock and track prescriptions.</p>
                </div>
                <button className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-teal-500 text-white px-5 py-2.5 rounded-xl hover:from-sky-600 hover:to-teal-600 transition-all shadow-lg shadow-sky-500/20 font-semibold text-sm">
                    <Plus size={18} />
                    <span>Add Medicine</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 rounded-2xl card-hover">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Total Medicines</p>
                            <h3 className="text-2xl font-display font-bold text-slate-900 mt-2">{medicines.length.toLocaleString()}</h3>
                        </div>
                        <div className="p-3 rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 text-white shadow-lg shadow-sky-500/20">
                            <Package size={24} />
                        </div>
                    </div>
                </div>
                <div className="glass-card p-6 rounded-2xl card-hover">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Low Stock Alerts</p>
                            <h3 className="text-2xl font-display font-bold text-amber-600 mt-2">{medicines.filter(m => m.stock > 0 && m.stock <= (m.minRequiredStock ?? 20)).length} Items</h3>
                        </div>
                        <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20">
                            <AlertTriangle size={24} />
                        </div>
                    </div>
                </div>
                <div className="glass-card p-6 rounded-2xl card-hover">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Daily Sales</p>
                            <h3 className="text-2xl font-display font-bold text-emerald-600 mt-2">₹3,450</h3>
                        </div>
                        <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
                            <IndianRupee size={24} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-sky-50/30 flex items-center justify-between">
                    <div className="flex gap-4">
                        <button
                            onClick={() => setActiveTab('Inventory')}
                            className={`text-sm px-2 py-1 ${activeTab === 'Inventory' ? 'font-bold text-teal-700 border-b-2 border-teal-600' : 'font-medium text-slate-500 hover:text-slate-700'}`}
                        >
                            Inventory
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('Prescriptions History');
                                if (!selectedHistoryPatientId && historyPatients.length > 0) {
                                    setSelectedHistoryPatientId(historyPatients[0].id);
                                }
                            }}
                            className={`text-sm px-2 py-1 ${activeTab === 'Prescriptions History' ? 'font-bold text-teal-700 border-b-2 border-teal-600' : 'font-medium text-slate-500 hover:text-slate-700'}`}
                        >
                            Prescriptions History
                        </button>
                    </div>
                    <div className="relative w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={activeTab === 'Inventory' ? 'Search medicine...' : 'Search patient...'}
                            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                        />
                    </div>
                </div>
                {activeTab === 'Inventory' ? (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 text-slate-400 text-xs uppercase font-semibold border-b border-slate-200/50 tracking-wider">
                                <th className="px-6 py-4">Medicine Name</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Stock</th>
                                <th className="px-6 py-4">Price / Unit</th>
                                <th className="px-6 py-4">Expiry Date</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {medicines
                                .filter((med) => med.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                .map((med) => (
                                    <tr key={med.id} className="hover:bg-sky-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-slate-900 text-sm">{med.name}</p>
                                            <p className="text-xs text-slate-500">ID: {med.id.toUpperCase()}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{med.category}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                            {med.stock} <span className="text-xs text-slate-500 font-normal">{med.unit}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">₹{med.price.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-sm text-slate-500">{med.expiryDate}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${med.status === 'In Stock' ? 'bg-emerald-100 text-emerald-800' :
                                                med.status === 'Low Stock' ? 'bg-amber-100 text-amber-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {med.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => openRestockModal(med)}
                                                className="text-sky-600 hover:text-sky-700 text-sm font-medium"
                                            >
                                                Restock
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 min-h-[480px]">
                        <div className="border-r border-slate-200/60 p-4 space-y-2 max-h-[620px] overflow-y-auto">
                            {historyPatients.length > 0 ? historyPatients.map((patient) => (
                                <button
                                    key={patient.id}
                                    onClick={() => setSelectedHistoryPatientId(patient.id)}
                                    className={`w-full text-left p-3 rounded-xl border transition ${selectedHistoryPatientId === patient.id ? 'border-teal-300 bg-teal-50' : 'border-slate-200 hover:bg-slate-50'}`}
                                >
                                    <p className="text-sm font-semibold text-slate-900">{patient.name}</p>
                                    <p className="text-xs text-slate-500">{patient.count} prescriptions</p>
                                </button>
                            )) : (
                                <p className="text-sm text-slate-400 p-2">No patients found.</p>
                            )}
                        </div>

                        <div className="md:col-span-2 p-4 max-h-[620px] overflow-y-auto">
                            {selectedHistoryPatientId && selectedPatientHistory.length > 0 ? (
                                <div className="space-y-4">
                                    {selectedPatientHistory.map((rx) => (
                                        <div key={rx.id} className="border border-slate-200 rounded-xl p-4 bg-white">
                                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900">Prescription #{rx.id}</p>
                                                    <p className="text-xs text-slate-500">{rx.date} at {rx.time}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${rx.status === 'Dispensed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                                        {rx.status}
                                                    </span>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${rx.priority === 'Urgent' ? 'bg-red-100 text-red-800' : 'bg-sky-100 text-sky-800'}`}>
                                                        {rx.priority}
                                                    </span>
                                                </div>
                                            </div>

                                            <p className="text-sm text-slate-600 mb-2">Doctor: <span className="font-medium text-slate-800">{rx.doctorName}</span></p>

                                            <div className="space-y-2">
                                                {rx.medicines.map((med, idx) => (
                                                    <div key={idx} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
                                                        <div>
                                                            <p className="font-medium text-slate-800">{med.name}</p>
                                                            <p className="text-xs text-slate-500">{med.dosage} • Qty {med.quantity}</p>
                                                        </div>
                                                        <p className="text-xs text-slate-600">₹{(med.lineTotal || ((med.unitPrice || 0) * med.quantity)).toFixed(2)}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                                                <span className="text-sm text-slate-600">Total</span>
                                                <span className="text-sm font-semibold text-slate-900">₹{(rx.totalCost || 0).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                    Select a patient to view prescription history.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {showRestockModal && restockTarget && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200/50">
                        <div className="p-5 border-b border-slate-200/50 flex justify-between items-center bg-gradient-to-r from-slate-50 to-sky-50/30">
                            <h3 className="font-display font-bold text-slate-800">Restock Medicine</h3>
                            <button onClick={closeRestockModal} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <p className="text-sm font-semibold text-slate-900">{restockTarget.name}</p>
                                <p className="text-xs text-slate-500">Current Stock: {restockTarget.stock} {restockTarget.unit}</p>
                                <p className="text-xs text-amber-600 mt-1">Minimum Required: {restockTarget.minRequiredStock} {restockTarget.unit}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Add Quantity</label>
                                <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={restockQty}
                                    onChange={(e) => setRestockQty(e.target.value)}
                                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                                />
                            </div>
                        </div>

                        <div className="p-5 border-t border-slate-200 bg-slate-50 flex gap-3">
                            <button
                                onClick={closeRestockModal}
                                className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-white transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmRestock}
                                className="flex-1 py-2.5 bg-gradient-to-r from-sky-500 to-teal-500 text-white rounded-xl font-medium hover:from-sky-600 hover:to-teal-600 transition-all"
                            >
                                Update Stock
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};