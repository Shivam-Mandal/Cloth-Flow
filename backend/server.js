// server.js
import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import { authRouter } from './routes/authRoutes.js';
import { styleRouter } from './routes/styleRoutes.js';
import { stockRouter } from './routes/stockRoute.js';
import orderRouter from './routes/order.js';
import cors from 'cors';
import { verifyAccessToken, requireRole } from './middlewares/authMiddleware.js';
import { errorHandler } from './middlewares/errorHandlerMiddleware.js';
import helmet from 'helmet';
import morgan from 'morgan';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- Security & Parsing Middlewares ---
app.use(helmet()); // Secure HTTP headers
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies
app.use(morgan('combined')); // Logging requests

// --- CORS Setup ---
const allowedOrigins = [
  'http://localhost:5173',        // dev frontend
  'http://localhost:5174',        // optional dev frontend
  process.env.FRONTEND_URL        // production frontend
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow server-to-server requests
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- Connect to Database and Start Server ---
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database connection failed:', error);
    process.exit(1);
  });

// --- Routes ---
app.use('/api/auth', authRouter);
app.use('/api/styles', styleRouter);
app.use('/api/stocks', stockRouter);
app.use('/api/orders', orderRouter);

// --- Test Route ---
app.get('/', (req, res) => {
  res.send('Welcome to the API');
});

// --- Admin-only example route ---
app.get('/api/admin/secret', verifyAccessToken, requireRole('admin'), (req, res) => {
  res.json({ secret: 'admin-only data' });
});

// --- Error Handling Middleware ---
app.use(errorHandler);

