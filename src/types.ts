export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  project_name?: string;
}

export interface Project {
  id: number;
  name: string;
  status: 'Active' | 'On Hold' | 'Completed' | 'Planning';
  priority: 'High' | 'Medium' | 'Low';
  deadline: string;
  description: string;
  team_size: number;
}

export interface DashboardStats {
  totalUsers: number;
  totalProjects: number;
  projectStatuses: { status: string; count: number }[];
  activeAssignments: number;
}

export interface ActivityLog {
  id: number;
  user_name: string;
  project_name: string;
  task: string;
  manhours: number;
  timestamp: string;
}

export interface SyncStatus {
  spreadsheet_id?: string;
  last_sync?: string;
}
