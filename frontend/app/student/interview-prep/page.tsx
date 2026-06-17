'use client';
import { useState, useEffect } from 'react';
import { aiApi, companyApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  BookOpen, Loader2, ChevronDown, ChevronUp, Send,
  Brain, Users, Calculator, Map, Zap, MessageSquare
} from 'lucide-react';

function QuestionCard({ q, index, type }) {
  const [open, setOpen] = useState(false);
  const colors = {
    tech: 'border-blue-500/20 bg-blue-500/5',
    hr:   'border-purple-500/20 bg-purple-500/5',
    apt:  'border-green-500/20 bg-green-500/5',
  };
  return (
    <div className={`card border p-4 cursor-pointer transition-all ${colors[type]}`} onClick={() => setOpen(!open)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="font-mono text-xs text-dark-500 mt-0.5 flex-shrink-0">Q{index + 1}</span>
          <p className="text-dark-200 text-sm font-medium">{q.question}</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-dark-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-dark-500 flex-shrink-0" />}
      </div>
      {open && (
        <div className="mt-3 pl-7 space-y-2 text-sm text-dark-400 border-t border-dark-700 pt-3">
          {q.hint  && <p><span className="text-brand-400 font-medium">Hint: </span>{q.hint}</p>}
          {q.tip   && <p><span className="text-purple-400 font-medium">Tip: </span>{q.tip}</p>}
          {q.answer && <p><span className="text-green-400 font-medium">Answer: </span>{q.answer}</p>}
          {q.topic && <span className="badge bg-dark-700 text-dark-400 border-dark-600 text-xs">{q.topic}</span>}
          {q.difficulty && (
            <span className={`badge text-xs ${
              q.difficulty === 'Hard' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
              q.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
              'bg-green-500/10 text-green-400 border-green-500/20'
            }`}>{q.difficulty}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function InterviewPrepPage() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [prep, setPrep] = useState(null);
  const [activeTab, setActiveTab] = useState('technical');

  // Mock interview state
  const [mockMode, setMockMode] = useState(false);
  const [mockQuestion, setMockQuestion] = useState('');
  const [mockAnswer, setMockAnswer] = useState('');
  const [mockFeedback, setMockFeedback] = useState(null);
  const [mockLoading, setMockLoading] = useState(false);

  useEffect(() => {
    companyApi.getAll({ limit: 50 }).then(({ data }) => setCompanies(data.companies));
  }, []);

  const selectedCompanyData = companies.find((c) => c._id === selectedCompany);

  const handleGenerate = async () => {
    if (!selectedCompany || !selectedRole) {
      toast.error('Please select a company and role');
      return;
    }
    setLoading(true); setPrep(null);
    try {
      const { data } = await aiApi.generateInterviewPrep({ companyId: selectedCompany, roleId: selectedRole });
      setPrep(data.prep);
      toast.success('Interview prep generated! 🎯');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Generation failed');
    } finally { setLoading(false); }
  };

  const handleMockSubmit = async () => {
    if (!mockQuestion || !mockAnswer.trim()) return;
    setMockLoading(true);
    try {
      const { data } = await aiApi.mockInterview({
        question: mockQuestion, userAnswer: mockAnswer,
        companyId: selectedCompany, roleId: selectedRole,
      });
      setMockFeedback(data.result);
    } catch { toast.error('Feedback failed'); }
    finally { setMockLoading(false); }
  };

  const TABS = [
    { id: 'technical', label: 'Technical', icon: Brain, count: prep?.technicalQuestions?.length },
    { id: 'hr',        label: 'HR',        icon: Users, count: prep?.hrQuestions?.length },
    { id: 'aptitude',  label: 'Aptitude',  icon: Calculator, count: prep?.aptitudeQuestions?.length },
    { id: 'roadmap',   label: 'Roadmap',   icon: Map,   count: null },
    { id: 'mock',      label: 'Mock',      icon: MessageSquare, count: null },
  ];

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Interview Prep Engine</h1>
        <p className="text-dark-400 mt-1">AI-generated questions, roadmap, and mock interview practice</p>
      </div>

      {/* Setup */}
      <div className="card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Company</label>
            <select className="input" value={selectedCompany}
              onChange={(e) => { setSelectedCompany(e.target.value); setSelectedRole(''); setPrep(null); }}>
              <option value="">Select Company</option>
              {companies.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={selectedRole}
              onChange={(e) => { setSelectedRole(e.target.value); setPrep(null); }}
              disabled={!selectedCompany}>
              <option value="">Select Role</option>
              {selectedCompanyData?.roles?.map((r) => (
                <option key={r._id} value={r._id}>{r.roleTitle}</option>
              ))}
            </select>
          </div>
        </div>
        <button onClick={handleGenerate} disabled={loading || !selectedCompany || !selectedRole}
          className="btn-primary w-full justify-center py-3">
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating AI prep...</>
            : <><Zap className="w-4 h-4" /> Generate Interview Prep</>}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="card p-10 text-center">
          <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-brand-400 animate-bounce" />
          </div>
          <p className="font-display font-bold text-white text-lg">AI is building your prep guide...</p>
          <p className="text-dark-500 text-sm mt-2">Analyzing JD, generating questions, crafting roadmap</p>
        </div>
      )}

      {/* Results */}
      {prep && !loading && (
        <div className="space-y-5 animate-slide-up">
          {/* Meta info */}
          <div className="flex flex-wrap gap-3">
            {prep.difficulty && (
              <span className={`badge text-sm ${
                prep.difficulty === 'Hard' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                prep.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                'bg-green-500/10 text-green-400 border-green-500/20'
              }`}>Difficulty: {prep.difficulty}</span>
            )}
            {prep.estimatedPrepTime && (
              <span className="badge bg-brand-500/10 text-brand-400 border-brand-500/20 text-sm">
                ⏱ {prep.estimatedPrepTime}
              </span>
            )}
            {prep.techStack?.map((t) => (
              <span key={t} className="badge bg-dark-700 text-dark-300 border-dark-600 text-xs">{t}</span>
            ))}
          </div>

          {/* Topics */}
          {prep.predictedTopics?.length > 0 && (
            <div className="card p-4">
              <p className="text-dark-400 text-xs font-medium uppercase tracking-wider mb-3">Predicted Interview Topics</p>
              <div className="flex flex-wrap gap-2">
                {prep.predictedTopics.map((t) => (
                  <span key={t} className="badge bg-brand-500/10 text-brand-400 border-brand-500/20 text-xs">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-dark-900 border border-dark-800 p-1 rounded-xl overflow-x-auto">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-brand-500 text-dark-950'
                    : 'text-dark-400 hover:text-dark-200'
                }`}>
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.count && <span className="text-xs opacity-70">({tab.count})</span>}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="space-y-3">
            {activeTab === 'technical' && prep.technicalQuestions?.map((q, i) => (
              <QuestionCard key={i} q={q} index={i} type="tech" />
            ))}
            {activeTab === 'hr' && prep.hrQuestions?.map((q, i) => (
              <QuestionCard key={i} q={q} index={i} type="hr" />
            ))}
            {activeTab === 'aptitude' && prep.aptitudeQuestions?.map((q, i) => (
              <QuestionCard key={i} q={q} index={i} type="apt" />
            ))}

            {activeTab === 'roadmap' && (
              <div className="space-y-4">
                {prep.preparationRoadmap?.map((week) => (
                  <div key={week.week} className="card p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-dark-950 font-bold text-sm flex-shrink-0">
                        {week.week}
                      </div>
                      <div>
                        <p className="font-medium text-white">Week {week.week}</p>
                        <p className="text-dark-400 text-sm">{week.focus}</p>
                      </div>
                    </div>
                    <ul className="space-y-1.5 mb-3">
                      {week.tasks?.map((t, i) => (
                        <li key={i} className="flex gap-2 text-sm text-dark-300">
                          <span className="text-brand-500 flex-shrink-0">›</span>{t}
                        </li>
                      ))}
                    </ul>
                    {week.resources?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {week.resources.map((r, i) => (
                          <span key={i} className="badge bg-dark-700 text-dark-400 border-dark-600 text-xs">{r}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {prep.keyTips?.length > 0 && (
                  <div className="card p-5">
                    <p className="font-medium text-white mb-3">Key Tips</p>
                    <ul className="space-y-2">
                      {prep.keyTips.map((t, i) => (
                        <li key={i} className="text-dark-400 text-sm flex gap-2">
                          <span className="text-brand-500 flex-shrink-0">✦</span>{t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'mock' && (
              <div className="card p-6 space-y-5">
                <p className="font-medium text-white">Mock Interview Practice</p>
                <div>
                  <label className="label">Question</label>
                  <select className="input" value={mockQuestion} onChange={(e) => { setMockQuestion(e.target.value); setMockFeedback(null); }}>
                    <option value="">Pick a technical question...</option>
                    {prep.technicalQuestions?.map((q, i) => (
                      <option key={i} value={q.question}>Q{i+1}: {q.question.slice(0, 80)}...</option>
                    ))}
                  </select>
                </div>
                {mockQuestion && (
                  <div className="card p-4 bg-dark-800/50">
                    <p className="text-dark-200 text-sm">{mockQuestion}</p>
                  </div>
                )}
                <div>
                  <label className="label">Your Answer</label>
                  <textarea rows={5} className="input resize-none" placeholder="Type your answer here..."
                    value={mockAnswer} onChange={(e) => setMockAnswer(e.target.value)} />
                </div>
                <button onClick={handleMockSubmit} disabled={mockLoading || !mockQuestion || !mockAnswer.trim()}
                  className="btn-primary justify-center">
                  {mockLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Get AI Feedback
                </button>
                {mockFeedback && (
                  <div className="space-y-4 animate-slide-up">
                    <div className="flex items-center gap-3">
                      <div className={`text-4xl font-display font-bold ${
                        mockFeedback.score >= 8 ? 'text-green-400' :
                        mockFeedback.score >= 6 ? 'text-brand-400' : 'text-red-400'
                      }`}>{mockFeedback.score}/10</div>
                      <p className="text-dark-300 text-sm">{mockFeedback.encouragement}</p>
                    </div>
                    <div className="card p-4">
                      <p className="text-dark-400 text-xs font-medium uppercase tracking-wider mb-2">Feedback</p>
                      <p className="text-dark-300 text-sm">{mockFeedback.feedback}</p>
                    </div>
                    {mockFeedback.idealPoints?.length > 0 && (
                      <div className="card p-4">
                        <p className="text-dark-400 text-xs font-medium uppercase tracking-wider mb-2">Key points you should cover</p>
                        <ul className="space-y-1.5">
                          {mockFeedback.idealPoints.map((p, i) => (
                            <li key={i} className="text-dark-300 text-sm flex gap-2">
                              <span className="text-brand-500">›</span>{p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {mockFeedback.nextQuestion && (
                      <div className="card p-4 border-brand-500/20">
                        <p className="text-brand-400 text-xs font-medium uppercase tracking-wider mb-2">Follow-up Question</p>
                        <p className="text-dark-200 text-sm">{mockFeedback.nextQuestion}</p>
                        <button onClick={() => { setMockQuestion(mockFeedback.nextQuestion); setMockAnswer(''); setMockFeedback(null); }}
                          className="btn-secondary text-xs py-1.5 px-3 mt-3">
                          Answer this question
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}