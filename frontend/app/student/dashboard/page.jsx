'use client';
import { useEffect, useState } from 'react';
import { analyticsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { STATUS_COLORS, getFitScoreColor, getFitScoreBg, formatDate } from '@/lib/utils';
import Link from 'next/link';
import {
  Sparkles, BookOpen, Building2, FileText, Target,
  TrendingUp, AlertCircle, CheckCircle, Loader2, ArrowRight, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi.studentAnalytics()
      .then(({ data }) => setAnalytics(data))
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  const isProfileIncomplete = !user?.resumeURL || !user?.cgpa || !user?.skills?.length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
    </div>
  );

  const { stats, applications } = analytics || {};
  const skillCoverage = stats?.skillCoverage ?? 0;
  const appliedCount = stats?.totalApplied || 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">
            Hey, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-dark-400 mt-1">Here's your placement journey overview.</p>
        </div>
        <Link href="/student/companies" className="btn-primary">
          <Building2 className="w-4 h-4" /> Browse Companies
        </Link>
      </div>

      {/* Profile Incomplete Warning */}
      {isProfileIncomplete && (
        <div className="card p-4 border-yellow-500/30 bg-yellow-500/5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-yellow-300 font-medium text-sm">Complete your profile to apply</p>
            <p className="text-yellow-500/70 text-xs mt-0.5">Add your CGPA, skills, and upload your resume to become eligible for placements.</p>
          </div>
          <Link href="/student/profile" className="btn-secondary text-xs py-1.5 px-3 flex-shrink-0">
            Complete Profile <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: FileText, label: 'Applied', value: stats?.totalApplied || 0, color: 'text-blue-400 bg-blue-500/10' },
          { icon: Target,   label: 'Shortlisted', value: stats?.shortlisted || 0, color: 'text-purple-400 bg-purple-500/10' },
          { icon: CheckCircle, label: 'Selected', value: stats?.selected || 0, color: 'text-green-400 bg-green-500/10' },
          { icon: Zap,  label: 'Avg Fit Score', value: `${stats?.avgFitScore || 0}%`, color: 'text-brand-400 bg-brand-500/10' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="stat-card">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-dark-400 text-sm">{label}</p>
            <p className="font-display text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Readiness Score */}
        <div className="card p-6 flex flex-col items-center text-center">
          <p className="text-dark-400 text-sm mb-4 font-medium">AI Readiness Score</p>
          <div className="relative w-32 h-32 mb-4">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" stroke="#1e1e1e" strokeWidth="12" fill="none" />
              <circle cx="60" cy="60" r="50" stroke="#f59e0b" strokeWidth="12" fill="none"
                strokeDasharray={`${2 * Math.PI * 50 * (user?.readinessScore || 0) / 100} ${2 * Math.PI * 50}`}
                strokeLinecap="round" className="transition-all duration-700" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-2xl font-bold text-white">{user?.readinessScore || 0}</span>
              <span className="text-dark-500 text-xs">/100</span>
            </div>
          </div>
          <p className="text-dark-500 text-xs">Based on skill match & applications</p>
          <Link href="/student/ai-resume" className="btn-primary text-xs py-2 px-4 mt-4 w-full justify-center">
            <Sparkles className="w-3.5 h-3.5" /> Analyze Resume
          </Link>
        </div>

        {/* Skill Coverage */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <p className="font-medium text-dark-200">Skill Coverage</p>
            <span className="text-dark-500 text-xs">{user?.skills?.length || 0} skills on profile</span>
          </div>
          {user?.skills?.length > 0 ? (
            <>
              {/* Real coverage metric from applied roles */}
              <div className="flex items-end justify-between mb-2">
                <div>
                  <span className={`font-display text-3xl font-bold ${getFitScoreColor(skillCoverage)}`}>{skillCoverage}%</span>
                  <span className="text-dark-500 text-sm ml-2">of required skills matched</span>
                </div>
                <span className="text-dark-500 text-xs">
                  {appliedCount > 0
                    ? `across ${appliedCount} applied role${appliedCount === 1 ? '' : 's'}`
                    : 'apply to a role to measure fit'}
                </span>
              </div>
              <div className="progress-bar mb-5">
                <div className={`progress-fill ${getFitScoreBg(skillCoverage)}`} style={{ width: `${skillCoverage}%` }} />
              </div>

              {/* Skills on profile */}
              <div className="flex flex-wrap gap-2">
                {user.skills.map((s) => (
                  <span key={s} className="badge bg-dark-700 text-dark-200 border-dark-600">{s}</span>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-dark-500">
              <Target className="w-8 h-8 mb-2" />
              <p className="text-sm">Add skills to your profile to see coverage</p>
              <Link href="/student/profile" className="text-brand-400 text-xs mt-2 hover:text-brand-300">Update profile →</Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: '/student/ai-resume',     icon: Sparkles, title: 'AI Resume Analysis',   desc: 'Get instant fit score & suggestions', color: 'border-brand-500/30 hover:border-brand-500/60' },
          { href: '/student/interview-prep', icon: BookOpen, title: 'Interview Prep',        desc: 'Generate questions & roadmap',        color: 'border-blue-500/30 hover:border-blue-500/60' },
          { href: '/student/companies',      icon: Building2, title: 'Browse Companies',    desc: 'Explore and apply to drives',          color: 'border-purple-500/30 hover:border-purple-500/60' },
        ].map((action) => (
          <Link key={action.href} href={action.href}
            className={`card p-5 flex items-start gap-4 transition-all duration-200 ${action.color}`}>
            <div className="w-10 h-10 bg-dark-700 rounded-xl flex items-center justify-center flex-shrink-0">
              <action.icon className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <p className="font-medium text-white text-sm">{action.title}</p>
              <p className="text-dark-500 text-xs mt-0.5">{action.desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-dark-600 ml-auto mt-0.5" />
          </Link>
        ))}
      </div>

      {/* Recent Applications */}
      {applications?.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-dark-800 flex items-center justify-between">
            <h2 className="font-display font-bold text-white">Recent Applications</h2>
            <Link href="/student/applications" className="text-brand-400 text-sm hover:text-brand-300 flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-dark-800">
            {applications.slice(0, 5).map((app) => (
              <div key={app._id} className="px-5 py-4 flex items-center gap-4 hover:bg-dark-800/30 transition-colors">
                <div className="w-10 h-10 bg-dark-700 rounded-xl flex items-center justify-center text-sm font-bold text-brand-400 flex-shrink-0">
                  {app.companyName?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-dark-200 text-sm">{app.companyName}</p>
                  <p className="text-dark-500 text-xs mt-0.5">{formatDate(app.appliedAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge text-xs ${STATUS_COLORS[app.status]}`}>{app.status}</span>
                  <span className={`font-mono text-sm font-bold ${getFitScoreColor(app.fitScore)}`}>
                    {app.fitScore}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}