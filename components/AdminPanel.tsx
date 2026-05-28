import React, { useMemo, useState, useRef } from 'react';
import { ProjectResource, ResourceAllocation, ProfileRate, ViewMode, Invoice } from '@/src/types';
import {
  Info, DollarSign, Plus, Trash2, BarChart3, ChevronLeft, ChevronRight,
  Calendar as CalendarIcon, Settings2, Target, ToggleLeft, ToggleRight,
  Clock, UserPlus, Users, Download, Upload, FileSpreadsheet, Eye, Minus
} from 'lucide-react';
import { PIXELS_PER_DAY } from '@/src/constants';

interface AdminPanelProps {
  viewMode: ViewMode;
  resources: ProjectResource[];
  allocations: ResourceAllocation;
  validWeeks: Set<string>;
  onUpdateAllocation: (resourceId: string, key: string, value: number) => void;
  totalCost: number;
  profileRates: ProfileRate[];
  setProfileRates: React.Dispatch<React.SetStateAction<ProfileRate[]>>;
  onAddResource: () => void;
  onRemoveResource: (id: string) => void;
  onUpdateResource: (id: string, updates: Partial<ProjectResource>) => void;
  projectStart: Date;
  setProjectStart: (date: Date) => void;
  projectEnd: Date;
  setProjectEnd: (date: Date) => void;
  isRelativeTime: boolean;
  setIsRelativeTime: (v: boolean) => void;
  onExport: () => void;
  onExportReport: () => void;
  onImport: (file: File) => void;
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  yearlyInvoicingTotals: { [year: number]: number };
  setYearlyInvoicingTotals: React.Dispatch<React.SetStateAction<{ [year: number]: number }>>;
  generateMonthlyInvoices: () => void;
  visibleYears: number[];
  setVisibleYears: React.Dispatch<React.SetStateAction<number[]>>;
  footerHeight: number;
  onStartResizeHeight: (e: React.MouseEvent) => void;
  isResizingHeight: boolean;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  viewMode,
  resources,
  allocations,
  validWeeks,
  onUpdateAllocation,
  totalCost,
  profileRates,
  setProfileRates,
  onAddResource,
  onRemoveResource,
  onUpdateResource,
  projectStart,
  setProjectStart,
  projectEnd,
  setProjectEnd,
  isRelativeTime,
  setIsRelativeTime,
  onExport,
  onExportReport,
  onImport,
  invoices,
  setInvoices,
  yearlyInvoicingTotals,
  setYearlyInvoicingTotals,
  generateMonthlyInvoices,
  visibleYears,
  setVisibleYears,
  footerHeight,
  onStartResizeHeight,
  isResizingHeight
}) => {
  const [activeTab, setActiveTab] = useState<'Grid' | 'Roles' | 'Settings' | 'Invoices'>('Grid');
  const [invoiceFontScale, setInvoiceFontScale] = useState<number>(1.0);
  const [invoicePriceWidth, setInvoicePriceWidth] = useState<number>(250);
  const [isResizingInvoiceCol, setIsResizingInvoiceCol] = useState<boolean>(false);
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

  const gridColumns = useMemo(() => {
    const cols = [];
    const start = new Date(projectStart);
    start.setHours(0, 0, 0, 0);

    if (viewMode === 'Week') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
    } else if (viewMode === 'Month') {
      start.setDate(1);
    } else if (viewMode === 'Year') {
      start.setMonth(0, 1);
    }

    const endBoundary = new Date(projectEnd);
    endBoundary.setHours(23, 59, 59, 999);

    const curr = new Date(start);
    let index = 0;
    while (curr <= endBoundary) {
      const d = new Date(curr);
      let label = "";
      let subLabel = "";

      if (viewMode === 'Week') {
        const relativeMonthIndex = Math.max(1, Math.floor((d.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24 * 30)) + 1);
        const target = new Date(d.valueOf());
        const dayNr = (d.getDay() + 6) % 7;
        target.setDate(target.getDate() - dayNr + 3);
        const firstThursday = target.valueOf();
        target.setMonth(0, 1);
        if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
        const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);

        if (isRelativeTime) {
          label = `S${index + 1}`;
          subLabel = `M${relativeMonthIndex}`;
        } else {
          label = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase();
          subLabel = `S${weekNumber}`;
        }
      } else if (viewMode === 'Month') {
        const relativeMonthIndex = index + 1;
        const relativeYearIndex = Math.floor(index / 12) + 1;
        if (isRelativeTime) {
          label = `M${relativeMonthIndex}`;
          subLabel = `AÑO ${relativeYearIndex}`;
        } else {
          label = d.toLocaleString('es-ES', { month: 'short' }).toUpperCase();
          subLabel = d.getFullYear().toString();
        }
      } else {
        const relativeYearIndex = index + 1;
        if (isRelativeTime) {
          label = `AÑO ${relativeYearIndex}`;
          subLabel = "";
        } else {
          label = d.getFullYear().toString();
          subLabel = "";
        }
      }

      const getMon = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const dayStr = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${dayStr}`;
      };

      cols.push({ index, date: d, label, subLabel, key: getMon(d) });

      if (viewMode === 'Week') curr.setDate(curr.getDate() + 7);
      else if (viewMode === 'Month') { curr.setMonth(curr.getMonth() + 1); curr.setDate(1); }
      else { curr.setFullYear(curr.getFullYear() + 1); curr.setMonth(0, 1); }
      index++;
    }
    return cols;
  }, [projectStart, projectEnd, isRelativeTime, viewMode]);

  const columnWidth = useMemo(() => {
    const pxPerDay = PIXELS_PER_DAY[viewMode] || 8.57;
    if (viewMode === 'Week') return pxPerDay * 7;
    if (viewMode === 'Month') return pxPerDay * 30;
    return pxPerDay * 365;
  }, [viewMode]);

  const yearlyPlannedCosts = useMemo(() => {
    const totals: { [year: number]: number } = {};
    resources.forEach(res => {
      const rateObj = profileRates.find(r => r.role === res.role);
      const rate = rateObj?.rate || 0;
      const resAlloc = allocations[res.id] || {};

      Object.entries(resAlloc).forEach(([key, days]) => {
        if (!validWeeks.has(key)) return;
        const dNum = typeof days === 'number' ? days : 0;
        const date = new Date(key);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          totals[year] = (totals[year] || 0) + (dNum * rate);
        }
      });
    });
    return totals;
  }, [resources, profileRates, allocations, gridColumns, projectStart, viewMode]);

  const handleAddRole = () => {
    const newRoleName = `Perfil ${profileRates.length + 1}`;
    setProfileRates([...profileRates, { role: newRoleName, rate: 500 }]);
  };

  const handleUpdateRole = (index: number, updates: Partial<ProfileRate>) => {
    const next = [...profileRates];
    next[index] = { ...next[index], ...updates };
    setProfileRates(next);
  };

  const handleDeleteRole = (index: number) => {
    setProfileRates(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = '';
    }
  };

  // Add mouse listeners for invoice column resizing
  React.useEffect(() => {
    if (isResizingInvoiceCol) {
      const handleMouseMove = (e: MouseEvent) => {
        const delta = e.movementX;
        setInvoicePriceWidth(prev => Math.max(150, Math.min(600, prev - delta)));
      };
      const handleMouseUp = () => setIsResizingInvoiceCol(false);

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizingInvoiceCol]);

  return (
    <footer
      className="border-t-2 border-[#e2e8f0] bg-white flex flex-col overflow-hidden z-20 shadow-2xl relative"
      style={{ height: footerHeight }}
    >
      {/* Resize handle vertical */}
      <div
        onMouseDown={onStartResizeHeight}
        className={`absolute top-0 left-0 w-full h-1 cursor-row-resize z-50 hover:bg-orange-400 transition-colors ${isResizingHeight ? 'bg-orange-500 h-1.5 shadow-[0_0_15px_rgba(234,88,12,0.4)]' : 'bg-transparent'}`}
      />

      <div className="h-12 px-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-30 select-none overflow-x-auto no-scrollbar">
        <div className="flex gap-6 md:gap-10 shrink-0">
          {(['Grid', 'Roles', 'Invoices', 'Settings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-[12px] font-black h-12 flex items-center border-b-4 transition-all uppercase tracking-[0.1em] ${activeTab === tab ? 'text-orange-600 border-orange-600' : 'text-slate-400 border-transparent hover:text-slate-600'
                }`}
            >
              {tab === 'Grid' ? 'Asignación Jornadas' :
                tab === 'Roles' ? 'Perfiles Maestro' :
                  tab === 'Invoices' ? 'Facturación' :
                    'Configuración & Costes'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 overflow-auto custom-scrollbar">
          {activeTab === 'Grid' && (
            <div className="inline-block min-w-full align-middle">
              <table className="text-left border-collapse table-fixed">
                <thead className="sticky top-0 z-30">
                  <tr className="h-[54px]">
                    {gridColumns.map(col => (
                      <th
                        key={col.index}
                        className="px-1 text-[11px] font-black text-slate-800 text-center border-b-2 border-r border-slate-200 bg-slate-100/50"
                        style={{ width: columnWidth, minWidth: columnWidth }}
                      >
                        <div className="flex flex-col items-center">
                          {col.subLabel && <span className="text-[8px] text-orange-600 font-black mb-1 uppercase tracking-tighter">{col.subLabel}</span>}
                          <span className="text-[12px]">{col.label}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resources.length === 0 ? (
                    <tr>
                      <td colSpan={gridColumns.length} className="p-16 text-center text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
                        No hay recursos definidos en la barra lateral.
                      </td>
                    </tr>
                  ) : (
                    resources.map(res => {
                      const resAllocs = allocations[res.id] || {};
                      return (
                        <tr key={res.id} className="h-[75px] hover:bg-slate-50/30 transition-colors group">
                          {gridColumns.map(col => {
                            const isReadOnly = viewMode !== 'Week';
                            let val = 0;
                            if (viewMode === 'Week') {
                              val = resAllocs[col.key] || 0;
                            } else if (viewMode === 'Month') {
                              const start = new Date(col.date);
                              const end = new Date(start);
                              end.setMonth(end.getMonth() + 1);
                              Object.entries(resAllocs).forEach(([k, v]) => {
                                if (validWeeks.has(k)) {
                                  const d = new Date(k);
                                  if (d >= start && d < end) val += (Number(v) || 0);
                                }
                              });
                            } else {
                              const year = col.date.getFullYear();
                              Object.entries(resAllocs).forEach(([k, v]) => {
                                if (validWeeks.has(k)) {
                                  const d = new Date(k);
                                  if (d.getFullYear() === year) val += (Number(v) || 0);
                                }
                              });
                            }

                            return (
                              <td key={col.index} className="px-1 py-2 border-r border-slate-50" style={{ width: columnWidth }}>
                                <div className="flex justify-center">
                                  <input
                                    type="number" min="0" max="1000" step="0.5"
                                    value={val || ''}
                                    placeholder="0"
                                    readOnly={isReadOnly}
                                    onChange={(e) => !isReadOnly && onUpdateAllocation(res.id, col.key, parseFloat(e.target.value) || 0)}
                                    className={`w-14 border-2 rounded-xl text-center text-[12px] font-black p-2 transition-all shadow-sm ${isReadOnly
                                      ? 'bg-slate-50 border-slate-50 text-slate-500 cursor-not-allowed'
                                      : 'bg-white border-slate-100 text-slate-900 focus:ring-2 focus:ring-orange-600 focus:border-orange-600'
                                      }`}
                                  />
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'Invoices' && (
            <div className="p-8 bg-slate-50/30 overflow-y-auto max-h-[calc(100vh-200px)]">
              <div className="max-w-4xl mx-auto space-y-12">
                <div className="flex items-center justify-between">
                  <h3 className="text-[13px] font-black text-slate-800 uppercase flex items-center gap-3 tracking-[0.2em]">
                    <DollarSign className="text-orange-600" size={18} /> Plan de Facturación Proyectado
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button
                        onClick={() => setInvoiceFontScale(prev => Math.max(0.6, prev - 0.1))}
                        className="p-2 hover:bg-white rounded-lg text-slate-600 transition-all"
                        title="Reducir texto"
                      >
                        <Minus size={14} />
                      </button>
                      <div className="px-2 text-[10px] font-black text-slate-500 min-w-[50px] text-center uppercase">
                        Texto: {Math.round(invoiceFontScale * 100)}%
                      </div>
                      <button
                        onClick={() => setInvoiceFontScale(prev => Math.min(1.8, prev + 0.1))}
                        className="p-2 hover:bg-white rounded-lg text-slate-600 transition-all"
                        title="Aumentar texto"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        if (confirm("¿Generar plan de facturación mensual automático para todo el proyecto? Se sobrescribirán los datos actuales.")) {
                          generateMonthlyInvoices();
                        }
                      }}
                      className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-xl text-[10px] font-black hover:bg-orange-700 transition-all uppercase tracking-widest shadow-xl"
                    >
                      <FileSpreadsheet size={16} /> Generar Plan por Meses
                    </button>
                  </div>
                </div>

                {projectYears.map(year => {
                  const yearInvoices = invoices.filter(inv => inv.year === year);
                  const yearTotal = yearlyInvoicingTotals[year] || 0;

                  return (
                    <div key={year} className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="bg-slate-900 text-white px-4 py-1.5 rounded-lg text-[12px] font-black tracking-widest uppercase shrink-0">
                            Año {year}
                          </div>
                          <div className="h-px flex-1 bg-slate-200" />
                          <div className="bg-orange-50 text-orange-700 border border-orange-200 px-4 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-2 shadow-sm shrink-0">
                            <Target size={14} className="text-orange-500" />
                            <span className="opacity-70 uppercase tracking-tighter">Planificado:</span>
                            <span className="text-[13px]">{Math.round(yearlyPlannedCosts[year] || 0).toLocaleString()}€</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const newId = Date.now().toString();
                            setInvoices([...invoices, { id: newId, description: 'Nueva Factura', amount: 0, year }]);
                          }}
                          className="ml-6 flex items-center gap-2 px-6 py-2 bg-slate-100 text-slate-900 rounded-xl text-[10px] font-black hover:bg-slate-200 transition-all uppercase tracking-widest shadow-sm shrink-0"
                        >
                          <Plus size={16} /> Añadir Factura {year}
                        </button>
                      </div>

                      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm bg-white">
                        <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 p-6 bg-orange-50/50 rounded-2xl border border-orange-100">
                          <div className="flex-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Importe Total del Año {year} (€)</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-900 text-lg font-black">€</span>
                              <input
                                type="number"
                                value={yearTotal}
                                onChange={(e) => {
                                  setYearlyInvoicingTotals({
                                    ...yearlyInvoicingTotals,
                                    [year]: parseFloat(e.target.value) || 0
                                  });
                                }}
                                className="w-full bg-white border-none rounded-xl text-3xl font-black text-slate-900 pl-10 focus:ring-2 focus:ring-orange-600 py-4 px-6 shadow-sm"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          <div className="px-8 border-l border-orange-200 hidden sm:block">
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Cuota por Factura</div>
                            <div className="text-2xl font-black text-orange-600 tracking-tight">
                              {(yearInvoices.length > 0 ? yearTotal / yearInvoices.length : 0).toLocaleString()}€
                            </div>
                          </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-slate-100">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-900 h-14">
                                <th
                                  className="px-6 font-black text-white/70 uppercase tracking-widest relative"
                                  style={{ fontSize: 11 * invoiceFontScale }}
                                >
                                  Descripción / Fecha Factura
                                  <div
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setIsResizingInvoiceCol(true);
                                    }}
                                    className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-orange-500 transition-colors ${isResizingInvoiceCol ? 'bg-orange-600' : 'bg-transparent'}`}
                                  />
                                </th>
                                <th
                                  className="px-6 font-black text-white/70 uppercase tracking-widest text-right"
                                  style={{
                                    fontSize: 11 * invoiceFontScale,
                                    width: invoicePriceWidth
                                  }}
                                >
                                  Importe Unitario
                                </th>
                                <th className="px-6 w-16"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {yearInvoices.length === 0 ? (
                                <tr>
                                  <td colSpan={3} className="px-6 py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                                    No hay facturas definidas para el año {year}.
                                  </td>
                                </tr>
                              ) : (
                                yearInvoices.map((invoice) => (
                                  <tr key={invoice.id} className="group hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                      <input
                                        value={invoice.description}
                                        onChange={(e) => {
                                          setInvoices(invoices.map(inv =>
                                            inv.id === invoice.id ? { ...inv, description: e.target.value } : inv
                                          ));
                                        }}
                                        placeholder="Ej: Arranque de proyecto..."
                                        className="w-full bg-transparent border-none font-bold text-slate-800 focus:ring-0 p-0 hover:bg-white/50 focus:bg-white rounded px-2 -ml-2"
                                        style={{ fontSize: 13 * invoiceFontScale }}
                                      />
                                    </td>
                                    <td className="px-6 py-4 text-right" style={{ width: invoicePriceWidth }}>
                                      <span
                                        className="font-black text-slate-900 py-2 px-4 bg-slate-50 rounded-lg inline-block whitespace-nowrap"
                                        style={{ fontSize: 13 * invoiceFontScale }}
                                      >
                                        {(yearTotal / yearInvoices.length).toLocaleString()} € + IVA
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <button
                                        onClick={() => setInvoices(invoices.filter(inv => inv.id !== invoice.id))}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'Roles' && (
            <div className="p-8 bg-slate-50/30">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-[13px] font-black text-slate-800 uppercase flex items-center gap-3 tracking-[0.2em]">
                  Tarifario de Perfiles
                </h3>
                <button onClick={handleAddRole} className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black hover:bg-black transition-all uppercase tracking-widest shadow-xl">
                  <Plus size={16} /> Nuevo Perfil
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {profileRates.map((rate, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 group relative transition-colors">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Perfil</label>
                        <input
                          value={rate.role}
                          onChange={(e) => handleUpdateRole(idx, { role: e.target.value })}
                          className="w-full bg-slate-50 border-none rounded-xl text-[11px] font-black text-slate-900 focus:ring-orange-600 py-2.5 px-4 shadow-inner"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Diaria (€)</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black">€</span>
                          <input
                            type="number"
                            value={rate.rate}
                            onChange={(e) => handleUpdateRole(idx, { rate: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-slate-50 border-none rounded-xl text-[11px] font-black text-slate-900 pl-8 focus:ring-orange-600 py-2.5 px-4 shadow-inner"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteRole(idx)}
                      className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-600 transition-all rounded-full hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Settings' && (
            <div className="p-10 bg-slate-50/20">
              <div className="flex flex-col lg:flex-row gap-12 max-w-7xl mx-auto">
                <div className="flex-1 space-y-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Settings2 size={16} className="text-orange-600" /> Parámetros del Proyecto
                    </h3>

                    <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                      <Clock size={14} className="text-slate-400" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vista Tiempo</span>
                      <button
                        onClick={() => setIsRelativeTime(!isRelativeTime)}
                        className="flex items-center gap-2 transition-colors"
                      >
                        {isRelativeTime ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-orange-600 uppercase tracking-tighter">Relativo (M1, S1...)</span>
                            <ToggleRight size={28} className="text-orange-600" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Calendario Real</span>
                            <ToggleLeft size={28} className="text-slate-300" />
                          </div>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm space-y-4">
                      <div className="flex flex-col">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1 mb-2 tracking-widest">Fecha Inicio</label>
                        <div className="flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200">
                          <CalendarIcon size={16} className="text-orange-600 shrink-0" />
                          <input
                            type="date"
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
                            className="bg-transparent border-none text-[12px] font-black text-slate-900 p-0 focus:ring-0 w-full"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm space-y-4">
                      <div className="flex flex-col">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1 mb-2 tracking-widest">Fecha Fin</label>
                        <div className="flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200">
                          <CalendarIcon size={16} className="text-orange-600 shrink-0" />
                          <input
                            type="date"
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
                            className="bg-transparent border-none text-[12px] font-black text-slate-900 p-0 focus:ring-0 w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Filtro de Visualización de Años */}
                  <div className="mt-8 space-y-6">
                    <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Eye size={16} className="text-orange-600" /> Filtros de Visualización
                    </h3>
                    <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm space-y-4">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1 mb-2 tracking-widest block">Seleccionar Años Visibles</label>
                      <div className="flex flex-wrap gap-3">
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
                              className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all border-2 flex items-center gap-2 ${isVisible
                                ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-100'
                                : 'bg-white border-slate-100 text-slate-400 hover:border-orange-200'
                                }`}
                            >
                              {year}
                              {isVisible && <Plus size={14} className="rotate-45" />}
                            </button>
                          );
                        })}
                        {visibleYears.length > 0 && (
                          <button
                            onClick={() => setVisibleYears([])}
                            className="px-4 py-2 rounded-xl text-[11px] font-black bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all border-2 border-transparent uppercase tracking-tighter"
                          >
                            Mostrar Todo
                          </button>
                        )}
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-2 ml-1">
                        * Si no hay ningún año seleccionado (o todos), se mostrará el rango completo del proyecto.
                      </p>
                    </div>
                  </div>

                  {/* Sección de Copia de Seguridad */}
                  <div className="mt-12 space-y-6">
                    <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                      <FileSpreadsheet size={16} className="text-orange-600" /> Copia de Seguridad & Portabilidad
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        onClick={onExport}
                        className="flex items-center justify-center gap-3 p-4 bg-slate-100 text-slate-800 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all shadow-sm"
                        title="Copia de seguridad para restaurar datos"
                      >
                        <Download size={18} />
                        Guardar localmente Timing
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center gap-3 p-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-200"
                      >
                        <Upload size={18} />
                        Cargar Timing Local
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".xlsx, .xls"
                        className="hidden"
                      />
                    </div>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-semibold text-slate-500 leading-relaxed uppercase tracking-tighter">
                        * Utiliza la exportación para guardar tu trabajo localmente o compartirlo. La importación sobrescribirá los datos actuales de esta sesión.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-[450px] space-y-6">
                  <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
                    <Target size={16} className="text-orange-600" /> Inversión Total
                  </h3>

                  <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                      <DollarSign size={80} className="text-orange-600" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-[0.2em]">Presupuesto Proyectado</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-slate-900 tracking-tighter">{totalCost.toLocaleString()}€</span>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between text-[11px] font-black uppercase tracking-[0.2em]">
                        <span className="text-slate-500">Uso Presupuestario</span>
                        <span className="text-orange-600">{Math.min(100, (totalCost / 150000) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200">
                        <div className="h-full bg-orange-600 rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(100, (totalCost / 150000) * 100)}%` }}></div>
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 text-right uppercase tracking-wider">Base cálculo: 150k€</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};

export default AdminPanel;
