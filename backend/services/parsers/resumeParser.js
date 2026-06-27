const { chatCompletion } = require('../../utils/groqClient');

//  Known skill taxonomy for normalization 
const SKILL_ALIASES = {
  'js': 'JavaScript', 'javascript': 'JavaScript', 'reactjs': 'React',
  'react.js': 'React', 'react js': 'React', 'nodejs': 'Node.js',
  'node js': 'Node.js', 'node': 'Node.js', 'mongodb': 'MongoDB',
  'mongo': 'MongoDB', 'postgres': 'PostgreSQL', 'postgresql': 'PostgreSQL',
  'mysql': 'MySQL', 'py': 'Python', 'python3': 'Python',
  'typescript': 'TypeScript', 'ts': 'TypeScript', 'aws': 'AWS',
  'amazon web services': 'AWS', 'gcp': 'Google Cloud', 'azure': 'Microsoft Azure',
  'ml': 'Machine Learning', 'ai': 'Artificial Intelligence',
  'dl': 'Deep Learning', 'nlp': 'Natural Language Processing',
  'ds': 'Data Science', 'c++': 'C++', 'cpp': 'C++', 'golang': 'Go',
  'golang lang': 'Go', 'k8s': 'Kubernetes', 'kube': 'Kubernetes',
  'tf': 'TensorFlow', 'tensorflow2': 'TensorFlow', 'scikit': 'Scikit-Learn',
  'sklearn': 'Scikit-Learn', 'fastapi': 'FastAPI', 'django': 'Django',
  'flask': 'Flask', 'spring': 'Spring Boot', 'springboot': 'Spring Boot',
};

const normalizeSkill = (skill) => {
  const lower = skill.toLowerCase().trim();
  return SKILL_ALIASES[lower] || skill.trim();
};

//  Section detection heuristics 
const detectSections = (text) => {
  const sections = {
    contact: '',
    summary: '',
    skills: '',
    education: '',
    experience: '',
    projects: '',
    certifications: '',
    achievements: '',
  };

  const sectionPatterns = {
    summary: /(?:summary|objective|about|profile)/i,
    skills: /(?:skills|technologies|tech stack|tools|competencies)/i,
    education: /(?:education|academic|qualification|degree)/i,
    experience: /(?:experience|work history|employment|internship)/i,
    projects: /(?:projects|portfolio|work samples)/i,
    certifications: /(?:certif|course|credential|license)/i,
    achievements: /(?:achievement|award|honor|recognition|publication)/i,
  };

  const lines = text.split('\n');
  let currentSection = 'contact';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let matched = false;
    for (const [section, pattern] of Object.entries(sectionPatterns)) {
      if (trimmed.length < 50 && pattern.test(trimmed)) {
        currentSection = section;
        matched = true;
        break;
      }
    }

    if (!matched) {
      sections[currentSection] += trimmed + '\n';
    }
  }

  return sections;
};

//  Extract emails / phone / LinkedIn / GitHub 
const extractContactInfo = (text) => {
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] || null;
  const phone = text.match(/(?:\+91[\s-]?)?[6-9]\d{9}|(?:\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)?.[0] || null;
  const linkedin = text.match(/linkedin\.com\/in\/[\w-]+/)?.[0] || null;
  const github = text.match(/github\.com\/[\w-]+/)?.[0] || null;
  const name = text.split('\n').find((l) => l.trim().length > 2 && l.trim().length < 60 && /^[A-Z][a-z]/.test(l.trim()))?.trim() || null;
  return { name, email, phone, linkedin, github };
};

//  Skill extraction from skills section 
const extractSkillsFromText = (skillText) => {
  // const delimiters = /[,|•\n\t\/]+/;
  const delimiters = /[,|\u2022\n\t\/•]+/;
  const raw = skillText.split(delimiters).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 40);
  return [...new Set(raw.map(normalizeSkill))].filter(Boolean);
};

