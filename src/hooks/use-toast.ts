import { useState, useCallback } from "react";

type ToastVariant = "default" | "destructive" | "success";

interface ToastData {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

let toastCount = 0;

const listeners: Array<(toasts: ToastData[]) => void> = [];
let toasts: ToastData[] = [];

function dispatch(toast: ToastData) {
  toasts = [toast, ...toasts].slice(0, 3);
  listeners.forEach((l) => l(toasts));
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== toast.id);
    listeners.forEach((l) => l(toasts));
  }, toast.duration ?? 4000);
}

export function toast(opts: Omit<ToastData, "id">) {
  dispatch({ id: String(++toastCount), ...opts });
}

export function useToast() {
  const [toastList, setToastList] = useState<ToastData[]>(toasts);

  const subscribe = useCallback(() => {
    listeners.push(setToastList);
    return () => {
      const idx = listeners.indexOf(setToastList);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  useState(subscribe);

  return { toasts: toastList };
}
