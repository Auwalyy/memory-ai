const mongoose = require('mongoose');
const KnowledgeContribution = require('./models/knowledge-contribution.model');
const KnowledgeItem = require('./models/knowledge-item.model');
const KnowledgeReview = require('./models/knowledge-review.model');
const KnowledgeEmbedding = require('./models/knowledge-embedding.model');
const ProcessingJob = require('./models/processing-job.model');
const NAtlasService = require('../../core/natlas/natlas.service');
const { embedText } = require('../../core/embeddings/embedding.service');
const audioStorage = require('../../core/storage/audio.storage');
const { VERIFICATION_STATUS, PUBLISHED_STATUSES, ROLES } = require('../../config/constants');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');

const CONSENT_STATEMENT =
  'Your recording will be processed by N-ATLAS to create a searchable cultural knowledge record.';

const ANONYMOUS_NAME = 'Anonymous contributor';

// ── Helpers ──────────────────────────────────────────────────────────────────

const isModerator = (user) => [ROLES.ADMIN, ROLES.MODERATOR].includes(user?.role);
const isOwner = (doc, user) => Boolean(user) && String(doc.contributor?._id || doc.contributor) === String(user._id);
const isPublished = (item) => PUBLISHED_STATUSES.includes(item.verificationStatus) && !item.isWithdrawn;

const locationLabel = (loc = {}) => [loc.community, loc.town, loc.state].filter(Boolean).join(', ');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const embeddingText = (item) =>
  [
    item.title,
    item.summary,
    item.translation,
    (item.topics || []).join(', '),
    (item.keywords || []).join(', '),
    (item.places || []).join(', '),
    (item.culturalConcepts || []).map((c) => `${c.term}: ${c.meaning || ''}`).join('; '),
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 8000);

/** Store/refresh the semantic-search vector. Returns false when embeddings are unavailable. */
const upsertEmbedding = async (item) => {
  const vector = await embedText(embeddingText(item));
  if (!vector?.length) return false;
  await KnowledgeEmbedding.findOneAndUpdate(
    { knowledgeItem: item._id },
    { vector, model: process.env.EMBEDDING_MODEL || 'text-embedding-004', dimensions: vector.length },
    { upsert: true }
  );
  return true;
};

/** Public shape of an item: hides contributor identity when anonymous. */
const toPublicItem = (item, user) => {
  const obj = typeof item.toObject === 'function' ? item.toObject() : { ...item };
  const owner = isOwner(obj, user);
  const contributorName = obj.isAnonymous ? ANONYMOUS_NAME : obj.contributor?.name || 'Community member';
  if (obj.isAnonymous && !owner && !isModerator(user)) delete obj.contributor;
  else if (obj.contributor?._id) obj.contributor = { _id: obj.contributor._id, name: obj.contributor.name };
  return {
    ...obj,
    contributorName,
    hasAudio: Boolean(obj.audioUrl),
    isOwner: owner,
  };
};

// ── Pipeline ─────────────────────────────────────────────────────────────────

const stepOf = (job, name) => job.steps.find((s) => s.name === name);

/**
 * Run one pipeline step, recording timing, provider and errors on the job.
 * `fn` returns `{ meta?, skipped?, ... }`.
 */
const runStep = async (job, name, fn) => {
  const step = stepOf(job, name);
  step.status = 'running';
  step.startedAt = new Date();
  await job.save();
  try {
    const result = (await fn()) || {};
    step.status = result.skipped ? 'skipped' : 'completed';
    step.provider = result.meta?.provider;
    step.model = result.meta?.model;
    if (result.skipReason) step.error = result.skipReason;
    return result;
  } catch (err) {
    step.status = 'failed';
    step.error = String(err.message || err).slice(0, 500);
    throw err;
  } finally {
    step.finishedAt = new Date();
    step.durationMs = step.finishedAt - step.startedAt;
    await job.save();
  }
};

