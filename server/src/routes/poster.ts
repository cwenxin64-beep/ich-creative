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
    const {
      title = '非遗创意作品',
      description = '我用智能非遗创作了一幅非遗风格作品，快来看看！',
      imageUrl,
      shareUrl,
      width = 750,
    } = req.body;

    const posterWidth = Number(width) || 750;
    const padding = 40;
    const contentWidth = posterWidth - padding * 2;

    // ========== 第一步：计算布局（关键：先算好所有 Y 坐标）==========
    const titleFontSize = 38;
    const descFontSize = 20;
    const qrLabelFontSize = 14;
    const tipFontSize = 13;
    const brandFontSize = 14;
    const qrSize = 180;            // QR 码边长
    const qrPadding = 14;          // QR 白色背景内边距
    const qrBoxSize = qrSize + qrPadding * 2;  // 白色方框尺寸
    const sectionGap = 22;         // 各部分之间的间距

    // 1. 尝试下载作品图片，拿到真实尺寸
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

    // 2. 计算图片显示尺寸（按内容区缩放，最大高度 360）
    const maxImageHeight = 360;
    let displayImageW = 0;
    let displayImageH = 0;
    if (imageBuffer && imageWidth > 0 && imageHeight > 0) {
      const scaleW = contentWidth / imageWidth;
      const scaleH = maxImageHeight / imageHeight;
      const scale = Math.min(scaleW, scaleH, 1);
      displayImageW = Math.round(imageWidth * scale);
      displayImageH = Math.round(imageHeight * scale);
    } else {
      // 无图片时的占位高度
      displayImageH = 140;
    }

    // 3. 累加 Y 坐标（每段：内容高度 + 段间距）
    let curY = padding;
    const titleY = curY;
    curY += titleFontSize + sectionGap;
    const descY = curY;
    curY += descFontSize + sectionGap + 4;
    const imageY = curY;
    curY += displayImageH + sectionGap + 8;
    const qrY = curY;
    curY += qrBoxSize + 6;                         // QR 白色方框（含 padding）
    const qrLabelY = curY;
    curY += qrLabelFontSize + sectionGap - 6;
    const tipY = curY;
    curY += tipFontSize + 4;
    const brandY = curY;
    curY += brandFontSize + padding;

    // 4. 实际画布高度 = 累加结果（自适应）
    const posterHeight = curY;

    console.log(`[Poster] Layout: title=${titleY} desc=${descY} image=${imageY}(${displayImageW}x${displayImageH}) qr=${qrY}(${qrBoxSize}) label=${qrLabelY} tip=${tipY} brand=${brandY} total=${posterHeight}`);

    // ========== 第二步：生成 QR 码 PNG buffer ==========
    // 生成时使用 qrSize 尺寸（含 margin），然后 sharp resize 到精确尺寸保证不超出白色方框
    const rawQrBuffer = await QRCode.toBuffer(shareUrl || 'https://example.com', {
      width: qrSize,
      margin: 0,  // 不加 margin，sharp resize 时会精确控制大小
      errorCorrectionLevel: 'H',  // 高容错率，扫码更稳定
      color: { dark: '#000000', light: '#ffffff' },
    });
    // 显式 resize 到 qrSize x qrSize，确保合成时尺寸精确
    const qrBuffer = await sharp(rawQrBuffer)
      .resize(qrSize, qrSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toBuffer();

    // ========== 第三步：构造所有合成图层 ==========
    const composites: sharp.OverlayOptions[] = [];

    // (1) 标题
    const titleSvg = Buffer.from(
      `<svg width="${posterWidth}" height="${titleFontSize + 12}" xmlns="http://www.w3.org/2000/svg">
        <text x="${posterWidth / 2}" y="${titleFontSize}" text-anchor="middle"
          font-family="Noto Sans CJK SC, sans-serif" font-size="${titleFontSize}" font-weight="700" fill="#ffffff">${escapeXml(title)}</text>
      </svg>`
    );
    composites.push({ input: titleSvg, top: titleY, left: 0 });

    // (2) 描述
    const descSvg = Buffer.from(
      `<svg width="${posterWidth}" height="${descFontSize + 10}" xmlns="http://www.w3.org/2000/svg">
        <text x="${posterWidth / 2}" y="${descFontSize}" text-anchor="middle"
          font-family="Noto Sans CJK SC, sans-serif" font-size="${descFontSize}" fill="#D4A574">${escapeXml(description)}</text>
      </svg>`
    );
    composites.push({ input: descSvg, top: descY, left: 0 });

    // (3) 作品图片（带圆角）
    if (imageBuffer && displayImageW > 0 && displayImageH > 0) {
      const resizedImage = await sharp(imageBuffer)
        .resize(displayImageW, displayImageH, { fit: 'inside' })
        .png()
        .toBuffer();
      const actualMeta = await sharp(resizedImage).metadata();
      const actualW = actualMeta.width || displayImageW;
      const actualH = actualMeta.height || displayImageH;
      // 圆角遮罩
      const roundedMask = Buffer.from(
        `<svg width="${actualW}" height="${actualH}" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="${actualW}" height="${actualH}" rx="16" ry="16"/>
        </svg>`
      );
      const roundedImage = await sharp(resizedImage)
        .composite([{ input: roundedMask, blend: 'dest-in' }])
        .png()
        .toBuffer();
      composites.push({
        input: roundedImage,
        top: imageY,
        left: Math.round((posterWidth - actualW) / 2),
      });
    } else {
      // 占位
      const placeholderW = contentWidth;
      const placeholderH = displayImageH;
      const placeholderSvg = Buffer.from(
        `<svg width="${placeholderW}" height="${placeholderH}" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="${placeholderW}" height="${placeholderH}" rx="16" ry="16" fill="#2a2a4e"/>
          <text x="${placeholderW / 2}" y="${placeholderH / 2 + 6}" text-anchor="middle"
            font-family="Noto Sans CJK SC, sans-serif" font-size="20" fill="#D4A574">非遗创意作品</text>
        </svg>`
      );
      composites.push({ input: placeholderSvg, top: imageY, left: padding });
    }

    // (4) QR 码（白色圆角背景 + 黑色 QR）
    const qrBoxX = Math.round((posterWidth - qrBoxSize) / 2);
    // 白色背景方框
    const qrBgSvg = Buffer.from(
      `<svg width="${qrBoxSize}" height="${qrBoxSize}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${qrBoxSize}" height="${qrBoxSize}" rx="14" ry="14" fill="#ffffff"/>
      </svg>`
    );
    composites.push({ input: qrBgSvg, top: qrY, left: qrBoxX });
    // QR 码本体（居中放在白色方框内）
    composites.push({
      input: qrBuffer,
      top: qrY + qrPadding,
      left: qrBoxX + qrPadding,
    });

    // (5) "扫码查看作品" 标签
    const qrLabelSvg = Buffer.from(
      `<svg width="${posterWidth}" height="${qrLabelFontSize + 8}" xmlns="http://www.w3.org/2000/svg">
        <text x="${posterWidth / 2}" y="${qrLabelFontSize}" text-anchor="middle"
          font-family="Noto Sans CJK SC, sans-serif" font-size="${qrLabelFontSize}" fill="#A8A8B8">扫码查看作品</text>
      </svg>`
    );
    composites.push({ input: qrLabelSvg, top: qrLabelY, left: 0 });

    // (6) 提示文字
    const tipSvg = Buffer.from(
      `<svg width="${posterWidth}" height="${tipFontSize + 8}" xmlns="http://www.w3.org/2000/svg">
        <text x="${posterWidth / 2}" y="${tipFontSize}" text-anchor="middle"
          font-family="Noto Sans CJK SC, sans-serif" font-size="${tipFontSize}" fill="#888899">长按保存图片 · 打开微信发送给好友</text>
      </svg>`
    );
    composites.push({ input: tipSvg, top: tipY, left: 0 });

    // (7) 品牌文字（底部）
    const brandSvg = Buffer.from(
      `<svg width="${posterWidth}" height="${brandFontSize + 6}" xmlns="http://www.w3.org/2000/svg">
        <text x="${posterWidth / 2}" y="${brandFontSize}" text-anchor="middle"
          font-family="Noto Sans CJK SC, sans-serif" font-size="${brandFontSize}" fill="#555566">智能非遗 · 让非遗"活"在当代</text>
      </svg>`
    );
    composites.push({ input: brandSvg, top: brandY, left: 0 });

    // ========== 第四步：构造背景并合成 ==========
    const backgroundSvg = Buffer.from(
      `<svg width="${posterWidth}" height="${posterHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#1a1a2e"/>
            <stop offset="50%" stop-color="#1f2347"/>
            <stop offset="100%" stop-color="#16213e"/>
          </linearGradient>
        </defs>
        <rect width="${posterWidth}" height="${posterHeight}" fill="url(#bg)"/>
        <rect x="0" y="0" width="${posterWidth}" height="4" fill="#D4A574"/>
      </svg>`
    );

    const posterBuffer = await sharp(backgroundSvg)
      .composite(composites)
      .png()
      .toBuffer();

    const base64 = `data:image/png;base64,${posterBuffer.toString('base64')}`;
    res.json({ success: true, dataUrl: base64, width: posterWidth, height: posterHeight });
  } catch (error) {
    console.error('[Poster] Generation error:', error);
    res.status(500).json({ error: '海报生成失败', detail: (error as Error).message });
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
