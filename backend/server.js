// server.js
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import { authRouter } from './routes/authRoutes.js';
import { styleRouter } from './routes/styleRoutes.js';
import { stockRouter } from './routes/stockRoute.js';
import orderRouter from './routes/order.js';
import cors from 'cors';
import { errorHandler } from './middlewares/errorHandlerMiddleware.js';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { csrfProtection } from './middlewares/csrfMiddleware.js';
import { rejectUnsafeKeys } from './middlewares/sanitizeMiddleware.js';
import AssignedRouter from './routes/assignmentRoutes.js';
import WorkerRouter from './routes/workerRoutes.js';
import approvalRouter from './routes/approvalRoutes.js';
import subOrderRouter from './routes/subOrderRoutes.js';
import userRouter from './routes/userRoutes.js';
import stageRouter from './routes/stageRoutes.js';
import uploadRouter from './routes/uploadRoutes.js';
dotenv.config({ path: new URL('./.env', import.meta.url), quiet: true });

const app = express();
const server = createServer(app);
server.requestTimeout = Number(process.env.REQUEST_TIMEOUT_MS || 30000);
server.headersTimeout = Number(process.env.HEADERS_TIMEOUT_MS || 35000);

const defaultAllowedOrigins = [
  'https://cloth-flow.onrender.com',
  'https://cloth-flow-production.onrender.com',
  'https://cloth-flow.netlify.app',
  'https://cloth-flow.vercel.app',
  'http://localhost:5173'
];
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const effectiveAllowedOrigins = allowedOrigins.length > 0 ? allowedOrigins : defaultAllowedOrigins;
const isProd = process.env.NODE_ENV === 'production';

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (effectiveAllowedOrigins.includes(origin)) return true;

  try {
    const { hostname, protocol } = new URL(origin);
    return !isProd && protocol === 'http:' && ['localhost', '127.0.0.1'].includes(hostname);
  } catch {
    return false;
  }
};

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      callback(null, isAllowedOrigin(origin));
    },
    credentials: true
  }
});

// Make io available globally
app.set('io', io);

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

app.use(cors({
  origin: function (origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS','PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));
app.use(csrfProtection);
app.use(rejectUnsafeKeys);

// Handle Private Network Access for localhost requests from HTTPS origins
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Private-Network', 'true');
  next();
});

// --- API Routes (register before static/catch-all) ---
app.use('/api/auth', authRouter);
app.use('/api/styles', styleRouter);
app.use('/api/stocks', stockRouter);
app.use('/api/orders', orderRouter);
app.use('/api/assignments', AssignedRouter);
app.use('/api/workers', WorkerRouter);
app.use('/api/approvals', approvalRouter);
app.use('/api/suborders', subOrderRouter);
app.use('/api/users', userRouter);
app.use('/api/stages', stageRouter);
app.use('/api/uploads', uploadRouter);

app.get('/', (req, res) => {
  res.send('Welcome to the API');
});
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, status: 'ok' });
});

// --- Serve static files and client-side routing fallback ---
// Serve Vite's dist folder (ensure you run `npm run build` so dist exists)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Catch-all for client-side routes — use regex /.*/ to avoid path-to-regexp errors
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

// --- Error Handling Middleware (last) ---
app.use(errorHandler);


// --- Connect to Database and Start Server ---
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database connection failed:', error);
    process.exit(1);
  });

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down gracefully`);
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
