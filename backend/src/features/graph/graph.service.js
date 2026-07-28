const crypto = require('crypto');
const KnowledgeNode = require('./graph.node.model');
const KnowledgeEdge = require('./graph.edge.model');
const gemmaService = require('../../core/ai/gemma.service');
const { embedText } = require('../../core/embeddings/embedding.service');
const logger = require('../../utils/logger');

const fingerprint = (...parts) =>
  crypto.createHash('sha1').update(parts.join('|').toLowerCase()).digest('hex');

const graphService = {
  /**
   * Upsert a node — returns existing node if fingerprint matches.
   */
  async upsertNode({ label, nodeType, language, description, sourceRef, sourceModel, tags }) {
    const fp = fingerprint(nodeType, label);
    const existing = await KnowledgeNode.findOne({ fingerprint: fp });
    if (existing) {
      // Strengthen weight on re-encounter
      await KnowledgeNode.updateOne({ _id: existing._id }, { $inc: { weight: 1 } });
      return existing;
    }

    let embedding = [];
    try {
      embedding = await embedText(`${label} ${description || ''}`);
    } catch (_) {}

    return KnowledgeNode.create({
      label,
      nodeType,
      language: language || 'unknown',
      description,
      sourceRef,
      sourceModel,
      tags,
      embedding,
      fingerprint: fp,
    });
  },

  /**
   * Upsert a directed edge — no-op if already exists.
   */
  async upsertEdge({ from, to, relationship, strength = 0.7, description }) {
    const fp = fingerprint(from.toString(), to.toString(), relationship);
    return KnowledgeEdge.findOneAndUpdate(
      { fingerprint: fp },
      { $setOnInsert: { from, to, relationship, strength, description, fingerprint: fp } },
      { upsert: true, returnDocument: 'after' }
    );
  },

  /**
   * Build graph nodes + edges from ingestion result, then run Gemma
   * cross-knowledge relationship discovery against existing nodes.
   */
  async buildFromIngestion(ingestionResult, uploadId) {
    const { entities, aiUnderstanding, metadata, detectedLanguage } = ingestionResult;
    const lang = detectedLanguage || 'unknown';

    // 1. Root node for the upload itself
    const rootNode = await this.upsertNode({
      label: metadata?.title || 'Untitled Knowledge',
      nodeType: 'upload',
      language: lang,
      description: ingestionResult.summaries?.short,
      sourceRef: uploadId,
      sourceModel: 'Upload',
      tags: metadata?.tags || [],
    });

    const entityNodeMap = {};

    // 2. Entity nodes
    const entityTypeMap = {
      people: 'person',
      communities: 'community',
      places: 'location',
      animals: 'animal',
      foods: 'food',
      festivals: 'festival',
      historicalEvents: 'historical_event',
      medicinalPlants: 'plant',
      traditions: 'tradition',
      artifacts: 'artifact',
      languages: 'language',
      organizations: 'community',
    };

    for (const [entityKey, nodeType] of Object.entries(entityTypeMap)) {
      const items = entities?.[entityKey] || [];
      for (const item of items.slice(0, 5)) {
        const label = typeof item === 'string' ? item : item.name || item;
        if (!label) continue;
        const node = await this.upsertNode({ label, nodeType, language: lang });
        entityNodeMap[label] = node;
        await this.upsertEdge({
          from: rootNode._id,
          to: node._id,
          relationship: 'MENTIONS',
          strength: 0.8,
        });
      }
    }

    // 3. Theme + moral nodes
    for (const theme of (aiUnderstanding?.subThemes || []).slice(0, 4)) {
      const node = await this.upsertNode({ label: theme, nodeType: 'theme', language: lang });
      await this.upsertEdge({ from: rootNode._id, to: node._id, relationship: 'SAME_THEME', strength: 0.9 });
    }
    if (aiUnderstanding?.moralLessons?.length) {
      const moral = aiUnderstanding.moralLessons[0];
      const node = await this.upsertNode({ label: moral, nodeType: 'moral_lesson', language: lang });
      await this.upsertEdge({ from: rootNode._id, to: node._id, relationship: 'SAME_MORAL', strength: 0.9 });
    }

    // 4. Cross-knowledge Gemma discovery (non-blocking, best-effort)
    setImmediate(() =>
      this._discoverCrossKnowledgeEdges(rootNode, ingestionResult).catch((e) =>
        logger.warn('Cross-knowledge discovery failed', { err: e.message })
      )
    );

    return rootNode;
  },

  async _discoverCrossKnowledgeEdges(rootNode, ingestionResult) {
    // Find candidate nodes to compare against (recent 50, excluding self)
    const candidates = await KnowledgeNode.find({
      _id: { $ne: rootNode._id },
      nodeType: { $in: ['upload', 'story', 'folktale', 'proverb'] },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    if (!candidates.length) return;

    const relationships = await gemmaService.discoverRelationships(
      ingestionResult,
      candidates.map((c) => ({ id: c._id, label: c.label, nodeType: c.nodeType, description: c.description }))
    );

    for (const rel of relationships || []) {
      const target = candidates.find((c) => c._id.toString() === rel.targetId);
      if (!target) continue;
      await this.upsertEdge({
        from: rootNode._id,
        to: target._id,
        relationship: rel.relationship,
        strength: rel.strength || 0.6,
        description: rel.reason,
      });
    }
  },

  async getGraph({ nodeType, language, search, limit = 200 }) {
    const filter = {};
    if (nodeType) filter.nodeType = nodeType;
    if (language) filter.language = language;
    if (search) filter.$text = { $search: search };

    const nodes = await KnowledgeNode.find(filter)
      .sort({ weight: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    const nodeIds = nodes.map((n) => n._id);
    const edges = await KnowledgeEdge.find({
      from: { $in: nodeIds },
      to: { $in: nodeIds },
    }).lean();

    return { nodes, edges };
  },

  async getNodeWithNeighbours(nodeId) {
    const node = await KnowledgeNode.findById(nodeId).lean();
    if (!node) return null;

    const edges = await KnowledgeEdge.find({
      $or: [{ from: nodeId }, { to: nodeId }],
    }).lean();

    const neighbourIds = [
      ...new Set(edges.flatMap((e) => [e.from.toString(), e.to.toString()])),
    ].filter((id) => id !== nodeId.toString());

    const neighbours = await KnowledgeNode.find({ _id: { $in: neighbourIds } }).lean();
    return { node, edges, neighbours };
  },

  async getStats() {
    const [nodeCount, edgeCount, byType] = await Promise.all([
      KnowledgeNode.countDocuments(),
      KnowledgeEdge.countDocuments(),
      KnowledgeNode.aggregate([{ $group: { _id: '$nodeType', count: { $sum: 1 } } }]),
    ]);
    return { nodeCount, edgeCount, byType };
  },
};

module.exports = graphService;
