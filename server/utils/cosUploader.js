import axios from 'axios';
import { COS_CONFIG } from '../config.js';
import path from 'path';
import { buildCosObjectUrl, isCosConfigured, uploadObjectToCos } from './cosClient.js';

/**
 * 上传图片到腾讯云 COS
 * @param {Buffer|string} imageBuffer - 图片 Buffer 或 Base64
 * @param {string} fileName - 文件名
 * @returns {Promise<string>} 返回图片 URL
 */
export async function uploadImageToCos(imageBuffer, fileName) {
  if (!isCosConfigured()) {
    console.warn('[COS上传] 配置不完整，跳过图片上传');
    console.warn('[COS上传] SecretId:', !!COS_CONFIG.SecretId, 'SecretKey:', !!COS_CONFIG.SecretKey, 'Bucket:', COS_CONFIG.Bucket);
    return null;
  }

  try {
    // 生成存储路径：gesp-images/年月日/随机文件名
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randomStr = Math.random().toString(36).substring(2, 15);
    const ext = path.extname(fileName) || '.png';
    const cosKey = `gesp-images/${dateStr}/${randomStr}${ext}`;

    console.log(`[COS上传] 开始上传: ${cosKey}, 大小: ${imageBuffer.length} 字节`);

    // 上传到 COS
    const result = await uploadObjectToCos({
      key: cosKey,
      body: imageBuffer,
      contentType: getImageContentType(ext)
    })
    console.log('[COS上传] 直传返回:', result)

    // 返回图片 URL
    const finalUrl = result.url || buildCosObjectUrl(cosKey)

    console.log(`[COS上传] 最终 URL: ${finalUrl}`);
    return finalUrl;
  } catch (error) {
    console.error('[COS上传] 上传图片到 COS 失败:', error);
    return null;
  }
}

/**
 * 根据文件扩展名获取 Content-Type
 */
function getImageContentType(ext) {
  const types = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };
  return types[ext.toLowerCase()] || 'image/jpeg';
}

/**
 * 下载图片（支持 HTTP/HTTPS 和 Base64）
 * @param {string} src - 图片 URL 或 Base64
 * @returns {Promise<Buffer|null>} 返回图片 Buffer
 */
export async function downloadImage(src) {
  try {
    console.log(`[下载图片] 开始下载: ${src}`);
    // Base64 编码
    if (src.startsWith('data:image/')) {
      const base64Data = src.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      console.log(`[下载图片] Base64 图片成功，大小: ${buffer.length} 字节`);
      return buffer;
    }

    // HTTP/HTTPS URL
    if (src.startsWith('http://') || src.startsWith('https://')) {
      const response = await axios.get(src, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      const buffer = Buffer.from(response.data);
      console.log(`[下载图片] URL 图片成功，大小: ${buffer.length} 字节`);
      return buffer;
    }

    console.warn('[下载图片] 不支持的图片源:', src);
    return null;
  } catch (error) {
    console.error('[下载图片] 失败:', src, error.message);
    if (error.response) {
      console.error('[下载图片] HTTP 状态码:', error.response.status);
    }
    return null;
  }
}

/**
 * 处理单个图片：下载并上传到 COS
 * @param {string} src - 原始图片 URL
 * @param {number} index - 图片索引（用于文件名）
 * @returns {Promise<string|null>} 返回 COS URL，失败返回原 src
 */
export async function processSingleImage(src, index) {
  // 下载图片
  const imageBuffer = await downloadImage(src);
  if (!imageBuffer) {
    console.log(`跳过图片 ${index}: 下载失败`);
    return src; // 返回原链接
  }

  // 上传到 COS
  const ext = getImageExtension(src);
  const fileName = `image_${index}${ext}`;
  const cosUrl = await uploadImageToCos(imageBuffer, fileName);

  if (cosUrl) {
    console.log(`✓ 图片 ${index} 上传成功:`, cosUrl);
    return cosUrl;
  }

  console.log(`✗ 图片 ${index} 上传失败，保留原链接`);
  return src;
}

/**
 * 将外部图片 URL 下载后上传到 COS，返回 COS URL
 * 失败时返回 null
 * @param {string} url - 原始图片 URL
 * @returns {Promise<string|null>}
 */
export async function proxyImageToCos(url) {
  if (!isCosConfigured()) return null
  const imageBuffer = await downloadImage(url)
  if (!imageBuffer) return null
  const ext = getImageExtension(url)
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`
  const randomStr = Math.random().toString(36).substring(2, 13)
  const cosKey = `translate-images/${dateStr}/${randomStr}${ext}`
  try {
    const result = await uploadObjectToCos({
      key: cosKey,
      body: imageBuffer,
      contentType: getImageContentType(ext)
    })
    const finalUrl = result.url || buildCosObjectUrl(cosKey)
    console.log(`[proxy-image] ${url} → ${finalUrl}`)
    return finalUrl
  } catch (e) {
    console.error('[proxy-image] 上传失败:', e.message)
    return null
  }
}

/**
 * 获取图片扩展名
 */
function getImageExtension(src) {
  const match = src.match(/\.(jpg|jpeg|png|gif|webp|svg)/i);
  return match ? `.${match[1].toLowerCase()}` : '.png';
}
