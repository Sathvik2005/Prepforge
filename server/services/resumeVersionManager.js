/**
 * Resume Version Manager Service
 * Handles resume version tracking, comparison, and rollback
 * 
 * SDP Justification:
 * - Maintains complete audit trail of resume changes
 * - Enables A/B testing of resume versions
 * - Supports iterative improvement tracking
 */

import ParsedResume from '../models/ParsedResume.js';

/**
 * Create new resume version
 * @param {ObjectId} userId - User ID
 * @param {object} resumeData - New resume data
 * @param {ObjectId} parentResumeId - Optional parent resume ID
 * @returns {object} Created resume version
 */
export async function createResumeVersion(userId, resumeData, parentResumeId = null) {
  // Mark all existing resumes as not latest
  await ParsedResume.updateMany(
    { userId, isLatest: true },
    { $set: { isLatest: false } }
  );
  
  // Get next version number
  let versionNumber = 1;
  if (parentResumeId) {
    const parentResume = await ParsedResume.findById(parentResumeId);
    if (parentResume) {
      versionNumber = parentResume.versionNumber + 1;
    }
  } else {
    // Find highest version for this user
    const latestResume = await ParsedResume.findOne({ userId })
      .sort({ versionNumber: -1 })
      .limit(1);
    
    if (latestResume) {
      versionNumber = latestResume.versionNumber + 1;
    }
  }
  
  // Create new version
  const newResume = new ParsedResume({
    ...resumeData,
    userId,
    versionNumber,
    parentResumeId,
    isLatest: true,
  });
  
  await newResume.save();
  
  return newResume;
}

/**
 * Get all resume versions for a user
 * @param {ObjectId} userId - User ID
 * @returns {Array} All resume versions
 */
export async function getResumeVersions(userId) {
  return await ParsedResume.find({ userId })
    .sort({ versionNumber: -1 })
    .select('versionNumber createdAt atsScore.totalScore detectedFormat.type isLatest');
}

/**
 * Compare two resume versions
 * @param {ObjectId} versionId1 - First version ID
 * @param {ObjectId} versionId2 - Second version ID
 * @returns {object} Comparison result
 */
export async function compareResumeVersions(versionId1, versionId2) {
  const [version1, version2] = await Promise.all([
    ParsedResume.findById(versionId1),
    ParsedResume.findById(versionId2),
  ]);
  
  if (!version1 || !version2) {
    throw new Error('One or both resume versions not found');
  }
  
  const comparison = {
    versionInfo: {
      v1: { version: version1.versionNumber, date: version1.createdAt },
      v2: { version: version2.versionNumber, date: version2.createdAt },
    },
    atsScoreChange: {
      v1: version1.atsScore.totalScore,
      v2: version2.atsScore.totalScore,
      delta: version2.atsScore.totalScore - version1.atsScore.totalScore,
      percentageChange: ((version2.atsScore.totalScore - version1.atsScore.totalScore) / version1.atsScore.totalScore * 100).toFixed(2),
    },
    skillsChange: compareSkills(version1.parsedData.skills, version2.parsedData.skills),
    experienceChange: compareExperience(version1.parsedData.experience, version2.parsedData.experience),
    educationChange: compareEducation(version1.parsedData.education, version2.parsedData.education),
    formatChange: {
      v1: version1.detectedFormat.type,
      v2: version2.detectedFormat.type,
      changed: version1.detectedFormat.type !== version2.detectedFormat.type,
    },
    extractionQualityChange: {
      v1: version1.extractionQuality.overall,
      v2: version2.extractionQuality.overall,
      delta: version2.extractionQuality.overall - version1.extractionQuality.overall,
    },
  };
  
  return comparison;
}

/**
 * Rollback to a previous resume version
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} versionId - Version to rollback to
 * @returns {object} New resume created from old version
 */
export async function rollbackToVersion(userId, versionId) {
  const targetVersion = await ParsedResume.findOne({ _id: versionId, userId });
  
  if (!targetVersion) {
    throw new Error('Resume version not found or unauthorized');
  }
  
  // Create new version based on old data
  const rollbackData = targetVersion.toObject();
  delete rollbackData._id;
  delete rollbackData.createdAt;
  delete rollbackData.updatedAt;
  
  const newVersion = await createResumeVersion(userId, rollbackData, versionId);
  
  return newVersion;
}

