import express from "express";
import cors from "cors";
import uploadRouter from "./routes/upload";
import photoRouter from "./routes/photo";
import audioRouter from "./routes/audio";
import playRouter from "./routes/play";
import useRouter from "./routes/use";
import favoritesRouter from "./routes/favorites";

const app = express();
const port = process.env.PORT || 9091;

// CORS 配置 - 允许前端域名访问
const corsOptions = {
  origin: [
    'https://ich-client-204193-6-1388119917.sh.run.tcloudbase.com',
    'http://localhost:8081',
    'http://localhost:19006',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/api/v1/health', (req, res) => {
  console.log('Health check success');
  res.status(200).json({ status: 'ok' });
});

// API Routes
app.use('/api/v1/upload', uploadRouter);
app.use('/api/v1/photo', photoRouter);
app.use('/api/v1/audio', audioRouter);
app.use('/api/v1/play', playRouter);
app.use('/api/v1/use', useRouter);
app.use('/api/v1/favorites', favoritesRouter);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
