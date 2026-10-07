// src/App.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from './components/sileo';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import DashboardFacturacion from './components/DashboardFacturacion'; // ✨ NUEVO
import Instituciones from './components/Instituciones';
import MonitoreoContratos from './components/MonitoreoContratos';
import Auditoria from './components/Auditoria';
import CargasXML from './components/CargasXML'; // ✨ NUEVO
import Admin from './components/Admin';
import Login from './components/Login';
import Facturacion from './components/Facturacion';
import { signOut } from 'firebase/auth';
import { Clock } from 'lucide-react';
import { auth } from './firebase';
import { useInactividad, sesionCaducada, CLAVE_SESION_EXPIRADA } from './hooks/useInactividad';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null); 
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState(''); 
  const [loading, setLoading] = useState(true); 
  const [exportExcelFunction, setExportExcelFunction] = useState(null);

  useEffect(() => {
    const savedAuth = localStorage.getItem('mipyme_auth');
    if (savedAuth && sesionCaducada()) {
      localStorage.removeItem('mipyme_auth');
      signOut(auth).catch(() => {});
      try { sessionStorage.setItem(CLAVE_SESION_EXPIRADA, '1'); } catch { /* sin almacenamiento */ }
    } else if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth);
        setIsAuthenticated(true);
        setUserRole(authData.role);
        setUserEmail(authData.email);
        setUserName(authData.name || ''); 
      } catch (error) {
        localStorage.removeItem('mipyme_auth');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (role, email, name, uid) => {
    setIsAuthenticated(true);
    setUserRole(role);
    setUserEmail(email);
    setUserName(name); 
    const authData = { role, email, name, uid, timestamp: new Date().getTime() };
    localStorage.setItem('mipyme_auth', JSON.stringify(authData));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setUserEmail('');
    setUserName(''); 
    setExportExcelFunction(null);
    localStorage.removeItem('mipyme_auth');
    signOut(auth).catch(() => {});
  };

  const cerrarPorInactividad = () => {
    try { sessionStorage.setItem(CLAVE_SESION_EXPIRADA, '1'); } catch { /* sin almacenamiento */ }
    handleLogout();
  };

  const { segundosRestantes, continuar } = useInactividad({ activo: isAuthenticated, onTimeout: cerrarPorInactividad });

  const handleRegisterExportFunction = (exportFunction) => {
    setExportExcelFunction(() => exportFunction);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1e3a5f' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
    <Toaster 
      position="top-center" 
      offset="24px"
      theme="light"
      options={{ 
        fill: '#1e3a5f'
      }} 
    />
      {isAuthenticated && (
        <Navbar userName={userName || userEmail} userRole={userRole} onLogout={handleLogout} />
      )}
      
      {isAuthenticated && segundosRestantes !== null && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-center">
            <div className="bg-gradient-to-r from-brand-500 to-brand-400 px-6 py-5 text-white">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2">
                <Clock size={28} />
              </div>
              <h2 className="text-xl font-extrabold">¿Sigues ahí?</h2>
            </div>
            <div className="p-6">
              <p className="text-slate-600 text-sm">
                Por seguridad, tu sesión se cerrará por inactividad en
              </p>
              <p className="text-5xl font-black text-brand-600 my-3">{segundosRestantes}s</p>
              <button
                onClick={continuar}
                className="w-full py-3 rounded-xl bg-brand-500 text-white font-bold hover:bg-brand-600 transition-colors shadow-md active:scale-[0.98]"
              >
                Seguir conectado
              </button>
              <button
                onClick={handleLogout}
                className="w-full mt-2 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors"
              >
                Cerrar sesión ahora
              </button>
            </div>
          </div>
        </div>
      )}

      <main>
        <Routes>
          <Route path="/" element={isAuthenticated ? (userRole === 'admin' ? <Admin /> : userRole === 'contabilidad' ? <Facturacion /> : <Dashboard onExportExcel={handleRegisterExportFunction} />) : (<Login onLogin={handleLogin} />)} />
          
          {isAuthenticated && (
            <>
              <Route path="/dashboard" element={<Dashboard onExportExcel={userRole === 'usuario' ? handleRegisterExportFunction : null} />} />
              <Route path="/dashboard-facturacion" element={<DashboardFacturacion />} />
              <Route path="/instituciones" element={<Instituciones />} />
              <Route path="/monitoreo-contratos" element={<MonitoreoContratos userRole={userRole} />} />
              <Route path="/auditoria" element={<Auditoria />} />
              <Route path="/cargas-xml" element={<CargasXML userRole={userRole} />} />
              <Route path="/facturacion" element={<Facturacion />} />
              {userRole === 'admin' && <Route path="/admin" element={<Admin />} />}
            </>
          )}
          
          <Route path="*" element={isAuthenticated ? (userRole === 'admin' ? <Admin /> : userRole === 'contabilidad' ? <Facturacion /> : <Dashboard onExportExcel={handleRegisterExportFunction} />) : (<Login onLogin={handleLogin} />)} />
        </Routes>
      </main>
    </div>
  );
}

export default App;