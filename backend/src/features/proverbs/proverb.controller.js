const proverbService = require('./proverb.service');
const { sendSuccess, sendPaginated } = require('../../utils/response');

const create = async (req, res, next) => {
  try {
    const proverb = await proverbService.create(req.body, req.user._id);
    sendSuccess(res, { proverb }, 'Proverb added', 201);
  } catch (err) { next(err); }
};

const getAll = async (req, res, next) => {
  try {
    const { data, pagination } = await proverbService.getAll(req.query);
    sendPaginated(res, data, pagination);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const proverb = await proverbService.getById(req.params.id);
    sendSuccess(res, { proverb });
  } catch (err) { next(err); }
};

const extractFromText = async (req, res, next) => {
  try {
    const proverbs = await proverbService.extractFromText(req.body.text, req.body.language);
    sendSuccess(res, { proverbs });
  } catch (err) { next(err); }
};

module.exports = { create, getAll, getById, extractFromText };
