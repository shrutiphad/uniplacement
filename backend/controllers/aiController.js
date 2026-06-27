const rateLimit = require('express-rate-limit');
const pdfParse = require('pdf-parse');
const axios = require('axios');
const crypto = require('crypto');
const { withRetry } = require('../utils/openaiRetry');

const { ragAnalyzeResume } = require('../services/rag/ragPipeline');
const { storeResumeEmbedding, storeJDEmbedding, getSemanticFitScore, findSimilarResumes } = require('../services/rag/vectorStore');
const { deepParseWithAI, computeATSScore } = require('../services/parsers/resumeParser');
const { analyzeJobDescription, compareProfileToJD } = require('../services/parsers/jdAnalyzer');
const { generateAdvancedInterviewPrep } = require('../services/interviewPrepService');
const { mockInterviewChat } = require('../services/aiService');

const Company      = require('../models/Company');
const User         = require('../models/User');
const Application  = require('../models/Application');
const ResumeAnalysis = require('../models/ResumeAnalysis');
const JDAnalysis   = require('../models/JDAnalysis');

const { successResponse, errorResponse } = require('../utils/response');

// AI-specific rate limiter 
exports.aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: { success: false, message: 'AI request limit reached. Try again in an hour.' },
});

//  Helper: parse PDF from URL 
const parsePDFFromURL = async (url) => {
  const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
  const data = await pdfParse(Buffer.from(resp.data));
  if (!data.text || data.text.trim().length < 50) throw new Error('PDF appears empty or unreadable');
  return data.text;
};

