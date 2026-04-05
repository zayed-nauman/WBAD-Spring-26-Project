const inventoryService = require('../services/inventory.service');

const listInventory = async (req, res) => {
  try {
    const items = await inventoryService.listInventory();
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
};

const createInventory = async (req, res) => {
  try {
    const item = await inventoryService.createInventory(req.body);
    res.json({ message: 'Inventory created', item });
  } catch (e) {
    res.status(400).json({ error: 'Failed to create inventory' });
  }
};

const updateInventory = async (req, res) => {
  try {
    const item = await inventoryService.updateInventory(Number.parseInt(req.params.id, 10), req.body);
    res.json({ message: 'Inventory updated', item });
  } catch (e) {
    res.status(400).json({ error: 'Failed to update inventory' });
  }
};

const deleteInventory = async (req, res) => {
  try {
    await inventoryService.deleteInventory(Number.parseInt(req.params.id, 10));
    res.json({ message: 'Inventory deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete inventory' });
  }
};

module.exports = { listInventory, createInventory, updateInventory, deleteInventory };