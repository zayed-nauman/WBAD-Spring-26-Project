const blacklistService = require('../services/blacklist.service');

const parseId = (rawId) => Number.parseInt(rawId, 10);

const listBlacklistedNumbers = async (req, res) => {
  try {
    const list = await blacklistService.listBlacklistedNumbers();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch blacklist' });
  }
};

const createBlacklistedNumber = async (req, res) => {
  const { phoneNumber, reason } = req.body;

  try {
    const entry = await blacklistService.createBlacklistedNumber({ phoneNumber, reason });
    res.json({ message: 'Number blacklisted', entry });
  } catch (error) {
    res.status(400).json({ error: 'Number already blacklisted' });
  }
};

const deleteBlacklistedNumber = async (req, res) => {
  try {
    await blacklistService.deleteBlacklistedNumber(parseId(req.params.id));
    res.json({ message: 'Number removed from blacklist' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove number' });
  }
};

module.exports = {
  listBlacklistedNumbers,
  createBlacklistedNumber,
  deleteBlacklistedNumber,
};
