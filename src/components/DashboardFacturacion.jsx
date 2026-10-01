// src/components/DashboardFacturacion.jsx
import React, { useState, useEffect } from 'react';
import { PieChart, Calculator, AlertCircle, Clock, CheckCircle, FileSpreadsheet, Search, Filter, Loader2, DollarSign } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { descargarLibro, hojaDesdeObjetos } from '../utils/excel';

const DashboardFacturacion = () => {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [filtroEstadoPago, setFiltroEstadoPago] = useState('todos');

  useEffect(() => {
    const q = query(collection(db, 'facturas'), where('estadoGeneral', 'in', ['activa', 'pendiente']));
    const unsub = onSnapshot(q, (snapshot) => {
      const factData = [];
      snapshot.forEach(doc => factData.push({ id: doc.id, ...doc.data() }));
      setFacturas(factData);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const getEstadoFinanciero = (factura) => {
    const hoy = new Date();
    let hasVencido = false;
    let minDays = Infinity;

    if (!factura.cuotas || factura.cuotas.length === 0) return { texto: 'Sin Cuotas', clase: 'text-slate-500 bg-slate-100 border border-slate-200', valor: 'al_dia' };

    const todasPagadas = factura.cuotas.every(c => c.estado === 'pagado');
    if (todasPagadas) return { texto: 'Al Día (Pagado)', clase: 'text-green-700 bg-green-50 border border-green-200', valor: 'al_dia' };

    factura.cuotas.forEach(cuota => {
      if (cuota.estado === 'pendiente') {
        const vto = new Date(cuota.fechaVencimiento);
        vto.setMinutes(vto.getMinutes() + vto.getTimezoneOffset());
        const diffDays = Math.ceil((vto - hoy) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) hasVencido = true;
        if (diffDays >= 0 && diffDays < minDays) minDays = diffDays;
      }
    });

    if (hasVencido) return { texto: 'Vencido', clase: 'text-red-700 bg-red-50 border border-red-200', valor: 'vencidos' };
    if (minDays <= 3) return { texto: `Por Vencer (${minDays} días)`, clase: 'text-amber-800 bg-amber-50 border border-amber-300', valor: 'vencer_3' };
    if (minDays <= 5) return { texto: `Por Vencer (${minDays} días)`, clase: 'text-yellow-800 bg-yellow-50 border border-yellow-250', valor: 'vencer_5' };
    if (minDays <= 7) return { texto: `Por Vencer (${minDays} días)`, clase: 'text-orange-850 bg-orange-50 border border-orange-200', valor: 'vencer_7' };
    
    return { texto: 'Al Día', clase: 'text-emerald-700 bg-emerald-50 border border-emerald-200', valor: 'al_dia' };
  };

  const datosFiltrados = facturas.filter(f => {
    const estado = getEstadoFinanciero(f);
    const matchBusqueda = f.institucionNombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = filtroCategoria === 'todos' || f.categoria === filtroCategoria;
    
    let matchEstado = true;
    if (filtroEstadoPago !== 'todos') {
      if (filtroEstadoPago === 'vencidos') matchEstado = estado.valor === 'vencidos';
      else if (filtroEstadoPago === 'al_dia') matchEstado = estado.valor === 'al_dia';
      else if (filtroEstadoPago === 'vencer_7') matchEstado = ['vencer_7','vencer_5','vencer_3'].includes(estado.valor);
      else if (filtroEstadoPago === 'vencer_5') matchEstado = ['vencer_5','vencer_3'].includes(estado.valor);
      else if (filtroEstadoPago === 'vencer_3') matchEstado = estado.valor === 'vencer_3';
    }

    return matchBusqueda && matchCat && matchEstado;
  });

  const exportarExcel = () => {
    if (datosFiltrados.length === 0) return alert("No hay datos para exportar.");
    const data = datosFiltrados.map(f => {
      const estado = getEstadoFinanciero(f);
      const cobrado = f.cuotas?.filter(c => c.estado === 'pagado').reduce((s, c) => s + c.monto, 0) || 0;
      const pendiente = f.cuotas?.filter(c => c.estado === 'pendiente').reduce((s, c) => s + c.monto, 0) || 0;
      return {
        'Institución': f.institucionNombre,
        'RUC': f.ruc,
        'Categoría': f.categoria || 'Sin Categoría',
        'Nro Factura': f.nroFactura,
        'Estado Financiero': estado.texto,
        'Monto Total (Gs)': f.montoTotal,
        'Cobrado (Gs)': cobrado,
        'Saldo Pendiente (Gs)': pendiente,
        'Plazo (Meses)': f.plazoMeses
      };
    });
    descargarLibro(
      [{ nombre: 'Dashboard_Financiero', hoja: hojaDesdeObjetos(data) }],
      `Resumen_Cuentas_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  const totalCobrar = datosFiltrados.reduce((sum, f) => sum + (f.cuotas?.filter(c => c.estado === 'pendiente').reduce((s,c) => s + c.monto, 0) || 0), 0);
  const totalVencido = datosFiltrados.reduce((sum, f) => {
    if(getEstadoFinanciero(f).valor === 'vencidos') {
      return sum + (f.cuotas?.filter(c => {
         const v = new Date(c.fechaVencimiento); v.setMinutes(v.getMinutes() + v.getTimezoneOffset());
         return c.estado === 'pendiente' && v < new Date();
      }).reduce((s,c) => s + c.monto, 0) || 0);
    }
    return sum;
  }, 0);

  if (loading) {
    return (
      <div className="bg-slate-50 p-10 min-h-screen flex justify-center items-center relative overflow-hidden grid-overlay">
        <Loader2 className="animate-spin text-purple-600" size={40}/>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10 bg-slate-50 min-h-screen relative overflow-hidden grid-overlay">
      
      {/* Background Glow Spots */}
      <div className="absolute top-10 left-10 w-96 h-96 rounded-full blur-[150px] glow-spot-orange pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full blur-[150px] glow-spot-purple pointer-events-none"></div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 relative z-10">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 flex items-center tracking-tight">
            <PieChart className="mr-3 text-purple-650" size={32}/> Dashboard Facturación
          </h1>
          <p className="text-slate-500 font-medium mt-1">Resumen de cuentas por cobrar y estado de cartera</p>
        </div>
        <button 
          onClick={exportarExcel} 
          className="mt-4 md:mt-0 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center shadow-lg shadow-emerald-600/10 hover:bg-emerald-700 transition-all active:scale-95"
        >
          <FileSpreadsheet size={18} className="mr-2"/> Exportar Excel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 relative z-10">
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 border-l-4 border-amber-500 flex items-center justify-between shadow-md">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Pendiente (Proyectado)</p>
            <p className="text-3xl font-black text-amber-600">{totalCobrar.toLocaleString()} Gs</p>
          </div>
          <DollarSign size={40} className="text-amber-200" />
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 border-l-4 border-red-500 flex items-center justify-between shadow-md">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Monto Vencido (Atrasado)</p>
            <p className="text-3xl font-black text-red-600">{totalVencido.toLocaleString()} Gs</p>
          </div>
          <AlertCircle size={40} className="text-red-200" />
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-slate-200/80 mb-6 flex flex-col md:flex-row gap-4 relative z-10 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar institución..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm transition-all" 
          />
        </div>
        <select 
          value={filtroCategoria} 
          onChange={e => setFiltroCategoria(e.target.value)} 
          className="p-2.5 border border-slate-200 rounded-lg bg-white text-slate-700 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm font-medium cursor-pointer transition-all"
        >
          <option value="todos">Todas las Categorías</option>
          <option value="BUSINESS Micro">BUSINESS Micro</option>
          <option value="BUSINESS Pequeña">BUSINESS Pequeña</option>
          <option value="BUSINESS Mediana">BUSINESS Mediana</option>
          <option value="Plan Premium">Plan Premium</option>
          <option value="Plan Premium Gold">Plan Premium Gold</option>
        </select>
        <select 
          value={filtroEstadoPago} 
          onChange={e => setFiltroEstadoPago(e.target.value)} 
          className="p-2.5 border border-slate-200 rounded-lg bg-white text-slate-700 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm font-medium cursor-pointer transition-all"
        >
          <option value="todos">Todos los Estados</option>
          <option value="al_dia">Al Día</option>
          <option value="vencidos">Vencidos (Rojo)</option>
          <option value="vencer_7">Por Vencer (Próx. 7 días)</option>
          <option value="vencer_5">Por Vencer (Próx. 5 días)</option>
          <option value="vencer_3">Por Vencer (Próx. 3 días)</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 overflow-x-auto relative z-10 shadow-md">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
              <th className="p-4 font-bold">Institución / Categoría</th>
              <th className="p-4 font-bold text-center">Estado Financiero</th>
              <th className="p-4 font-bold text-right">Saldo Pendiente</th>
              <th className="p-4 font-bold text-center">Avance Cuotas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-750">
            {datosFiltrados.length === 0 ? (
              <tr><td colSpan="4" className="text-center py-10 text-slate-400 font-medium">No hay datos que coincidan con los filtros.</td></tr>
            ) : datosFiltrados.map(f => {
              const estado = getEstadoFinanciero(f);
              const pendiente = f.cuotas?.filter(c => c.estado === 'pendiente').reduce((s,c) => s + c.monto, 0) || 0;
              const pagadas = f.cuotas?.filter(c => c.estado === 'pagado').length || 0;

              return (
                <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-slate-800">{f.institucionNombre}</p>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase mt-1 inline-block">{f.categoria || 'Sin Categoría'}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${estado.clase}`}>
                      {estado.texto}
                    </span>
                  </td>
                  <td className="p-4 text-right font-black text-slate-850">{pendiente.toLocaleString()} Gs</td>
                  <td className="p-4 text-center">
                    <div className="w-full max-w-[120px] mx-auto bg-slate-200 rounded-full h-2 mb-1 overflow-hidden border border-slate-300/30 shadow-inner">
                      <div className="bg-emerald-500 h-full rounded-full shadow-sm shadow-emerald-500/20" style={{width: `${(pagadas/f.plazoMeses)*100}%`}}></div>
                    </div>
                    <span className="text-xs text-slate-500 font-bold">{pagadas} / {f.plazoMeses}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default DashboardFacturacion;