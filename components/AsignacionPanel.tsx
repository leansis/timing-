import React, { useMemo, useRef } from 'react';
import { ProjectResource, ResourceAllocation, ViewMode } from '@/src/types';
import { PIXELS_PER_DAY } from '@/src/constants';
import { Users, Trash2, Calendar } from 'lucide-react';

interface AsignacionPanelProps {
  viewMode: ViewMode;
  resources: ProjectResource[];
  allocations: ResourceAllocation;
  validWeeks: Set<string>;
  onUpdateAllocation: (resourceId: string, key: string, value: number) => void;
  projectStart: Date;
  projectEnd: Date;
  isRelativeTime: boolean;
  onRightScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  rightScrollRef?: React.RefObject<HTMLDivElement | null>;
  isClientView?: boolean;
  onRemoveResource?: (id: string) => void;
  onUpdateResource?: (id: string, updates: Partial<ProjectResource>) => void;
  profileRoles: string[];
}

const ROW_HEIGHT = 75; // Matches the table row height of resources
const HEADER_HEIGHT = 54;

export const AsignacionPanel: React.FC<AsignacionPanelProps> = ({
  viewMode,
  resources,
  allocations,
  validWeeks,
  onUpdateAllocation,
  projectStart,
  projectEnd,
  isRelativeTime,
  onRightScroll,
  rightScrollRef,
  isClientView = false,
  onRemoveResource,
  onUpdateResource,
  profileRoles
}) => {
  const leftScrollRef = useRef<HTMLDivElement>(null);

  // Math.ceil of total range
  const totalDays = useMemo(() => {
    const diffTime = Math.abs(projectEnd.getTime() - projectStart.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [projectStart, projectEnd]);

  const pxPerDay = useMemo(() => PIXELS_PER_DAY[viewMode] || 8.57, [viewMode]);
  const timelineWidth = useMemo(() => totalDays * pxPerDay, [totalDays, pxPerDay]);

  const columnWidth = useMemo(() => {
    if (viewMode === 'Week') return pxPerDay * 7;
    if (viewMode === 'Month') return pxPerDay * 30;
    return pxPerDay * 365;
  }, [viewMode, pxPerDay]);

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
        const itemD = new Date(date);
        const day = itemD.getDay();
        const diff = itemD.getDate() - day + (day === 0 ? -6 : 1);
        itemD.setDate(diff);
        const year = itemD.getFullYear();
        const month = String(itemD.getMonth() + 1).padStart(2, '0');
        const dayStr = String(itemD.getDate()).padStart(2, '0');
        return `${year}-${month}-${dayStr}`;
      };

      const colLeft = ((d.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)) * pxPerDay;

      cols.push({ index, date: d, label, subLabel, key: getMon(d), left: colLeft });

      if (viewMode === 'Week') curr.setDate(curr.getDate() + 7);
      else if (viewMode === 'Month') { curr.setMonth(curr.getMonth() + 1); curr.setDate(1); }
      else { curr.setFullYear(curr.getFullYear() + 1); curr.setMonth(0, 1); }
      index++;
    }
    return cols;
  }, [projectStart, projectEnd, isRelativeTime, viewMode, pxPerDay]);

  // Sync scroll left side vertically with right scroll side if needed, or keep simple
  const handleRightScrollInternal = (e: React.UIEvent<HTMLDivElement>) => {
    if (onRightScroll) {
      onRightScroll(e);
    }
    if (leftScrollRef.current) {
      leftScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleLeftScrollInternal = (e: React.UIEvent<HTMLDivElement>) => {
    if (rightScrollRef?.current) {
      rightScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  return (
    <div className="flex flex-col border-t border-slate-200 bg-white animate-fade-in" style={{ height: 260 }}>
      {/* Title bar of workday allocation */}
      <div className="h-10 px-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <Users className="text-orange-500" size={14} />
          <span className="text-[10px] font-bold uppercase text-slate-700 tracking-wider font-display">Planificación de Jornadas de Trabajo (Calendario)</span>
        </div>
        <div className="text-[9px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-lg uppercase font-mono">
          {viewMode === 'Week' ? 'Edición Manual' : 'Solo Lectura Acumulado'}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left pane: Resource Names & Roles */}
        <div className="w-[330px] sm:w-[410px] md:w-[520px] shrink-0 flex flex-col border-r border-slate-200/80 bg-white relative overflow-hidden">
          {/* Left panel header */}
          <div
            className="flex items-center border-b border-slate-200 bg-slate-50/50 shrink-0 font-bold text-[10px] text-slate-500 uppercase tracking-wider px-3 select-none"
            style={{ height: HEADER_HEIGHT }}
          >
            <div className="flex-1 min-w-0 pr-4 font-display">Recurso / Equipo</div>
            <div className="w-32 font-display">Perfil Profesional</div>
            {!isClientView && <div className="w-12 text-center font-display">Baja</div>}
          </div>

          {/* Left panel vertical body list */}
          <div
            className="flex-1 overflow-y-auto divide-y divide-slate-100/70 custom-scrollbar"
            ref={leftScrollRef}
            onScroll={handleLeftScrollInternal}
          >
            {resources.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center h-full space-y-2 select-none">
                <Users className="text-slate-300" size={18} />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                  No hay recursos.
                </span>
              </div>
            ) : (
              resources.map((res) => (
                <div
                  key={res.id}
                  className="flex items-center px-3 hover:bg-slate-50/30 transition-colors"
                  style={{ height: ROW_HEIGHT }}
                >
                  <div className="flex-grow pr-3 min-w-0">
                    <input
                      value={res.name}
                      readOnly={isClientView}
                      onChange={(e) => onUpdateResource && onUpdateResource(res.id, { name: e.target.value })}
                      className="w-full text-[11px] font-semibold text-slate-700 bg-transparent border-none p-0 focus:ring-1 focus:ring-orange-500/20 focus:bg-white rounded px-1 -ml-1 truncate transition-all"
                    />
                  </div>

                  <div className="w-32 shrink-0 pr-2">
                    <select
                      value={res.role}
                      disabled={isClientView}
                      onChange={(e) => onUpdateResource && onUpdateResource(res.id, { role: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200/60 rounded-lg text-[9px] font-bold text-orange-600 focus:ring-1 focus:ring-orange-500/20 py-1.5 px-2 cursor-pointer uppercase tracking-wider transition-all"
                    >
                      {profileRoles.map((roleStr, rIdx) => (
                        <option key={rIdx} value={roleStr}>
                          {roleStr.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!isClientView && (
                    <div className="w-12 shrink-0 flex justify-center">
                      <button
                        onClick={() => onRemoveResource && onRemoveResource(res.id)}
                        className="p-1.5 text-slate-450 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                        title="Eliminar recurso de la jornada"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right pane: scrollable grid for week inputs */}
        <div
          className="flex-1 overflow-auto bg-slate-50 relative custom-scrollbar"
          ref={rightScrollRef}
          onScroll={handleRightScrollInternal}
        >
          {/* Header row to match the week of Gantt */}
          <div
            className="flex border-b border-slate-200/80 bg-slate-50/50 sticky top-0 z-30 shrink-0 select-none"
            style={{ height: HEADER_HEIGHT, width: timelineWidth }}
          >
            {gridColumns.map((col) => (
              <div
                key={col.index}
                className="absolute border-r border-slate-200/60 h-full text-center flex flex-col justify-center items-center bg-slate-50 shrink-0"
                style={{ left: col.left, width: columnWidth }}
              >
                <span className="text-[10px] font-bold text-slate-700 font-display">{col.label}</span>
                {col.subLabel && <span className="text-[8px] text-orange-500 font-bold uppercase mt-0.5 tracking-wider font-mono">{col.subLabel}</span>}
              </div>
            ))}
          </div>

          {/* Grid body containing the inputs */}
          <div
            className="relative bg-slate-50/20"
            style={{ width: timelineWidth, height: resources.length * ROW_HEIGHT }}
          >
            {/* Background Column Divider lines */}
            {gridColumns.map((col) => (
              <div
                key={`divider-jornada-${col.index}`}
                className="absolute border-r border-slate-100/70 h-full pointer-events-none"
                style={{ left: col.left, width: columnWidth }}
              />
            ))}

            {/* Render rows */}
            {resources.map((res, rIndex) => {
              const resAllocs = allocations[res.id] || {};
              return (
                <div
                  key={`row-jornada-${res.id}`}
                  className="absolute w-full flex items-center border-b border-slate-100 hover:bg-slate-50/20"
                  style={{ top: rIndex * ROW_HEIGHT, height: ROW_HEIGHT }}
                >
                  {gridColumns.map((col) => {
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
                      <div
                        key={col.index}
                        className="absolute h-full flex items-center justify-center border-r border-slate-100/30"
                        style={{ left: col.left, width: columnWidth }}
                      >
                        <input
                          type="number"
                          min="0"
                          max="1000"
                          step="0.5"
                          value={val || ''}
                          placeholder="0"
                          readOnly={isReadOnly || isClientView}
                          onChange={(e) => {
                            if (!isReadOnly && !isClientView) {
                              onUpdateAllocation(res.id, col.key, parseFloat(e.target.value) || 0);
                            }
                          }}
                          className={`w-14 border rounded-xl text-center text-[11px] font-semibold py-1.5 px-0.5 transition-all shadow-sm ${
                            isReadOnly || isClientView
                              ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed select-none'
                              : 'bg-white border-slate-205 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-550/20 focus:border-orange-500'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
