import React, { useMemo, useState, useRef, useEffect } from 'react';
import { GanttTask, ProjectResource, ViewMode } from '@/src/types';
import { PIXELS_PER_DAY } from '@/src/constants';
import {
  Plus, Trash2, Calendar, User, ArrowRight, BookOpen, Clock,
  ChevronUp, ChevronDown, CheckCircle2, AlertCircle, Edit3, Settings, HelpCircle, Users
} from 'lucide-react';

const getInitials = (name: string) => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
};

// Color coding helper to stylize Chapters, Standard Tasks (grouped by parent chapter), and Milestones (Hitos)
export const getTaskStyles = (task: GanttTask) => {
  if (!task) {
    return {
      isChapter: false,
      isMilestone: false,
      leftPaneBg: 'bg-white border-b border-slate-100',
      textClass: 'font-semibold text-[10.5px] text-slate-800',
      wbsBadge: 'bg-slate-100 text-slate-700 font-bold',
      barBg: 'bg-slate-200/40 border border-slate-350 shadow-inner',
      progressBg: 'bg-indigo-500',
      milestoneClass: 'bg-amber-500 hover:bg-amber-400 border-2 border-amber-600',
    };
  }

  const wbsVal = task.wbs || '';
  const isChapter = !wbsVal.includes('.');
  const isMilestone = task.start === task.end;

  // Root chapter number based on WBS prefix (e.g. from "2.1.3" we extract 2)
  const prefix = wbsVal.split('.')[0] || '1';
  let parentNum = parseInt(prefix);
  if (isNaN(parentNum)) parentNum = 1;

  // Modern vibrant soft palettes per root chapter
  const palettes = [
    {
      // Chapter 1: Indigo Theme
      chapterBg: 'bg-indigo-950/90',
      chapterProgress: 'bg-indigo-600',
      taskBg: 'bg-indigo-50/70 hover:bg-indigo-100 border-indigo-200 text-indigo-950',
      taskProgress: 'bg-indigo-500',
      borderLeft: 'border-l-4 border-indigo-500',
      wbsBadge: 'bg-indigo-100 text-indigo-700 font-bold',
    },
    {
      // Chapter 2: Emerald/Teal Theme
      chapterBg: 'bg-teal-950/90',
      chapterProgress: 'bg-teal-600',
      taskBg: 'bg-teal-50/70 hover:bg-teal-100 border-teal-200 text-teal-950',
      taskProgress: 'bg-teal-500',
      borderLeft: 'border-l-4 border-teal-500',
      wbsBadge: 'bg-teal-100 text-teal-700 font-bold',
    },
    {
      // Chapter 3: Amber/Orange Theme
      chapterBg: 'bg-amber-950/90',
      chapterProgress: 'bg-amber-600',
      taskBg: 'bg-amber-50/70 hover:bg-amber-100 border-amber-200 text-amber-950',
      taskProgress: 'bg-amber-500',
      borderLeft: 'border-l-4 border-amber-500',
      wbsBadge: 'bg-amber-100 text-amber-700 font-bold',
    },
    {
      // Chapter 4: Purple/Violet Theme
      chapterBg: 'bg-purple-950/90',
      chapterProgress: 'bg-purple-600',
      taskBg: 'bg-purple-50/70 hover:bg-purple-100 border-purple-200 text-purple-950',
      taskProgress: 'bg-purple-500',
      borderLeft: 'border-l-4 border-purple-500',
      wbsBadge: 'bg-purple-100 text-purple-700 font-bold',
    },
    {
      // Chapter 5: Sky/Navy Theme
      chapterBg: 'bg-sky-950/90',
      chapterProgress: 'bg-sky-600',
      taskBg: 'bg-sky-50/70 hover:bg-sky-100 border-sky-200 text-sky-950',
      taskProgress: 'bg-sky-500',
      borderLeft: 'border-l-4 border-sky-500',
      wbsBadge: 'bg-sky-100 text-sky-700 font-bold',
    },
    {
      // Chapter 6: Rose Theme
      chapterBg: 'bg-rose-950/90',
      chapterProgress: 'bg-rose-600',
      taskBg: 'bg-rose-50/70 hover:bg-rose-100 border-rose-200 text-rose-950',
      taskProgress: 'bg-rose-500',
      borderLeft: 'border-l-4 border-rose-500',
      wbsBadge: 'bg-rose-100 text-rose-700 font-bold',
    },
  ];

  // Map of explicit named colors assigned dynamically to custom task overrides
  const customPalettes: { [key: string]: typeof palettes[0] } = {
    red: {
      chapterBg: 'bg-red-950/90',
      chapterProgress: 'bg-red-600',
      taskBg: 'bg-red-50/75 hover:bg-red-100 border-red-200 text-red-950',
      taskProgress: 'bg-red-500',
      borderLeft: 'border-l-4 border-red-500',
      wbsBadge: 'bg-red-100 text-red-700 font-bold',
    },
    orange: {
      chapterBg: 'bg-orange-950/90',
      chapterProgress: 'bg-orange-600',
      taskBg: 'bg-orange-50/75 hover:bg-orange-100 border-orange-200 text-orange-950',
      taskProgress: 'bg-orange-500',
      borderLeft: 'border-l-4 border-orange-500',
      wbsBadge: 'bg-orange-100 text-orange-700 font-bold',
    },
    amber: {
      chapterBg: 'bg-amber-950/90',
      chapterProgress: 'bg-amber-600',
      taskBg: 'bg-amber-50/75 hover:bg-amber-100 border-amber-200 text-amber-950',
      taskProgress: 'bg-amber-500',
      borderLeft: 'border-l-4 border-amber-500',
      wbsBadge: 'bg-amber-100 text-amber-700 font-bold',
    },
    green: {
      chapterBg: 'bg-green-950/90',
      chapterProgress: 'bg-green-600',
      taskBg: 'bg-green-50/75 hover:bg-green-100 border-green-200 text-green-950',
      taskProgress: 'bg-green-500',
      borderLeft: 'border-l-4 border-green-500',
      wbsBadge: 'bg-green-100 text-green-700 font-bold',
    },
    emerald: {
      chapterBg: 'bg-emerald-950/90',
      chapterProgress: 'bg-emerald-600',
      taskBg: 'bg-emerald-50/75 hover:bg-emerald-100 border-emerald-200 text-emerald-90 tracking-wide', // fixed text color
      taskProgress: 'bg-emerald-500',
      borderLeft: 'border-l-4 border-emerald-500',
      wbsBadge: 'bg-emerald-100 text-emerald-700 font-bold',
    },
    teal: {
      chapterBg: 'bg-teal-950/90',
      chapterProgress: 'bg-teal-600',
      taskBg: 'bg-teal-50/75 hover:bg-teal-100 border-teal-200 text-teal-950',
      taskProgress: 'bg-teal-500',
      borderLeft: 'border-l-4 border-teal-500',
      wbsBadge: 'bg-teal-100 text-teal-700 font-bold',
    },
    sky: {
      chapterBg: 'bg-sky-950/90',
      chapterProgress: 'bg-sky-600',
      taskBg: 'bg-sky-50/75 hover:bg-sky-100 border-sky-200 text-sky-950',
      taskProgress: 'bg-sky-500',
      borderLeft: 'border-l-4 border-sky-500',
      wbsBadge: 'bg-sky-100 text-sky-700 font-bold',
    },
    blue: {
      chapterBg: 'bg-blue-950/90',
      chapterProgress: 'bg-blue-600',
      taskBg: 'bg-blue-50/75 hover:bg-blue-100 border-blue-200 text-blue-950',
      taskProgress: 'bg-blue-500',
      borderLeft: 'border-l-4 border-blue-500',
      wbsBadge: 'bg-blue-100 text-blue-700 font-bold',
    },
    indigo: {
      chapterBg: 'bg-indigo-950/90',
      chapterProgress: 'bg-indigo-600',
      taskBg: 'bg-indigo-50/75 hover:bg-indigo-100 border-indigo-200 text-indigo-950',
      taskProgress: 'bg-indigo-500',
      borderLeft: 'border-l-4 border-indigo-500',
      wbsBadge: 'bg-indigo-100 text-indigo-700 font-bold',
    },
    purple: {
      chapterBg: 'bg-purple-950/90',
      chapterProgress: 'bg-purple-600',
      taskBg: 'bg-purple-50/75 hover:bg-purple-100 border-purple-200 text-purple-950',
      taskProgress: 'bg-purple-500',
      borderLeft: 'border-l-4 border-purple-500',
      wbsBadge: 'bg-purple-100 text-purple-700 font-bold',
    },
    rose: {
      chapterBg: 'bg-rose-950/90',
      chapterProgress: 'bg-rose-600',
      taskBg: 'bg-rose-50/75 hover:bg-rose-100 border-rose-200 text-rose-950',
      taskProgress: 'bg-rose-500',
      borderLeft: 'border-l-4 border-rose-500',
      wbsBadge: 'bg-rose-100 text-rose-700 font-bold',
    },
  };

  let paletteIndex = (parentNum - 1) % palettes.length;
  if (paletteIndex < 0 || isNaN(paletteIndex)) {
    paletteIndex = 0;
  }
  let p = palettes[paletteIndex] || palettes[0];
  if (task.color && customPalettes[task.color]) {
    p = customPalettes[task.color];
  }

  if (isChapter) {
    return {
      isChapter: true,
      isMilestone: false,
      leftPaneBg: 'bg-[#f8fafc] border-b border-slate-200/80 hover:bg-slate-100/70 transition-colors',
      textClass: 'font-bold uppercase text-[11px] tracking-wider text-slate-800 font-display',
      wbsBadge: 'bg-slate-900 text-white font-bold font-mono',
      barBg: 'bg-slate-900 border border-slate-800 shadow-sm',
      progressBg: p.chapterProgress,
      milestoneClass: 'hidden',
    };
  } else if (isMilestone) {
    const themeColor = task.color || 'amber';
    const bgMap: { [key: string]: string } = {
      red: 'bg-red-500 border-red-600 text-red-950 hover:bg-red-400 bg-red-50/20 border-red-200/50 hover:bg-red-50',
      orange: 'bg-orange-500 border-orange-600 text-orange-950 hover:bg-orange-400 bg-orange-50/20 border-orange-200/50 hover:bg-orange-50',
      amber: 'bg-amber-500 border-amber-600 text-amber-950 hover:bg-amber-400 bg-amber-50/20 border-amber-250/50 hover:bg-amber-50',
      green: 'bg-green-500 border-green-600 text-green-950 hover:bg-green-400 bg-green-50/20 border-green-200/50 hover:bg-green-50',
      emerald: 'bg-emerald-500 border-emerald-600 text-emerald-950 hover:bg-emerald-400 bg-emerald-50/20 border-emerald-200/50 hover:bg-emerald-50',
      teal: 'bg-teal-500 border-teal-600 text-teal-950 hover:bg-teal-400 bg-teal-50/20 border-teal-200/50 hover:bg-teal-50',
      sky: 'bg-sky-505 border-sky-600 text-sky-950 hover:bg-sky-400 bg-sky-50/20 border-sky-200/50 hover:bg-sky-50',
      blue: 'bg-blue-500 border-blue-600 text-blue-950 hover:bg-blue-400 bg-blue-50/20 border-blue-200/50 hover:bg-blue-50',
      indigo: 'bg-indigo-500 border-indigo-600 text-indigo-950 hover:bg-indigo-400 bg-indigo-50/20 border-indigo-200/50 hover:bg-indigo-50',
      purple: 'bg-purple-500 border-purple-600 text-purple-950 hover:bg-purple-400 bg-purple-50/20 border-purple-200/50 hover:bg-purple-50',
      rose: 'bg-rose-550 border-rose-600 text-rose-950 hover:bg-rose-450 bg-rose-50/20 border-rose-200/50 hover:bg-rose-50',
    };

    const c = bgMap[themeColor] || bgMap['amber'];
    const parts = c.split(' ');

    return {
      isChapter: false,
      isMilestone: true,
      leftPaneBg: `${parts[4]} ${parts[6] || 'hover:bg-amber-50'} border-b ${parts[5]} transition-all`,
      textClass: `font-semibold text-[11px] ${parts[2]} font-sans`,
      wbsBadge: `${parts[0]} text-white font-semibold font-mono`,
      barBg: `${parts[0]} border ${parts[1]}`,
      progressBg: 'bg-transparent',
      milestoneClass: `${parts[0]} ${parts[3]} border-2 ${parts[1]}`, 
    };
  } else {
    return {
      isChapter: false,
      isMilestone: false,
      leftPaneBg: `${p.taskBg} border-b border-slate-100/70 ${p.borderLeft} transition-colors`,
      textClass: 'font-medium text-[11px] text-slate-700 font-sans',
      wbsBadge: `${p.wbsBadge} font-mono px-1.5 py-0.5 rounded text-[10px]`,
      barBg: 'bg-slate-200/40 border border-slate-300 shadow-inner',
      progressBg: p.taskProgress,
      milestoneClass: 'hidden',
    };
  }
};

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
  timelineScrollRef?: React.RefObject<HTMLDivElement | null>;
  onTimelineScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
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
  setIsSidebarOpen,
  timelineScrollRef,
  onTimelineScroll
}) => {
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<GanttTask | null>(null);
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [collapsedWbs, setCollapsedWbs] = useState<Record<string, boolean>>({});
  const [paneMode, setPaneMode] = useState<'both' | 'tasks' | 'gantt'>('both');

  // Check if a task's WBS is nested under a collapsed parent/chapter
  const isTaskFilteredOut = (wbs: string) => {
    if (!wbs) return false;
    const parts = wbs.split('.');
    for (let i = 1; i < parts.length; i++) {
      const prefix = parts.slice(0, i).join('.');
      if (collapsedWbs[prefix]) {
        return true;
      }
    }
    return false;
  };

  const hasSubtasks = (taskWbs: string) => {
    if (!taskWbs) return false;
    return tasks.some(t => t && t.wbs && t.wbs.startsWith(`${taskWbs}.`));
  };

  const visibleTasks = useMemo(() => {
    return tasks.filter(t => t && t.wbs && !isTaskFilteredOut(t.wbs));
  }, [tasks, collapsedWbs]);

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
  const handleAddChapter = () => {
    if (isClientView) return;
    const chapters = tasks.filter(t => t && t.wbs && !t.wbs.includes('.'));
    const nextChapterNum = chapters.length + 1;
    const todayStr = new Date(projectStart).toISOString().split('T')[0];
    const endStr = new Date(projectStart.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const newChapter: GanttTask = {
      id: `chapter-${Date.now()}`,
      wbs: `${nextChapterNum}`,
      name: `CAPÍTULO ${nextChapterNum}: NUEVA SECCIÓN`,
      start: todayStr,
      end: endStr,
      progress: 0,
      responsible: '',
      dependencies: [],
      notes: ''
    };

    onUpdateTasks([...tasks, newChapter]);
    setSelectedTaskId(newChapter.id);
  };

  const handleAddTaskValue = () => {
    if (isClientView) return;
    let targetParentWbs = '1';
    
    if (selectedTaskId) {
      const selectedTask = tasks.find(t => t.id === selectedTaskId);
      if (selectedTask && selectedTask.wbs) {
        targetParentWbs = selectedTask.wbs.split('.')[0];
      }
    } else {
      const chapters = tasks.filter(t => t && t.wbs && !t.wbs.includes('.'));
      if (chapters.length > 0) {
        targetParentWbs = chapters[chapters.length - 1].wbs || '1';
      }
    }

    const prefix = `${targetParentWbs}.`;
    const subtasks = tasks.filter(t => t && t.wbs && t.wbs.startsWith(prefix));
    const nextSubtaskIndex = subtasks.length + 1;
    const todayStr = new Date(projectStart).toISOString().split('T')[0];
    const endStr = new Date(projectStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const newTask: GanttTask = {
      id: `task-${Date.now()}`,
      wbs: `${targetParentWbs}.${nextSubtaskIndex}`,
      name: `Nueva Tarea ${targetParentWbs}.${nextSubtaskIndex}`,
      start: todayStr,
      end: endStr,
      progress: 0,
      responsible: '',
      dependencies: [],
      notes: ''
    };

    let insertIndex = tasks.length;
    for (let i = tasks.length - 1; i >= 0; i--) {
      const currentWbs = tasks[i]?.wbs || '';
      if (currentWbs === targetParentWbs || currentWbs.startsWith(prefix)) {
        insertIndex = i + 1;
        break;
      }
    }

    const nextTasks = [...tasks];
    nextTasks.splice(insertIndex, 0, newTask);
    onUpdateTasks(nextTasks);
    setSelectedTaskId(newTask.id);
  };

  const handleAddMilestone = () => {
    if (isClientView) return;
    let targetParentWbs = '1';
    
    if (selectedTaskId) {
      const selectedTask = tasks.find(t => t.id === selectedTaskId);
      if (selectedTask && selectedTask.wbs) {
        targetParentWbs = selectedTask.wbs.split('.')[0];
      }
    } else {
      const chapters = tasks.filter(t => t && t.wbs && !t.wbs.includes('.'));
      if (chapters.length > 0) {
        targetParentWbs = chapters[chapters.length - 1].wbs || '1';
      }
    }

    const prefix = `${targetParentWbs}.`;
    const subtasks = tasks.filter(t => t && t.wbs && t.wbs.startsWith(prefix));
    const nextSubtaskIndex = subtasks.length + 1;
    const todayStr = new Date(projectStart).toISOString().split('T')[0];

    const newMilestone: GanttTask = {
      id: `milestone-${Date.now()}`,
      wbs: `${targetParentWbs}.${nextSubtaskIndex}`,
      name: `Hito: Entrega Clave ${targetParentWbs}.${nextSubtaskIndex}`,
      start: todayStr,
      end: todayStr, // Same start & end date defines a Milestone!
      progress: 0,
      responsible: '',
      dependencies: [],
      notes: ''
    };

    let insertIndex = tasks.length;
    for (let i = tasks.length - 1; i >= 0; i--) {
      const currentWbs = tasks[i]?.wbs || '';
      if (currentWbs === targetParentWbs || currentWbs.startsWith(prefix)) {
        insertIndex = i + 1;
        break;
      }
    }

    const nextTasks = [...tasks];
    nextTasks.splice(insertIndex, 0, newMilestone);
    onUpdateTasks(nextTasks);
    setSelectedTaskId(newMilestone.id);
  };

  const handleAddTask = () => {
    handleAddTaskValue();
  };

  const handleDeleteTask = (id: string) => {
    if (isClientView) return;
    const taskToDelete = tasks.find(t => t.id === id);
    if (!taskToDelete) return;

    const prefix = taskToDelete.wbs ? `${taskToDelete.wbs}.` : '';
    const filtered = tasks.filter(t => t.id !== id && (!prefix || !t.wbs || !t.wbs.startsWith(prefix)));

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
    const task = tasks[index];
    if (!task) return;

    // A utility to get WBS parent path
    const getParentWbs = (wbs: string) => {
      const parts = (wbs || '').split('.');
      if (parts.length <= 1) return "";
      return parts.slice(0, -1).join('.');
    };

    const taskParentWbs = getParentWbs(task.wbs);

    // 1. Find the contiguous block for this task and all its subtasks (including grand-children, etc.)
    const prefix = task.wbs ? `${task.wbs}.` : '';
    const block: GanttTask[] = [task];
    let i = index + 1;
    while (i < tasks.length && tasks[i] && tasks[i].wbs && (prefix ? tasks[i].wbs.startsWith(prefix) : false)) {
      block.push(tasks[i]);
      i++;
    }
    const blockSize = block.length;
    const blockEndIndex = index + blockSize - 1; // last index of the current block

    let nextTasks: GanttTask[] = [];

    if (direction === 'up') {
      // Find the previous sibling (the previous task in the list at the SAME depth and sharing the same parent WBS)
      let siblingIdx = -1;
      for (let j = index - 1; j >= 0; j--) {
        const t = tasks[j];
        if (t && getParentWbs(t.wbs) === taskParentWbs) {
          siblingIdx = j;
          break;
        }
      }

      if (siblingIdx === -1) {
        // No sibling found with the same parent. Cannot move up.
        return;
      }

      const beforeSibling = tasks.slice(0, siblingIdx);
      const siblingBlock = tasks.slice(siblingIdx, index);
      const afterBlock = tasks.slice(blockEndIndex + 1);

      nextTasks = [
        ...beforeSibling,
        ...block,
        ...siblingBlock,
        ...afterBlock
      ];
    } else {
      // Find the next sibling (the next task in the list at the same depth sharing the exact same parent WBS)
      let siblingIdx = -1;
      for (let j = blockEndIndex + 1; j < tasks.length; j++) {
        const t = tasks[j];
        if (t && getParentWbs(t.wbs) === taskParentWbs) {
          siblingIdx = j;
          break;
        }
      }

      if (siblingIdx === -1) {
        // No next sibling found with the same parent. Cannot move down.
        return;
      }

      // Next sibling's block starts at siblingIdx and ends before the following sibling or shallow task.
      const siblingTask = tasks[siblingIdx];
      const siblingPrefix = siblingTask.wbs ? `${siblingTask.wbs}.` : '';
      let siblingBlockEnd = siblingIdx + 1;
      while (siblingBlockEnd < tasks.length && tasks[siblingBlockEnd] && tasks[siblingBlockEnd].wbs && (siblingPrefix ? tasks[siblingBlockEnd].wbs.startsWith(siblingPrefix) : false)) {
        siblingBlockEnd++;
      }

      const beforeBlock = tasks.slice(0, index);
      const middleStuff = tasks.slice(blockEndIndex + 1, siblingIdx);
      const siblingBlock = tasks.slice(siblingIdx, siblingBlockEnd);
      const afterSiblingBlock = tasks.slice(siblingBlockEnd);

      nextTasks = [
        ...beforeBlock,
        ...middleStuff,
        ...siblingBlock,
        ...block,
        ...afterSiblingBlock
      ];
    }

    onUpdateTasks(nextTasks);
  };

  const handleIndentTask = (id: string) => {
    if (isClientView) return;
    const idx = tasks.findIndex(t => t.id === id);
    if (idx <= 0) return; // No section or sibling above to indent under

    const currentTask = tasks[idx];
    const prevTask = tasks[idx - 1];
    if (!currentTask || !prevTask) return;

    // Use predecessor WBS as parent prefix or match its level
    const prevWbs = prevTask.wbs || '1';
    
    // If preceding task is a chapter (no dots), e.g. "1", we indent currentTask to "1.1"
    // If preceding task is "1.2", currentTask becomes "1.3" or "1.2.1"
    // Let's make currentTask a subtask of the preceding task
    const parentPrefix = prevWbs;
    const prefix = `${parentPrefix}.`;
    
    // Count sibling subtasks under this parent to assign next numeric suffix
    const siblings = tasks.filter(t => t && t.wbs && t.wbs.startsWith(prefix));
    let nextNum = 1;
    if (siblings.length > 0) {
      const suffices = siblings.map(t => {
        const parts = t.wbs.slice(prefix.length).split('.');
        return parseInt(parts[0]) || 0;
      });
      nextNum = Math.max(...suffices, 0) + 1;
    }

    const nextTasks = tasks.map(t => {
      if (t.id === id) {
        return { ...t, wbs: `${parentPrefix}.${nextNum}` };
      }
      return t;
    });

    onUpdateTasks(nextTasks);
  };

  const handleOutdentTask = (id: string) => {
    if (isClientView) return;
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return;

    const currentTask = tasks[idx];
    if (!currentTask || !currentTask.wbs) return;

    const wbsParts = currentTask.wbs.split('.');
    if (wbsParts.length <= 1) {
      // Already a root chapter, cannot outdent further
      return;
    }

    let newWbs = '';
    if (wbsParts.length === 2) {
      // Promotes a subtask (e.g., "1.2") to a new Chapter
      const rootChapters = tasks.filter(t => t && t.wbs && !t.wbs.includes('.'));
      const nextChapterNum = rootChapters.length + 1;
      newWbs = `${nextChapterNum}`;
    } else {
      // Promotes deep nested subtask (e.g., "1.2.3" -> "1.3" or similar)
      const parentParts = wbsParts.slice(0, wbsParts.length - 2);
      const parentPrefix = parentParts.join('.');
      const prefix = parentPrefix ? `${parentPrefix}.` : '';
      
      const siblings = tasks.filter(t => t && t.wbs && t.wbs.startsWith(prefix) && t.wbs.split('.').length === wbsParts.length - 1);
      let nextNum = 1;
      if (siblings.length > 0) {
        const suffices = siblings.map(t => {
          const parts = t.wbs.slice(prefix.length).split('.');
          return parseInt(parts[0]) || 0;
        });
        nextNum = Math.max(...suffices, 0) + 1;
      }
      newWbs = parentPrefix ? `${parentPrefix}.${nextNum}` : `${nextNum}`;
    }

    const nextTasks = tasks.map(t => {
      if (t.id === id) {
        return { ...t, wbs: newWbs };
      }
      return t;
    });

    onUpdateTasks(nextTasks);
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
      
      const deltaDays = Math.round(deltaX / pxPerDay);

      const task = tasks.find(t => t.id === draggingState.taskId);
      if (!task) return;

      const updatedTasks = tasks.map(t => {
        if (t.id !== draggingState.taskId) return t;

        const startD = new Date(draggingState.initialStartStr);
        const endD = new Date(draggingState.initialEndStr);

        if (isNaN(startD.getTime()) || isNaN(endD.getTime())) return t;

        if (draggingState.type === 'move') {
          // Slide both start and end dates linearly using 7 calendar days per week
          const newStartD = new Date(startD.getTime() + deltaDays * 24 * 60 * 60 * 1000);
          const newEndD = new Date(endD.getTime() + deltaDays * 24 * 60 * 60 * 1000);

          return {
            ...t,
            start: newStartD.toISOString().split('T')[0],
            end: newEndD.toISOString().split('T')[0]
          };
        }

        if (draggingState.type === 'resize-start') {
          const newStartD = new Date(startD.getTime() + deltaDays * 24 * 60 * 60 * 1000);
          
          if (newStartD > endD) {
            return {
              ...t,
              start: endD.toISOString().split('T')[0]
            };
          }

          return {
            ...t,
            start: newStartD.toISOString().split('T')[0]
          };
        }

        if (draggingState.type === 'resize-end') {
          const newEndD = new Date(endD.getTime() + deltaDays * 24 * 60 * 60 * 1000);

          if (newEndD < startD) {
            return {
              ...t,
              end: startD.toISOString().split('T')[0]
            };
          }

          return {
            ...t,
            end: newEndD.toISOString().split('T')[0]
          };
        }

        if (draggingState.type === 'progress') {
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

    // Validate dates to prevent invalid time value errors
    const validated = { ...editingTask };
    const defaultDateStr = (() => {
      try {
        return projectStart.toISOString().split('T')[0];
      } catch {
        return new Date().toISOString().split('T')[0];
      }
    })();

    const startD = new Date(validated.start);
    if (isNaN(startD.getTime())) {
      validated.start = defaultDateStr;
    }

    const endD = new Date(validated.end);
    if (isNaN(endD.getTime())) {
      validated.end = validated.start;
    }

    // Ensure start is before or equal to end
    const finalStart = new Date(validated.start);
    const finalEnd = new Date(validated.end);
    if (!isNaN(finalStart.getTime()) && !isNaN(finalEnd.getTime()) && finalStart > finalEnd) {
      validated.end = validated.start;
    }

    onUpdateTasks(tasks.map(t => t.id === validated.id ? validated : t));
    setIsEditingModalOpen(false);
    setEditingTask(null);
  };

  // SVGs Dependency lines drawing
  const dependencyLines = useMemo(() => {
    const lines: React.ReactNode[] = [];

    visibleTasks.forEach((task, index) => {
      if (!task.dependencies || task.dependencies.length === 0) return;

      task.dependencies.forEach(depId => {
        const predIndex = visibleTasks.findIndex(t => t.id === depId);
        if (predIndex === -1) return;
        const predTask = visibleTasks[predIndex];

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
    <div className="flex-1 flex flex-col overflow-hidden bg-[#fafafa]">
      {/* Upper action-controls bar */}
      <div className="min-h-[56px] py-3 sm:py-0 sm:h-14 px-4 sm:px-6 border-b border-slate-200/60 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 z-10 shadow-xs select-none">
        
        {/* Left: Title and team button */}
        <div className="flex items-center justify-between w-full sm:w-auto gap-3">
          <div className="flex items-center gap-2">
            {setIsSidebarOpen && !isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 transition-all flex items-center gap-1.5 shrink-0 shadow-xs hover:scale-[1.01]"
                title="Mostrar Equipo de Trabajo"
              >
                <Users size={12} className="text-orange-600 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Equipo</span>
              </button>
            )}
            <BookOpen className="text-orange-500 shrink-0" size={15} />
            <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest font-display truncate">Plan de Trabajo</h2>
          </div>

          {/* Mobile view mode switcher toggle */}
          <div className="flex sm:hidden items-center gap-0.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200/40">
            <button
              onClick={() => setPaneMode(paneMode === 'tasks' ? 'gantt' : paneMode === 'gantt' ? 'both' : 'tasks')}
              className="px-2 py-1 text-[8.5px] font-extrabold text-orange-600 uppercase tracking-wider whitespace-nowrap"
            >
              VISTA: {paneMode === 'tasks' ? 'Planilla' : paneMode === 'gantt' ? 'Gráfico' : 'Div.'}
            </button>
          </div>
        </div>

        {/* Right: view mode switcher + creation buttons, spaced elegantly */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto">
          {/* Central Switcher for Desktop & Tablet */}
          <div className="hidden sm:flex items-center gap-0.5 bg-slate-100/70 border border-slate-200/50 p-0.5 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setPaneMode('tasks')}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all uppercase tracking-wider flex items-center gap-1 ${
                paneMode === 'tasks'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock size={10} className={paneMode === 'tasks' ? 'text-orange-400' : 'text-slate-400'} />
              <span>Planilla</span>
            </button>
            <button
              type="button"
              onClick={() => setPaneMode('gantt')}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all uppercase tracking-wider flex items-center gap-1 ${
                paneMode === 'gantt'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar size={10} className={paneMode === 'gantt' ? 'text-orange-400' : 'text-slate-400'} />
              <span>Gráfico</span>
            </button>
            <button
              type="button"
              onClick={() => setPaneMode('both')}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all uppercase tracking-wider flex items-center gap-1 ${
                paneMode === 'both'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users size={10} className={paneMode === 'both' ? 'text-orange-400' : 'text-slate-400'} />
              <span>Dividido</span>
            </button>
          </div>

          {/* Creation buttons styled beautifully, less heavy */}
          {!isClientView && (
            <div className="flex items-center gap-1 w-full sm:w-auto shadow-xs bg-slate-100/80 border border-slate-200/55 p-0.5 rounded-xl shrink-0">
              <button
                onClick={handleAddChapter}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200/60 hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-lg text-[8.5px] sm:text-[9px] font-extrabold uppercase tracking-wider transition-all"
                title="Añadir un nuevo capítulo / sección principal"
              >
                <Plus size={10} />
                <span>Capítulo</span>
              </button>
              <button
                onClick={handleAddTaskValue}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[8.5px] sm:text-[9px] font-extrabold uppercase tracking-wider transition-all"
                title="Añadir una sub-tarea"
              >
                <Plus size={10} />
                <span>Tarea</span>
              </button>
              <button
                onClick={handleAddMilestone}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 bg-amber-50 border border-amber-200/60 hover:bg-amber-100 text-amber-800 rounded-lg text-[8.5px] sm:text-[9px] font-extrabold uppercase tracking-wider transition-all"
                title="Añadir un hito de entrega"
              >
                <Plus size={10} />
                <span>Hito</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Tasks spreadsheet panel */}
        <div 
          className={`flex flex-col bg-white relative transition-all duration-300 overflow-hidden ${
            paneMode === 'gantt' ? 'hidden' : 
            paneMode === 'tasks' ? 'w-full' : 
            'w-[330px] sm:w-[410px] md:w-[520px] shrink-0 border-r border-slate-200'
          }`}
        >
          {/* Header Row */}
          <div
            className="flex items-center border-b border-slate-200 bg-slate-50/80 backdrop-blur-sm shrink-0 font-semibold text-[10px] text-slate-500 uppercase tracking-wider px-3"
            style={{ height: TIMELINE_HEADER_HEIGHT }}
          >
            <div className="w-12 text-center font-mono text-[9px]">WBS</div>
            <div className="flex-1 min-w-0 pr-4 font-display">Nombre de Tarea</div>
            <div className="w-20 hidden sm:block font-display">Fechas</div>
            <div className="w-16 hidden sm:block font-display">Resp.</div>
            <div className="w-32 text-center shrink-0 font-display">Acciones</div>
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
              visibleTasks.map((task, idx) => {
                const isSelected = selectedTaskId === task.id;
                const styles = getTaskStyles(task);
                const wbsVal = task?.wbs || '';
                const dotCount = (wbsVal.match(/\./g) || []).length;
                const originalIndex = tasks.findIndex(t => t.id === task.id);
                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`flex items-center px-3 group transition-all duration-150 cursor-pointer relative border-b border-transparent ${styles.leftPaneBg} ${
                      isSelected ? 'ring-2 ring-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 z-10 shadow-sm' : ''
                    }`}
                    style={{ height: ROW_HEIGHT }}
                  >
                    {/* WBS input */}
                    <div className="w-12 pr-1.5 shrink-0">
                      <span className={`inline-block w-full py-0.5 text-center text-[10px] rounded uppercase tracking-wider font-mono ${styles.wbsBadge}`}>
                        {wbsVal}
                      </span>
                    </div>

                    {/* Name Input with Hierarchical Indentation and Toggle Collapse */}
                    <div className="flex-1 pr-1 min-w-0 flex items-center gap-1.5" style={{ paddingLeft: `${dotCount * 12}px` }}>
                      {hasSubtasks(wbsVal) ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCollapsedWbs(prev => ({
                              ...prev,
                              [wbsVal]: !prev[wbsVal]
                            }));
                          }}
                          className="p-1 -ml-1 text-slate-500 hover:text-orange-600 hover:bg-slate-100 rounded transition-all shrink-0"
                          title={collapsedWbs[wbsVal] ? "Expandir" : "Colapsar"}
                        >
                          <ChevronDown size={12} className={`transition-transform duration-200 ${collapsedWbs[wbsVal] ? '-rotate-90 text-slate-400' : 'text-slate-700'}`} />
                        </button>
                      ) : (
                        <div className="w-5 h-5 shrink-0" />
                      )}

                      <div className="flex-1 min-w-0">
                        <input
                          value={task?.name || ''}
                          readOnly={isClientView}
                          onChange={(e) => handleUpdateTaskField(task.id, 'name', e.target.value)}
                          className={`w-full bg-transparent border-none p-0 focus:ring-1 focus:ring-orange-500/20 focus:bg-white rounded truncate transition-all ${styles.textClass}`}
                        />
                        {task?.notes && (
                          <p className="text-[8px] text-slate-400 font-medium truncate mt-0.5">{task.notes}</p>
                        )}
                      </div>
                    </div>

                    {/* Brief date / details text */}
                    <div className="w-20 text-[10px] font-medium text-slate-500 hidden sm:block shrink-0">
                      <div className="font-bold text-slate-705 font-sans tracking-tight">
                        {(() => {
                          if (!task.start) return '-';
                          const d = new Date(task.start);
                          return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('es-ES', { month: '2-digit', day: 'numeric' });
                        })()}
                      </div>
                      {task.start !== task.end ? (
                        <div className="text-[9px] text-orange-600 font-bold font-sans tracking-tight mt-0.5">
                          al {(() => {
                            if (!task.end) return '-';
                            const d = new Date(task.end);
                            return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('es-ES', { month: '2-digit', day: 'numeric' });
                          })()}
                        </div>
                      ) : (
                        <div className="text-[8.5px] text-amber-600 font-extrabold tracking-wider mt-0.5 select-none bg-amber-50 border border-amber-200/50 rounded px-1.5 py-0.5 w-max">HITO</div>
                      )}
                    </div>

                    {/* Responsible label badge */}
                    <div className="w-16 hidden sm:block shrink-0 flex items-center justify-center">
                      {task.responsible ? (
                        <div 
                          className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200/60 border border-slate-200/50 py-1 px-1.5 rounded-xl transition-all max-w-full truncate shadow-xs select-none"
                          title={`Responsable: ${task.responsible}`}
                        >
                          <div className="w-4.5 h-4.5 rounded-full bg-gradient-to-tr from-orange-400 to-amber-500 text-white font-bold flex items-center justify-center text-[7.5px] shrink-0 font-display">
                            {getInitials(task.responsible)}
                          </div>
                          <span className="text-[8.5px] font-bold text-slate-600 uppercase tracking-tight truncate max-w-[32px]">
                            {task.responsible}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-350 font-bold block text-center select-none">-</span>
                      )}
                    </div>

                    {/* Re-ordering & operations */}
                    <div className="w-32 flex justify-end items-center gap-1 shrink-0 bg-white/80 p-1 rounded-xl shadow-xs border border-slate-100 transition-all opacity-95 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 sm:focus-within:opacity-100">
                      {!isClientView ? (
                        <>
                          {/* Subir */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMoveTaskOrder(originalIndex, 'up'); }}
                            disabled={originalIndex === 0}
                            className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg disabled:opacity-20 transition-all"
                            title="Subir tarea en lista"
                          >
                            <ChevronUp size={12} />
                          </button>

                          {/* Bajar */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMoveTaskOrder(originalIndex, 'down'); }}
                            disabled={originalIndex === tasks.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg disabled:opacity-20 transition-all"
                            title="Bajar tarea en lista"
                          >
                            <ChevronDown size={12} />
                          </button>

                          {/* Indentar / Anidar */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleIndentTask(task.id); }}
                            disabled={originalIndex === 0}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-20 transition-all"
                            title="Anidar / Indentar nivel"
                          >
                            <ArrowRight size={12} />
                          </button>

                          {/* Desanidar */}
                          {dotCount > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOutdentTask(task.id); }}
                              className="p-1 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                              title="Desanidar / Subir nivel"
                            >
                              <ArrowRight size={12} className="rotate-180" />
                            </button>
                          )}

                          {/* Editar detalles */}
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditModal(task); }}
                            className="p-1 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                            title="Editar detalles de tarea"
                          >
                            <Edit3 size={12} />
                          </button>

                          {/* Eliminar */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                            className="p-1 text-slate-350 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Eliminar tarea"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditModal(task); }}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver detalles"
                        >
                          <HelpCircle size={13} />
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
          className={`overflow-auto bg-slate-50 relative custom-scrollbar transition-all duration-300 ${
            paneMode === 'tasks' ? 'hidden' : 'flex-1'
          }`}
          ref={(node) => {
            if (rightScrollRef) {
              (rightScrollRef as any).current = node;
            }
            if (timelineScrollRef) {
              if (typeof timelineScrollRef === 'function') {
                timelineScrollRef(node);
              } else {
                (timelineScrollRef as any).current = node;
              }
            }
          }}
          onScroll={(e) => {
            handleRightScroll();
            if (onTimelineScroll) onTimelineScroll(e);
          }}
        >
          {/* Header Horizontal Row (Weeks, Months, etc.) */}
          <div
            className="flex border-b border-slate-350 bg-slate-50/95 backdrop-blur-sm sticky top-0 z-30 shrink-0 select-none"
            style={{ height: TIMELINE_HEADER_HEIGHT, width: timelineWidth }}
          >
            {gridColumns.map((col) => (
              <div
                key={col.index}
                className="absolute border-r border-slate-300 h-full text-center flex flex-col justify-center items-center bg-slate-100/30 shrink-0"
                style={{ left: col.left, width: columnWidth }}
              >
                <span className="text-[10px] font-semibold text-slate-700 font-display uppercase tracking-wider">{col.label}</span>
                {col.subLabel && <span className="text-[8px] text-orange-500 font-bold uppercase mt-0.5 tracking-wide font-mono">{col.subLabel}</span>}
              </div>
            ))}
          </div>

          {/* Rows Body Grid */}
          <div
            className="relative bg-slate-50/50"
            style={{ width: timelineWidth, height: visibleTasks.length * ROW_HEIGHT }}
          >
            {/* Column Background Dividers */}
            {gridColumns.map((col) => (
              <div
                key={`divider-${col.index}`}
                className="absolute border-r border-slate-200/80 h-full pointer-events-none"
                style={{ left: col.left, width: columnWidth }}
              />
            ))}

            {/* Dependency drawing SVG layer */}
            <svg
              className="absolute top-0 left-0 pointer-events-none w-full h-full z-10"
              style={{ width: timelineWidth, height: visibleTasks.length * ROW_HEIGHT + TIMELINE_HEADER_HEIGHT }}
            >
              <g transform={`translate(0, -${TIMELINE_HEADER_HEIGHT})`}>
                {dependencyLines}
              </g>
            </svg>

            {/* Task rows */}
            {visibleTasks.map((task, index) => {
              const xStart = getXFromDate(task.start);
              const barWidth = getWidthFromDates(task.start, task.end);
              const isSelected = selectedTaskId === task.id;
              const styles = getTaskStyles(task);

              return (
                <div
                  key={`bg-row-${task.id}`}
                  className={`absolute w-full flex items-center border-b border-slate-200/60 group transition-colors ${isSelected ? 'bg-slate-50/50' : 'hover:bg-slate-50/20'
                    }`}
                  style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT }}
                >
                  {/* Interactive Gantt Bar */}
                  {styles.isMilestone ? (
                    <div
                      style={{ left: xStart - 8, width: 16 }}
                      className={`absolute h-4 w-4 rotate-45 z-20 shadow-md transition-all cursor-grab active:cursor-grabbing select-none ${
                        styles.milestoneClass || 'bg-amber-500 hover:bg-amber-400 border-2 border-amber-600'
                      } ${
                        isSelected ? 'ring-2 ring-orange-500 shadow-orange-100 scale-110' : ''
                      }`}
                      onMouseDown={(e) => handleDragStart(e, task.id, 'move')}
                      title="Hito de Entrega - Arrastrar para cambiar fecha"
                    >
                      {/* Label label displayed to the right side of the Milestone */}
                      <span className={`absolute left-[180%] -top-1 px-2 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-wider whitespace-nowrap shadow-sm select-none pointer-events-none ${
                        styles.leftPaneBg.includes('bg-') ? styles.leftPaneBg.split(' ')[0] + ' ' + styles.leftPaneBg.split(' ').find(x => x.includes('border-')) : 'bg-amber-50 border-amber-200 text-amber-950'
                      } bg-white/95`}>
                        💎 {task.name}
                      </span>
                    </div>
                  ) : (
                    barWidth > 0 && (
                      <div
                        style={{ left: xStart, width: barWidth }}
                        className={`absolute h-8 rounded-xl z-20 flex items-center transition-all group/bar select-none ${
                          isSelected && !((styles.isChapter || hasSubtasks(task.wbs)) && barWidth < 135)
                            ? 'ring-2 ring-orange-500 shadow-orange-100'
                            : ''
                        } ${
                          (styles.isChapter || hasSubtasks(task.wbs)) && barWidth < 135
                            ? 'shadow-none'
                            : 'shadow-md'
                        } ${isClientView || hasSubtasks(task.wbs) ? 'cursor-default' : 'cursor-grab active:cursor-grabbing hover:shadow-lg'}`}
                        onMouseDown={(e) => { if (!hasSubtasks(task.wbs)) handleDragStart(e, task.id, 'move'); }}
                      >
                        {/* Bar Fill Backdrop */}
                        <div className={`absolute inset-0 rounded-xl overflow-hidden flex items-center ${
                          styles.isChapter || hasSubtasks(task.wbs)
                            ? (barWidth < 135 ? 'bg-transparent border-none shadow-none text-transparent' : 'bg-slate-900 border border-slate-700 shadow-inner')
                            : 'bg-slate-100/10 border'
                        } ${styles.leftPaneBg.includes('border-') ? styles.leftPaneBg.split(' ').find(x => x.includes('border-')) : 'border-slate-300'}`}>
                          {/* Progress Colored Fill */}
                          <div
                            style={{ width: `${task.progress}%` }}
                            className={`h-full ${styles.progressBg} rounded-l-md opacity-90 transition-all duration-300 ${
                              (styles.isChapter || hasSubtasks(task.wbs)) && barWidth < 135 ? 'hidden' : ''
                            }`}
                          />

                          {/* Traditional Summary task hangers */}
                          {(styles.isChapter || hasSubtasks(task.wbs)) && barWidth >= 135 && (
                            <>
                              <div className="absolute left-0 bottom-0 w-2.5 h-2.5 bg-slate-900 transform rotate-45 translate-y-1.5" />
                              <div className="absolute right-0 bottom-0 w-2.5 h-2.5 bg-slate-900 transform rotate-45 translate-y-1.5" />
                            </>
                          )}
                        </div>

                        {/* Interactive Left resize touch-point (visual grip handle & wide click hover zone) */}
                        {!isClientView && !styles.isChapter && !hasSubtasks(task.wbs) && (
                          <>
                            {/* Visual vertical rib-marks for grab indication */}
                            <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-indigo-205/50 rounded-full opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none" />
                            <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-indigo-205/50 rounded-full opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none" />
                            <div
                              className="absolute left-0 top-0 bottom-0 w-5 hover:bg-white/20 hover:border-l-4 hover:border-indigo-600 cursor-w-resize rounded-l-xl z-30 transition-all"
                              onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e, task.id, 'resize-start'); }}
                              title="Arrastrar para acortar o alargar desde el inicio (modificar duración)"
                            />
                          </>
                        )}

                         {/* Task Info Overlay Text inside bar */}
                        <div className={`absolute inset-0 px-4 flex items-center justify-between text-[9px] font-black uppercase tracking-wider pointer-events-none w-full truncate ${
                          styles.isChapter || hasSubtasks(task.wbs) ? 'text-white' : 'text-slate-900'
                        }`}>
                          {barWidth >= 135 ? (
                            <>
                              <span className="truncate max-w-[80%] pr-2">
                                {styles.isChapter || hasSubtasks(task.wbs) ? `📂 ${task.name}` : task.name}
                              </span>
                              <span>{task.progress}%</span>
                            </>
                          ) : null}
                        </div>

                        {/* Floating Task Label appended to the right of the bar if too narrow */}
                        {barWidth < 135 && (
                          <div className="absolute left-[103%] top-0 bottom-0 flex items-center whitespace-nowrap overflow-visible pointer-events-none select-none z-30 animate-in fade-in duration-300">
                            <span className={`text-[9.5px] font-black ${
                              styles.isChapter || hasSubtasks(task.wbs)
                                ? 'text-white bg-slate-900 border border-slate-800 shadow-md shadow-black/20'
                                : 'text-slate-700 bg-white/95 border border-slate-200 shadow-xs'
                            } px-2.5 py-1 rounded-xl flex items-center gap-1.5 backdrop-blur-xs`}>
                              <span>{styles.isChapter || hasSubtasks(task.wbs) ? `📂 ${task.name}` : task.name}</span>
                              <span className="text-orange-500 font-extrabold">({task.progress}%)</span>
                            </span>
                          </div>
                        )}

                        {/* Display handle progress indicator or drag points */}
                        {!isClientView && !styles.isChapter && !hasSubtasks(task.wbs) && (
                          <div
                            className="absolute h-3.5 w-3.5 bg-white border-2 border-orange-600 rounded-full cursor-col-resize opacity-0 group-hover/bar:opacity-100 z-30 transition-opacity -bottom-1 shadow-md"
                            style={{ left: `${task.progress}%`, transform: 'translateX(-50%)' }}
                            onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e, task.id, 'progress'); }}
                            title="Arrastrar progreso"
                          />
                        )}

                        {/* Interactive Right resize touch-point (visual grip handle & wide click hover zone) */}
                        {!isClientView && !styles.isChapter && !hasSubtasks(task.wbs) && (
                          <>
                            {/* Visual vertical rib-marks for grab indication */}
                            <div className="absolute right-1.5 top-2 bottom-2 w-0.5 bg-indigo-205/50 rounded-full opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none" />
                            <div className="absolute right-2 top-2 bottom-2 w-0.5 bg-indigo-205/50 rounded-full opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none" />
                            <div
                              className="absolute right-0 top-0 bottom-0 w-5 hover:bg-white/20 hover:border-r-4 hover:border-indigo-600 cursor-e-resize rounded-r-xl z-30 transition-all"
                              onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e, task.id, 'resize-end'); }}
                              title="Arrastrar para acortar o alargar desde el fin (modificar duración)"
                            />
                          </>
                        )}
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Editing Task Side drawer or Modal */}
      {isEditingModalOpen && editingTask && (() => {
        const isEditingTaskContainer = tasks.some(t => t && t.wbs && t.wbs.startsWith(`${editingTask.wbs}.`));

        // Format dates inside modal
        const formatToShow = (dateStr: string) => {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return '-';
          return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
        };

        // Compute Semana de Inicio (1-based index from projectStart)
        const sDate = new Date(editingTask.start);
        const pStart = new Date(projectStart);
        let startWeekVal = 1;
        if (!isNaN(sDate.getTime()) && !isNaN(pStart.getTime())) {
          const diffDays = (sDate.getTime() - pStart.getTime()) / (1000 * 60 * 60 * 24);
          startWeekVal = Math.round((diffDays / 7 + 1) * 10) / 10;
        }

        // Compute Duración en Semanas
        let durationWeeksVal = 1;
        if (editingTask.start === editingTask.end) {
          durationWeeksVal = 0;
        } else {
          const eDate = new Date(editingTask.end);
          if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime())) {
            const diffDays = (eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24) + 1;
            durationWeeksVal = Math.round((diffDays / 7) * 10) / 10;
          }
        }

        const updateTaskDates = (newStartWeek: number, newDurWeeks: number) => {
          const pStart = new Date(projectStart);
          pStart.setHours(0, 0, 0, 0);
          
          const startOffsetDays = (newStartWeek - 1) * 7;
          const newStartD = new Date(pStart.getTime() + startOffsetDays * 24 * 60 * 60 * 1000);
          
          let newEndD: Date;
          if (newDurWeeks <= 0) {
            newEndD = new Date(newStartD.getTime());
          } else {
            const durationDays = newDurWeeks * 7;
            newEndD = new Date(newStartD.getTime() + (durationDays - 1) * 24 * 60 * 60 * 1000);
          }
          
          setEditingTask({
            ...editingTask,
            start: newStartD.toISOString().split('T')[0],
            end: newEndD.toISOString().split('T')[0]
          });
        };

        const handleStartWeekChange = (val: number) => {
          const clamped = Math.max(1, val);
          updateTaskDates(clamped, durationWeeksVal);
        };

        const handleDurationWeeksChange = (val: number) => {
          const clamped = Math.max(0, val);
          updateTaskDates(startWeekVal, clamped);
        };

        return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl w-full max-w-lg border border-slate-100 space-y-5 overflow-y-auto max-h-[95vh] custom-scrollbar">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide">Configurar Tarea</h3>
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">Código WBS: {editingTask.wbs}</p>
              </div>
              <span className="px-3 py-1.5 bg-orange-50 text-orange-600 border border-orange-100 rounded-xl text-[10px] font-black uppercase tracking-wider">
                {editingTask.progress}% Completado
              </span>
            </div>

            {/* Custom Warning message for Container Tasks */}
            {isEditingTaskContainer && (
              <div className="bg-indigo-50/75 border border-indigo-100 p-4 rounded-2xl flex items-start gap-2.5">
                <CheckCircle2 size={14} className="text-indigo-600 mt-0.5 shrink-0 animate-pulse" />
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-indigo-950 uppercase tracking-wider">Duración y Progreso Automáticos</p>
                  <p className="text-[8.5px] font-bold text-slate-500 leading-relaxed uppercase">
                    Este elemento es un contenedor/capítulo con sub-tareas. Sus fechas y porcentaje se resumen de forma automática.
                  </p>
                </div>
              </div>
            )}

            {/* Custom Tab toggle to convert to Milestone (Hito) vs Standard Task */}
            {!isClientView && !isEditingTaskContainer && (
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1 flex items-center gap-1.5 text-amber-600">
                  💎 Tipo de Elemento
                </label>
                <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-2xl gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      // Set as Milestone: End date becomes identical to Start date
                      setEditingTask({
                        ...editingTask,
                        end: editingTask.start,
                        progress: editingTask.progress || 0
                      });
                    }}
                    className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                      editingTask.start === editingTask.end
                        ? 'bg-amber-500 text-slate-950 shadow-sm border border-amber-400 font-extrabold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    🔹 Hito de Entrega
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Set as Standard Task with duration (add 1 day if dates were same)
                      const startD = new Date(editingTask.start || new Date());
                      const validStart = isNaN(startD.getTime()) ? new Date() : startD;
                      let newEnd = editingTask.end;
                      if (!editingTask.end || editingTask.start === editingTask.end) {
                        const endD = new Date(validStart.getTime() + 24 * 60 * 60 * 1000);
                        newEnd = endD.toISOString().split('T')[0];
                      }
                      setEditingTask({
                        ...editingTask,
                        end: newEnd
                      });
                    }}
                    className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                      editingTask.start !== editingTask.end
                        ? 'bg-slate-900 text-white shadow-sm font-extrabold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    📊 Tarea con Duración
                  </button>
                </div>
              </div>
            )}

            {/* Parent Chapter Selection for Nesting */}
            {!isClientView && editingTask.wbs && (
              editingTask.wbs.includes('.') ? (
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1 flex items-center gap-1"><BookOpen size={10} /> Fase o Capítulo Padre</label>
                  <select
                    value={editingTask.wbs.split('.')[0]}
                    onChange={(e) => {
                      const newParentWbs = e.target.value;
                      const prefix = `${newParentWbs}.`;
                      const siblings = tasks.filter(t => t && t.id !== editingTask.id && t.wbs && t.wbs.startsWith(prefix));
                      const nextIndex = siblings.length + 1;
                      setEditingTask({
                        ...editingTask,
                        wbs: `${newParentWbs}.${nextIndex}`
                      });
                    }}
                    className="w-full bg-slate-50 border-none rounded-2xl text-[11px] font-bold text-slate-900 focus:ring-2 focus:ring-orange-600 py-3 px-4 shadow-inner cursor-pointer"
                  >
                    {tasks.filter(t => t && t.wbs && !t.wbs.includes('.')).map(ch => (
                      <option key={ch.id} value={ch.wbs}>📂 {ch.wbs} - {ch.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Estructura Jerencial</label>
                  <div className="bg-slate-50 p-3 rounded-2xl text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    📂 Tarea Raíz (Sección Principal/Capítulo)
                  </div>
                </div>
              )
            )}

            {/* Color Override Preset Selection */}
            {!isClientView && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Color de Línea / Hito</label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  {[
                    { key: '', name: 'Tema Capítulo' },
                    { key: 'indigo', bg: 'bg-indigo-500', border: 'border-indigo-600' },
                    { key: 'teal', bg: 'bg-teal-555', border: 'border-teal-600' },
                    { key: 'amber', bg: 'bg-amber-500', border: 'border-amber-600' },
                    { key: 'purple', bg: 'bg-purple-500', border: 'border-purple-600' },
                    { key: 'sky', bg: 'bg-sky-500', border: 'border-sky-600' },
                    { key: 'rose', bg: 'bg-rose-500', border: 'border-rose-600' },
                    { key: 'red', bg: 'bg-red-500', border: 'border-red-600' },
                    { key: 'orange', bg: 'bg-orange-500', border: 'border-orange-600' },
                    { key: 'green', bg: 'bg-green-500', border: 'border-green-600' },
                    { key: 'blue', bg: 'bg-blue-500', border: 'border-blue-600' },
                  ].map(option => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setEditingTask({ ...editingTask, color: option.key })}
                      className={`h-6 text-[8px] font-extrabold uppercase rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${
                        option.key === ''
                          ? `px-3.5 bg-slate-200 text-slate-700 border border-slate-300 hover:bg-slate-300 ${
                              !editingTask.color ? 'ring-2 ring-orange-500' : ''
                            }`
                          : `w-6 h-6 rounded-full ${option.bg} border-2 ${
                              editingTask.color === option.key ? 'ring-2 ring-orange-500 border-white scale-110 shadow-md' : 'border-transparent opacity-80 hover:opacity-100'
                            }`
                      }`}
                      title={option.name || option.key}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Nombre</label>
                <input
                  value={editingTask.name || ''}
                  disabled={isClientView}
                  onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })}
                  className="w-full bg-slate-50 border-none rounded-2xl text-[12px] font-bold text-slate-900 focus:ring-2 focus:ring-orange-600 py-3 px-4 shadow-inner"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Progreso (%)</label>
                <input
                  type="number" min="0" max="100"
                  value={editingTask.progress ?? 0}
                  disabled={isClientView || editingTask.start === editingTask.end || isEditingTaskContainer}
                  onChange={(e) => setEditingTask({ ...editingTask, progress: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                  className="w-full bg-slate-50 border-none rounded-2xl text-[12px] font-bold text-slate-900 focus:ring-2 focus:ring-orange-600 py-3 px-4 shadow-inner disabled:opacity-40"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1 flex items-center gap-1.5"><Calendar size={12} /> Semana Inicio</label>
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={startWeekVal}
                  disabled={isClientView || isEditingTaskContainer}
                  onChange={(e) => handleStartWeekChange(parseFloat(e.target.value) || 1)}
                  className="w-full bg-slate-50 border-none rounded-2xl text-[11px] font-bold text-slate-900 focus:ring-2 focus:ring-orange-600 py-3 px-4 shadow-inner disabled:opacity-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1 flex items-center gap-1.5"><Clock size={12} /> Duración (Semanas)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={durationWeeksVal}
                  disabled={isClientView || editingTask.start === editingTask.end || isEditingTaskContainer}
                  onChange={(e) => handleDurationWeeksChange(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border-none rounded-2xl text-[11px] font-bold text-slate-900 focus:ring-2 focus:ring-orange-600 py-3 px-4 shadow-inner disabled:opacity-50"
                />
                {editingTask.start === editingTask.end && (
                  <span className="text-[8px] text-amber-600 font-bold block ml-1 uppercase">Hitos tienen duración de 0 semanas</span>
                )}
              </div>

              {/* Fechas Calculadas Info Panel */}
              <div className="col-span-1 sm:col-span-2 bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col gap-1.5 text-[10px] uppercase font-black tracking-wider text-slate-500">
                <div className="flex justify-between items-center text-slate-400">
                  <span>📅 Inicio del Proyecto:</span>
                  <span className="text-slate-700 font-bold">{formatToShow(projectStart.toISOString().split('T')[0])}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>📅 Inicio de Tarea (calc):</span>
                  <span className="text-slate-800 font-bold">{formatToShow(editingTask.start)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>📅 Fin de Tarea (calc):</span>
                  <span className="text-slate-800 font-bold">{formatToShow(editingTask.end)}</span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-200/60">
                  <span>⏱️ Duración Calculada:</span>
                  <span className="text-orange-600 font-extrabold">
                    {editingTask.start === editingTask.end 
                      ? "0 DÍAS (HITO)" 
                      : `${Math.round(((new Date(editingTask.end).getTime() - new Date(editingTask.start).getTime()) / (1000 * 60 * 60 * 24) + 1) * 10) / 10} DÍAS (SEMANAS RESTRIGIDAS)`
                    }
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1 flex items-center gap-1.5"><User size={12} /> Responsable</label>
                <select
                  value={editingTask.responsible || ''}
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
                        <span>{t.wbs || ''} - {t.name}</span>
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
        );
      })()}
    </div>
  );
};
export default GanttCanvas;
