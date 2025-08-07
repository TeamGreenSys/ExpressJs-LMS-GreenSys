const express = require("express");
const bodyParser = require('body-parser');
const dotenv = require("dotenv");
const path = require('path');
const fs = require('fs');
const db = require("./config/Database.js");
const SequelizeStore = require("connect-session-sequelize");
const cookieParser = require("cookie-parser");
const FileUpload = require("express-fileupload");
const cors = require("cors");
const session = require("express-session");
const setupAssociations = require('./models/associations');

setupAssociations();
const AuthRoute = require("./routes/AuthRoute.js");
const UserRoute = require("./routes/UserRoute.js");
const SiswaRoute = require("./routes/SiswaRoute.js");
const GuruRoute = require("./routes/GuruRoute.js");
const KelasRoute = require("./routes/KelasRoute.js");
const ModulRoute = require("./routes/ModulRoute.js");
const SubModulRoute = require("./routes/SubModulRoute.js");
const CertificateRoute = require("./routes/CertificateRoute.js");
const StudentProgressRoute = require("./routes/StudentProgressRoute.js");
const GroupSoalRoute = require("./routes/GroupSoalRoute.js");
const SoalRoute = require("./routes/SoalRoute.js");
const NilaiRoute = require("./routes/NilaiRoute.js");

dotenv.config();
const app = express();

const sessionStore = SequelizeStore(session.Store)
const store = new sessionStore({
    db: db
})

const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://greensys.ruangbertunas.id',
    'https://ruangbertunas.id',
    'https://www.ruangbertunas.id'
];