const runPipeline = async (jobId) => {
  const job = await ProcessingJob.findById(jobId);
  if (!job) return;
  const contribution = await KnowledgeContribution.findById(job.contribution).select('+audio.localPath');
  if (!contribution) return;

  job.status = 'running';
  job.startedAt = new Date();
  await job.save();

  try {
    const { language, knowledgeType } = contribution;

    // 1. N-ATLAS ASR
    const asr = await runStep(job, 'asr', async () => {
      if (!contribution.audio?.url) {
        return {
          transcript: contribution.submittedText,
          skipped: true,
          skipReason: 'Typed contribution — no audio to transcribe',
          meta: { provider: 'contributor-text', model: null, durationMs: 0 },
        };
      }
      const buffer = await audioStorage.readAudio(contribution.audio);
      const out = await NAtlasService.transcribeAudio({
        buffer,
        mimeType: audioStorage.baseMimeType(contribution.audio.mimeType),
        filename: `contribution-${contribution._id}`,
        language,
      });
      return out;
    });
    job.transcriptionSuccess = !asr.skipped;
    const transcript = asr.transcript;

    // 2. N-ATLAS translation
    const tr = await runStep(job, 'translation', async () => {
      const out = await NAtlasService.translateKnowledge(transcript, language);
      return { ...out, skipped: out.meta.skipped, skipReason: out.meta.skipped ? 'Source is already English' : undefined };
    });

    // 3. N-ATLAS structured extraction (non-fatal: transcript + translation are still preserved)
    let extraction = null;
    try {
      extraction = await runStep(job, 'extraction', () =>
        NAtlasService.generateStructuredKnowledge({ transcript, translation: tr.translation, language, knowledgeType })
      );
      job.extractionSuccess = true;
    } catch (err) {
      job.extractionSuccess = false;
      logger.warn('Structured extraction failed — saving transcript only', { jobId: String(job._id), err: err.message });
    }
    job.llmSuccess = Boolean(extraction) && (tr.skipped || stepOf(job, 'translation').status === 'completed');

    // 4. Save the knowledge item
    const { item } = await runStep(job, 'save', async () => {
      const k = extraction?.knowledge || {};
      const fields = {
        title: k.title || `Untitled ${knowledgeType.replace(/_/g, ' ')}`,
        knowledgeType: k.knowledgeType || knowledgeType,
        language,
        originalTranscript: transcript,
        translation: tr.translation,
        summary: k.summary || null,
        topics: k.topics || [],
        entities: k.entities || [],
        people: k.people || [],
        places: k.places || [],
        culturalConcepts: k.culturalConcepts || [],
        proverbs: k.proverbs || [],
        keywords: k.keywords || [],
        confidenceNotes: extraction
          ? k.confidenceNotes
          : ['Automatic structuring failed. The transcript and translation are preserved for human review.'],
        contribution: contribution._id,
        contributor: contribution.contributor,
        isAnonymous: contribution.isAnonymous,
        sourceType: contribution.audio?.url ? 'community_voice' : 'community_text',
        audioUrl: contribution.audio?.url,
        audioDurationSec: contribution.audio?.durationSec,
        location: { ...(contribution.location?.toObject?.() || contribution.location || {}), label: locationLabel(contribution.location) },
        recordedAt: contribution.recordedAt,
        verificationStatus: VERIFICATION_STATUS.AI_PROCESSED,
        natlas: {
          asr: asr.meta,
          translation: tr.meta,
          extraction: extraction?.meta,
          processedAt: new Date(),
          totalDurationMs: Date.now() - job.startedAt,
          processingJob: job._id,
          grounding: extraction?.grounding || { checked: false, removed: [] },
        },
      };

      let saved;
      if (contribution.knowledgeItem) {
        saved = await KnowledgeItem.findByIdAndUpdate(contribution.knowledgeItem, fields, { new: true, runValidators: true });
      }
      if (!saved) saved = await KnowledgeItem.create(fields);
      return { item: saved, meta: { provider: 'mongodb' } };
    });
    job.knowledgeItem = item._id;

    // 5. Embedding for semantic search (non-fatal)
    try {
      await runStep(job, 'embedding', async () => {
        const ok = await upsertEmbedding(item);
        return ok
          ? { meta: { provider: 'embedding', model: process.env.EMBEDDING_MODEL || 'text-embedding-004' } }
          : { skipped: true, skipReason: 'Embedding model unavailable — keyword search will be used' };
      });
    } catch (err) {
      logger.warn('Embedding failed', { err: err.message });
    }

    job.status = 'completed';
    contribution.status = 'AI_PROCESSED';
    contribution.knowledgeItem = item._id;
  } catch (err) {
    job.status = 'failed';
    job.error = String(err.message || err).slice(0, 500);
    job.transcriptionSuccess ??= false;
    job.llmSuccess ??= false;
    job.extractionSuccess ??= false;
    contribution.status = 'FAILED';
    logger.error('N-ATLAS pipeline failed', { jobId: String(job._id), err: err.message });
  } finally {
    job.finishedAt = new Date();
    job.totalDurationMs = job.finishedAt - job.startedAt;
    await job.save();
    await contribution.save();
  }
};

