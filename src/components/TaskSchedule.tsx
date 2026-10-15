import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getThaiDateComponents, getThaiTodayStr } from '../utils/dateUtils';
import { TaskItem, OfficialDoc } from '../types';
import { Calendar as CalendarIcon, Clock, Plus, Trash2, Edit3, Check, MapPin, AlertCircle, FileText, CalendarDays, Download, Printer } from 'lucide-react';
import { exportToExcel } from '../utils/export';
import CenteredAlert from './CenteredAlert';
import { motion, AnimatePresence } from 'motion/react';
import TaskSchedulePdfModal from './TaskSchedulePdfModal';

const THAI_HOLIDAYS: Record<string, { name: string; isPublicHoliday: boolean }> = {
  // วันหยุดคงที่ทุกปี (Fixed solar holidays)
  '01-01': { name: 'วันขึ้นปีใหม่ 🎆', isPublicHoliday: true },
  '01-16': { name: 'วันครู 🍎', isPublicHoliday: false },
  '01-18': { name: 'วันกองทัพไทย 💂‍♂️', isPublicHoliday: false },
  '02-14': { name: 'วันวาเลนไทน์ 💖', isPublicHoliday: false },
  '04-06': { name: 'วันจักรี 👑', isPublicHoliday: true },
  '04-13': { name: 'วันสงกรานต์ 💦', isPublicHoliday: true },
  '04-14': { name: 'วันสงกรานต์ / วันครอบครัว 👨‍👩‍👧‍👦', isPublicHoliday: true },
  '04-15': { name: 'วันสงกรานต์ 💦', isPublicHoliday: true },
  '05-01': { name: 'วันแรงงานแห่งชาติ 🛠️', isPublicHoliday: true },
  '05-04': { name: 'วันฉัตรมงคล 👑', isPublicHoliday: true },
  '06-03': { name: 'วันเฉลิมฯ สมเด็จพระนางเจ้าฯ พระบรมราชินี 👸', isPublicHoliday: true },
  '07-28': { name: 'วันเฉลิมฯ พระบาทสมเด็จพระเจ้าอยู่หัว 👑', isPublicHoliday: true },
  '08-12': { name: 'วันแม่แห่งชาติ / วันเฉลิมฯ สมเด็จพระบรมราชชนนีพันปีหลวง 👩‍👦', isPublicHoliday: true },
  '10-13': { name: 'วันนวมินทรมหาราช 🎗️', isPublicHoliday: true },
  '10-23': { name: 'วันปิยมหาราช 🐎', isPublicHoliday: true },
  '10-31': { name: 'วันฮาโลวีน 🎃', isPublicHoliday: false },
  '12-05': { name: 'วันพ่อแห่งชาติ / วันคล้ายวันพระบรมราชสมภพ ร.9 👨‍👦', isPublicHoliday: true },
  '12-10': { name: 'วันรัฐธรรมนูญ 📜', isPublicHoliday: true },
  '12-25': { name: 'วันคริสต์มาส 🎄', isPublicHoliday: false },
  '12-31': { name: 'วันสิ้นปี ✨', isPublicHoliday: true },

  // ปี 2568 (2025)
  '2025-01-11': { name: 'วันเด็กแห่งชาติ', isPublicHoliday: false },
  '2025-02-12': { name: 'วันมาฆบูชา 🕯️', isPublicHoliday: true },
  '2025-05-09': { name: 'วันพืชมงคล 🌱', isPublicHoliday: true },
  '2025-05-11': { name: 'วันวิสาขบูชา 🪷', isPublicHoliday: true },
  '2025-07-10': { name: 'วันอาสาฬหบูชา 🌅', isPublicHoliday: true },
  '2025-07-11': { name: 'วันเข้าพรรษา 🕯️', isPublicHoliday: true },
  '2025-11-05': { name: 'วันลอยกระทง 🪔', isPublicHoliday: false },

  // ปี 2569 (2026)
  '2026-01-10': { name: 'วันเด็กแห่งชาติ', isPublicHoliday: false },
  '2026-03-03': { name: 'วันมาฆบูชา 🕯️', isPublicHoliday: true },
  '2026-05-11': { name: 'วันพืชมงคล 🌱', isPublicHoliday: true },
  '2026-05-31': { name: 'วันวิสาขบูชา 🪷', isPublicHoliday: true },
  '2026-07-29': { name: 'วันอาสาฬหบูชา 🌅', isPublicHoliday: true },
  '2026-07-30': { name: 'วันเข้าพรรษา 🕯️', isPublicHoliday: true },
  '2026-11-24': { name: 'วันลอยกระทง 🪔', isPublicHoliday: false },

  // ปี 2570 (2027)
  '2027-01-09': { name: 'วันเด็กแห่งชาติ', isPublicHoliday: false },
  '2027-02-21': { name: 'วันมาฆบูชา 🕯️', isPublicHoliday: true },
  '2027-05-12': { name: 'วันพืชมงคล 🌱', isPublicHoliday: true },
  '2027-05-20': { name: 'วันวิสาขบูชา 🪷', isPublicHoliday: true },
  '2027-07-18': { name: 'วันอาสาฬหบูชา 🌅', isPublicHoliday: true },
  '2027-07-19': { name: 'วันเข้าพรรษา 🕯️', isPublicHoliday: true },
  '2027-11-13': { name: 'วันลอยกระทง 🪔', isPublicHoliday: false },
};

interface TaskScheduleProps {
  tasks: TaskItem[];
  onSaveTasks: (updatedTasks: TaskItem[]) => void;
  docs?: OfficialDoc[];
  onSaveDocs?: (updatedDocs: OfficialDoc[]) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  showConfirm: (title: string, message: string, type: 'save' | 'edit' | 'delete' | 'default') => Promise<boolean>;
}

