import express from "express";
import cors from "cors";
import uploadRouter from "./routes/upload";
import photoRouter from "./routes/photo";
import audioRouter from "./routes/audio";
import playRouter from "./routes/play";
import useRouter from "./routes/use";
import favoritesRouter from "./routes/favorites";
import materialsRouter from "./routes/materials";
import authRouter, { optionalAuth } from "./routes/auth";
import { initDatabase } from "./storage/database/init-tables";

const app = express();
const port = Number(process.env.PORT) || 9091;

// 立即输出启动信息
console.log(`[STARTUP] Starting server on port ${port}...`);

// CORS 配置 - 允许前端域名访问
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // 允许无 origin 的请求（服务器间调用、Postman 等）
    if (!origin) return callback(null, true);
    
    // 允许的域名列表
    const allowedHosts = [
      'ich-client-204193-6-1388119917.sh.run.tcloudbase.com',
      'localhost',
    ];
    
    // 动态允许 coze.site 域名和 tcloudbase.com 域名
    const isAllowed = allowedHosts.some(host => origin.includes(host)) ||
      origin.endsWith('.coze.site') ||
      origin.endsWith('.sh.run.tcloudbase.com');
    
    callback(null, isAllowed);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session'],
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

// Image proxy - for canvas cross-origin access
app.get('/api/v1/imageproxy', async (req, res) => {
  console.log('[IMAGEPROXY] query:', JSON.stringify(req.query), 'path:', req.path, 'originalUrl:', req.originalUrl);
  try {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch image' });
    }
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Image proxy failed' });
  }
});

// API Routes
app.use('/api/v1/upload', uploadRouter);
app.use('/api/v1/photo', photoRouter);
app.use('/api/v1/audio', audioRouter);
app.use('/api/v1/play', playRouter);
app.use('/api/v1/use', useRouter);
app.use('/api/v1/favorites', optionalAuth, favoritesRouter);
app.use('/api/v1/materials', optionalAuth, materialsRouter);
app.use('/api/v1/auth', authRouter);

app.listen(port, async () => {
  console.log(`Server listening at http://localhost:${port}/`);
  // 初始化数据库表
  await initDatabase();
});
