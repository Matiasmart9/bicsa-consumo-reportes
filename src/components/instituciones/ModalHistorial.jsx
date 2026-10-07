// src/components/instituciones/ModalHistorial.jsx
import React from 'react';
import {
  Clock,
  History,
  X
} from 'lucide-react';
import { monedaDe, formatearMonto } from '../../utils/moneda';

const ModalHistorial = ({ institucion, onClose }) => {
  const historial = institucion.historial || [];

  // Totales separados por moneda: nunca se suman PYG con USD
  const totalesPorMoneda = {};
  [
    { monto: institucion.montoTotal || 0, moneda: monedaDe(institucion) },
    ...historial.map(p => ({ monto: p.montoTotal || institucion.montoTotal || 0, moneda: monedaDe(p) }))
  ].forEach(({ monto, moneda }) => { totalesPorMoneda[moneda] = (totalesPorMoneda[moneda] || 0) + monto; });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <History className="mr-3 text-blue-600" size={28} />
            Historial de {institucion.nombre}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {historial.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">Sin historial disponible</h3>
            <p className="text-gray-500">
              El historial aparecerá cuando se renueve el contrato de esta institución.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* LTV Acumulado (Punto 4) */}
            <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-lg flex flex-col md:flex-row items-center justify-between shadow-sm">
              <div className="mb-2 md:mb-0">
                <h3 className="text-emerald-800 font-bold text-lg flex items-center">
                  <span className="bg-emerald-200 p-1.5 rounded-full mr-2">💰</span>
                  Historial Financiero (LTV Acumulado)
                </h3>
                <p className="text-emerald-700 text-sm mt-1">Valor histórico total invertido por este cliente sumando todos sus períodos documentados.</p>
              </div>
              <div className="text-3xl font-black text-emerald-700 tracking-tight text-right drop-shadow-sm">
                {Object.entries(totalesPorMoneda).map(([m, v]) => `${formatearMonto(v, m)} ${m}`).join(' + ')}
              </div>
            </div>

            {/* Período Actual */}
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-blue-800 flex items-center">
                  <div className="w-3 h-3 bg-blue-600 rounded-full mr-3"></div>
                  Período Actual
                </h3>
                <span className="text-xs text-blue-600 bg-blue-100 px-3 py-1 rounded-full font-medium">
                  ACTIVO
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-600 font-medium">Inicio:</span>
                  <div className="font-medium text-gray-800">
                    {institucion.contrato?.fechaInicio ? 
                      new Date(institucion.contrato.fechaInicio).toLocaleDateString('es-ES') : 
                      institucion.fechaCreacion
                    }
                  </div>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Vence:</span>
                  <div className="font-medium text-gray-800">{institucion.contrato?.fechaFin}</div>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Consultas:</span>
                  <div className="font-medium text-gray-800">{institucion.contrato?.asignadas?.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Consumidas:</span>
                  <div className="font-medium text-gray-800">{institucion.contrato?.consumidas?.toLocaleString()}</div>
                </div>
              </div>

              {institucion.ultimaRenovacion?.comentario && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div className="bg-white p-4 rounded-lg border border-blue-100">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">💬</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium text-gray-800">Comentario de Renovación</h4>
                          <span className="text-xs text-gray-500">
                            {new Date(institucion.ultimaRenovacion.fecha).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          "{institucion.ultimaRenovacion.comentario}"
                        </p>
                        {institucion.ultimaRenovacion.renovadoPor && (
                          <p className="text-xs text-gray-500 mt-1">
                            Por: {institucion.ultimaRenovacion.renovadoPor}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Períodos Anteriores */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <div className="w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
                Períodos Anteriores ({historial.length})
              </h3>
              
              <div className="space-y-4">
                {historial
                  .slice() 
                  .reverse() 
                  .map((periodo, reverseIndex) => {
                  const numeroPeriodo = historial.length - reverseIndex;
                  
                  return (
                    <div key={reverseIndex} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-medium text-gray-800 flex items-center">
                          <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                            <span className="text-white text-xs font-bold">{numeroPeriodo}</span>
                          </div>
                          Período #{numeroPeriodo}
                          {numeroPeriodo === 1 && (
                            <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                              Primer Histórico
                            </span>
                          )}
                        </h4>
                        <div className="text-right">
                          <span className="text-xs text-gray-500 block">Renovado:</span>
                          <span className="text-sm font-medium text-gray-700">
                            {new Date(periodo.fechaRenovacion).toLocaleDateString('es-ES')}
                          </span>
                          {periodo.renovadoPor && (
                            <div className="text-xs text-gray-500 mt-1">
                              Por: {periodo.renovadoPor}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                        <div>
                          <span className="text-gray-600 font-medium">Período:</span>
                          <div className="font-medium text-gray-800">
                            {new Date(periodo.periodoInicio).toLocaleDateString('es-ES')} - {new Date(periodo.periodoFin).toLocaleDateString('es-ES')}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600 font-medium">Duración:</span>
                          <div className="font-medium text-gray-800">{periodo.duracionMeses} meses</div>
                        </div>
                        <div>
                          <span className="text-gray-600 font-medium">Consultas Asignadas:</span>
                          <div className="font-medium text-gray-800">{periodo.consultasAsignadas?.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 font-medium">Consultas Consumidas:</span>
                          <div className="font-medium text-gray-800">{periodo.consultasConsumidas?.toLocaleString()}</div>
                        </div>
                      </div>

                      {periodo.comentario && (
                        <div className="mb-4">
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <div className="flex items-start space-x-3">
                              <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs">💬</span>
                              </div>
                              <div className="flex-1">
                                <h5 className="text-sm font-medium text-gray-800 mb-1">Comentario de Renovación</h5>
                                <p className="text-sm text-gray-700 leading-relaxed italic">
                                  "{periodo.comentario}"
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {periodo.consumoPorMes && Object.keys(periodo.consumoPorMes).length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-3">Consumo Mensual del Período:</h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                            {Object.entries(periodo.consumoPorMes)
                              .sort(([a], [b]) => a.localeCompare(b))
                              .map(([mes, consumo]) => (
                              <div key={mes} className="bg-white p-3 rounded border text-center">
                                <div className="text-xs text-gray-600 font-medium">
                                  {new Date(mes + '-01T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'short' })}
                                </div>
                                <div className="font-bold text-sm text-gray-800">{consumo.toLocaleString()}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t border-gray-300">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-lg font-bold text-gray-800">
                              {periodo.consultasAsignadas > 0 ? 
                                ((periodo.consultasConsumidas / periodo.consultasAsignadas) * 100).toFixed(1) : 0
                              }%
                            </div>
                            <div className="text-xs text-gray-600">Porcentaje de Uso</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-green-600">
                              {(periodo.consultasAsignadas || 0) - (periodo.consultasConsumidas || 0)}
                            </div>
                            <div className="text-xs text-gray-600">Consultas No Utilizadas</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-blue-600">
                              {Object.keys(periodo.consumoPorMes || {}).length}
                            </div>
                            <div className="text-xs text-gray-600">Meses Registrados</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-end pt-6 border-t border-gray-200">
          <button 
            onClick={onClose}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalHistorial;
