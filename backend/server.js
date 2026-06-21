const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1'])
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');


dotenv.config();

if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.error('JWT_SECRET and JWT_REFRESH_SECRET must be set in environment');
  process.exit(1);
}

const authRoutes         = require('./routes/authRoutes');
const userRoutes         = require('./routes/userRoutes');
const companyRoutes      = require('./routes/companyRoutes');
const applicationRoutes  = require('./routes/applicationRoutes');
const aiRoutes           = require('./routes/aiRoutes');
const analyticsRoutes    = require('./routes/analyticsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { errorHandler }   = require('./middleware/errorMiddleware.js');

const app = express();

app.set('trust proxy', 1); 
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000, max: 300,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.' },
}));

app.use('/api/auth',        authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/companies',     companyRoutes);
app.use('/api/applications',  applicationRoutes);
app.use('/api/ai',            aiRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.get('/api/health', (req, res) => res.json({ success: true, message: 'UniPlacement is live ', timestamp: new Date().toISOString() }));
app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` }));
app.use(errorHandler);

const PORT = process.env.PORT;
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(` Server http://localhost:${PORT}`));
  })
  .catch(err => { console.error(' MongoDB failed:', err.message); process.exit(1); });

module.exports = app;