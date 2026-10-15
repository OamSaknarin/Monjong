import React from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

interface CenteredAlertProps {
  isOpen: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export default function CenteredAlert({ isOpen, message, type, onClose }: CenteredAlertProps) {
  if (!isOpen) return null;

  const iconMap = {
    success: <CheckCircle className="w-10 h-10 text-emerald-500" />,
    error: <AlertCircle className="w-10 h-10 text-rose-500" />,
    info: <Info className="w-10 h-10 text-amber-500" />,
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl border-2 border-orange-200 p-6 shadow-2xl flex flex-col items-center gap-4 max-w-sm w-full mx-4">
        {iconMap[type]}
        <p className="text-center text-gray-800 font-heading font-medium">{message}</p>
        <button
          onClick={onClose}
          className="px-6 py-2 bg-orange-500 text-white rounded-xl font-heading font-semibold hover:bg-orange-600 transition"
        >
          ตกลง
        </button>
      </div>
    </div>
  );
}
