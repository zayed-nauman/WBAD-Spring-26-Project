const prisma = require('../config/prisma');

const normalizePhoneNumber = (phoneNumber = '') => {
  const digits = String(phoneNumber).replace(/\D/g, '');

  if (digits.startsWith('92')) return digits;
  if (digits.startsWith('0')) return `92${digits.slice(1)}`;
  if (digits.length === 10) return `92${digits}`;

  return digits;
};

/**
 * List blacklisted numbers.
 * @returns {Promise<Array<Object>>}
 */
const listBlacklistedNumbers = async () => {
  return prisma.blacklistedNumber.findMany({ orderBy: { createdAt: 'desc' } });
};

/**
 * Add a number to blacklist.
 * @param {{phoneNumber: string, reason?: string}} payload
 * @returns {Promise<Object>}
 */
const createBlacklistedNumber = async (payload) => {
  const normalized = normalizePhoneNumber(payload.phoneNumber);
  if (!normalized) {
    const error = new Error('Phone number is required');
    error.statusCode = 400;
    throw error;
  }

  return prisma.blacklistedNumber.create({
    data: { phoneNumber: normalized, reason: payload.reason },
  });
};

const createBlacklistedNumbersBulk = async (phoneNumbers = []) => {
  const rawNumbers = Array.isArray(phoneNumbers) ? phoneNumbers : String(phoneNumbers).split(/\n|,/);
  const normalizedNumbers = [...new Set(rawNumbers.map(normalizePhoneNumber).filter(Boolean))];

  if (!normalizedNumbers.length) return { count: 0 };

  return prisma.blacklistedNumber.createMany({
    data: normalizedNumbers.map((phoneNumber) => ({ phoneNumber })),
    skipDuplicates: true,
  });
};

const isPhoneNumberBlacklisted = async (phoneNumber) => {
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) return null;

  const directMatch = await prisma.blacklistedNumber.findUnique({ where: { phoneNumber: normalized } });
  if (directMatch) return directMatch;

  const entries = await prisma.blacklistedNumber.findMany();
  return entries.find((entry) => normalizePhoneNumber(entry.phoneNumber) === normalized) || null;
};

/**
 * Delete blacklisted number.
 * @param {number} id
 * @returns {Promise<{removed: Object, updatedOrders: number}>}
 */
const deleteBlacklistedNumber = async (id) => {
  const entry = await prisma.blacklistedNumber.findUnique({ where: { id } });
  if (!entry) {
    const error = new Error('Blacklisted number not found');
    error.statusCode = 404;
    throw error;
  }

  const normalized = normalizePhoneNumber(entry.phoneNumber);

  return prisma.$transaction(async (tx) => {
    const removed = await tx.blacklistedNumber.delete({ where: { id } });
    const updated = await tx.order.updateMany({
      where: {
        isBlacklisted: true,
        status: { notIn: ['DELIVERED', 'RETURNED'] },
        OR: [
          { phoneNumber: normalized },
          { receiverPhone: normalized },
        ],
      },
      data: {
        isBlacklisted: false,
        blacklistedReason: null,
        status: 'READY_FOR_PICKUP',
      },
    });

    return { removed, updatedOrders: updated.count };
  });
};

module.exports = {
  normalizePhoneNumber,
  listBlacklistedNumbers,
  createBlacklistedNumber,
  createBlacklistedNumbersBulk,
  isPhoneNumberBlacklisted,
  deleteBlacklistedNumber,
};
