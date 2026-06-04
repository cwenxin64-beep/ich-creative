import { Router } from 'express';
import type { Request, Response } from 'express';
import QRCode from 'qrcode';
import sharp from 'sharp';

const router = Router();

/**
 * POST /api/v1/poster
 * 服务端生成分享海报图片，返回 base64 PNG
 * 
 * Body: { title, description, imageUrl, shareUrl, width?, height? }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title = '智能非遗作品', description = '让非遗"活"在当代', imageUrl, shareUrl, width = 750, height = 1000 } = req.body;

    const posterWidth = Number(width) || 750;
    const posterHeight = Number(height) || 1000;
    const padding = 40;
    const contentWidth = posterWidth - padding * 2;

    // 1. 生成 QR 码 PNG buffer
    const qrSize = 160;
    const qrBuffer = await QRCode.toBuffer(shareUrl || 'https://example.com', {
      width: qrSize,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    });

    // 2. 下载作品图片（如有）
    let imageBuffer: Buffer | null = null;
    let imageWidth = 0;
    let imageHeight = 0;
    if (imageUrl) {
      try {
        const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(8000) });
        if (imgRes.ok) {
          const arrBuf = await imgRes.arrayBuffer();
          imageBuffer = Buffer.from(arrBuf);
          const meta = await sharp(imageBuffer).metadata();
          imageWidth = meta.width || 0;
          imageHeight = meta.height || 0;
        }
      } catch (e) {
        console.warn('[Poster] Failed to load image:', e);
      }
    }

    // 3. 用 sharp 的 SVG 功能绘制布局，然后合成
    // 先构建 SVG 文字层
    const titleFontSize = 36;
    const descFontSize = 20;
    const brandFontSize = 16;

    // 计算图片展示区域
    const maxImageWidth = contentWidth;
    const maxImageHeight = 360;
    let displayImageW = 0;
    let displayImageH = 0;
    if (imageBuffer && imageWidth > 0 && imageHeight > 0) {
      const scaleW = maxImageWidth / imageWidth;
      const scaleH = maxImageHeight / imageHeight;
      const scale = Math.min(scaleW, scaleH, 1);
      displayImageW = Math.round(imageWidth * scale);
      displayImageH = Math.round(imageHeight * scale);
    }

    // 计算各部分 Y 坐标
    let curY = padding;
    const titleY = curY;
    curY += titleFontSize + 10;
    const descY = curY;
    curY += descFontSize + 24;
    const imageY = curY;
    curY += displayImageH + 24;
    // 如果没有图片，放一个占位
    if (!imageBuffer) {
      curY = imageY + 120 + 24;
    }
    const qrY = curY;
    curY += qrSize + 36 + 10;
    const qrLabelY = qrY + qrSize + 6;
    curY += 30;
    const tipY = curY;
    curY += descFontSize + 8;
    const brandY = curY;

    // 使用实际需要的高度（最小化空白）
    const actualHeight = Math.max(brandY + brandFontSize + padding, posterHeight);

    // 构建合成图层列表
    const composites: sharp.OverlayOptions[] = [];

    // 标题文字（SVG）
    const titleSvg = Buffer.from(`<svg width="${posterWidth}" height="${titleFontSize + 10}">
      <text x="${posterWidth / 2}" y="${titleFontSize}" text-anchor="middle" 
        font-family="Noto Sans CJK SC, PingFang SC, Microsoft YaHei, sans-serif" font-size="${titleFontSize}" font-weight="700" fill="#ffffff">${escapeXml(title)}</text>
    </svg>`);
    composites.push({ input: titleSvg, top: titleY, left: 0 });

    // 描述文字
    const descSvg = Buffer.from(`<svg width="${posterWidth}" height="${descFontSize + 10}">
      <text x="${posterWidth / 2}" y="${descFontSize}" text-anchor="middle" 
        font-family="Noto Sans CJK SC, PingFang SC, Microsoft YaHei, sans-serif" font-size="${descFontSize}" fill="#D4A574">${escapeXml(description)}</text>
    </svg>`);
    composites.push({ input: descSvg, top: descY, left: 0 });

    // 作品图片
    if (imageBuffer && displayImageW > 0 && displayImageH > 0) {
      const resizedImage = await sharp(imageBuffer)
        .resize(displayImageW, displayImageH, { fit: 'cover' })
        .png()
        .toBuffer();
      
      // 添加圆角遮罩
      const roundedRect = Buffer.from(`<svg width="${displayImageW}" height="${displayImageH}">
        <rect x="0" y="0" width="${displayImageW}" height="${displayImageH}" rx="16" ry="16"/>
      </svg>`);
      
      const roundedImage = await sharp(resizedImage)
        .composite([{ input: roundedRect, blend: 'dest-in' }])
        .png()
        .toBuffer();

      composites.push({
        input: roundedImage,
        top: imageY,
        left: Math.round((posterWidth - displayImageW) / 2),
      });
    } else {
      // 占位框
      const placeholderW = contentWidth;
      const placeholderH = 120;
      const placeholderSvg = Buffer.from(`<svg width="${placeholderW}" height="${placeholderH}">
        <rect x="0" y="0" width="${placeholderW}" height="${placeholderH}" rx="16" ry="16" fill="#2a2a4e"/>
        <text x="${placeholderW / 2}" y="${placeholderH / 2 + 8}" text-anchor="middle" 
          font-family="Noto Sans CJK SC, PingFang SC, Microsoft YaHei, sans-serif" font-size="18" fill="#D4A574">非遗创意作品</text>
      </svg>`);
      composites.push({ input: placeholderSvg, top: imageY, left: padding });
    }

    // QR 码（白色背景圆角框）
    const qrPadding = 16;
    const qrBoxSize = qrSize + qrPadding * 2;
    const qrBoxX = Math.round((posterWidth - qrBoxSize) / 2);
    
    const qrBoxSvg = Buffer.from(`<svg width="${qrBoxSize}" height="${qrBoxSize + 30}">
      <rect x="0" y="0" width="${qrBoxSize}" height="${qrBoxSize}" rx="12" ry="12" fill="#ffffff"/>
    </svg>`);
    composites.push({ input: qrBoxSvg, top: qrY, left: qrBoxX });
    composites.push({ input: qrBuffer, top: qrY + qrPadding, left: qrBoxX + qrPadding });

    // QR 码标签
    const qrLabelSvg = Buffer.from(`<svg width="${posterWidth}" height="24">
      <text x="${posterWidth / 2}" y="16" text-anchor="middle" 
        font-family="Noto Sans CJK SC, PingFang SC, Microsoft YaHei, sans-serif" font-size="14" fill="#666666">扫码查看作品</text>
    </svg>`);
    composites.push({ input: qrLabelSvg, top: qrLabelY, left: 0 });

    // 提示文字
    const tipSvg = Buffer.from(`<svg width="${posterWidth}" height="24">
      <text x="${posterWidth / 2}" y="16" text-anchor="middle" 
        font-family="Noto Sans CJK SC, PingFang SC, Microsoft YaHei, sans-serif" font-size="13" fill="#D4A574">长按保存图片 → 打开微信发送给好友</text>
    </svg>`);
    composites.push({ input: tipSvg, top: tipY, left: 0 });

    // 品牌文字
    const brandSvg = Buffer.from(`<svg width="${posterWidth}" height="20">
      <text x="${posterWidth / 2}" y="14" text-anchor="middle" 
        font-family="Noto Sans CJK SC, PingFang SC, Microsoft YaHei, sans-serif" font-size="${brandFontSize}" fill="#555555">智能非遗 · 让非遗"活"在当代</text>
    </svg>`);
    composites.push({ input: brandSvg, top: brandY, left: 0 });

    // 4. 生成海报
    // 创建渐变背景
    const backgroundSvg = Buffer.from(`<svg width="${posterWidth}" height="${actualHeight}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1a1a2e"/>
          <stop offset="100%" stop-color="#16213e"/>
        </linearGradient>
      </defs>
      <rect width="${posterWidth}" height="${actualHeight}" fill="url(#bg)"/>
      <rect x="0" y="0" width="${posterWidth}" height="4" fill="#D4A574"/>
    </svg>`);

    const posterBuffer = await sharp(backgroundSvg)
      .composite(composites)
      .png()
      .toBuffer();

    // 5. 返回 base64
    const base64 = `data:image/png;base64,${posterBuffer.toString('base64')}`;
    res.json({ success: true, dataUrl: base64, width: posterWidth, height: actualHeight });
  } catch (error) {
    console.error('[Poster] Generation error:', error);
    res.status(500).json({ error: '海报生成失败' });
  }
});

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default router;
