/**
 * AIYOU 数据同步工具
 *
 * 提供项目 ID 管理、在线状态管理、全量快照保存等工具函数。
 * 不做自动同步 — 数据只在用户点「保存」时写入数据库。
 *
 * @developer 光波 (a@ggbo.com)
 * @copyright Copyright (c) 2025 光波. All rights reserved.
 */

import type { AppNode, Connection, Group } from '../types';
import { isApiAvailable, saveProjectSnapshot } from './api';

let currentProjectId: string | null = null;
let online = false;

export function setSyncProjectId(id: string | null) {
  currentProjectId = id;
}

export function getSyncProjectId(): string | null {
  return currentProjectId;
}

export async function initSync(): Promise<boolean> {
  online = await isApiAvailable();
  return online;
}

export function isOnline(): boolean {
  return online && currentProjectId !== null;
}

export function setOnlineStatus(status: boolean) {
  online = status;
}

/** 全量快照保存（用户点「保存」时调用） */
export async function syncFullSnapshot(
  nodes: AppNode[],
  connections: Connection[],
  groups: Group[],
) {
  if (!isOnline()) return;
  await saveProjectSnapshot(currentProjectId!, { nodes, connections, groups });
}
