/**
 * 媒体存储服务 — 将 base64 媒体上传到本地服务端，返回 HTTP URL
 *
 * 替代直接将 base64 写入 node.data → Zustand persist → localStorage 的旧模式。
 * 上传后 node.data 中只保存轻量的 URL 字符串。
 */

import { getSyncProjectId } from './syncMiddleware';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3002/api';

interface UploadOptions {
  nodeId?: string;
  projectId?: string;
  type?: 'image' | 'video' | 'audio';
}

/**
 * 判断字符串是否为 base64 数据（data URI 或纯 base64）
 */
export function isBase64Data(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  if (str.startsWith('data:')) return true;
  // 纯 base64 通常很长且只含合法字符
  if (str.length > 200 && /^[A-Za-z0-9+/=]+$/.test(str.slice(0, 100))) return true;
  return false;
}

/**
 * 将单个 base64 媒体上传到服务端
 * @param base64 - data:image/png;base64,... 格式或纯 base64
 * @param options - 可选的 nodeId、projectId、type
 * @returns 服务端 URL（如 http://localhost:3002/uploads/...）；失败时返回原始 base64
 */
export async function uploadMediaToServer(
  base64: string,
  options: UploadOptions = {}
): Promise<string> {
  // 如果不是 base64，直接返回（可能已经是 URL）
  if (!isBase64Data(base64)) {
    return base64;
  }

  const projectId = options.projectId || getSyncProjectId() || 'default';
  const type = options.type || detectMediaType(base64);

  try {
    const response = await fetch(`${API_BASE}/media/upload-base64`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: base64,
        node_id: options.nodeId,
        project_id: projectId,
        type,
      }),
    });

    const result = await response.json();
    if (result.success && result.data?.url) {
      return result.data.url;
    }

    console.warn('[MediaStorage] 上传失败，降级使用 base64:', result.error);
    return base64;
  } catch (error) {
    console.warn('[MediaStorage] 上传异常，降级使用 base64:', error);
    return base64;
  }
}

/**
 * 批量上传多个 base64 媒体
 * @param base64Array - base64 字符串数组
 * @param options - 共享的上传选项
 * @returns URL 数组（失败的项保留原始 base64）
 */
export async function uploadMultipleMedia(
  base64Array: string[],
  options: UploadOptions = {}
): Promise<string[]> {
  return Promise.all(
    base64Array.map(b64 => uploadMediaToServer(b64, options))
  );
}

/**
 * 从 data URI 推断媒体类型
 */
function detectMediaType(base64: string): 'image' | 'video' | 'audio' {
  if (base64.startsWith('data:video/')) return 'video';
  if (base64.startsWith('data:audio/')) return 'audio';
  return 'image';
}
