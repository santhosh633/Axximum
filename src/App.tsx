import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  BarChart3, 
  Search, 
  Plus,
  ChevronRight,
  Filter,
  MoreVertical,
  Clock,
  AlertCircle,
  RefreshCw,
  Settings,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { User, Project, DashboardStats, ActivityLog, SyncStatus } from './types';

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#64748b'];

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'users' | 'sync' | 'activity' | 'reports' | 'user-performance'>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [utilizationReport, setUtilizationReport] = useState<any>(null);
  const [userPerformanceReport, setUserPerformanceReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, projectsRes, usersRes, activityRes, syncRes, reportRes, userPerfRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/projects'),
        fetch('/api/users'),
        fetch('/api/activity'),
        fetch('/api/sync/status'),
        fetch('/api/reports/utilization'),
        fetch('/api/reports/user-performance')
      ]);
      
      if (statsRes.ok) setStats(await statsRes.ok ? await statsRes.json() : null);
      if (projectsRes.ok) setProjects(await projectsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (activityRes.ok) setActivityLogs(await activityRes.json());
      if (syncRes.ok) {
        const data = await syncRes.json();
        setSyncStatus(data);
        if (data.spreadsheet_id) setSpreadsheetId(data.spreadsheet_id);
      }
      if (reportRes.ok) setUtilizationReport(await reportRes.json());
      if (userPerfRes.ok) setUserPerformanceReport(await userPerfRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleConnect = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      const { url } = await res.json();
      window.open(url, 'google_auth', 'width=600,height=600');
    } catch (error) {
      console.error('Error connecting Google:', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await fetch('/api/sync/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId })
      });
      fetchData();
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        fetchData();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const filteredProjects = projects.filter(p => 
    (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     p.status.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (statusFilter === 'All' || p.status === statusFilter) &&
    (priorityFilter === 'All' || p.priority === priorityFilter)
  );

  const filteredUsers = users.filter(u => 
    (u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.department.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (deptFilter === 'All' || u.department === deptFilter)
  );

  const filteredActivityLogs = activityLogs.filter(log =>
    log.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.task.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUtilizationData = utilizationReport?.data.filter((row: any) =>
    row.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredUserPerfData = userPerformanceReport?.data.filter((row: any) =>
    row.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="flex h-screen bg-[#F8F9FA] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-black/5 flex flex-col">
        <div className="p-6 border-b border-black/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white border border-black/5 rounded-lg flex items-center justify-center overflow-hidden p-1">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path 
                  d="M5 25 H50 Q80 25 80 55 V75" 
                  fill="none" 
                  stroke="#0070f3" 
                  strokeWidth="24" 
                  strokeLinecap="butt"
                />
                <circle cx="28" cy="72" r="20" fill="#0070f3" />
              </svg>
            </div>
            <div className="flex flex-col">
              <h1 className="font-bold text-base leading-tight tracking-tight">Axximum</h1>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tracker</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <NavItem active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} icon={<Briefcase size={20} />} label="Projects" />
          <NavItem active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users size={20} />} label="Team Members" />
          <NavItem active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<BarChart size={20} />} label="Utilization Report" />
          <NavItem active={activeTab === 'user-performance'} onClick={() => setActiveTab('user-performance')} icon={<BarChart3 size={20} />} label="User Performance" />
          <NavItem active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} icon={<Clock size={20} />} label="Activity Feed" />
          <NavItem active={activeTab === 'sync'} onClick={() => setActiveTab('sync')} icon={<RefreshCw size={20} />} label="Google Sync" />
        </nav>

        <div className="p-4 border-t border-black/5">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Sync Status</p>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400">
                {syncStatus?.last_sync ? `Last: ${new Date(syncStatus.last_sync).toLocaleTimeString()}` : 'Never synced'}
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full w-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-black/5 flex items-center justify-between px-8 shrink-0">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-black/5 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4">
            {/* Contextual Filters */}
            <div className="flex items-center gap-2">
              {(activeTab === 'projects' || activeTab === 'dashboard') && (
                <>
                  <select 
                    className="bg-slate-50 border-none rounded-xl text-xs font-medium px-3 py-2 focus:ring-0"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Status</option>
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                    <option value="Planning">Planning</option>
                  </select>
                  <select 
                    className="bg-slate-50 border-none rounded-xl text-xs font-medium px-3 py-2 focus:ring-0"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                  >
                    <option value="All">All Priority</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </>
              )}
              {activeTab === 'users' && (
                <select 
                  className="bg-slate-50 border-none rounded-xl text-xs font-medium px-3 py-2 focus:ring-0"
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                >
                  <option value="All">All Departments</option>
                  {[...new Set(users.map(u => u.department))].map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              )}
            </div>

            <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-all">
              <Settings size={20} />
            </button>
            <button className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-800 transition-all">
              <Plus size={18} />
              <span>New Project</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard title="Total Users" value={stats?.totalUsers || 0} icon={<Users className="text-blue-500" />} trend="+4 this month" />
                  <StatCard title="Active Projects" value={stats?.totalProjects || 0} icon={<Briefcase className="text-emerald-500" />} trend="30+ ongoing" />
                  <StatCard title="Sync Frequency" value="5m" icon={<RefreshCw className="text-purple-500" />} trend="Auto-sync" />
                  <StatCard title="Total Manhours" value={activityLogs.reduce((acc, log) => acc + log.manhours, 0).toFixed(1)} icon={<Clock className="text-amber-500" />} trend="All time" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white border border-black/5 rounded-2xl p-6">
                    <h3 className="text-lg font-bold mb-6">Project Status</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats?.projectStatuses || []}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="status" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#f8fafc' }} />
                          <Bar dataKey="count" fill="#000" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white border border-black/5 rounded-2xl p-6">
                    <h3 className="text-lg font-bold mb-6">Recent Activity</h3>
                    <div className="space-y-4">
                      {activityLogs.slice(0, 5).map((log) => (
                        <div key={log.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-xs shadow-sm">
                            {log.user_name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{log.user_name}</p>
                            <p className="text-xs text-slate-500 truncate">{log.task} on {log.project_name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold">{log.manhours}h</p>
                            <p className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'sync' && (
              <motion.div key="sync" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-2xl mx-auto">
                <div className="bg-white border border-black/5 rounded-2xl p-8 space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                      <RefreshCw className="text-emerald-600" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Google Sheets Sync</h3>
                      <p className="text-slate-500 text-sm">Connect your project tracking sheet for auto-sync every 5 minutes.</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-black/5">
                      <h4 className="font-bold mb-4 flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-500" />
                        Step 1: Connect Account
                      </h4>
                      <button 
                        onClick={handleGoogleConnect}
                        className="w-full flex items-center justify-center gap-3 bg-white border border-black/10 py-3 rounded-xl font-medium hover:bg-slate-50 transition-all"
                      >
                        <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                        Connect Google Account
                      </button>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-2xl border border-black/5">
                      <h4 className="font-bold mb-4 flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-500" />
                        Step 2: Spreadsheet ID
                      </h4>
                      <div className="space-y-4">
                        <input 
                          type="text" 
                          placeholder="Enter Spreadsheet ID (from URL)"
                          className="w-full px-4 py-3 bg-white border border-black/10 rounded-xl text-sm focus:ring-2 focus:ring-black/5 transition-all"
                          value={spreadsheetId}
                          onChange={(e) => setSpreadsheetId(e.target.value)}
                        />
                        <p className="text-[10px] text-slate-400">Example: https://docs.google.com/spreadsheets/d/<b>1abc...xyz</b>/edit</p>
                        <button 
                          onClick={handleSaveSettings}
                          className="w-full bg-black text-white py-3 rounded-xl font-medium hover:bg-slate-800 transition-all"
                        >
                          Save & Start Sync
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                    <AlertCircle className="text-amber-600 shrink-0" size={20} />
                    <div className="text-xs text-amber-800 leading-relaxed">
                      <p className="font-bold mb-1">Sheet Format (Sync every 1s):</p>
                      <p>Ensure your sheet (Sheet1) has these columns in order:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <code className="bg-amber-100 px-1 rounded">User</code>
                        <code className="bg-amber-100 px-1 rounded">Project</code>
                        <code className="bg-amber-100 px-1 rounded">Task</code>
                        <code className="bg-amber-100 px-1 rounded">Manhours</code>
                        <code className="bg-amber-100 px-1 rounded">Status</code>
                        <code className="bg-amber-100 px-1 rounded">UniqueID</code>
                      </div>
                      <p className="mt-2 italic">Manhours are only logged when <b>Status</b> changes to "Completed". UniqueID is required to track changes.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'activity' && (
              <motion.div key="activity" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white border border-black/5 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-black/5 flex items-center justify-between">
                  <h3 className="text-lg font-bold">User Activity & Manhours</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <RefreshCw size={14} className="animate-spin" />
                    Auto-syncing every 1s
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4 font-semibold">User</th>
                        <th className="px-6 py-4 font-semibold">Project</th>
                        <th className="px-6 py-4 font-semibold">Task/Move</th>
                        <th className="px-6 py-4 font-semibold">Manhours</th>
                        <th className="px-6 py-4 font-semibold">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {filteredActivityLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 transition-all">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs">
                                {log.user_name.charAt(0)}
                              </div>
                              <span className="font-medium">{log.user_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm bg-slate-100 px-2 py-1 rounded-md">{log.project_name}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-600 text-sm">{log.task}</td>
                          <td className="px-6 py-4 font-bold text-emerald-600">{log.manhours}h</td>
                          <td className="px-6 py-4 text-slate-400 text-xs">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* Existing Projects/Users tabs would go here, omitted for brevity but should be kept */}
            {activeTab === 'projects' && <ProjectsView projects={filteredProjects} />}
            {activeTab === 'users' && <UsersView users={filteredUsers} />}
            {activeTab === 'reports' && <UtilizationReportView report={{ ...utilizationReport, data: filteredUtilizationData }} />}
            {activeTab === 'user-performance' && <UserPerformanceView report={{ ...userPerformanceReport, data: filteredUserPerfData }} />}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-black text-white shadow-lg shadow-black/10' : 'text-slate-500 hover:bg-slate-50'}`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

function StatCard({ title, value, icon, trend }: { title: string; value: string | number; icon: React.ReactNode; trend: string }) {
  return (
    <div className="bg-white border border-black/5 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-slate-50 rounded-xl">{icon}</div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{trend}</span>
      </div>
      <h3 className="text-slate-500 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function ProjectsView({ projects }: { projects: Project[] }) {
  return (
    <motion.div key="projects" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {projects.map((project) => (
        <div key={project.id} className="card group">
          <div className="flex justify-between items-start mb-4">
            <span className={`status-badge ${getStatusClass(project.status)}`}>{project.status}</span>
            <button className="text-slate-400 hover:text-black opacity-0 group-hover:opacity-100 transition-all"><MoreVertical size={18} /></button>
          </div>
          <h4 className="text-xl font-bold mb-2">{project.name}</h4>
          <p className="text-slate-500 text-sm mb-6 line-clamp-2">{project.description}</p>
          <div className="flex items-center justify-between pt-4 border-t border-black/5">
            <div className="flex -space-x-2">
              {[...Array(Math.min(project.team_size, 4))].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold">{String.fromCharCode(65 + i)}</div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-xs"><Clock size={14} /><span>{project.deadline}</span></div>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

function UsersView({ users }: { users: User[] }) {
  return (
    <motion.div key="users" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white border border-black/5 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <tr><th className="px-6 py-4 font-semibold">Name</th><th className="px-6 py-4 font-semibold">Role</th><th className="px-6 py-4 font-semibold">Department</th><th className="px-6 py-4 font-semibold">Current Project</th></tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-all">
                <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">{user.name.charAt(0)}</div><div><div className="font-medium">{user.name}</div><div className="text-xs text-slate-500">{user.email}</div></div></div></td>
                <td className="px-6 py-4 text-slate-600 text-sm">{user.role}</td>
                <td className="px-6 py-4 text-slate-600 text-sm">{user.department}</td>
                <td className="px-6 py-4">{user.project_name ? <span className="text-sm font-medium text-black bg-slate-100 px-3 py-1 rounded-lg">{user.project_name}</span> : <span className="text-xs text-slate-400 italic">Unassigned</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function getStatusClass(status: string) {
  switch (status) {
    case 'Active': return 'status-active';
    case 'On Hold': return 'status-hold';
    case 'Completed': return 'status-completed';
    case 'Planning': return 'status-planning';
    default: return 'bg-slate-100 text-slate-600';
  }
}

function UtilizationReportView({ report }: { report: any }) {
  if (!report) return <div className="p-8 text-center text-slate-500">Loading report...</div>;

  // Generate days for the current month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1);
    return d.toISOString().split('T')[0];
  });

  return (
    <motion.div 
      key="reports" 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }} 
      className="bg-white border border-black/5 rounded-2xl overflow-hidden"
    >
      <div className="p-6 border-b border-black/5 flex items-center justify-between bg-slate-50/50">
        <div>
          <h3 className="text-xl font-bold">Daily Utilization Report</h3>
          <p className="text-sm text-slate-500">No of Working Days: <span className="font-bold text-black">{report.workingDays}</span></p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Overall Utilization</p>
          <p className={`text-2xl font-black ${parseFloat(report.overallUtilization) > 100 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {report.overallUtilization}%
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-r border-black/5 sticky left-0 bg-slate-50 min-w-[200px]">HIL (Project)</th>
              <th className="px-4 py-3 font-bold border-b border-r border-black/5 text-center">Utilization</th>
              <th className="px-4 py-3 font-bold border-b border-r border-black/5 text-center">Daily Targets</th>
              <th className="px-4 py-3 font-bold border-b border-r border-black/5 text-center">Total</th>
              {days.map(day => (
                <th key={day} className="px-3 py-3 font-bold border-b border-r border-black/5 text-center min-w-[60px]">
                  {new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 text-xs">
            {report.data.map((row: any) => (
              <tr key={row.name} className="hover:bg-slate-50 transition-all">
                <td className="px-4 py-3 font-bold border-r border-black/5 sticky left-0 bg-white group-hover:bg-slate-50">{row.name}</td>
                <td className={`px-4 py-3 font-bold border-r border-black/5 text-center ${parseFloat(row.utilization) > 100 ? 'bg-rose-50 text-rose-700' : parseFloat(row.utilization) < 20 ? 'bg-amber-50 text-amber-700' : 'text-slate-700'}`}>
                  {row.utilization}%
                </td>
                <td className="px-4 py-3 border-r border-black/5 text-center font-medium text-slate-500">{row.daily_target}</td>
                <td className="px-4 py-3 border-r border-black/5 text-center font-bold text-black">{row.total}</td>
                {days.map(day => {
                  const val = row.daily[day] || 0;
                  return (
                    <td key={day} className={`px-3 py-3 border-r border-black/5 text-center ${val === 0 ? 'text-slate-300' : 'font-medium text-slate-700'}`}>
                      {val || 0}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function UserPerformanceView({ report }: { report: any }) {
  if (!report) return <div className="p-8 text-center text-slate-500">Loading report...</div>;

  // Generate days for the current month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1);
    return d.toISOString().split('T')[0];
  });

  return (
    <motion.div 
      key="user-performance" 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }} 
      className="bg-white border border-black/5 rounded-2xl overflow-hidden"
    >
      <div className="p-6 border-b border-black/5 flex items-center justify-between bg-slate-50/50">
        <div>
          <h3 className="text-xl font-bold">User Monthly Performance</h3>
          <p className="text-sm text-slate-500">Tracking daily manhours per team member</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-r border-black/5 sticky left-0 bg-slate-50 min-w-[200px]">User Name</th>
              <th className="px-4 py-3 font-bold border-b border-r border-black/5 text-center">Total Hours</th>
              {days.map(day => (
                <th key={day} className="px-3 py-3 font-bold border-b border-r border-black/5 text-center min-w-[60px]">
                  {new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 text-xs">
            {report.data.map((row: any) => (
              <tr key={row.name} className="hover:bg-slate-50 transition-all">
                <td className="px-4 py-3 font-bold border-r border-black/5 sticky left-0 bg-white group-hover:bg-slate-50">{row.name}</td>
                <td className="px-4 py-3 font-bold border-r border-black/5 text-center text-emerald-600">
                  {row.total.toFixed(1)}h
                </td>
                {days.map(day => {
                  const val = row.daily[day] || 0;
                  return (
                    <td key={day} className={`px-3 py-3 border-r border-black/5 text-center ${val === 0 ? 'text-slate-300' : 'font-medium text-slate-700'}`}>
                      {val || 0}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
