import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Bell, 
  ClipboardList, 
  AlertTriangle, 
  MapPin, 
  FileText, 
  CheckCircle, 
  Clock, 
  X, 
  Award, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { TaskItem } from '../types';
import { getThaiTodayStr } from '../utils/dateUtils';

interface TodayTasksPopupProps {
  isOpen: boolean;
  tasks: TaskItem[];
  onClose: () => void;
  userName: string;
}

export default function TodayTasksPopup({ isOpen, tasks, onClose, userName }: TodayTasksPopupProps) {
  if (!isOpen) return null;

  const todayStr = getThaiTodayStr();
  const todayTasks = tasks.filter(t => {
    const origDate = t.originalDate || t.date;
    if (t.status !== 'ทำแล้ว' && origDate < todayStr) {
      return true; // เลื่อนจากอดีตมาเป็นของวันนี้
    } else if (t.status === 'ทำแล้ว') {
      return origDate === todayStr; // ถ้าทำแล้ว ให้ยึดตามวันที่บันทึกไว้จริง
    }
    return origDate === todayStr;
  });

  // Format date to Thai Buddhist Era
  const getThaiDateString = () => {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('th-TH', {
        timeZone: 'Asia/Bangkok',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      return formatter.format(now);
    } catch (e) {
      return todayStr;
    }
  };

  // Map Task Type to Icon
  const getTaskIcon = (type: string) => {
    const iconClass = "w-5 h-5 flex-shrink-0";
    switch (type) {
      case 'เร่งด่วน':
      case 'งานด่วน/เร่งด่วน':
        return <AlertTriangle className={`${iconClass} text-red-600 animate-pulse`} />;
      case 'นัดหมาย/ประชุม':
        return <Calendar className={`${iconClass} text-sky-500`} />;
      case 'งานลงพื้นที่':
        return <MapPin className={`${iconClass} text-emerald-500`} />;
      case 'เอกสาร/รายงาน':
        return <FileText className={`${iconClass} text-orange-500`} />;
      default:
        return <ClipboardList className={`${iconClass} text-orange-500`} />;
    }
  };

  // Map Task Type to Category Tag Style
  const getCategoryStyle = (type: string) => {
    switch (type) {
      case 'เร่งด่วน':
      case 'งานด่วน/เร่งด่วน':
        return 'bg-red-50 text-red-700 border-red-100 font-bold animate-pulse shadow-sm';
      case 'นัดหมาย/ประชุม':
        return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'งานลงพื้นที่':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'เอกสาร/รายงาน':
        return 'bg-orange-50 text-orange-700 border-orange-100';
      default:
        return 'bg-orange-50 text-orange-700 border-orange-100';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-orange-950/40 backdrop-blur-md">
        {/* Backdrop for click away */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 cursor-default"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative bg-orange-50/95 backdrop-blur-sm rounded-[2.5rem] border-4 border-white shadow-[0_25px_50px_-12px_rgba(234,88,12,0.25)] p-6 sm:p-8 max-w-lg w-full mx-auto z-10 overflow-hidden font-sans text-gray-800"
        >
          {/* Top Banner Accent */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 z-10" />

          {/* Close button top right */}
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 bg-white/60 hover:bg-white p-2 rounded-full transition-all hover:rotate-90 active:scale-90"
            title="ปิด"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header section with profile greeting */}
          <div className="flex flex-col items-center text-center mb-6 border-b-2 border-white pb-5">
            <div className="relative mb-3 mt-2">
              {/* Outer glowing ring */}
              <div className="absolute inset-0 rounded-full bg-orange-500/20 blur-md animate-pulse" />
              {/* Animated Ring icon container */}
              <div className="relative bg-gradient-to-tr from-orange-500 to-amber-400 text-white p-3.5 rounded-full ring-4 ring-white shadow-md">
                <Bell className="w-8 h-8 animate-[swing_1.5s_ease-in-out_infinite]" />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 border-2 border-white rounded-full p-1 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            <p className="text-xs font-sans font-semibold text-gray-500 tracking-wide">
              สวัสดีเจ้าหน้าที่ อบต.ม่อนจอง 👋
            </p>
            <h3 className="font-heading text-xl font-extrabold text-orange-950 mt-1">
              {userName}
            </h3>

            <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 bg-white rounded-full text-xs text-orange-800 font-bold border border-orange-200/50 shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-orange-600" />
              <span>{getThaiDateString()}</span>
            </div>
          </div>

          {/* Tasks List Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="font-heading font-black text-gray-800 text-xs sm:text-sm">
                ตารางปฏิบัติงานประจำวันนี้ ({todayTasks.length})
              </span>
              <span className="text-[10px] sm:text-xs text-gray-400 font-sans font-semibold">
                สถานะภารกิจ
              </span>
            </div>

            {todayTasks.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                {todayTasks.map((taskItem, idx) => (
                  <motion.div
                    key={taskItem.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-start gap-3 p-3 bg-white hover:bg-orange-100/30 rounded-2xl border border-white/80 transition duration-200 shadow-sm"
                  >
                    {getTaskIcon(taskItem.type)}
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 font-sans line-clamp-2 leading-relaxed">
                        {taskItem.task}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getCategoryStyle(taskItem.type)}`}>
                          {(taskItem.type as string) === 'งานด่วน/เร่งด่วน' ? 'เร่งด่วน' : taskItem.type}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex-shrink-0 pt-0.5">
                      {taskItem.status === 'ทำแล้ว' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle className="w-3 h-3" />
                          เสร็จสิ้น
                        </span>
                      ) : taskItem.status === 'กำลังดำเนินการ' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                          <Clock className="w-3 h-3" />
                          กำลังทำ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                          <Clock className="w-3 h-3" />
                          ยังไม่เริ่ม
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center p-6 bg-white/80 border border-white rounded-2xl text-center shadow-inner"
              >
                <div className="bg-orange-100 p-3 rounded-full mb-3 text-orange-600">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <h4 className="font-heading font-bold text-orange-950 text-sm mb-1">
                  ไม่มีตารางงานวันนี้
                </h4>
                <p className="text-[11px] text-orange-800/80 font-sans max-w-xs leading-relaxed font-semibold">
                  ยอดเยี่ยม! ไม่มีงานค้างในวันนี้ ขอให้ปฏิบัติภารกิจเตรียมพร้อมรับเหตุอัคคีภัย/กู้ชีพกู้ภัยอย่างปลอดภัยและมีความสุข
                </p>
              </motion.div>
            )}
          </div>

          {/* Action button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="w-full py-3 px-6 font-heading font-black text-xs sm:text-sm text-white rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 shadow-[0_4px_0_0_#ea580c] active:translate-y-[2px] active:shadow-[0_2px_0_0_#ea580c] transition duration-150 focus:outline-none"
          >
            ตกลง ✖
          </motion.button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