export default function TaskSchedule({ tasks, onSaveTasks, docs, onSaveDocs, showToast, showConfirm }: TaskScheduleProps) {
  const initialThaiDate = getThaiDateComponents();
  const [currentYear, setCurrentYear] = useState(initialThaiDate.year);
  const [currentMonth, setCurrentMonth] = useState(initialThaiDate.month); // 0-11
  const [selectedDateStr, setSelectedDateStr] = useState<string>(initialThaiDate.dateStr);
  
  // Task state
  const [isAdding, setIsAdding] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  
  // Form input fields
  const [taskName, setTaskName] = useState('');
  const [taskStatus, setTaskStatus] = useState<'ยังไม่ได้ทำ' | 'กำลังดำเนินการ' | 'ทำแล้ว'>('ยังไม่ได้ทำ');
  const [taskType, setTaskType] = useState<TaskItem['type']>('ภารกิจทั่วไป');
  
  // Petition Status Sync Modal
  const [showPetitionModal, setShowPetitionModal] = useState(false);
  const [petitionTaskRef, setPetitionTaskRef] = useState<TaskItem | null>(null);
  const [petitionDocRef, setPetitionDocRef] = useState<OfficialDoc | null>(null);
  const [newPetitionStatus, setNewPetitionStatus] = useState<'ช่วยเหลือได้' | 'ช่วยเหลือไม่ได้'>('ช่วยเหลือได้');
  const [noHelpReason, setNoHelpReason] = useState('');
  const [helpDetail, setHelpDetail] = useState('');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Alert state
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Dynamic public holidays state
  const [apiHolidays, setApiHolidays] = useState<Record<string, { name: string; isPublicHoliday: boolean }>>({});
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);

  // Thailand Clock & Auto-Date Update State
  const lastDateRef = useRef(initialThaiDate.dateStr);
  const [thaiTime, setThaiTime] = useState<string>('');
  const [thaiDateStr, setThaiDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const thaiDate = getThaiDateComponents(now);
      const dateStr = thaiDate.dateStr;
      
      // Auto-update selected date when the day rolls over in Thailand time
      if (dateStr !== lastDateRef.current) {
        setTodayStr(dateStr);
        setSelectedDateStr(dateStr);
        setCurrentMonth(thaiDate.month);
        setCurrentYear(thaiDate.year);
        lastDateRef.current = dateStr;
      }

      try {
        const timeFormatter = new Intl.DateTimeFormat('th-TH', {
          timeZone: 'Asia/Bangkok',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        const dateFormatter = new Intl.DateTimeFormat('th-TH', {
          timeZone: 'Asia/Bangkok',
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        setThaiTime(timeFormatter.format(now));
        setThaiDateStr(dateFormatter.format(now));
      } catch (e) {
        setThaiTime(now.toLocaleTimeString('th-TH'));
        setThaiDateStr(now.toLocaleDateString('th-TH'));
      }
    };

    updateTime();
    const clockInterval = setInterval(updateTime, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    let active = true;
    const fetchExternalHolidays = async () => {
      setIsLoadingHolidays(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 seconds timeout
      try {
        const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${currentYear}/TH`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        if (!text || !text.trim()) {
          throw new Error('Empty response received from holidays API');
        }
        
        let data: any;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error(`Invalid JSON format from holidays API: ${text.slice(0, 100)}`);
        }

        if (active && Array.isArray(data)) {
          const apiMap: Record<string, { name: string; isPublicHoliday: boolean }> = {};
          data.forEach((item: any) => {
            if (item && item.date) {
              const holidayName = item.localName || item.name;
              apiMap[item.date] = {
                name: holidayName,
                isPublicHoliday: true
              };
            }
          });
          setApiHolidays(apiMap);
        }
      } catch (err) {
        console.warn('Could not fetch external holidays from API (using static fallback):', err);
      } finally {
        if (active) {
          setIsLoadingHolidays(false);
        }
      }
    };

    fetchExternalHolidays();
    return () => {
      active = false;
    };
  }, [currentYear]);

  const getHolidayForDate = useCallback((dateStr: string) => {
    // 1. Check API fetched holidays first
    if (apiHolidays[dateStr]) {
      return apiHolidays[dateStr];
    }
    
    // 2. Check static exact match (e.g. specific lunar dates for years)
    if (THAI_HOLIDAYS[dateStr]) {
      return THAI_HOLIDAYS[dateStr];
    }
    
    // 3. Check static MM-DD match
    const mmDd = dateStr.slice(5); // Get 'MM-DD'
    if (THAI_HOLIDAYS[mmDd]) {
      return THAI_HOLIDAYS[mmDd];
    }
    
    return null;
  }, [apiHolidays]);


  const monthNamesThai = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const handleExportPdf = () => {
    setIsPdfModalOpen(true);
  };

  const handleExport = () => {
    const data = tasks.map(t => ({
      'วันที่': t.date,
      'ภารกิจ': t.task,
      'สถานะ': t.status,
      'ประเภท': t.type
    }));
    exportToExcel(data, 'ตารางปฏิบัติงาน', 'งานทั้งหมด');
    setAlert({ message: 'ส่งออกไฟล์ Excel เรียบร้อย', type: 'success' });
  };

  const [todayStr, setTodayStr] = useState(() => getThaiTodayStr());

  // (ลบ useEffect ที่เซฟลงฐานข้อมูลอัตโนมัติออกไป เพื่อป้องกันปัญหา Data Race / ข้อมูลมั่ว)

  // แมปงานแต่ละวัน (ใช้ Logic เลื่อนวันอัตโนมัติใน View Layer)
  const tasksByDate = useMemo(() => {
    const map: Record<string, TaskItem[]> = {};
    
    // Sort tasks first by status (ยังไม่ได้ทำ first), then by type (ด่วน first), then by original date
    const sortedTasks = [...tasks].sort((a, b) => {
       if (a.status !== b.status) return a.status === 'ทำแล้ว' ? 1 : -1;
       const isAUrgent = a.type === 'เร่งด่วน' || (a.type as string) === 'งานด่วน/เร่งด่วน';
       const isBUrgent = b.type === 'เร่งด่วน' || (b.type as string) === 'งานด่วน/เร่งด่วน';
       if (isAUrgent !== isBUrgent) return isAUrgent ? -1 : 1;
       const aDate = a.originalDate || a.date;
       const bDate = b.originalDate || b.date;
       if (aDate !== bDate) return aDate.localeCompare(bDate);
       return a.id.localeCompare(b.id);
    });

    sortedTasks.forEach(task => {
      const origDate = task.originalDate || task.date;
      let displayDate = task.date;

      // Logic: ให้งานที่บันทึก จดจำวันที่บันทึกไว้ แล้วจดจำว่า งานนี้ทำไปหรือยัง 
      // ถ้ายังให้งานไหลตามวันปัจจุบัน ถ้าทำแล้ว ให้งานกลับไปอยู่วันเดิมที่บันทึก
      if (task.status !== 'ทำแล้ว' && origDate < todayStr) {
        displayDate = todayStr;
      } else if (task.status === 'ทำแล้ว') {
        displayDate = origDate;
      } else if (origDate >= todayStr) {
        displayDate = origDate; // งานในอนาคตให้อยู่วันเดิม
      }

      if (!map[displayDate]) {
        map[displayDate] = [];
      }
      
      // Inject originalDate into the display task safely
      const displayTask = { ...task, originalDate: origDate, date: displayDate };
      map[displayDate].push(displayTask);
    });
    
    return map;
  }, [tasks, todayStr]);

  const incompleteTaskDates = useMemo(() => {
    return Object.keys(tasksByDate).filter(date => 
      (tasksByDate[date] || []).some(t => t.status !== 'ทำแล้ว')
    ).sort();
  }, [tasksByDate]);

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const startWeekday = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday...
    const numDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];
    
    // เติมวันว่างเดือนก่อนหน้า
    const prevMonthNumDays = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const dayNum = prevMonthNumDays - i;
      const m = currentMonth === 0 ? 11 : currentMonth - 1;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({ dateStr, dayNum, isCurrentMonth: false });
    }
    
    // เติมวันเดือนปัจจุบัน
    for (let i = 1; i <= numDays; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: i, isCurrentMonth: true });
    }
    
    // เติมวันว่างเดือนถัดไปเพื่อให้ครบสัปดาห์ (ใช้ 42 ช่อง/6 แถว เฉพาะเดือนที่ต้องการพื้นที่เพิ่ม เช่น เริ่มวันศุกร์/เสาร์และมี 31 วัน นอกนั้นใช้ 35 ช่อง/5 แถว)
    const totalSlots = days.length > 35 ? 42 : 35;
    const remainingSlots = totalSlots - days.length;
    if (remainingSlots > 0) {
      for (let i = 1; i <= remainingSlots; i++) {
        const m = currentMonth === 11 ? 0 : currentMonth + 1;
        const y = currentMonth === 11 ? currentYear + 1 : currentYear;
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        days.push({ dateStr, dayNum: i, isCurrentMonth: false });
      }
    } else if (days.length > totalSlots) {
      return days.slice(0, totalSlots);
    }
    
    return days;
  }, [currentYear, currentMonth]);


  // งานในวันที่เลือก
  const selectedDayTasks = useMemo(() => {
    return tasksByDate[selectedDateStr] || [];
  }, [tasksByDate, selectedDateStr]);

  const isDayCompleted = useMemo(() => {
    return selectedDayTasks.length > 0 && selectedDayTasks.every(t => t.status === 'ทำแล้ว');
  }, [selectedDayTasks]);

  const handleDayClick = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    setEditingTaskId(null);
    setIsAdding(false);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(taskName || '').trim()) {
      setAlert({ message: 'กรุณากรอกรายการงานที่ต้องทำ', type: 'error' });
      return;
    }
    
    const confirmed = await showConfirm(
      'ยืนยันการเพิ่มงานใหม่',
      `คุณต้องการบันทึกงาน "${(taskName || '').trim()}" ลงในตารางงานใช่หรือไม่?`,
      'save'
    );
    if (!confirmed) return;
    
    const newTask: TaskItem = {
      id: 'task-' + Date.now(),
      date: selectedDateStr,
      originalDate: selectedDateStr,
      task: (taskName || '').trim(),
      status: taskStatus,
      type: taskType
    };

    onSaveTasks([...tasks, newTask]);
    setTaskName('');
    setTaskStatus('ยังไม่ได้ทำ');
    setTaskType('ภารกิจทั่วไป');
    setIsAdding(false);
    showToast('เพิ่มงานสำเร็จเรียบร้อย', 'success');
  };

  const handleEditTaskClick = (task: TaskItem) => {
    setEditingTaskId(task.id);
    setTaskName(String(task.task || ''));
    setTaskStatus(task.status);
    setTaskType(task.type);
  };

  const handleSaveEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(taskName || '').trim()) {
      setAlert({ message: 'กรุณากรอกรายการงาน', type: 'error' });
      return;
    }

    const confirmed = await showConfirm(
      'ยืนยันการแก้ไขข้อมูลงาน',
      'คุณต้องการบันทึกการแก้ไขข้อมูลงานนี้ใช่หรือไม่?',
      'edit'
    );
    if (!confirmed) return;

    if (taskStatus === 'ทำแล้ว' && docs && onSaveDocs) {
      const relatedDoc = docs.find(d => {
        const safeDocSubject = (d.subject || '').trim();
        const safeTaskName = (taskName || '').trim();
        return d.docType === 'แบบคำร้อง' && (
          safeDocSubject === safeTaskName || 
          safeTaskName.includes(safeDocSubject) || 
          (d.subject || '').includes(safeTaskName)
        );
      });
      if (relatedDoc) {
        const dummyTask: TaskItem = {
          id: editingTaskId as string,
          date: selectedDateStr,
          task: (taskName || '').trim(),
          status: taskStatus,
          type: taskType
        };
        setPetitionTaskRef(dummyTask);
        setPetitionDocRef(relatedDoc);
        setNewPetitionStatus(relatedDoc.petitionStatus === 'ช่วยเหลือไม่ได้' ? 'ช่วยเหลือไม่ได้' : 'ช่วยเหลือได้');
        setNoHelpReason(relatedDoc.noHelpReason || '');
        setHelpDetail(relatedDoc.helpDetail || '');
        setShowPetitionModal(true);
        setEditingTaskId(null);
        setTaskName('');
        return; // wait for modal
      }
    }

    const updated = tasks.map(t => {
      if (t.id === editingTaskId) {
        const origDate = t.originalDate || t.date;
        return {
          ...t,
          task: (taskName || '').trim(),
          status: taskStatus,
          type: taskType,
          date: origDate,
          originalDate: origDate
        };
      }
      return t;
    });

    onSaveTasks(updated);
    setEditingTaskId(null);
    setTaskName('');
    showToast('แก้ไขงานเรียบร้อย', 'success');
  };

  const handleDeleteTask = async (id: string) => {
    const taskToDelete = tasks.find(t => t.id === id);
    if (!taskToDelete) return;

    const label = taskToDelete.task;
    
    const confirmed = await showConfirm(
      'ยืนยันการลบงาน',
      `คุณต้องการลบงาน "${label}" ออกจากตารางงานใช่หรือไม่?`,
      'delete'
    );
    if (confirmed) {
      const filtered = tasks.filter(t => t.id !== id);
      onSaveTasks(filtered);
      
      // ลบเอกสารแบบคำร้องที่เชื่อมโยงหากเป็นงานสำรวจ
      if (taskToDelete.type === 'ลงพื้นที่สำรวจ' && docs && onSaveDocs) {
        const relatedDoc = docs.find(d => {
          const safeDocSubject = (d.subject || '').trim();
          const safeTaskName = (taskToDelete.task || '').trim();
          return d.docType === 'แบบคำร้อง' && (
            safeDocSubject === safeTaskName || 
            safeTaskName.includes(safeDocSubject) || 
            (d.subject || '').includes(safeTaskName)
          );
        });
        if (relatedDoc) {
          const updatedDocs = docs.filter(d => d.id !== relatedDoc.id);
          onSaveDocs(updatedDocs);
          showToast(`ลบงานและข้อมูลแบบคำร้อง "${relatedDoc.subject}" สำเร็จ`, 'success');
        } else {
          showToast('ลบรายการงานสำเร็จ', 'success');
        }
      } else {
        showToast('ลบรายการงานสำเร็จ', 'success');
      }
    }
  };

  const handleToggleStatus = (task: TaskItem) => {
    const nextStatus = task.status === 'ทำแล้ว' ? 'ยังไม่ได้ทำ' : 'ทำแล้ว';

    if (nextStatus === 'ทำแล้ว' && docs && onSaveDocs) {
      const relatedDoc = docs.find(d => {
        const safeDocSubject = (d.subject || '').trim();
        const safeTaskName = (task.task || '').trim();
        return d.docType === 'แบบคำร้อง' && (
          safeDocSubject === safeTaskName || 
          safeTaskName.includes(safeDocSubject) || 
          (d.subject || '').includes(safeTaskName)
        );
      });
      if (relatedDoc) {
        setPetitionTaskRef(task);
        setPetitionDocRef(relatedDoc);
        setNewPetitionStatus(relatedDoc.petitionStatus === 'ช่วยเหลือไม่ได้' ? 'ช่วยเหลือไม่ได้' : 'ช่วยเหลือได้');
        setNoHelpReason(relatedDoc.noHelpReason || '');
        setHelpDetail(relatedDoc.helpDetail || '');
        setShowPetitionModal(true);
        return; // wait for modal
      }
    }

    const updated = tasks.map(t => {
      if (t.id === task.id) {
        const origDate = t.originalDate || t.date;
        return { ...t, status: nextStatus as any, date: origDate, originalDate: origDate };
      }
      return t;
    });
    onSaveTasks(updated);
  };

  const handleSavePetitionModal = () => {
    if (!petitionTaskRef || !petitionDocRef || !docs || !onSaveDocs) {
      setShowPetitionModal(false);
      return;
    }

    if (newPetitionStatus === 'ช่วยเหลือไม่ได้' && !(noHelpReason || '').trim()) {
      showToast('กรุณาระบุเหตุผลที่ช่วยเหลือไม่ได้ด้วยค่ะ', 'error');
      return;
    }

    if (newPetitionStatus === 'ช่วยเหลือได้' && !(helpDetail || '').trim()) {
      showToast('กรุณาระบุรายละเอียดการช่วยเหลือด้วยค่ะ', 'error');
      return;
    }

    // Update Doc
    const updatedDocs = docs.map(d => {
      if (d.id === petitionDocRef.id) {
        return {
          ...d,
          petitionStatus: newPetitionStatus,
          noHelpReason: newPetitionStatus === 'ช่วยเหลือไม่ได้' ? (noHelpReason || '').trim() : undefined,
          helpDetail: newPetitionStatus === 'ช่วยเหลือได้' ? (helpDetail || '').trim() : undefined
        };
      }
      return d;
    });
    onSaveDocs(updatedDocs);

    // Update Task
    const updatedTasks = tasks.map(t => {
      if (t.id === petitionTaskRef.id) {
        const origDate = t.originalDate || t.date;
        return { 
          ...t, 
          ...petitionTaskRef,
          status: 'ทำแล้ว' as any,
          date: origDate,
          originalDate: origDate
        };
      }
      return t;
    });
    onSaveTasks(updatedTasks);

    showToast('อัปเดตสถานะภารกิจและแบบคำร้องเรียบร้อย', 'success');
    setShowPetitionModal(false);
    setPetitionTaskRef(null);
    setPetitionDocRef(null);
  };

  const handleCancelPetitionModal = () => {
    // If they cancel, we can just mark the task as done anyway, or not.
    // Let's just mark the task as done, but not update the petition.
    if (petitionTaskRef) {
      const updatedTasks = tasks.map(t => {
        if (t.id === petitionTaskRef.id) {
          const origDate = t.originalDate || t.date;
          return { 
            ...t, 
            ...petitionTaskRef,
            status: 'ทำแล้ว' as any,
            date: origDate,
            originalDate: origDate
          };
        }
        return t;
      });
      onSaveTasks(updatedTasks);
    }
    setShowPetitionModal(false);
    setPetitionTaskRef(null);
    setPetitionDocRef(null);
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'ภารกิจทั่วไป': return <Clock className="w-4 h-4 text-orange-600" />;
      case 'นัดหมาย/ประชุม': return <CalendarDays className="w-4 h-4 text-sky-600" />;
      case 'เร่งด่วน':
      case 'งานด่วน/เร่งด่วน': return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'งานลงพื้นที่': return <MapPin className="w-4 h-4 text-emerald-600" />;
      case 'ลงพื้นที่สำรวจ': return <MapPin className="w-4 h-4 text-purple-600" />;
      case 'เอกสาร/รายงาน': return <FileText className="w-4 h-4 text-orange-600" />;
      default: return <Clock className="w-4 h-4 text-orange-600" />;
    }
  };

  // แมปสีแท็กประเภทงาน
  const getTaskBadgeClass = (type: string) => {
    switch (type) {
      case 'ภารกิจทั่วไป': return 'bg-orange-50 text-orange-700 border border-orange-200';
      case 'นัดหมาย/ประชุม': return 'bg-sky-50 text-sky-700 border border-sky-200';
      case 'เร่งด่วน':
      case 'งานด่วน/เร่งด่วน': return 'bg-red-50 text-red-700 border border-red-200 animate-pulse font-black shadow-sm';
      case 'งานลงพื้นที่': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'ลงพื้นที่สำรวจ': return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'เอกสาร/รายงาน': return 'bg-orange-50 text-orange-700 border border-orange-200';
      default: return 'bg-orange-50 text-orange-700 border border-orange-200';
    }
  };

  // แมปสีสถานะ
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ยังไม่ได้ทำ': return 'bg-slate-100 text-slate-700 border border-slate-300 font-bold';
      case 'กำลังดำเนินการ': return 'bg-sky-100 text-sky-800 border border-sky-300 font-bold';
      case 'ทำแล้ว': return 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold';
      default: return 'bg-slate-100 text-slate-700 border border-slate-300 font-bold';
    }
  };

  const formatThaiDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.getDate()} ${monthNamesThai[d.getMonth()]} พ.ศ. ${d.getFullYear() + 543}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-rose-200 p-3 sm:p-5 md:p-6 shadow-xl relative overflow-hidden w-full max-w-full min-w-0" id="task-schedule-panel">
      {/* Top Gradient Glow Accent Bar */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-rose-500 to-red-600" />
      {/* Background visual graphics */}
      <div className="absolute -top-10 -right-10 w-80 h-80 bg-gradient-to-br from-rose-500/10 to-red-500/5 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-gradient-to-tr from-red-500/10 to-rose-400/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-rose-100 pb-6 mb-6 relative z-10">
        <div className="flex items-center space-x-4">
          <div className="p-4 bg-gradient-to-tr from-rose-500 to-red-600 text-white rounded-2xl shadow-lg shadow-rose-500/30">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading text-xl sm:text-2xl font-black text-rose-950 tracking-tight">ปฏิทินตารางปฏิบัติงาน</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 font-medium">จัดการงาน นัดหมายประชุม รายงานความคืบหน้า และติดตามงานลงพื้นที่</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center space-x-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border-2 border-rose-200 text-rose-800 hover:text-white hover:bg-rose-500 hover:border-rose-500 text-xs sm:text-sm font-heading font-extrabold transition-all duration-200 shadow-xs active:scale-95 cursor-pointer"
            title="ส่งออกเป็น Excel"
          >
            <Download className="w-4 h-4" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 w-full max-w-full min-w-0">
        
        {/* ซีกซ้าย: ตัวควบคุมปฏิทิน */}
        <div className="lg:col-span-6 flex flex-col h-full bg-gradient-to-br from-rose-500/[0.08] to-rose-500/[0.03] p-3 sm:p-5 rounded-3xl border-2 border-rose-200/60 shadow-md relative overflow-hidden w-full max-w-full min-w-0" id="calendar-container-card">
          {/* Background artistic glowing blobs */}
          <div className="absolute -top-16 -left-16 w-60 h-60 bg-rose-400/25 rounded-full blur-3xl pointer-events-none animate-pulse duration-4000" />
          <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-red-300/30 rounded-full blur-3xl pointer-events-none animate-pulse duration-3000" />
          <div className="absolute top-1/2 left-1/4 w-44 h-44 bg-rose-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 relative z-10">
            <h3 className="font-heading font-black text-rose-950 flex items-center gap-3">
              <span className="p-2.5 bg-gradient-to-tr from-rose-600 to-rose-500 text-white rounded-xl shadow-md shadow-rose-500/20">
                <CalendarDays className="w-5 h-5" />
              </span>
              <span className="text-lg sm:text-xl tracking-tight">{monthNamesThai[currentMonth]} {currentYear + 543}</span>
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              <button 
                onClick={handlePrevMonth}
                className="px-2.5 py-2 rounded-xl bg-white/90 hover:bg-gradient-to-r hover:from-rose-500 hover:to-rose-600 hover:text-white border border-rose-200 text-rose-900 transition-all font-heading text-[10px] sm:text-xs font-extrabold shadow-sm hover:shadow-md active:scale-[0.97]"
              >
                ◀ เดือนก่อน
              </button>
              <button 
                onClick={() => {
                  const thaiNow = getThaiDateComponents();
                  setCurrentYear(thaiNow.year);
                  setCurrentMonth(thaiNow.month);
                  setSelectedDateStr(thaiNow.dateStr);
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-500 text-white border border-rose-600 hover:bg-rose-700 transition-all font-heading text-[10px] sm:text-xs font-extrabold shadow-sm hover:shadow-md active:scale-[0.97]"
              >
                วันนี้
              </button>
              <button 
                onClick={handleNextMonth}
                className="px-2.5 py-2 rounded-xl bg-white/90 hover:bg-gradient-to-r hover:from-rose-500 hover:to-rose-600 hover:text-white border border-rose-200 text-rose-900 transition-all font-heading text-[10px] sm:text-xs font-extrabold shadow-sm hover:shadow-md active:scale-[0.97]"
              >
                เดือนถัดไป ▶
              </button>
            </div>
          </div>

          {/* ตารางวันหยุด/วันจันทร์-อาทิตย์ */}
          <div className="grid grid-cols-7 gap-1.5 text-center mb-4 bg-white/85 backdrop-blur-md p-1.5 rounded-2xl border border-rose-200/50 relative z-10 shadow-sm">
            {['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map((day, idx) => (
              <div 
                key={day} 
                className={`py-2 text-xs font-heading font-black ${
                  idx === 0 
                    ? 'text-red-600 bg-red-100/50 rounded-xl' 
                    : idx === 6 
                    ? 'text-purple-600 bg-purple-100/50 rounded-xl' 
                    : 'text-rose-950/80'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* ช่องวันปฏิทิน */}
          <div className="grid grid-cols-7 gap-1.5 relative z-10" id="calendar-grid">
            {calendarDays.map((day, idx) => {
              const dayTasks = tasksByDate[day.dateStr] || [];
              const isSelected = selectedDateStr === day.dateStr;
              const hasTasks = dayTasks.length > 0;
              const isToday = getThaiTodayStr() === day.dateStr;
              const holiday = getHolidayForDate(day.dateStr);
              
              // ตรวจสอบว่ามีงานด่วนไหม
              const hasUrgent = dayTasks.some(t => (t.type === 'เร่งด่วน' || (t.type as string) === 'งานด่วน/เร่งด่วน') && t.status !== 'ทำแล้ว');

              return (
                <motion.button
                  key={idx}
                  onClick={() => handleDayClick(day.dateStr)}
                  whileHover={day.isCurrentMonth ? { scale: 1.05, y: -2 } : {}}
                  whileTap={day.isCurrentMonth ? { scale: 0.96 } : {}}
                  className={`aspect-square p-1 sm:p-1.5 rounded-2xl flex flex-col justify-between items-center transition-all duration-200 relative border group ${
                    !day.isCurrentMonth 
                      ? 'bg-slate-200/10 border-slate-200/5 text-slate-300 opacity-20 cursor-not-allowed pointer-events-none' 
                      : isSelected
                      ? 'bg-gradient-to-tr from-rose-500 via-rose-600 to-red-600 border-rose-600 text-white shadow-xl shadow-rose-500/30 z-20 font-black ring-2 ring-rose-300'
                      : isToday
                      ? 'bg-rose-100 border-2 border-rose-500 text-rose-950 font-black shadow-md ring-4 ring-rose-500/20 z-10'
                      : holiday?.isPublicHoliday
                      ? 'bg-gradient-to-tr from-red-600 to-rose-500 border-red-600 text-white font-extrabold hover:shadow-lg shadow-md shadow-red-200'
                      : holiday
                      ? 'bg-gradient-to-tr from-amber-400 to-orange-400 border-amber-400 text-white font-extrabold hover:shadow-lg shadow-md shadow-amber-200'
                      : hasTasks
                      ? 'bg-white border-rose-200/60 text-rose-950 hover:bg-rose-50 hover:border-rose-300 hover:shadow-md'
                      : 'bg-white border-rose-200/60 text-rose-950 hover:bg-rose-50 hover:border-rose-300 hover:shadow-md'
                  }`}
                  id={`day-btn-${day.dateStr}`}
                >
                  
                  <div className="flex flex-col items-center justify-center h-full w-full">
                    <span className="text-xs font-black leading-none mt-0.5 font-heading">{day.dayNum}</span>
                    {holiday && day.isCurrentMonth && (
                      <span 
                        className={`text-[8px] sm:text-[9px] font-bold mt-1.5 leading-tight text-center line-clamp-1 max-w-full px-0.5 select-none ${
                          isSelected 
                            ? 'text-white' 
                            : holiday.isPublicHoliday 
                            ? 'text-white drop-shadow-sm' 
                            : 'text-white drop-shadow-sm'
                        }`} 
                        title={holiday.name}
                      >
                        {holiday.name}
                      </span>
                    )}
                  </div>
                  
                  {/* Tooltip on Hover */}
                  {holiday && day.isCurrentMonth && (
                    <div className="absolute bottom-full mb-1.5 hidden group-hover:block bg-slate-900/95 backdrop-blur-sm text-white text-[10px] py-1 px-2 rounded-lg shadow-lg whitespace-nowrap z-50 pointer-events-none">
                      {holiday.name}
                    </div>
                  )}
                  
                  {/* Indicators */}
                  <div className="w-full flex justify-center gap-0.5 mb-0.5">
                    {day.dateStr < todayStr && dayTasks.some(t => t.status !== 'ทำแล้ว') && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                    {hasTasks && (
                      hasUrgent && day.isCurrentMonth ? (
                        <div className="relative flex h-2 w-2">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                            isSelected ? 'bg-white/60' : 'bg-red-400'
                          }`}></span>
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${
                            isSelected ? 'bg-white' : 'bg-red-500'
                          }`}></span>
                        </div>
                      ) : (
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isSelected 
                            ? 'bg-white' 
                            : holiday
                            ? 'bg-white'
                            : 'bg-orange-600'
                        }`} />
                      )
                    )}
                    {dayTasks.length > 1 && (
                      <span className={`text-[9px] font-mono leading-none ${
                        isSelected ? 'text-white/80' : holiday ? 'text-white/95' : 'text-orange-600 font-extrabold'
                      }`}>
                        {dayTasks.length}
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ซีกขวา: รายการงานในวันที่เลือก และฟอร์มเพิ่ม/แก้ไข */}
        <div className="lg:col-span-6 flex flex-col h-full bg-slate-50/95 rounded-3xl p-4 sm:p-5 border-2 border-slate-200/80 shadow-xl relative overflow-hidden" id="task-detail-side-panel">
          {/* Decorative glows */}
          <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-sky-200/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute -top-12 -right-12 w-44 h-44 bg-orange-200/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

          {/* โซนสีส้มล้วน (Orange Zone) - แผงเวลาปฏิบัติงานและตัวเลือกวันที่ */}
          <div className="bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 text-white rounded-2xl p-4 mb-4 border border-white/20 shadow-md relative z-10">
            {/* Thailand Clock Widget */}
            <div 
              onClick={() => {
                window.dispatchEvent(new CustomEvent('trigger-today-tasks-popup'));
              }}
              className="mb-4 bg-white/10 hover:bg-white/15 border border-white/20 text-white rounded-xl px-3.5 py-2.5 flex items-center justify-between shadow-sm cursor-pointer transition duration-150 group" 
              id="thai-clock-widget"
              title="คลิกเพื่อทดสอบเปิดแจ้งเตือนตารางงานประจำวัน 09.00 น."
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-200 group-hover:scale-110 transition duration-150 animate-pulse" />
                <span className="text-xs font-heading font-black text-white/90">เวลาปัจจุบัน</span>
              </div>
              <div className="flex items-baseline gap-1 bg-black/20 px-2.5 py-1 rounded-xl">
                <span className="font-mono text-base font-black text-white">
                  {thaiTime || '--:--:--'}
                </span>
                <span className="text-[10px] text-sky-200 font-extrabold">น.</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] text-white/80 font-heading font-black block uppercase tracking-wider">วันที่เลือก</span>
                <h4 className="font-heading font-black text-white text-sm sm:text-base">
                  {formatThaiDate(selectedDateStr)}
                </h4>
              </div>
              
              {!isAdding && !editingTaskId && (
                <button
                  onClick={() => {
                    setTaskName('');
                    setTaskStatus('ยังไม่ได้ทำ');
                    setTaskType('ภารกิจทั่วไป');
                    setIsAdding(true);
                  }}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white border border-white/30 text-xs font-heading font-extrabold transition shadow-md hover:scale-[1.03]"
                  id="btn-add-task-view"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มงาน</span>
                </button>
              )}
            </div>
          </div>

          {/* ป้ายแสดงวันสำคัญ / วันหยุดราชการ */}
          {(() => {
            const selectedHoliday = getHolidayForDate(selectedDateStr);
            if (!selectedHoliday) return null;
            return (
              <div className={`p-3 rounded-xl border flex items-center gap-3 mb-4 relative z-10 shadow-sm ${
                selectedHoliday.isPublicHoliday 
                  ? 'bg-red-50 border-red-200 text-red-950' 
                  : 'bg-orange-50 border-orange-200 text-orange-950'
              }`}>
                <span className="text-xl shrink-0">🎉</span>
                <div className="min-w-0 flex-1">
                  <span className={`text-[9px] px-2 py-0.5 rounded-md font-heading font-black uppercase tracking-wide inline-block mb-1 ${
                    selectedHoliday.isPublicHoliday 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {selectedHoliday.isPublicHoliday ? 'วันหยุดราชการ' : 'วันสำคัญ'}
                  </span>
                  <p className="text-xs font-black font-sans leading-snug">
                    {selectedHoliday.name}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* แสดงผลฟอร์มเพิ่มหรือแก้ไข (ตอนเพิ่มข้อมูล เทพื้นหลังเป็นสีส้ม/ฟ้าเข้ม) */}
          {(isAdding || editingTaskId) ? (
            <motion.form 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              onSubmit={editingTaskId ? handleSaveEditTask : handleAddTask} 
              className="space-y-4 bg-gradient-to-br from-rose-500 via-rose-500 to-red-600 text-white rounded-3xl p-5 border-2 border-white/10 shadow-xl relative z-10"
            >
              <h5 className="font-heading font-black text-white text-xs flex items-center gap-1.5 border-b border-white/20 pb-2.5">
                <Edit3 className="w-3.5 h-3.5 text-white/90" />
                <span>{editingTaskId ? 'แก้ไขข้อมูลภารกิจ' : 'เพิ่มภารกิจใหม่ลงปฏิทิน'}</span>
              </h5>
              
              <div>
                <label className="block text-xs font-black text-white/90 mb-1.5 font-heading">
                  ภารกิจ / รายการที่ต้องทำ <span className="text-red-200 font-black">*</span>
                </label>
                <textarea
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="ระบุชื่อกิจกรรม/ภารกิจ..."
                  rows={3}
                  className="w-full p-3 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all font-sans font-medium text-slate-900 placeholder-slate-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-white/90 mb-1.5 font-heading">
                    ประเภทงาน <span className="text-red-200 font-black">*</span>
                  </label>
                  <select
                    value={taskType}
                    onChange={(e: any) => setTaskType(e.target.value)}
                    className="w-full p-2.5 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all font-heading font-bold text-slate-900"
                  >
                    <option value="ภารกิจทั่วไป">⚪ ภารกิจทั่วไป</option>
                    <option value="นัดหมาย/ประชุม">📅 นัดหมาย/ประชุม</option>
                    <option value="เร่งด่วน">🚨 เร่งด่วน</option>
                    <option value="งานลงพื้นที่">📍 งานลงพื้นที่</option>
                    <option value="ลงพื้นที่สำรวจ">🔎 ลงพื้นที่สำรวจ</option>
                    <option value="เอกสาร/รายงาน">📊 เอกสาร/รายงาน</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-white/90 mb-1.5 font-heading">
                    สถานะปัจจุบัน <span className="text-red-200 font-black">*</span>
                  </label>
                  <select
                    value={taskStatus}
                    onChange={(e: any) => setTaskStatus(e.target.value)}
                    className="w-full p-2.5 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all font-heading font-bold text-slate-900"
                  >
                    <option value="ยังไม่ได้ทำ">⚪ ยังไม่ได้ทำ</option>
                    <option value="กำลังดำเนินการ">🟡 กำลังดำเนินการ</option>
                    <option value="ทำแล้ว">🟢 ทำแล้ว</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-grow py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 font-heading font-black text-xs rounded-xl transition shadow-md active:scale-95"
                >
                  {editingTaskId ? 'บันทึกการแก้ไข' : 'เพิ่มลงปฏิทิน'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingTaskId(null);
                  }}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white border border-red-500 font-heading text-xs rounded-xl transition font-bold active:scale-95"
                >
                  ยกเลิก
                </button>
              </div>
            </motion.form>
          ) : (
            // โซนสีพื้นหลังกลาง - แหล่งแสดงงาน
            <div id="task-list-container" className="bg-slate-100/80 border border-slate-200 p-4 rounded-2xl flex flex-col shadow-inner relative z-10 flex-1 min-h-[300px] max-h-[60vh] overflow-y-auto scroll-smooth">
              <div className="space-y-3 pr-1">
                <AnimatePresence mode="popLayout">
                  {selectedDayTasks.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-12 text-slate-500/60"
                    >
                      <Clock className="w-10 h-10 text-slate-400/40 mb-2.5 animate-pulse" />
                      <p className="text-xs font-heading font-bold text-slate-800/80">ไม่มีภารกิจในวันนี้</p>
                      <p className="text-[10px] text-slate-500 mt-1 font-medium">เพิ่มภารกิจใหม่ได้โดยคลิก "เพิ่มงาน"</p>
                    </motion.div>
                  ) : (
                    selectedDayTasks.map(task => {
                      const isDone = task.status === 'ทำแล้ว';
                      const isUrgent = task.type === 'เร่งด่วน' || task.type === 'งานด่วน/เร่งด่วน';
                      const isMeeting = task.type === 'นัดหมาย/ประชุม';
                      const isFieldwork = task.type === 'งานลงพื้นที่';

                      let relatedPetitionDoc: any = undefined;
                      if (task.type === 'ลงพื้นที่สำรวจ' && docs) {
                        relatedPetitionDoc = docs.find(d => {
                          const safeDocSubject = (d.subject || '').trim();
                          const safeTaskName = (task.task || '').trim();
                          return d.docType === 'แบบคำร้อง' && (
                            safeDocSubject === safeTaskName || 
                            safeTaskName.includes(safeDocSubject) || 
                            (d.subject || '').includes(safeTaskName)
                          );
                        });
                      }
                      
                      const isPastAndNotDone = task.date < getThaiTodayStr() && task.status !== 'ทำแล้ว';

                      let cardBgClass = '';
                      let textClass = '';
                      let checkboxClass = '';
                      let actionButtonClass = '';
                      let actionDeleteButtonClass = '';

                      if (isUrgent) {
                        // Red (แดง)
                        cardBgClass = isDone 
                          ? 'bg-red-50/50 border-red-200 text-red-800/50 opacity-60' 
                          : 'bg-gradient-to-r from-red-500 to-rose-600 border-red-400 text-white shadow-lg shadow-red-500/15 hover:from-red-600 hover:to-rose-700 hover:border-red-500 animate-pulse';
                        textClass = isDone ? 'line-through text-red-900/50 font-medium' : 'text-white font-semibold';
                        checkboxClass = isDone 
                          ? 'bg-emerald-500 border-emerald-600 text-white' 
                          : 'border-white/50 hover:border-white bg-white/10 text-white';
                        actionButtonClass = 'text-white/80 hover:text-white hover:bg-white/15';
                        actionDeleteButtonClass = 'text-white/80 hover:text-red-200 hover:bg-red-500/30';
                      } else if (isMeeting) {
                        // Sky Blue (ฟ้า)
                        cardBgClass = isDone 
                          ? 'bg-sky-50/50 border-sky-200 text-sky-800/50 opacity-60' 
                          : 'bg-gradient-to-r from-sky-500 to-blue-600 border-sky-400 text-white shadow-lg shadow-sky-500/15 hover:from-sky-600 hover:to-blue-700 hover:border-sky-500';
                        textClass = isDone ? 'line-through text-sky-900/50 font-medium' : 'text-white font-semibold';
                        checkboxClass = isDone 
                          ? 'bg-emerald-500 border-emerald-600 text-white' 
                          : 'border-white/50 hover:border-white bg-white/10 text-white';
                        actionButtonClass = 'text-white/80 hover:text-white hover:bg-white/15';
                        actionDeleteButtonClass = 'text-white/80 hover:text-red-200 hover:bg-red-500/30';
                      } else if (isFieldwork) {
                        // Green (เขียว)
                        cardBgClass = isDone 
                          ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800/50 opacity-60' 
                          : 'bg-gradient-to-r from-emerald-500 to-teal-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/15 hover:from-emerald-600 hover:to-teal-700 hover:border-emerald-500';
                        textClass = isDone ? 'line-through text-emerald-900/50 font-medium' : 'text-white font-semibold';
                        checkboxClass = isDone 
                          ? 'bg-emerald-500 border-emerald-600 text-white' 
                          : 'border-white/50 hover:border-white bg-white/10 text-white';
                        actionButtonClass = 'text-white/80 hover:text-white hover:bg-white/15';
                        actionDeleteButtonClass = 'text-white/80 hover:text-red-200 hover:bg-red-500/30';
                      } else {
                        // Orange (ส้ม) - ภารกิจทั่วไป, เอกสาร/รายงาน
                        cardBgClass = isDone 
                          ? 'bg-orange-50/50 border-orange-200 text-orange-800/50 opacity-60' 
                          : 'bg-gradient-to-r from-orange-500 to-amber-500 border-orange-400 text-white shadow-lg shadow-orange-500/15 hover:from-orange-600 hover:to-amber-600 hover:border-orange-500';
                        textClass = isDone ? 'line-through text-orange-900/50 font-medium' : 'text-white font-bold';
                        checkboxClass = isDone 
                          ? 'bg-emerald-600 border-emerald-700 text-white' 
                          : 'border-white/50 hover:border-white bg-white/10 text-white';
                        actionButtonClass = 'text-white/80 hover:text-white hover:bg-white/15';
                        actionDeleteButtonClass = 'text-white/80 hover:text-red-200 hover:bg-red-500/30';
                      }

                      return (
                        <motion.div 
                          key={task.id} 
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -15 }}
                          transition={{ duration: 0.2 }}
                          className={`rounded-2xl border-2 p-4 shadow-md flex items-start gap-3 transition-all hover:scale-[1.02] hover:shadow-lg group ${cardBgClass}`}
                        >
                          {/* Checkbox status toggle */}
                          <button
                            onClick={() => handleToggleStatus(task)}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition ${checkboxClass}`}
                            title="คลิกสลับสถานะทำแล้ว"
                          >
                            {isDone && <Check className="w-3.5 h-3.5" />}
                          </button>

                          {/* Content block */}
                          <div className="flex-grow min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full font-heading font-semibold shrink-0 ${getTaskBadgeClass(task.type)}`}>
                                {getTaskIcon(task.type)}
                                <span>{task.type === 'งานด่วน/เร่งด่วน' ? 'เร่งด่วน' : task.type}</span>
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-sans ${getStatusBadgeClass(task.status)}`}>
                                {task.status}
                              </span>
                              {(task.originalDate && task.originalDate !== task.date) ? (
                                <span className="text-[9px] px-2 py-0.5 rounded-md font-sans bg-rose-100 text-rose-800 border border-rose-300 font-bold inline-flex items-center gap-1 shadow-xs" title="งานนี้ถูกเลื่อนมาจากวันก่อนหน้าเนื่องจากยังไม่สำเร็จ">
                                  <span>⚠️ เลื่อนจาก {formatThaiDate(task.originalDate)}</span>
                                </span>
                              ) : (task.originalDate || task.date) ? (
                                <span className="text-[9px] px-2 py-0.5 rounded-md font-sans bg-amber-50 text-amber-700 border border-amber-200 font-medium inline-flex items-center gap-1">
                                  <span>📌 เพิ่มเมื่อ {formatThaiDate(task.originalDate || task.date)}</span>
                                </span>
                              ) : null}
                            </div>
                            
                            <p className={`text-xs font-sans leading-relaxed break-words ${textClass}`}>
                              {task.task}
                            </p>
                            
                            {relatedPetitionDoc && (
                              <div className="mt-2.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPetitionTaskRef(task);
                                    setPetitionDocRef(relatedPetitionDoc);
                                    setNewPetitionStatus(relatedPetitionDoc.petitionStatus === 'ช่วยเหลือไม่ได้' ? 'ช่วยเหลือไม่ได้' : 'ช่วยเหลือได้');
                                    setNoHelpReason(relatedPetitionDoc.noHelpReason || '');
                                    setHelpDetail(relatedPetitionDoc.helpDetail || '');
                                    setShowPetitionModal(true);
                                  }}
                                  className={`text-[10px] px-2.5 py-1.5 font-heading font-bold rounded-lg border shadow-sm flex items-center gap-1.5 transition-all w-fit ${
                                    isDone 
                                      ? 'bg-purple-100/30 border-purple-200/50 text-purple-700 hover:bg-purple-100/50 hover:border-purple-300' 
                                      : 'bg-white/20 hover:bg-white/30 border-white/40 text-white shadow-purple-900/10'
                                  }`}
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  {relatedPetitionDoc.petitionStatus === 'รอสำรวจ' ? 'บันทึกผลการสำรวจคำร้อง' : `สถานะคำร้อง: ${relatedPetitionDoc.petitionStatus}`}
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col space-y-1">
                            <button
                              onClick={() => handleEditTaskClick(task)}
                              className={`p-1.5 rounded-lg transition ${actionButtonClass}`}
                              title="แก้ไขรายละเอียดงาน"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className={`p-1.5 rounded-lg transition ${actionDeleteButtonClass}`}
                              title="ลบงานนี้ออก"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>

              {/* Mission Complete Celebratory Card */}
              <AnimatePresence>
                {isDayCompleted && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.3, y: 15 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1,
                      y: 0,
                    }}
                    exit={{ opacity: 0, scale: 0.8, y: -15 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 150 }}
                    className="mt-4 p-4 bg-gradient-to-r from-amber-400 via-yellow-350 to-amber-500 border border-amber-300/50 rounded-2xl text-amber-950 shadow-lg shadow-amber-500/20 relative overflow-hidden z-20 flex flex-col items-center justify-center text-center"
                  >
                    {/* Background floating glow and rings */}
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                      className="absolute -top-12 -left-12 w-32 h-32 bg-amber-950/5 rounded-full border border-amber-950/10 animate-pulse"
                    />
                    <motion.div 
                      animate={{ rotate: -360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                      className="absolute -bottom-16 -right-16 w-40 h-40 bg-amber-950/5 rounded-full border border-amber-950/10 animate-pulse"
                    />

                    <div className="flex items-center gap-2 mb-1.5 relative z-10">
                      <motion.span 
                        animate={{ 
                          scale: [1, 1.3, 1],
                          rotate: [0, 15, -15, 0]
                        }}
                        transition={{ repeat: Infinity, duration: 2.5, repeatDelay: 1 }}
                        className="text-2xl"
                      >
                        🏆
                      </motion.span>
                      <h6 className="font-heading font-black text-amber-950 text-base tracking-wide uppercase">
                        Mission Complete!
                      </h6>
                      <motion.span 
                        animate={{ 
                          scale: [1, 1.3, 1],
                          rotate: [0, -15, 15, 0]
                        }}
                        transition={{ repeat: Infinity, duration: 2.5, repeatDelay: 1 }}
                        className="text-2xl"
                      >
                        🎉
                      </motion.span>
                    </div>

                    <p className="text-[11px] font-sans font-bold text-amber-900 relative z-10">
                      ภารกิจของวันนี้เสร็จสิ้นแล้ว
                    </p>

                    {/* Drifting particle animations */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
                      {[...Array(6)].map((_, i) => (
                        <motion.span
                          key={i}
                          animate={{
                            y: [-20, -100],
                            x: [0, (i % 2 === 0 ? 35 : -35) * Math.random()],
                            opacity: [0, 1, 0],
                            scale: [0.5, 1.1, 0.5]
                          }}
                          transition={{
                            duration: 2 + Math.random() * 1.5,
                            repeat: Infinity,
                            delay: i * 0.4
                          }}
                          className="absolute text-xs"
                          style={{
                            left: `${15 + i * 15}%`,
                            bottom: '10px'
                          }}
                        >
                          {['✨', '🌸', '⭐', '🎈', '🎉', '🌟'][i % 6]}
                        </motion.span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

        </div>

      </div>

      <CenteredAlert
        isOpen={!!alert}
        message={alert?.message || ''}
        type={alert?.type || 'info'}
        onClose={() => setAlert(null)}
      />

      {/* Petition Status Sync Modal */}
      {showPetitionModal && createPortal(
        <div className="fixed inset-0 z-[99995] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-orange-50/95 backdrop-blur-sm rounded-[2.5rem] border-4 border-white shadow-[0_25px_50px_-12px_rgba(234,88,12,0.25)] w-full max-w-sm overflow-hidden animate-slide-up relative font-sans text-gray-800">
            {/* Top Banner Accent */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 z-10" />

            {/* Header */}
            <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-5 sm:p-6 text-white border-b-4 border-white/50 relative">
              <h3 className="font-heading font-black text-sm sm:text-base tracking-wide drop-shadow-sm">อัปเดตสถานะแบบคำร้อง</h3>
              <p className="text-orange-50 text-[10px] sm:text-xs mt-0.5 font-medium">เชื่อมโยงกับเอกสารคำร้องเรื่องนี้</p>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="bg-amber-100/60 p-3 rounded-2xl border border-amber-200">
                <p className="text-xs font-bold text-amber-950 mb-1 font-heading">เรื่องที่ลงพื้นที่สำรวจ:</p>
                <p className="text-xs text-amber-900 line-clamp-2">{petitionDocRef?.subject}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 font-heading">ผลการสำรวจ <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setNewPetitionStatus('ช่วยเหลือได้')}
                    className={`p-2 rounded-xl text-xs font-heading font-bold transition-all border flex items-center justify-center gap-1.5 ${
                      newPetitionStatus === 'ช่วยเหลือได้'
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-md font-black'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>ช่วยเหลือได้</span>
                  </button>
                  <button
                    onClick={() => setNewPetitionStatus('ช่วยเหลือไม่ได้')}
                    className={`p-2 rounded-xl text-xs font-heading font-bold transition-all border flex items-center justify-center gap-1.5 ${
                      newPetitionStatus === 'ช่วยเหลือไม่ได้'
                        ? 'bg-red-500 text-white border-red-500 shadow-md font-black'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-red-300'
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>ช่วยเหลือไม่ได้</span>
                  </button>
                </div>
              </div>

              {newPetitionStatus === 'ช่วยเหลือไม่ได้' && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 font-heading">เหตุผลที่ไม่สามารถช่วยเหลือได้ <span className="text-red-500">*</span></label>
                  <textarea
                    value={noHelpReason}
                    onChange={(e) => setNoHelpReason(e.target.value)}
                    placeholder="โปรดระบุสาเหตุ..."
                    rows={2}
                    className="w-full p-2.5 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 font-sans transition-all"
                  />
                </div>
              )}

              {newPetitionStatus === 'ช่วยเหลือได้' && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 font-heading">รายละเอียดการช่วยเหลือ <span className="text-red-500">*</span></label>
                  <textarea
                    value={helpDetail}
                    onChange={(e) => setHelpDetail(e.target.value)}
                    placeholder="โปรดระบุรายละเอียด..."
                    rows={2}
                    className="w-full p-2.5 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 font-sans transition-all"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCancelPetitionModal}
                  className="px-4 py-2.5 border-2 border-gray-300 text-gray-600 bg-white font-heading font-bold text-xs rounded-2xl hover:bg-gray-50 active:translate-y-[2px] shadow-sm transition-all animate-none"
                >
                  ข้าม ⏭️
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSavePetitionModal}
                  className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-heading font-black text-xs rounded-2xl shadow-[0_4px_0_0_#ea580c] active:translate-y-[2px] active:shadow-[0_2px_0_0_#ea580c] transition-all"
                >
                  บันทึกสถานะ 💾
                </motion.button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Task Schedule PDF Report Modal */}
      {isPdfModalOpen && (
        <TaskSchedulePdfModal
          tasks={tasks}
          currentMonth={currentMonth}
          currentYear={currentYear}
          selectedDateStr={selectedDateStr}
          onClose={() => setIsPdfModalOpen(false)}
          showToast={showToast}
        />
      )}

    </div>
  );
}
