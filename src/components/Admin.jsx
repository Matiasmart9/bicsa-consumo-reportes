// src/components/Admin.jsx
import React, { useState } from 'react';
import { 
  Shield, 
  Users, 
  Building, 
  BarChart3, 
  Activity, 
  Database,
  TrendingUp,
  CheckCircle,
  Clock,
  RefreshCw,
  UserCog,  // 🆕 Icono para Gestión de Usuarios
  AlertCircle // 🔧 AGREGAR ESTE IMPORT QUE FALTABA
} from 'lucide-react';
import { useInstituciones, useEstadisticas } from '../hooks/useFirebase';
import DashboardExcel from './DashboardExcel';
import { etiquetaEstado, formatearFecha } from '../utils/excel';
import { sileo } from './sileo'
import GestionUsuarios from './GestionUsuarios';  // 🆕 Importar el componente

const Admin = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);

  // Hooks para datos
  const { instituciones, loading } = useInstituciones();
  const estadisticas = useEstadisticas();

  // Función para refrescar
  const handleRefresh = async () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      sileo.success({ title: 'Datos actualizados', description: 'El sistema se actualizó exitosamente.' });
    }, 1500);
  };

  // Render del Dashboard
  const renderDashboard = () => {
    // Verificar que los datos estén disponibles
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
            <p className="text-gray-600">Cargando datos del sistema...</p>
          </div>
        </div>
      );
    }

    // 🆕 CALCULAR INSTITUCIONES PENDIENTES
    const institucionesPendientes = instituciones ? instituciones.filter(inst => 
      inst.estado === 'pendiente' || inst.estado === 'Pendiente'
    ).length : 0;

    const institucionesActivas = instituciones ? instituciones.filter(inst =>
      inst.estado === 'activo' || !inst.estado
    ).length : 0;

    const institucionesVencidas = instituciones ? instituciones.filter(inst => 
      inst.estado === 'vencido'
    ).length : 0;

    return (
      <div className="space-y-6">
        {/* Estadísticas principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex items-center">
              <Building className="text-blue-600 mr-3" size={32} />
              <div>
                <p className="text-sm text-gray-500">Total Instituciones</p>
                <p className="text-2xl font-bold text-gray-800">{estadisticas.totalInstituciones || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex items-center">
              <Users className="text-green-600 mr-3" size={32} />
              <div>
                <p className="text-sm text-gray-500">Instituciones Activas</p>
                <p className="text-2xl font-bold text-gray-800">{institucionesActivas}</p>
              </div>
            </div>
          </div>

          {/* 🆕 NUEVA TARJETA: INSTITUCIONES PENDIENTES */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex items-center">
              <Clock className="text-yellow-600 mr-3" size={32} />
              <div>
                <p className="text-sm text-gray-500">Instituciones Pendientes</p>
                <p className="text-2xl font-bold text-gray-800">{institucionesPendientes}</p>
              </div>
            </div>
          </div>
          
          {/* 🆕 NUEVA TARJETA: INSTITUCIONES VENCIDAS */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex items-center">
              <AlertCircle className="text-red-600 mr-3" size={32} />
              <div>
                <p className="text-sm text-gray-500">Instituciones No Renovadas</p>
                <p className="text-2xl font-bold text-gray-800">{institucionesVencidas}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Estado del sistema */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Estado del Sistema</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="text-green-600 mr-2" size={20} />
              <span className="text-green-600 font-medium">Sistema Operativo</span>
            </div>
            <div className="text-sm text-gray-500">
              Última actualización: {new Date().toLocaleString('es-ES')}
            </div>
          </div>
        </div>

        {/* Instituciones recientes */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Instituciones Registradas</h3>
          {instituciones && instituciones.length > 0 ? (
            <div className="space-y-3">
              {instituciones.slice(0, 5).map((institucion, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="text-green-600 mr-3" size={16} />
                    <div>
                      <p className="font-medium text-gray-800">{institucion.nombre}</p>
                      <p className="text-sm text-gray-500">
                        {(institucion.contrato?.asignadas || 0).toLocaleString()} consultas asignadas
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      institucion.estado === 'activo' ? 'bg-green-100 text-green-700' :
                      institucion.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700' :
                      institucion.estado === 'vencido' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {etiquetaEstado(institucion.estado)}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">{formatearFecha(institucion.fechaCreacion)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Activity className="mx-auto mb-2" size={32} />
              <p>No hay instituciones registradas</p>
              <p className="text-sm">Ve a la sección Instituciones para registrar la primera</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 sm:p-10 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Shield size={32} className="mr-3 text-blue-700"/>
            Panel de Administración
          </h1>
          <p className="text-gray-600 mt-1">Gestión del sistema MiPyme Monitor - BICSA</p>
        </div>
        <button 
          onClick={handleRefresh}
          className="bg-blue-600 text-white px-5 py-3 rounded-lg font-semibold flex items-center hover:bg-green-700 transition-all shadow-sm"
          disabled={isLoading}
        >
          <RefreshCw size={20} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`}/>
          Actualizar
        </button>
      </div>

      {/* 🆕 NAVEGACIÓN POR TABS ACTUALIZADA */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 size={20} className="inline mr-2" />
              Dashboard
            </button>
            
            <button
              onClick={() => setActiveTab('datos')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'datos'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Database size={20} className="inline mr-2" />
              Gestión de Datos
            </button>

            {/* 🆕 NUEVO TAB: GESTIÓN DE USUARIOS */}
            <button
              onClick={() => setActiveTab('usuarios')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'usuarios'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UserCog size={20} className="inline mr-2" />
              Gestión de Usuarios
            </button>
          </nav>
        </div>
      </div>

      {/* 🆕 CONTENIDO SEGÚN TAB ACTIVO ACTUALIZADO */}
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'datos' && <DashboardExcel />}
      {activeTab === 'usuarios' && <GestionUsuarios />}
    </div>
  );
};

export default Admin;