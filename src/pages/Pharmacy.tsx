import React, { useState, useMemo } from 'react';
import { Search, Plus, AlertTriangle, Package, IndianRupee, FileText, Pill, X, Check, User as UserIcon, Clock } from 'lucide-react';
import { User, UserRole } from '../types';
import { useData } from '../contexts/DataContext';

interface PharmacyProps {
  user?: User;
}

export const Pharmacy: React.FC<PharmacyProps> = ({ user }) => {
  const { medicines, prescriptions, patients, appointments, addPrescription, updatePrescriptionStatus } = useData();
  
  const [showPrescribeModal, setShowPrescribeModal] = useState(false);
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

  // DOCTOR VIEW
  if (isDoctor) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Prescription Management</h2>
            <p className="text-slate-500">History of medicines prescribed to your patients.</p>
          </div>
          <button 
            onClick={() => setShowPrescribeModal(true)}
            className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition shadow-sm font-medium"
          >
            <Plus size={18} />
            <span>New Prescription</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center">
                    <div>
                    <p className="text-slate-500 text-sm font-medium">Prescriptions Today</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-2">
                        {myPrescriptions.filter(p => p.date === new Date().toISOString().split('T')[0]).length}
                    </h3>
                    </div>
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                        <FileText size={24} />
                    </div>
                </div>
           </div>
           <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center">
                    <div>
                    <p className="text-slate-500 text-sm font-medium">Pending Dispense</p>
                    <h3 className="text-2xl font-bold text-amber-600 mt-2">{myPrescriptions.filter(p => p.status === 'Pending').length}</h3>
                    </div>
                    <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                        <Clock size={24} />
                    </div>
                </div>
           </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-700">Prescription History</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                        <tr className="text-left">
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Patient</th>
                            <th className="px-6 py-4">Medicines Prescribed</th>
                            <th className="px-6 py-4">Pharmacy Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {myPrescriptions.length > 0 ? myPrescriptions.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50 transition">
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
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        p.status === 'Dispensed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                        {p.status}
                                    </span>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="p-12 text-center text-slate-400">No prescriptions found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Create Prescription Modal */}
        {showPrescribeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                    <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Pill size={20} className="text-teal-600" />
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
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                        med.stock > 10 ? 'bg-green-100 text-green-700' : 
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
                            className="flex-1 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition shadow-sm flex justify-center items-center gap-2"
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Pharmacy Inventory</h2>
          <p className="text-slate-500">Manage medicine stock and track prescriptions.</p>
        </div>
        <button className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition shadow-sm font-medium">
          <Plus size={18} />
          <span>Add Medicine</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex justify-between items-center">
                <div>
                   <p className="text-slate-500 text-sm font-medium">Total Medicines</p>
                   <h3 className="text-2xl font-bold text-slate-900 mt-2">{medicines.length.toLocaleString()}</h3>
                </div>
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                    <Package size={24} />
                </div>
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center">
                <div>
                   <p className="text-slate-500 text-sm font-medium">Low Stock Alerts</p>
                   <h3 className="text-2xl font-bold text-amber-600 mt-2">{medicines.filter(m => m.stock <= 20).length} Items</h3>
                </div>
                <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                    <AlertTriangle size={24} />
                </div>
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center">
                <div>
                   <p className="text-slate-500 text-sm font-medium">Daily Sales</p>
                   <h3 className="text-2xl font-bold text-emerald-600 mt-2">₹3,450</h3>
                </div>
                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                    <IndianRupee size={24} />
                </div>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex gap-4">
                <button className="text-sm font-bold text-teal-700 border-b-2 border-teal-600 px-2 py-1">Inventory</button>
                <button className="text-sm font-medium text-slate-500 hover:text-slate-700 px-2 py-1">Prescriptions History</button>
            </div>
            <div className="relative w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search medicine..." 
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                />
            </div>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
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
            {medicines.map((med) => (
              <tr key={med.id} className="hover:bg-slate-50 transition">
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
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    med.status === 'In Stock' ? 'bg-green-100 text-green-800' : 
                    med.status === 'Low Stock' ? 'bg-amber-100 text-amber-800' : 
                    'bg-red-100 text-red-800'
                  }`}>
                    {med.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-teal-600 hover:text-teal-800 text-sm font-medium">Restock</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};