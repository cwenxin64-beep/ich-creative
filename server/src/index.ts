import express from "express";
import cors from "cors";
import uploadRouter from "./routes/upload";
import photoRouter from "./routes/photo";
import audioRouter from "./routes/audio";
import playRouter from "./routes/play";
import useRouter from "./routes/use";
import favoritesRouter from "./routes/favorites";

const app = express();
const port = Number(process.env.PORT) || 5000;

// 立即输出启动信息
console.log(`[STARTUP] Starting server on port ${port}...`);

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

// 网络连通性测试
app.get('/api/v1/network-test', async (req, res) => {
  console.log('Network test started');
  const results: any = { tests: [], timestamp: new Date().toISOString() };
  
  // 测试 1: DNS 解析
  try {
    const dns = await import('dns');
    const lookupAsync = (hostname: string) => new Promise((resolve, reject) => {
      dns.lookup(hostname, (err, address) => {
        if (err) reject(err);
        else resolve(address);
      });
    });
    const ip = await lookupAsync('ark.cn-beijing.volces.com');
    results.tests.push({ name: 'DNS', status: 'ok', result: ip });
  } catch (error: any) {
    results.tests.push({ name: 'DNS', status: 'failed', error: error.message });
  }
  
  // 测试 2: TCP 连接
  try {
    const net = await import('net');
    const connectAsync = (host: string, port: number) => new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(10000);
      socket.connect(port, host, () => {
        socket.destroy();
        resolve('connected');
      });
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Connection timeout'));
      });
      socket.on('error', reject);
    });
    await connectAsync('ark.cn-beijing.volces.com', 443);
    results.tests.push({ name: 'TCP', status: 'ok', result: 'connected to ark.cn-beijing.volces.com:443' });
  } catch (error: any) {
    results.tests.push({ name: 'TCP', status: 'failed', error: error.message });
  }
  
  // 测试 3: HTTPS 请求
  try {
    const response = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'ark.cn-beijing.volces.com',
        path: '/api/v3/chat/completions',
        method: 'POST',
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      req.write('{}');
      req.end();
    });
    results.tests.push({ name: 'HTTPS', status: 'ok', result: response });
  } catch (error: any) {
    results.tests.push({ name: 'HTTPS', status: 'failed', error: error.message });
  }
  
  console.log('Network test completed:', JSON.stringify(results, null, 2));
  res.json(results);
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
