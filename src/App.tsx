import React, { useState, useEffect, useMemo, useRef } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '@/src/lib/firebase';
import {
  listUserProjects,
  saveProjectToCloud,
  deleteProjectFromCloud,
  getProjectFromCloud,
  updateCollaborators,
  CloudProject,
  ProjectCollaborator
} from '@/src/lib/firestoreService';
import {
  GanttTask,
  ProjectResource,
  ResourceAllocation,
  ProfileRate,
  ViewMode,
  Invoice,
  CloudProjectData
} from '@/src/types';

import Login from '@/components/Login';
import ShareModal from '@/components/ShareModal';
import CreateProjectModal from '@/components/CreateProjectModal';
import GanttCanvas from '@/components/GanttCanvas';
import { AsignacionPanel } from '@/components/AsignacionPanel';
import { PerfilesPanel } from '@/components/PerfilesPanel';
import { FacturacionPanel } from '@/components/FacturacionPanel';
import { ConfiguracionPanel } from '@/components/ConfiguracionPanel';
import { EquipoPanel } from '@/components/EquipoPanel';

import {
  Cloud, CloudLightning, LogOut, FolderKanban, Plus, Trash2,
  Share2, Save, Sparkles, Code2, Users, HardDriveUpload, Download,
  CheckCircle, Hammer, ChevronLeft, ChevronRight, Activity, AlertTriangle,
  Calendar, DollarSign, Settings2, FileSpreadsheet, ListCollapse
} from 'lucide-react';

const getMondayOfNextWeek = (): string => {
  const today = new Date();
  const day = today.getDay();
  const daysToNextMonday = day === 0 ? 1 : 8 - day;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysToNextMonday);
  return nextMonday.toISOString().split('T')[0];
};

const getSixMonthsAfter = (startDateStr: string): string => {
  const d = new Date(startDateStr);
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().split('T')[0];
};

const DEFAULT_PROJECT_START = getMondayOfNextWeek();
const DEFAULT_PROJECT_END = getSixMonthsAfter(DEFAULT_PROJECT_START);

const safeIsoString = (d: Date | undefined | null, fallback: string): string => {
  if (!d || isNaN(d.getTime())) return fallback;
  try {
    return d.toISOString().split('T')[0];
  } catch {
    return fallback;
  }
};

export const recalculateWBS = (tasksList: GanttTask[]): GanttTask[] => {
  if (!tasksList || tasksList.length === 0) return tasksList;

  const currentIndices: number[] = [];
  return tasksList.map(task => {
    const wbsStr = task.wbs || '1';
    const depth = wbsStr.split('.').length - 1;

    if (currentIndices.length > depth + 1) {
      currentIndices.length = depth + 1;
    }

    for (let d = 0; d < depth; d++) {
      if (currentIndices[d] === undefined || currentIndices[d] === 0) {
        currentIndices[d] = 1;
      }
    }

    currentIndices[depth] = (currentIndices[depth] || 0) + 1;
    const newWbs = currentIndices.slice(0, depth + 1).join('.');

    let newName = task.name;
    const taskRegex = /^(Nueva Tarea|Hito: Entrega Clave|Capítulo|CAPÍTULO)\s+\d+(\.\d+)*(.*)$/i;
    if (taskRegex.test(task.name)) {
      const chMatch = task.name.match(/^(Capítulo|CAPÍTULO)\s+\d+(\.\d+)*\s*:\s*(.*)$/i);
      if (chMatch) {
         newName = `${chMatch[1].toUpperCase()} ${newWbs}: ${chMatch[3]}`;
      } else {
         const genMatch = task.name.match(/^(Nueva Tarea|Hito: Entrega Clave|Capítulo|CAPÍTULO)\s+\d+(\.\d+)*(.*)$/i);
         if (genMatch) {
           newName = `${genMatch[1]} ${newWbs}${genMatch[3]}`;
         }
      }
    }

    return {
      ...task,
      wbs: newWbs,
      name: newName
    };
  });
};

