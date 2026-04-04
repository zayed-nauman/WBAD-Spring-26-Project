const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth.routes');
const orderRoutes = require('./routes/order.routes');
const riderRoutes = require('./routes/rider.routes');
const returnCaseRoutes = require('./routes/returnCase.routes');
const blacklistRoutes = require('./routes/blacklist.routes');
const inventoryRoutes = require('./routes/inventory.routes');

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/riders', riderRoutes);
app.use('/api/return-cases', returnCaseRoutes);
app.use('/api/blacklist', blacklistRoutes);
app.use('/api/inventory', inventoryRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Courier Management API is running.',
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'Courier Management API is running!' });
});

module.exports = app;