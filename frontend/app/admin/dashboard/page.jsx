'use client';
import { useEffect, useState } from 'react';
import { analyticsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Users, Building2, FileText, TrendingUp, Loader2, RefreshCw, Inbox } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#f97316'];

function ChartEmpty({ message = 'No data yet', height = 240 }) {
  return (
    <div className="flex flex-col items-center justify-center text-dark-500" style={{ height }}>
      <Inbox className="w-8 h-8 mb-2" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color = 'brand' }) {
  const colorMap = { brand: 'text-brand-400 bg-brand-500/10', blue: 'text-blue-400 bg-blue-500/10', green: 'text-green-400 bg-green-500/10', purple: 'text-purple-400 bg-purple-500/10' };
  return (
    <div className="stat-card">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorMap[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-dark-400 text-sm">{label}</p>
      <p className="font-display text-3xl font-bold text-white mt-0.5">{value ?? '—'}</p>
      {sub && <p className="text-dark-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [deptData, setDeptData] = useState([]);
  const [companyData, setCompanyData] = useState([]);
  const [fitData, setFitData] = useState([]);
  const [trendsData, setTrendsData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [ov, dept, comp, fit, trends] = await Promise.all([
        analyticsApi.adminOverview(),
        analyticsApi.departmentParticipation(),
        analyticsApi.applicationsPerCompany(),
        analyticsApi.fitScoreDistribution(),
        analyticsApi.placementTrends(),
      ]);
      setOverview(ov.data.stats);
      setDeptData(dept.data.data);
      setCompanyData(comp.data.data);
      setFitData(fit.data.data);
      setTrendsData(trends.data.data);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
    </div>
  );

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const formattedTrends = trendsData.map(d => ({
    month: monthNames[(d._id.month - 1)] + ' ' + d._id.year,
    total: d.total, selected: d.selected
  }));

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-dark-400 mt-1">Welcome back, {user?.name?.split(' ')[0]} 👋</p>
        </div>
        <button onClick={fetchAll} className="btn-secondary">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}     label="Total Students"    value={overview?.totalStudents}     color="blue"   sub="Registered on platform" />
        <StatCard icon={Building2} label="Active Companies"  value={overview?.totalCompanies}    color="brand"  sub="With open drives" />
        <StatCard icon={FileText}  label="Total Applications" value={overview?.totalApplications} color="purple" sub="Across all roles" />
        <StatCard icon={TrendingUp} label="Students Selected" value={overview?.selectedCount}    color="green"  sub="Offer letters issued" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Applications per Company */}
        <div className="card p-6">
          <h2 className="font-display font-bold text-white mb-5">Applications per Company</h2>
          {companyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={companyData} margin={{ top: 0, right: 10, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="companyName" tick={{ fill: '#6e6e6e', fontSize: 11 }} angle={-20} textAnchor="end" />
              <YAxis tick={{ fill: '#6e6e6e', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8 }} labelStyle={{ color: '#e8e8e8' }} />
              <Bar dataKey="total" fill="#f59e0b" radius={[4,4,0,0]} name="Total" />
              <Bar dataKey="selected" fill="#10b981" radius={[4,4,0,0]} name="Selected" />
            </BarChart>
          </ResponsiveContainer>
          ) : <ChartEmpty message="No applications yet" />}
        </div>

        {/* Fit Score Distribution */}
        <div className="card p-6">
          <h2 className="font-display font-bold text-white mb-5">Fit Score Distribution</h2>
          {fitData.length > 0 ? (
          <div className="flex items-center justify-center gap-10">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie data={fitData} dataKey="count" nameKey="range" cx="50%" cy="50%" innerRadius={55} outerRadius={90}>
                  {fitData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {fitData.map((d, i) => (
                <div key={d.range} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-dark-300">{d.range}</span>
                  <span className="text-dark-500 ml-1">({d.count})</span>
                </div>
              ))}
            </div>
          </div>
          ) : <ChartEmpty message="No fit scores yet" height={200} />}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Participation */}
        <div className="card p-6">
          <h2 className="font-display font-bold text-white mb-5">Department Participation</h2>
          {deptData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#6e6e6e', fontSize: 11 }} />
              <YAxis dataKey="_id" type="category" tick={{ fill: '#6e6e6e', fontSize: 11 }} width={120} />
              <Tooltip contentStyle={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8 }} />
              <Bar dataKey="applications" fill="#3b82f6" radius={[0,4,4,0]} name="Applications" />
              <Bar dataKey="selected" fill="#10b981" radius={[0,4,4,0]} name="Selected" />
            </BarChart>
          </ResponsiveContainer>
          ) : <ChartEmpty message="No department data yet" height={220} />}
        </div>

        {/* Placement Trends */}
        <div className="card p-6">
          <h2 className="font-display font-bold text-white mb-5">Placement Trends</h2>
          {formattedTrends.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={formattedTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="month" tick={{ fill: '#6e6e6e', fontSize: 10 }} />
              <YAxis tick={{ fill: '#6e6e6e', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8 }} />
              <Line type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} name="Total" />
              <Line type="monotone" dataKey="selected" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} name="Selected" />
            </LineChart>
          </ResponsiveContainer>
          ) : <ChartEmpty message="No placement trend data yet" height={220} />}
        </div>
      </div>

      {/* Company Details Table */}
      {companyData.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-6 border-b border-dark-800">
            <h2 className="font-display font-bold text-white">Company Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-dark-800/50">
                <tr>
                  {['Company', 'Total Applied', 'Shortlisted', 'Selected', 'Avg Fit Score'].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-dark-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {companyData.map((c) => (
                  <tr key={c._id} className="hover:bg-dark-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-dark-200">{c.companyName}</td>
                    <td className="px-6 py-4 text-dark-300">{c.total}</td>
                    <td className="px-6 py-4 text-purple-400">{c.shortlisted}</td>
                    <td className="px-6 py-4 text-green-400">{c.selected}</td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-brand-400">{c.avgFitScore}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}