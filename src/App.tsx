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
import AdminPanel from '@/components/AdminPanel';
import GanttCanvas from '@/components/GanttCanvas';

import {
  Cloud, CloudLightning, LogOut, FolderKanban, Plus, Trash2,
  Share2, Save, Sparkles, Code2, Users, HardDriveUpload, Download,
  CheckCircle, Hammer, ChevronRight, Activity, AlertTriangle
} from 'lucide-react';

const DEFAULT_PROJECT_START = '2026-05-18';
const DEFAULT_PROJECT_END = '2026-11-20';

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
  const [footerHeight, setFooterHeight] = useState(380);
  const [isResizingHeight, setIsResizingHeight] = useState(false);

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

          const d = proj.data;
          setTasks(d.tasks || []);
          setResources(d.resources || []);
          setAllocations(d.allocations || {});
          setProfileRates(d.rates || []);
          setInvoices(d.invoices || []);

          // Setup configurations
          if (d.config) {
            setProjectStart(new Date(d.config.projectStart || DEFAULT_PROJECT_START));
            setProjectEnd(new Date(d.config.projectEnd || DEFAULT_PROJECT_END));
            setIsRelativeTime(!!d.config.isRelativeTime);
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
          projectStart: (customStart ?? projectStart).toISOString().split('T')[0],
          projectEnd: (customEnd ?? projectEnd).toISOString().split('T')[0],
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
  const handleAddNewProject = async () => {
    if (!user) return;
    const newId = `timing-${Date.now()}`;
    const initialPayload = {
      title: 'Nuevo Proyecto Timing',
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
  const handleUpdateTasks = (newTasks: GanttTask[]) => {
    setTasks(newTasks);
    debounceCloudSave(newTasks, resources, allocations, invoices, profileRates);
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
        projectStart: projectStart.toISOString().split('T')[0],
        projectEnd: projectEnd.toISOString().split('T')[0],
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
          setTasks(raw.tasks);
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
            raw.tasks,
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
    <div className="h-screen w-full flex flex-col bg-[#f8fafc] overflow-hidden font-sans">
      {/* Top Navigation Cockpit Header */}
      <header className="h-[64px] shrink-0 border-b-2 border-slate-200 bg-slate-900 text-white flex items-center justify-between px-6 z-10 select-none shadow-lg">
        {/* Logo and project name input */}
        <div className="flex items-center gap-6 flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-orange-600 rounded-xl font-bold text-sm tracking-tight shrink-0 shadow-lg shadow-orange-700/20 transform hover:-rotate-3 transition-transform">
            <Sparkles size={16} />
            <span>SGS TIMING v1.0.1</span>
          </div>

          <div className="flex items-center gap-3 max-w-sm flex-grow min-w-0">
            <span className="text-slate-500 font-bold shrink-0">::</span>
            <input
              value={projectTitle}
              readOnly={isClientView}
              onChange={(e) => {
                setProjectTitle(e.target.value);
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = setTimeout(() => {
                  triggerCloudSave(e.target.value);
                }, 1500);
              }}
              onSubmit={() => triggerCloudSave(projectTitle)}
              placeholder="Mi Proyecto de Timing"
              className="bg-transparent border-none text-[15px] font-black text-white focus:outline-none focus:ring-0 p-0 w-full truncate hover:bg-slate-800/40 rounded px-2 -ml-2"
            />
          </div>

          {/* Project dropdown cloud selector */}
          <div className="flex items-center gap-2 shrink-0 bg-slate-800/40 border border-slate-700/30 px-3 py-1.5 rounded-xl">
            <FolderKanban size={14} className="text-orange-500" />
            <select
              value={currentProjectId || ''}
              onChange={(e) => setCurrentProjectId(e.target.value)}
              className="bg-transparent border-none text-[11px] font-black focus:ring-0 cursor-pointer text-slate-200 p-0 pr-6 uppercase tracking-wider"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                  {p.title.toUpperCase()}
                </option>
              ))}
              {projects.length === 0 && <option value="">Crear Proyecto...</option>}
            </select>
            {!isClientView && (
              <button
                onClick={handleAddNewProject}
                className="p-1 hover:bg-slate-700/50 rounded-lg text-slate-300 hover:text-white transition-all ml-1"
                title="Nuevo Proyecto"
              >
                <Plus size={14} />
              </button>
            )}
          </div>

          {/* Collaborator Badge Information */}
          <div className="flex items-center gap-2 bg-slate-800/20 px-3 py-1.5 rounded-xl border border-slate-700/20 shrink-0">
            <Activity size={12} className="text-emerald-400" />
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
              Rol: {activeRole === 'owner' ? 'Propietario' : activeRole === 'editor' ? 'Editor' : 'Lector'}
            </span>
          </div>
        </div>

        {/* Sync, Share, and Sign-out Actions */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Cloud Saving indicators */}
          <div className="flex items-center gap-2">
            {isSaving ? (
              <div className="flex items-center gap-1.5 text-orange-400 text-[10px] font-black uppercase tracking-wider">
                <Cloud className="animate-bounce" size={14} />
                <span>Sincronizando...</span>
              </div>
            ) : saveError ? (
              <div className="flex items-center gap-1.5 text-red-400 text-[10px] font-black uppercase tracking-wider" title={saveError}>
                <AlertTriangle size={14} />
                <span>Error G.</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                <CheckCircle size={14} />
                <span>Guardado</span>
              </div>
            )}
          </div>

          {!isClientView && currentProjectId && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-[10px] font-black transition-all uppercase tracking-wider shadow-sm shrink-0"
            >
              <Share2 size={14} className="text-orange-500" /> Compartir ({collaboratorUids.length})
            </button>
          )}

          {currentProjectId && activeRole === 'owner' && (
            <button
              onClick={handleDeleteCurrentProject}
              className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-all"
              title="Eliminar Proyecto"
            >
              <Trash2 size={16} />
            </button>
          )}

          <div className="h-6 w-px bg-slate-800" />

          {/* User Profile Avatar block */}
          <div className="flex items-center gap-3 pl-2">
            <div className="flex flex-col text-right hidden md:block">
              <span className="text-[10px] font-black truncate max-w-[120px] tracking-tight">{user.email}</span>
              <span className="text-[8px] font-extrabold text-orange-500 uppercase tracking-widest">SGS Staff</span>
            </div>
            <button
              onClick={() => {
                if (confirm("Terminar sesión de SGS Timing?")) {
                  signOut(auth);
                }
              }}
              className="p-2.5 bg-slate-800 hover:bg-red-900 hover:text-white text-slate-300 rounded-xl transition-all"
              title="Cerrar Desconectarse"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main split work space area */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col overflow-hidden" style={{ paddingBottom: footerHeight }}>
          <div className="flex-grow flex overflow-hidden">
            {/* Left Drawer Workspace Sidebar: Teammember / resource list panel */}
            <aside className="w-[300px] shrink-0 border-r-2 border-slate-200 bg-white flex flex-col z-10 shadow-sm relative">
              <div className="h-[54px] border-b border-slate-100 flex items-center justify-between px-6 bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-2">
                  <Users className="text-orange-600" size={16} />
                  <span className="text-[11px] font-black uppercase text-slate-900 tracking-wider">Equipo de Trabajo</span>
                </div>
                {!isClientView && (
                  <button
                    onClick={handleAddResource}
                    className="p-2 bg-orange-50 text-orange-600 hover:bg-orange-100/70 border border-orange-100 rounded-xl transition-all"
                    title="Añadir Recurso"
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar p-4 space-y-4">
                {resources.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center space-y-2">
                    <Users className="text-slate-300" size={24} />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                      Sin recursos agregados
                    </p>
                  </div>
                ) : (
                  resources.map((res) => {
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
                      <div key={res.id} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl relative group space-y-3">
                        <div className="space-y-1.5">
                          <input
                            value={res.name}
                            readOnly={isClientView}
                            onChange={(e) => handleUpdateResource(res.id, { name: e.target.value })}
                            className="w-full bg-transparent border-none text-[11px] font-black text-slate-950 p-0 focus:ring-0 focus:bg-white rounded px-1 -ml-1"
                          />
                          <select
                            value={res.role}
                            disabled={isClientView}
                            onChange={(e) => handleUpdateResource(res.id, { role: e.target.value })}
                            className="w-full bg-transparent border-none text-[9px] font-bold text-orange-600 focus:ring-0 p-0 cursor-pointer uppercase tracking-wider"
                          >
                            {profileRates.map((r, idx) => (
                              <option key={idx} value={r.role}>
                                {r.role.toUpperCase()}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Individual Resource Statistics */}
                        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200/50">
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            <div>{allocatedDays.toFixed(1)}j asignadas</div>
                            <div className="text-slate-900 font-extrabold mt-0.5 text-[11px] whitespace-nowrap">{(allocatedDays * rate).toLocaleString()} €</div>
                          </div>
                          {!isClientView && (
                            <button
                              onClick={() => handleRemoveResource(res.id)}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                              title="Retirar Recurso"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </aside>

            {/* Core Interactive Gantt Canvas component */}
            <GanttCanvas
              viewMode={viewMode}
              tasks={tasks}
              onUpdateTasks={handleUpdateTasks}
              projectStart={projectStart}
              projectEnd={projectEnd}
              isRelativeTime={isRelativeTime}
              resources={resources}
              isClientView={isClientView}
            />
          </div>
        </div>

        {/* Lower Workloads & Milestones panel */}
        <AdminPanel
          viewMode={viewMode}
          resources={resources}
          allocations={allocations}
          validWeeks={validWeeks}
          onUpdateAllocation={handleUpdateAllocation}
          totalCost={totalCost}
          profileRates={profileRates}
          setProfileRates={handleUpdateRates}
          onAddResource={handleAddResource}
          onRemoveResource={handleRemoveResource}
          onUpdateResource={handleUpdateResource}
          projectStart={projectStart}
          setProjectStart={(d) => {
            setProjectStart(d);
            triggerCloudSave(projectTitle, tasks, resources, allocations, invoices, profileRates, d, projectEnd);
          }}
          projectEnd={(d) => {
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
          invoices={invoices}
          setInvoices={handleUpdateInvoices}
          yearlyInvoicingTotals={yearlyInvoicingTotals}
          setYearlyInvoicingTotals={setYearlyInvoicingTotals}
          generateMonthlyInvoices={generateMonthlyInvoices}
          visibleYears={visibleYears}
          setVisibleYears={setVisibleYears}
          footerHeight={footerHeight}
          onStartResizeHeight={handleStartResizeHeight}
          isResizingHeight={isResizingHeight}
        />
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
    </div>
  );
}
