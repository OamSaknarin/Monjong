import React from 'react';
import { AlertTriangle, Save, Edit2, Trash2, HelpCircle } from 'lucide-react';

export type ConfirmType = 'save' | 'edit' | 'delete' | 'default';

interface CenteredConfirmProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: ConfirmType;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function CenteredConfirm({
  isOpen,
  title,
  message,
  type = 'default',
  confirmText = 'ตกลง',
  cancelText = 'ยกเลิก',
  onConfirm,
  onCancel
}: CenteredConfirmProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'save':
        return (
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100 text-emerald-500 animate-bounce">
            <Save className="w-6 h-6" />
          </div>
        );
      case 'edit':
        return (
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100 text-amber-500">
            <Edit2 className="w-6 h-6" />
          </div>
        );
      case 'delete':
        return (
          <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center border border-rose-100 text-rose-500 animate-pulse">
            <Trash2 className="w-6 h-6" />
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100 text-amber-500">
            <HelpCircle className="w-6 h-6" />
          </div>
        );
    }
  };

  const getConfirmButtonStyles = () => {
    switch (type) {
      case 'delete':
        return 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 text-white';
      case 'save':
        return 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 text-white';
      case 'edit':
        return 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white';
      default:
        return 'bg-orange-500 hover:bg-orange-600 focus:ring-orange-500 text-white';
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border-2 border-orange-100 transform transition-all scale-100 animate-scale-up">
        
        {/* Color stripe based on type */}
        <div className={`h-1.5 w-full ${
          type === 'delete' ? 'bg-rose-500' : 
          type === 'save' ? 'bg-emerald-500' : 
          type === 'edit' ? 'bg-amber-500' : 'bg-orange-500'
        }`} />

        <div className="p-6 flex flex-col items-center text-center">
          {getIcon()}
          
          <h3 className="mt-4 text-lg font-bold font-heading text-gray-900 leading-6">
            {title}
          </h3>
          
          <p className="mt-2 text-sm text-gray-500 font-sans whitespace-pre-line leading-relaxed">
            {message}
          </p>

          <div className="mt-6 flex flex-row items-center justify-center gap-3 w-full">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 font-heading font-medium rounded-xl border border-gray-200 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`flex-1 py-2.5 px-4 font-heading font-semibold rounded-xl transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${getConfirmButtonStyles()}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
