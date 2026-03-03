/**
 * 媒体文件上传/管理 API
 * 文件存储到 server/uploads/{type}/{date}/{uuid}.{ext}
 * 数据库存储元数据和访问 URL
 */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDB } from '../db/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
for (const subdir of ['image', 'video', 'audio']) {
  fs.mkdirSync(path.join(UPLOADS_DIR, subdir), { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

const router = Router();

// Helper: determine media type from mime
function getMediaType(mimeType) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'other';
}

// Helper: get file extension from mime
function getExtFromMime(mimeType) {
  const map = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
    'video/mp4': 'mp4', 'video/webm': 'webm',
    'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/mp3': 'mp3',
  };
  return map[mimeType] || 'bin';
}

// POST /api/media/upload - 上传媒体文件
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: '没有上传文件' });

    const { buffer, mimetype, size } = req.file;
    const { node_id, metadata } = req.body;
    const mediaType = getMediaType(mimetype);
    const ext = getExtFromMime(mimetype);
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fileId = uuidv4();
    const relativePath = `${mediaType}/${date}/${fileId}.${ext}`;
    const absolutePath = path.join(UPLOADS_DIR, relativePath);

    // Ensure date directory exists
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

    // Write file to disk
    fs.writeFileSync(absolutePath, buffer);

    // Save metadata to database
    const db = getDB();
    const [record] = await db('media_files').insert({
      id: fileId,
      node_id: node_id || null,
      type: mediaType,
      storage_type: 'local',
      file_path: relativePath,
      url: `/uploads/${relativePath}`,
      mime_type: mimetype,
      file_size: size,
      metadata: JSON.stringify(metadata ? JSON.parse(metadata) : {}),
    }).returning('*');

    res.json({
      success: true,
      data: {
        id: record.id,
        url: record.url,
        type: mediaType,
        size,
        mime_type: mimetype,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/media/upload-base64 - 上传 base64 编码的媒体
// 支持 project_id 参数：有时按 {project_id}/{type}s/ 存储，无时按 {type}/{date}/ 存储
router.post('/upload-base64', async (req, res) => {
  try {
    const { data, node_id, project_id, type, metadata } = req.body;
    if (!data) return res.status(400).json({ success: false, error: '缺少 data 字段' });

    // Parse base64 data URI: data:image/png;base64,xxxxx
    let buffer, mimeType;
    if (data.startsWith('data:')) {
      const matches = data.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) return res.status(400).json({ success: false, error: '无效的 base64 data URI' });
      mimeType = matches[1];
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      // Raw base64 without data URI prefix
      mimeType = type === 'video' ? 'video/mp4' : type === 'audio' ? 'audio/mp3' : 'image/png';
      buffer = Buffer.from(data, 'base64');
    }

    const mediaType = getMediaType(mimeType);
    const ext = getExtFromMime(mimeType);
    const fileId = uuidv4();

    // 有 project_id 时按项目组织：{project_id}/{type}s/{nodeId}-{timestamp}.{ext}
    // 无 project_id 时保持旧路径：{type}/{date}/{uuid}.{ext}
    let relativePath;
    if (project_id) {
      const nodePrefix = node_id ? `${node_id}-` : '';
      const timestamp = Date.now();
      const typeFolder = `${mediaType}s`; // images, videos, audios
      relativePath = `${project_id}/${typeFolder}/${nodePrefix}${timestamp}-${fileId.slice(0, 8)}.${ext}`;
    } else {
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      relativePath = `${mediaType}/${date}/${fileId}.${ext}`;
    }
    const absolutePath = path.join(UPLOADS_DIR, relativePath);

    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, buffer);

    // 构建完整 URL（前端需要绝对 URL 来加载媒体）
    const PORT = process.env.PORT || 3001;
    const fullUrl = `http://localhost:${PORT}/uploads/${relativePath}`;

    const db = getDB();
    const [record] = await db('media_files').insert({
      id: fileId,
      node_id: node_id || null,
      type: mediaType,
      storage_type: 'local',
      file_path: relativePath,
      url: fullUrl,
      mime_type: mimeType,
      file_size: buffer.length,
      metadata: JSON.stringify(metadata || {}),
    }).returning('*');

    res.json({
      success: true,
      data: {
        id: record.id,
        url: fullUrl,
        type: mediaType,
        size: buffer.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/media/node/:nodeId - 获取节点的所有媒体文件
router.get('/node/:nodeId', async (req, res) => {
  try {
    const db = getDB();
    const files = await db('media_files').where({ node_id: req.params.nodeId }).orderBy('created_at', 'desc');
    res.json({ success: true, data: files });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/media/:id - 删除媒体文件
router.delete('/:id', async (req, res) => {
  try {
    const db = getDB();
    const file = await db('media_files').where({ id: req.params.id }).first();
    if (!file) return res.status(404).json({ success: false, error: '文件不存在' });

    // Delete from disk
    if (file.storage_type === 'local' && file.file_path) {
      const absolutePath = path.join(UPLOADS_DIR, file.file_path);
      if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
    }

    // Delete from database
    await db('media_files').where({ id: req.params.id }).del();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
