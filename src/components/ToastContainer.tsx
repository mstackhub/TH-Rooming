'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useApp();

  return (
    <div id="toast-container" className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 w-[calc(100%-32px)] sm:w-80 max-w-sm z-[99] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => {
        let bgColor = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200';
        let Icon = Info;
        let iconColor = 'text-blue-500';

        if (toast.type === 'success') {
          bgColor = 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-950 dark:text-emerald-300';
          Icon = CheckCircle;
          iconColor = 'text-emerald-500';
        } else if (toast.type === 'error') {
          bgColor = 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 text-rose-950 dark:text-rose-300';
          Icon = XCircle;
          iconColor = 'text-rose-500';
        } else if (toast.type === 'warning') {
          bgColor = 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 text-amber-950 dark:text-amber-300';
          Icon = AlertTriangle;
          iconColor = 'text-amber-500';
        }

        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-3.5 rounded-xl border shadow-lg ${bgColor} pointer-events-auto animate-in slide-in-from-bottom-3 duration-250`}
          >
            <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 text-xs font-semibold leading-normal">{toast.msg}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
