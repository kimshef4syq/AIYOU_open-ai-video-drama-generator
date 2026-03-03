/**
 * LLM/图片生成 API 提供商基础接口
 * 所有提供商必须实现此接口
 */

import { LLMProviderType } from '../../types';

/**
 * 图片生成选项
 */
export interface GenerateImageOptions {
  referenceImages?: string[];
  aspectRatio?: string;
  resolution?: string;
  count?: number;
}

/**
 * 内容生成选项
 */
export interface GenerateContentOptions {
  responseMimeType?: string;
  systemInstruction?: string;
}

/**
 * LLM 提供商接口
 */
export interface LLMProvider {
  /**
   * 获取提供商类型
   */
  getType(): LLMProviderType;

  /**
   * 获取提供商名称
   */
  getName(): string;

  /**
   * 获取客户端实例（用于兼容现有代码）
   * 注意：云雾提供商可能返回 null，因为它不支持 GoogleGenAI SDK
   */
  getClient(): any;

  /**
   * 生成文本内容
   */
  generateContent(
    prompt: string,
    model: string,
    options?: GenerateContentOptions
  ): Promise<string>;

  /**
   * 生成图片（返回图片数组）
   */
  generateImages(
    prompt: string,
    model: string,
    referenceImages?: string[],
    options?: GenerateImageOptions
  ): Promise<string[]>;

  /**
   * 验证 API Key
   */
  validateApiKey(apiKey: string): Promise<boolean>;
}

/**
 * 将图片（Base64 data URI 或 URL）转为纯 Base64 字符串
 * - data:image/...;base64,xxx → 提取 xxx
 * - http(s)://... → fetch 后转 Base64
 * - 其他（已是纯 Base64）→ 原样返回
 */
export async function imageToBase64(imageRef: string): Promise<{ data: string; mimeType: string }> {
  // 已经是 data URI
  if (imageRef.startsWith('data:')) {
    const match = imageRef.match(/^data:(image\/\w+);base64,(.+)$/);
    if (match) {
      return { data: match[2], mimeType: match[1] };
    }
    // 格式异常的 data URI，尝试提取
    return { data: imageRef.split(',')[1] || imageRef, mimeType: 'image/jpeg' };
  }

  // 是 URL，fetch 后转 Base64
  if (imageRef.startsWith('http://') || imageRef.startsWith('https://')) {
    const response = await fetch(imageRef);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const blob = await response.blob();
    const mimeType = blob.type || 'image/jpeg';
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    return { data: base64, mimeType };
  }

  // 已经是纯 Base64
  return { data: imageRef, mimeType: 'image/jpeg' };
}
