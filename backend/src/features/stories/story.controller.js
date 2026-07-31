const storyService = require('./story.service');
const { sendSuccess, sendPaginated } = require('../../utils/response');

const create = async (req, res, next) => {
  try {
    const story = await storyService.create(req.body, req.user._id);
    sendSuccess(res, { story }, 'Story submitted. AI analysis in progress.', 201);
  } catch (err) { next(err); }
};

const getAll = async (req, res, next) => {
  try {
    const { data, pagination } = await storyService.getAll(req.query);
    sendPaginated(res, data, pagination);
  } catch (err) { next(err); }
};

const getMyStories = async (req, res, next) => {
  try {
    const { data, pagination } = await storyService.getMyStories(req.user._id, req.query);
    sendPaginated(res, data, pagination);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const story = await storyService.getById(req.params.id);
    sendSuccess(res, { story });
  } catch (err) { next(err); }
};

const publish = async (req, res, next) => {
  try {
    const story = await storyService.publish(req.params.id, req.user._id);
    sendSuccess(res, { story }, 'Story published');
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await storyService.delete(req.params.id, req.user._id, req.user.role);
    sendSuccess(res, null, 'Story deleted');
  } catch (err) { next(err); }
};

const getEducationalContent = async (req, res, next) => {
  try {
    const outputLanguage = req.query.outputLanguage || req.body.outputLanguage;
    const content = await storyService.generateEducationalContent(req.params.id, outputLanguage);
    sendSuccess(res, { content });
  } catch (err) { next(err); }
};

const getChildrensVersion = async (req, res, next) => {
  try {
    const outputLanguage = req.query.outputLanguage || req.body.outputLanguage;
    const version = await storyService.generateChildrensVersion(req.params.id, outputLanguage);
    sendSuccess(res, { version });
  } catch (err) { next(err); }
};

const getCrossLanguageConnections = async (req, res, next) => {
  try {
    const connections = await storyService.findCrossLanguageConnections(req.params.id);
    sendSuccess(res, { connections });
  } catch (err) { next(err); }
};

const translate = async (req, res, next) => {
  try {
    const result = await storyService.translate(req.params.id, req.body.targetLanguage);
    sendSuccess(res, { translation: result });
  } catch (err) { next(err); }
};

const getPodcastScript = async (req, res, next) => {
  try {
    const outputLanguage = req.query.outputLanguage || req.body.outputLanguage;
    const script = await storyService.generatePodcastScript(req.params.id, outputLanguage);
    sendSuccess(res, { script });
  } catch (err) { next(err); }
};

const getRecommendations = async (req, res, next) => {
  try {
    const recommendations = await storyService.getRecommendations(req.params.id);
    sendSuccess(res, { recommendations });
  } catch (err) { next(err); }
};

module.exports = {
  create, getAll, getMyStories, getById, publish, remove,
  getEducationalContent, getChildrensVersion, getCrossLanguageConnections,
  translate, getPodcastScript, getRecommendations,
};
