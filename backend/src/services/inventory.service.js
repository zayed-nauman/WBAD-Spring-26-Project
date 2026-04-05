const prisma = require('../config/prisma');

const listInventory = async () => {
  return prisma.inventory.findMany({ orderBy: { productName: 'asc' } });
};

const createInventory = async (payload) => {
  return prisma.inventory.create({ data: { productName: payload.productName, sku: payload.sku, quantity: payload.quantity || 0 } });
};

const updateInventory = async (id, payload) => {
  return prisma.inventory.update({ where: { id }, data: { productName: payload.productName, sku: payload.sku, quantity: payload.quantity } });
};

const deleteInventory = async (id) => {
  await prisma.inventory.delete({ where: { id } });
};

module.exports = { listInventory, createInventory, updateInventory, deleteInventory };