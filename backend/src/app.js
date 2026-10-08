const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const AppError = require('./utils/AppError');

// Feature routes
const authRoutes = require('./features/auth/auth.routes');
const storyRoutes = require('./features/stories/story.routes');
const proverbRoutes = require('./features/proverbs/proverb.routes');
const chatRoutes = require('./features/chat/chat.routes');
const searchRoutes = require('./features/search/search.routes');
const uploadRoutes = require('./features/uploads/upload.routes');
const bookmarkRoutes = require('./features/bookmarks/bookmark.routes');
const adminRoutes = require('./features/admin/admin.routes');
const knowledgeRoutes = require('./features/knowledge/knowledge.routes');
const educationRoutes = require('./features/education/education.routes');
const ingestionRoutes = require('./features/ingestion/ingestion.routes');
const graphRoutes = require('./features/graph/graph.routes');
const natlasRoutes = require('./features/natlas/natlas.routes');
const analyticsRoutes = require('./features/analytics/analytics.routes');
const { LOCAL_AUDIO_DIR } = require('./core/storage/audio.storage');

const app = express();

// Trust Render/Vercel reverse proxy — required for express-rate-limit behind X-Forwarded-For
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS — allow configured origin plus common dev ports
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://memory-ai-two.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Pipeline progress is polled every ~2s while N-ATLAS runs; do not count it
  skip: (req) => req.method === 'GET' && req.path.startsWith('/v1/knowledge/jobs/'),
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, message: 'AI rate limit exceeded. Please wait a moment.' },
});

app.use('/api', globalLimiter);
app.use('/api/v1/chat', aiLimiter);
app.use('/api/v1/stories/:id/educational', aiLimiter);
app.use('/api/v1/stories/:id/childrens-version', aiLimiter);
app.use('/api/v1/stories/:id/cross-language', aiLimiter);
app.use('/api/v1/stories/:id/translate', aiLimiter);
app.use('/api/v1/stories/:id/podcast', aiLimiter);
app.use('/api/v1/search/semantic', aiLimiter);
app.use('/api/v1/education', aiLimiter);
app.use('/api/v1/natlas/transcribe', aiLimiter);
app.use('/api/v1/natlas/process', aiLimiter);
app.use('/api/v1/knowledge/process', aiLimiter);
app.use('/api/v1/knowledge/search', aiLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

// Security — inline MongoDB injection sanitizer (express-mongo-sanitize incompatible with Express 5)
const sanitizeMongo = (obj) => {
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else {
        sanitizeMongo(obj[key]);
      }
    }
  }
};

app.use((req, res, next) => {
  if (req.body) sanitizeMongo(req.body);
  next();
});
app.use(hpp());

// HTTP logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  }));
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'MemoryAI Nigeria API', timestamp: new Date().toISOString() });
});

// Locally stored contribution recordings (used when Cloudinary is not configured).
// Cross-origin so the frontend can play them in <audio>.
app.use('/media/audio', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(LOCAL_AUDIO_DIR, { fallthrough: false, maxAge: '7d' }));

// API routes
const API = '/api/v1';
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/stories`, storyRoutes);
app.use(`${API}/proverbs`, proverbRoutes);
app.use(`${API}/chat`, chatRoutes);
app.use(`${API}/search`, searchRoutes);
app.use(`${API}/uploads`, uploadRoutes);
app.use(`${API}/bookmarks`, bookmarkRoutes);
app.use(`${API}/admin`, adminRoutes);
app.use(`${API}/knowledge`, knowledgeRoutes);
app.use(`${API}/education`, educationRoutes);
app.use(`${API}/ingestion`, ingestionRoutes);
app.use(`${API}/graph`, graphRoutes);
app.use(`${API}/natlas`, natlasRoutes);
app.use(`${API}/analytics`, analyticsRoutes);

// 404 handler
app.use((req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

// Global error handler
app.use(errorHandler);

module.exports = app;