//  AI-powered deep parse 
const deepParseWithAI = async (resumeText) => {
  const sections = detectSections(resumeText);
  const contactInfo = extractContactInfo(resumeText);
  const rawSkills = extractSkillsFromText(sections.skills);

  const prompt = `
You are a precise resume parser. Extract structured data from this resume.

DETECTED SECTIONS:
Skills: ${sections.skills.slice(0, 1000)}
Education: ${sections.education.slice(0, 1000)}
Experience: ${sections.experience.slice(0, 2000)}
Projects: ${sections.projects.slice(0, 1500)}
Certifications: ${sections.certifications.slice(0, 500)}

Return ONLY valid JSON (no markdown):
{
  "name": "Full Name",
  "email": "${contactInfo.email || ''}",
  "phone": "${contactInfo.phone || ''}",
  "linkedin": "${contactInfo.linkedin || ''}",
  "github": "${contactInfo.github || ''}",
  "summary": "Professional summary if present",
  "skills": ["JavaScript", "React", "Node.js"],
  "technicalSkills": {
    "languages": ["Python", "JavaScript"],
    "frameworks": ["React", "Django"],
    "databases": ["MongoDB", "PostgreSQL"],
    "cloud": ["AWS", "GCP"],
    "tools": ["Git", "Docker", "JIRA"],
    "concepts": ["REST API", "Microservices", "System Design"]
  },
  "education": [
    {
      "degree": "B.Tech Computer Science",
      "institution": "IIT Bombay",
      "year": "2020-2024",
      "cgpa": "8.7",
      "relevant_courses": ["Data Structures", "ML", "DBMS"]
    }
  ],
  "experience": [
    {
      "company": "TechCorp",
      "role": "Software Engineer Intern",
      "duration": "Jun 2023 - Sep 2023",
      "location": "Bangalore",
      "techStack": ["Python", "FastAPI", "PostgreSQL"],
      "responsibilities": ["Built REST APIs", "Optimized DB queries"],
      "achievements": ["Reduced API latency by 40%", "Shipped 5 features"]
    }
  ],
  "projects": [
    {
      "name": "E-Commerce Platform",
      "description": "Full-stack marketplace with AI recommendations",
      "techStack": ["React", "Node.js", "MongoDB"],
      "achievements": ["10k+ users", "Featured in college tech fest"],
      "links": {"github": "github.com/user/project", "live": "project.com"}
    }
  ],
  "certifications": [
    {"name": "AWS Certified Developer", "issuer": "Amazon", "year": "2023"}
  ],
  "achievements": ["Dean's List 2022", "First place in CodeChef Regional"],
  "languages": ["English (Fluent)", "Hindi (Native)"],
  "totalExperienceMonths": 3,
  "seniorityLevel": "Fresher|Junior|Mid|Senior",
  "resumeQualityScore": 75,
  "parserConfidence": 0.92
}
`;

 const parsed = await chatCompletion([
  { role: 'system', content: 'You are a precise resume parser. Output only valid JSON.' },
  { role: 'user', content: prompt }
], { temperature: 0.1, max_tokens: 2000 });

  // Merge AI-extracted skills with regex-extracted skills
  const allSkills = [...new Set([
    ...(parsed.skills || []),
    ...rawSkills,
  ].map(normalizeSkill))];

  return { ...parsed, skills: allSkills, _contactInfo: contactInfo, _sections: Object.keys(sections).filter((k) => sections[k].length > 10) };
};

//  Compute ATS score 
const computeATSScore = (parsedResume, requiredSkills) => {
  const scores = {};

  // Keyword match
  const resumeText = JSON.stringify(parsedResume).toLowerCase();
  const matched = requiredSkills.filter((s) => resumeText.includes(s.toLowerCase()));
  scores.keywordMatch = Math.round((matched.length / Math.max(requiredSkills.length, 1)) * 100);

  // Sections completeness
  const hasSection = (key) => parsedResume[key] && (Array.isArray(parsedResume[key]) ? parsedResume[key].length > 0 : parsedResume[key].length > 10);
  const sectionScore = ['skills', 'education', 'experience', 'projects'].filter(hasSection).length * 25;
  scores.sectionCompleteness = sectionScore;

  // Quantification (numbers in experience/achievements)
  const expText = JSON.stringify(parsedResume.experience || []) + JSON.stringify(parsedResume.achievements || []);
  const hasNumbers = (expText.match(/\d+%|\d+x|\$\d+|\d+ (users|clients|projects)/gi) || []).length;
  scores.quantification = Math.min(100, hasNumbers * 25);

  // Contact completeness
  const contactFields = ['email', 'phone', 'linkedin', 'github'].filter((f) => parsedResume[f]);
  scores.contactCompleteness = contactFields.length * 25;

  // Overall ATS score
  scores.overall = Math.round(
    scores.keywordMatch * 0.4 +
    scores.sectionCompleteness * 0.25 +
    scores.quantification * 0.2 +
    scores.contactCompleteness * 0.15
  );

  scores.matchedKeywords = matched;
  scores.missingKeywords = requiredSkills.filter((s) => !resumeText.includes(s.toLowerCase()));

  return scores;
};

module.exports = { deepParseWithAI, detectSections, extractContactInfo, extractSkillsFromText, normalizeSkill, computeATSScore };