// src/components/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, Building2, ShieldCheck, User, Shield, Calculator, Menu, X, PieChart, UploadCloud, ShieldAlert, ClipboardList } from 'lucide-react';
import WeatherWidget from './WeatherWidget'; 
import { APP_NOMBRE, APP_VERSION } from '../version';
import CampanaNotificaciones from './CampanaNotificaciones';
import { puedeVerAuditoria, puedeVerMonitoreo } from '../utils/permisos';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth'; // ✨ NUEVO
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = ({ userName, userRole, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [permisos, setPermisos] = useState(null);

  useEffect(() => {
    let unsubscribeDoc = null;
    
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }
      
      if (user) {
        unsubscribeDoc = onSnapshot(doc(db, 'usuarios', user.uid), docSnap => {
          if (docSnap.exists()) setPermisos(docSnap.data().permisos);
        });
      } else {
        setPermisos(null);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const handleNavigation = (path) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  return (
    <>
      <nav className="bg-gradient-to-r from-[#ff5105] to-[#ff7733] text-white shadow-lg relative z-40 transition-all duration-300">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* IZQUIERDA: MENÚ HAMBURGUESA Y CLIMA */}
            <div className="flex items-center w-[80%] md:w-[70%] space-x-3">
              <button 
                onClick={() => setIsMenuOpen(true)} 
                className="p-2 hover:bg-white/10 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/20 active:scale-95"
              >
                <Menu size={24} />
              </button>
              
              <div className="hidden sm:block flex-shrink-0">
                <WeatherWidget />
              </div>
              
              <h1 className="text-md font-extrabold truncate tracking-wide hidden lg:block text-white drop-shadow-sm pl-2">
                {APP_NOMBRE} V{APP_VERSION}
              </h1>
            </div>

            {/* DERECHA: INFO USUARIO Y SALIR */}
            <div className="flex items-center justify-end space-x-4 w-[40%] md:w-[25%]">
              <CampanaNotificaciones rol={userRole} permisos={permisos} />

              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-white flex items-center">
                  <User className="w-3.5 h-3.5 mr-1.5 opacity-80" />              
                  {userName || 'Usuario'}
                </span>
                <span className="text-[10px] font-bold text-orange-100 uppercase tracking-wider flex items-center mt-0.5">
                  <Shield className="w-3 h-3 mr-1 opacity-90" />
                  Rol: {userRole || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* DRAWER LATERAL (MENÚ DESPLEGABLE EN MODO CLARO CON ANIMACIONES) */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-[100] flex">
            {/* Fondo con desenfoque */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
              onClick={() => setIsMenuOpen(false)}
            />
            
            {/* Panel del Drawer */}
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-72 bg-white h-full shadow-2xl flex flex-col z-[101] border-r border-slate-200"
            >
              
              <div className="p-5 bg-gradient-to-r from-[#ff5105] to-[#ff7733] text-white flex justify-between items-center shadow-md">
                <div className="flex items-center">
                  <Building2 className="mr-2 text-white" size={22}/>
                  <span className="font-bold text-lg tracking-wide">Menú Principal</span>
                </div>
                <button 
                  onClick={() => setIsMenuOpen(false)} 
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2 bg-slate-50">
                
                <button
                  onClick={() => setConfirmarSalida(true)}
                  className="w-full flex items-center justify-center px-4 py-3 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/20 transition-all duration-200 active:scale-[0.98]"
                >
                  <LogOut className="mr-2" size={18}/> Cerrar sesión
                </button>

                <div className="my-4 border-t border-slate-200"></div>

                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-2">Operaciones</div>

                <button 
                  onClick={() => handleNavigation('/dashboard')} 
                  className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 shadow-sm ${currentPath === '/dashboard' || currentPath === '/' ? 'bg-brand-50 text-[#ff5105] border-l-4 border-[#ff5105]' : 'bg-white text-slate-600 border-l-4 border-transparent hover:bg-slate-100 hover:text-slate-800'}`}
                >
                  <LayoutDashboard className="mr-3 text-slate-500" size={18}/> Dashboard Instituciones
                </button>

                <button 
                  onClick={() => handleNavigation('/instituciones')} 
                  className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 shadow-sm ${currentPath.includes('/instituciones') ? 'bg-brand-50 text-[#ff5105] border-l-4 border-[#ff5105]' : 'bg-white text-slate-600 border-l-4 border-transparent hover:bg-slate-100 hover:text-slate-800'}`}
                >
                  <Building2 className="mr-3 text-slate-500" size={18}/> Instituciones
                </button>

                {puedeVerMonitoreo(userRole, permisos) && (
                <button 
                  onClick={() => handleNavigation('/monitoreo-contratos')} 
                  className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 shadow-sm ${currentPath.includes('/monitoreo-contratos') ? 'bg-brand-50 text-[#ff5105] border-l-4 border-[#ff5105]' : 'bg-white text-slate-600 border-l-4 border-transparent hover:bg-slate-100 hover:text-slate-800'}`}
                >
                  <ShieldAlert className="mr-3 text-slate-500" size={18}/> Monitoreo Contratos
                </button>
                )}

                <button 
                  onClick={() => handleNavigation('/cargas-xml')} 
                  className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 shadow-sm ${currentPath.includes('/cargas-xml') ? 'bg-brand-50 text-[#ff5105] border-l-4 border-[#ff5105]' : 'bg-white text-slate-600 border-l-4 border-transparent hover:bg-slate-100 hover:text-slate-800'}`}
                >
                  <UploadCloud className="mr-3 text-slate-500" size={18}/> Cargas XML
                </button>

                {puedeVerAuditoria(userRole, permisos) && (
                  <button
                    onClick={() => handleNavigation('/auditoria')}
                    className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 shadow-sm ${currentPath.includes('/auditoria') ? 'bg-brand-50 text-[#ff5105] border-l-4 border-[#ff5105]' : 'bg-white text-slate-600 border-l-4 border-transparent hover:bg-slate-100 hover:text-slate-800'}`}
                  >
                    <ClipboardList className="mr-3 text-slate-500" size={18}/> Auditoría
                  </button>
                )}

                <div className="my-4 border-t border-slate-200"></div>

                {/* SECCIÓN CONTABILIDAD */}
                {(userRole === 'admin' || permisos?.contabilidad?.acceso || permisos?.contabilidad?.dashboardFacturacion) && (
                  <>
                    <div className="text-[10px] font-bold text-purple-500 uppercase tracking-widest mb-2 px-2 mt-4">Contabilidad</div>
                    
                    {(userRole === 'admin' || permisos?.contabilidad?.dashboardFacturacion) && (
                      <button 
                        onClick={() => handleNavigation('/dashboard-facturacion')} 
                        className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 shadow-sm ${currentPath.includes('/dashboard-facturacion') ? 'bg-purple-50 text-purple-700 border-l-4 border-purple-500 shadow-sm' : 'bg-white text-slate-600 border-l-4 border-transparent hover:bg-purple-50 hover:text-purple-600'}`}
                      >
                        <PieChart className="mr-3 text-purple-500" size={18}/> Dashboard Facturación
                      </button>
                    )}

                    {(userRole === 'admin' || permisos?.contabilidad?.acceso) && (
                      <button 
                        onClick={() => handleNavigation('/facturacion')} 
                        className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 shadow-sm ${currentPath === '/facturacion' ? 'bg-purple-50 text-purple-700 border-l-4 border-purple-500 shadow-sm' : 'bg-white text-slate-600 border-l-4 border-transparent hover:bg-purple-50 hover:text-purple-600'}`}
                      >
                        <Calculator className="mr-3 text-purple-500" size={18}/> Facturación
                      </button>
                    )}
                  </>
                )}

                {/* SECCIÓN ADMIN */}
                {userRole === 'admin' && (
                  <>
                    <div className="my-4 border-t border-slate-200"></div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-2 mt-4">Ajustes del Sistema</div>
                    <button 
                      onClick={() => handleNavigation('/admin')} 
                      className={`w-full flex items-center px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 shadow-sm ${currentPath.includes('/admin') ? 'bg-slate-800 text-white border-l-4 border-slate-500' : 'bg-white text-slate-600 border-l-4 border-transparent hover:bg-slate-100 hover:text-slate-800'}`}
                    >
                      <ShieldCheck className="mr-3 text-slate-500" size={18}/> Panel Admin / Usuarios
                    </button>
                  </>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VENTANA DE CONFIRMACIÓN PARA CERRAR SESIÓN */}
      {confirmarSalida && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setConfirmarSalida(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-center" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                <LogOut size={26} />
              </div>
              <h2 className="text-xl font-extrabold text-slate-800">¿Seguro deseas cerrar sesión?</h2>
              <p className="text-sm text-slate-500 mt-1.5">Tendrás que volver a iniciar sesión para usar el sistema.</p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setConfirmarSalida(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => { setConfirmarSalida(false); setIsMenuOpen(false); onLogout(); }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-md shadow-red-600/20"
              >
                Sí, cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;