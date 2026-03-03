/**
 * NotificationToast - 全局通知浮层组件
 *
 * @developer 光波 (a@ggbo.com)
 * @description 显示生成失败等通知，固定在屏幕顶部，不会自动消失，需手动点击 X 关闭
 */

import React, { useState, useEffect } from 'react';
import { useNotificationStore, type NotificationType } from '../stores/notification.store';

const typeConfig: Record<NotificationType, { icon: string; bg: string; border: string; text: string }> = {
  error: {
    icon: '✕',
    bg: 'bg-red-900/90',
    border: 'border-red-500/50',
    text: 'text-red-200',
  },
  warning: {
    icon: '⚠',
    bg: 'bg-yellow-900/90',
    border: 'border-yellow-500/50',
    text: 'text-yellow-200',
  },
  info: {
    icon: 'ℹ',
    bg: 'bg-blue-900/90',
    border: 'border-blue-500/50',
    text: 'text-blue-200',
  },
  success: {
    icon: '✓',
    bg: 'bg-green-900/90',
    border: 'border-green-500/50',
    text: 'text-green-200',
  },
};

export const NotificationToast: React.FC = () => {
  const notifications = useNotificationStore((s) => s.notifications);
  const removeNotification = useNotificationStore((s) => s.removeNotification);
  const clearAll = useNotificationStore((s) => s.clearAll);

  if (notifications.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes toast-slide-down {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes toast-fade-out {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-12px); }
        }
      `}</style>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 max-w-[560px] w-full px-4 pointer-events-none">
        {/* 多条通知时显示全部清除按钮 */}
        {notifications.length > 2 && (
          <div className="flex justify-end pointer-events-auto">
            <button
              onClick={clearAll}
              className="text-xs text-gray-400 hover:text-white bg-gray-800/80 px-2 py-1 rounded transition-colors"
            >
              全部清除 ({notifications.length})
            </button>
          </div>
        )}

        {notifications.map((notification) => {
          const config = typeConfig[notification.type];
          const age = Date.now() - notification.timestamp;
          // 非错误通知：4.5s 后开始渐隐（5s 时被移除）
          const isFading = notification.type !== 'error' && age > 4500;
          return (
            <div
              key={notification.id}
              className={`pointer-events-auto ${config.bg} ${config.border} border rounded-lg shadow-2xl backdrop-blur-sm`}
              style={{ animation: isFading ? 'toast-fade-out 0.5s ease-in forwards' : 'toast-slide-down 0.3s ease-out' }}
            >
            <div className="flex items-start gap-3 p-3">
              {/* 类型图标 */}
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                notification.type === 'error' ? 'bg-red-500/30 text-red-300' :
                notification.type === 'warning' ? 'bg-yellow-500/30 text-yellow-300' :
                notification.type === 'info' ? 'bg-blue-500/30 text-blue-300' :
                'bg-green-500/30 text-green-300'
              }`}>
                {config.icon}
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${config.text}`}>
                  {notification.title}
                </div>
                <div className="text-xs text-gray-300 mt-0.5 break-words whitespace-pre-wrap">
                  {notification.message}
                </div>
              </div>

              {/* 关闭按钮 */}
              <button
                onClick={() => removeNotification(notification.id)}
                className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                title="关闭"
              >
                ✕
              </button>
            </div>
          </div>
        );
        })}
      </div>
    </>
  );
};
