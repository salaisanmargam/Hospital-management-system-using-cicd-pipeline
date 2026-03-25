import React, { useState, useMemo, useEffect } from 'react';
import { Search, Upload, FileText, CheckCircle, Clock, AlertCircle, Plus, X, User as UserIcon, Calendar, FlaskConical, Microscope, ScanLine, TestTube } from 'lucide-react';
import { User, UserRole } from '../types';
import { useData } from '../contexts/DataContext';
import { AUTH_STORAGE_KEY } from '../services/api';

interface LaboratoryProps {
  user?: User;
}

type LabMachineDepartment = 'Pathology' | 'Radiology' | 'Microbiology' | 'Biochemistry';

const LAB_MACHINE_DIRECTORY: Record<LabMachineDepartment, string[]> = {
  Pathology: [
    'Hematology Analyzer CBC-01',
    'Coagulation Analyzer PT/INR',
    'ESR Auto Reader',
    'Digital Slide Scanner',
  ],
  Radiology: [
    'CT Scanner 128-Slice',
    'MRI Scanner 1.5T',
    'Digital X-Ray Room A',
    'Ultrasound Console OB-1',
    '2D Echo System',
  ],
  Microbiology: [
    'Culture Incubator M3',
    'BACTEC Blood Culture System',
    'PCR Thermal Cycler',
    'Biosafety Cabinet Class II',
  ],
  Biochemistry: [
    'Biochemistry Analyzer B1',
    'Electrolyte Analyzer ELX',
    'LFT Processing Unit',
    'HbA1c Analyzer',
  ],
};

const DOCTOR_DEPARTMENT_TO_LABS: Record<string, LabMachineDepartment[]> = {
  cardiology: ['Radiology', 'Biochemistry', 'Pathology'],
  obstetrics: ['Radiology', 'Biochemistry', 'Pathology'],
  emergency: ['Radiology', 'Pathology', 'Microbiology', 'Biochemistry'],
  'general medicine': ['Pathology', 'Biochemistry', 'Microbiology', 'Radiology'],
  neurology: ['Radiology', 'Biochemistry'],
  orthopedics: ['Radiology', 'Pathology'],
};

