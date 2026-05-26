export type ViewMode = 'Week' | 'Month' | 'Year';

export interface GanttTask {
  id: string;
  wbs: string;
  name: string;
  start: string; // ISO date string (YYYY-MM-DD)
  end: string;   // ISO date string (YYYY-MM-DD)
  progress: number; // 0 to 100
  responsible: string; // Resource name or empty
  responsibleId?: string; // Associated ProjectResource.id
  dependencies?: string[]; // IDs of tasks that must finish before this starts
  notes?: string;
  durationDays?: number;
}

export interface ProjectResource {
  id: string;
  name: string;
  role: string;
}

export interface ResourceAllocation {
  [resourceId: string]: {
    [weekKey: string]: number; // days allocated
  };
}

export interface ProfileRate {
  role: string;
  rate: number;
}

export interface Invoice {
  id: string;
  description: string;
  amount: number;
  year: number;
}

export interface ProjectConfig {
  wbsLabel: string;
  responsibleLabel: string;
  projectStart: string; // YYYY-MM-DD
  projectEnd: string;   // YYYY-MM-DD
  isRelativeTime: boolean;
  statusDate: string | null;
  isClientView?: boolean;
}

export interface CloudProjectData {
  tasks: GanttTask[];
  resources: ProjectResource[];
  allocations: ResourceAllocation;
  rates: ProfileRate[];
  invoices: Invoice[];
  config: ProjectConfig;
}
