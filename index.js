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
    'http://192.168.100.78:3000',
    'https://visited-tools-efficiency-temperature.trycloudflare.com'
];

// ✅ CORS Configuration - Apply globally first
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
}));

// ✅ Additional CORS middleware for all requests
app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // Always set CORS headers
    if (allowedOrigins.includes(origin) || !origin) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    
    next();
});

// Session Configuration
app.use(session({
    secret: process.env.SESS_SECRET,
    resave: false,
    saveUninitialized: true,
    store: store,
    cookie: {
        secure: 'auto'
    }
}))

// Body Parser & Other Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());
app.use(express.json());
app.use(FileUpload());

// ✅ Static Files with explicit CORS handling

// Default static files
app.use(express.static("public", {
    setHeaders: (res, path) => {
        // Set CORS headers for all static files
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
}));

// Images with CORS
app.use("/images", (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
}, express.static("./public/images"));

// ✅ UNIFIED PDF HANDLING - Support both certificates and pdf folders
const setupPDFCORS = (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    
    // Set PDF specific headers
    if (req.url.endsWith('.pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=3600');
    }
    
    next();
};

// Certificates with CORS
app.use("/certificates", setupPDFCORS, express.static("./public/certificates"));

// PDF Files with CORS  
app.use("/pdf", setupPDFCORS, express.static("./public/pdf"));

// Templates with CORS
app.use("/templates", (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
}, express.static("./public/templates"));

// ✅ UNIFIED PDF PROXY ENDPOINT - Handles both certificate and submodule PDFs
app.post('/pdf-proxy', async (req, res) => {
  try {
    const { pdfUrl } = req.body;
    
    if (!pdfUrl) {
      return res.status(400).json({ error: 'PDF URL is required' });
    }

    console.log('PDF Proxy Request for:', pdfUrl);

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // ✅ ENHANCED: Check if it's a local file (support both certificates and pdf folders)
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

// ✅ Handle OPTIONS requests for PDF proxy
app.options('/pdf-proxy', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(204).end();
});

// ✅ ENHANCED: Direct PDF serving endpoint for both certificates and pdf files
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
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
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

// ✅ Simplified endpoint for backward compatibility
app.get('/pdf-file/:filename', (req, res) => {
  const { filename } = req.params;
  
  // Try certificates first, then pdf folder
  const certPath = path.join(__dirname, 'public', 'certificates', filename);
  const pdfPath = path.join(__dirname, 'public', 'pdf', filename);
  
  if (fs.existsSync(certPath)) {
    // Redirect to the specific folder endpoint
    res.redirect(`/pdf-file/certificates/${filename}`);
  } else if (fs.existsSync(pdfPath)) {
    // Redirect to the specific folder endpoint
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

// ✅ Error handling untuk CORS
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
    console.log("Server Sedang berjalan");
    console.log("PDF Proxy endpoint available at: /pdf-proxy");
    console.log("Direct PDF access available at: /pdf-file/:folder/:filename");
    console.log("Static files: /certificates/* and /pdf/*");
});