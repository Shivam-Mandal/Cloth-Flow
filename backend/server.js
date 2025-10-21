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
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Security & Parsing Middlewares (register early) ---
app.set('trust proxy', 1); // trust first proxy
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('combined'));

// --- CORS Setup ---
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow server-to-server / same-origin requests
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

// --- API Routes (register before static/catch-all) ---
app.use('/api/auth', authRouter);
app.use('/api/styles', styleRouter);
app.use('/api/stocks', stockRouter);
app.use('/api/orders', orderRouter);

// --- Example API/test routes ---
app.get('/api/admin/secret', verifyAccessToken, requireRole('admin'), (req, res) => {
  res.json({ secret: 'admin-only data' });
});
app.get('/', (req, res) => {
  res.send('Welcome to the API');
});

// --- Serve static files and client-side routing fallback ---
// Serve Vite's dist folder (ensure you run `npm run build` so dist exists)
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all for client-side routes — use regex /.*/ to avoid path-to-regexp errors
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- Error Handling Middleware (last) ---
app.use(errorHandler);

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
