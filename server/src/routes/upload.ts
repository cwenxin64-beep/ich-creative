import express, { type Request, type Response } from 'express';
import multer from 'multer';
import axios from 'axios';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

/**
 * POST /api/v1/upload
 * Upload a file (image/video/audio) and return object storage URL
 * Body parameter: file (multipart/form-data)
 * Response: { url: string, key: string, size: number }
 */
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { buffer, originalname, mimetype, size } = req.file;

    // Here you would upload to object storage
    // For now, return a mock URL (in production, integrate with object storage)
    const fileKey = `uploads/${Date.now()}-${originalname}`;
    const mockUrl = `https://mock-storage.example.com/${fileKey}`;

    // TODO: Replace with actual object storage integration
    // const storageService = new StorageService();
    // const { url, key } = await storageService.upload(buffer, originalname, mimetype);

    console.log(`File uploaded: ${originalname}, size: ${size} bytes, type: ${mimetype}`);

    res.json({
      url: mockUrl,
      key: fileKey,
      size,
      mimetype
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Error handling middleware
router.use((err: any, req: Request, res: Response, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File size exceeds 50MB limit' });
    }
    return res.status(400).json({ error: `Multer error: ${err.message}` });
  }
  next(err);
});

export default router;
