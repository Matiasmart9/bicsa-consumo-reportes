// src/components/DashboardExcel.jsx
import React, { useState } from 'react';
import { 
  Download, 
  FileSpreadsheet, 
  Database, 
  TrendingUp, 
  Building,
  Calendar,
  BarChart3,
  Loader2,
  Clock
} from 'lucide-react';
import { generarReporteConsumoExcel } from '../utils/reporteConsumo';
import { useInstituciones, useEstadisticas } from '../hooks/useFirebase';

const DashboardExcel = () => {
  const [isExporting, setIsExporting] = useState(false);
  const { instituciones, loading } = useInstituciones();
  const estadisticas = useEstadisticas();

  const generarReporteExcel = async () => {
    try {
      setIsExporting(true);

      const nombreArchivo = generarReporteConsumoExcel(instituciones);

      // Mensaje de éxito
      alert(`¡Reporte Excel generado exitosamente!\n\nArchivo: ${nombreArchivo}\n\nIncluye:\n- Dashboard: Estadísticas generales\n- Instituciones: Datos detallados e historial\n- Monitoreo Contratos: Vencidos y por vencer\n- Consumo Mensual: Registro completo\n- Análisis Estadístico: Métricas avanzadas`);

    } catch (error) {
      console.error('Error al generar reporte Excel:', error);
      alert(`Error al generar el reporte: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Calcular estadísticas locales
  const institucionesPendientes = instituciones.filter(i => i.estado === 'pendiente').length;
  const totalConsultasConsumidas = instituciones.reduce((total, inst) => total + (inst.contrato?.consumidas || 0), 0);

  if (loading) {
    return (
      <div className="p-8 bg-white rounded-lg shadow-md">
        <div className="flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-blue-600 mr-3" />
          <span className="text-gray-600">Cargando datos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-white rounded-lg shadow-md">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-green-100 p-4 rounded-full">
            <FileSpreadsheet size={48} className="text-green-600" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-4">Exportar Reporte Excel Completo</h2>
        <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
          Genera un reporte completo en formato Excel con todas las estadísticas, datos de instituciones, consumo mensual, historial y análisis estadístico del sistema SegConsumo.
        </p>

        {/* Información del reporte actualizada */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="flex items-center justify-center mb-3">
              <BarChart3 className="text-blue-600" size={32} />
            </div>
            <h3 className="font-semibold text-blue-800 mb-2">Hoja Dashboard</h3>
            <p className="text-blue-600 text-sm">
              Estadísticas generales, resumen por estado y consumo detallado actualizado
            </p>
          </div>

          <div className="bg-purple-50 p-6 rounded-lg">
            <div className="flex items-center justify-center mb-3">
              <Building className="text-purple-600" size={32} />
            </div>
            <h3 className="font-semibold text-purple-800 mb-2">Hoja Instituciones</h3>
            <p className="text-purple-600 text-sm">
              Datos completos, historial de renovaciones con numeración cronológica correcta
            </p>
          </div>

          <div className="bg-green-50 p-6 rounded-lg">
            <div className="flex items-center justify-center mb-3">
              <Calendar className="text-green-600" size={32} />
            </div>
            <h3 className="font-semibold text-green-800 mb-2">Hoja Consumo Mensual</h3>
            <p className="text-green-600 text-sm">
              Registro detallado con porcentajes actualizados del consumo mensual
            </p>
          </div>

          <div className="bg-orange-50 p-6 rounded-lg">
            <div className="flex items-center justify-center mb-3">
              <TrendingUp className="text-orange-600" size={32} />
            </div>
            <h3 className="font-semibold text-orange-800 mb-2">Hoja Análisis</h3>
            <p className="text-orange-600 text-sm">
              Métricas avanzadas, eficiencia y análisis estadístico del sistema
            </p>
          </div>
        </div>

        {/* Estadísticas rápidas actualizadas */}
        <div className="bg-gray-50 p-6 rounded-lg mb-8">
          <h3 className="font-semibold text-gray-800 mb-4">Datos Actualizados a Exportar</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{instituciones.length}</div>
              <div className="text-sm text-gray-600">Instituciones</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{institucionesPendientes}</div>
              <div className="text-sm text-gray-600">Pendientes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {instituciones.filter(i => i.historial && i.historial.length > 0).length}
              </div>
              <div className="text-sm text-gray-600">Con Historial</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {instituciones.reduce((total, inst) => total + (inst.historial ? inst.historial.length : 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Renovaciones</div>
            </div>
          </div>
        </div>

        {/* Botón de exportación */}
        <button
          onClick={generarReporteExcel}
          disabled={isExporting || instituciones.length === 0}
          className="bg-green-600 text-white px-8 py-4 rounded-lg font-semibold flex items-center mx-auto hover:bg-green-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <>
              <Loader2 size={24} className="mr-3 animate-spin" />
              Generando Reporte Completo...
            </>
          ) : (
            <>
              <Download size={24} className="mr-3" />
              Exportar Reporte Completo a Excel
            </>
          )}
        </button>

        {instituciones.length === 0 && (
          <p className="text-red-500 text-sm mt-4">
            No hay datos para exportar. Primero registra algunas instituciones.
          </p>
        )}

        <div className="mt-6 text-xs text-gray-500">
          <p>El archivo se descargará automáticamente en formato .xlsx</p>
          <p>Compatible con Microsoft Excel, Google Sheets y LibreOffice Calc</p>
          <p className="text-green-600 font-medium mt-2">Incluye nueva hoja de Análisis Estadístico con métricas avanzadas</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardExcel;