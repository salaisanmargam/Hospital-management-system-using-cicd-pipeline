import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Dashboard } from './pages/Dashboard';
import { Patients } from './pages/Patients';
import { Appointments } from './pages/Appointments';
import { Billing } from './pages/Billing';
import { Staff } from './pages/Staff';
import { Auth } from './pages/Auth';
import { Laboratory } from './pages/Laboratory';
import { Pharmacy } from './pages/Pharmacy';
import { Ward } from './pages/Ward';
import { AdminPanel } from './pages/AdminPanel';
import { User, UserRole } from './types';
import { DataProvider, useData } from './contexts/DataContext';
import { AUTH_STORAGE_KEY, getCurrentUser } from './services/api';

const AppContent: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const { refreshAllData } = useData();

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) {
      setAuthChecked(true);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as { token?: string; user?: User };
      if (!parsed?.token) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setAuthChecked(true);
        return;
      }

      getCurrentUser(parsed.token)
        .then((currentUser) => {
          setUser(currentUser);
          setIsAuthenticated(true);
          // Load all data from db immediately after auth
          if (parsed.token) {
            refreshAllData(parsed.token);
          }
        })
        .catch(() => {
          localStorage.removeItem(AUTH_STORAGE_KEY);
        })
        .finally(() => {
          setAuthChecked(true);
        });
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      setAuthChecked(true);
    }
  }, [refreshAllData]);

  const handleAuthSuccess = (currentUser: User, token: string) => {
    setUser(currentUser);
    setIsAuthenticated(true);
    setActivePage('dashboard');
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user: currentUser }));
    refreshAllData(token);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const renderContent = () => {
    if (!user) return null;

    // Route-level Access Control
    const accessRules: Record<string, string[]> = {
      'dashboard': ['all'],
      'patients': [UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.RECEPTIONIST],
      'ward': [UserRole.ADMIN, UserRole.NURSE, UserRole.RECEPTIONIST],
      'staff': [UserRole.ADMIN],
      'appointments': ['all'],
      'laboratory': [UserRole.ADMIN, UserRole.DOCTOR, UserRole.LAB_TECHNICIAN],
      'pharmacy': [UserRole.ADMIN, UserRole.DOCTOR, UserRole.PHARMACIST],
      'records': [UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT],
      'billing': [UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.PATIENT],
      'admin': [UserRole.ADMIN],
      'settings': ['all']
    };

    const allowedRoles = accessRules[activePage];
    if (allowedRoles && !allowedRoles.includes('all') && !allowedRoles.includes(user.role)) {
      return <Dashboard user={user} />;
    }

    switch (activePage) {
      case 'dashboard':
        return <Dashboard user={user} />;
      case 'patients':
        return <Patients user={user} />;
      case 'appointments':
        return <Appointments user={user} />;
      case 'billing':
        return <Billing user={user} />;
      case 'staff':
        return <Staff />;
      case 'laboratory':
        return <Laboratory user={user} />;
      case 'pharmacy':
        return <Pharmacy user={user} />;
      case 'ward':
        return <Ward user={user} />;
      case 'admin':
        return <AdminPanel />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
            <p className="text-xl font-medium">Module under development</p>
            <p className="text-sm mt-2">Connecting to Flask API...</p>
          </div>
        );
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar 
        activePage={activePage} 
        onNavigate={setActivePage} 
        userRole={user.role} 
        onLogout={handleLogout}
      />
      
      <div className="flex-1 ml-64 flex flex-col min-h-screen transition-all duration-300">
        <TopBar user={user} />
        
        <main className="flex-1 p-8 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
};

export default App;