export const computeRollupTasks = (rawTasks: GanttTask[]): GanttTask[] => {
  if (!rawTasks || rawTasks.length === 0) return rawTasks;

  return rawTasks.map(task => {
    const wbsVal = task.wbs || '';
    if (!wbsVal) return task;

    const prefix = `${wbsVal}.`;
    const subtasks = rawTasks.filter(t => t && t.wbs && t.wbs.startsWith(prefix));

    if (subtasks.length === 0) {
      return task;
    }

    // Leaf descendants of this project item
    const leafDescendants = subtasks.filter(st => {
      const stPrefix = `${st.wbs}.`;
      return !rawTasks.some(other => other && other.wbs && other.wbs.startsWith(stPrefix));
    });

    const validDescendants = leafDescendants.length > 0 ? leafDescendants : subtasks;

    const starts = validDescendants
      .map(st => st.start)
      .filter((s): s is string => !!s && !isNaN(new Date(s).getTime()));

    const ends = validDescendants
      .map(st => st.end)
      .filter((e): e is string => !!e && !isNaN(new Date(e).getTime()));

    const minStart = starts.length > 0 ? starts.reduce((min, s) => s < min ? s : min) : task.start;
    const maxEnd = ends.length > 0 ? ends.reduce((max, e) => e > max ? e : max) : task.end;

    let avgProgress = task.progress || 0;
    const progresses = validDescendants.map(st => st.progress ?? 0);
    if (progresses.length > 0) {
      const sum = progresses.reduce((acc, p) => acc + p, 0);
      avgProgress = Math.round(sum / progresses.length);
    }

    return {
      ...task,
      start: minStart,
      end: maxEnd,
      progress: avgProgress
    };
  });
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Projects list
  const [projects, setProjects] = useState<CloudProject[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState('Nuevo Proyecto de Timing');

  // Core project data states
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [resources, setResources] = useState<ProjectResource[]>([]);
  const [allocations, setAllocations] = useState<ResourceAllocation>({});
  const [profileRates, setProfileRates] = useState<ProfileRate[]>([
    { role: 'Coordinador', rate: 650 },
    { role: 'Ingeniero Proyectos', rate: 500 },
    { role: 'Programador Senior', rate: 450 },
    { role: 'Técnico Especialista', rate: 350 }
  ]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [yearlyInvoicingTotals, setYearlyInvoicingTotals] = useState<{ [year: number]: number }>({});
  const [projectStart, setProjectStart] = useState<Date>(new Date(DEFAULT_PROJECT_START));
  const [projectEnd, setProjectEnd] = useState<Date>(new Date(DEFAULT_PROJECT_END));
  const [isRelativeTime, setIsRelativeTime] = useState<boolean>(false);
  const [visibleYears, setVisibleYears] = useState<number[]>([]);

  // Collaboration details
  const [collaborators, setCollaborators] = useState<{ [uid: string]: ProjectCollaborator | 'editor' | 'viewer' }>({});
  const [collaboratorUids, setCollaboratorUids] = useState<string[]>([]);
  const [ownerId, setOwnerId] = useState<string>('');

  // UI States
  const [viewMode, setViewMode] = useState<ViewMode>('Week');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [footerHeight, setFooterHeight] = useState(380);
  const [isResizingHeight, setIsResizingHeight] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  // Lateral Sidebar Section selection state
  const [activeSection, setActiveSection] = useState<'gantt' | 'equipo' | 'perfiles' | 'facturacion' | 'configuracion'>('gantt');
  const [showJornadas, setShowJornadas] = useState(true);

  // Sync scrolling Refs
  const ganttScrollRef = useRef<HTMLDivElement | null>(null);
  const jornadasScrollRef = useRef<HTMLDivElement | null>(null);

  // Sync scroll left-to-right between GanttCanvas and AsignacionPanel
  useEffect(() => {
    const gDiv = ganttScrollRef.current;
    const jDiv = jornadasScrollRef.current;
    if (!gDiv || !jDiv) return;

    let isSyncing = false;

    const handleGanttScroll = () => {
      if (jDiv.scrollLeft !== gDiv.scrollLeft) {
        jDiv.scrollLeft = gDiv.scrollLeft;
      }
    };

    const handleJornadasScroll = () => {
      if (gDiv.scrollLeft !== jDiv.scrollLeft) {
        gDiv.scrollLeft = jDiv.scrollLeft;
      }
    };

    gDiv.addEventListener('scroll', handleGanttScroll, { passive: true });
    jDiv.addEventListener('scroll', handleJornadasScroll, { passive: true });

    return () => {
      gDiv.removeEventListener('scroll', handleGanttScroll);
      jDiv.removeEventListener('scroll', handleJornadasScroll);
    };
  }, [activeSection, showJornadas, ganttScrollRef.current, jornadasScrollRef.current]);

  // Listen to Firebase sign-in state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch projects list when user logs in
  const loadUserProjects = async (uid: string) => {
    try {
      const list = await listUserProjects(uid);
      setProjects(list);
      if (list.length > 0 && !currentProjectId) {
        setCurrentProjectId(list[0].id);
      }
    } catch (e) {
      console.error("Error loading user projects:", e);
    }
  };

  useEffect(() => {
    if (user) {
      loadUserProjects(user.uid);
    }
  }, [user]);

  // Load selected project data
  useEffect(() => {
    const fetchProj = async () => {
      if (!user || !currentProjectId) return;
      try {
        const proj = await getProjectFromCloud(user.uid, currentProjectId);
        if (proj) {
          setProjectTitle(proj.title);
          setOwnerId(proj.ownerId);
          setCollaborators(proj.collaborators || {});
          setCollaboratorUids(proj.collaboratorUids || []);

          const d = proj.data || {} as any;
          const recalculated = recalculateWBS(d.tasks || []);
          setTasks(computeRollupTasks(recalculated));
          setResources(d.resources || []);
          setAllocations(d.allocations || {});
          setProfileRates(d.rates || []);
          setInvoices(d.invoices || []);

          // Setup configurations
          if (d.config) {
            const startD = new Date(d.config.projectStart || DEFAULT_PROJECT_START);
            const endD = new Date(d.config.projectEnd || DEFAULT_PROJECT_END);
            setProjectStart(isNaN(startD.getTime()) ? new Date(DEFAULT_PROJECT_START) : startD);
            setProjectEnd(isNaN(endD.getTime()) ? new Date(DEFAULT_PROJECT_END) : endD);
            setIsRelativeTime(!!d.config.isRelativeTime);
          } else {
            setProjectStart(new Date(DEFAULT_PROJECT_START));
            setProjectEnd(new Date(DEFAULT_PROJECT_END));
            setIsRelativeTime(false);
          }

          // Build yearly totals
          const invoiceTotalsByYear: { [year: number]: number } = {};
          (d.invoices || []).forEach(inv => {
            invoiceTotalsByYear[inv.year] = (invoiceTotalsByYear[inv.year] || 0) + inv.amount;
          });
          setYearlyInvoicingTotals(invoiceTotalsByYear);
        }
      } catch (e) {
        console.error("Error fetching project details:", e);
      }
    };
    fetchProj();
  }, [currentProjectId, user]);

  // Read-only logic depending on active collaborator roles
  const activeRole = useMemo(() => {
    if (!user || ownerId === user.uid) return 'owner';
    const collab = collaborators[user.uid];
    if (collab) {
      return typeof collab === 'string' ? collab : collab.role;
    }
    return 'viewer'; // default fallback
  }, [user, ownerId, collaborators]);

  const isClientView = useMemo(() => {
    if (activeRole === 'owner') return false;
    if (activeRole === 'editor') return false;
    return true; // viewer is read-only
  }, [activeRole]);

  // Generate date parameters for active grid
  const validWeeks = useMemo(() => {
    const set = new Set<string>();
    const start = new Date(projectStart);
    if (viewMode === 'Week') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
    } else if (viewMode === 'Month') {
      start.setDate(1);
    } else {
      start.setMonth(0, 1);
    }

    const endBoundary = new Date(projectEnd);
    const curr = new Date(start);

    while (curr <= endBoundary) {
      const getMon = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayStr = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dayStr}`;
      };
      set.add(getMon(curr));

      if (viewMode === 'Week') curr.setDate(curr.getDate() + 7);
      else if (viewMode === 'Month') { curr.setMonth(curr.getMonth() + 1); curr.setDate(1); }
      else { curr.setFullYear(curr.getFullYear() + 1); curr.setMonth(0, 1); }
    }
    return set;
  }, [projectStart, projectEnd, viewMode]);

  // Sum planned individual and master budgets
  const totalCost = useMemo(() => {
    let sum = 0;
    resources.forEach((res) => {
      const rateObj = profileRates.find((r) => r.role === res.role);
      const rate = rateObj?.rate || 0;
      const resAlloc = allocations[res.id] || {};

      Object.entries(resAlloc).forEach(([key, days]) => {
        if (!validWeeks.has(key)) return;
        const dNum = typeof days === 'number' ? days : 0;
        sum += (dNum * rate);
      });
    });
    return sum;
  }, [resources, profileRates, allocations, validWeeks]);

  // Sync / Auto-save trigger
  const triggerCloudSave = async (
    customTitle?: string,
    customTasks?: GanttTask[],
    customResources?: ProjectResource[],
    customAllocations?: ResourceAllocation,
    customInvoices?: Invoice[],
    customRates?: ProfileRate[],
    customStart?: Date,
    customEnd?: Date,
    customRelative?: boolean
  ) => {
    if (!user || !currentProjectId || isClientView) return;

    setIsSaving(true);
    setSaveError(null);

    const dataPayload = {
      title: customTitle ?? projectTitle,
      data: {
        tasks: customTasks ?? tasks,
        resources: customResources ?? resources,
        allocations: customAllocations ?? allocations,
        rates: customRates ?? profileRates,
        invoices: customInvoices ?? invoices,
        config: {
          wbsLabel: 'WBS',
          responsibleLabel: 'Responsable',
          projectStart: safeIsoString(customStart ?? projectStart, DEFAULT_PROJECT_START),
          projectEnd: safeIsoString(customEnd ?? projectEnd, DEFAULT_PROJECT_END),
          isRelativeTime: customRelative ?? isRelativeTime,
          statusDate: null
        }
      }
    };

    try {
      await saveProjectToCloud(user.uid, currentProjectId, dataPayload);
    } catch (err: any) {
      console.error(err);
      setSaveError(err.message || 'Error al guardar el proyecto en la nube.');
    } finally {
      setIsSaving(false);
    }
  };

  // Debounced auto-save triggers for direct state changes
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debounceCloudSave = (
    updatedTasks: GanttTask[],
    updatedResources: ProjectResource[],
    updatedAlloc: ResourceAllocation,
    updatedInvoices: Invoice[],
    updatedRates: ProfileRate[]
  ) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      triggerCloudSave(
        projectTitle,
        updatedTasks,
        updatedResources,
        updatedAlloc,
        updatedInvoices,
        updatedRates
      );
    }, 1500);
  };

  // Actions
  const handleAddNewProject = async (customTitle?: string) => {
    if (!user) return;
    const newId = `timing-${Date.now()}`;
    const finalTitle = (customTitle && customTitle.trim()) || 'PROYECTO TIMING';
    const initialPayload = {
      title: finalTitle,
      collaborators: {},
      collaboratorUids: [],
      data: {
        tasks: [],
        resources: [],
        allocations: {},
        rates: profileRates,
        invoices: [],
        config: {
          wbsLabel: 'WBS',
          responsibleLabel: 'Responsable',
          projectStart: DEFAULT_PROJECT_START,
          projectEnd: DEFAULT_PROJECT_END,
          isRelativeTime: false,
          statusDate: null
        }
      }
    };

    setIsSaving(true);
    try {
      await saveProjectToCloud(user.uid, newId, initialPayload);
      await loadUserProjects(user.uid);
      setCurrentProjectId(newId);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCurrentProject = async () => {
    if (!user || !currentProjectId || isClientView) return;
    if (activeRole !== 'owner') {
      alert("Solo el propietario del proyecto puede eliminarlo.");
      return;
    }

    if (confirm("¿Estás absolutamente seguro de que deseas eliminar este proyecto de la nube? Esta acción es irreversible.")) {
      setIsSaving(true);
      try {
        await deleteProjectFromCloud(user.uid, currentProjectId);
        const filtered = projects.filter(p => p.id !== currentProjectId);
        setProjects(filtered);
        if (filtered.length > 0) {
          setCurrentProjectId(filtered[0].id);
        } else {
          setCurrentProjectId(null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleUpdateCollaborators = async (newCollabs: { [uid: string]: ProjectCollaborator | 'editor' | 'viewer' }) => {
    if (!currentProjectId || isClientView) return;
    try {
      await updateCollaborators(currentProjectId, newCollabs);
      setCollaborators(newCollabs);
      setCollaboratorUids(Object.keys(newCollabs));
    } catch (e) {
      console.error(e);
      alert("Error actualizando colaboradores.");
    }
  };

  // Sub-state callbacks passed down to subcomponents
  const handleUpdateProjectStart = (newDate: Date) => {
    const oldProjectStart = new Date(projectStart);
    setProjectStart(newDate);

    const diffTime = newDate.getTime() - oldProjectStart.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    let updatedTasks = tasks;
    let newProjectEnd = projectEnd;
    let updatedAllocations = allocations;

    if (diffDays !== 0) {
      // Shifting all tasks blocks
      updatedTasks = tasks.map(t => {
        const s = new Date(t.start);
        const e = new Date(t.end);
        if (isNaN(s.getTime()) || isNaN(e.getTime())) return t;

        const newStartD = new Date(s.getTime() + diffDays * 24 * 60 * 60 * 1000);
        const newEndD = new Date(e.getTime() + diffDays * 24 * 60 * 60 * 1000);

        return {
          ...t,
          start: newStartD.toISOString().split('T')[0],
          end: newEndD.toISOString().split('T')[0]
        };
      });

      // Shift projectEnd as well to keep project boundary length constant
      newProjectEnd = new Date(projectEnd.getTime() + diffDays * 24 * 60 * 60 * 1000);
      setProjectEnd(newProjectEnd);

      // Shift allocation weeks keys to preserve resource assignments relative to shifted tasks
      if (allocations) {
        updatedAllocations = {};
        for (const resId in allocations) {
          updatedAllocations[resId] = {};
          for (const weekKey in allocations[resId]) {
            const allocationValue = allocations[resId][weekKey];
            const d = new Date(weekKey);
            if (!isNaN(d.getTime())) {
              const shiftedDate = new Date(d.getTime() + diffDays * 24 * 60 * 60 * 1000);
              const newWeekKey = shiftedDate.toISOString().split('T')[0];
              updatedAllocations[resId][newWeekKey] = allocationValue;
            } else {
              updatedAllocations[resId][weekKey] = allocationValue;
            }
          }
        }
        setAllocations(updatedAllocations);
      }
    }

    const rolledUp = computeRollupTasks(updatedTasks);
    setTasks(rolledUp);
    triggerCloudSave(projectTitle, rolledUp, resources, updatedAllocations, invoices, profileRates, newDate, newProjectEnd);
  };

  const handleUpdateTasks = (newTasks: GanttTask[]) => {
    const recalculated = recalculateWBS(newTasks);
    const rolledUp = computeRollupTasks(recalculated);
    setTasks(rolledUp);
    debounceCloudSave(rolledUp, resources, allocations, invoices, profileRates);
  };

  const handleAddResource = () => {
    if (isClientView) return;
    const newId = `res-${Date.now()}`;
    const nextRes = [...resources, { id: newId, name: `Recurso ${resources.length + 1}`, role: profileRates[0]?.role || 'Coordinador' }];
    setResources(nextRes);
    debounceCloudSave(tasks, nextRes, allocations, invoices, profileRates);
  };

  const handleRemoveResource = (id: string) => {
    if (isClientView) return;
    const nextRes = resources.filter(r => r.id !== id);
    const nextAlloc = { ...allocations };
    delete nextAlloc[id];
    setResources(nextRes);
    setAllocations(nextAlloc);
    debounceCloudSave(tasks, nextRes, nextAlloc, invoices, profileRates);
  };

  const handleUpdateResource = (id: string, updates: Partial<ProjectResource>) => {
    if (isClientView) return;
    const nextRes = resources.map(r => r.id === id ? { ...r, ...updates } : r);
    setResources(nextRes);
    debounceCloudSave(tasks, nextRes, allocations, invoices, profileRates);
  };

  const handleUpdateAllocation = (resourceId: string, weekKey: string, value: number) => {
    if (isClientView) return;
    const nextAlloc = {
      ...allocations,
      [resourceId]: {
        ...(allocations[resourceId] || {}),
        [weekKey]: value
      }
    };
    setAllocations(nextAlloc);
    debounceCloudSave(tasks, resources, nextAlloc, invoices, profileRates);
  };

  const handleUpdateInvoices = (newInvoices: Invoice[]) => {
    setInvoices(newInvoices);
    const invoiceTotalsByYear: { [year: number]: number } = {};
    newInvoices.forEach(inv => {
      invoiceTotalsByYear[inv.year] = (invoiceTotalsByYear[inv.year] || 0) + inv.amount;
    });
    setYearlyInvoicingTotals(invoiceTotalsByYear);
    debounceCloudSave(tasks, resources, allocations, newInvoices, profileRates);
  };

  const handleUpdateRates = (newRates: ProfileRate[]) => {
    setProfileRates(newRates);
    debounceCloudSave(tasks, resources, allocations, invoices, newRates);
  };

  const generateMonthlyInvoices = () => {
    if (isClientView) return;
    // Auto populate milestone invoices based on project range
    const startYear = projectStart.getFullYear();
    const endYear = projectEnd.getFullYear();
    const list: Invoice[] = [];

    for (let y = startYear; y <= endYear; y++) {
      const yearInvoicing = yearlyInvoicingTotals[y] || 0;
      // Define 12 standard monthly milestones
      for (let m = 1; m <= 12; m++) {
        const desc = `Certificación Mes ${String(m).padStart(2, '0')} / ${y}`;
        list.push({
          id: `inv-${y}-${m}-${Date.now()}`,
          description: desc,
          amount: Math.round(yearInvoicing / 12),
          year: y
        });
      }
    }
    handleUpdateInvoices(list);
  };

  // Backwards resizer for bottom Admin Panel height
  const handleStartResizeHeight = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingHeight(true);
  };

  useEffect(() => {
    if (isResizingHeight) {
      const handleMouseMove = (e: MouseEvent) => {
        const delta = window.innerHeight - e.clientY;
        setFooterHeight(Math.max(120, Math.min(window.innerHeight - 100, delta)));
      };
      const handleMouseUp = () => setIsResizingHeight(false);

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizingHeight]);

  // Export / Import tools (JSON file based backups)
  const handleExportBackup = () => {
    const payload: CloudProjectData = {
      tasks,
      resources,
      allocations,
      rates: profileRates,
      invoices,
      config: {
        wbsLabel: 'WBS',
        responsibleLabel: 'Responsable',
        projectStart: safeIsoString(projectStart, DEFAULT_PROJECT_START),
        projectEnd: safeIsoString(projectEnd, DEFAULT_PROJECT_END),
        isRelativeTime,
        statusDate: null
      }
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SGS-Timing-Backup-${projectTitle.replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportReport = () => {
    // Elegant tabular detailed CSV export
    let csv = "WBS,Tarea,Responsable,Fecha Inicio,Fecha Fin,Progreso (%)\n";
    tasks.forEach(t => {
      csv += `"${t.wbs}","${t.name.replace(/"/g, '""')}","${(t.responsible || 'Sin asignar').replace(/"/g, '""')}","${t.start}","${t.end}",${t.progress}\n`;
    });

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SGS-Timing-Report-${projectTitle.replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (file: File) => {
    if (isClientView) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target?.result as string);
        if (raw.tasks && raw.resources) {
          const recalculated = recalculateWBS(raw.tasks);
          const rolledUp = computeRollupTasks(recalculated);
          setTasks(rolledUp);
          setResources(raw.resources);
          setAllocations(raw.allocations || {});
          setProfileRates(raw.rates || []);
          setInvoices(raw.invoices || []);
          if (raw.config) {
            setProjectStart(new Date(raw.config.projectStart || DEFAULT_PROJECT_START));
            setProjectEnd(new Date(raw.config.projectEnd || DEFAULT_PROJECT_END));
            setIsRelativeTime(!!raw.config.isRelativeTime);
          }
          triggerCloudSave(
            projectTitle,
            rolledUp,
            raw.resources,
            raw.allocations,
            raw.invoices,
            raw.rates,
            raw.config?.projectStart ? new Date(raw.config.projectStart) : undefined,
            raw.config?.projectEnd ? new Date(raw.config.projectEnd) : undefined,
            raw.config?.isRelativeTime
          );
          alert("Datos reestablecidos con éxito!");
        } else {
          alert("El archivo no posee un esquema de proyecto Timing compatible.");
        }
      } catch (err) {
        alert("Error al procesar el archivo. Asegúrate que es de formato JSON válido.");
      }
    };
    reader.readAsText(file);
  };

  if (authChecking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
        <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mb-4" />
        <span className="text-xs font-black uppercase tracking-widest text-slate-500">Iniciando SGS Timing...</span>
      </div>
    );
  }

  // Not Logged In screen
  if (!user) {
    return <Login onLogin={() => loadUserProjects('')} />;
  }

  return (
    <div className="h-screen w-full flex flex-col bg-[#fafafa] overflow-hidden font-sans text-slate-900 selection:bg-orange-500/20 antialiased">
      {/* Top Navigation Cockpit Header */}
      <header className="min-h-[64px] py-2.5 lg:py-0 lg:h-[64px] shrink-0 border-b border-slate-950/80 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col lg:flex-row items-stretch lg:items-center justify-between px-4 md:px-6 z-40 select-none shadow-xl gap-3 lg:gap-0">
        
        {/* Logo and project name input */}
        <div className="flex flex-wrap items-center gap-2.5 md:gap-4 flex-1 min-w-0 pr-0 lg:pr-4 justify-between lg:justify-start">
          {/* Brand Logo with display typography */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl font-display font-black text-xs sm:text-sm tracking-wide shrink-0 shadow-lg shadow-orange-600/10 border border-orange-400/20 hover:brightness-105 transition-all select-none">
            <FolderKanban size={14} className="text-white shrink-0" />
            <span>SGS TIMING</span>
          </div>

          {/* Unified Project Switcher & Renamer */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:border-orange-500/50 focus-within:ring-1 focus-within:ring-orange-500/20 transition-all shrink-0 max-w-sm">
            {/* Project dropdown selector */}
            <div className="flex items-center gap-1 bg-white/5 border-r border-white/10 shrink-0 select-none pl-2.5 pr-1 py-1.5">
              <CloudLightning size={12} className="text-orange-500 shrink-0" />
              <select
                value={currentProjectId || ''}
                onChange={(e) => setCurrentProjectId(e.target.value)}
                className="bg-transparent border-none text-[10px] font-extrabold font-mono focus:ring-0 cursor-pointer text-slate-200 p-0 pr-4 uppercase tracking-wider focus:outline-none"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-950 text-slate-200 py-1 font-sans font-bold">
                    {p.title.toUpperCase()}
                  </option>
                ))}
                {projects.length === 0 && <option value="">Crear...</option>}
              </select>
            </div>

            {/* Rename input / Display */}
            {!isClientView ? (
              <input
                value={projectTitle}
                onChange={(e) => {
                  setProjectTitle(e.target.value);
                  if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                  saveTimeoutRef.current = setTimeout(() => {
                    triggerCloudSave(e.target.value);
                  }, 1500);
                }}
                onSubmit={() => triggerCloudSave(projectTitle)}
                placeholder="Editar título..."
                className="bg-transparent border-none text-[10.5px] font-extrabold text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-0 px-2.5 py-1.5 w-32 truncate uppercase tracking-wider font-display"
              />
            ) : (
              <span className="text-[10.5px] font-extrabold text-slate-300 px-2.5 py-1.5 w-32 truncate select-none uppercase tracking-wider font-display">
                {projectTitle}
              </span>
            )}
          </div>

          {!isClientView && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white rounded-xl text-[10px] font-bold transition-all uppercase tracking-wider shrink-0 select-none font-sans"
              title="Crear un nuevo proyecto de Timing"
            >
              <Plus size={12} />
              <span>Nuevo Proyecto</span>
            </button>
          )}

          {/* Collaborator Badge Information */}
          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/5 shrink-0 select-none">
            <span className="relative flex h-1.5 w-1.5 mr-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span className="text-[9px] font-bold font-mono text-slate-300 uppercase tracking-wider">
              {activeRole === 'owner' ? 'Propietario' : activeRole === 'editor' ? 'Editor' : 'Lector'}
            </span>
          </div>
        </div>

        {/* Sync, Share, and Sign-out Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 shrink-0 justify-between lg:justify-end border-t border-white/5 pt-2.5 lg:pt-0 lg:border-t-0">
          
          {/* Cloud Saving indicators */}
          <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
            {isSaving ? (
              <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                <Cloud className="animate-bounce" size={13} />
                <span>Guardando...</span>
              </div>
            ) : saveError ? (
              <div className="flex items-center gap-1.5 text-red-400 text-[10px] font-bold uppercase tracking-wider" title={saveError}>
                <AlertTriangle size={13} />
                <span>Error guardado</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                <CheckCircle size={13} className="text-emerald-400" />
                <span>Nube Al Día</span>
              </div>
            )}
          </div>

          {!isClientView && currentProjectId && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-100 hover:text-white border border-white/10 rounded-xl text-[10px] font-bold transition-all uppercase tracking-wider shadow-sm shrink-0"
              title="Compartir Proyecto"
            >
              <Share2 size={12} className="text-orange-500" />
              <span>Compartir ({collaboratorUids.length})</span>
            </button>
          )}

          {currentProjectId && activeRole === 'owner' && (
            <button
              onClick={handleDeleteCurrentProject}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-xl transition-all"
              title="Eliminar Proyecto"
            >
              <Trash2 size={13} />
            </button>
          )}

          <div className="h-6 w-px bg-white/10 mx-1 hidden xs:block" />

          {/* User Profile Avatar block */}
          <div className="flex items-center gap-2.5 pl-1 min-w-0 max-w-[200px]">
            <div className="flex flex-col text-right justify-center min-w-0">
              <div className="text-[10px] font-bold truncate max-w-[100px] xs:max-w-[125px] sm:max-w-[150px] tracking-tight leading-none text-slate-300 mb-1" title={user.email}>
                {user.email}
              </div>
              <div className="text-[8px] font-bold font-mono text-orange-500 uppercase tracking-widest leading-none block">
                SGS STAFF
              </div>
            </div>
            <button
              onClick={() => {
                if (confirm("Terminar sesión de SGS Timing?")) {
                  signOut(auth);
                }
              }}
              className="p-2 bg-white/5 hover:bg-white/10 hover:text-red-400 text-slate-300 rounded-xl transition-colors shrink-0"
              title="Cerrar sesión"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* Main split work space area with Lateral Sidebar Menu */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Navigation Sidebar (Menu Lateral) */}
        <nav className={`transition-all duration-300 ${isNavCollapsed ? 'w-16' : 'w-16 md:w-60'} bg-gradient-to-b from-slate-950 to-slate-900 border-r border-slate-950 flex flex-col justify-between select-none py-4 shrink-0 z-30`}>
          <div className="space-y-1.5 px-2 md:px-3">
            {[
              { id: 'gantt', label: 'Plan de Trabajo', icon: Calendar, subtitle: 'Gantt & Jornadas' },
              { id: 'equipo', label: 'Equipo', icon: Users, subtitle: 'Miembros de Trabajo' },
              { id: 'perfiles', label: 'Perfiles Maestro', icon: FileSpreadsheet, subtitle: 'Tarifas de Roles' },
              { id: 'facturacion', label: 'Facturación', icon: DollarSign, subtitle: 'Hitos de Cobro' },
              { id: 'configuracion', label: 'Configuración', icon: Settings2, subtitle: 'Parámetros Timing' },
            ].map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id as any)}
                  className={`w-full flex items-center justify-center ${isNavCollapsed ? 'justify-center px-0' : 'md:justify-start px-3'} gap-3 py-2.5 rounded-xl transition-all duration-150 group relative ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white font-black shadow-lg shadow-orange-950/40 border border-orange-400/10'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                  }`}
                  title={section.label}
                >
                  <Icon size={15} className={`shrink-0 ${isActive ? 'text-white scale-105' : 'text-slate-400 group-hover:text-orange-500 transition-colors'}`} />
                  <div className={`${isNavCollapsed ? 'hidden' : 'hidden md:flex'} flex-col text-left`}>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold font-display">{section.label}</span>
                    <span className={`text-[8px] uppercase tracking-wider leading-none mt-0.5 font-bold ${isActive ? 'text-orange-200' : 'text-slate-500 group-hover:text-slate-400'}`}>
                      {section.subtitle}
                    </span>
                  </div>
                  {isActive && !isNavCollapsed && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </button>
              );
            })}
            
            {/* Collapse Trigger Button */}
            <button
              onClick={() => setIsNavCollapsed(!isNavCollapsed)}
              className={`w-full flex items-center justify-center ${
                isNavCollapsed ? 'justify-center px-0' : 'md:justify-start px-3'
              } gap-3 py-2.5 rounded-xl transition-all text-slate-500 hover:text-slate-300 hover:bg-white/5 mt-4 border-t border-white/5 pt-4`}
              title={isNavCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
            >
              {isNavCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              <span className={`${isNavCollapsed ? 'hidden' : 'hidden md:inline'} text-[10px] uppercase tracking-wider font-bold`}>
                Colapsar Menú
              </span>
            </button>
          </div>

          {/* Quick stats section formatted in premium card style */}
          <div className={`${isNavCollapsed ? 'hidden' : 'hidden md:block'} px-3 pt-3 border-t border-white/5`}>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center transition-all hover:bg-white/10">
              <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase block mb-1">PRESUPUESTO TOTAL</span>
              <span className="text-sm font-black text-amber-500 tracking-tight font-mono block">
                {totalCost.toLocaleString()} €
              </span>
            </div>
          </div>
        </nav>

        {/* Dynamic Workspace container */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-white">
          {!currentProjectId ? (
            <div className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-slate-50/40 relative overflow-hidden select-none">
              <div className="absolute top-[-10%] left-[-10%] w-[35%] h-[35%] bg-orange-100/20 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] bg-amber-100/15 rounded-full blur-3xl" />
              
              <div className="max-w-md bg-white p-10 rounded-[2.5rem] border border-slate-200/50 shadow-xl flex flex-col items-center gap-6 relative z-10 animate-fade-in font-sans">
                <div className="w-16 h-16 bg-gradient-to-tr from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/10">
                  <FolderKanban className="text-white" size={32} />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-lg font-bold tracking-tight text-slate-800 font-display uppercase">SGS Timing</h2>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    No tienes ningún proyecto activo. Crea tu primera planificación de tiempos utilizando el botón a continuación para empezar.
                  </p>
                </div>

                <div className="w-full">
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 font-bold text-[10px] uppercase tracking-widest text-white shadow-md shadow-orange-500/10 rounded-2xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                    <Plus size={14} />
                    <span>Crear Proyecto de Timing</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {activeSection === 'gantt' && (
            <div className="flex-grow flex flex-col overflow-hidden">
              {/* Gantt scale & workloads controls row */}
              <div className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 sm:px-6 shrink-0 select-none font-sans">
                <div className="flex items-center gap-4 font-sans">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden xs:inline font-display">Escala:</span>
                  <div className="flex items-center gap-1 bg-slate-100/70 p-1 rounded-2xl border border-slate-200/50">
                    {(['Week', 'Month', 'Year'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={`px-3.5 py-1.5 rounded-xl text-[9px] font-bold transition-all uppercase tracking-wider ${
                          viewMode === mode
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                        }`}
                      >
                        {mode === 'Week' ? 'Semanas' : mode === 'Month' ? 'Meses' : 'Años'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 font-sans">
                  <button
                    onClick={() => setShowJornadas(!showJornadas)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-[9px] font-bold transition-all uppercase tracking-wider ${
                      showJornadas
                        ? 'bg-orange-50 border-orange-200/60 text-orange-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50/80'
                    }`}
                  >
                    <ListCollapse size={12} />
                    <span>{showJornadas ? 'Ocultar Jornadas' : 'Asignar Jornadas'}</span>
                  </button>
                </div>
              </div>

              {/* Stacked Workspace body displaying Gantt chart and, if toggled, synced Jornadas grid */}
              <div className="flex-1 flex flex-col overflow-hidden relative">
                <div className="flex-1 flex overflow-hidden">
                  {/* Right side interactive timeline (synchronized) */}
                  <GanttCanvas
                    viewMode={viewMode}
                    tasks={tasks}
                    onUpdateTasks={handleUpdateTasks}
                    projectStart={projectStart}
                    projectEnd={projectEnd}
                    isRelativeTime={isRelativeTime}
                    resources={resources}
                    isClientView={isClientView}
                    isSidebarOpen={isSidebarOpen}
                    setIsSidebarOpen={setIsSidebarOpen}
                    timelineScrollRef={ganttScrollRef}
                  />
                </div>

                {/* Left-Right scroll aligned workday allocation */}
                {showJornadas && (
                  <AsignacionPanel
                    viewMode={viewMode}
                    resources={resources}
                    allocations={allocations}
                    validWeeks={validWeeks}
                    onUpdateAllocation={handleUpdateAllocation}
                    projectStart={projectStart}
                    projectEnd={projectEnd}
                    isRelativeTime={isRelativeTime}
                    isClientView={isClientView}
                    onRemoveResource={handleRemoveResource}
                    onUpdateResource={handleUpdateResource}
                    profileRoles={profileRates.map((r) => r.role)}
                    rightScrollRef={jornadasScrollRef}
                  />
                )}
              </div>
            </div>
          )}

          {activeSection === 'equipo' && (
            <EquipoPanel
              resources={resources}
              profileRates={profileRates}
              allocations={allocations}
              validWeeks={validWeeks}
              onAddResource={handleAddResource}
              onRemoveResource={handleRemoveResource}
              onUpdateResource={handleUpdateResource}
              isClientView={isClientView}
            />
          )}

          {activeSection === 'perfiles' && (
            <PerfilesPanel
              profileRates={profileRates}
              onUpdateRates={handleUpdateRates}
              isClientView={isClientView}
            />
          )}

          {activeSection === 'facturacion' && (
            <FacturacionPanel
              invoices={invoices}
              onUpdateInvoices={handleUpdateInvoices}
              yearlyInvoicingTotals={yearlyInvoicingTotals}
              onUpdateYearlyInvoicingTotals={setYearlyInvoicingTotals}
              generateMonthlyInvoices={generateMonthlyInvoices}
              projectStart={projectStart}
              projectEnd={projectEnd}
              resources={resources}
              profileRates={profileRates}
              allocations={allocations}
              validWeeks={validWeeks}
              isClientView={isClientView}
            />
          )}

          {activeSection === 'configuracion' && (
            <ConfiguracionPanel
              projectStart={projectStart}
              setProjectStart={handleUpdateProjectStart}
              projectEnd={projectEnd}
              setProjectEnd={(d) => {
                setProjectEnd(d);
                triggerCloudSave(projectTitle, tasks, resources, allocations, invoices, profileRates, projectStart, d);
              }}
              isRelativeTime={isRelativeTime}
              setIsRelativeTime={(v) => {
                setIsRelativeTime(v);
                triggerCloudSave(projectTitle, tasks, resources, allocations, invoices, profileRates, projectStart, projectEnd, v);
              }}
              onExport={handleExportBackup}
              onExportReport={handleExportReport}
              onImport={handleImportBackup}
              totalCost={totalCost}
              visibleYears={visibleYears}
              setVisibleYears={setVisibleYears}
              isClientView={isClientView}
            />
          )}
        </>
      )}
    </div>
      </div>

      {/* Share settings configuration overlay */}
      {isShareModalOpen && currentProjectId && (
        <ShareModal
          projectId={currentProjectId}
          ownerId={ownerId}
          collaborators={collaborators}
          onClose={() => setIsShareModalOpen(false)}
          onUpdate={handleUpdateCollaborators}
        />
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={async (title) => {
          await handleAddNewProject(title);
        }}
      />
    </div>
  );
}
