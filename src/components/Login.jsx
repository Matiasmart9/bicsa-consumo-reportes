// src/components/Login.jsx
import React, { useState } from 'react';
import {
  ArrowRight, AlertCircle, Loader2, Mail, Lock, Eye, EyeOff,
  Instagram, Facebook, Linkedin, ClipboardCheck, BarChart3, ShieldAlert, FileSpreadsheet
} from 'lucide-react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { motion } from 'framer-motion';
import { APP_VERSION } from '../version';
import { CLAVE_SESION_EXPIRADA, LIMITE_INACTIVIDAD_MS } from '../hooks/useInactividad';

const CLAVE_EMAIL = 'mipyme_email_recordado';

const leerEmailRecordado = () => {
  try { return localStorage.getItem(CLAVE_EMAIL) || ''; } catch { return ''; }
};

const estilos = `
  @keyframes aurora-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(60px,-40px) scale(1.15); } }
  @keyframes aurora-b { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-50px,50px) scale(0.9); } }
  @keyframes aurora-c { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,30px) scale(1.1); } }
  .aurora-a { animation: aurora-a 18s ease-in-out infinite; }
  .aurora-b { animation: aurora-b 22s ease-in-out infinite; }
  .aurora-c { animation: aurora-c 14s ease-in-out infinite; }
  .login-input { transition: all .25s cubic-bezier(.16,1,.3,1); }
  .login-input:focus { border-color: #ff5105; box-shadow: 0 0 0 4px rgba(255,81,5,.14); background-color: #fff; }
`;

const FUNCIONES = [
  { icono: BarChart3, titulo: 'Registro de consumo', texto: 'Asignadas, consumidas y restantes de cada institución.' },
  { icono: ShieldAlert, titulo: 'Monitoreo de contratos', texto: 'Vencimientos y alertas para renovar a tiempo.' },
  { icono: FileSpreadsheet, titulo: 'Reportes para el área comercial', texto: 'Exporta el estado de consumo y contratos a Excel.' }
];

const REDES = [
  { nombre: 'Instagram', icono: Instagram, url: 'https://www.instagram.com/bicsapy/?hl=es' },
  { nombre: 'Facebook', icono: Facebook, url: 'https://www.facebook.com/bicsapy/?locale=es_LA' },
  { nombre: 'LinkedIn', icono: Linkedin, url: 'https://py.linkedin.com/company/bicsapy' }
];

const entrada = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.06 } }
};
const item = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }
};

