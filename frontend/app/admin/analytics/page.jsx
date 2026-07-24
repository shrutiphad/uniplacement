'use client';
import { useEffect, useState } from 'react';
import { analyticsApi } from '@/lib/api';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { Loader2, TrendingUp, Users, Building2, Award, Inbox } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#f97316', '#06b6d4'];

function ChartEmpty({ message = 'No data yet', height = 260 }) {
  return (
    <div className="flex flex-col items-center justify-center text-dark-500" style={{ height }}>
      <Inbox className="w-8 h-8 mb-2" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-xl p-3 text-sm shadow-xl">
      <p className="text-dark-300 font-medium mb-2">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export default function AdminAnalyticsPage() {
  const [data, setData]     = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [ov, dept, comp, fit, trends] = await Promise.all([
          analyticsApi.adminOverview(),
          analyticsApi.departmentParticipation(),
          analyticsApi.applicationsPerCompany(),
          analyticsApi.fitScoreDistribution(),
          analyticsApi.placementTrends(),
        ]);
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        setData({
          overview: ov.data.stats,
          dept: dept.data.data,
          companies: comp.data.data,
          fit: fit.data.data,
          trends: trends.data.data.map((d) => ({
            month: monthNames[d._id.month - 1] + ' ' + d._id.year,
            total: d.total, selected: d.selected,
            rate: d.total ? Math.round((d.selected / d.total) * 100) : 0,
          })),
        });
      } catch { toast.error('Failed to load analytics'); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-brand-400 animate-spin" /></div>
  );

  const { overview, dept, companies, fit, trends } = data;

  // Compute placement rate
  const placementRate = overview?.totalApplications
    ? Math.round((overview.selectedCount / overview.totalApplications) * 100)
    : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Analytics</h1>
        <p className="text-dark-400 mt-1">Deep placement intelligence dashboard</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Total Students', value: overview?.totalStudents, color: 'text-blue-400 bg-blue-500/10' },
          { icon: Building2, label: 'Active Companies', value: overview?.totalCompanies, color: 'text-brand-400 bg-brand-500/10' },
          { icon: TrendingUp, label: 'Placement Rate', value: `${placementRate}%`, color: 'text-green-400 bg-green-500/10' },
          { icon: Award, label: 'Students Placed', value: overview?.selectedCount, color: 'text-purple-400 bg-purple-500/10' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="stat-card">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}><Icon className="w-4 h-4" /></div>
            <p className="text-dark-400 text-sm">{label}</p>
            <p className="font-display text-3xl font-bold text-white">{value ?? '—'}</p>
          </div>
        ))}
      </div>

      {/* Placement Trend - Area Chart */}
      {trends?.length > 0 && (
        <div className="card p-6">
          <h2 className="font-display font-bold text-white mb-5">Placement Trend (Monthly)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trends}>
              <defs>
                <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="selectedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="month" tick={{ fill: '#6e6e6e', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6e6e6e', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#6e6e6e', fontSize: 12 }} />
              <Area type="monotone" dataKey="total" stroke="#f59e0b" fill="url(#totalGrad)" strokeWidth={2} name="Total Applied" />
              <Area type="monotone" dataKey="selected" stroke="#10b981" fill="url(#selectedGrad)" strokeWidth={2} name="Selected" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Company + Fit Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="font-display font-bold text-white mb-5">Company Performance</h2>
          {companies?.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={companies} margin={{ bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="companyName" tick={{ fill: '#6e6e6e', fontSize: 10 }} angle={-20} textAnchor="end" />
              <YAxis tick={{ fill: '#6e6e6e', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#6e6e6e', fontSize: 12 }} />
              <Bar dataKey="total" fill="#3b82f6" radius={[4,4,0,0]} name="Applied" />
              <Bar dataKey="shortlisted" fill="#8b5cf6" radius={[4,4,0,0]} name="Shortlisted" />
              <Bar dataKey="selected" fill="#10b981" radius={[4,4,0,0]} name="Selected" />
            </BarChart>
          </ResponsiveContainer>
          ) : <ChartEmpty message="No company data yet" />}
        </div>

        <div className="card p-6">
          <h2 className="font-display font-bold text-white mb-5">Fit Score Distribution</h2>
          {fit?.length > 0 ? (
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie data={fit} dataKey="count" nameKey="range" cx="50%" cy="50%" outerRadius={90} innerRadius={55}>
                  {fit?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {fit?.map((d, i) => (
                <div key={d.range} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-dark-300 text-xs">{d.range}</span>
                  <span className="text-dark-500 text-xs ml-auto">({d.count})</span>
                </div>
              ))}
            </div>
          </div>
          ) : <ChartEmpty message="No fit scores yet" height={200} />}
        </div>
      </div>

      {/* Department Breakdown */}
      {dept?.length > 0 && (
        <div className="card p-6">
          <h2 className="font-display font-bold text-white mb-5">Department Participation</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dept} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#6e6e6e', fontSize: 11 }} />
                <YAxis dataKey="_id" type="category" tick={{ fill: '#6e6e6e', fontSize: 11 }} width={130} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="applications" fill="#3b82f6" radius={[0,4,4,0]} name="Applications" />
                <Bar dataKey="selected" fill="#10b981" radius={[0,4,4,0]} name="Selected" />
              </BarChart>
            </ResponsiveContainer>

            {/* Department table */}
            <div className="space-y-2">
              {dept.map((d, i) => {
                const rate = d.applications ? Math.round((d.selected / d.applications) * 100) : 0;
                return (
                  <div key={d._id} className="flex items-center gap-3">
                    <span className="text-dark-500 text-xs w-4">{i + 1}</span>
                    <span className="text-dark-300 text-sm flex-1 truncate">{d._id || 'Unknown'}</span>
                    <span className="text-dark-400 text-xs">{d.applications} apps</span>
                    <div className="w-24">
                      <div className="progress-bar">
                        <div className="progress-fill bg-brand-500" style={{ width: `${rate}%` }} />
                      </div>
                    </div>
                    <span className="text-brand-400 text-xs font-mono w-10 text-right">{rate}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Avg Fit Score per Company */}
      {companies?.length > 0 && (
        <div className="card p-6">
          <h2 className="font-display font-bold text-white mb-5">Average Fit Score per Company</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={companies}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="companyName" tick={{ fill: '#6e6e6e', fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#6e6e6e', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avgFitScore" fill="#f59e0b" radius={[4,4,0,0]} name="Avg Fit Score %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}