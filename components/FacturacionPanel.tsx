import React, { useMemo, useState } from 'react';
import { Invoice, ProjectResource, ProfileRate, ResourceAllocation } from '@/src/types';
import { DollarSign, FileSpreadsheet, Plus, Target, Trash2, Minus, Info } from 'lucide-react';

interface FacturacionPanelProps {
  invoices: Invoice[];
  onUpdateInvoices: (newInvoices: Invoice[]) => void;
  yearlyInvoicingTotals: { [year: number]: number };
  onUpdateYearlyInvoicingTotals: (totals: { [year: number]: number }) => void;
  generateMonthlyInvoices: () => void;
  projectStart: Date;
  projectEnd: Date;
  resources: ProjectResource[];
  profileRates: ProfileRate[];
  allocations: ResourceAllocation;
  validWeeks: Set<string>;
  isClientView?: boolean;
}

export const FacturacionPanel: React.FC<FacturacionPanelProps> = ({
  invoices,
  onUpdateInvoices,
  yearlyInvoicingTotals,
  onUpdateYearlyInvoicingTotals,
  generateMonthlyInvoices,
  projectStart,
  projectEnd,
  resources,
  profileRates,
  allocations,
  validWeeks,
  isClientView = false
}) => {
  const [invoiceFontScale, setInvoiceFontScale] = useState<number>(1.0);
  const [invoicePriceWidth, setInvoicePriceWidth] = useState<number>(250);
  const [isResizingInvoiceCol, setIsResizingInvoiceCol] = useState<boolean>(false);

  const projectYears = useMemo(() => {
    const years = [];
    const startYear = projectStart.getFullYear();
    const endYear = projectEnd.getFullYear();
    for (let y = startYear; y <= endYear; y++) {
      years.push(y);
    }
    return years;
  }, [projectStart, projectEnd]);

  // Compute planned costs per year
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
  }, [resources, profileRates, allocations, validWeeks]);

  // Add listeners for resizing invoice column widths
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
    <div className="flex-1 bg-slate-50/40 p-5 md:p-8 xl:p-10 overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Descriptors header bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2.5 font-display">
              <DollarSign className="text-orange-500" size={20} /> Facturación y Certificaciones
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1 select-none">
              Controla las metas financieras, distribuye la facturación anual en hitos mensuales o añade facturaciones personalizadas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Font Scaler tool */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm select-none">
              <button
                onClick={() => setInvoiceFontScale(prev => Math.max(0.6, prev - 0.1))}
                className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors"
                title="Disminuir tamaño"
              >
                <Minus size={12} />
              </button>
              <div className="text-[9px] font-bold text-slate-500 uppercase min-w-[50px] text-center font-mono">
                Txt: {Math.round(invoiceFontScale * 100)}%
              </div>
              <button
                onClick={() => setInvoiceFontScale(prev => Math.min(1.8, prev + 0.1))}
                className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors"
                title="Aumentar tamaño"
              >
                <Plus size={12} />
              </button>
            </div>

            {!isClientView && (
              <button
                onClick={() => {
                  if (confirm("¿Generar plan de facturación mensual automático? Se sobrescribirán los hitos existentes.")) {
                    generateMonthlyInvoices();
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:brightness-[1.05] text-white rounded-xl text-xs font-semibold transition-all uppercase tracking-wider shadow-md shadow-orange-500/10 hover:scale-[1.01]"
              >
                <FileSpreadsheet size={15} /> Autogenerar Hitos Mensuales
              </button>
            )}
          </div>
        </div>

        {/* Display breakdown per Year */}
        <div className="space-y-10">
          {projectYears.map(year => {
            const yearInvoices = invoices.filter(inv => inv.year === year);
            const yearTotal = yearlyInvoicingTotals[year] || 0;
            const plannedCost = yearlyPlannedCosts[year] || 0;
            const deviation = yearTotal - plannedCost;

            return (
              <div key={year} className="space-y-6 bg-white p-5 md:p-8 rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                
                {/* Year summary header bar */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="bg-slate-900 text-white px-3.5 py-1.5 rounded-xl text-[10px] font-bold tracking-wider uppercase font-mono shadow-sm">
                      AÑO {year}
                    </div>
                    <div className="h-px flex-1 bg-slate-200/75" />
                    <div className="flex items-center gap-2">
                      <div className="bg-slate-50/50 text-slate-700 border border-slate-200/60 px-3 py-1.5 rounded-xl text-[10px] font-semibold uppercase flex items-center gap-1.5">
                        <Target size={11} className="text-slate-400" />
                        <span className="opacity-70">Plan Coste:</span>
                        <span className="font-mono">{Math.round(plannedCost).toLocaleString()}€</span>
                      </div>
                      <div className={`border px-3 py-1.5 rounded-xl text-[10px] font-semibold uppercase flex items-center gap-1.5 ${
                        deviation < 0 ? 'bg-red-50/50 text-red-700 border-red-200/50' : 'bg-emerald-50/50 text-emerald-700 border-emerald-200/50'
                      }`}>
                        <span className="opacity-70 font-display">Margen:</span>
                        <span className="font-mono">{deviation >= 0 ? '+' : ''}{Math.round(deviation).toLocaleString()}€</span>
                      </div>
                    </div>
                  </div>

                  {!isClientView && (
                    <button
                      onClick={() => {
                        const newId = `inv-${year}-${Date.now()}`;
                        onUpdateInvoices([...invoices, { id: newId, description: 'Certificación de Hito', amount: 0, year }]);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-[10px] font-bold border border-slate-200/80 transition-all uppercase tracking-wider"
                    >
                      <Plus size={12} /> Añadir Factura {year}
                    </button>
                  )}
                </div>

                {/* Sub Total Editor Box */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 bg-gradient-to-br from-orange-500/5 to-amber-500/5 rounded-2xl border border-orange-500/10">
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block ml-0.5 font-display">
                      Importe Total Anual Objetivo (€) - Año {year}
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-lg font-mono">€</span>
                      <input
                        type="number"
                        value={yearTotal}
                        readOnly={isClientView}
                        onChange={(e) => {
                          onUpdateYearlyInvoicingTotals({
                            ...yearlyInvoicingTotals,
                            [year]: parseFloat(e.target.value) || 0
                          });
                        }}
                        className="w-full bg-white border border-slate-200/40 rounded-xl text-xl font-bold text-slate-800 pl-9 focus:ring-1 focus:ring-orange-500/20 focus:border-orange-500/40 py-2.5 px-4 font-mono shadow-inner transition-all"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col justify-center bg-white border border-orange-500/10 p-4 rounded-xl shadow-sm">
                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-display">
                      Importe Prorrateado de Cuota
                    </div>
                    <div className="text-lg font-bold text-orange-600 tracking-tight font-mono">
                      {(yearInvoices.length > 0 ? yearTotal / yearInvoices.length : 0).toLocaleString()}€
                    </div>
                    <div className="text-[8px] font-semibold text-slate-400 uppercase tracking-tight mt-0.5">
                      Préstamos divididos en {yearInvoices.length} cuotas
                    </div>
                  </div>
                </div>

                {/* Tabular invoices details */}
                <div className="overflow-hidden rounded-2xl border border-slate-200/50 shadow-sm bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/85 border-b border-slate-200/60 h-11 select-none">
                        <th
                          className="px-5 font-bold text-slate-500 uppercase tracking-wider relative font-display"
                          style={{ fontSize: 9 * invoiceFontScale }}
                        >
                          Descripción / Metas de Certificación
                        </th>
                        <th
                          className="px-5 font-bold text-slate-500 uppercase tracking-wider text-right font-display"
                          style={{
                            fontSize: 9 * invoiceFontScale,
                            width: invoicePriceWidth
                          }}
                        >
                          Importe Unitario Proporcionado
                        </th>
                        {!isClientView && <th className="px-5 w-14"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {yearInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-5 py-10 text-center text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
                            No hay facturas redactadas para este ciclo. Usa "Autogenerar" u "Añadir Factura".
                          </td>
                        </tr>
                      ) : (
                        yearInvoices.map((invoice) => (
                          <tr key={invoice.id} className="group hover:bg-slate-50/40 transition-colors">
                            <td className="px-5 py-3">
                              <input
                                value={invoice.description}
                                readOnly={isClientView}
                                onChange={(e) => {
                                  onUpdateInvoices(invoices.map(inv =>
                                    inv.id === invoice.id ? { ...inv, description: e.target.value } : inv
                                  ));
                                }}
                                className="w-full bg-transparent border-none font-semibold text-slate-700 focus:ring-1 focus:ring-orange-500/20 p-0 hover:bg-slate-100/40 focus:bg-white rounded px-2 -ml-2"
                                style={{ fontSize: 13 * invoiceFontScale }}
                              />
                            </td>
                            <td className="px-5 py-3 text-right" style={{ width: invoicePriceWidth }}>
                              <span
                                className="font-bold text-slate-800 py-1 px-2.5 bg-slate-50/80 border border-slate-200/30 rounded-lg inline-block whitespace-nowrap font-mono"
                                style={{ fontSize: 11 * invoiceFontScale }}
                              >
                                {(yearTotal / yearInvoices.length).toLocaleString()} € + IVA
                              </span>
                            </td>
                            {!isClientView && (
                              <td className="px-5 py-3 text-right">
                                <button
                                  onClick={() => onUpdateInvoices(invoices.filter(inv => inv.id !== invoice.id))}
                                  className="p-1 text-slate-350 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"
                                  title="Eliminar Hito"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
