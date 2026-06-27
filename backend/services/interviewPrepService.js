const { chatCompletion } = require('../utils/groqClient');
const { analyzeJobDescription } = require('./parsers/jdAnalyzer');



// Learning resource database 
const RESOURCE_MAP = {
  'Data Structures & Algorithms': [
    { name: 'LeetCode', url: 'https://leetcode.com', type: 'Practice' },
    { name: 'NeetCode 150', url: 'https://neetcode.io', type: 'Roadmap' },
    { name: 'Striver SDE Sheet', url: 'https://takeuforward.org', type: 'Sheet' },
  ],
  'System Design': [
    { name: 'System Design Primer', url: 'https://github.com/donnemartin/system-design-primer', type: 'Guide' },
    { name: 'Grokking System Design', url: 'https://educative.io', type: 'Course' },
  ],
  'React': [
    { name: 'React Official Docs', url: 'https://react.dev', type: 'Docs' },
    { name: 'React Patterns', url: 'https://reactpatterns.com', type: 'Reference' },
  ],
  'Node.js': [
    { name: 'Node.js Best Practices', url: 'https://github.com/goldbergyoni/nodebestpractices', type: 'Guide' },
  ],
  'Machine Learning': [
    { name: 'Fast.ai', url: 'https://fast.ai', type: 'Course' },
    { name: 'Kaggle Learn', url: 'https://kaggle.com/learn', type: 'Practice' },
    { name: 'ML Zoomcamp', url: 'https://github.com/DataTalksClub/machine-learning-zoomcamp', type: 'Course' },
  ],
  'AWS': [
    { name: 'AWS Skill Builder', url: 'https://skillbuilder.aws', type: 'Course' },
    { name: 'CloudGuru', url: 'https://acloudguru.com', type: 'Course' },
  ],
  'SQL': [
    { name: 'SQLZoo', url: 'https://sqlzoo.net', type: 'Practice' },
    { name: 'Mode Analytics SQL Tutorial', url: 'https://mode.com/sql-tutorial', type: 'Guide' },
  ],
};

const getResources = (topics) => {
  const resources = [];
  topics.forEach((t) => {
    const topicResources = RESOURCE_MAP[t.topic] || RESOURCE_MAP[t.topic?.split(' ')[0]] || [];
    resources.push(...topicResources.map((r) => ({ ...r, topic: t.topic })));
  });
  return resources.slice(0, 10);
};