export const Laboratory: React.FC<LaboratoryProps> = ({ user }) => {
  const { labTests, patients, appointments, addLabTest, updateLabTestStatus, refreshAllData } = useData();

  const [showPrescribeModal, setShowPrescribeModal] = useState(false);
  const [selectedResultTest, setSelectedResultTest] = useState<any | null>(null);
  const [showUpdateResultModal, setShowUpdateResultModal] = useState(false);
  const [resultTargetTest, setResultTargetTest] = useState<any | null>(null);
  const [resultDescription, setResultDescription] = useState('');
  const [resultDocUrl, setResultDocUrl] = useState('');
  const [resultDocName, setResultDocName] = useState('');
  const [resultSaving, setResultSaving] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [testPriority, setTestPriority] = useState<'Normal' | 'Urgent'>('Normal');
  const [selectedTestType, setSelectedTestType] = useState('Complete Blood Count (CBC)');

  // Tabs for Lab Tech view
  const [activeTab, setActiveTab] = useState<'All' | 'Pathology' | 'Radiology' | 'Microbiology' | 'Biochemistry'>('All');

  const isDoctor = user?.role === UserRole.DOCTOR;
  const isLabTechnician = user?.role === UserRole.LAB_TECHNICIAN;

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    const token = stored ? JSON.parse(stored)?.token : null;
    if (token) {
      refreshAllData(token);
    }
  }, [refreshAllData]);

  const normalizeDepartment = (value?: string) => {
    if (!value) return undefined;

    const departmentMap: Record<string, 'Pathology' | 'Radiology' | 'Microbiology' | 'Biochemistry'> = {
      pathology: 'Pathology',
      'pathology department': 'Pathology',
      radiology: 'Radiology',
      'radiology department': 'Radiology',
      microbiology: 'Microbiology',
      'microbiology department': 'Microbiology',
      biochemistry: 'Biochemistry',
      'biochemistry department': 'Biochemistry',
    };

    return departmentMap[value.trim().toLowerCase()];
  };

  const technicianDepartment = normalizeDepartment(user?.department);
  const doctorRelevantLabDepartments = useMemo<LabMachineDepartment[]>(() => {
    if (!isDoctor || !user?.department) return [];
    return DOCTOR_DEPARTMENT_TO_LABS[user.department.trim().toLowerCase()] || ['Pathology', 'Radiology'];
  }, [isDoctor, user?.department]);

  const visibleMachineDepartments = useMemo<LabMachineDepartment[]>(() => {
    if (isLabTechnician && technicianDepartment) return [technicianDepartment];
    if (isDoctor) return doctorRelevantLabDepartments;
    if (activeTab !== 'All') return [activeTab];
    return ['Pathology', 'Radiology', 'Microbiology', 'Biochemistry'];
  }, [activeTab, doctorRelevantLabDepartments, isDoctor, isLabTechnician, technicianDepartment]);

  const visibleMachineGroups = useMemo(
    () => visibleMachineDepartments.map((department) => ({
      department,
      machines: LAB_MACHINE_DIRECTORY[department],
    })),
    [visibleMachineDepartments],
  );

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
    } else if (isLabTechnician) {
      filtered = technicianDepartment
        ? filtered.filter(test => test.department === technicianDepartment)
        : [];
    }

    // 2. Department Tab Filter (Admin view)
    if (!isDoctor && !isLabTechnician && activeTab !== 'All') {
      filtered = filtered.filter(test => test.department === activeTab);
    }

    return filtered;
  }, [user, isDoctor, isLabTechnician, activeTab, labTests, technicianDepartment]);

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
    const test = labTests.find(t => t.id === testId);
    if (!test) return;

    if (test.status === 'Pending') {
      updateLabTestStatus(testId, 'In Progress');
      return;
    }

    if (test.status === 'In Progress') {
      setResultTargetTest(test);
      setResultDescription(test.resultText || '');
      setResultDocUrl(test.resultFileUrl || '');
      setResultDocName('');
      setShowUpdateResultModal(true);
    }
  };

  const handleEditCompletedResult = (test: any) => {
    setResultTargetTest(test);
    setResultDescription(test.resultText || '');
    setResultDocUrl(test.resultFileUrl || '');
    setResultDocName('');
    setShowUpdateResultModal(true);
  };

  const handleAttachResultDocument = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setResultDocUrl(dataUrl);
      setResultDocName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveResultAndComplete = async () => {
    if (!resultTargetTest || !resultDescription.trim()) return;
    setResultSaving(true);
    try {
      await updateLabTestStatus(
        resultTargetTest.id,
        'Completed',
        resultDescription.trim(),
        resultDocUrl.trim() || undefined,
      );
      setShowUpdateResultModal(false);
      setResultTargetTest(null);
      setResultDescription('');
      setResultDocUrl('');
      setResultDocName('');
    } finally {
      setResultSaving(false);
    }
  };

  // Stats calculation
  const pendingCount = displayedTests.filter(t => t.status === 'Pending').length;
  const completedCount = displayedTests.filter(t => t.status === 'Completed').length;
  const urgentCount = displayedTests.filter(t => t.priority === 'Urgent').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-800">
            {isDoctor ? 'My Lab Requests' : isLabTechnician ? `${technicianDepartment || 'Assigned'} Laboratory Queue` : 'Central Laboratory'}
          </h2>
          <p className="text-slate-500">
            {isDoctor
              ? 'Prescribe tests and track results.'
              : isLabTechnician
                ? technicianDepartment
                  ? `Showing only ${technicianDepartment.toLowerCase()} requests assigned to your department.`
                  : 'No supported laboratory department is assigned to this technician account.'
                : 'Unified Lab Management System.'}
          </p>
        </div>
        <div className="flex gap-2">
          {isDoctor ? (
            <button
              onClick={() => setShowPrescribeModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-teal-500 text-white px-5 py-2.5 rounded-xl hover:from-sky-600 hover:to-teal-600 transition-all shadow-lg shadow-sky-500/20 font-semibold text-sm"
            >
              <Plus size={18} />
              <span>Prescribe Test</span>
            </button>
          ) : (
            <button className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-teal-500 text-white px-5 py-2.5 rounded-xl hover:from-sky-600 hover:to-teal-600 transition-all shadow-lg shadow-sky-500/20 font-semibold text-sm">
              <Upload size={18} />
              <span>Upload Report</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl card-hover">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">
                {isDoctor ? 'Pending Results' : isLabTechnician ? `Pending (${technicianDepartment || 'Assigned'})` : `Pending (${activeTab === 'All' ? 'Total' : activeTab})`}
              </p>
              <h3 className="text-2xl font-display font-bold text-slate-900 mt-2">{pendingCount}</h3>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20">
              <Clock size={20} />
            </div>
          </div>
        </div>
        <div className="glass-card p-6 rounded-2xl card-hover">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">
                {isDoctor ? 'Results Ready' : 'Completed Today'}
              </p>
              <h3 className="text-2xl font-display font-bold text-slate-900 mt-2">{completedCount}</h3>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
              <CheckCircle size={20} />
            </div>
          </div>
        </div>
        <div className="glass-card p-6 rounded-2xl card-hover">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">Urgent Requests</p>
              <h3 className="text-2xl font-display font-bold text-slate-900 mt-2">{urgentCount}</h3>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/20">
              <AlertCircle size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h3 className="text-lg font-display font-bold text-slate-800 flex items-center gap-2">
              <ScanLine size={18} className="text-teal-500" />
              Laboratory Machines
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {isDoctor
                ? `Showing machines relevant to ${user?.department || 'your'} department.`
                : isLabTechnician
                  ? `Showing ${technicianDepartment || 'assigned'} department machines.`
                  : 'Showing machine inventory across lab departments.'}
            </p>
          </div>
          <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
            {visibleMachineGroups.reduce((count, group) => count + group.machines.length, 0)} machines
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleMachineGroups.map((group) => (
            <div key={group.department} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h4 className="font-semibold text-slate-800">{group.department}</h4>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                  {group.machines.length} machines
                </span>
              </div>
              <div className="space-y-2">
                {group.machines.map((machine) => (
                  <div key={machine} className="flex items-center gap-2 text-sm text-slate-600 rounded-lg bg-slate-50 px-3 py-2 border border-slate-100">
                    <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                    <span>{machine}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-sky-50/30 flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* ADMIN DEPARTMENT TABS */}
          {!isDoctor && !isLabTechnician ? (
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
              <button onClick={() => setActiveTab('All')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${activeTab === 'All' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>All Labs</button>
              <button onClick={() => setActiveTab('Pathology')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1 ${activeTab === 'Pathology' ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}><Microscope size={14} /> Pathology</button>
              <button onClick={() => setActiveTab('Radiology')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1 ${activeTab === 'Radiology' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}><ScanLine size={14} /> Radiology</button>
              <button onClick={() => setActiveTab('Biochemistry')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1 ${activeTab === 'Biochemistry' ? 'bg-purple-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}><TestTube size={14} /> Biochemistry</button>
              <button onClick={() => setActiveTab('Microbiology')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1 ${activeTab === 'Microbiology' ? 'bg-amber-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}><FlaskConical size={14} /> Microbiology</button>
            </div>
          ) : isLabTechnician ? (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 text-white flex items-center gap-1.5">
                <Microscope size={14} />
                {technicianDepartment || 'Unassigned Department'}
              </span>
            </div>
          ) : (
            <h3 className="font-bold text-slate-700">My Prescribed Tests</h3>
          )}

          <div className="relative w-full md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient or test..."
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-300 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {displayedTests.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 text-slate-400 text-xs uppercase font-semibold border-b border-slate-200/50 tracking-wider">
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
                  <tr key={test.id} className="hover:bg-sky-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                      {test.testName}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${test.department === 'Radiology' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
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
                      <span className={`text-xs font-bold px-2 py-1 rounded ${test.priority === 'Urgent' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                        {test.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${test.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                          test.status === 'In Progress' ? 'bg-sky-100 text-sky-800' :
                            'bg-yellow-100 text-yellow-800'
                        }`}>
                        {test.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {test.status === 'Completed' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedResultTest(test)}
                            className="text-teal-600 hover:text-teal-800 text-sm font-medium flex items-center justify-end gap-1"
                          >
                            <FileText size={16} />
                            Results
                          </button>
                          {isLabTechnician && (
                            <button
                              onClick={() => handleEditCompletedResult(test)}
                              className="text-slate-600 hover:text-teal-700 text-xs font-medium border border-slate-200 px-2 py-1 rounded hover:bg-white hover:border-teal-300 transition"
                            >
                              Edit Result
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStatusUpdate(test.id)}
                          className="text-slate-500 hover:text-teal-600 text-xs font-medium border border-slate-200 px-2 py-1 rounded hover:bg-white hover:border-teal-300 transition"
                        >
                          {isDoctor ? 'Track' : test.status === 'In Progress' ? 'Update Result' : 'Update Status'}
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
              <p>{isLabTechnician ? 'No lab requests found for your department.' : 'No lab requests found.'}</p>
              {!isDoctor && !isLabTechnician && activeTab !== 'All' && <p className="text-xs mt-1">Try switching to 'All Labs' or another department.</p>}
              {isLabTechnician && !technicianDepartment && <p className="text-xs mt-1">Assign this technician to Pathology, Radiology, Microbiology, or Biochemistry.</p>}
            </div>
          )}
        </div>
      </div>

      {/* Lab Result Modal */}
      {selectedResultTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in border border-slate-200/50">
            <div className="p-5 border-b border-slate-200/50 flex justify-between items-center bg-gradient-to-r from-emerald-50 to-teal-50/40">
              <div>
                <h3 className="font-display font-bold text-slate-800 flex items-center gap-2">
                  <FileText size={18} className="text-teal-600" />
                  Lab Result
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Patient: {selectedResultTest.patientName}</p>
              </div>
              <button onClick={() => setSelectedResultTest(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <p className="text-xs text-slate-400 uppercase font-semibold">Test</p>
                  <p className="font-semibold text-slate-800 mt-1">{selectedResultTest.testName}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <p className="text-xs text-slate-400 uppercase font-semibold">Department</p>
                  <p className="font-semibold text-slate-800 mt-1">{selectedResultTest.department}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <p className="text-xs text-slate-400 uppercase font-semibold">Doctor</p>
                  <p className="font-semibold text-slate-800 mt-1">{selectedResultTest.doctorName}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <p className="text-xs text-slate-400 uppercase font-semibold">Reported Date</p>
                  <p className="font-semibold text-slate-800 mt-1">{selectedResultTest.date}</p>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <p className="text-xs text-emerald-700 uppercase font-semibold">Result Summary</p>
                <p className="text-sm text-slate-700 mt-2">
                  {selectedResultTest.resultText || 'Exact result is not uploaded for this test yet.'}
                </p>
              </div>

              {selectedResultTest.resultFileUrl && (
                <a
                  href={selectedResultTest.resultFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-800"
                >
                  <FileText size={15} /> Open Attached Report
                </a>
              )}
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={() => setSelectedResultTest(null)}
                className="w-full py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Result Modal (for In Progress tests) */}
      {showUpdateResultModal && resultTargetTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in border border-slate-200/50">
            <div className="p-5 border-b border-slate-200/50 flex justify-between items-center bg-gradient-to-r from-sky-50 to-teal-50/40">
              <div>
                <h3 className="font-display font-bold text-slate-800 flex items-center gap-2">
                  <Upload size={18} className="text-teal-600" />
                  {resultTargetTest.status === 'Completed' ? 'Edit Completed Result' : 'Update Lab Result'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{resultTargetTest.patientName} · {resultTargetTest.testName}</p>
              </div>
              <button onClick={() => setShowUpdateResultModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Result Description</label>
                <textarea
                  value={resultDescription}
                  onChange={(e) => setResultDescription(e.target.value)}
                  placeholder="Enter exact lab finding/result text for doctor and patient..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-sm h-28 resize-none focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Attach Result Document</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={(e) => handleAttachResultDocument(e.target.files?.[0])}
                    className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  />
                  <input
                    type="url"
                    value={resultDocUrl.startsWith('data:') ? '' : resultDocUrl}
                    onChange={(e) => { setResultDocUrl(e.target.value); setResultDocName(''); }}
                    placeholder="or paste document URL"
                    className="w-full sm:w-72 p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
                {(resultDocName || resultDocUrl) && (
                  <p className="text-xs text-teal-700 mt-2">
                    Attached: {resultDocName || 'Document URL linked'}
                  </p>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 flex gap-3 bg-slate-50">
              <button
                onClick={() => setShowUpdateResultModal(false)}
                className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveResultAndComplete}
                disabled={resultSaving || !resultDescription.trim()}
                className="flex-1 py-2.5 bg-gradient-to-r from-sky-500 to-teal-500 text-white rounded-xl font-medium hover:from-sky-600 hover:to-teal-600 transition-all shadow-lg shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resultSaving ? 'Saving...' : 'Save Result & Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prescribe Test Modal */}
      {showPrescribeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in border border-slate-200/50">
            <div className="p-5 border-b border-slate-200/50 flex justify-between items-center bg-gradient-to-r from-slate-50 to-sky-50/30">
              <h3 className="font-display font-bold text-slate-800 flex items-center gap-2">
                <FlaskConical size={20} className="text-teal-500" />
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
                  className="flex-1 py-2.5 bg-gradient-to-r from-sky-500 to-teal-500 text-white rounded-xl font-medium hover:from-sky-600 hover:to-teal-600 transition-all shadow-lg shadow-sky-500/20"
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