import express from "express";
import cors from "cors";
import uploadRouter from "./routes/upload";
import photoRouter from "./routes/photo";
import audioRouter from "./routes/audio";
import playRouter from "./routes/play";
import useRouter from "./routes/use";
import favoritesRouter from "./routes/favorites";

const app = express();
const port = process.env.PORT || 80;

// Middleware
app.use(cors());
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