// ── Service ──────────────────────────────────────────────────────────────────

const knowledgeService = {
  CONSENT_STATEMENT,

  /**
   * Store a new contribution (audio and/or typed text) with consent.
   */
  async createContribution({ user, file, body, publicBaseUrl }) {
    const text = body.text?.trim();
    if (!file && !text) throw new AppError('Provide an audio recording (or typed text if recording is not possible)', 400);

    let audio;
    if (file) {
      const saved = await audioStorage.saveAudio(file.buffer, file.mimetype, publicBaseUrl);
      const duration = parseFloat(body.durationSec);
      audio = {
        ...saved,
        mimeType: file.mimetype,
        durationSec: Number.isFinite(duration) && duration > 0 ? Math.round(duration * 10) / 10 : undefined,
      };
    }

    const contribution = await KnowledgeContribution.create({
      contributor: user._id,
      isAnonymous: body.isAnonymous === true || body.isAnonymous === 'true',
      language: body.language,
      knowledgeType: body.knowledgeType,
      location: { community: body.community, town: body.town, state: body.state },
      recordedAt: body.recordedAt ? new Date(body.recordedAt) : new Date(),
      sessionId: body.sessionId,
      consent: { given: true, statement: CONSENT_STATEMENT, givenAt: new Date() },
      audio,
      submittedText: file ? undefined : text,
    });

    const obj = contribution.toObject();
    delete obj.audio?.localPath;
    return obj;
  },

  /** Queue the N-ATLAS pipeline for a contribution and return the job. */
  async startProcessing(contributionId, user) {
    if (!mongoose.isValidObjectId(contributionId)) throw new AppError('Invalid contribution id', 400);
    const contribution = await KnowledgeContribution.findById(contributionId);
    if (!contribution) throw new AppError('Contribution not found', 404);
    if (!isOwner(contribution, user) && !isModerator(user)) throw new AppError('Not allowed to process this contribution', 403);
    if (contribution.status === 'PROCESSING') throw new AppError('This contribution is already being processed', 409);
    if (contribution.status === 'WITHDRAWN') throw new AppError('This contribution was withdrawn', 409);

    const job = await ProcessingJob.create({
      contribution: contribution._id,
      owner: contribution.contributor,
      sessionId: contribution.sessionId,
      language: contribution.language,
      knowledgeType: contribution.knowledgeType,
    });
    contribution.status = 'PROCESSING';
    contribution.latestJob = job._id;
    await contribution.save();

    setImmediate(() =>
      runPipeline(job._id).catch((err) => logger.error('Pipeline crashed', { jobId: String(job._id), err: err.message }))
    );
    return job;
  },

  async getJob(jobId, user) {
    if (!mongoose.isValidObjectId(jobId)) throw new AppError('Invalid job id', 400);
    const job = await ProcessingJob.findById(jobId).lean();
    if (!job) throw new AppError('Processing job not found', 404);
    if (String(job.owner) !== String(user._id) && !isModerator(user)) throw new AppError('Not allowed', 403);

    let item = null;
    if (job.knowledgeItem) {
      const doc = await KnowledgeItem.findById(job.knowledgeItem).populate('contributor', 'name');
      if (doc) item = toPublicItem(doc, user);
    }
    return { job, item };
  },

  async list(query, user) {
    const { page, limit, skip } = parsePagination(query);
    const filter = {};

    if (query.mine === 'true') {
      if (!user) throw new AppError('Authentication required', 401);
      filter.contributor = user._id;
    } else if (query.status && isModerator(user)) {
      filter.verificationStatus = query.status;
      filter.isWithdrawn = false;
    } else {
      filter.verificationStatus = { $in: PUBLISHED_STATUSES };
      filter.isWithdrawn = false;
      if (query.status && PUBLISHED_STATUSES.includes(query.status)) filter.verificationStatus = query.status;
    }

    if (query.language) filter.language = query.language;
    if (query.knowledgeType) filter.knowledgeType = query.knowledgeType;
    if (query.location) filter['location.label'] = new RegExp(escapeRegex(query.location), 'i');
    if (query.topic) filter.topics = query.topic.toLowerCase();
    if (query.person) filter.people = new RegExp(`^${escapeRegex(query.person)}$`, 'i');
    if (query.place) filter.places = new RegExp(`^${escapeRegex(query.place)}$`, 'i');
    if (query.q) filter.$text = { $search: query.q };

    const [items, total] = await Promise.all([
      KnowledgeItem.find(filter)
        .select('-originalTranscript -translation -natlas.grounding -entities')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('contributor', 'name'),
      KnowledgeItem.countDocuments(filter),
    ]);

    return { data: items.map((i) => toPublicItem(i, user)), pagination: buildPaginationMeta(total, page, limit) };
  },

  async getById(id, user) {
    if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid knowledge id', 400);
    const item = await KnowledgeItem.findById(id).populate('contributor', 'name');
    if (!item) throw new AppError('Knowledge item not found', 404);

    const owner = isOwner(item, user);
    const moderator = isModerator(user);
    if (!isPublished(item) && !owner && !moderator) throw new AppError('Knowledge item not found', 404);

    const [contribution, reviews, job] = await Promise.all([
      KnowledgeContribution.findById(item.contribution).select('consent recordedAt audio.mimeType audio.durationSec audio.storage sessionId createdAt').lean(),
      KnowledgeReview.find({ knowledgeItem: item._id }).sort({ reviewedAt: -1 }).populate('reviewer', 'name').lean(),
      item.natlas?.processingJob ? ProcessingJob.findById(item.natlas.processingJob).select('steps status totalDurationMs').lean() : null,
    ]);

    return {
      item: toPublicItem(item, user),
      provenance: {
        source: item.sourceType === 'community_voice' ? 'Community voice contribution' : 'Community text contribution',
        consent: contribution?.consent ? { given: contribution.consent.given, statement: contribution.consent.statement, givenAt: contribution.consent.givenAt } : null,
        recordedAt: item.recordedAt,
        audio: contribution?.audio || null,
        pipeline: job,
      },
      reviews: reviews.map((r) => ({
        _id: r._id,
        reviewerName: r.reviewerRole === 'contributor' && item.isAnonymous ? ANONYMOUS_NAME : r.reviewer?.name,
        reviewerRole: r.reviewerRole,
        fidelityScore: r.fidelityScore,
        correctionText: r.correctionText,
        correctionRequired: r.correctionRequired,
        decision: r.decision,
        reviewedAt: r.reviewedAt,
      })),
      permissions: {
        canEdit: owner,
        canReview: owner || moderator,
        canVerify: moderator,
        canDelete: owner || user?.role === ROLES.ADMIN,
      },
    };
  },

  /** Contributor (or moderator) rates how faithfully N-ATLAS captured the contribution. */
  async review(id, user, { fidelityScore, correctionText, userFeedback }) {
    const item = await KnowledgeItem.findById(id);
    if (!item) throw new AppError('Knowledge item not found', 404);
    const owner = isOwner(item, user);
    if (!owner && !isModerator(user)) throw new AppError('Only the contributor or a moderator can review this item', 403);
    if (item.isWithdrawn) throw new AppError('This contribution was withdrawn', 409);

    const review = await KnowledgeReview.create({
      knowledgeItem: item._id,
      reviewer: user._id,
      reviewerRole: owner ? 'contributor' : 'moderator',
      fidelityScore,
      correctionText: correctionText?.trim() || undefined,
      correctionRequired: fidelityScore <= 3 || Boolean(correctionText?.trim()),
      userFeedback: userFeedback?.trim() || undefined,
      decision: 'reviewed',
    });

    await knowledgeService._refreshFidelity(item);
    if (item.verificationStatus === VERIFICATION_STATUS.AI_PROCESSED || item.verificationStatus === VERIFICATION_STATUS.PENDING) {
      item.verificationStatus = VERIFICATION_STATUS.HUMAN_REVIEWED;
    }
    await item.save();
    return { review, item };
  },

  /** Moderator verifies (publishes as VERIFIED) or rejects an item. */
  async verify(id, user, { decision, fidelityScore, correctionText }) {
    if (!isModerator(user)) throw new AppError('Only moderators can verify knowledge', 403);
    const item = await KnowledgeItem.findById(id);
    if (!item) throw new AppError('Knowledge item not found', 404);

    const review = await KnowledgeReview.create({
      knowledgeItem: item._id,
      reviewer: user._id,
      reviewerRole: 'moderator',
      fidelityScore,
      correctionText: correctionText?.trim() || undefined,
      correctionRequired: decision === 'reject' || fidelityScore <= 3,
      decision: decision === 'verify' ? 'verified' : 'rejected',
    });

    await knowledgeService._refreshFidelity(item);
    if (decision === 'verify') {
      item.verificationStatus = VERIFICATION_STATUS.VERIFIED;
      item.verifiedBy = user._id;
      item.verifiedAt = new Date();
    } else {
      // Back to the contributor's queue; removed from the public library
      item.verificationStatus = VERIFICATION_STATUS.AI_PROCESSED;
      item.verifiedBy = undefined;
      item.verifiedAt = undefined;
    }
    await item.save();
    return { review, item };
  },

  async _refreshFidelity(item) {
    const [agg] = await KnowledgeReview.aggregate([
      { $match: { knowledgeItem: item._id } },
      { $group: { _id: null, avg: { $avg: '$fidelityScore' }, count: { $sum: 1 } } },
    ]);
    item.fidelityScore = agg ? Math.round(agg.avg * 100) / 100 : undefined;
    item.reviewCount = agg?.count || 0;
  },

  /** Contributor edits their own item (corrections). */
  async update(id, user, updates) {
    const item = await KnowledgeItem.findById(id);
    if (!item) throw new AppError('Knowledge item not found', 404);
    if (!isOwner(item, user)) throw new AppError('Only the contributor can edit this item', 403);

    const editable = ['title', 'originalTranscript', 'translation', 'summary', 'knowledgeType', 'isAnonymous'];
    let contentChanged = false;
    for (const key of editable) {
      if (updates[key] !== undefined && updates[key] !== item[key]) {
        item[key] = updates[key];
        if (key !== 'isAnonymous') contentChanged = true;
      }
    }
    if (updates.location) {
      const provided = Object.fromEntries(Object.entries(updates.location).filter(([, v]) => v !== undefined));
      const loc = { ...item.location?.toObject?.(), ...provided };
      delete loc.label;
      item.location = { ...loc, label: locationLabel(loc) };
    }
    item.editedByContributorAt = new Date();
    // A verified record that changes must be verified again
    if (contentChanged && item.verificationStatus === VERIFICATION_STATUS.VERIFIED) {
      item.verificationStatus = VERIFICATION_STATUS.HUMAN_REVIEWED;
      item.verifiedBy = undefined;
      item.verifiedAt = undefined;
    }
    await item.save();
    await KnowledgeContribution.updateOne({ _id: item.contribution }, { isAnonymous: item.isAnonymous });

    if (contentChanged) setImmediate(() => upsertEmbedding(item).catch(() => {}));
    return item;
  },

  /** Hide from the library without deleting (contributor can still see it). */
  async withdraw(id, user) {
    const item = await KnowledgeItem.findById(id);
    if (!item) throw new AppError('Knowledge item not found', 404);
    if (!isOwner(item, user)) throw new AppError('Only the contributor can withdraw this item', 403);
    item.isWithdrawn = true;
    await item.save();
    await KnowledgeContribution.updateOne({ _id: item.contribution }, { status: 'WITHDRAWN' });
    return item;
  },

  /** Permanently delete an item, its contribution, recording, reviews and vectors. */
  async remove(id, user) {
    const item = await KnowledgeItem.findById(id);
    if (!item) throw new AppError('Knowledge item not found', 404);
    if (!isOwner(item, user) && user.role !== ROLES.ADMIN) throw new AppError('Not allowed to delete this item', 403);

    const contribution = await KnowledgeContribution.findById(item.contribution).select('+audio.localPath');
    await Promise.all([
      KnowledgeReview.deleteMany({ knowledgeItem: item._id }),
      KnowledgeEmbedding.deleteOne({ knowledgeItem: item._id }),
      // Keep anonymised processing metrics for evaluation, but unlink them
      ProcessingJob.updateMany({ contribution: item.contribution }, { $unset: { knowledgeItem: 1 } }),
      item.deleteOne(),
    ]);
    if (contribution) {
      await audioStorage.deleteAudio(contribution.audio);
      await contribution.deleteOne();
    }
  },
};

module.exports = knowledgeService;
module.exports._internal = { runPipeline, toPublicItem, locationLabel, escapeRegex, isModerator };
