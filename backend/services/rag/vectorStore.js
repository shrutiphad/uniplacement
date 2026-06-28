const ResumeVector = require('../../models/ResumeVector.js');
const { embedText } = require('../../utils/localEmbedder');


//  Cosine Similarity 
const cosineSimilarity = (a, b) => {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
};

//  Store resume embedding in DB 
const storeResumeEmbedding = async (userId, resumeText, metadata = {}, precomputedVector = null) => {
  try {
    const vector = precomputedVector || await embedText(resumeText);
    await ResumeVector.findOneAndUpdate(
      { userId },
      { userId, vector, resumeText: resumeText.slice(0, 5000), metadata, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    return vector;
  } catch (err) {
    console.error('[VectorStore] embed error:', err.message);
    return null;
  }
};

//  Store JD embedding 
const storeJDEmbedding = async (roleId, jdText, metadata = {}) => {
  try {
    const vector = await embedText(jdText);
    await ResumeVector.findOneAndUpdate(
      { roleId },
      { roleId, vector, resumeText: jdText.slice(0, 5000), metadata, type: 'jd', updatedAt: new Date() },
      { upsert: true, new: true }
    );
    return vector;
  } catch (err) {
    console.error('[VectorStore] JD embed error:', err.message);
    return null;
  }
};


const getSemanticFitScore = async (resumeText, jdText, precomputedResumeVector = null, precomputedJdVector = null) => {
  try {
    const [resumeVec, jdVec] = await Promise.all([
      precomputedResumeVector ? Promise.resolve(precomputedResumeVector) : embedText(resumeText),
      precomputedJdVector ? Promise.resolve(precomputedJdVector) : embedText(jdText),
    ]);
    const similarity = cosineSimilarity(resumeVec, jdVec);
    // Scale: cosine sim [0,1] → [0,100], typical range 0.5-0.9
    const scaled = Math.round(Math.max(0, (similarity - 0.4) / 0.5) * 100);
    return Math.min(100, scaled);
  } catch (err) {
    console.error('[VectorStore] semantic fit error:', err.message);
    return null;
  }
}


const findSimilarResumes = async (jdText, topK = 10) => {
  try {
    const jdVec = await embedText(jdText);
    const allResumes = await ResumeVector.find({ type: { $ne: 'jd' } }).populate('userId', 'name email department cgpa');
    const scored = allResumes.map((r) => ({
      ...r.toObject(),
      similarity: cosineSimilarity(jdVec, r.vector),
    }));
    return scored
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  } catch (err) {
    console.error('[VectorStore] findSimilar error:', err.message);
    return [];
  }
};

module.exports = {
  embedText,
  cosineSimilarity,
  storeResumeEmbedding,
  storeJDEmbedding,
  getSemanticFitScore,
  findSimilarResumes,
};