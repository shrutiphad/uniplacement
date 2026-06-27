'use client';
import { useState, useEffect } from 'react';
import { aiApi, companyApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Sparkles, Loader2, CheckCircle2, XCircle, AlertTriangle,
  Lightbulb, GraduationCap, ShieldCheck, BookOpen, RefreshCw,
  ChevronDown, ChevronUp, ExternalLink, ArrowRight, Zap
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip
} from 'recharts';

/* ── Circular score ring  */
function ScoreRing({ score, label, color = '#f59e0b' }) {
  const r = 44, dim = r * 2 + 16;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width={dim} height={dim} className="-rotate-90">
          <circle cx={dim/2} cy={dim/2} r={r} stroke="#1e1e1e" strokeWidth="10" fill="none"/>
          <circle cx={dim/2} cy={dim/2} r={r} stroke={color} strokeWidth="10" fill="none"
            strokeDasharray={`${circ*(score/100)} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray .8s ease' }}/>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-lg font-bold text-white">{score}</span>
        </div>
      </div>
      <span className="text-dark-500 text-xs text-center leading-tight">{label}</span>
    </div>
  );
}

/* ── Collapsible card  */
function Section({ title, icon: Icon, children, open: initOpen = false }) {
  const [open, setOpen] = useState(initOpen);
  return (
    <div className="card overflow-hidden">
      <button className="w-full flex items-center justify-between p-5 hover:bg-dark-800/30 transition-colors"
        onClick={() => setOpen(p => !p)}>
        <span className="flex items-center gap-3 font-medium text-white">
          <Icon className="w-4 h-4 text-brand-400"/>{title}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-dark-500"/> : <ChevronDown className="w-4 h-4 text-dark-500"/>}
      </button>
      {open && <div className="px-5 pb-5 border-t border-dark-800 pt-4">{children}</div>}
    </div>
  );
}

export default function AIResumePage() {
  const { user, updateLocalUser } = useAuth();
  const [companies, setCompanies]   = useState([]);
  const [selCo, setSelCo]           = useState('');
  const [selRole, setSelRole]       = useState('');
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);

  useEffect(() => {
    companyApi.getAll({ limit: 50 }).then(({ data }) => setCompanies(data.companies));
  }, []);

  const selCoData = companies.find(c => c._id === selCo);

  // const analyze = async (force = false) => {
  //   if (!user?.resumeURL) { toast.error('Upload your resume in Profile first!'); return; }

//     const analyze = async (force = false) => {
//   // Wait for user to fully load
//   if (!user) {
//     toast.error('Loading user data...');
//     return;
//   }
  
//   if (!user.resumeURL) { 
//     toast.error('Upload your resume in Profile first!'); 
//     return; 
//   }
 

    
//     setLoading(true); setResult(null);
//     try {
//       const { data } = await aiApi.analyzeResume({
//         companyId: selCo || undefined,
//         roleId: selRole || undefined,
//         forceRefresh: force,
//       });
//       setResult(data);
//       if (data.readinessScore) updateLocalUser({ readinessScore: data.readinessScore });
//       toast.success(data.cached ? 'Cached analysis loaded' : 'Deep AI analysis complete 🎯');
//     }
//     //  catch (err) {
//     //   toast.error(err.response?.data?.message || 'Analysis failed. Try again.');
//     // } finally { setLoading(false); }
    
//   catch (err) {
//   const msg = err.response?.data?.message || err.message || 'Analysis failed';
//   console.error('[AI Resume] Error:', err.response?.data || err);
  
//   if (err.response?.status === 422) {
//     toast.error(`PDF Error: ${msg}. Try re-uploading your resume as a text-based PDF.`);
//   } else if (err.response?.status === 429) {
//     toast.error('OpenAI rate limit reached. Please wait a few minutes and try again.');
//   } else if (err.response?.status === 400 && msg.includes('No resume')) {
//     toast.error('No resume found. Please upload your resume in Profile first.');
//   } else {
//     toast.error(`Analysis failed: ${msg}`);
//   }
// }
//   };

//resume error fixed 

const analyze = async (force = false) => {
  if (!user) {
    toast.error('Loading user data...');
    return;
  }
  if (!user.resumeURL) {
    toast.error('Upload your resume in Profile first!');
    return;
  }

  setLoading(true);
  setResult(null);

  try {
    const { data } = await aiApi.analyzeResume({
      companyId: selCo || undefined,
      roleId: selRole || undefined,
      forceRefresh: force,
    });
    setResult(data);
    if (data.readinessScore) updateLocalUser({ readinessScore: data.readinessScore });
    toast.success(data.cached ? 'Cached analysis loaded' : 'Deep AI analysis complete 🎯');
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'Analysis failed';
    console.error('[AI Resume] Error:', err.response?.data || err);

    if (err.response?.status === 422) {
      toast.error(`PDF Error: ${msg}. Try re-uploading your resume as a text-based PDF.`);
    } else if (err.response?.status === 429) {
      toast.error('OpenAI rate limit reached. Please wait a few minutes and try again.');
    } else if (err.response?.status === 400 && msg.includes('No resume')) {
      toast.error('No resume found. Please upload your resume in Profile first.');
    } else {
      toast.error(`Analysis failed: ${msg}`);
    }
  } finally {
    setLoading(false);
  }
};

  const a   = result?.analysis;
  const jd  = result?.jdAnalysis;
  const cmp = result?.profileComparison;

  const radarData = a?.parsedData?.technicalSkills
    ? Object.entries(a.parsedData.technicalSkills)
        .filter(([, v]) => Array.isArray(v) && v.length)
        .map(([k, arr]) => ({ subject: k.charAt(0).toUpperCase()+k.slice(1), value: Math.min(100, arr.length*20), fullMark: 100 }))
    : [];

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">AI Resume Intelligence</h1>
          <p className="text-dark-400 mt-1">RAG pipeline · Semantic embeddings · ATS scoring · Deep parse</p>
        </div>
        {user?.resumeURL && (
          <a href={user.resumeURL} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm shrink-0">
            <ExternalLink className="w-4 h-4"/> View Resume
          </a>
        )}
      </div>

      {/* Controls */}
      <div className="card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Company <span className="text-dark-600">(optional)</span></label>
            <select className="input" value={selCo} onChange={e => { setSelCo(e.target.value); setSelRole(''); }}>
              <option value="">General / No JD Analysis</option>
              {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Role <span className="text-dark-600">(optional)</span></label>
            <select className="input" value={selRole} onChange={e => setSelRole(e.target.value)} disabled={!selCo}>
              <option value="">Select role</option>
              {selCoData?.roles?.map(r => <option key={r._id} value={r._id}>{r.roleTitle}</option>)}
            </select>
          </div>
        </div>
        <div className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm ${
          user?.resumeURL ? 'bg-green-500/5 border-green-500/20 text-green-400' : 'bg-red-500/5 border-red-500/20 text-red-400'
        }`}>
          {user?.resumeURL ? <CheckCircle2 className="w-4 h-4 shrink-0"/> : <XCircle className="w-4 h-4 shrink-0"/>}
          {user?.resumeURL ? 'Resume ready for analysis' : (
            <span>No resume found — <Link href="/student/profile" className="underline">upload in Profile</Link></span>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={() => analyze(false)} disabled={loading || !user?.resumeURL} className="btn-primary flex-1 justify-center py-3">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin"/>Running RAG Analysis pipeline...</> : <><Sparkles className="w-4 h-4"/>Analyze Resume</>}
          </button>
          {result && (
            <button onClick={() => analyze(true)} disabled={loading} className="btn-secondary px-4" title="Force fresh analysis">
              <RefreshCw className="w-4 h-4"/>
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-5 animate-glow-pulse">
            <Sparkles className="w-10 h-10 text-brand-400"/>
          </div>
          <p className="font-display font-bold text-white text-xl mb-3">RAG Pipeline Running</p>
          <div className="space-y-1.5 text-dark-500 text-sm max-w-sm mx-auto text-left">
            {['① Parsing PDF → extracting text blocks','② Chunking → embedding with text-embedding-3-small',
              '③ Semantic retrieval → cosine similarity to JD','④ GPT-4o-mini → deep analysis + ATS scoring'].map(s => (
              <p key={s} className="flex items-center gap-2"><span className="text-brand-500">›</span>{s}</p>
            ))}
          </div>
        </div>
      )}

      {/* ── RESULTS ── */}
      {a && !loading && (
        <div className="space-y-5 animate-slide-up">
          {result?.cached && (
            <div className="flex items-center gap-2 text-sm text-brand-400 bg-brand-500/5 border border-brand-500/20 rounded-xl px-4 py-2">
              <Zap className="w-4 h-4"/>Showing cached analysis (under 24h). Hit refresh to re-run.
            </div>
          )}

          {/* Score rings */}
          <div className="card p-6">
            <h2 className="font-display font-bold text-white mb-6">Score Breakdown</h2>
            <div className="flex flex-wrap justify-around gap-4 mb-6">
              <ScoreRing score={a.overallScore||0}   label="Overall"      color="#f59e0b"/>
              <ScoreRing score={a.fitScore||0}        label="Keyword Fit"  color="#3b82f6"/>
              <ScoreRing score={a.semanticScore||0}   label="Semantic"     color="#8b5cf6"/>
              <ScoreRing score={a.atsScore?.overall||0} label="ATS Score" color="#10b981"/>
              <ScoreRing score={a.interviewReadiness||0} label="Interview Ready" color="#f97316"/>
            </div>
            <div className="bg-dark-800/50 rounded-xl p-4 mb-4">
              <p className="text-dark-300 text-sm leading-relaxed">{a.summary}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { l: 'Confidence', v: a.confidenceLevel||'—' },
                { l: 'Seniority', v: a.parsedData?.seniorityLevel||'—' },
                { l: 'Resume Quality', v: `${a.resumeStructureScore||0}/100` },
                { l: 'Parser Confidence', v: a.parsedData?.parserConfidence ? `${Math.round(a.parsedData.parserConfidence*100)}%` : '—' },
              ].map(i => (
                <div key={i.l} className="bg-dark-800 rounded-xl p-3 text-center">
                  <p className="text-dark-500 text-xs mb-1">{i.l}</p>
                  <p className="font-medium text-dark-200 text-sm">{i.v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Profile vs JD comparison */}
          {cmp && (
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="font-display font-bold text-white">Profile vs JD</h2>
                <span className={`badge text-sm font-semibold ${
                  cmp.verdict==='Strong Match'   ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                  cmp.verdict==='Good Match'     ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' :
                  cmp.verdict==='Partial Match'  ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                 : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                  {cmp.verdict}
                </span>
                <span className={`badge text-xs ${cmp.eligibilityRisk==='Low' ? 'bg-green-500/10 text-green-400 border-green-500/20' : cmp.eligibilityRisk==='Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                  Risk: {cmp.eligibilityRisk}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-2">Must-have matched ({cmp.mustHaveMatched?.length})</p>
                  <div className="flex flex-wrap gap-1.5">{cmp.mustHaveMatched?.length
                    ? cmp.mustHaveMatched.map(s => <span key={s} className="badge bg-green-500/10 text-green-400 border-green-500/20 text-xs">{s}</span>)
                    : <span className="text-dark-600 text-xs">None matched</span>}</div>
                </div>
                <div>
                  <p className="text-xs text-dark-500 uppercase tracking-wider mb-2">Must-have missing ({cmp.mustHaveMissing?.length})</p>
                  <div className="flex flex-wrap gap-1.5">{cmp.mustHaveMissing?.length
                    ? cmp.mustHaveMissing.map(s => <span key={s} className="badge bg-red-500/10 text-red-400 border-red-500/20 text-xs">{s}</span>)
                    : <span className="text-dark-500 text-xs">All covered ✓</span>}</div>
                </div>
              </div>
            </div>
          )}

          {/* Extracted resume data */}
          <Section title="Extracted Resume Data" icon={GraduationCap} open>
            <div className="space-y-5">
              {/* Skills */}
              <div>
                <p className="text-xs text-dark-400 uppercase tracking-wider mb-2">All Extracted Skills ({a.parsedData?.skills?.length||0})</p>
                <div className="flex flex-wrap gap-1.5">
                  {a.parsedData?.skills?.map(s => <span key={s} className="badge bg-brand-500/10 text-brand-400 border-brand-500/20 text-xs">{s}</span>)}
                </div>
              </div>
              {/* Tech skill categories */}
              {a.parsedData?.technicalSkills && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(a.parsedData.technicalSkills).filter(([,v])=>Array.isArray(v)&&v.length).map(([cat,skills])=>(
                    <div key={cat} className="bg-dark-800/50 rounded-xl p-3">
                      <p className="text-dark-500 text-xs font-medium mb-2 capitalize">{cat}</p>
                      <div className="flex flex-wrap gap-1">{skills.map(s=><span key={s} className="badge bg-dark-700 text-dark-300 border-dark-600 text-xs">{s}</span>)}</div>
                    </div>
                  ))}
                </div>
              )}
              {/* Radar */}
              {radarData.length > 2 && (
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#2a2a2a"/>
                    <PolarAngleAxis dataKey="subject" tick={{ fill:'#6e6e6e', fontSize:11 }}/>
                    <PolarRadiusAxis angle={30} domain={[0,100]} tick={false}/>
                    <Radar dataKey="value" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={2}/>
                    <Tooltip contentStyle={{ background:'#1e1e1e', border:'1px solid #2a2a2a', borderRadius:8 }}/>
                  </RadarChart>
                </ResponsiveContainer>
              )}
              {/* Experience */}
              {a.parsedData?.experience?.length > 0 && (
                <div>
                  <p className="text-xs text-dark-400 uppercase tracking-wider mb-3">Work Experience</p>
                  {a.parsedData.experience.map((exp,i)=>(
                    <div key={i} className="bg-dark-800/50 rounded-xl p-4 mb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-white text-sm">{exp.role}</p>
                          <p className="text-dark-400 text-xs">{exp.company} · {exp.duration}</p>
                        </div>
                        {exp.relevanceScore && <span className={`badge text-xs shrink-0 ${exp.relevanceScore>=75?'bg-green-500/10 text-green-400 border-green-500/20':'bg-dark-700 text-dark-400 border-dark-600'}`}>{exp.relevanceScore}% rel.</span>}
                      </div>
                      {exp.achievements?.length>0 && (
                        <ul className="mt-2 space-y-1">{exp.achievements.map((ac,j)=><li key={j} className="text-dark-400 text-xs flex gap-1.5"><span className="text-brand-500 shrink-0">›</span>{ac}</li>)}</ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {/* Projects */}
              {a.parsedData?.projects?.length > 0 && (
                <div>
                  <p className="text-xs text-dark-400 uppercase tracking-wider mb-3">Projects</p>
                  {a.parsedData.projects.map((proj,i)=>(
                    <div key={i} className="bg-dark-800/50 rounded-xl p-4 mb-2">
                      <p className="font-medium text-white text-sm">{proj.name}</p>
                      <p className="text-dark-400 text-xs mt-1">{proj.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">{proj.techStack?.map(t=><span key={t} className="badge bg-dark-700 text-dark-400 border-dark-600 text-xs">{t}</span>)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* Missing + Red flags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3"><XCircle className="w-4 h-4 text-red-400"/><p className="font-medium text-white">Missing Skills ({a.missingSkills?.length})</p></div>
              <div className="flex flex-wrap gap-1.5">{a.missingSkills?.length
                ? a.missingSkills.map(s=><span key={s} className="badge bg-red-500/10 text-red-400 border-red-500/20 text-xs">{s}</span>)
                : <p className="text-dark-500 text-sm">Full coverage!</p>}</div>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4 text-yellow-400"/><p className="font-medium text-white">Red Flags ({a.redFlags?.length||0})</p></div>
              <ul className="space-y-1.5">{a.redFlags?.length
                ? a.redFlags.map((f,i)=><li key={i} className="text-dark-400 text-xs flex gap-1.5"><span className="text-red-500 shrink-0">!</span>{f}</li>)
                : <p className="text-dark-500 text-sm">None detected</p>}</ul>
            </div>
          </div>

          {/* ATS */}
          <Section title="ATS Analysis" icon={ShieldCheck}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[{l:'Keyword Match',v:a.atsScore?.keywordMatch},{l:'Sections',v:a.atsScore?.sectionCompleteness},{l:'Quantification',v:a.atsScore?.quantification},{l:'Contact',v:a.atsScore?.contactCompleteness}].map(item=>(
                  <div key={item.l} className="bg-dark-800 rounded-xl p-3 text-center">
                    <p className="text-dark-500 text-xs mb-1">{item.l}</p>
                    <p className={`font-display text-xl font-bold ${(item.v||0)>=70?'text-green-400':(item.v||0)>=40?'text-brand-400':'text-red-400'}`}>{item.v||0}%</p>
                    <div className="progress-bar mt-1.5"><div className="progress-fill bg-brand-500" style={{width:`${item.v||0}%`}}/></div>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs text-dark-400 uppercase tracking-wider mb-2">Missing ATS Keywords</p>
                <div className="flex flex-wrap gap-1.5">{a.atsScore?.missingKeywords?.length
                  ? a.atsScore.missingKeywords.map(k=><span key={k} className="badge bg-red-500/10 text-red-400 border-red-500/20 text-xs">{k}</span>)
                  : <p className="text-dark-500 text-xs">All keywords present!</p>}</div>
              </div>
              {a.atsTips?.length>0 && (
                <div>
                  <p className="text-xs text-dark-400 uppercase tracking-wider mb-2">ATS Tips</p>
                  <ul className="space-y-1.5">{a.atsTips.map((t,i)=><li key={i} className="text-dark-300 text-sm flex gap-2"><span className="text-brand-500 shrink-0">›</span>{t}</li>)}</ul>
                </div>
              )}
              <p className="text-dark-400 text-sm bg-dark-800/50 rounded-xl p-3">{a.resumeStructureFeedback}</p>
            </div>
          </Section>

          {/* Suggestions */}
          <Section title="AI Improvement Suggestions" icon={Lightbulb} open>
            <ol className="space-y-3">{a.suggestions?.map((s,i)=>(
              <li key={i} className="flex gap-3 text-sm">
                <span className="font-mono text-brand-500 font-bold shrink-0">{String(i+1).padStart(2,'0')}</span>
                <span className="text-dark-300 leading-relaxed">{s}</span>
              </li>
            ))}</ol>
          </Section>

          {/* JD Intelligence */}
          {jd && (
            <Section title="Job Description Intelligence" icon={BookOpen}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[{l:'Role Level',v:jd.roleLevel},{l:'Difficulty',v:jd.estimatedDifficulty},{l:'Prep Time',v:`${jd.preparationWeeks||2} weeks`},{l:'Salary',v:jd.salaryInsight},{l:'Growth',v:jd.growthPotential?.slice(0,30)+'…'}].map(item=>(
                    <div key={item.l} className="bg-dark-800 rounded-xl p-3">
                      <p className="text-dark-500 text-xs">{item.l}</p>
                      <p className="font-medium text-dark-200 text-sm mt-0.5">{item.v||'—'}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs text-dark-400 uppercase tracking-wider mb-2">Interview Topics</p>
                  <div className="space-y-1.5">{jd.interviewTopics?.map(t=>(
                    <div key={t.topic} className="flex items-center gap-3">
                      <span className="text-dark-300 text-sm flex-1">{t.topic}</span>
                      <span className={`badge text-xs shrink-0 ${t.weight==='High'?'bg-red-500/10 text-red-400 border-red-500/20':t.weight==='Medium'?'bg-yellow-500/10 text-yellow-400 border-yellow-500/20':'bg-green-500/10 text-green-400 border-green-500/20'}`}>{t.weight}</span>
                    </div>
                  ))}</div>
                </div>
              </div>
            </Section>
          )}

          {/* CTA */}
          <div className="card p-5 flex items-center gap-4 border-brand-500/20">
            <div className="w-10 h-10 bg-brand-500/10 rounded-xl flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-brand-400"/>
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">Ready to prep for the interview?</p>
              <p className="text-dark-500 text-sm">Generate role-specific questions, coding problems & a roadmap</p>
            </div>
            <Link href="/student/interview-prep" className="btn-primary text-sm shrink-0">
              Prep Now <ArrowRight className="w-4 h-4"/>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}