const { chatCompletion } = require('../utils/groqClient');

const analyzeResume = async (resumeText, requiredSkills, jobDescription) => {
  const prompt = `
You are an expert AI resume analyzer for a campus placement platform.

RESUME TEXT:
"""
${resumeText}
"""

JOB DESCRIPTION:
"""
${jobDescription}
"""

REQUIRED SKILLS FOR THIS ROLE:
${requiredSkills.join(', ')}

Analyze the resume and return a STRICT JSON object (no markdown, no extra text) with this exact structure:
{
  "extractedSkills": ["skill1", "skill2"],
  "projects": [{"name": "Project Name", "tech": ["tech1"], "description": "brief"}],
  "education": [{"degree": "", "institution": "", "year": "", "cgpa": ""}],
  "experience": [{"company": "", "role": "", "duration": "", "highlights": []}],
  "fitScore": 75,
  "missingSkills": ["missing1", "missing2"],
  "suggestions": ["Specific suggestion 1", "Specific suggestion 2", "Specific suggestion 3"],
  "summary": "2-3 sentence compatibility summary",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"]
}

Rules:
- fitScore = (matching required skills / total required skills) * 100, rounded to integer
- Be specific in suggestions (mention actual missing skills and how to add them)
- Return ONLY the JSON object, nothing else
`;

  return await chatCompletion(
    [{ role: 'user', content: prompt }],
    { temperature: 0.3, max_tokens: 2000 }
  );
};

const generateInterviewPrep = async (roleTitle, jobDescription, requiredSkills, studentSkills = []) => {
  const missingSkills = requiredSkills.filter(
    (s) => !studentSkills.map((sk) => sk.toLowerCase()).includes(s.toLowerCase())
  );

  const prompt = `
You are an expert technical interview coach for campus placements.

ROLE: ${roleTitle}
JOB DESCRIPTION: ${jobDescription}
REQUIRED SKILLS: ${requiredSkills.join(', ')}
STUDENT CURRENT SKILLS: ${studentSkills.join(', ') || 'Not provided'}
SKILL GAPS: ${missingSkills.join(', ') || 'None'}

Generate a comprehensive interview preparation guide. Return STRICT JSON (no markdown):
{
  "techStack": ["tech1", "tech2"],
  "predictedTopics": ["topic1", "topic2", "topic3"],
  "difficulty": "Easy|Medium|Hard",
  "technicalQuestions": [
    {"question": "...", "topic": "...", "difficulty": "Easy|Medium|Hard", "hint": "..."}
  ],
  "hrQuestions": [
    {"question": "...", "tip": "..."}
  ],
  "aptitudeQuestions": [
    {"question": "...", "type": "Logical|Quantitative|Verbal", "answer": "..."}
  ],
  "preparationRoadmap": [
    {"week": 1, "focus": "...", "tasks": ["task1", "task2"], "resources": ["resource1"]},
    {"week": 2, "focus": "...", "tasks": ["task1", "task2"], "resources": ["resource1"]}
  ],
  "keyTips": ["tip1", "tip2", "tip3"],
  "estimatedPrepTime": "2 weeks"
}

Rules:
- Generate exactly 10 technical questions, 5 HR questions, 5 aptitude questions
- Roadmap must be exactly 2 weeks (14 days)
- Questions must be specific to the role and required skills
- Return ONLY the JSON object
`;

  return await chatCompletion(
    [{ role: 'user', content: prompt }],
    { temperature: 0.5, max_tokens: 2500 }
  );
};

const mockInterviewChat = async (question, userAnswer, roleContext) => {
  const prompt = `
You are a strict but fair technical interviewer for a ${roleContext.roleTitle} position.
Required skills: ${roleContext.requiredSkills?.join(', ') || 'general'}

INTERVIEW QUESTION: "${question}"
CANDIDATE ANSWER: "${userAnswer}"

Evaluate the answer and respond as JSON:
{
  "score": 7,
  "feedback": "Detailed feedback on the answer",
  "idealPoints": ["key point 1 they should have covered", "key point 2"],
  "nextQuestion": "Ask a follow-up question based on their answer",
  "encouragement": "Brief encouraging note"
}

Score out of 10. Return ONLY JSON.
`;

  return await chatCompletion(
    [{ role: 'user', content: prompt }],
    { temperature: 0.4, max_tokens: 600 }
  );
};

module.exports = { analyzeResume, generateInterviewPrep, mockInterviewChat };