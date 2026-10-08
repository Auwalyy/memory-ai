const KnowledgeContribution = require('../knowledge/models/knowledge-contribution.model');
const KnowledgeItem = require('../knowledge/models/knowledge-item.model');
const KnowledgeReview = require('../knowledge/models/knowledge-review.model');
const ProcessingJob = require('../knowledge/models/processing-job.model');
const { VERIFICATION_STATUS } = require('../../config/constants');

const round = (n, d = 2) => (n == null ? null : Math.round(n * 10 ** d) / 10 ** d);

const toCounts = (rows) => rows.map((r) => ({ name: r._id ?? 'unknown', count: r.count }));

const EXPORT_COLUMNS = [
  'sessionId', 'jobId', 'contributionId', 'knowledgeItemId', 'language', 'knowledgeType',
  'processingSuccess', 'transcriptionSuccess', 'extractionSuccess', 'completionTimeMs',
  'asrMs', 'translationMs', 'extractionMs', 'asrModel', 'llmModel', 'llmProvider',
  'fidelityScore', 'correctionRequired', 'userFeedback', 'verificationStatus', 'createdAt',
];

const csvCell = (v) => {
  if (v === null || v === undefined) return '';
  const s = v instanceof Date ? v.toISOString() : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const analyticsService = {
  async overview() {
    const [
      totalContributions, audioAgg, languages, knowledgeTypes, statusCounts,
      fidelityAgg, fidelityDist, stepAgg, jobAgg, recentJobs, providers,
    ] = await Promise.all([
      KnowledgeContribution.countDocuments(),
      KnowledgeContribution.aggregate([
        { $group: { _id: null, seconds: { $sum: { $ifNull: ['$audio.durationSec', 0] } }, withAudio: { $sum: { $cond: [{ $ifNull: ['$audio.url', false] }, 1, 0] } } } },
      ]),
      KnowledgeContribution.aggregate([{ $group: { _id: '$language', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      KnowledgeItem.aggregate([{ $group: { _id: '$knowledgeType', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      KnowledgeItem.aggregate([{ $match: { isWithdrawn: false } }, { $group: { _id: '$verificationStatus', count: { $sum: 1 } } }]),
      KnowledgeReview.aggregate([
        {
          $group: {
            _id: null,
            avg: { $avg: '$fidelityScore' },
            count: { $sum: 1 },
            corrections: { $sum: { $cond: ['$correctionRequired', 1, 0] } },
          },
        },
      ]),
      KnowledgeReview.aggregate([{ $group: { _id: '$fidelityScore', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      ProcessingJob.aggregate([
        { $unwind: '$steps' },
        { $group: { _id: { name: '$steps.name', status: '$steps.status' }, count: { $sum: 1 }, avgMs: { $avg: '$steps.durationMs' } } },
      ]),
      ProcessingJob.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
            llmSuccess: { $sum: { $cond: ['$llmSuccess', 1, 0] } },
            extractionSuccess: { $sum: { $cond: ['$extractionSuccess', 1, 0] } },
            extractionFailed: { $sum: { $cond: [{ $eq: ['$extractionSuccess', false] }, 1, 0] } },
            avgMs: { $avg: { $cond: [{ $eq: ['$status', 'completed'] }, '$totalDurationMs', null] } },
          },
        },
      ]),
      ProcessingJob.find().sort({ createdAt: -1 }).limit(10).select('language knowledgeType status totalDurationMs steps.name steps.status steps.durationMs steps.provider createdAt error').lean(),
      ProcessingJob.aggregate([
        { $unwind: '$steps' },
        { $match: { 'steps.status': 'completed', 'steps.provider': { $exists: true } } },
        { $group: { _id: { step: '$steps.name', provider: '$steps.provider', model: '$steps.model' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const step = (name, status) => stepAgg.find((s) => s._id.name === name && s._id.status === status);
    const status = (s) => statusCounts.find((r) => r._id === s)?.count || 0;
    const jobs = jobAgg[0] || {};
    const fidelity = fidelityAgg[0];

    return {
      totals: {
        contributions: totalContributions,
        contributionsWithAudio: audioAgg[0]?.withAudio || 0,
        audioMinutes: round((audioAgg[0]?.seconds || 0) / 60, 1),
        knowledgeItems: statusCounts.reduce((s, r) => s + r.count, 0),
        verified: status(VERIFICATION_STATUS.VERIFIED),
        humanReviewed: status(VERIFICATION_STATUS.HUMAN_REVIEWED),
        pendingReviews: status(VERIFICATION_STATUS.AI_PROCESSED) + status(VERIFICATION_STATUS.PENDING),
      },
      languages: toCounts(languages),
      knowledgeTypes: toCounts(knowledgeTypes),
      verification: toCounts(statusCounts),
      fidelity: {
        average: round(fidelity?.avg),
        reviews: fidelity?.count || 0,
        correctionRate: fidelity?.count ? round(fidelity.corrections / fidelity.count, 3) : null,
        distribution: [1, 2, 3, 4, 5].map((score) => ({ score, count: fidelityDist.find((d) => d._id === score)?.count || 0 })),
      },
      natlas: {
        jobs: { total: jobs.total || 0, completed: jobs.completed || 0, failed: jobs.failed || 0 },
        asr: {
          success: step('asr', 'completed')?.count || 0,
          failed: step('asr', 'failed')?.count || 0,
          skipped: step('asr', 'skipped')?.count || 0,
          avgMs: round(step('asr', 'completed')?.avgMs, 0),
        },
        translation: {
          success: step('translation', 'completed')?.count || 0,
          failed: step('translation', 'failed')?.count || 0,
          avgMs: round(step('translation', 'completed')?.avgMs, 0),
        },
        llm: { success: jobs.llmSuccess || 0 },
        extraction: {
          success: jobs.extractionSuccess || 0,
          failed: jobs.extractionFailed || 0,
          avgMs: round(step('extraction', 'completed')?.avgMs, 0),
        },
        avgProcessingMs: round(jobs.avgMs, 0),
        providers: providers.map((p) => ({ ...p._id, count: p.count })),
      },
      recentJobs,
    };
  },

  /** One row per processing session — the real-world validation dataset. */
  async exportRecords() {
    const jobs = await ProcessingJob.find().sort({ createdAt: 1 }).lean();
    const itemIds = jobs.map((j) => j.knowledgeItem).filter(Boolean);
    const [items, reviews] = await Promise.all([
      KnowledgeItem.find({ _id: { $in: itemIds } }).select('verificationStatus').lean(),
      KnowledgeReview.find({ knowledgeItem: { $in: itemIds } }).sort({ reviewedAt: 1 }).lean(),
    ]);
    const itemById = new Map(items.map((i) => [String(i._id), i]));
    const reviewsByItem = new Map();
    for (const r of reviews) {
      const k = String(r.knowledgeItem);
      reviewsByItem.set(k, [...(reviewsByItem.get(k) || []), r]);
    }

    return jobs.map((j) => {
      const s = Object.fromEntries((j.steps || []).map((st) => [st.name, st]));
      const itemReviews = reviewsByItem.get(String(j.knowledgeItem)) || [];
      // The contributor's own rating is the fidelity signal; fall back to the first review
      const review = itemReviews.find((r) => r.reviewerRole === 'contributor') || itemReviews[0];
      return {
        sessionId: j.sessionId || null,
        jobId: String(j._id),
        contributionId: String(j.contribution),
        knowledgeItemId: j.knowledgeItem ? String(j.knowledgeItem) : null,
        language: j.language,
        knowledgeType: j.knowledgeType,
        processingSuccess: j.status === 'completed',
        // null = typed contribution, ASR not applicable
        transcriptionSuccess: s.asr?.status === 'skipped' ? null : s.asr?.status === 'completed',
        extractionSuccess: Boolean(j.extractionSuccess),
        completionTimeMs: j.totalDurationMs ?? null,
        asrMs: s.asr?.status === 'completed' ? s.asr.durationMs : null,
        translationMs: s.translation?.status === 'completed' ? s.translation.durationMs : null,
        extractionMs: s.extraction?.status === 'completed' ? s.extraction.durationMs : null,
        asrModel: s.asr?.model || null,
        llmModel: s.extraction?.model || s.translation?.model || null,
        llmProvider: s.extraction?.provider || s.translation?.provider || null,
        fidelityScore: review?.fidelityScore ?? null,
        correctionRequired: review ? Boolean(review.correctionRequired) : null,
        userFeedback: review?.userFeedback || review?.correctionText || null,
        verificationStatus: itemById.get(String(j.knowledgeItem))?.verificationStatus || null,
        createdAt: j.createdAt,
      };
    });
  },

  toCSV(records) {
    const lines = [EXPORT_COLUMNS.join(',')];
    for (const r of records) lines.push(EXPORT_COLUMNS.map((c) => csvCell(r[c])).join(','));
    return lines.join('\n');
  },
};

module.exports = analyticsService;
