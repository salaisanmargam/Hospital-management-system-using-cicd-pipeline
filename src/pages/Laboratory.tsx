import React, { useState, useMemo } from 'react';
import { Search, Upload, FileText, CheckCircle, Clock, AlertCircle, Plus, X, User as UserIcon, Calendar, FlaskConical, Microscope, ScanLine, TestTube } from 'lucide-react';
import { User, UserRole } from '../types';
import { useData } from '../contexts/DataContext';

interface LaboratoryProps {
  user?: User;
}

export const Laboratory: React.FC<LaboratoryProps> = ({ user }) => {
  const { labTests, patients, appointments, addLabTest, updateLabTestStatus } = useData();
  
  const [showPrescribeModal, setShowPrescribeModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [testPriority, setTestPriority] = useState<'Normal' | 'Urgent'>('Normal');
  const [selectedTestType, setSelectedTestType] = useState('Complete Blood Count (CBC)');
  
  // Tabs for Lab Tech view
  const [activeTab, setActiveTab] = useState<'All' | 'Pathology' | 'Radiology' | 'Microbiology' | 'Biochemistry'>('All');

  const isDoctor = user?.role === UserRole.DOCTOR;

  // TESTS MAPPING (Simulating Database of Tests -> Departments)
  const TEST_CATALOG: Record<string, 'Pathology' | 'Radiology' | 'Microbiology' | 'Biochemistry'> = {
     'Complete Blood Count (CBC)': 'Pathology',
     'Lipid Profile': 'Biochemistry',
     'Liver Function Test (LFT)': 'Biochemistry',
     'Thyroid Profile': 'Biochemistry',
     'X-Ray Chest': 'Radiology',
     'MRI Scan': 'Radiology',
     'Blood Sugar (Fasting)': 'Pathology',
     'Urine Culture': 'Microbiology'
  };

  // Filter tests based on Role AND Active Tab
  const displayedTests = useMemo(() => {
    let filtered = labTests;

    // 1. Role Filter
    if (isDoctor) {
      filtered = filtered.filter(test => test.doctorName === user?.name);
    }

    // 2. Department Tab Filter (For Lab Techs)
    if (!isDoctor && activeTab !== 'All') {
        filtered = filtered.filter(test => test.department === activeTab);
    }

    return filtered;
  }, [user, isDoctor, activeTab, labTests]);

  // For the dropdown in the modal
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

  const handlePrescribeTest = () => {
      const patient = patients.find(p => p.id === selectedPatientId);
      if (!patient) return;

      const newTest = {
          id: `t${Date.now()}`,
          patientName: patient.name,
          testName: selectedTestType,
          doctorName: user?.name || 'Unknown',
          date: new Date().toISOString().split('T')[0],
          department: TEST_CATALOG[selectedTestType],
          priority: testPriority,
          status: 'Pending' as const
      };

      addLabTest(newTest);
      setShowPrescribeModal(false);
      setSelectedPatientId('');
      setTestPriority('Normal');
  };

  const handleStatusUpdate = (testId: string) => {
     // Simulating moving forward in status: Pending -> In Progress -> Completed
     const test = labTests.find(t => t.id === testId);
     if (test) {
         if (test.status === 'Pending') updateLabTestStatus(testId, 'In Progress');
         else if (test.status === 'In Progress') updateLabTestStatus(testId, 'Completed');
     }
  };

  // Stats calculation
  const pendingCount = displayedTests.filter(t => t.status === 'Pending').length;
  const completedCount = displayedTests.filter(t => t.status === 'Completed').length;
  const urgentCount = displayedTests.filter(t => t.priority === 'Urgent').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {isDoctor ? 'My Lab Requests' : 'Central Laboratory'}
          </h2>
          <p className="text-slate-500">
            {isDoctor ? 'Prescribe tests and track results.' : 'Unified Lab Management System.'}
          </p>
        </div>
        <div className="flex gap-2">
           {isDoctor ? (
             <button 
               onClick={() => setShowPrescribeModal(true)}
               className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition shadow-sm font-medium"
             >
               <Plus size={18} />
               <span>Prescribe Test</span>
             </button>
           ) : (
             <button className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition shadow-sm font-medium">
               <Upload size={18} />
               <span>Upload Report</span>
             </button>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                   <p className="text-slate-500 text-sm font-medium">
                     {isDoctor ? 'Pending Results' : `Pending (${activeTab === 'All' ? 'Total' : activeTab})`}
                   </p>
                   <h3 className="text-2xl font-bold text-slate-900 mt-2">{pendingCount}</h3>
                </div>
                <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                    <Clock size={20} />
                </div>
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                   <p className="text-slate-500 text-sm font-medium">
                     {isDoctor ? 'Results Ready' : 'Completed Today'}
                   </p>
                   <h3 className="text-2xl font-bold text-slate-900 mt-2">{completedCount}</h3>
                </div>
                <div className="bg-green-100 p-2 rounded-lg text-green-600">
                    <CheckCircle size={20} />
                </div>
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                   <p className="text-slate-500 text-sm font-medium">Urgent Requests</p>
                   <h3 className="text-2xl font-bold text-slate-900 mt-2">{urgentCount}</h3>
                </div>
                <div className="bg-red-100 p-2 rounded-lg text-red-600">
                    <AlertCircle size={20} />
                </div>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* LAB TECH DEPARTMENT TABS */}
            {!isDoctor ? (
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
                    <button onClick={() => setActiveTab('All')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${activeTab === 'All' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>All Labs</button>
                    <button onClick={() => setActiveTab('Pathology')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1 ${activeTab === 'Pathology' ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}><Microscope size={14} /> Pathology</button>
                    <button onClick={() => setActiveTab('Radiology')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1 ${activeTab === 'Radiology' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}><ScanLine size={14} /> Radiology</button>
                    <button onClick={() => setActiveTab('Biochemistry')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1 ${activeTab === 'Biochemistry' ? 'bg-purple-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}><TestTube size={14} /> Biochemistry</button>
                    <button onClick={() => setActiveTab('Microbiology')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1 ${activeTab === 'Microbiology' ? 'bg-amber-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}><FlaskConical size={14} /> Microbiology</button>
                </div>
            ) : (
                <h3 className="font-bold text-slate-700">My Prescribed Tests</h3>
            )}

            <div className="relative w-full md:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search patient or test..." 
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
            </div>
        </div>
        
        <div className="overflow-x-auto">
          {displayedTests.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                  <th className="px-6 py-4">Test Name</th>
                  <th className="px-6 py-4">Dept</th>
                  <th className="px-6 py-4">Patient</th>
                  {!isDoctor && <th className="px-6 py-4">Doctor</th>}
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedTests.map((test) => (
                  <tr key={test.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                       {test.testName}
                    </td>
                    <td className="px-6 py-4">
                       <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                           test.department === 'Radiology' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                           test.department === 'Pathology' ? 'bg-teal-50 text-teal-700 border-teal-100' :
                           test.department === 'Microbiology' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                           'bg-purple-50 text-purple-700 border-purple-100'
                       }`}>
                           {test.department}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                       <div className="flex items-center gap-2">
                          <UserIcon size={14} className="text-slate-400" />
                          {test.patientName}
                       </div>
                    </td>
                    {!isDoctor && <td className="px-6 py-4 text-sm text-slate-500">{test.doctorName}</td>}
                    <td className="px-6 py-4 text-sm text-slate-500">{test.date}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                          test.priority === 'Urgent' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                          {test.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        test.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                        test.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : 
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {test.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       {test.status === 'Completed' ? (
                         <button className="text-teal-600 hover:text-teal-800 text-sm font-medium flex items-center justify-end gap-1 ml-auto">
                           <FileText size={16} />
                           Results
                         </button>
                       ) : (
                         <button 
                            onClick={() => handleStatusUpdate(test.id)}
                            className="text-slate-500 hover:text-teal-600 text-xs font-medium border border-slate-200 px-2 py-1 rounded hover:bg-white hover:border-teal-300 transition"
                         >
                           {isDoctor ? 'Track' : 'Update Status'}
                         </button>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-slate-400">
               <FlaskConical size={48} className="mx-auto mb-4 text-slate-200" />
               <p>No lab requests found.</p>
               {activeTab !== 'All' && !isDoctor && <p className="text-xs mt-1">Try switching to 'All Labs' or another department.</p>}
            </div>
          )}
        </div>
      </div>

      {/* Prescribe Test Modal */}
      {showPrescribeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
             <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                   <FlaskConical size={20} className="text-teal-600" />
                   Prescribe Lab Test
                </h3>
                <button onClick={() => setShowPrescribeModal(false)} className="text-slate-400 hover:text-slate-600">
                   <X size={20} />
                </button>
             </div>
             
             <div className="p-6 space-y-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Select Patient</label>
                   <select 
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                      value={selectedPatientId}
                      onChange={(e) => setSelectedPatientId(e.target.value)}
                   >
                      <option value="">-- Choose a Patient --</option>
                      {myPatients.map(p => (
                         <option key={p.id} value={p.id}>{p.name} (ID: {p.id.toUpperCase()})</option>
                      ))}
                   </select>
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Test Name</label>
                   <select 
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                    onChange={(e) => setSelectedTestType(e.target.value)}
                    value={selectedTestType}
                   >
                      {Object.keys(TEST_CATALOG).map(test => (
                          <option key={test} value={test}>{test}</option>
                      ))}
                   </select>
                   <p className="text-xs text-teal-600 mt-1 flex items-center gap-1">
                       <CheckCircle size={10} /> Auto-routed to: <span className="font-bold">{TEST_CATALOG[selectedTestType]}</span>
                   </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                      <div className="relative">
                         <input type="date" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500" />
                         <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                      <div className="flex bg-slate-100 rounded-lg p-1">
                         <button 
                            type="button"
                            onClick={() => setTestPriority('Normal')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${testPriority === 'Normal' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
                         >
                            Normal
                         </button>
                         <button 
                            type="button"
                            onClick={() => setTestPriority('Urgent')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${testPriority === 'Urgent' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500'}`}
                         >
                            Urgent
                         </button>
                      </div>
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Clinical Notes</label>
                   <textarea 
                      className="w-full p-3 border border-slate-300 rounded-lg text-sm h-24 resize-none focus:outline-none focus:border-teal-500"
                      placeholder="Reason for test..."
                   ></textarea>
                </div>

                <div className="pt-4 flex gap-3">
                   <button 
                      onClick={() => setShowPrescribeModal(false)}
                      className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition"
                   >
                      Cancel
                   </button>
                   <button 
                      onClick={handlePrescribeTest} 
                      className="flex-1 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition shadow-sm"
                   >
                      Confirm Prescription
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};