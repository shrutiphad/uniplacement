const { chatCompletion } = require('../../utils/groqClient');
const { embedText, cosineSimilarity } = require('./vectorStore');

const chunkText = (text, chunkSize = 500, overlap = 100) => {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.length > 50) chunks.push({ text: chunk, startIdx: i });
  }
  return chunks;
};

const embedDocument = async (text, docId) => {
  const chunks = chunkText(text);
  const embedded = [];
  for (const chunk of chunks) {
    try {
      const vector = await embedText(chunk.text);
      embedded.push({ docId, text: chunk.text, vector, startIdx: chunk.startIdx });
    } catch (err) {}
  }
  return embedded;
};

const retrieveChunks = (query_vector, chunks, topK = 5) => {
  const scored = chunks.map((c) => ({
    ...c,
    score: cosineSimilarity(query_vector, c.vector),
  }));
  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
};

const ragAnalyzeResume = async (resumeText, jobDescription, requiredSkills) => {
  const resumeChunks = await embedDocument(resumeText, 'resume');
  const jdEmbedding = await embedText(jobDescription + ' ' + requiredSkills.join(' '));
  const relevantChunks = retrieveChunks(jdEmbedding, resumeChunks, 6);
  const retrievedContext = relevantChunks.map((c) => c.text).join('\n\n---\n\n');

  const prompt = `
You are an expert AI career counselor and technical recruiter performing deep resume analysis.

## Job Description
${jobDescription}

## Required Skills
${requiredSkills.join(', ')}

## Most Relevant Resume Sections (RAG-retrieved)
${retrievedContext}

## Full Resume (for completeness)
${resumeText.slice(0, 3000)}

Perform a COMPREHENSIVE analysis and return a STRICT JSON object:
{
  "extractedSkills": ["skill1", "skill2"],
  "technicalSkills": ["tech1", "tech2"],
  "softSkills": ["communication", "teamwork"],
  "projects": [
    {
      "name": "Project Name",
      "description": "2-line description",
      "techStack": ["React", "Node.js"],
      "relevanceScore": 85,
      "highlights": ["key achievement 1"]
    }
  ],
  "education": [
    {
      "degree": "B.Tech Computer Science",
      "institution": "IIT Bombay",
      "year": "2024",
      "cgpa": "8.5"
    }
  ],
  "experience": [
    {
      "company": "Company Name",
      "role": "Software Engineer Intern",
      "duration": "Jun 2023 - Aug 2023",
      "techStack": ["Python", "Django"],
      "highlights": ["Reduced API latency by 40%"],
      "relevanceScore": 90
    }
  ],
  "certifications": ["AWS Certified Developer", "Google Cloud Associate"],
  "achievements": ["Won Hackathon 2023", "Published paper on ML"],
  "fitScore": 78,
  "semanticScore": 82,
  "overallScore": 80,
  "missingSkills": ["Docker", "Kubernetes"],
  "partialSkills": [{"skill": "AWS", "gap": "has basics but lacks advanced cloud architecture"}],
  "suggestions": [
    "Add Docker containerization experience - role requires microservices deployment",
    "Quantify project impact: instead of improved performance, say reduced load time by 45%"
  ],
  "resumeStructureScore": 75,
  "resumeStructureFeedback": "Add a dedicated skills section at the top for ATS optimization",
  "atsTips": [
    "Include keywords: REST API, Microservices, CI/CD",
    "Use action verbs: Developed, Architected, Optimized"
  ],
  "summary": "3-sentence compatibility summary",
  "strengths": ["Strong full-stack background", "Relevant project experience"],
  "redFlags": ["No mention of testing frameworks", "Gap in cloud experience"],
  "interviewReadiness": 72,
  "confidenceLevel": "Medium"
}

Rules:
- fitScore = exact keyword match (matchingSkills/totalRequired * 100)
- semanticScore = contextual relevance of projects/experience to JD
- overallScore = weighted average (fitScore*0.4 + semanticScore*0.4 + resumeStructureScore*0.2)
- Be brutally honest, highly specific, actionable
- Return ONLY valid JSON, no markdown fences
`;

  return chatCompletion([
    { role: 'system', content: 'You are an expert AI resume analyzer. Return only valid JSON. Never add markdown code fences.' },
    { role: 'user', content: prompt }
  ], { temperature: 0.2, max_tokens: 2500 });
};

const ragAnalyzeJD = async (jobDescription, companyContext = '') => {
  const prompt = `
You are an expert technical recruiter and job market analyst.

## Job Description
${jobDescription}

## Company Context
${companyContext}

Perform deep JD analysis. Return STRICT JSON:
{
  "roleLevel": "Junior|Mid|Senior|Lead|Principal",
  "primaryTechStack": ["React", "Node.js", "PostgreSQL"],
  "secondaryTechStack": ["Docker", "AWS"],
  "domainKnowledge": ["Fintech", "REST APIs", "System Design"],
  "mustHaveSkills": ["JavaScript", "React"],
  "niceToHaveSkills": ["TypeScript", "GraphQL"],
  "softSkillsRequired": ["Communication", "Problem Solving"],
  "interviewTopics": [
    {"topic": "Data Structures & Algorithms", "weight": "High", "subtopics": ["Arrays", "Trees", "DP"]},
    {"topic": "System Design", "weight": "Medium", "subtopics": ["Scalability", "Caching"]},
    {"topic": "React Advanced Concepts", "weight": "High", "subtopics": ["Hooks", "Performance"]}
  ],
  "estimatedDifficulty": "Medium",
  "preparationWeeks": 3,
  "salaryInsight": "Market rate for this role: 15-25 LPA",
  "roleDescription": "2-sentence clean role summary",
  "keyResponsibilities": ["Design scalable backend services", "Lead code reviews"],
  "growthPotential": "High - role offers path to tech lead in 2 years",
  "redFlags": ["Vague requirements around ML - might be stretch role"],
  "companyCultureHints": ["Fast-paced startup", "High ownership expected"]
}

Return ONLY valid JSON.
`;

  return chatCompletion([
    { role: 'system', content: 'You are an expert JD analyzer. Return only valid JSON.' },
    { role: 'user', content: prompt }
  ], { temperature: 0.3, max_tokens: 1800 });
};

module.exports = { ragAnalyzeResume, ragAnalyzeJD, chunkText, embedDocument, retrieveChunks };