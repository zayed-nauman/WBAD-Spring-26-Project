const prisma = require('../config/prisma');

/**
 * List blacklisted numbers.
 * @returns {Promise<Array<Object>>}
 */
const listBlacklistedNumbers = async () => {
  return prisma.blacklistedNumber.findMany();
};

/**
 * Add a number to blacklist.
 * @param {{phoneNumber: string, reason?: string}} payload
 * @returns {Promise<Object>}
 */
const createBlacklistedNumber = async (payload) => {
  return prisma.blacklistedNumber.create({
    data: { phoneNumber: payload.phoneNumber, reason: payload.reason },
  });
};

/**
 * Delete blacklisted number.
 * @param {number} id
 * @returns {Promise<void>}
 */
const deleteBlacklistedNumber = async (id) => {
  await prisma.blacklistedNumber.delete({ where: { id } });
};

module.exports = {
  listBlacklistedNumbers,
  createBlacklistedNumber,
  deleteBlacklistedNumber,
};