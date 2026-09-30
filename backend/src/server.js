require('dotenv').config();
// Initialize Telegram Bot Listener (Non-blocking) - Only outside tests
if (process.env.NODE_ENV !== 'test') {
  require('./services/telegramBot');
}
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const keepAlive = require('./utils/keepAlive');

// Initialize Cron Jobs - Only outside tests
if (process.env.NODE_ENV !== 'test') {
  require('./jobs/automationJobs');
}

const app = express();
// Google Cloud Run sets the PORT variable automatically to 8080
// Defaulting to 5000 to match vite.config.js and api.js in dev
const PORT = process.env.PORT || 5000;

// ================================
// 🔌 SOCKET.IO SETUP
// ================================
// Socket.IO uses the same allowedOrigins as the REST API (configured below)
const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);

// Note: allowedOrigins is defined after CORS middleware - io is re-configured there
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const socketAllowed = [
        'https://trustworthydomesticworkers.web.app',
        'https://trustworthydomesticworkers.firebaseapp.com',
        'https://edwl-ethio-domesticworkerslink.web.app',
        'https://edwl-ethio-domesticworkerslink.firebaseapp.com',
        'http://localhost:3000',
        ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [])
      ];
      if (socketAllowed.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Socket.IO connection not allowed from: ' + origin));
      }
    },
    methods: ["GET", "POST"]
  }
});

// Store io in app for access in controllers
app.set('io', io);

io.on('connection', (socket) => {
  

  socket.on('join', (userId) => {
    socket.join(userId);
    
  });

  socket.on('disconnect', () => {
    
  });
});

// Start Keep-Alive (Zero-Cost Move)
// if (process.env.NODE_ENV === 'production' && process.env.BASE_URL) {
//   keepAlive(`${process.env.BASE_URL}/health`);
// }

// ================================
// 🔐 SECURITY: TRUST PROXY (Updated for Google Cloud Run)
// Setting to 1 tells Express exactly one trusted reverse proxy sits in front
// of the app (Cloud Run's load balancer). This is more secure than `true`
// and satisfies express-rate-limit's strict validation.
// ================================
app.set('trust proxy', 1);

// ================================
// 📘 Swagger Setup
// ================================
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TDW API',
      version: '1.0.2',
      description: 'API Documentation for Trustworthy Domestic Workers (TDW)',
      contact: {
        name: 'TDW Support',
        email: 'trustworthyaddis@gmail.com'
      }
    },
    servers: [
      { url: process.env.BASE_URL || `http://localhost:${PORT}`, description: 'Server' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// ================================
// 🔐 HELMET SECURITY
// ================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://*"],
      connectSrc: [
        "'self'",
        "https://*.firebaseio.com",
        "https://*.googleapis.com",
        "https://trustworthydomesticworkers.web.app",
        "https://trustworthydomesticworkers.firebaseapp.com",
        "https://edwl-ethio-domesticworkerslink.web.app",
        "https://edwl-ethio-domesticworkerslink.firebaseapp.com"
      ],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// ================================
// 🧾 MIDDLEWARE
// ================================
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(compression()); // Compress all textual payload bodies
app.use(express.json({ limit: '10mb' }));

// ================================
// 🔐 DYNAMIC CORS CONFIGURATION
// ================================
const envOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];
const allowedOrigins = [
  'https://trustworthydomesticworkers.web.app',
  'https://trustworthydomesticworkers.firebaseapp.com',
  'https://edwl-ethio-domesticworkerslink.web.app',
  'https://edwl-ethio-domesticworkerslink.firebaseapp.com',
  'http://localhost:3000',
  'http://localhost:3001',
  ...envOrigins
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    // Allow if in allowedOrigins OR if not in production
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error(`CORS not allowed from: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// ================================
// 🚦 BASIC GLOBAL RATE LIMIT
// ================================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// 🔐 STRICT AUTH RATE LIMIT (Brute-force Protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Max 30 login/register attempts per 15 min window
  message: { error: 'Too many authentication attempts. Please try again later after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

// 🛡️ INPUT SANITIZATION
const sanitizeInput = require('./middleware/sanitizer');
app.use(sanitizeInput);

// ================================
// 📂 STATIC FILE SERVING
// ================================
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath, {
  maxAge: '1d', // Cache static uploads for 1 day
  setHeaders: (res) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Cache-Control', 'public, max-age=86400');
  }
}));

// ================================
// 🏠 ROOT ROUTE (Redirect to Frontend)
// ================================
app.get('/', (req, res) => {
  const frontendUrl = 'https://trustworthydomesticworkers.web.app';
  if (process.env.NODE_ENV === 'production') {
    return res.redirect(frontendUrl);
  }
  res.json({ status: 'UP', message: 'Welcome to EDWL API (Dev Mode)', version: '1.0.1' });
});

// ================================
// Start Keep-Alive (Zero-Cost Move)
if (process.env.NODE_ENV === 'production' && process.env.BASE_URL) {
  keepAlive(`${process.env.BASE_URL}/health`);
}

// ================================
// 🩺 HEALTH CHECK ROUTE (NEW)
// ================================
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ================================
// 📌 ROUTES
// ================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/seekers', require('./routes/seekers'));
app.use('/api/employers', require('./routes/employers'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/hiring', require('./routes/hiringRoutes'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/report', require('./routes/report'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/payments', require('./routes/payment'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/safety', require('./routes/safety'));
app.use('/api/training', require('./routes/trainingRoutes'));
app.use('/api/contracts', require('./routes/contracts'));
app.use('/api/escrow', require('./routes/escrow'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/seeker', require('./routes/academy'));
app.use('/api/agency', require('./routes/agency'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/insurance', require('./routes/insurance'));
app.use('/api/voice-copilot', require('./routes/voiceCopilot'));
app.use('/api/payouts', require('./routes/payouts'));
app.use('/api/guarantor', require('./routes/guarantor'));
app.use('/api/household-checklist', require('./routes/householdChecklist'));
app.use('/api/telegram', require('./routes/telegramRoutes'));

// ================================
// ❌ GLOBAL ERROR HANDLER
// ================================
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

// ================================
// 🚀 SERVER START
// ================================
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}


module.exports = app;