/**
 * Get version chain (parent → child relationships)
 * @param {ObjectId} userId - User ID
 * @returns {Array} Version chain with relationships
 */
export async function getVersionChain(userId) {
  const allVersions = await ParsedResume.find({ userId })
    .sort({ versionNumber: 1 })
    .select('_id versionNumber parentResumeId createdAt atsScore.totalScore isLatest');
  
  // Build tree structure
  const versionMap = new Map();
  const rootVersions = [];
  
  allVersions.forEach(version => {
    versionMap.set(version._id.toString(), {
      ...version.toObject(),
      children: [],
    });
  });
  
  allVersions.forEach(version => {
    if (version.parentResumeId) {
      const parent = versionMap.get(version.parentResumeId.toString());
      if (parent) {
        parent.children.push(versionMap.get(version._id.toString()));
      }
    } else {
      rootVersions.push(versionMap.get(version._id.toString()));
    }
  });
  
  return rootVersions;
}

/**
 * Get version analytics
 * @param {ObjectId} userId - User ID
 * @returns {object} Analytics data
 */
export async function getVersionAnalytics(userId) {
  const versions = await ParsedResume.find({ userId }).sort({ versionNumber: 1 });
  
  if (versions.length === 0) {
    return { totalVersions: 0 };
  }
  
  const atsScores = versions.map(v => v.atsScore.totalScore);
  const avgImprovement = atsScores.length > 1
    ? (atsScores[atsScores.length - 1] - atsScores[0]) / (atsScores.length - 1)
    : 0;
  
  return {
    totalVersions: versions.length,
    atsScoreProgression: atsScores,
    averageImprovement: avgImprovement.toFixed(2),
    bestVersion: {
      versionNumber: versions.reduce((best, v) => v.atsScore.totalScore > best.atsScore.totalScore ? v : best).versionNumber,
      score: Math.max(...atsScores),
    },
    latestVersion: {
      versionNumber: versions[versions.length - 1].versionNumber,
      score: atsScores[atsScores.length - 1],
    },
    improvementRate: atsScores.length > 1
      ? ((atsScores[atsScores.length - 1] / atsScores[0] - 1) * 100).toFixed(2)
      : 0,
  };
}

// Helper comparison functions
function compareSkills(skills1, skills2) {
  const getAllSkillNames = (skills) => {
    return [
      ...skills.programming.map(s => typeof s === 'string' ? s : s.name),
      ...skills.frameworks.map(s => typeof s === 'string' ? s : s.name),
      ...skills.databases,
      ...skills.tools,
      ...skills.cloud,
      ...skills.other,
    ];
  };
  
  const skillSet1 = new Set(getAllSkillNames(skills1));
  const skillSet2 = new Set(getAllSkillNames(skills2));
  
  const added = [...skillSet2].filter(s => !skillSet1.has(s));
  const removed = [...skillSet1].filter(s => !skillSet2.has(s));
  const unchanged = [...skillSet1].filter(s => skillSet2.has(s));
  
  return {
    added,
    removed,
    unchanged: unchanged.length,
    totalChange: added.length + removed.length,
    netChange: added.length - removed.length,
  };
}

function compareExperience(exp1, exp2) {
  return {
    v1Count: exp1.length,
    v2Count: exp2.length,
    delta: exp2.length - exp1.length,
    change: exp2.length !== exp1.length ? 'modified' : 'unchanged',
  };
}

function compareEducation(edu1, edu2) {
  return {
    v1Count: edu1.length,
    v2Count: edu2.length,
    delta: edu2.length - edu1.length,
    change: edu2.length !== edu1.length ? 'modified' : 'unchanged',
  };
}

export default {
  createResumeVersion,
  getResumeVersions,
  compareResumeVersions,
  rollbackToVersion,
  getVersionChain,
  getVersionAnalytics,
};
