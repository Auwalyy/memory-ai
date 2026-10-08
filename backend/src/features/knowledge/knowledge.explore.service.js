const KnowledgeItem = require('./models/knowledge-item.model');
const { PUBLISHED_STATUSES } = require('../../config/constants');

const UNKNOWN_LOCATION = 'Location not recorded';

const countInto = (map, key, extra) => {
  if (!key) return;
  const k = String(key).trim();
  if (!k) return;
  const entry = map.get(k.toLowerCase()) || { name: k, count: 0, items: [] };
  entry.count += 1;
  if (extra && entry.items.length < 8) entry.items.push(extra);
  map.set(k.toLowerCase(), entry);
};

const top = (map, n = 30) => [...map.values()].sort((a, b) => b.count - a.count).slice(0, n);

/**
 * Relationship view over published knowledge:
 * location → knowledge type → items, plus language/topic/people/proverb facets.
 */
const knowledgeExploreService = {
  async explore({ language } = {}) {
    const items = await KnowledgeItem.find({
      verificationStatus: { $in: PUBLISHED_STATUSES },
      isWithdrawn: false,
      ...(language && { language }),
    })
      .select('title knowledgeType language location topics people places proverbs culturalConcepts')
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    const locations = new Map();
    const languages = new Map();
    const topics = new Map();
    const people = new Map();
    const places = new Map();
    const concepts = new Map();
    const proverbs = [];
    const occupations = [];
    const traditions = [];

    for (const item of items) {
      const ref = { _id: item._id, title: item.title };
      const place = item.location?.town || item.location?.state || item.location?.community || UNKNOWN_LOCATION;

      const loc = locations.get(place) || { name: place, count: 0, languages: new Set(), types: new Map(), topics: new Map() };
      loc.count += 1;
      loc.languages.add(item.language);
      const typeEntry = loc.types.get(item.knowledgeType) || { type: item.knowledgeType, items: [] };
      typeEntry.items.push(ref);
      loc.types.set(item.knowledgeType, typeEntry);
      (item.topics || []).forEach((t) => countInto(loc.topics, t));
      locations.set(place, loc);

      countInto(languages, item.language);
      (item.topics || []).forEach((t) => countInto(topics, t, ref));
      (item.people || []).forEach((p) => countInto(people, p, ref));
      (item.places || []).forEach((p) => countInto(places, p, ref));
      (item.culturalConcepts || []).forEach((c) => countInto(concepts, c.term, ref));
      (item.proverbs || []).forEach((p) => proverbs.length < 40 && proverbs.push({ ...p, item: ref, language: item.language }));
      if (['traditional_occupation', 'craft_knowledge'].includes(item.knowledgeType)) occupations.push({ ...ref, place });
      if (item.knowledgeType === 'tradition') traditions.push({ ...ref, place });
    }

    return {
      totalItems: items.length,
      locations: [...locations.values()]
        .sort((a, b) => b.count - a.count)
        .map((l) => ({
          name: l.name,
          count: l.count,
          languages: [...l.languages],
          types: [...l.types.values()].sort((a, b) => b.items.length - a.items.length),
          topics: top(l.topics, 8).map(({ name, count }) => ({ name, count })),
        })),
      facets: {
        languages: top(languages).map(({ name, count }) => ({ name, count })),
        topics: top(topics),
        people: top(people),
        places: top(places),
        culturalConcepts: top(concepts),
        proverbs,
        occupations: occupations.slice(0, 30),
        traditions: traditions.slice(0, 30),
      },
    };
  },
};

module.exports = knowledgeExploreService;