//  POST /api/ai/analyze-resume 
exports.analyzeResume = async (req, res, next) => {
  try {
    const { companyId, roleId, applicationId, forceRefresh } = req.body;
    const student = await User.findById(req.user.id);
    if (!student.resumeURL) return errorResponse(res, 'No resume uploaded. Go to Profile → Upload Resume.', 400);

    // Cache check
    // if (!forceRefresh && companyId && roleId) {
    //   const cached = await ResumeAnalysis.findOne({ studentId: student._id, companyId, roleId }).sort({ analyzedAt: -1 });
    //   if (cached && (Date.now() - new Date(cached.analyzedAt).getTime() < 24 * 60 * 60 * 1000)) {
    //     return successResponse(res, { analysis: cached, jdAnalysis: null, cached: true }, 'Cached analysis returned');
    //   }
    // }

    if (cached && (Date.now() - new Date(cached.analyzedAt).getTime() < 24 * 60 * 60 * 1000)) {
  const cachedJD = companyId && roleId
    ? await JDAnalysis.findOne({ companyId, roleId })
    : null;
  return successResponse(res, { analysis: cached, jdAnalysis: cachedJD, cached: true });
}

    // Parse resume PDF
    // let resumeText;
    // try { resumeText = await parsePDFFromURL(student.resumeURL); }
    // catch (err) { return errorResponse(res, `PDF parse failed: ${err.message}`, 422); }

    // Add better error logging
    let resumeText;
try { 
  console.log('[AI] Parsing PDF from:', student.resumeURL);
  resumeText = await parsePDFFromURL(student.resumeURL);
  console.log('[AI] PDF parsed successfully, text length:', resumeText.length);
} catch (err) { 
  console.error('[AI] PDF parse error:', err);
  return errorResponse(res, `PDF parse failed: ${err.message}. Ensure PDF is text-based (not scanned).`, 422); 
}

    // Role context
    let requiredSkills = [];
    let jobDescription = 'General software engineering role.';
    let companyName = '';
    let jdAnalysis = null;

    if (companyId && roleId) {
      const company = await Company.findById(companyId);
      if (!company) return errorResponse(res, 'Company not found', 404);
      const role = company.roles.id(roleId);
      if (!role)    return errorResponse(res, 'Role not found', 404);

      requiredSkills = role.requiredSkills;
      jobDescription = role.jobDescription;
      companyName    = company.name;

      // JD analysis (cached)
      const jdHash = crypto.createHash('md5').update(jobDescription).digest('hex');
      const cachedJD = await JDAnalysis.findOne({ companyId, roleId });
      if (cachedJD && cachedJD.jdHash === jdHash) {
        jdAnalysis = cachedJD;
      } else {
        jdAnalysis = await analyzeJobDescription(jobDescription, companyName);
        await JDAnalysis.findOneAndUpdate(
          { companyId, roleId },
          { companyId, roleId, roleTitle: role.roleTitle, ...jdAnalysis, jdHash },
          { upsert: true, new: true }
        );
        await storeJDEmbedding(roleId, jobDescription, { companyId, roleTitle: role.roleTitle });
        jdAnalysis = await JDAnalysis.findOne({ companyId, roleId });
      }
    }

    // Sequential calls to avoid bursting OpenAI RPM limit.
    // Each is wrapped in withRetry so a 429 auto-retries with backoff.
    const parsedResume = await withRetry(() =>
      deepParseWithAI(resumeText)
    );
    const ragAnalysis = await withRetry(() =>
      ragAnalyzeResume(resumeText, jobDescription, requiredSkills)
    );
    // Fire-and-forget embedding store — don't block the response
    storeResumeEmbedding(student._id, resumeText, {
      parsedSkills: student.skills,
      department: student.department,
      cgpa: student.cgpa,
    }).catch((e) => console.warn('[Embedding store]', e.message));

    // Semantic score via vector similarity
    let semanticScore = ragAnalysis.semanticScore || 0;
    try {
      const semScore = await getSemanticFitScore(resumeText, jobDescription);
      if (semScore !== null) semanticScore = semScore;
    } catch (_) {}

    // ATS score
    const atsScore = computeATSScore(parsedResume, requiredSkills);

    // Profile vs JD comparison
    const profileComparison = jdAnalysis ? compareProfileToJD(student, jdAnalysis) : null;

    // Blended score
    const finalFitScore = Math.round(
      (ragAnalysis.fitScore || 0) * 0.4 +
      semanticScore * 0.35 +
      (atsScore.overall || 0) * 0.25
    );

    const readinessScore = Math.min(100, Math.round(
      finalFitScore * 0.5 +
      (parsedResume.resumeQualityScore || 50) * 0.3 +
      (student.cgpa ? Math.min(100, student.cgpa * 10) : 50) * 0.2
    ));

    // Persist analysis
    const analysis = await ResumeAnalysis.findOneAndUpdate(
      { studentId: student._id, companyId: companyId || null, roleId: roleId || null },
      {
        studentId: student._id,
        companyId: companyId || undefined,
        roleId:    roleId || undefined,
        parsedData: parsedResume,
        fitScore:    ragAnalysis.fitScore || 0,
        semanticScore,
        overallScore: finalFitScore,
        missingSkills: ragAnalysis.missingSkills || [],
        partialSkills: ragAnalysis.partialSkills || [],
        suggestions:   ragAnalysis.suggestions || [],
        strengths:     ragAnalysis.strengths || [],
        redFlags:      ragAnalysis.redFlags || [],
        summary:       ragAnalysis.summary || '',
        atsScore,
        resumeStructureScore:    ragAnalysis.resumeStructureScore,
        resumeStructureFeedback: ragAnalysis.resumeStructureFeedback,
        atsTips:      ragAnalysis.atsTips || [],
        interviewReadiness: ragAnalysis.interviewReadiness,
        confidenceLevel:    ragAnalysis.confidenceLevel,
        analyzedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    await User.findByIdAndUpdate(student._id, { readinessScore });

    if (applicationId) {
      await Application.findByIdAndUpdate(applicationId, {
        fitScore: finalFitScore,
        aiAnalysis: {
          extractedSkills: parsedResume.skills || [],
          missingSkills:   ragAnalysis.missingSkills || [],
          suggestions:     ragAnalysis.suggestions || [],
          summary:         ragAnalysis.summary || '',
        },
      });
    }

    return successResponse(res, { analysis, jdAnalysis, profileComparison, readinessScore, cached: false },
      'Resume analyzed with RAG + semantic embeddings');
  } catch (error) {
    if (error?.status === 429) return errorResponse(res, 'OpenAI rate limit. Please wait a moment.', 429);
    next(error);
  }
};

// POST /api/ai/analyze-jd 
exports.analyzeJD = async (req, res, next) => {
  try {
    const { companyId, roleId } = req.body;
    const company = await Company.findById(companyId);
    if (!company) return errorResponse(res, 'Company not found', 404);
    const role = company.roles.id(roleId);
    if (!role) return errorResponse(res, 'Role not found', 404);

    const jdHash = crypto.createHash('md5').update(role.jobDescription).digest('hex');
    const cached = await JDAnalysis.findOne({ companyId, roleId });
    if (cached && cached.jdHash === jdHash) {
      return successResponse(res, { jdAnalysis: cached, cached: true });
    }

    const jdAnalysis = await analyzeJobDescription(role.jobDescription, company.name);
    const saved = await JDAnalysis.findOneAndUpdate(
      { companyId, roleId },
      { companyId, roleId, roleTitle: role.roleTitle, ...jdAnalysis, jdHash },
      { upsert: true, new: true }
    );
    await storeJDEmbedding(roleId, role.jobDescription, { companyId, roleTitle: role.roleTitle });

    return successResponse(res, { jdAnalysis: saved, cached: false }, 'JD analyzed');
  } catch (error) { next(error); }
};

//  POST /api/ai/generate-interview-prep 
exports.generateInterviewPrep = async (req, res, next) => {
  try {
    const { companyId, roleId } = req.body;
    const company = await Company.findById(companyId);
    if (!company) return errorResponse(res, 'Company not found', 404);
    const role = company.roles.id(roleId);
    if (!role) return errorResponse(res, 'Role not found', 404);

    const student = await User.findById(req.user.id);

    const prep = await generateAdvancedInterviewPrep({
      roleTitle: role.roleTitle,
      jobDescription: role.jobDescription,
      requiredSkills: role.requiredSkills,
      studentSkills: student.skills,
      companyName: company.name,
      studentProfile: { cgpa: student.cgpa, department: student.department },
    });

    return successResponse(res, { prep, roleTitle: role.roleTitle, companyName: company.name }, 'Interview prep generated');
  } catch (error) {
    if (error?.status === 429) return errorResponse(res, 'OpenAI rate limit. Please wait.', 429);
    next(error);
  }
};

// POST /api/ai/mock-interview 
exports.mockInterviewChat = async (req, res, next) => {
  try {
    const { question, userAnswer, companyId, roleId } = req.body;
    if (!question || !userAnswer) return errorResponse(res, 'question and userAnswer required', 400);

    let roleContext = { roleTitle: 'Software Engineer', requiredSkills: [] };
    if (companyId && roleId) {
      const company = await Company.findById(companyId);
      const role = company?.roles?.id(roleId);
      if (role) roleContext = { roleTitle: role.roleTitle, requiredSkills: role.requiredSkills };
    }

    const result = await mockInterviewChat(question, userAnswer, roleContext);
    return successResponse(res, { result }, 'Feedback generated');
  } catch (error) { next(error); }
};

// POST /api/ai/find-similar-resumes (Admin) 
exports.findSimilarResumes = async (req, res, next) => {
  try {
    const { companyId, roleId, topK = 10 } = req.body;
    const company = await Company.findById(companyId);
    const role = company?.roles?.id(roleId);
    if (!role) return errorResponse(res, 'Role not found', 404);

    const similar = await findSimilarResumes(role.jobDescription, Number(topK));
    const enriched = await Promise.all(similar.map(async (s) => {
      const user = await User.findById(s.userId).select('name email department cgpa skills');
      return { ...s, user, similarityPercent: Math.round((s.similarity || 0) * 100) };
    }));

    return successResponse(res, { results: enriched.filter((r) => r.user) });
  } catch (error) { next(error); }
};

// GET /api/ai/my-analyses 
exports.getMyAnalyses = async (req, res, next) => {
  try {
    const analyses = await ResumeAnalysis.find({ studentId: req.user.id })
      .populate('companyId', 'name logo')
      .sort({ analyzedAt: -1 });
    return successResponse(res, { analyses });
  } catch (error) { next(error); }
};