// ✅ SINGLE CORS Configuration - NO manual middleware
app.use(cors({
    origin: function (origin, callback) {
        console.log('CORS Check - Origin:', origin);

        // Allow requests with no origin (mobile apps, curl, postman, etc.)
        if (!origin) {
            console.log('CORS Allowed: No origin (direct access)');
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            console.log('CORS Allowed:', origin);
            callback(null, true);
        } else {
            console.log('CORS Rejected:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    optionsSuccessStatus: 200
}));

// Session Configuration
app.use(session({
    secret: process.env.SESS_SECRET,
    resave: false,
    saveUninitialized: true,
    store: store,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}))

// Body Parser & Other Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());
app.use(express.json());
app.use(FileUpload());

// ✅ Static Files - Let main CORS handle it
app.use(express.static("public"));

// ✅ Images - Let main CORS handle it
app.use("/images", express.static("./public/images"));

// ✅ Helper function for static file CORS (no wildcards)
const setStaticCORS = (req, res, next) => {
    const origin = req.headers.origin;

    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
        // For direct access, use the main domain instead of wildcard
        res.setHeader('Access-Control-Allow-Origin', allowedOrigins[2]); // greensys.ruangbertunas.id
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.url.endsWith('.pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=3600');
    }

    next();
};

// Certificates with proper CORS
app.use("/certificates", setStaticCORS, express.static("./public/certificates"));

// PDF Files with proper CORS
app.use("/pdf", setStaticCORS, express.static("./public/pdf"));

// Templates with proper CORS
app.use("/templates", setStaticCORS, express.static("./public/templates"));

// ✅ PDF Proxy with proper CORS
app.post('/pdf-proxy', async (req, res) => {
  try {
    const { pdfUrl } = req.body;

    if (!pdfUrl) {
      return res.status(400).json({ error: 'PDF URL is required' });
    }

    console.log('PDF Proxy Request for:', pdfUrl);

    // Set proper CORS headers
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigins[2]);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Check if it's a local file (support both certificates and pdf folders)
    if (pdfUrl.includes(req.get('host')) || pdfUrl.includes('/certificates/') || pdfUrl.includes('/pdf/')) {
      let filename;
      let filePath;

      // Extract filename and determine correct folder
      if (pdfUrl.includes('/certificates/')) {
        filename = pdfUrl.split('/certificates/')[1];
        filePath = path.join(__dirname, 'public', 'certificates', filename);
        console.log('Looking for certificate file at:', filePath);
      } else if (pdfUrl.includes('/pdf/')) {
        filename = pdfUrl.split('/pdf/')[1];
        filePath = path.join(__dirname, 'public', 'pdf', filename);
        console.log('Looking for PDF file at:', filePath);
      } else {
        // Fallback: try to extract from full URL
        const urlPath = new URL(pdfUrl).pathname;
        filename = path.basename(urlPath);

        // Try certificates folder first, then pdf folder
        let certPath = path.join(__dirname, 'public', 'certificates', filename);
        let pdfPath = path.join(__dirname, 'public', 'pdf', filename);

        if (fs.existsSync(certPath)) {
          filePath = certPath;
          console.log('Found in certificates folder:', filePath);
        } else if (fs.existsSync(pdfPath)) {
          filePath = pdfPath;
          console.log('Found in pdf folder:', filePath);
        } else {
          console.error('File not found in either certificates or pdf folder');
          return res.status(404).json({ error: 'PDF file not found' });
        }
      }

      // Validate filename to prevent directory traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ error: 'Invalid filename' });
      }

      if (fs.existsSync(filePath)) {
        const fileBuffer = fs.readFileSync(filePath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', fileBuffer.length);
        res.setHeader('Accept-Ranges', 'bytes');
        res.send(fileBuffer);
        console.log('Successfully served PDF:', filename);
      } else {
        console.error('PDF file not found:', filePath);
        res.status(404).json({ error: 'PDF file not found' });
      }
    } else {
      // External file - proxy the request
      const https = require('https');
      const http = require('http');

      const protocol = pdfUrl.startsWith('https:') ? https : http;

      protocol.get(pdfUrl, (pdfResponse) => {
        if (pdfResponse.statusCode === 200) {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Length', pdfResponse.headers['content-length']);
          res.setHeader('Accept-Ranges', 'bytes');
          pdfResponse.pipe(res);
        } else {
          res.status(pdfResponse.statusCode).json({
            error: `Failed to fetch PDF: ${pdfResponse.statusCode}`
          });
        }
      }).on('error', (error) => {
        console.error('PDF proxy error:', error);
        res.status(500).json({ error: 'Failed to fetch PDF' });
      });
    }

  } catch (error) {
    console.error('PDF proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle OPTIONS requests for PDF proxy
app.options('/pdf-proxy', (req, res) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigins[2]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.status(204).end();
});

// Direct PDF serving endpoint for both certificates and pdf files
app.get('/pdf-file/:folder/:filename', (req, res) => {
  try {
    const { folder, filename } = req.params;

    // Validate folder (only allow certificates and pdf)
    if (!['certificates', 'pdf'].includes(folder)) {
      return res.status(400).json({ error: 'Invalid folder' });
    }

    // Validate filename to prevent directory traversal attacks
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Validate file extension
    if (!filename.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }

    const filePath = path.join(__dirname, 'public', folder, filename);

    // Set proper CORS headers
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigins[2]);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=3600');

      // Handle range requests for PDF streaming
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        const chunksize = (end - start) + 1;

        const file = fs.createReadStream(filePath, { start, end });

        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
        res.setHeader('Content-Length', chunksize);

        file.pipe(res);
      } else {
        const file = fs.createReadStream(filePath);
        file.pipe(res);
      }

      console.log(`PDF served: ${folder}/${filename}`);
    } else {
      res.status(404).json({ error: 'PDF file not found' });
    }

  } catch (error) {
    console.error('PDF serving error:', error);
    res.status(500).json({ error: 'Failed to serve PDF' });
  }
});

// Simplified endpoint for backward compatibility
app.get('/pdf-file/:filename', (req, res) => {
  const { filename } = req.params;

  // Try certificates first, then pdf folder
  const certPath = path.join(__dirname, 'public', 'certificates', filename);
  const pdfPath = path.join(__dirname, 'public', 'pdf', filename);

  if (fs.existsSync(certPath)) {
    res.redirect(`/pdf-file/certificates/${filename}`);
  } else if (fs.existsSync(pdfPath)) {
    res.redirect(`/pdf-file/pdf/${filename}`);
  } else {
    res.status(404).json({ error: 'PDF file not found in any folder' });
  }
});

// Routes
app.use(AuthRoute);
app.use(UserRoute);
app.use(SiswaRoute);
app.use(GuruRoute);
app.use(KelasRoute);
app.use(ModulRoute);
app.use(SubModulRoute);
app.use(CertificateRoute);
app.use(StudentProgressRoute);
app.use(GroupSoalRoute);
app.use(SoalRoute);
app.use(NilaiRoute);

// Root endpoint
app.get('/', (req, res) => {
    res.json("berhasil");
});

// Error handling untuk CORS
app.use((err, req, res, next) => {
    if (err.message === 'Not allowed by CORS') {
        res.status(403).json({
            error: 'CORS policy violation',
            message: 'Origin not allowed',
            origin: req.headers.origin
        });
    } else {
        console.error('Server error:', err);
        res.status(500).json({
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
        });
    }
});

app.listen(process.env.APP_PORT, () => {
    console.log(`Server running on port ${process.env.APP_PORT}`);
    console.log("Allowed Origins:", allowedOrigins);
    console.log("PDF Proxy endpoint available at: /pdf-proxy");
    console.log("Direct PDF access available at: /pdf-file/:folder/:filename");
    console.log("Static files: /certificates/* and /pdf/*");
});