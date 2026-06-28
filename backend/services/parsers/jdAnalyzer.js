const { ragAnalyzeJD } = require('../rag/ragPipeline');
const { normalizeSkill } = require('./resumeParser');

//  Heuristic seniority detector 
const detectSeniority = (jdText) => {
  const lower = jdText.toLowerCase();
  const signals = {
    'Principal': ['principal', 'staff engineer', '10+ years', '8+ years'],
    'Senior':    ['senior', 'lead', '5+ years', '6+ years', '7+ years'],
    'Mid':       ['mid-level', '3+ years', '4+ years', 'experienced'],
    'Junior':    ['junior', 'entry level', 'fresher', '0-2 years', '1+ year', 'graduate'],
    'Intern':    ['intern', 'internship', 'trainee'],
  };
  for (const [level, keywords] of Object.entries(signals)) {
    if (keywords.some((k) => lower.includes(k))) return level;
  }
  return 'Mid';
};

//  Extract salary range hints 
const extractSalaryHints = (jdText) => {
  const patterns = [
    /(\d+)\s*(?:to|-)\s*(\d+)\s*(?:LPA|lpa|lakhs?|L)/i,
    /₹\s*(\d+)[,.]?(\d*)\s*(?:to|-)\s*₹\s*(\d+)/i,
    /(\d+)k\s*(?:to|-)\s*(\d+)k/i,
  ];
  for (const p of patterns) {
    const m = jdText.match(p);
    if (m) return `${m[1]}-${m[2]} LPA`;
  }
  return null;
};

//  Interview topic weight prediction 
const predictInterviewWeights = (parsedJD) => {
  const topics = [];
  const stack = [...(parsedJD.primaryTechStack || []), ...(parsedJD.secondaryTechStack || [])].map((s) => s.toLowerCase());
  const domain = (parsedJD.domainKnowledge || []).map((d) => d.toLowerCase());

  // DSA — always present for product companies
  const dsaWeight = stack.some((s) => ['python', 'java', 'c++', 'go'].includes(s)) ? 'High' : 'Medium';
  topics.push({ topic: 'Data Structures & Algorithms', weight: dsaWeight, subtopics: ['Arrays & Strings', 'Trees & Graphs', 'Dynamic Programming', 'Sorting'] });

  // System Design — for mid/senior
  if (!['Junior', 'Intern'].includes(parsedJD.roleLevel)) {
    topics.push({ topic: 'System Design', weight: 'High', subtopics: ['Scalability', 'Load Balancing', 'Caching', 'Database Design', 'API Design'] });
  }

  // Frontend specific
  if (stack.some((s) => ['react', 'angular', 'vue', 'javascript', 'typescript'].includes(s))) {
    topics.push({ topic: 'Frontend Development', weight: 'High', subtopics: ['React Hooks', 'State Management', 'Browser APIs', 'CSS/Layout', 'Performance'] });
  }

  // Backend specific
  if (stack.some((s) => ['node.js', 'django', 'fastapi', 'spring boot', 'express'].includes(s))) {
    topics.push({ topic: 'Backend Development', weight: 'High', subtopics: ['REST API Design', 'Authentication', 'Middleware', 'Error Handling', 'Testing'] });
  }

  // Databases
  if (stack.some((s) => ['mongodb', 'postgresql', 'mysql', 'sql', 'redis'].includes(s))) {
    topics.push({ topic: 'Database & SQL', weight: 'Medium', subtopics: ['Query Optimization', 'Indexing', 'Transactions', 'Schema Design'] });
  }

  // ML/AI
  if (stack.some((s) => ['tensorflow', 'pytorch', 'scikit-learn', 'machine learning'].includes(s))) {
    topics.push({ topic: 'ML/AI Concepts', weight: 'High', subtopics: ['Model Training', 'Evaluation Metrics', 'Feature Engineering', 'Deployment'] });
  }

  // Cloud
  if (stack.some((s) => ['aws', 'gcp', 'azure', 'docker', 'kubernetes'].includes(s))) {
    topics.push({ topic: 'Cloud & DevOps', weight: 'Medium', subtopics: ['CI/CD', 'Containerization', 'Cloud Services', 'Infrastructure'] });
  }

  // HR always
  topics.push({ topic: 'HR & Behavioral', weight: 'Medium', subtopics: ['Tell me about yourself', 'Strengths & Weaknesses', 'Team conflict', 'Goals'] });

  return topics;
};

