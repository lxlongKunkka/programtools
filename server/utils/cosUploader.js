import COS from 'cos-nodejs-sdk-v5';
import axios from 'axios';
import { COS_CONFIG } from '../config.js';
import path from 'path';

// 初始化 COS 客户端
const cos = new COS({
  SecretId: COS_CONFIG.SecretId,
  SecretKey: COS_CONFIG.SecretKey,
});

/**
 * 上传图片到腾讯云 COS
 * @param {Buffer|string} imageBuffer - 图片 Buffer 或 Base64
 * @param {string} fileName - 文件名
 * @returns {Promise<string>} 返回图片 URL
 */
export async function uploadImageToCos(imageBuffer, fileName) {
  if (!COS_CONFIG.SecretId || !COS_CONFIG.SecretKey || !COS_CONFIG.Bucket) {
    console.warn('COS 配置不完整，跳过图片上传');
    return null;
  }

  try {
    // 生成存储路径：gesp-images/年月日/随机文件名
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randomStr = Math.random().toString(36).substring(2, 15);
    const ext = path.extname(fileName) || '.png';
    const cosKey = `gesp-images/${dateStr}/${randomStr}${ext}`;

    // 上传到 COS
    const result = await new Promise((resolve, reject) => {
      cos.putObject({
        Bucket: COS_CONFIG.Bucket,
        Region: COS_CONFIG.Region,
        Key: cosKey,
        Body: imageBuffer,
        ContentType: getImageContentType(ext),
      }, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    // 返回图片 URL（优先使用自定义域名）
    const domain = COS_CONFIG.Domain || `https://${result.Location.split('/').slice(2).join('/')}`;
    return domain.startsWith('http') ? domain : `https://${domain}`;
  } catch (error) {
    console.error('上传图片到 COS 失败:', error);
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
    // Base64 编码
    if (src.startsWith('data:image/')) {
      const base64Data = src.split(',')[1];
      return Buffer.from(base64Data, 'base64');
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
      return Buffer.from(response.data);
    }

    console.warn('不支持的图片源:', src);
    return null;
  } catch (error) {
    console.error('下载图片失败:', src, error.message);
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
 * 获取图片扩展名
 */
function getImageExtension(src) {
  const match = src.match(/\.(jpg|jpeg|png|gif|webp|svg)/i);
  return match ? `.${match[1].toLowerCase()}` : '.png';
}
