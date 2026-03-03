/**
 * Notification Store - 全局通知/Toast 状态管理
 *
 * @developer 光波 (a@ggbo.com)
 * @description 管理生成失败等通知，支持手动关闭
 */

import { create } from 'zustand';

export type NotificationType = 'error' | 'warning' | 'info' | 'success';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (type: NotificationType, title: string, message: string) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],

  addNotification: (type, title, message) => {
    const notification: Notification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      title,
      message,
      timestamp: Date.now(),
    };
    set((state) => ({
      notifications: [notification, ...state.notifications],
    }));

    // 非错误通知 5 秒后自动消失
    if (type !== 'error') {
      setTimeout(() => {
        useNotificationStore.getState().removeNotification(notification.id);
      }, 5000);
    }
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },
}));

/**
 * 便捷函数：在非组件代码中直接调用
 */
export function notifyError(title: string, message: string) {
  useNotificationStore.getState().addNotification('error', title, message);
}

export function notifyWarning(title: string, message: string) {
  useNotificationStore.getState().addNotification('warning', title, message);
}

export function notifyInfo(title: string, message: string) {
  useNotificationStore.getState().addNotification('info', title, message);
}

export function notifySuccess(title: string, message: string) {
  useNotificationStore.getState().addNotification('success', title, message);
}