//  Full JD Analysis Pipeline 
const analyzeJobDescription = async (jdText, companyName = '') => {
  // 1. Run RAG analysis via LLM
  const aiAnalysis = await ragAnalyzeJD(jdText, companyName);

  // 2. Augment with heuristic analysis
  const seniorityHeuristic = detectSeniority(jdText);
  const salaryHint = extractSalaryHints(jdText);
  const predictedTopics = predictInterviewWeights({
    ...aiAnalysis,
    roleLevel: aiAnalysis.roleLevel || seniorityHeuristic,
  });

  // 3. Word frequency analysis for hidden requirements
  const words = jdText.toLowerCase().split(/\W+/).filter((w) => w.length > 4);
  const freq = {};
  words.forEach((w) => { freq[w] = (freq[w] || 0) + 1; });
  const topKeywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word)
    .filter((w) => !['that', 'this', 'with', 'from', 'they', 'will', 'have', 'been', 'their', 'about', 'would', 'which'].includes(w));

  return {
    ...aiAnalysis,
    roleLevel:          aiAnalysis.roleLevel || seniorityHeuristic,
    salaryInsight:      salaryHint || aiAnalysis.salaryInsight || 'Not disclosed',
    interviewTopics:    predictedTopics,
    topKeywords,
    analyzedAt:         new Date().toISOString(),
  };
};

//  Compare student profile vs JD 
// parsedResumeSkills (optional) = AI-normalized skills extracted from the actual resume
// (deepParseWithAI). We merge these with the raw profile field so a skill that's on the
// resume but missing from the self-entered profile still counts as a match.
const compareProfileToJD = (studentProfile, jdAnalysis, parsedResumeSkills = []) => {
  const studentSkillsLower = [
    ...new Set(
      [...(studentProfile.skills || []), ...parsedResumeSkills]
        .map((s) => normalizeSkill(s).toLowerCase())
    ),
  ];

  // Normalize JD skill names through the same alias map so e.g. "Node" / "Node.js" / "NodeJS"
  // in a JD all resolve to the same canonical skill the resume parser would have produced.
  const mustHave = (jdAnalysis.mustHaveSkills || []).map(normalizeSkill);
  const niceToHave = (jdAnalysis.niceToHaveSkills || []).map(normalizeSkill);

  const mustHaveMatched = mustHave.filter((s) => studentSkillsLower.includes(s.toLowerCase()));
  const niceToHaveMatched = niceToHave.filter((s) => studentSkillsLower.includes(s.toLowerCase()));
  const mustHaveMissing = mustHave.filter((s) => !studentSkillsLower.includes(s.toLowerCase()));
  const niceToHaveMissing = niceToHave.filter((s) => !studentSkillsLower.includes(s.toLowerCase()));

  const mustHaveScore = mustHave.length ? (mustHaveMatched.length / mustHave.length) * 100 : 100;
  const niceToHaveScore = niceToHave.length ? (niceToHaveMatched.length / niceToHave.length) * 100 : 0;
  const overallFit = Math.round(mustHaveScore * 0.7 + niceToHaveScore * 0.3);

  return {
    overallFit,
    mustHaveScore: Math.round(mustHaveScore),
    niceToHaveScore: Math.round(niceToHaveScore),
    mustHaveMatched,
    mustHaveMissing,
    niceToHaveMatched,
    niceToHaveMissing,
    verdict: overallFit >= 80 ? 'Strong Match' : overallFit >= 60 ? 'Good Match' : overallFit >= 40 ? 'Partial Match' : 'Weak Match',
    eligibilityRisk: mustHaveMissing.length > 2 ? 'High' : mustHaveMissing.length > 0 ? 'Medium' : 'Low',
  };
};

module.exports = { analyzeJobDescription, compareProfileToJD, detectSeniority, predictInterviewWeights };