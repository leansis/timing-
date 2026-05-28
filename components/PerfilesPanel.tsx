import React, { useState } from 'react';
import { ProfileRate } from '@/src/types';
import { Plus, Trash2, Users, Euro, ShieldAlert } from 'lucide-react';

interface PerfilesPanelProps {
  profileRates: ProfileRate[];
  onUpdateRates: (newRates: ProfileRate[]) => void;
  isClientView?: boolean;
}

export const PerfilesPanel: React.FC<PerfilesPanelProps> = ({
  profileRates,
  onUpdateRates,
  isClientView = false
}) => {
  const [confirmingIdx, setConfirmingIdx] = useState<number | null>(null);

  const handleAddRole = () => {
    if (isClientView) return;
    const newRoleName = `Perfil ${profileRates.length + 1}`;
    onUpdateRates([...profileRates, { role: newRoleName, rate: 500 }]);
  };

  const handleUpdateRole = (index: number, updates: Partial<ProfileRate>) => {
    if (isClientView) return;
    const next = [...profileRates];
    next[index] = { ...next[index], ...updates };
    onUpdateRates(next);
  };

  const handleDeleteRole = (index: number) => {
    if (isClientView) return;
    onUpdateRates(profileRates.filter((_, i) => i !== index));
    setConfirmingIdx(null);
  };

  return (
    <div className="flex-1 bg-slate-50/40 p-5 md:p-8 xl:p-10 overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top bar descriptor */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2.5 font-display">
              <Users className="text-slate-700" size={20} /> Tarifas de Perfiles Profesionales
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1 select-none">
              Administra los roles de tu equipo y asocia el coste diario en euros para evaluar el presupuesto proyectado.
            </p>
          </div>

          {!isClientView && (
            <button
              onClick={handleAddRole}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all uppercase tracking-wider shadow-md shadow-slate-900/10 hover:scale-[1.01]"
            >
              <Plus size={15} /> Añadir Nuevo Perfil
            </button>
          )}
        </div>

        {/* Read-only warning info banner for client reader */}
        {isClientView && (
          <div className="flex items-center gap-3 bg-blue-50/50 border border-blue-100 p-4 rounded-2xl text-[11px] text-blue-800 font-semibold uppercase tracking-wider">
            <ShieldAlert size={15} className="text-blue-500" />
            Modo Lector Activo - Las tarifas se muestran únicamente en modo informativo sin opción a edición.
          </div>
        )}

        {/* Profiles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {profileRates.map((rate, idx) => (
            <div
              key={idx}
              className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm relative group hover:shadow-md hover:border-slate-300/80 transition-all duration-200 flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Visual Icon Header */}
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-600 transition-colors group-hover:text-slate-800 group-hover:bg-slate-100/50">
                  <Euro size={15} className="stroke-[2.5]" />
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 ml-0.5 font-display">
                      Nombre del Perfil / Rol
                    </label>
                    <input
                      value={rate.role}
                      readOnly={isClientView}
                      onChange={(e) => handleUpdateRole(idx, { role: e.target.value })}
                      className="w-full bg-slate-50/70 border border-slate-200/40 rounded-xl text-[11.5px] font-semibold text-slate-800 focus:ring-2 focus:ring-slate-100 focus:border-slate-400 focus:bg-white py-2 px-3 transition-all"
                      placeholder="Ej: Programador JavaScript"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 ml-0.5 font-display">
                      Tarifa Diaria (€)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] font-bold font-mono">
                        €
                      </span>
                      <input
                        type="number"
                        value={rate.rate}
                        readOnly={isClientView}
                        onChange={(e) => handleUpdateRole(idx, { rate: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-50/70 border border-slate-200/40 rounded-xl text-[11.5px] font-bold text-slate-850 pl-6.5 focus:ring-2 focus:ring-slate-100 focus:border-slate-400 focus:bg-white py-2 px-3 font-mono transition-all"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {!isClientView && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  {confirmingIdx === idx ? (
                    <div className="flex items-center gap-2 w-full justify-between animate-in fade-in slide-in-from-bottom-1 duration-200">
                      <span className="text-[9.5px] font-extrabold text-red-650 uppercase tracking-wider select-none">¿Eliminar perfil?</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDeleteRole(idx)}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-750 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all shadow-xs"
                        >
                          Sí
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingIdx(null)}
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
                        onClick={() => setConfirmingIdx(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Eliminar Perfil"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {profileRates.length === 0 && (
            <div className="col-span-full p-16 text-center border border-dashed border-slate-200 rounded-3xl bg-white flex flex-col items-center justify-center space-y-4 shadow-sm">
              <Users className="text-slate-355" size={32} />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider font-display">No hay perfiles definidos</p>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Añade perfiles para calcular los costes proyectados.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
