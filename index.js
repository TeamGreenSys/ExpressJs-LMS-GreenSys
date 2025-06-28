const express = require("express");
const bodyParser = require('body-parser');
const dotenv = require("dotenv");
const path = require('path');
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

app.use(cors({
    origin: function (origin, callback) {
        if (allowedOrigins.includes(origin) || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    next();
});

app.options('*', cors({
    origin: allowedOrigins,
    credentials: true,
}));

app.use(session({
    secret: process.env.SESS_SECRET,
    resave: false,
    saveUninitialized: true,
    store: store,
    cookie: {
        secure: 'auto'
    }
}))

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());
app.use(express.json());
app.use(FileUpload());
app.use(express.static("public"));
app.use("/images", express.static("./public/images"))
app.use("/certificates", (req, res, next) => {
  const filePath = path.join(__dirname, 'public', 'certificates', req.url);
  if (filePath.endsWith('.pdf')) {
    res.setHeader('Content-Type', 'application/pdf');
  }
  next();
}, express.static("./public/certificates"));
app.use("/templates", express.static("./public/templates"))

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

app.listen(process.env.APP_PORT, ()=> console.log("Server Sedang berjalan"));