//  Generate full interview prep with RAG context 
const generateAdvancedInterviewPrep = async ({
  roleTitle, jobDescription, requiredSkills, studentSkills = [],
  companyName = '', studentProfile = {}
}) => {

  // 1. Run JD analysis
  const jdAnalysis = await analyzeJobDescription(jobDescription, companyName);

  const missingSkills = requiredSkills.filter(
    (s) => !studentSkills.map((sk) => sk.toLowerCase()).includes(s.toLowerCase())
  );
  const matchedSkills = requiredSkills.filter(
    (s) => studentSkills.map((sk) => sk.toLowerCase()).includes(s.toLowerCase())
  );

  const resources = getResources(jdAnalysis.interviewTopics || []);

  // 2. AI generates personalized questions
  const prompt = `
You are an elite technical interview coach preparing a student for ${companyName || 'a top company'} ${roleTitle} interview.

## Candidate Profile
- Current Skills: ${studentSkills.join(', ') || 'Not provided'}
- Matched Skills: ${matchedSkills.join(', ') || 'None'}
- Missing Skills: ${missingSkills.join(', ') || 'None'}
- CGPA: ${studentProfile.cgpa || 'Not provided'}
- Department: ${studentProfile.department || 'Not provided'}

## Role Details
- Title: ${roleTitle}
- Company: ${companyName}
- Required Skills: ${requiredSkills.join(', ')}
- Level: ${jdAnalysis.roleLevel || 'Mid'}
- Primary Stack: ${(jdAnalysis.primaryTechStack || []).join(', ')}

## Job Description
${jobDescription.slice(0, 1000)}

Generate a COMPREHENSIVE interview prep pack. Return ONLY valid JSON:
{
  "technicalQuestions": [
    {
      "id": 1,
      "question": "Explain how React's reconciliation algorithm works.",
      "topic": "React",
      "difficulty": "Medium",
      "hint": "Think about the virtual DOM diff algorithm",
      "idealAnswer": "2-3 sentence model answer",
      "followUps": ["How does React Fiber improve this?"],
      "timeToAnswer": "5 mins",
      "importance": "High"
    }
  ],
  "hrQuestions": [
    {
      "id": 1,
      "question": "Tell me about a time you handled a difficult team conflict.",
      "framework": "STAR",
      "tip": "Use a real example, focus on resolution and learning",
      "redFlags": ["Don't blame teammates", "Don't say you never had conflicts"],
      "goodSignals": ["Shows empathy", "Demonstrates leadership"]
    }
  ],
  "aptitudeQuestions": [
    {
      "id": 1,
      "question": "If a train travels 60 km in 45 minutes, what is its speed in km/h?",
      "type": "Quantitative",
      "answer": "80 km/h",
      "solution": "60/(45/60) = 60 * (60/45) = 80",
      "topic": "Speed & Distance"
    }
  ],
  "codingProblems": [
    {
      "title": "Two Sum",
      "difficulty": "Easy",
      "platform": "LeetCode",
      "link": "https://leetcode.com/problems/two-sum",
      "pattern": "Hash Map",
      "why": "Tests basic array traversal — common warm-up"
    }
  ],
  "preparationRoadmap": [
    {
      "week": 1,
      "theme": "Foundations & Core Skills",
      "dailyPlan": [
        {"day": 1, "focus": "DSA: Arrays & Strings", "tasks": ["Solve 5 easy LeetCode problems", "Review Big-O notation"], "timeHours": 3},
        {"day": 2, "focus": "React Core", "tasks": ["Revise Hooks", "Build a small counter app"], "timeHours": 3},
        {"day": 3, "focus": "System Design Basics", "tasks": ["Read about CAP theorem", "Design a URL shortener"], "timeHours": 2},
        {"day": 4, "focus": "Missing Skill: ${missingSkills[0] || 'Docker'}", "tasks": ["Watch crash course", "Follow along tutorial"], "timeHours": 3},
        {"day": 5, "focus": "Mock Interview", "tasks": ["Attempt 3 medium LeetCode", "Record yourself answering HR questions"], "timeHours": 2},
        {"day": 6, "focus": "Projects Review", "tasks": ["Prepare to explain all projects end-to-end", "Update GitHub README"], "timeHours": 2},
        {"day": 7, "focus": "Rest & Revision", "tasks": ["Light revision", "Flashcards for key concepts"], "timeHours": 1}
      ],
      "milestone": "Be confident with DSA easy-medium and can explain tech stack"
    },
    {
      "week": 2,
      "theme": "Advanced Topics & Interview Simulation",
      "dailyPlan": [
        {"day": 8,  "focus": "Advanced DSA: Trees & Graphs", "tasks": ["10 medium problems", "BFS/DFS patterns"], "timeHours": 4},
        {"day": 9,  "focus": "System Design Deep Dive", "tasks": ["Design WhatsApp", "Study caching strategies"], "timeHours": 3},
        {"day": 10, "focus": "Missing Skills: ${missingSkills.slice(0,2).join(', ') || 'Cloud'}", "tasks": ["Hands-on lab", "Mini project"], "timeHours": 3},
        {"day": 11, "focus": "Full Mock Interview", "tasks": ["1 coding + 1 system design + HR round"], "timeHours": 4},
        {"day": 12, "focus": "Weak Area Drill", "tasks": ["Focus on flagged weak areas", "Flashcard review"], "timeHours": 3},
        {"day": 13, "focus": "Company Research", "tasks": ["Read about ${companyName}", "Prepare questions to ask interviewer", "Review Glassdoor interview experiences"], "timeHours": 2},
        {"day": 14, "focus": "Final Prep", "tasks": ["Light revision only", "Sleep well", "Prepare documents"], "timeHours": 1}
      ],
      "milestone": "Interview-ready — confident in all rounds"
    }
  ],
  "keyTips": [
    "Think aloud during coding — interviewers want to see your thought process",
    "Always clarify requirements before coding",
    "Start with brute force, then optimize — show your progression",
    "Prepare 3-4 STAR stories for behavioral round"
  ],
  "companySpecificTips": [
    "Research ${companyName}'s recent product launches",
    "Understand their tech stack from engineering blogs"
  ],
  "estimatedPrepTime": "2 weeks",
  "difficultyAssessment": {
    "overall": "${jdAnalysis.estimatedDifficulty || 'Medium'}",
    "codingRound": "Medium",
    "systemDesign": "Medium",
    "hrRound": "Easy"
  }
}

Rules:
- Generate EXACTLY 10 technical questions, 5 HR questions, 5 aptitude questions, 5 coding problems
- Make questions SPECIFIC to the role, company, and student's gaps
- Return ONLY valid JSON
`;

 const prep = await chatCompletion([
  { role: 'system', content: 'You are an elite interview coach. Return only valid JSON.' },
  { role: 'user', content: prompt }
], { temperature: 0.4, max_tokens: 4000 });

  return {
    ...prep,
    jdAnalysis,
    resources,
    missingSkills,
    matchedSkills,
    companyName,
    roleTitle,
    generatedAt: new Date().toISOString(),
  };
};

module.exports = { generateAdvancedInterviewPrep };