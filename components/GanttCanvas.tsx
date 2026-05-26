import React, { useMemo, useState, useRef, useEffect } from 'react';
import { GanttTask, ProjectResource, ViewMode } from '@/src/types';
import { PIXELS_PER_DAY } from '@/src/constants';
import {
  Plus, Trash2, Calendar, User, ArrowRight, BookOpen, Clock,
  ChevronUp, ChevronDown, CheckCircle2, AlertCircle, Edit3, Settings, HelpCircle, Users
} from 'lucide-react';

interface GanttCanvasProps {
  viewMode: ViewMode;
  tasks: GanttTask[];
  onUpdateTasks: (newTasks: GanttTask[]) => void;
  projectStart: Date;
  projectEnd: Date;
  isRelativeTime: boolean;
  resources: ProjectResource[];
  isClientView?: boolean;
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (v: boolean) => void;
}

const ROW_HEIGHT = 56; // Fixed height in px for each task row
const TIMELINE_HEADER_HEIGHT = 54;

export const GanttCanvas: React.FC<GanttCanvasProps> = ({
  viewMode,
  tasks,
  onUpdateTasks,
  projectStart,
  projectEnd,
  isRelativeTime,
  resources,
  isClientView = false,
  isSidebarOpen = true,
  setIsSidebarOpen
}) => {
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<GanttTask | null>(null);
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);

  // Dragging states
  const [draggingState, setDraggingState] = useState<{
    taskId: string;
    type: 'move' | 'resize-start' | 'resize-end' | 'progress';
    initialX: number;
    initialStartStr: string;
    initialEndStr: string;
    initialProgress: number;
  } | null>(null);

  // Sync scrolling of Left and Right panes
  const handleLeftScroll = () => {
    if (leftScrollRef.current && rightScrollRef.current) {
      rightScrollRef.current.scrollTop = leftScrollRef.current.scrollTop;
    }
  };

  const handleRightScroll = () => {
    if (leftScrollRef.current && rightScrollRef.current) {
      leftScrollRef.current.scrollTop = rightScrollRef.current.scrollTop;
    }
  };

  const pxPerDay = useMemo(() => PIXELS_PER_DAY[viewMode], [viewMode]);

  // Compute overall boundaries
  const totalDays = useMemo(() => {
    const diffTime = Math.abs(projectEnd.getTime() - projectStart.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [projectStart, projectEnd]);

  const timelineWidth = useMemo(() => totalDays * pxPerDay, [totalDays, pxPerDay]);

  // Convert Date strings to X position
  const getXFromDate = (dateStr: string): number => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 0;
    const diffTime = d.getTime() - projectStart.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays * pxPerDay;
  };

  // Convert X position back to Date string (YYYY-MM-DD)
  const getDateFromX = (x: number): string => {
    const diffDays = x / pxPerDay;
    const time = projectStart.getTime() + diffDays * (1000 * 60 * 60 * 24);
    const d = new Date(time);
    return d.toISOString().split('T')[0];
  };

  // Grid columns for background and headers
  const gridColumns = useMemo(() => {
    const cols = [];
    const start = new Date(projectStart);
    start.setHours(0, 0, 0, 0);

    if (viewMode === 'Week') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // target Monday
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
        const relativeMonthIndex = Math.floor((d.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24 * 30)) + 1;
        const target = new Date(d.valueOf());
        const dayNr = (d.getDay() + 6) % 7;
        target.setDate(target.getDate() - dayNr + 3);
        const firstThursday = target.valueOf();
        target.setMonth(0, 1);
        if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
        const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);

        label = `S${weekNumber}`;
        subLabel = isRelativeTime ? `M${relativeMonthIndex}` : d.toLocaleString('es-ES', { month: 'short' }).toUpperCase();
      } else if (viewMode === 'Month') {
        const relativeMonthIndex = Math.floor((d.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24 * 30)) + 1;
        label = isRelativeTime ? `M${relativeMonthIndex}` : d.toLocaleString('es-ES', { month: 'short' }).toUpperCase();
        subLabel = d.getFullYear().toString();
      } else {
        const relativeYearIndex = Math.floor((d.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24 * 365)) + 1;
        label = isRelativeTime ? `AÑO ${relativeYearIndex}` : d.getFullYear().toString();
      }

      const colLeft = ((d.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)) * pxPerDay;
      cols.push({ index, label, subLabel, left: colLeft });

      if (viewMode === 'Week') curr.setDate(curr.getDate() + 7);
      else if (viewMode === 'Month') { curr.setMonth(curr.getMonth() + 1); curr.setDate(1); }
      else { curr.setFullYear(curr.getFullYear() + 1); curr.setMonth(0, 1); }
      index++;
    }
    return cols;
  }, [projectStart, projectEnd, isRelativeTime, viewMode, pxPerDay]);

  const columnWidth = useMemo(() => {
    if (viewMode === 'Week') return pxPerDay * 7;
    if (viewMode === 'Month') return pxPerDay * 30;
    return pxPerDay * 365;
  }, [viewMode, pxPerDay]);

  // Task operations
  const handleAddTask = () => {
    if (isClientView) return;
    const taskCount = tasks.length;
    const todayStr = new Date(projectStart).toISOString().split('T')[0];
    const endStr = new Date(projectStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const newTask: GanttTask = {
      id: Date.now().toString(),
      wbs: `${taskCount + 1}`,
      name: `Nueva Tarea ${taskCount + 1}`,
      start: todayStr,
      end: endStr,
      progress: 0,
      responsible: '',
      dependencies: [],
      notes: ''
    };
    onUpdateTasks([...tasks, newTask]);
    setSelectedTaskId(newTask.id);
  };

  const handleDeleteTask = (id: string) => {
    if (isClientView) return;
    const filtered = tasks.filter(t => t.id !== id).map((t, idx) => ({
      ...t,
      // Re-calculate basic WBS if simple integers are used
      wbs: /^\d+(\.\d+)*$/.test(t.wbs) ? `${idx + 1}` : t.wbs
    }));
    onUpdateTasks(filtered);
    if (selectedTaskId === id) setSelectedTaskId(null);
  };

  const handleUpdateTaskField = (id: string, field: keyof GanttTask, value: any) => {
    if (isClientView) return;
    onUpdateTasks(tasks.map(t => {
      if (t.id === id) {
        return { ...t, [field]: value };
      }
      return t;
    }));
  };

  const handleMoveTaskOrder = (index: number, direction: 'up' | 'down') => {
    if (isClientView) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === tasks.length - 1) return;

    const updated = [...tasks];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    // Rescale WBS codes if simple integers
    const finalized = updated.map((t, idx) => ({
      ...t,
      wbs: /^\d+$/.test(t.wbs) ? `${idx + 1}` : t.wbs
    }));

    onUpdateTasks(finalized);
  };

  // Mouse Drag handlers
  const handleDragStart = (
    e: React.MouseEvent,
    taskId: string,
    type: 'move' | 'resize-start' | 'resize-end' | 'progress'
  ) => {
    if (isClientView) return;
    e.preventDefault();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setDraggingState({
      taskId,
      type,
      initialX: e.clientX,
      initialStartStr: task.start,
      initialEndStr: task.end,
      initialProgress: task.progress
    });
  };

  useEffect(() => {
    if (!draggingState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - draggingState.initialX;
      // Convert drag delta to days
      const deltaDays = Math.round(deltaX / pxPerDay);

      const task = tasks.find(t => t.id === draggingState.taskId);
      if (!task) return;

      const updatedTasks = tasks.map(t => {
        if (t.id !== draggingState.taskId) return t;

        const startD = new Date(draggingState.initialStartStr);
        const endD = new Date(draggingState.initialEndStr);

        if (draggingState.type === 'move') {
          // Slide both start and end dates
          startD.setDate(startD.getDate() + deltaDays);
          endD.setDate(endD.getDate() + deltaDays);
          return {
            ...t,
            start: startD.toISOString().split('T')[0],
            end: endD.toISOString().split('T')[0]
          };
        }

        if (draggingState.type === 'resize-start') {
          startD.setDate(startD.getDate() + deltaDays);
          // Block start date from exceeding the end date
          if (startD >= endD) {
            startD.setTime(endD.getTime() - 24 * 60 * 60 * 1000); // 1 day before
          }
          return {
            ...t,
            start: startD.toISOString().split('T')[0]
          };
        }

        if (draggingState.type === 'resize-end') {
          endD.setDate(endD.getDate() + deltaDays);
          // Block end date from being smaller than start date
          if (endD <= startD) {
            endD.setTime(startD.getTime() + 24 * 60 * 60 * 1000); // 1 day after
          }
          return {
            ...t,
            end: endD.toISOString().split('T')[0]
          };
        }

        if (draggingState.type === 'progress') {
          // Calculate slider width from current DOM parameters or approximate
          const width = getWidthFromDates(t.start, t.end);
          if (width > 0) {
            const progressDelta = (deltaX / width) * 100;
            const newProgress = Math.max(0, Math.min(100, Math.round(draggingState.initialProgress + progressDelta)));
            return {
              ...t,
              progress: newProgress
            };
          }
        }

        return t;
      });

      onUpdateTasks(updatedTasks);
    };

    const handleMouseUp = () => {
      setDraggingState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingState, pxPerDay, tasks, onUpdateTasks]);

  const getWidthFromDates = (startStr: string, endStr: string): number => {
    const s = new Date(startStr);
    const e = new Date(endStr);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
    const diffTime = e.getTime() - s.getTime();
    const diffDays = Math.max(0, diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays * pxPerDay;
  };

  const openEditModal = (task: GanttTask) => {
    setEditingTask({ ...task });
    setIsEditingModalOpen(true);
  };

  const saveEditingTask = () => {
    if (!editingTask) return;
    onUpdateTasks(tasks.map(t => t.id === editingTask.id ? editingTask : t));
    setIsEditingModalOpen(false);
    setEditingTask(null);
  };

  // SVGs Dependency lines drawing
  const dependencyLines = useMemo(() => {
    const lines: React.ReactNode[] = [];

    tasks.forEach((task, index) => {
      if (!task.dependencies || task.dependencies.length === 0) return;

      task.dependencies.forEach(depId => {
        const predIndex = tasks.findIndex(t => t.id === depId);
        if (predIndex === -1) return;
        const predTask = tasks[predIndex];

        // Pred End coordinate
        const predStartX = getXFromDate(predTask.start);
        const predWidth = getWidthFromDates(predTask.start, predTask.end);
        const predEndX = predStartX + predWidth;
        const predY = predIndex * ROW_HEIGHT + ROW_HEIGHT / 2 + TIMELINE_HEADER_HEIGHT;

        // Current start coordinate
        const taskStartX = getXFromDate(task.start);
        const taskY = index * ROW_HEIGHT + ROW_HEIGHT / 2 + TIMELINE_HEADER_HEIGHT;

        // Draw stepped path
        // From end of predecessor to start of task
        const midX = predEndX + (taskStartX - predEndX) / 2;

        let pathStr = "";

        if (taskStartX >= predEndX) {
          // Standard successor: S-curve forward step
          pathStr = `M ${predEndX} ${predY} L ${midX} ${predY} L ${midX} ${taskY} L ${taskStartX} ${taskY}`;
        } else {
          // Overlapped successor: backward step around
          const offsetPredY = predY + 12;
          pathStr = `M ${predEndX} ${predY} L ${predEndX + 10} ${predY} L ${predEndX + 10} ${offsetPredY} L ${taskStartX - 10} ${offsetPredY} L ${taskStartX - 10} ${taskY} L ${taskStartX} ${taskY}`;
        }

        lines.push(
          <g key={`${depId}-${task.id}`} className="group/dep">
            <path
              d={pathStr}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="2"
              className="group-hover/dep:stroke-orange-500 transition-colors pointer-events-auto cursor-help"
              title={`Predecesor: ${predTask.name} -> Siguiente: ${task.name}`}
            />
            {/* Arrowhead */}
            <polygon
              points={`${taskStartX},${taskY} ${taskStartX - 6},${taskY - 4} ${taskStartX - 6},${taskY + 4}`}
              fill="#cbd5e1"
              className="group-hover/dep:fill-orange-500 transition-colors"
            />
          </g>
        );
      });
    });

    return lines;
  }, [tasks, projectStart, pxPerDay]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Upper action-controls bar */}
      <div className="h-14 px-6 border-b border-slate-100 bg-white flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {setIsSidebarOpen && !isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="mr-2 p-1.5 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-605 transition-colors flex items-center gap-1.5 shrink-0 shadow-sm"
              title="Mostrar Equipo de Trabajo"
            >
              <Users size={14} className="text-orange-600 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider">Equipo</span>
            </button>
          )}
          <BookOpen className="text-orange-600" size={18} />
          <h2 className="text-[13px] font-black text-slate-900 uppercase tracking-[0.15em]">Gestión Plan de Trabajo</h2>
        </div>
        {!isClientView && (
          <button
            onClick={handleAddTask}
            className="flex items-center gap-2 px-5 py-2 bg-orange-600 text-white rounded-xl text-[10px] font-black hover:bg-orange-700 transition-all uppercase tracking-widest shadow-lg shadow-orange-100"
          >
            <Plus size={16} /> Añadir Tarea
          </button>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Tasks spreadsheet panel */}
        <div className="w-[310px] sm:w-[380px] md:w-[450px] shrink-0 flex flex-col border-r border-slate-200 bg-white relative transition-all duration-200 overflow-hidden">
          {/* Header Row */}
          <div
            className="flex items-center border-b-2 border-slate-200 bg-slate-50/70 shrink-0 font-black text-[10px] text-slate-500 uppercase tracking-wider px-3"
            style={{ height: TIMELINE_HEADER_HEIGHT }}
          >
            <div className="w-12 text-center">WBS</div>
            <div className="flex-1 min-w-0 pr-4">Nombre de Tarea</div>
            <div className="w-20 hidden sm:block">Fechas</div>
            <div className="w-16 hidden sm:block">Resp.</div>
            <div className="w-12 text-center">Acciones</div>
          </div>

          {/* Left Vertical List */}
          <div
            className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar"
            ref={leftScrollRef}
            onScroll={handleLeftScroll}
          >
            {tasks.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center justify-center space-y-4">
                <AlertCircle className="text-slate-300" size={32} />
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                  No hay tareas planificadas.
                </span>
              </div>
            ) : (
              tasks.map((task, idx) => {
                const isSelected = selectedTaskId === task.id;
                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`flex items-center px-3 group transition-colors cursor-pointer ${isSelected ? 'bg-slate-50 border-l-4 border-orange-600 pl-[8px]' : 'hover:bg-slate-50/30'
                      }`}
                    style={{ height: ROW_HEIGHT }}
                  >
                    {/* WBS input */}
                    <div className="w-12 pr-1.5">
                      <input
                        value={task.wbs}
                        readOnly={isClientView}
                        onChange={(e) => handleUpdateTaskField(task.id, 'wbs', e.target.value)}
                        className="w-full text-center text-[11px] font-black text-slate-800 bg-transparent border-none p-0 focus:ring-0 focus:bg-white rounded"
                      />
                    </div>

                    {/* Name Input */}
                    <div className="flex-1 pr-3 min-w-0">
                      <input
                        value={task.name}
                        readOnly={isClientView}
                        onChange={(e) => handleUpdateTaskField(task.id, 'name', e.target.value)}
                        className="w-full text-[11px] font-bold text-slate-950 bg-transparent border-none p-0 focus:ring-0 focus:bg-white rounded truncate"
                      />
                      {task.notes && (
                        <p className="text-[8px] text-slate-400 font-semibold truncate mt-0.5">{task.notes}</p>
                      )}
                    </div>

                    {/* Brief date / details text */}
                    <div className="w-20 text-[10px] font-extrabold text-slate-500 hidden sm:block">
                      <div>{new Date(task.start).toLocaleDateString('es-ES', { month: '2-digit', day: 'numeric' })}</div>
                      <div className="text-[9px] text-orange-600 font-bold">-{new Date(task.end).toLocaleDateString('es-ES', { month: '2-digit', day: 'numeric' })}</div>
                    </div>

                    {/* Responsible label badge */}
                    <div className="w-16 hidden sm:block">
                      {task.responsible ? (
                        <span className="text-[8px] font-black uppercase bg-slate-105 border border-slate-200 text-slate-600 py-1 px-1.5 rounded-md truncate block max-w-full text-center">
                          {task.responsible.substring(0, 7)}
                        </span>
                      ) : (
                        <span className="text-[8px] font-bold uppercase text-slate-300 py-1 px-1.5 block text-center">
                          -
                        </span>
                      )}
                    </div>

                    {/* Re-ordering & operations */}
                    <div className="w-12 flex justify-center items-center gap-1">
                      {!isClientView ? (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditModal(task); }}
                            className="p-1 text-slate-400 hover:text-orange-600 rounded transition-colors"
                            title="Editar detalles"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                            className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors group-hover:opacity-100 opacity-0"
                            title="Eliminar tarea"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditModal(task); }}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                          title="Ver detalles"
                        >
                          <HelpCircle size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Horizontal scrolling Gantt Timeline Board */}
        <div
          className="flex-1 overflow-auto bg-slate-50 relative custom-scrollbar"
          ref={rightScrollRef}
          onScroll={handleRightScroll}
        >
          {/* Header Horizontal Row (Weeks, Months, etc.) */}
          <div
            className="flex border-b-2 border-slate-200 bg-slate-50 sticky top-0 z-30 shrink-0 select-none"
            style={{ height: TIMELINE_HEADER_HEIGHT, width: timelineWidth }}
          >
            {gridColumns.map((col) => (
              <div
                key={col.index}
                className="absolute border-r border-slate-200 h-full text-center flex flex-col justify-center items-center bg-slate-100/30 shrink-0"
                style={{ left: col.left, width: columnWidth }}
              >
                <span className="text-[10px] font-black text-slate-800">{col.label}</span>
                {col.subLabel && <span className="text-[8px] text-orange-600 font-extrabold uppercase mt-0.5 tracking-tighter">{col.subLabel}</span>}
              </div>
            ))}
          </div>

          {/* Rows Body Grid */}
          <div
            className="relative bg-slate-50/50"
            style={{ width: timelineWidth, height: tasks.length * ROW_HEIGHT }}
          >
            {/* Column Background Dividers */}
            {gridColumns.map((col) => (
              <div
                key={`divider-${col.index}`}
                className="absolute border-r border-slate-100 h-full pointer-events-none"
                style={{ left: col.left, width: columnWidth }}
              />
            ))}

            {/* Dependency drawing SVG layer */}
            <svg
              className="absolute top-0 left-0 pointer-events-none w-full h-full z-10"
              style={{ width: timelineWidth, height: tasks.length * ROW_HEIGHT + TIMELINE_HEADER_HEIGHT }}
            >
              <g transform={`translate(0, -${TIMELINE_HEADER_HEIGHT})`}>
                {dependencyLines}
              </g>
            </svg>

            {/* Task rows */}
            {tasks.map((task, index) => {
              const xStart = getXFromDate(task.start);
              const barWidth = getWidthFromDates(task.start, task.end);
              const isSelected = selectedTaskId === task.id;

              return (
                <div
                  key={`bg-row-${task.id}`}
                  className={`absolute w-full flex items-center border-b border-slate-100 group transition-colors ${isSelected ? 'bg-slate-50/50' : 'hover:bg-slate-50/20'
                    }`}
                  style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT }}
                >
                  {/* Interactive Gantt Bar */}
                  {barWidth > 0 && (
                    <div
                      style={{ left: xStart, width: barWidth }}
                      className={`absolute h-8 rounded-xl z-20 flex items-center shadow-lg transition-all group/bar select-none ${isSelected
                        ? 'ring-2 ring-orange-500 shadow-orange-100'
                        : ''
                        } ${isClientView ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
                      onMouseDown={(e) => handleDragStart(e, task.id, 'move')}
                    >
                      {/* Bar Fill Backdrop */}
                      <div className="absolute inset-0 bg-slate-900 rounded-xl overflow-hidden shadow-inner flex items-center">
                        {/* Progress Colored Fill */}
                        <div
                          style={{ width: `${task.progress}%` }}
                          className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-l-md opacity-90 transition-all duration-300"
                        />
                      </div>

                      {/* Handle Left resize */}
                      {!isClientView && (
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2 hover:bg-white/20 cursor-w-resize rounded-l-xl z-30 transition-colors"
                          onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e, task.id, 'resize-start'); }}
                        />
                      )}

                      {/* Task Info Overlay Text inside bar */}
                      <div className="absolute inset-0 px-3 flex items-center justify-between text-white text-[9px] font-black uppercase tracking-wider pointer-events-none w-full truncate">
                        <span className="truncate max-w-[80%] pr-2">{task.name}</span>
                        <span>{task.progress}%</span>
                      </div>

                      {/* Display handle progress indicator or drag points */}
                      {!isClientView && (
                        <div
                          className="absolute h-3 w-3 bg-white border-2 border-orange-600 rounded-full cursor-col-resize opacity-0 group-hover/bar:opacity-100 z-30 transition-opacity -bottom-1 shadow-sm"
                          style={{ left: `${task.progress}%`, transform: 'translateX(-50%)' }}
                          onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e, task.id, 'progress'); }}
                          title="Arrastrar progreso"
                        />
                      )}

                      {/* Handle Right resize */}
                      {!isClientView && (
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 hover:bg-white/20 cursor-e-resize rounded-r-xl z-30 transition-colors"
                          onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e, task.id, 'resize-end'); }}
                        />
                      )}

                      {/* Label label displayed to the right side of the Gantt bar */}
                      <span className="absolute left-[105%] whitespace-nowrap text-[9px] font-black text-slate-400 group-hover/bar:text-slate-800 transition-colors bg-white/70 py-1 px-1.5 rounded-md border border-slate-100 shadow-sm uppercase">
                        {task.responsible || 'Sin Asignar'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Editing Task Side drawer or Modal */}
      {isEditingModalOpen && editingTask && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl w-full max-w-lg border border-slate-100 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide">Configurar Tarea</h3>
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">WBS: {editingTask.wbs}</p>
              </div>
              <span className="px-3 py-1.5 bg-orange-50 text-orange-600 border border-orange-100 rounded-xl text-[10px] font-black uppercase tracking-wider">
                {editingTask.progress}% Completado
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Nombre</label>
                <input
                  value={editingTask.name}
                  disabled={isClientView}
                  onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })}
                  className="w-full bg-slate-50 border-none rounded-2xl text-[12px] font-bold text-slate-900 focus:ring-2 focus:ring-orange-600 py-3 px-4 shadow-inner"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Progreso (%)</label>
                <input
                  type="number" min="0" max="100"
                  value={editingTask.progress}
                  disabled={isClientView}
                  onChange={(e) => setEditingTask({ ...editingTask, progress: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                  className="w-full bg-slate-50 border-none rounded-2xl text-[12px] font-bold text-slate-900 focus:ring-2 focus:ring-orange-600 py-3 px-4 shadow-inner"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1 flex items-center gap-1.5"><Calendar size={12} /> Fecha Inicio</label>
                <input
                  type="date"
                  value={editingTask.start}
                  disabled={isClientView}
                  onChange={(e) => setEditingTask({ ...editingTask, start: e.target.value })}
                  className="w-full bg-slate-50 border-none rounded-2xl text-[11px] font-bold text-slate-900 focus:ring-2 focus:ring-orange-600 py-3 px-4 shadow-inner"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1 flex items-center gap-1.5"><Calendar size={12} /> Fecha Fin</label>
                <input
                  type="date"
                  value={editingTask.end}
                  disabled={isClientView}
                  onChange={(e) => setEditingTask({ ...editingTask, end: e.target.value })}
                  className="w-full bg-slate-50 border-none rounded-2xl text-[11px] font-bold text-slate-900 focus:ring-2 focus:ring-orange-600 py-3 px-4 shadow-inner"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1 flex items-center gap-1.5"><User size={12} /> Responsable</label>
                <select
                  value={editingTask.responsible}
                  disabled={isClientView}
                  onChange={(e) => {
                    const r = resources.find(res => res.name === e.target.value);
                    setEditingTask({
                      ...editingTask,
                      responsible: e.target.value,
                      responsibleId: r?.id || undefined
                    });
                  }}
                  className="w-full bg-slate-50 border-none rounded-2xl text-[11px] font-bold text-slate-900 focus:ring-2 focus:ring-orange-600 py-3 px-4 shadow-inner cursor-pointer"
                >
                  <option value="">Sin Asignar</option>
                  {resources.map(res => (
                    <option key={res.id} value={res.name}>{res.name} ({res.role})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1 flex items-center gap-1.5"><ArrowRight size={12} /> Predecesores</label>
                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 max-h-32 overflow-y-auto custom-scrollbar space-y-1">
                  {tasks.filter(t => t.id !== editingTask.id).map(t => {
                    const hasDep = editingTask.dependencies?.includes(t.id);
                    return (
                      <label key={t.id} className="flex items-center gap-2 text-[10px] font-semibold text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={hasDep}
                          disabled={isClientView}
                          onChange={() => {
                            const current = editingTask.dependencies || [];
                            const updated = current.includes(t.id)
                              ? current.filter(id => id !== t.id)
                              : [...current, t.id];
                            setEditingTask({ ...editingTask, dependencies: updated });
                          }}
                          className="rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                        />
                        <span>{t.wbs} - {t.name}</span>
                      </label>
                    );
                  })}
                  {tasks.filter(t => t.id !== editingTask.id).length === 0 && (
                    <p className="text-[8px] font-bold text-slate-400 text-center uppercase">No hay otras tareas</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Notas / Observaciones</label>
              <textarea
                value={editingTask.notes || ''}
                disabled={isClientView}
                rows={2}
                placeholder="Añadir observaciones sobre el entregable de la tarea..."
                onChange={(e) => setEditingTask({ ...editingTask, notes: e.target.value })}
                className="w-full bg-slate-50 border-none rounded-2xl text-[11px] font-medium text-slate-900 focus:ring-2 focus:ring-orange-600 py-3 px-4 shadow-inner resize-none"
              />
            </div>

            <div className="flex gap-4 pt-3">
              <button
                onClick={() => setIsEditingModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all"
              >
                {isClientView ? 'Cerrar' : 'Cancelar'}
              </button>
              {!isClientView && (
                <button
                  onClick={saveEditingTask}
                  className="flex-1 py-3 bg-slate-900 text-white hover:bg-black rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all shadow-xl shadow-slate-200"
                >
                  Guardar Cambios
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default GanttCanvas;
