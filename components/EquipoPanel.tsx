import React, { useState } from 'react';
import { ProjectResource, ProfileRate, ResourceAllocation } from '@/src/types';
import { Plus, Trash2, Users, ShieldAlert, User, Euro, CalendarDays } from 'lucide-react';

interface EquipoPanelProps {
  resources: ProjectResource[];
  profileRates: ProfileRate[];
  allocations: ResourceAllocation;
  validWeeks: Set<string>;
  onAddResource: () => void;
  onRemoveResource: (id: string) => void;
  onUpdateResource: (id: string, updates: Partial<ProjectResource>) => void;
  isClientView?: boolean;
}

export const EquipoPanel: React.FC<EquipoPanelProps> = ({
  resources,
  profileRates,
  allocations,
  validWeeks,
  onAddResource,
  onRemoveResource,
  onUpdateResource,
  isClientView = false
}) => {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  return (
    <div className="flex-1 bg-slate-50/40 p-5 md:p-8 xl:p-10 overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top bar descriptor */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2.5 font-display">
              <Users className="text-orange-500" size={20} /> Equipo de Trabajo
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1 select-none">
              Administra los miembros del equipo asignados al proyecto, define sus roles profesionales y visualiza su asignación global acumulada.
            </p>
          </div>

          {!isClientView && (
            <button
              onClick={onAddResource}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:brightness-[1.05] text-white rounded-xl text-xs font-semibold transition-all uppercase tracking-wider shadow-md shadow-orange-500/10 hover:scale-[1.01]"
            >
              <Plus size={15} /> Añadir Integrante
            </button>
          )}
        </div>

        {/* Read-only warning info banner for client reader */}
        {isClientView && (
          <div className="flex items-center gap-3 bg-blue-50/50 border border-blue-100 p-4 rounded-2xl text-[11px] text-blue-800 font-semibold uppercase tracking-wider">
            <ShieldAlert size={15} className="text-blue-500" />
            Modo Lector Activo - Los integrantes del equipo se muestran únicamente en modo informativo.
          </div>
        )}

        {/* Team Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {resources.map((res) => {
            const rateObj = profileRates.find((r) => r.role === res.role);
            const rate = rateObj?.rate || 0;

            // Calculate individual days
            let allocatedDays = 0;
            Object.entries(allocations[res.id] || {}).forEach(([k, days]) => {
              if (validWeeks.has(k)) {
                allocatedDays += (Number(days) || 0);
              }
            });

            return (
              <div
                key={res.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm relative group hover:shadow-md hover:border-slate-300/80 transition-all duration-200 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Visual Header */}
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-orange-500/5 border border-orange-500/10 flex items-center justify-center">
                      <User className="text-orange-500" size={16} />
                    </div>
                    
                    <span className="text-[9px] font-mono font-bold uppercase text-slate-400 bg-slate-100/80 px-2 py-0.5 rounded-md tracking-wider">
                      ID: {res.id.substring(res.id.length - 4)}
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1 ml-0.5 font-display">
                        Nombre completo
                      </label>
                      <input
                        value={res.name}
                        readOnly={isClientView}
                        onChange={(e) => onUpdateResource(res.id, { name: e.target.value })}
                        className="w-full bg-slate-50/70 border border-slate-200/40 rounded-xl text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-orange-500/20 focus:border-orange-500/50 focus:bg-white py-2.5 px-3.5 transition-all"
                        placeholder="Nombre del integrante"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1 ml-0.5 font-display">
                        Perfil Profesional
                      </label>
                      <select
                        value={res.role}
                        disabled={isClientView}
                        onChange={(e) => onUpdateResource(res.id, { role: e.target.value })}
                        className="w-full bg-slate-50/70 border border-slate-200/50 focus:border-orange-500/50 focus:bg-white focus:ring-1 focus:ring-orange-500/20 rounded-xl text-xs font-bold text-orange-600 py-2.5 px-3.5 cursor-pointer uppercase tracking-wider transition-all"
                      >
                        {profileRates.map((r, idx) => (
                          <option key={idx} value={r.role}>
                            {r.role.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    <div className="space-y-0.5">
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 font-display">
                        <CalendarDays size={9} className="text-orange-500" /> Jornadas
                      </div>
                      <div className="text-[11px] font-bold text-slate-800 font-mono">
                        {allocatedDays.toFixed(1)}j {allocatedDays === 1 ? 'día' : 'días'}
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 font-display">
                        <Euro size={9} className="text-orange-500" /> Coste Est.
                      </div>
                      <div className="text-[11px] font-bold text-slate-850 font-mono whitespace-nowrap">
                        {(allocatedDays * rate).toLocaleString()} €
                      </div>
                    </div>
                  </div>
                </div>

                {!isClientView && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    {confirmingId === res.id ? (
                      <div className="flex items-center gap-2 w-full justify-between animate-in fade-in slide-in-from-bottom-1 duration-200">
                        <span className="text-[9.5px] font-extrabold text-red-600 uppercase tracking-wider select-none">¿Eliminar integrante?</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onRemoveResource(res.id);
                              setConfirmingId(null);
                            }}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-750 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all shadow-xs"
                          >
                            Sí
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingId(null)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all"
                          >
                            No
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end w-full">
                        <button
                          type="button"
                          onClick={() => setConfirmingId(res.id)}
                          className="p-1.5 text-slate-450 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="Retirar Recurso"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {resources.length === 0 && (
            <div className="col-span-full p-16 text-center border border-dashed border-slate-200 rounded-3xl bg-white flex flex-col items-center justify-center space-y-4 shadow-sm">
              <Users className="text-slate-350" size={32} />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider font-display">No hay miembros agregados</p>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Añade integrantes del equipo para comenzar la asignación.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