const Redes = () => (
  <motion.div variants={item} className="mt-6 pt-5 border-t border-slate-200/80 text-center">
    <p className="text-sm font-semibold text-slate-500 mb-3">Seguinos en nuestras redes</p>
    <div className="flex justify-center space-x-5">
      {REDES.map(({ nombre, icono: Icono, url }) => (
        <a key={nombre} href={url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-[#ff5105] transition-all hover:scale-110 duration-200">
          <Icono className="w-5 h-5" />
          <span className="sr-only">{nombre}</span>
        </a>
      ))}
    </div>
    <p className="mt-4 text-xs text-slate-400">© {new Date().getFullYear()} BICSA · V{APP_VERSION}</p>
  </motion.div>
);

const Aviso = ({ tipo, texto }) => (
  <motion.div
    initial={{ scale: 0.95, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    className={`mb-5 p-4 rounded-xl flex items-center border ${tipo === 'error' ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}
  >
    {tipo === 'error'
      ? <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
      : <Mail className="w-5 h-5 text-emerald-600 mr-3 flex-shrink-0" />}
    <span className={`text-sm font-medium ${tipo === 'error' ? 'text-red-800' : 'text-emerald-800'}`}>{texto}</span>
  </motion.div>
);

// Encabezado compacto para móvil (el panel de marca se oculta)
const MarcaMovil = () => (
  <div className="lg:hidden flex items-center justify-center mb-5">
    <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-amber-500 flex items-center justify-center text-white shadow-md mr-3">
      <ClipboardCheck size={22} />
    </span>
    <span className="font-extrabold text-slate-800 leading-tight">MiPymes <span className="text-brand-500">BICSA</span></span>
  </div>
);

// Fondo oscuro con aurora + panel de marca a la izquierda + tarjeta a la derecha
const Escena = ({ children }) => (
  <div className="relative min-h-screen bg-[#05060f] overflow-hidden flex items-center">
    <style>{estilos}</style>

    <div className="absolute inset-0 pointer-events-none">
      <div className="aurora-a absolute -top-40 left-1/4 w-[620px] h-[620px] rounded-full bg-indigo-600/40 blur-[130px]" />
      <div className="aurora-b absolute top-1/3 -left-32 w-[520px] h-[520px] rounded-full bg-blue-700/30 blur-[130px]" />
      <div className="aurora-c absolute -bottom-40 right-1/4 w-[520px] h-[520px] rounded-full bg-brand-600/25 blur-[140px]" />
      <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
    </div>

    <div className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-10 py-10 grid lg:grid-cols-2 gap-12 items-center">
      {/* Panel de marca */}
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:block text-white"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-amber-500 flex items-center justify-center shadow-lg shadow-brand-500/30 mb-8">
          <ClipboardCheck size={32} />
        </div>
        <h1 className="text-5xl font-extrabold leading-tight tracking-tight">
          Seguimiento de Consumo<br />
          MiPymes <span className="text-brand-400">BICSA</span>
        </h1>
        <p className="mt-5 text-lg text-slate-300 max-w-lg">
          Controla el consumo y los contratos de las instituciones.
        </p>
        <ul className="mt-10 space-y-5">
          {FUNCIONES.map(({ icono: Icono, titulo, texto }, i) => (
            <motion.li
              key={titulo}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.1, duration: 0.45 }}
              className="flex items-start"
            >
              <span className="w-12 h-12 rounded-xl border border-white/15 bg-white/5 flex items-center justify-center mr-4 flex-shrink-0">
                <Icono size={22} className="text-slate-100" />
              </span>
              <span>
                <span className="block font-bold text-white">{titulo}</span>
                <span className="block text-sm text-slate-400">{texto}</span>
              </span>
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* Tarjeta */}
      <motion.div
        variants={entrada}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md mx-auto lg:ml-auto rounded-3xl bg-white/90 backdrop-blur-xl border border-white/40 shadow-2xl shadow-black/40 p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 via-amber-400 to-brand-500" />
        {children}
      </motion.div>
    </div>
  </div>
);

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState(leerEmailRecordado);
  const [password, setPassword] = useState('');
  const [recordar, setRecordar] = useState(() => !!leerEmailRecordado());
  const [verPassword, setVerPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => {
    try {
      if (sessionStorage.getItem(CLAVE_SESION_EXPIRADA)) {
        sessionStorage.removeItem(CLAVE_SESION_EXPIRADA);
        return `Tu sesión se cerró por inactividad (${LIMITE_INACTIVIDAD_MS / 60000} min). Vuelve a iniciar sesión.`;
      }
    } catch { /* sin almacenamiento */ }
    return '';
  });
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  // --- LÓGICA INTACTA ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(db, 'usuarios', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        throw new Error('Usuario no encontrado en la base de datos');
      }

      const userData = userDoc.data();

      if (!userData.activo) {
        throw new Error('Usuario desactivado. Contacta al administrador.');
      }

      const userRole = userData.rol || 'usuario';
      const userName = userData.nombre || user.email;

      await updateDoc(userDocRef, {
        ultimoAcceso: new Date().toISOString(),
        ultimoLoginIP: await obtenerIP()
      });

      try {
        if (recordar) localStorage.setItem(CLAVE_EMAIL, email);
        else localStorage.removeItem(CLAVE_EMAIL);
      } catch { /* almacenamiento no disponible */ }

      onLogin(userRole, user.email, userName, user.uid);

    } catch (error) {
      console.error("❌ Error de autenticación:", error);
      let errorMessage = 'Error de autenticación';
      switch (error.code) {
        case 'auth/user-not-found': errorMessage = 'Usuario no registrado'; break;
        case 'auth/wrong-password': errorMessage = 'Contraseña incorrecta'; break;
        case 'auth/invalid-email': errorMessage = 'Email inválido'; break;
        case 'auth/too-many-requests': errorMessage = 'Demasiados intentos. Intenta más tarde.'; break;
        case 'auth/network-request-failed': errorMessage = 'Error de conexión.'; break;
        default: errorMessage = error.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMessage('');
    setError('');
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetMessage(`Se ha enviado un email a ${resetEmail}. Revisa tu bandeja.`);
    } catch (error) {
      let errorMessage = 'Error al procesar la solicitud';
      switch (error.code) {
        case 'auth/user-not-found': errorMessage = 'No existe cuenta con este email'; break;
        case 'auth/invalid-email': errorMessage = 'Email inválido'; break;
        default: errorMessage = error.message;
      }
      setError(errorMessage);
    } finally {
      setResetLoading(false);
    }
  };

  const obtenerIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'Desconocida';
    }
  };
  // ----------------------

  const campo = 'w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white/80 outline-none login-input text-slate-800 placeholder-slate-400';
  const botonPrincipal = 'w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#ff5105] to-[#ff7733] hover:shadow-lg hover:shadow-[#ff5105]/30 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff5105] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed';

  if (showResetForm) {
    return (
      <Escena>
        <MarcaMovil />
        <div className="text-center mb-7">
          <motion.h2 variants={item} className="text-2xl font-extrabold text-slate-800 tracking-tight">Recuperar acceso</motion.h2>
          <motion.p variants={item} className="mt-1.5 text-sm text-slate-500">Ingresa tu email para recibir instrucciones</motion.p>
        </div>

        {error && <Aviso tipo="error" texto={error} />}
        {resetMessage && <Aviso tipo="ok" texto={resetMessage} />}

        <form className="space-y-5" onSubmit={handlePasswordReset}>
          <motion.div variants={item}>
            <label htmlFor="reset-email" className="block text-sm font-semibold text-slate-700 mb-1.5">Correo electrónico</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-500" />
              <input id="reset-email" type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className={campo} placeholder="ejemplo@bicsa.com.py" disabled={resetLoading} />
            </div>
          </motion.div>

          <motion.div variants={item} className="space-y-3 pt-1">
            <button type="submit" disabled={resetLoading} className={botonPrincipal}>
              {resetLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (<><Mail className="w-5 h-5 mr-2" />Enviar instrucciones</>)}
            </button>
            <button
              type="button"
              onClick={() => { setShowResetForm(false); setResetMessage(''); setError(''); }}
              className="w-full py-3.5 px-4 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all"
            >
              Volver al login
            </button>
          </motion.div>
        </form>

        <motion.p variants={item} className="mt-5 text-center text-xs text-slate-400">
          Revisa tu carpeta de spam si no recibes el correo en unos minutos.
        </motion.p>
        <Redes />
      </Escena>
    );
  }

  return (
    <Escena>
      <MarcaMovil />
      <div className="text-center mb-7">
        <motion.h2 variants={item} className="text-3xl font-extrabold text-slate-800 tracking-tight">Bienvenido/a</motion.h2>
        <motion.p variants={item} className="mt-1.5 text-sm text-slate-500">Ingresa con tu cuenta para continuar</motion.p>
      </div>

      {error && <Aviso tipo="error" texto={error} />}

      <form className="space-y-5" onSubmit={handleLogin}>
        <motion.div variants={item}>
          <label htmlFor="email-address" className="block text-sm font-semibold text-slate-700 mb-1.5">Correo</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-500" />
            <input id="email-address" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={campo} placeholder="tu@email.com" disabled={loading} />
          </div>
        </motion.div>

        <motion.div variants={item}>
          <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">Contraseña</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-500" />
            <input id="password" type={verPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={`${campo} pr-12`} placeholder="••••••••" disabled={loading} />
            <button type="button" onClick={() => setVerPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" title={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
              {verPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </motion.div>

        <motion.div variants={item} className="flex items-center justify-between">
          <label className="flex items-center text-sm text-slate-500 cursor-pointer select-none">
            <input type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} className="w-4 h-4 mr-2 rounded border-slate-300 accent-[#ff5105]" />
            Recordar mi correo
          </label>
          <button type="button" onClick={() => setShowResetForm(true)} className="text-sm font-bold text-[#ff5105] hover:text-[#ff7733] transition-colors">
            ¿Olvidaste tu contraseña?
          </button>
        </motion.div>

        <motion.div variants={item} className="pt-1">
          <button type="submit" disabled={loading} className={botonPrincipal}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (<>Iniciar sesión<ArrowRight className="w-5 h-5 ml-2" /></>)}
          </button>
        </motion.div>

        <motion.p variants={item} className="text-center text-xs text-slate-400">
          Tu rol y acceso se determinarán automáticamente.
        </motion.p>
      </form>

      <Redes />
    </Escena>
  );
};

export default Login;
