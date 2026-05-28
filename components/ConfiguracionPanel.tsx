import React, { useRef, useMemo } from 'react';
import {
  Settings2, Clock, Calendar as CalendarIcon, Eye, Plus, FileSpreadsheet,
  Download, Upload, Target, Euro, ToggleRight, ToggleLeft
} from 'lucide-react';

interface ConfiguracionPanelProps {
  projectStart: Date;
  setProjectStart: (date: Date) => void;
  projectEnd: Date;
  setProjectEnd: (date: Date) => void;
  isRelativeTime: boolean;
  setIsRelativeTime: (v: boolean) => void;
  onExport: () => void;
  onExportReport: () => void;
  onImport: (file: File) => void;
  totalCost: number;
  visibleYears: number[];
  setVisibleYears: (years: number[]) => void;
  isClientView?: boolean;
}

export const ConfiguracionPanel: React.FC<ConfiguracionPanelProps> = ({
  projectStart,
  setProjectStart,
  projectEnd,
  setProjectEnd,
  isRelativeTime,
  setIsRelativeTime,
  onExport,
  onExportReport,
  onImport,
  totalCost,
  visibleYears,
  setVisibleYears,
  isClientView = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const projectYears = useMemo(() => {
    const years = [];
    const startYear = projectStart.getFullYear();
    const endYear = projectEnd.getFullYear();
    for (let y = startYear; y <= endYear; y++) {
      years.push(y);
    }
    return years;
  }, [projectStart, projectEnd]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = '';
    }
  };

  return (
    <div className="flex-1 bg-slate-50/40 p-5 md:p-8 xl:p-10 overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto font-sans">
        <div className="flex flex-col lg:flex-row gap-10 items-start">
          
          {/* Left Main Config Column */}
          <div className="flex-1 w-full space-y-8">
            <div className="border-b border-slate-200/80 pb-5">
              <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2.5 font-display">
                <Settings2 className="text-orange-500" size={20} /> Configuración General
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1 select-none">
                Ajusta las condiciones de calendario del proyecto, los filtros por año y exporta/importa copias de respaldo.
              </p>
            </div>

            {/* Time Toggle Control */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-slate-400" />
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest font-display">Formato de Escala de Tiempo</h4>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 uppercase tracking-wide">Alterna la visualización del cronograma</p>
                </div>
              </div>

              <button
                disabled={isClientView}
                onClick={() => setIsRelativeTime(!isRelativeTime)}
                className={`flex items-center gap-2 transition-all ${isClientView ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.01]'}`}
              >
                {isRelativeTime ? (
                  <div className="flex items-center gap-2 select-none">
                    <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Relativo (M1, S1...)</span>
                    <ToggleRight size={28} className="text-orange-500 cursor-pointer" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 select-none">
                    <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Calendario Real</span>
                    <ToggleLeft size={28} className="text-slate-300 cursor-pointer" />
                  </div>
                )}
              </button>
            </div>

            {/* Project Range Limits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-2.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block ml-0.5 font-display">Fecha Inicio del Proyecto</label>
                <div className="flex items-center gap-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/50 px-4 py-2.5 rounded-xl transition-all">
                  <CalendarIcon size={15} className="text-orange-500 shrink-0" />
                  <input
                    type="date"
                    disabled={isClientView}
                    value={(() => {
                      try {
                        return projectStart && !isNaN(projectStart.getTime()) ? projectStart.toISOString().split('T')[0] : '';
                      } catch {
                        return '';
                      }
                    })()}
                    onChange={(e) => {
                      const d = new Date(e.target.value);
                      if (!isNaN(d.getTime())) {
                        setProjectStart(d);
                      }
                    }}
                    className="bg-transparent border-none text-[12px] font-semibold text-slate-800 p-0 focus:ring-0 w-full"
                  />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-2.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block ml-0.5 font-display">Fecha Fin del Proyecto</label>
                <div className="flex items-center gap-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/50 px-4 py-2.5 rounded-xl transition-all">
                  <CalendarIcon size={15} className="text-orange-500 shrink-0" />
                  <input
                    type="date"
                    disabled={isClientView}
                    value={(() => {
                      try {
                        return projectEnd && !isNaN(projectEnd.getTime()) ? projectEnd.toISOString().split('T')[0] : '';
                      } catch {
                        return '';
                      }
                    })()}
                    onChange={(e) => {
                      const d = new Date(e.target.value);
                      if (!isNaN(d.getTime())) {
                        setProjectEnd(d);
                      }
                    }}
                    className="bg-transparent border-none text-[12px] font-semibold text-slate-800 p-0 focus:ring-0 w-full"
                  />
                </div>
              </div>
            </div>

            {/* Visual Years Range Filters */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 select-none">
                <Eye size={15} className="text-orange-500" />
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-display">Pre-filtrar Años Visibles</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {projectYears.map(year => {
                  const isVisible = visibleYears.length === 0 || visibleYears.includes(year);
                  return (
                    <button
                      key={year}
                      onClick={() => {
                        if (visibleYears.includes(year)) {
                          setVisibleYears(visibleYears.filter(y => y !== year));
                        } else {
                          setVisibleYears([...visibleYears, year]);
                        }
                      }}
                      className={`px-3.5 py-2 rounded-xl text-[10px] font-bold transition-all border flex items-center gap-1.5 ${
                        isVisible
                          ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-400 hover:border-orange-200'
                      }`}
                    >
                      {year}
                      {isVisible && <Plus size={12} className="rotate-45" />}
                    </button>
                  );
                })}
                {visibleYears.length > 0 && (
                  <button
                    onClick={() => setVisibleYears([])}
                    className="px-3.5 py-2 rounded-xl text-[9px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 uppercase tracking-wider"
                  >
                    Mostrar Todo
                  </button>
                )}
              </div>
              <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tight leading-relaxed select-none">
                * El filtrado oculta o muestra columnas de años específicos en la línea de tiempo. Por defecto, si no hay selecciones, se muestra el rango global.
              </p>
            </div>

            {/* Backups section */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 select-none">
                <FileSpreadsheet size={15} className="text-orange-500" />
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-display">Portabilidad, Copia de Resguardo & Informes</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={onExport}
                  className="flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-colors"
                >
                  <Download size={13} /> Respaldar (.JSON)
                </button>
                <button
                  onClick={onExportReport}
                  className="flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-colors"
                >
                  <FileSpreadsheet size={13} /> Exportar CSV Tareas
                </button>
                {!isClientView ? (
                  <>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider transition-colors"
                    >
                      <Upload size={13} /> Restaurar (.JSON)
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".json"
                      className="hidden"
                    />
                  </>
                ) : (
                  <div className="flex items-center justify-center p-3 border border-dashed border-slate-200 rounded-xl text-slate-400 text-[10px] font-bold uppercase select-none">
                    Carga deshabilitada
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Summary Totals Column */}
          <div className="w-full lg:w-[360px] space-y-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-display select-none">Presupuestos Globales</h3>
            
            {/* Big budget card */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-5 opacity-5 group-hover:scale-110 transition-transform duration-300">
                <Euro size={72} className="text-orange-500" />
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-display">Presupuesto Proyectado Plan de Trabajo</p>
              <div className="text-3xl font-bold text-slate-800 tracking-tight font-mono">
                {totalCost.toLocaleString()} €
              </div>
              <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider mt-1 leading-normal select-none">
                Basado en horas asignadas multiplicadas por tarifas diarias de perfiles activos.
              </p>
            </div>

            {/* Gauge progress card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 space-y-4 font-sans">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider select-none font-display">
                <span className="text-slate-500">Utilización de Fondos</span>
                <span className="text-orange-600 font-mono">{Math.min(100, (totalCost / 150000) * 100).toFixed(1)}%</span>
              </div>
              <div className="h-2.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${Math.min(100, (totalCost / 150000) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[8px] font-bold text-slate-450 uppercase tracking-wider font-mono select-none font-sans">
                <span>0 €</span>
                <span>Base Límite: 150.000 €</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
