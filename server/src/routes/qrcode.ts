import { Router } from 'express';
import type { Request, Response } from 'express';
import QRCode from 'qrcode';

const router = Router();

/**
 * GET /api/v1/qrcode
 * 生成二维码并返回 base64 data URL
 * Query params:
 *   text - 二维码内容（必填）
 *   size - 二维码尺寸，默认 200
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const text = req.query.text as string;
    const size = parseInt(req.query.size as string) || 200;

    if (!text) {
      return res.status(400).json({ error: 'Missing text parameter' });
    }

    // 在 Node.js 中使用 qrcode 库生成 base64 PNG
    const dataUrl = await QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    });

    res.json({ dataUrl });
  } catch (error) {
    console.error('[QRCODE] Generation error:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

export default router;
