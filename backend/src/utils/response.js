/**
 * Send a successful JSON response.
 * @param {import('express').Response} res
 * @param {object} data
 * @param {string} [message]
 * @param {number} [statusCode]
 */
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({ success: true, message, data });
};

/**
 * Send a paginated JSON response.
 */
const sendPaginated = (res, data, pagination, message = 'Success') => {
  res.status(200).json({ success: true, message, data, pagination });
};

module.exports = { sendSuccess, sendPaginated };
