// src/components/Facturacion.jsx
import React, { useState, useEffect } from 'react';
import { sileo } from './sileo';
import { confirmar } from '../utils/confirmar';
import { 
  Calculator, PlusCircle, Search, X, CheckCircle, AlertCircle, Clock, 
  FileText, Printer, ShieldAlert, Loader2, CheckSquare, ClipboardList, DollarSign, History, Filter, Edit3, Save, MessageCircle, Copy, Download, Trash2, Send
} from 'lucide-react';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, serverTimestamp, where, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
import { logAuditoria } from '../hooks/useFirebase';
import { descargarLibro, formatearFechaHora, hojaDesdeObjetos } from '../utils/excel';
import { monedaDe, formatearMonto } from '../utils/moneda';

export const ModalAuditoria = ({ institucionId, institucionNombre, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const q = query(collection(db, 'auditoria'), where('institucionId', '==', institucionId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logData = [];
      snapshot.forEach(doc => logData.push({ id: doc.id, ...doc.data() }));
      logData.sort((a, b) => (b.fecha?.toMillis() || 0) - (a.fecha?.toMillis() || 0));
      setLogs(logData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [institucionId]);

  const logsFiltrados = logs.filter(log => {
    if (!log.fecha) return true;
    const logDate = log.fecha.toDate();
    logDate.setHours(0,0,0,0);
    if (fechaDesde && logDate < new Date(fechaDesde + 'T00:00:00')) return false;
    if (fechaHasta && logDate > new Date(fechaHasta + 'T00:00:00')) return false;
    return true;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = logsFiltrados.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(logsFiltrados.length / itemsPerPage);

  const exportarExcel = () => {
    const dataToExport = logsFiltrados.map(log => ({
      Fecha: formatearFechaHora(log.fecha),
      Acción: log.accion,
      Detalles: log.detalles,
      Usuario: log.usuario
    }));
    descargarLibro(
      [{ nombre: 'Auditoría', hoja: hojaDesdeObjetos(dataToExport) }],
      `Auditoria_${institucionNombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center"><ClipboardList className="mr-3 text-indigo-600" size={28} />Auditoría de Movimientos</h2>
            <p className="text-sm text-gray-500 mt-1">Historial de acciones en: <strong>{institucionNombre}</strong></p>
          </div>
          <div className="flex space-x-2">
            <button onClick={exportarExcel} disabled={logsFiltrados.length === 0} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-bold text-sm transition-colors"><Download size={16} className="mr-2"/> Excel</button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-lg"><X size={20} /></button>
          </div>
        </div>
        <div className="flex space-x-4 mb-4 shrink-0 bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div><label className="text-xs font-bold text-gray-600 uppercase">Desde:</label><input type="date" value={fechaDesde} onChange={e => {setFechaDesde(e.target.value); setCurrentPage(1);}} className="w-full mt-1 p-2 border rounded text-sm"/></div>
          <div><label className="text-xs font-bold text-gray-600 uppercase">Hasta:</label><input type="date" value={fechaHasta} onChange={e => {setFechaHasta(e.target.value); setCurrentPage(1);}} className="w-full mt-1 p-2 border rounded text-sm"/></div>
          <div className="flex items-end pb-1"><button onClick={() => {setFechaDesde(''); setFechaHasta(''); setCurrentPage(1);}} className="text-sm text-blue-600 font-bold hover:underline">Limpiar Filtros</button></div>
        </div>
        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
          {loading ? <div className="text-center py-10"><Loader2 className="animate-spin text-indigo-500 mx-auto" size={32} /></div> : currentLogs.length === 0 ? <div className="text-center py-10 text-gray-500 font-medium bg-gray-50 rounded-lg">No se encontraron movimientos registrados en este rango de fechas.</div> : (
            currentLogs.map(log => (
              <div key={log.id} className="bg-white p-4 rounded-lg border-l-4 border-indigo-500 shadow-sm flex items-start space-x-4">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1"><p className="font-bold text-gray-800 text-sm">{log.accion}</p><span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{log.fecha?.toDate ? log.fecha.toDate().toLocaleString('es-ES') : 'Reciente'}</span></div>
                  <p className="text-sm text-gray-600 leading-relaxed">{log.detalles}</p>
                  <p className="text-xs text-gray-400 mt-2 font-medium">Por: {log.usuario}</p>
                </div>
              </div>
            ))
          )}
        </div>
        {totalPages > 1 && (
          <div className="mt-4 pt-4 border-t flex justify-between items-center shrink-0">
            <span className="text-sm text-gray-500 font-medium">Página {currentPage} de {totalPages}</span>
            <div className="flex space-x-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 text-sm font-bold text-gray-700">Anterior</button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 text-sm font-bold text-gray-700">Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Facturacion = () => {
  const [facturas, setFacturas] = useState([]);
  const [institucionesBase, setInstitucionesBase] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  
  const [showNuevaFactura, setShowNuevaFactura] = useState(false);
  const [showPagos, setShowPagos] = useState(false);
  const [showEditarFactura, setShowEditarFactura] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [showAuditoria, setShowAuditoria] = useState(false);
  const [showNotas, setShowNotas] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [datosRenovacion, setDatosRenovacion] = useState(null);

  const [nivelAcceso, setNivelAcceso] = useState('vista'); 
  const [userRol, setUserRol] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('Usuario');

  useEffect(() => {
    const qInst = query(collection(db, 'instituciones'), where('estado', 'in', ['activo', 'pendiente']));
    const unsubInst = onSnapshot(qInst, (snapshot) => {
      const instData = [];
      snapshot.forEach(doc => instData.push({ id: doc.id, ...doc.data() }));
      setInstitucionesBase(instData);
    });

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserEmail(user.email || 'Usuario');
        const unsubUser = onSnapshot(doc(db, 'usuarios', user.uid), (docSnap) => {
          if(docSnap.exists()) {
            const data = docSnap.data();
            setUserRol(data.rol);
            if (data.rol === 'admin') setNivelAcceso('full');
            else if (data.permisos?.contabilidad?.nivel) setNivelAcceso(data.permisos.contabilidad.nivel);
          }
        });
        
        const qFact = query(collection(db, 'facturas'), orderBy('fechaCreacion', 'desc'));
        const unsubFacturas = onSnapshot(qFact, (snapshot) => {
          const factData = [];
          snapshot.forEach(doc => factData.push({ id: doc.id, ...doc.data() }));
          setFacturas(factData);
          setLoading(false);
        });

        return () => { unsubUser(); unsubFacturas(); };
      } else {
        setLoading(false);
      }
    });

    return () => { unsubInst(); unsubAuth(); };
  }, []);

  const canEdit = nivelAcceso === 'full';
  const facturaActual = facturaSeleccionada ? facturas.find(f => f.id === facturaSeleccionada.id) || facturaSeleccionada : null;

  const institucionesSinFacturar = institucionesBase.filter(inst => {
    return !facturas.some(f => f.institucionNombre === inst.nombre && f.estadoGeneral !== 'incompleta');
  });

  const ModalNuevaFactura = ({ onClose, datosPreCargados }) => {
    const [formData, setFormData] = useState({
      institucionNombre: datosPreCargados?.institucionNombre || '', 
      ruc: datosPreCargados?.ruc || '', 
      nroFactura: '', 
      fechaEmision: '', 
      montoTotal: datosPreCargados?.montoTotal || '', 
      plazoMeses: datosPreCargados?.plazoMeses || '1'
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setSaving(true);
      
      const montoTotalNum = parseFloat(formData.montoTotal);
      const plazoNum = parseInt(formData.plazoMeses);
      const montoCuota = Math.round(montoTotalNum / plazoNum);
      
      const cuotasGeneradas = [];
      let fechaCursor = new Date(formData.fechaEmision);
      fechaCursor.setMinutes(fechaCursor.getMinutes() + fechaCursor.getTimezoneOffset());

      for(let i = 1; i <= plazoNum; i++) {
        fechaCursor.setMonth(fechaCursor.getMonth() + 1);
        cuotasGeneradas.push({
          numero: i,
          monto: montoCuota,
          fechaVencimiento: fechaCursor.toISOString().split('T')[0],
          estado: 'pendiente',
          fechaPago: null
        });
      }

      try {
        const payload = {
          ...formData,
          montoTotal: montoTotalNum,
          plazoMeses: plazoNum,
          cuotas: cuotasGeneradas,
          estadoGeneral: 'pendiente', 
          notas: [],
          fechaCreacion: serverTimestamp()
        };

        if (datosPreCargados?.institucionId) {
          payload.institucionId = datosPreCargados.institucionId;
        }

        const docRef = await addDoc(collection(db, 'facturas'), payload);
        
        // ✨ SINCRONIZACIÓN HACIA INSTITUCIONES
        if (datosPreCargados?.institucionId) {
          try {
            await updateDoc(doc(db, 'instituciones', datosPreCargados.institucionId), {
              montoTotal: montoTotalNum,
              plazoMeses: plazoNum
            });
          } catch (syncErr) {
            console.error("Error al sincronizar con Instituciones:", syncErr);
          }
        }

        await logAuditoria(docRef.id, 'Creación de Factura', `Factura ${formData.nroFactura} creada por ${montoTotalNum.toLocaleString()}Gs a ${plazoNum} meses.`);
        onClose();
        sileo.success({ title: 'Factura generada', description: `Factura ${formData.nroFactura} guardada. Estado: Pendiente.` });
      } catch (err) {
        sileo.error({ title: 'Error al guardar', description: err.message });
      }
      setSaving(false);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center"><FileText className="mr-3 text-orange-600" /> {datosPreCargados?.esBorrador ? 'Completar Facturación' : (datosPreCargados ? 'Renovar Factura (Nueva)' : 'Nueva Factura')}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
          </div>
          {datosPreCargados && (
            <div className="mb-4 bg-blue-50 p-3 rounded text-blue-800 text-sm font-medium border border-blue-200">
              Estás trabajando sobre la institución <strong>{datosPreCargados.institucionNombre}</strong>.
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Institución</label>
              <input required type="text" value={formData.institucionNombre} onChange={e=>setFormData({...formData, institucionNombre: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" disabled={!!datosPreCargados} />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-bold text-gray-700 mb-1">RUC</label>
              <input required type="text" value={formData.ruc} onChange={e=>setFormData({...formData, ruc: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nro. Factura</label>
              <input required type="text" value={formData.nroFactura} onChange={e=>setFormData({...formData, nroFactura: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="001-001-0000000" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Fecha de Emisión</label>
              <input required type="date" value={formData.fechaEmision} onChange={e=>setFormData({...formData, fechaEmision: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Monto Total (Gs)</label>
              <input required type="number" value={formData.montoTotal} onChange={e=>setFormData({...formData, montoTotal: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Plazo (Meses)</label>
              <select value={formData.plazoMeses} onChange={e=>setFormData({...formData, plazoMeses: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500 outline-none">
                <option value="1">1 Mes (Al contado)</option>
                {[2,3,4,5,6,7,8,9,10,11,12].map(num => (<option key={num} value={num}>{num} Meses</option>))}
              </select>
            </div>
            <div className="col-span-2 mt-6 flex justify-end space-x-3 border-t pt-4">
              <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-colors">Cancelar</button>
              <button type="submit" disabled={saving} className="px-5 py-2 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition-colors">{saving ? 'Guardando...' : 'Guardar y Generar'}</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const ModalEditarFactura = ({ factura, onClose }) => {
    const [formData, setFormData] = useState({
      nroFactura: factura.nroFactura,
      fechaEmision: factura.fechaEmision,
      estadoGeneral: factura.estadoGeneral || 'pendiente',
      montoTotal: factura.montoTotal,
      plazoMeses: factura.plazoMeses
    });
    const [saving, setSaving] = useState(false);

    const regenerarCuotas = formData.montoTotal !== factura.montoTotal || formData.plazoMeses !== factura.plazoMeses;

    const handleSubmit = async (e) => {
      e.preventDefault();
      setSaving(true);
      
      try {
        let datosParaActualizar = { ...formData };
        datosParaActualizar.montoTotal = parseFloat(formData.montoTotal);
        datosParaActualizar.plazoMeses = parseInt(formData.plazoMeses);

        if (regenerarCuotas) {
          const montoCuota = Math.round(datosParaActualizar.montoTotal / datosParaActualizar.plazoMeses);
          const cuotasGeneradas = [];
          let fechaCursor = new Date(formData.fechaEmision);
          fechaCursor.setMinutes(fechaCursor.getMinutes() + fechaCursor.getTimezoneOffset());

          for(let i = 1; i <= datosParaActualizar.plazoMeses; i++) {
            fechaCursor.setMonth(fechaCursor.getMonth() + 1);
            cuotasGeneradas.push({
              numero: i,
              monto: montoCuota,
              fechaVencimiento: fechaCursor.toISOString().split('T')[0],
              estado: 'pendiente',
              fechaPago: null
            });
          }
          datosParaActualizar.cuotas = cuotasGeneradas;
        }

        await updateDoc(doc(db, 'facturas', factura.id), datosParaActualizar);
        
        // ✨ SINCRONIZACIÓN HACIA INSTITUCIONES (Si editaste el monto/plazo aquí)
        if (factura.institucionId) {
          try {
            await updateDoc(doc(db, 'instituciones', factura.institucionId), {
              montoTotal: datosParaActualizar.montoTotal,
              plazoMeses: datosParaActualizar.plazoMeses
            });
          } catch (syncErr) {
            console.error("Error al sincronizar con Instituciones:", syncErr);
          }
        }

        const detalleLog = regenerarCuotas ? `REGENERACIÓN de cuotera: ${datosParaActualizar.plazoMeses} meses por ${datosParaActualizar.montoTotal} Gs.` : `Edición de datos/estado a: ${formData.estadoGeneral}`;
        await logAuditoria(factura.id, 'Edición de Metadatos', detalleLog);
        onClose();
        sileo.success({ title: 'Factura actualizada', description: 'Los datos se guardaron correctamente.' });
      } catch (error) {
        sileo.error({ title: 'Error al actualizar', description: error.message });
      }
      setSaving(false);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md max-h-[95vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center"><Edit3 className="mr-3 text-orange-600" /> Editar Factura</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
          </div>
          
          <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 mb-4">
            <p className="text-xs text-orange-600 uppercase font-bold mb-1">Aviso</p>
            <p className="text-sm text-orange-800 font-medium leading-tight">Si vas a renovar un contrato y quieres mantener el historial, cierra esto y usa el botón verde de "Renovar".</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nro. Factura Actual</label>
              <input required type="text" value={formData.nroFactura} onChange={e=>setFormData({...formData, nroFactura: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Fecha de Emisión</label>
              <input required type="date" value={formData.fechaEmision} onChange={e=>setFormData({...formData, fechaEmision: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 border-y border-gray-100 py-4 my-2">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Monto Total (Gs)</label>
                <input required type="number" value={formData.montoTotal} onChange={e=>setFormData({...formData, montoTotal: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Plazo (Meses)</label>
                <select value={formData.plazoMeses} onChange={e=>setFormData({...formData, plazoMeses: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500 outline-none">
                  <option value="1">1 Mes (Contado)</option>
                  {[2,3,4,5,6,7,8,9,10,11,12].map(num => (<option key={num} value={num}>{num} Meses</option>))}
                </select>
              </div>
            </div>

            {regenerarCuotas && (
              <div className="bg-red-50 text-red-700 p-3 rounded text-sm font-bold flex items-start border border-red-200">
                <AlertCircle className="mr-2 shrink-0 mt-0.5" size={18}/>
                Al guardar, las cuotas se regenerarán desde cero y se perderán los registros de pago de esta factura.
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Estado de la Factura</label>
              <select value={formData.estadoGeneral} onChange={e=>setFormData({...formData, estadoGeneral: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500 outline-none">
                <option value="activa">Activa</option>
                <option value="completada">Completada (Pagada)</option>
                <option value="pendiente">Pendiente</option>
                <option value="no_renovada">Finalizada / Archivada</option>
              </select>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3 pt-4">
              <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-colors">Cancelar</button>
              <button type="submit" disabled={saving} className="px-5 py-2 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition-colors flex items-center">
                {saving ? 'Guardando...' : <><Save size={18} className="mr-2"/> Guardar</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const ModalNotasFactura = ({ factura, onClose }) => {
    const [nuevaNota, setNuevaNota] = useState('');
    const [saving, setSaving] = useState(false);
    const notas = factura.notas || [];

    const handleAddNota = async () => {
      if(!nuevaNota.trim()) return;
      setSaving(true);
      try {
        const notaObj = { id: Date.now().toString(), texto: nuevaNota.trim(), fecha: new Date().toISOString(), usuario: currentUserEmail };
        const notasActualizadas = [notaObj, ...notas]; 
        await updateDoc(doc(db, 'facturas', factura.id), { notas: notasActualizadas });
        await logAuditoria(factura.id, 'Nota Agregada', `Comentario: "${nuevaNota.substring(0, 30)}..."`);
        setNuevaNota('');
      } catch (error) { sileo.error({ title: 'Error al guardar nota', description: error.message }); }
      setSaving(false);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center mb-4 shrink-0 border-b pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center"><MessageCircle className="mr-2 text-orange-600" /> Notas y Seguimiento</h2>
              <p className="text-sm text-gray-500">Factura: {factura.nroFactura}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
          </div>
          <div className="mb-4 shrink-0">
            <textarea value={nuevaNota} onChange={e => setNuevaNota(e.target.value)} placeholder="Ej: Llamé a la empresa..." className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 resize-none h-24" disabled={!canEdit || saving} />
            {canEdit && (
              <button onClick={handleAddNota} disabled={saving || !nuevaNota.trim()} className="mt-2 w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg flex items-center justify-center transition-colors">
                {saving ? <Loader2 className="animate-spin mr-2" size={18}/> : <Send className="mr-2" size={18}/>} Guardar Nota
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {notas.length === 0 ? <p className="text-center text-gray-500 py-6 text-sm">No hay notas registradas.</p> : notas.map(n => (
                <div key={n.id} className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                  <div className="flex justify-between items-center mb-1"><span className="text-xs font-bold text-orange-800">{n.usuario}</span><span className="text-[10px] text-gray-500">{new Date(n.fecha).toLocaleString('es-ES')}</span></div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{n.texto}</p>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  };

  const ModalPagos = ({ factura, onClose }) => {
    const [cuotas, setCuotas] = useState([]);
    const [huboCambios, setHuboCambios] = useState(false);

    useEffect(() => {
      if(factura.cuotas) setCuotas(factura.cuotas.map(c => ({...c})));
    }, [factura]);

    const handleCheckPago = (index) => {
      if(!canEdit) return;
      const nuevasCuotas = cuotas.map(c => ({...c}));
      const actual = nuevasCuotas[index];
      if(actual.estado === 'pendiente') { actual.estado = 'pagado'; actual.fechaPago = new Date().toISOString().split('T')[0]; } 
      else { actual.estado = 'pendiente'; actual.fechaPago = null; }
      setCuotas(nuevasCuotas);
      setHuboCambios(true);
    };

    const guardarCambios = async () => {
      confirmar(
        'Guardar cambios de pago',
        '¿Confirmas los cambios en los estados de pago?',
        async () => {
          const todasPagadas = cuotas.every(c => c.estado === 'pagado');
          let nuevoEstadoGeneral = factura.estadoGeneral;
          if (todasPagadas && factura.estadoGeneral === 'activa') nuevoEstadoGeneral = 'completada';
          else if (!todasPagadas && factura.estadoGeneral === 'completada') nuevoEstadoGeneral = 'activa';
          await updateDoc(doc(db, 'facturas', factura.id), { cuotas: cuotas, estadoGeneral: nuevoEstadoGeneral });
          await logAuditoria(factura.id, 'Actualización de Pagos', `Se actualizaron las cuotas de la factura ${factura.nroFactura}`);
          setHuboCambios(false);
          sileo.success({ title: 'Pagos guardados', description: 'Los estados de pago se actualizaron.' });
        }
      );
    };

    const generarPDF = () => {
      const originalTitle = document.title;
      document.title = `${factura.institucionNombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
      window.print();
      setTimeout(() => { document.title = originalTitle; }, 1000);
    };

    return (
      <div className="fixed inset-0 bg-gray-100 sm:bg-black sm:bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 print:p-0 print:bg-white">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #area-impresion, #area-impresion * { visibility: visible; }
            #area-impresion { position: absolute; left: 0; top: 0; width: 100%; height: auto; margin: 0; padding: 20px; }
            @page { size: auto; margin: 10mm; }
          }
        `}</style>
        <div className="bg-white w-full sm:max-w-4xl max-h-[95vh] flex flex-col sm:rounded-lg shadow-2xl overflow-hidden print:shadow-none print:max-h-none print:w-full">
          <div className="p-4 bg-gradient-to-r from-orange-600 to-amber-500 text-white flex justify-between items-center shrink-0 print:hidden">
            <h2 className="text-xl font-bold flex items-center"><DollarSign className="mr-2"/> Estado de Cuenta</h2>
            <div className="flex space-x-3">
              <button onClick={generarPDF} className="bg-white text-orange-600 px-3 py-1.5 rounded-lg flex items-center text-sm font-bold shadow-sm hover:bg-orange-50 transition-colors"><Printer size={16} className="mr-1.5"/> PDF / Imprimir</button>
              <button onClick={onClose} className="p-1.5 hover:bg-orange-700/50 rounded-lg transition-colors"><X size={24} /></button>
            </div>
          </div>
          <div className="p-6 flex-1 overflow-y-auto bg-white" id="area-impresion">
            <div className="text-center mb-6 border-b-2 border-gray-800 pb-4"><h1 className="text-3xl font-black text-gray-900 tracking-tight">ESTADO DE CUENTA</h1><p className="text-gray-600 mt-1 font-medium">Sistema Web Consumo - BICSA</p></div>
            <div className="grid grid-cols-2 gap-4 mb-6 text-sm bg-gray-50 p-4 rounded-lg print:bg-transparent print:border print:border-gray-300">
              <div><p className="mb-1"><strong className="text-gray-700">Institución:</strong> <span className="font-bold text-gray-900">{factura.institucionNombre}</span></p><p><strong className="text-gray-700">RUC:</strong> {factura.ruc}</p></div>
              <div className="text-right"><p className="mb-1"><strong className="text-gray-700">Nro. Factura:</strong> <span className="font-medium">{factura.nroFactura}</span></p><p className="mb-1"><strong className="text-gray-700">Fecha Emisión:</strong> {factura.fechaEmision}</p><p><strong className="text-gray-700">Monto Total:</strong> <span className="font-bold text-orange-600">{parseFloat(factura.montoTotal).toLocaleString()} Gs.</span></p></div>
            </div>
            <table className="w-full text-left border-collapse text-sm">
              <thead><tr className="bg-gray-100 text-gray-700 print:border-b-2 print:border-gray-800"><th className="p-3 border-y border-gray-300 font-bold text-center">Cuota</th><th className="p-3 border-y border-gray-300 font-bold">Monto (Gs)</th><th className="p-3 border-y border-gray-300 font-bold">Vencimiento</th><th className="p-3 border-y border-gray-300 font-bold text-center print:hidden">Acción</th><th className="p-3 border-y border-gray-300 font-bold text-center">Estado</th><th className="p-3 border-y border-gray-300 font-bold">Fecha Pago</th></tr></thead>
              <tbody>
                {cuotas.map((cuota, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-bold text-center text-gray-700">{cuota.numero}/{factura.plazoMeses}</td>
                    <td className="p-3 font-medium text-gray-800">{parseFloat(cuota.monto).toLocaleString()}</td>
                    <td className={`p-3 font-semibold ${cuota.estado === 'pagado' ? 'text-gray-500' : 'text-red-600'}`}>{cuota.fechaVencimiento}</td>
                    <td className="p-3 text-center print:hidden">
                      <button disabled={!canEdit} onClick={() => handleCheckPago(idx)} className={`p-1.5 rounded transition-all ${cuota.estado === 'pagado' ? 'bg-green-500 text-white shadow-sm' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'} ${!canEdit && 'opacity-50 cursor-not-allowed'}`}><CheckSquare size={20} /></button>
                    </td>
                    <td className="p-3 text-center font-bold">{cuota.estado === 'pagado' ? <span className="text-green-600">PAGADO</span> : <span className="text-amber-500">PENDIENTE</span>}</td>
                    <td className="p-3 text-gray-600 font-medium">{cuota.fechaPago || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-6 flex justify-end">
               <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 min-w-[280px] print:bg-transparent print:border-gray-400">
                 <p className="flex justify-between items-center mb-2"><span className="text-gray-600 font-medium">Total Pagado:</span> <span className="font-bold text-green-600 text-lg">{cuotas.filter(c => c.estado === 'pagado').reduce((sum, c) => sum + c.monto, 0).toLocaleString()} Gs</span></p>
                 <p className="flex justify-between items-center pt-2 border-t border-gray-300"><span className="text-gray-600 font-bold">Saldo Pendiente:</span> <span className="font-black text-red-600 text-lg">{cuotas.filter(c => c.estado === 'pendiente').reduce((sum, c) => sum + c.monto, 0).toLocaleString()} Gs</span></p>
               </div>
            </div>
          </div>
          {canEdit && huboCambios && (
            <div className="p-4 bg-amber-50 border-t border-amber-200 flex justify-between items-center shrink-0 print:hidden shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)] z-10">
              <span className="text-amber-800 font-bold flex items-center"><AlertCircle className="mr-2"/> Cambios sin guardar. Recuerda dar clic al botón verde.</span>
              <button onClick={guardarCambios} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-green-700 transition-colors flex items-center"><CheckCircle className="mr-2" size={18}/> Guardar Pagos</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const ModalHistorialFacturas = ({ institucionNombre, onClose }) => {
    const historial = facturas.filter(f => f.institucionNombre === institucionNombre);
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center mb-6 shrink-0 border-b pb-4">
            <div><h2 className="text-2xl font-bold text-gray-800 flex items-center"><History className="mr-3 text-orange-600" /> Historial de Facturación</h2><p className="text-gray-500 font-medium">{institucionNombre}</p></div>
            <button onClick={onClose} className="bg-gray-100 p-2 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"><X size={24} /></button>
          </div>
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-4">
              {historial.map((f) => (
                <div key={f.id} className="bg-gray-50 border border-gray-200 p-5 rounded-lg flex justify-between items-center hover:bg-white hover:shadow-md transition-all">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg mb-1">{f.nroFactura || 'Sin Nro (Borrador)'}</h3>
                    <p className="text-sm text-gray-500 flex items-center"><Clock size={14} className="mr-1"/> Emitida: {f.fechaEmision || 'N/A'}</p>
                    <p className="text-sm text-gray-500 mt-1 font-medium">Monto: <span className="text-orange-600 font-bold">{parseFloat(f.montoTotal).toLocaleString()} Gs</span> ({f.plazoMeses} cuotas)</p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3
                      ${f.estadoGeneral === 'completada' ? 'bg-green-100 text-green-800' : 
                        f.estadoGeneral === 'pendiente' ? 'bg-amber-100 text-amber-800' : 
                        f.estadoGeneral === 'no_renovada' ? 'bg-slate-200 text-slate-800' : 
                        f.estadoGeneral === 'incompleta' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                      {f.estadoGeneral === 'no_renovada' ? 'FINALIZADA' : f.estadoGeneral || 'ACTIVA'}
                    </span>
                    <div className="flex space-x-2">
                      <button onClick={() => { setShowHistorial(false); setFacturaSeleccionada(f); setShowPagos(true); }} className="text-orange-600 hover:text-orange-800 text-sm font-bold flex items-center bg-orange-50 px-3 py-1.5 rounded">
                        Ver detalle <FileText size={16} className="ml-1"/>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const obtenerVencimientosCercanos = () => {
    const hoy = new Date();
    const alertas = [];
    facturas.forEach(factura => {
      if (factura.estadoGeneral === 'completada' || factura.estadoGeneral === 'no_renovada' || factura.estadoGeneral === 'incompleta') return;
      factura.cuotas?.forEach(cuota => {
        if(cuota.estado === 'pendiente') {
          const vto = new Date(cuota.fechaVencimiento);
          vto.setMinutes(vto.getMinutes() + vto.getTimezoneOffset());
          const diffDays = Math.ceil((vto - hoy) / (1000 * 60 * 60 * 24));
          if(diffDays <= 15) { 
             alertas.push({ institucion: factura.institucionNombre, cuotaNum: cuota.numero, vencimiento: cuota.fechaVencimiento, dias: diffDays, urgencia: diffDays < 0 ? 'vencido' : (diffDays <= 5 ? 'rojo' : 'amarillo') });
          }
        }
      });
    });
    return alertas.sort((a,b) => a.dias - b.dias);
  };
  
  const alertas = obtenerVencimientosCercanos();
  const facturasActivas = facturas.filter(f => f.estadoGeneral !== 'incompleta');
  const facturasFiltradas = facturasActivas.filter(f => {
    const matchSearch = f.institucionNombre.toLowerCase().includes(searchTerm.toLowerCase()) || (f.nroFactura && f.nroFactura.includes(searchTerm));
    const estadoActual = f.estadoGeneral || 'activa';
    const matchEstado = filtroEstado === 'todos' || estadoActual === filtroEstado;
    return matchSearch && matchEstado;
  });

  const handleRenovarFactura = async (f) => {
    confirmar(
      'Renovar factura',
      `¿Iniciar una nueva factura para "${f.institucionNombre}"? La actual se marcará como "Finalizada".`,
      async () => {
        try {
          await updateDoc(doc(db, 'facturas', f.id), { estadoGeneral: 'no_renovada' });
          await logAuditoria(f.id, 'Renovación Iniciada', `La factura ${f.nroFactura} fue finalizada para dar paso a una nueva.`);
          setDatosRenovacion({ institucionNombre: f.institucionNombre, ruc: f.ruc, montoTotal: f.montoTotal, plazoMeses: f.plazoMeses, institucionId: f.institucionId });
          setShowNuevaFactura(true);
        } catch (error) { sileo.error({ title: 'Error al renovar', description: error.message }); }
      }
    );
  };

  const handleDeleteFactura = async (f) => {
    confirmar(
      'Eliminar factura',
      `¿Eliminar la factura ${f.nroFactura} de ${f.institucionNombre}? Esta acción no se puede deshacer.`,
      async () => {
        try {
          await deleteDoc(doc(db, 'facturas', f.id));
          await logAuditoria(f.id, 'Eliminación de Factura', `Se eliminó la factura ${f.nroFactura}.`);
        } catch (error) { sileo.error({ title: 'Error al eliminar', description: error.message }); }
      }
    );
  };

  return (
    <div className="p-6 sm:p-10 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center"><Calculator className="mr-3 text-orange-600" size={32}/> Módulo de Facturación</h1>
          <p className="text-gray-600 font-medium mt-1">Gestión de estados de cuenta y cobros</p>
        </div>
        {canEdit && (
          <button onClick={() => { setDatosRenovacion(null); setShowNuevaFactura(true); }} className="bg-orange-600 text-white px-5 py-3 rounded-lg font-bold flex items-center shadow-sm hover:bg-orange-700 transition-colors">
            <PlusCircle size={20} className="mr-2" /> Agregar Factura
          </button>
        )}
      </div>

      {institucionesSinFacturar.length > 0 && canEdit && (
        <div className="mb-8 bg-orange-50 border-l-4 border-orange-500 p-5 rounded-lg shadow-sm">
          <div className="flex items-start">
            <AlertCircle className="text-orange-500 mr-3 mt-0.5" size={24}/>
            <div className="flex-1 w-full">
              <h3 className="font-bold text-orange-900 text-lg">Pendientes de Facturación ({institucionesSinFacturar.length})</h3>
              <p className="text-sm text-orange-800 mb-4">Se han creado las siguientes instituciones pero aún no se han cargado sus datos de facturación (RUC y Nro de Factura).</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-2 pb-2">
                {institucionesSinFacturar.map(inst => (
                  <div key={inst.id} className="bg-white p-3 rounded-lg shadow-sm border border-orange-200 flex justify-between items-center hover:border-orange-400 transition-colors">
                    <div className="truncate pr-2">
                      <p className="font-bold text-gray-800 text-sm truncate">{inst.nombre}</p>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">Monto: {formatearMonto(inst.montoTotal, monedaDe(inst))} {monedaDe(inst)} | {inst.plazoMeses || 1} Mes(es)</p>
                    </div>
                    <button 
                      onClick={() => {
                        setDatosRenovacion({ institucionNombre: inst.nombre, institucionId: inst.id, montoTotal: inst.montoTotal || '', plazoMeses: inst.plazoMeses || '1' });
                        setShowNuevaFactura(true);
                      }} 
                      className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-3 py-2 rounded-md transition-colors shadow-sm shrink-0"
                    >
                      Completar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {alertas.length > 0 && (
        <div className="mb-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center"><Clock className="mr-2 text-orange-500" size={20}/> Alertas de Pago</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alertas.map((alerta, idx) => (
              <div key={idx} className={`p-4 rounded-lg border-l-4 shadow-sm flex items-center transition-all hover:scale-[1.02] ${alerta.urgencia === 'vencido' || alerta.urgencia === 'rojo' ? 'bg-red-50 border-red-500' : 'bg-amber-50 border-amber-500'}`}>
                <AlertCircle className={`mr-3 size-7 ${alerta.urgencia === 'vencido' || alerta.urgencia === 'rojo' ? 'text-red-500' : 'text-amber-500'}`} />
                <div>
                  <p className="font-bold text-gray-900 leading-tight">{alerta.institucion} <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded uppercase border border-gray-200 ml-1 text-gray-600">Cuota {alerta.cuotaNum}</span></p>
                  <p className={`text-sm font-bold mt-1 ${alerta.urgencia === 'vencido' || alerta.urgencia === 'rojo' ? 'text-red-700' : 'text-amber-700'}`}>{alerta.urgencia === 'vencido' ? `VENCIDO hace ${Math.abs(alerta.dias)} días` : `Vence en ${alerta.dias} días`} ({alerta.vencimiento})</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input type="text" placeholder="Buscar por institución o nro de factura..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg w-full bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
          </div>
          <div className="relative md:w-64">
             <Filter className="absolute left-3 top-3 text-gray-400" size={20} />
             <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg w-full bg-white text-gray-700 outline-none cursor-pointer focus:ring-2 focus:ring-orange-500 transition-all font-medium appearance-none">
               <option value="todos">Todos los Estados</option>
               <option value="activa">Activas</option>
               <option value="completada">Completadas</option>
               <option value="pendiente">Pendientes</option>
               <option value="no_renovada">Finalizadas</option>
             </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200 text-gray-600 uppercase text-xs tracking-wider">
                <th className="p-4 font-bold">Institución</th><th className="p-4 font-bold">Nro. Factura</th><th className="p-4 font-bold">Monto Total</th>
                <th className="p-4 font-bold">Progreso</th><th className="p-4 font-bold text-center">Estado</th><th className="p-4 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? <tr><td colSpan="6" className="text-center py-12"><Loader2 className="mx-auto animate-spin text-orange-500 mb-2" size={32}/><p className="text-gray-500">Cargando facturas...</p></td></tr>
              : facturasFiltradas.length === 0 ? <tr><td colSpan="6" className="text-center py-12 text-gray-500"><Calculator className="mx-auto text-gray-300 mb-3" size={40}/> No se encontraron facturas registradas.</td></tr>
              : facturasFiltradas.map(f => {
                const pagadas = f.cuotas?.filter(c => c.estado === 'pagado').length || 0;
                const estadoGeneral = f.estadoGeneral || 'activa';
                const notasCount = f.notas?.length || 0;
                
                return (
                  <tr key={f.id} className="hover:bg-orange-50/30 transition-colors">
                    <td className="p-4 font-bold text-gray-800">{f.institucionNombre}</td>
                    <td className="p-4 text-gray-600 font-medium">{f.nroFactura}</td>
                    <td className="p-4 font-black text-orange-600">{parseFloat(f.montoTotal).toLocaleString()} Gs</td>
                    <td className="p-4">
                      <div className="flex items-center justify-between mb-1 text-xs font-bold text-gray-500"><span>{pagadas} de {f.plazoMeses}</span><span>{Math.round((pagadas/f.plazoMeses)*100)}%</span></div>
                      <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-emerald-500 h-2 rounded-full transition-all" style={{width: `${(pagadas/f.plazoMeses)*100}%`}}></div></div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                        ${estadoGeneral === 'completada' ? 'bg-green-100 text-green-800' : estadoGeneral === 'pendiente' ? 'bg-amber-100 text-amber-800' : estadoGeneral === 'no_renovada' ? 'bg-slate-200 text-slate-800' : 'bg-blue-100 text-blue-800'}`}>
                        {estadoGeneral === 'no_renovada' ? 'FINALIZADA' : estadoGeneral}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button onClick={() => { setFacturaSeleccionada(f); setShowPagos(true); }} className="bg-orange-100 text-orange-700 p-2 rounded-lg hover:bg-orange-200 shadow-sm" title="Ver Estado de Cuenta (PDF)"><FileText size={18} /></button>
                        {canEdit && <button onClick={() => { setFacturaSeleccionada(f); setShowEditarFactura(true); }} className="bg-blue-100 text-blue-700 p-2 rounded-lg hover:bg-blue-200 shadow-sm" title="Editar Nro, Monto o Plazo"><Edit3 size={18} /></button>}
                        {canEdit && <button onClick={() => { setFacturaSeleccionada(f); setShowNotas(true); }} className="bg-yellow-100 text-yellow-700 p-2 rounded-lg hover:bg-yellow-200 shadow-sm relative" title="Notas y Comentarios"><MessageCircle size={18} />{notasCount > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">{notasCount}</span>}</button>}
                        {canEdit && <button onClick={() => handleRenovarFactura(f)} className="bg-green-100 text-green-700 p-2 rounded-lg hover:bg-green-200 shadow-sm" title="Renovar / Crear Nueva de esta Institución"><Copy size={18} /></button>}
                        <button onClick={() => { setFacturaSeleccionada(f); setShowHistorial(true); }} className="bg-slate-100 text-slate-700 p-2 rounded-lg hover:bg-slate-200 shadow-sm" title="Ver Historial de la Institución"><History size={18} /></button>
                        <button onClick={() => { setFacturaSeleccionada(f); setShowAuditoria(true); }} className="bg-indigo-100 text-indigo-700 p-2 rounded-lg hover:bg-indigo-200 shadow-sm" title="Auditoría"><ShieldAlert size={18} /></button>
                        {canEdit && <button onClick={() => handleDeleteFactura(f)} className="bg-red-100 text-red-700 p-2 rounded-lg hover:bg-red-200 shadow-sm" title="Eliminar Factura"><Trash2 size={18} /></button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showNuevaFactura && <ModalNuevaFactura datosPreCargados={datosRenovacion} onClose={() => {setShowNuevaFactura(false); setDatosRenovacion(null);}} />}
      {showEditarFactura && facturaActual && <ModalEditarFactura factura={facturaActual} onClose={() => { setShowEditarFactura(false); setFacturaSeleccionada(null); }} />}
      {showPagos && facturaActual && <ModalPagos factura={facturaActual} onClose={() => { setShowPagos(false); setFacturaSeleccionada(null); }} />}
      {showNotas && facturaActual && <ModalNotasFactura factura={facturaActual} onClose={() => { setShowNotas(false); setFacturaSeleccionada(null); }} />}
      {showHistorial && facturaActual && <ModalHistorialFacturas institucionNombre={facturaActual.institucionNombre} onClose={() => { setShowHistorial(false); setFacturaSeleccionada(null); }} />}
      {showAuditoria && facturaActual && <ModalAuditoria institucionId={facturaActual.id} institucionNombre={`Factura ${facturaActual.nroFactura} - ${facturaActual.institucionNombre}`} onClose={() => { setShowAuditoria(false); setFacturaSeleccionada(null); }} />}
      
    </div>
  );
};

export default Facturacion;