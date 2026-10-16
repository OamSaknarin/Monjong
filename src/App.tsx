import React, { useState, useEffect, useRef, useCallback } from 'react';
import logo from './assets/logo.png';
import { 
  getLoggedUser, setLoggedUser, fetchAllData, saveAllCollections, saveSingleCollection, getGasUrl, getCachedData, isCustomGasUrlSet,
  updateUserProfileClient, uploadFileToGas, getDriveDisplayUrl, deleteFileFromGas, loginUserClient
} from './utils/gasClient';
import { updateTasksToSheet, fetchTasksFromSheet, updateDocsToSheet, fetchDocsFromSheet, updateDispensesToSheet, fetchDispensesFromSheet, updateBorrowsToSheet, fetchBorrowsFromSheet } from './utils/googleSheetsClient';
import { getAccessToken } from './utils/auth';
import { User, TaskItem, Equipment, BorrowRecord, DispenseRecord, OfficialDoc, ExpenseRecord, RelatedLink, Employee, LocationItem, CloudFile } from './types';
import { LogOut, Menu, X, Calendar as CalendarIcon, Box, FolderOpen, Coins, Globe, Users, MapPin, CheckCircle2, AlertTriangle, Info, UserCheck, Cloud, ShieldAlert, Edit3, Camera, Save, CloudRain, Sparkles, ClipboardList } from 'lucide-react';
import defaultAvatar from './assets/images/default_avatar_1782835788460.jpg';
import { motion, AnimatePresence } from 'motion/react';

// Chibi style 3D cartoon illustrations
import chibiOfficerWork from './assets/images/chibi_officer_work_1782912746914.jpg';
import chibiLockKey from './assets/images/chibi_lock_key_1782912758967.jpg';
import chibiSuccess from './assets/images/chibi_success_1782912770290.jpg';

// Menu specific 3D Chibi Mascot images
import chibiChecklist from './assets/images/chibi_checklist_1782914450769.jpg';
import chibiEquipment from './assets/images/chibi_equipment_1782914477755.jpg';
import chibiDocuments from './assets/images/chibi_documents_1782914464071.jpg';
import chibiExpenses from './assets/images/chibi_expenses_1782914490135.jpg';
import chibiLinks from './assets/images/chibi_links_1782914500929.jpg';
import chibiTeam from './assets/images/chibi_team_1782914511022.jpg';
import chibiLocation from './assets/images/chibi_location_1782914525228.jpg';
import chibiStorage from './assets/images/chibi_storage_1782914536986.jpg';

// Component แสดงภาพโปรไฟล์ผู้ใช้พร้อมระบบ Fallback ภาพ 3D น่ารักๆ
const ProfileAvatar: React.FC<{
  src?: string;
  name: string;
  className?: string;
}> = ({ src, name, className = "w-9 h-9 rounded-full" }) => {
  const [isError, setIsError] = useState(false);
  const displayUrl = src ? getDriveDisplayUrl(src) : '';

  useEffect(() => {
    setIsError(false);
  }, [src]);

  if (!src || isError) {
    return (
      <img
        src={defaultAvatar}
        alt={name}
        referrerPolicy="no-referrer"
        className={`${className} object-cover shrink-0 bg-orange-50`}
        onError={() => setIsError(true)}
      />
    );
  }

  return (
    <img
      src={displayUrl}
      alt={name}
      referrerPolicy="no-referrer"
      className={`${className} object-cover shrink-0`}
      onError={() => setIsError(true)}
    />
  );
};

// ฟังก์ชันย่อขนาดรูปภาพโปรไฟล์ผู้ใช้อย่างง่าย
const resizeAndCompressProfileImage = (base64Str: string, maxWidth = 240, maxHeight = 240): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

// Importing child components
import LoginRegister from './components/LoginRegister';
import TaskSchedule from './components/TaskSchedule';
import EquipmentBorrow from './components/EquipmentBorrow';
import OfficialDocs from './components/OfficialDocs';
import Expenses from './components/Expenses';
import RelatedWebsites from './components/RelatedWebsites';
import EmployeeInfo from './components/EmployeeInfo';
import MonJongLocations from './components/MonJongLocations';
import CloudStorage from './components/CloudStorage';
import Volunteers from './components/Volunteers';
import GasSettings from './components/GasSettings';
import CenteredConfirm, { ConfirmType } from './components/CenteredConfirm';
import TodayTasksPopup from './components/TodayTasksPopup';
import RainDailyEWS from './components/RainDailyEWS';

import chibiRainMonitor from './assets/images/chibi_rain_monitor_1783225766275.jpg';

type TabType = 'schedule' | 'equipment' | 'docs' | 'expenses' | 'websites' | 'employees' | 'locations' | 'cloud' | 'rain' | 'volunteers';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);

  // Core collections state
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [borrows, setBorrows] = useState<BorrowRecord[]>([]);
  const [dispenses, setDispenses] = useState<DispenseRecord[]>([]);
  const [docs, setDocs] = useState<OfficialDoc[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [links, setLinks] = useState<RelatedLink[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [cloudFiles, setCloudFiles] = useState<CloudFile[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [volunteerFinances, setVolunteerFinances] = useState<any[]>([]);
  const [isMapFullScreen, setIsMapFullScreen] = useState(false);

  const [gasUrl, setGasUrl] = useState(getGasUrl());
  const [isGasModalOpen, setIsGasModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('schedule');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showTodayTasks, setShowTodayTasks] = useState(false);

  const saveTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // User Profile Edit States
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePosition, setProfilePosition] = useState('');
  const [profileTel, setProfileTel] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [oldPasswordInput, setOldPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [isOldPasswordVerified, setIsOldPasswordVerified] = useState(false);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);

  const handleOpenProfileEdit = () => {
    if (!currentUser) return;
    setProfileName(currentUser.name ? String(currentUser.name) : '');
    setProfilePosition(currentUser.position ? String(currentUser.position) : '');
    setProfileTel(currentUser.tel ? String(currentUser.tel) : '');
    setProfilePhotoUrl(currentUser.photoUrl ? String(currentUser.photoUrl) : '');
    setOldPasswordInput('');
    setNewPasswordInput('');
    setIsOldPasswordVerified(false);
    setIsProfileEditOpen(true);
    setMobileMenuOpen(false); // ปิดเมนูมือถือ (ถ้าเปิดอยู่)
  };

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingProfile(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Str = event.target?.result as string;
        if (!base64Str) {
          setIsUploadingProfile(false);
          return;
        }

        const compressedBase64 = await resizeAndCompressProfileImage(base64Str, 240, 240);

        const currentGasUrl = getGasUrl();
        if (currentGasUrl && currentGasUrl.includes('/exec')) {
          try {
            const uploadResult = await uploadFileToGas(file.name, file.type || 'image/jpeg', compressedBase64);
            if (uploadResult.success && uploadResult.url) {
              setProfilePhotoUrl(uploadResult.url);
              setIsUploadingProfile(false);
              return;
            }
          } catch (uploadErr) {
            console.error('GAS Upload failed, using base64 fallback:', uploadErr);
          }
        }

        setProfilePhotoUrl(compressedBase64);
        setIsUploadingProfile(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsUploadingProfile(false);
      showToast('เกิดข้อผิดพลาดในการโหลดรูปภาพ', 'error');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const nameStr = String(profileName || '').trim();
    const posStr = String(profilePosition || '').trim();
    const telStr = String(profileTel || '').trim();

    if (!nameStr || !posStr || !telStr) {
      showToast('กรุณากรอกข้อมูลส่วนตัวให้ครบถ้วน', 'error');
      return;
    }

    setLoading(true);
    try {
      if (newPasswordInput && oldPasswordInput !== currentUser.password) {
        showToast('รหัสผ่านเดิมไม่ถูกต้อง', 'error');
        setLoading(false);
        return;
      }

      if (newPasswordInput && (newPasswordInput.length < 6 || newPasswordInput.length > 12)) {
        showToast('รหัสผ่านต้องมีความยาว 6-12 ตัวอักษร', 'error');
        setLoading(false);
        return;
      }
      
      const updatedUser: User = {
        ...currentUser,
        name: nameStr,
        position: posStr,
        tel: telStr,
        photoUrl: profilePhotoUrl,
        password: newPasswordInput || currentUser.password
      };

      console.log('Updating user profile with:', updatedUser);
      const result = await updateUserProfileClient(updatedUser);
      console.log('Updated user profile result:', result);
      if (result.success && result.user) {
        // หากเปลี่ยนรูปโปรไฟล์ และมีรูปเดิม ให้ย้ายรูปเดิมไปที่ถังขยะใน Google Drive
        const previousPhotoUrl = currentUser.photoUrl;
        if (previousPhotoUrl && previousPhotoUrl !== profilePhotoUrl && (previousPhotoUrl.includes('drive.google.com') || previousPhotoUrl.includes('docs.google.com') || previousPhotoUrl.includes('lh3.googleusercontent.com'))) {
          deleteFileFromGas('', previousPhotoUrl).catch(err => {
            console.error('Failed to move previous profile photo to trash:', err);
          });
        }

        setCurrentUser(result.user);
        setIsProfileEditOpen(false);
        if (result.error) {
          showToast(result.error, 'error');
        } else {
          showToast('อัปเดตข้อมูลโปรไฟล์เรียบร้อยแล้ว', 'info');
        }
      } else {
        showToast(result.error || 'ไม่สามารถอัปเดตข้อมูลโปรไฟล์ได้', 'error');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Confirm Dialog State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: ConfirmType;
    resolve: (value: boolean) => void;
  } | null>(null);

  const showConfirm = (title: string, message: string, type: ConfirmType = 'default'): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title,
        message,
        type,
        resolve
      });
    });
  };

  // Toast Notification System
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    if (type === 'success') return; // Do not show success toast notifications
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Initialize and check login session
  useEffect(() => {
    const user = getLoggedUser();
    if (user) {
      setCurrentUser(user);
      loadAllData();
    } else {
      setIsInitialized(true);
    }
  }, [gasUrl]);

  // Background check for Thailand 09:00 AM daily task popup
  useEffect(() => {
    if (!currentUser) return;

    const check9amTrigger = () => {
      const now = new Date();
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Bangkok',
          hour12: false,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const parts = formatter.formatToParts(now);
        const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));
        
        const hour = parseInt(partMap.hour, 10);
        const minute = parseInt(partMap.minute, 10);
        const todayDateStr = `${partMap.year}-${partMap.month}-${partMap.day}`; // YYYY-MM-DD
        
        // Trigger at exactly 09:00 AM (hour 9, minute 0)
        if (hour === 9 && minute === 0) {
          const lastTriggered = localStorage.getItem('last_9am_trigger_date');
          if (lastTriggered !== todayDateStr) {
            localStorage.setItem('last_9am_trigger_date', todayDateStr);
            setShowTodayTasks(true);
            showToast('⏰ ถึงเวลา 09:00 น. แล้ว! เปิดตารางปฏิบัติงานประจำวันอัตโนมัติ', 'success');
          }
        }
      } catch (e) {
        console.error('Error checking Thailand time:', e);
      }
    };

    check9amTrigger();
    const intervalId = setInterval(check9amTrigger, 10000); // Check every 10 seconds
    return () => clearInterval(intervalId);
  }, [currentUser]);

  // Handle custom trigger for testing the daily popup
  useEffect(() => {
    const handleTrigger = () => {
      setShowTodayTasks(true);
      showToast('🔔 ทดสอบระบบเด้งแจ้งเตือนอัตโนมัติ (จำลองเวลา 09:00 น.)', 'info');
    };
    window.addEventListener('trigger-today-tasks-popup', handleTrigger);
    return () => window.removeEventListener('trigger-today-tasks-popup', handleTrigger);
  }, []);

  // Load all datasets from client (LocalStorage or Google Sheets)
  const loadAllData = async () => {
    // 1. Load from cache instantly for fast UI
    const cached = getCachedData();
    setTasks(cached.tasks);
    setEquipment(cached.equipment);
    setBorrows(cached.borrows);
    setDispenses(cached.dispenses || []);
    setDocs(cached.docs);
    setExpenses(cached.expenses);
    setLinks(cached.links);
    setEmployees(cached.employees);
    setLocations(cached.locations || []);
    setCloudFiles(cached.cloudFiles || []);
    setIsInitialized(true);

    // 2. Fetch fresh data in background without blocking UI
    try {
      const response = await fetchAllData();
      setTasks(response.tasks);
      setEquipment(response.equipment);
      setBorrows(response.borrows);
      setDispenses(response.dispenses || []);
      setDocs(response.docs);
      setExpenses(response.expenses);
      setLinks(response.links);
      setEmployees(response.employees);
      setLocations(response.locations || []);
      setCloudFiles(response.cloudFiles || []);
    } catch (err) {
      console.error('Background fetch failed, keeping local cache:', err);
      if (getGasUrl()) {
        showToast(
          'การเชื่อมต่อฐานข้อมูลล่าช้าหรือขัดข้อง (ใช้งานโหมดออฟไลน์)', 
          'error'
        );
      }
    }
  };

  // Generic Save action that pushes updates immediately to Sheets/LocalStorage
  const handleSaveCollection = async (
    type: 'tasks' | 'equipment' | 'borrows' | 'dispenses' | 'docs' | 'expenses' | 'links' | 'employees' | 'locations' | 'cloudFiles' | 'volunteers' | 'volunteerFinances',
    updatedItems: any[]
  ) => {
    // 1. Update State locally first
    let nextTasks = tasks;
    let nextEquipment = equipment;
    let nextBorrows = borrows;
    let nextDispenses = dispenses;
    let nextDocs = docs;
    let nextExpenses = expenses;
    let nextLinks = links;
    let nextEmployees = employees;
    let nextLocations = locations;
    let nextCloudFiles = cloudFiles;
    let nextVolunteers = volunteers;
    let nextVolunteerFinances = volunteerFinances;

    switch (type) {
      case 'tasks':
        setTasks(updatedItems);
        nextTasks = updatedItems;
        break;
      case 'equipment':
        setEquipment(updatedItems);
        nextEquipment = updatedItems;
        break;
      case 'borrows':
        setBorrows(updatedItems);
        nextBorrows = updatedItems;
        break;
      case 'dispenses':
        setDispenses(updatedItems);
        nextDispenses = updatedItems;
        break;
      case 'docs':
        setDocs(updatedItems);
        nextDocs = updatedItems;
        break;
      case 'expenses':
        setExpenses(updatedItems);
        nextExpenses = updatedItems;
        break;
      case 'links':
        setLinks(updatedItems);
        nextLinks = updatedItems;
        break;
      case 'employees':
        setEmployees(updatedItems);
        nextEmployees = updatedItems;
        break;
      case 'locations':
        setLocations(updatedItems);
        nextLocations = updatedItems;
        break;
      case 'cloudFiles':
        setCloudFiles(updatedItems);
        nextCloudFiles = updatedItems;
        break;
      case 'volunteers':
        setVolunteers(updatedItems);
        nextVolunteers = updatedItems;
        break;
      case 'volunteerFinances':
        setVolunteerFinances(updatedItems);
        nextVolunteerFinances = updatedItems;
        break;
    }

    // 2. Perform write to storage (บันทึกเฉพาะตารางที่แก้ไขอย่างรวดเร็วและปลอดภัย)
    if (saveTimeoutsRef.current[type]) {
      clearTimeout(saveTimeoutsRef.current[type]);
    }

    // ใช้ debounce สั้นๆ และส่งเฉพาะ collection ที่มีการแก้ไข โดยแยก timer ตาม collection ไม่ยกเลิกกันเอง
    saveTimeoutsRef.current[type] = setTimeout(async () => {
      delete saveTimeoutsRef.current[type];
      const result = await saveSingleCollection(type, updatedItems);
      if (getGasUrl()) {
        if (!result.success) {
          showToast(`ไม่สามารถซิงก์คลาวด์ได้ (${type}): ${result.error || 'เซิร์ฟเวอร์ตอบสนองผิดพลาด'}`, 'error');
        }
      }
    }, 250);

    // Sync tasks directly if it's tasks collection and we have auth
    if (type === 'tasks') {
      try {
        const token = await getAccessToken();
        if (token) {
          await updateTasksToSheet(nextTasks);
          const freshTasks = await fetchTasksFromSheet();
          setTasks(freshTasks);
        }
      } catch (e) {
        console.error('Failed to sync tasks to Sheets via API:', e);
      }
    }

    // Sync docs directly to Google Sheets when docs collection updates and we have auth
    if (type === 'docs') {
      try {
        const token = await getAccessToken();
        if (token) {
          await updateDocsToSheet(nextDocs);
        }
      } catch (e) {
        console.error('Failed to sync docs to Sheets via API:', e);
      }
    }

    // Sync dispenses directly to Google Sheets when dispenses collection updates and we have auth
    if (type === 'dispenses') {
      try {
        const token = await getAccessToken();
        if (token) {
          await updateDispensesToSheet(nextDispenses);
        }
      } catch (e) {
        console.error('Failed to sync dispenses to Sheets via API:', e);
      }
    }

    // Sync borrows directly to Google Sheets when borrows collection updates and we have auth
    if (type === 'borrows') {
      try {
        const token = await getAccessToken();
        if (token) {
          await updateBorrowsToSheet(nextBorrows);
          const freshBorrows = await fetchBorrowsFromSheet();
          if (freshBorrows && freshBorrows.length > 0) {
            setBorrows(freshBorrows);
          }
        }
      } catch (e) {
        console.error('Failed to sync borrows to Sheets via API:', e);
      }
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    loadAllData();
  };

  const handleLogout = async () => {
    if (await showConfirm('ยืนยันออกจากระบบ', 'คุณต้องการลงชื่อออกจากระบบงานป้องกันฯ หรือไม่?', 'default')) {
      setLoggedUser(null);
      setCurrentUser(null);
      
      // ล้างข้อมูลใน State ทั้งหมดเพื่อเริ่มดึงใหม่สดๆ เมื่อล็อกอินใหม่
      setTasks([]);
      setEquipment([]);
      setBorrows([]);
      setDispenses([]);
      setDocs([]);
      setExpenses([]);
      setLinks([]);
      setEmployees([]);
      setLocations([]);
      setCloudFiles([]);
      
      showToast('ออกจากระบบเรียบร้อย', 'info');
    }
  };

  const handleUrlUpdated = (newUrl: string) => {
    setGasUrl(newUrl);
    loadAllData();
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#fcf8f5] flex items-center justify-center" id="loader">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-heading font-bold text-sm text-orange-950">
            กำลังโหลด<br/>
            <span className="text-xs text-gray-600">งานป้องกันและบรรเทาสาธารณภัย</span>
          </p>
        </div>
      </div>
    );
  }

  // หากไม่มีผู้ใช้งานล็อกอิน -> แสดงหน้าจอ Login และ สมัครสมาชิก
  if (!currentUser) {
    return (
      <LoginRegister 
        onLoginSuccess={handleLoginSuccess} 
        gasUrlSet={isCustomGasUrlSet()}
        onOpenGasSettings={() => setIsGasModalOpen(true)}
      />
    );
  }

  // ตัวเลือกเมนูการนำทางหลักพร้อมลูกเล่นสีสันโดดเด่นหลากหลายและรูปภาพการ์ตูน Chibi 3D เคลื่อนไหวได้
  const menuItems = [
    { 
      id: 'schedule', 
      label: 'ตารางปฏิบัติงาน', 
      icon: <CalendarIcon className="w-4 h-4" />, 
      chibiImage: chibiChecklist,
      colorClass: 'text-rose-500', 
      activeClass: 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/25', 
      hoverClass: 'hover:bg-rose-50 hover:text-rose-700' 
    },
    { 
      id: 'equipment', 
      label: 'ระบบยืม-คืนพัสดุ', 
      icon: <Box className="w-4 h-4" />, 
      chibiImage: chibiEquipment,
      colorClass: 'text-sky-500', 
      activeClass: 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25', 
      hoverClass: 'hover:bg-sky-50 hover:text-sky-700' 
    },
    { 
      id: 'docs', 
      label: 'หนังสือราชการ', 
      icon: <FolderOpen className="w-4 h-4" />, 
      chibiImage: chibiDocuments,
      colorClass: 'text-purple-500', 
      activeClass: 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25', 
      hoverClass: 'hover:bg-purple-50 hover:text-purple-700' 
    },
    { 
      id: 'expenses', 
      label: 'บัญชีรายจ่าย', 
      icon: <Coins className="w-4 h-4" />, 
      chibiImage: chibiExpenses,
      colorClass: 'text-emerald-500', 
      activeClass: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25', 
      hoverClass: 'hover:bg-emerald-50 hover:text-emerald-700' 
    },
    { 
      id: 'websites', 
      label: 'ระบบที่เกี่ยวข้อง', 
      icon: <Globe className="w-4 h-4" />, 
      chibiImage: chibiLinks,
      colorClass: 'text-pink-500', 
      activeClass: 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/25', 
      hoverClass: 'hover:bg-pink-50 hover:text-pink-700' 
    },
    { 
      id: 'employees', 
      label: 'ข้อมูลบุคลากร', 
      icon: <Users className="w-4 h-4" />, 
      chibiImage: chibiTeam,
      colorClass: 'text-amber-500', 
      activeClass: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25', 
      hoverClass: 'hover:bg-amber-50 hover:text-amber-700' 
    },
    { 
      id: 'locations', 
      label: 'พิกัดสถานที่', 
      icon: <MapPin className="w-4 h-4" />, 
      chibiImage: chibiLocation,
      colorClass: 'text-indigo-500', 
      activeClass: 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/25', 
      hoverClass: 'hover:bg-indigo-50 hover:text-indigo-700' 
    },
    { 
      id: 'rain', 
      label: 'รายงานสภาพอากาศในพื้นที่', 
      icon: <CloudRain className="w-4 h-4" />, 
      chibiImage: chibiRainMonitor,
      colorClass: 'text-amber-500', 
      activeClass: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25', 
      hoverClass: 'hover:bg-amber-50 hover:text-amber-700' 
    },
    { 
      id: 'volunteers', 
      label: 'อาสาสมัครป้องกันภัยฝ่ายพลเรือน (อปพร.)', 
      icon: <ShieldAlert className="w-4 h-4" />, 
      chibiImage: chibiTeam,
      colorClass: 'text-blue-500', 
      activeClass: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25', 
      hoverClass: 'hover:bg-blue-50 hover:text-blue-700' 
    },
    { 
      id: 'cloud', 
      label: 'คลาวด์จัดเก็บไฟล์', 
      icon: <Cloud className="w-4 h-4" />, 
      chibiImage: chibiStorage,
      colorClass: 'text-cyan-500', 
      activeClass: 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/25', 
      hoverClass: 'hover:bg-cyan-50 hover:text-cyan-700' 
    }
  ];

  return (
    <div className="min-h-screen bg-[#fcf8f5] flex flex-col lg:flex-row w-full max-w-full min-w-0 overflow-x-hidden" id="app-workspace">
      
      {/* DESKTOP SIDEBAR */}
      <aside className={`hidden lg:flex flex-col w-64 bg-white border-r border-orange-100 h-screen sticky top-0 z-30 shrink-0 p-5 justify-between ${isMapFullScreen ? 'lg:!hidden' : ''}`} id="desktop-sidebar">
        <div className="space-y-6">
          
          {/* Logo Brand */}
          <div className="flex items-center space-x-3">
            <img src={logo} alt="อบต. ม่อนจอง" className="w-12 h-12 shrink-0 object-contain" referrerPolicy="no-referrer" />
            <div>
              <h1 className="font-heading text-xs font-bold text-orange-950 tracking-tight leading-none whitespace-nowrap">
                งานป้องกันและบรรเทาสาธารณภัย
              </h1>
              <p className="text-[10px] text-orange-600 font-bold mt-1.5">อบต.ม่อนจอง</p>
            </div>
          </div>

          {/* Profile widget */}
          <div 
            onClick={handleOpenProfileEdit}
            className="bg-orange-50/50 border border-orange-100 p-3 rounded-xl flex items-center space-x-3 cursor-pointer hover:bg-orange-100/60 transition-all group/profile"
            title="คลิกเพื่อแก้ไขข้อมูลโปรไฟล์ผู้ใช้งาน"
          >
            <ProfileAvatar 
              src={currentUser.photoUrl} 
              name={currentUser.name} 
              className="w-10 h-10 rounded-full border border-orange-200 shadow-sm transition-transform duration-300 group-hover/profile:scale-105"
            />
            <div className="text-left leading-tight min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900 font-heading truncate block max-w-[120px]">
                  {currentUser.name}
                </span>
                <Edit3 className="w-3.5 h-3.5 text-orange-400 group-hover/profile:text-orange-600 opacity-0 group-hover/profile:opacity-100 transition-all duration-200 shrink-0 ml-1" />
              </div>
              <span className="text-[10px] text-gray-500 truncate block mt-0.5">{currentUser.position}</span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="flex flex-col space-y-1" id="desktop-sidebar-nav">
            {menuItems.map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as TabType)}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-heading font-bold transition-all duration-250 w-full text-left relative overflow-hidden group ${
                    isActive
                      ? `${item.activeClass} scale-[1.02]`
                      : `text-orange-950 ${item.hoverClass} hover:translate-x-1`
                  }`}
                >
                  <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-white/80 shadow-md bg-white shrink-0 flex items-center justify-center select-none">
                    <motion.img 
                      src={item.chibiImage} 
                      alt={item.label} 
                      className="w-full h-full object-cover"
                      animate={{ y: isActive ? [0, -3, 0] : 0 }}
                      whileHover={{ scale: 1.2, rotate: [0, -6, 6, 0] }}
                      transition={{ 
                        y: isActive ? { repeat: Infinity, duration: 2.5, ease: "easeInOut" } : { type: "spring" },
                        scale: { type: "spring", stiffness: 300, damping: 10 }
                      }}
                    />
                  </div>
                  <span className="relative z-10">{item.label}</span>
                </button>
              );
            })}
          </nav>

        </div>

        <div className="space-y-2 pt-4 border-t border-orange-50">
          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2.5 w-full px-3 py-2 rounded-xl text-xs font-heading font-semibold text-gray-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition mt-2"
          >
            <LogOut className="w-4 h-4 text-gray-400 group-hover:text-rose-500" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER (ONLY VISIBLE ON MOBILE) */}
      <header className="lg:hidden sticky top-0 bg-white/90 backdrop-blur-md border-b border-orange-100/50 p-3 sm:p-4 z-40 w-full max-w-full min-w-0" id="main-header">
        <div className="flex items-center justify-between gap-2 sm:gap-4 max-w-full">
          
          {/* Logo Brand */}
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <img src={logo} alt="อบต. ม่อนจอง" className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 object-contain" referrerPolicy="no-referrer" />
            <div className="min-w-0">
              <h1 className="font-heading text-[11px] sm:text-xs font-bold text-orange-950 tracking-tight leading-none truncate">
                งานป้องกันและบรรเทาสาธารณภัย
              </h1>
              <p className="text-[9px] text-orange-600 font-bold mt-0.5 truncate">อบต. ม่อนจอง</p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition"
              title="ออกจากระบบ"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>

            {/* Mobile Nav Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg bg-orange-50 text-orange-800 focus:outline-none"
              id="btn-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>

        </div>
      </header>

      {/* MOBILE NAVIGATION MENU PANEL */}
      {mobileMenuOpen && (
        <div className="bg-white border-b border-orange-100 p-3 sm:p-4 space-y-1.5 lg:hidden animate-fade-in z-30 sticky top-[53px] sm:top-[57px] max-w-full overflow-hidden" id="mobile-nav">
          <div 
            onClick={handleOpenProfileEdit}
            className="p-3 bg-orange-50 hover:bg-orange-100/70 active:bg-orange-200/50 transition-all rounded-xl flex items-center justify-between cursor-pointer mb-3 max-w-full"
            title="คลิกเพื่อแก้ไขข้อมูลโปรไฟล์ผู้ใช้งาน"
          >
            <div className="flex items-center space-x-2.5 min-w-0 flex-1">
              <ProfileAvatar 
                src={currentUser.photoUrl} 
                name={currentUser.name} 
                className="w-10 h-10 rounded-full border border-orange-200 shadow-sm shrink-0"
              />
              <div className="text-left text-xs min-w-0 flex-1">
                <span className="font-bold text-orange-950 font-heading block truncate">{currentUser.name}</span>
                <span className="text-[10px] text-gray-500 block truncate">{currentUser.position}</span>
              </div>
            </div>
            <Edit3 className="w-4 h-4 text-orange-500 shrink-0 ml-2" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-full">
            {menuItems.map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as TabType);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center space-x-2.5 p-2 rounded-xl text-xs font-heading font-semibold transition-all max-w-full overflow-hidden ${
                    isActive
                      ? `${item.activeClass} scale-[1.01]`
                      : `bg-orange-50/30 text-orange-950 border border-orange-100/50 ${item.hoverClass}`
                  }`}
                >
                  <div className="relative w-7 h-7 rounded-full overflow-hidden border-2 border-white/80 shadow-md bg-white shrink-0 flex items-center justify-center select-none">
                    <motion.img 
                      src={item.chibiImage} 
                      alt={item.label} 
                      className="w-full h-full object-cover"
                      animate={{ y: isActive ? [0, -2, 0] : 0 }}
                      whileTap={{ scale: 0.9 }}
                      transition={{ 
                        y: isActive ? { repeat: Infinity, duration: 2.5, ease: "easeInOut" } : { type: "spring" }
                      }}
                    />
                  </div>
                  <span className="truncate flex-1 text-left">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-orange-100">
            {/* Sync button removed */}
          </div>
        </div>
      )}

      {/* MAIN APPLICATION CONTAINER SECTION & FOOTER */}
      <div className="flex-grow flex flex-col min-h-screen w-full max-w-full min-w-0 overflow-x-hidden" id="main-content-scroller">
        
        <main className="flex-grow flex flex-col w-full max-w-full min-w-0 p-3 sm:p-4 md:p-6 z-10" id="workspace-content">
          
          {/* Loading Spinner */}
          {loading ? (
            <div className="py-24 text-center space-y-4 bg-white/50 rounded-2xl border border-orange-50 p-6 animate-fade-in flex-grow flex flex-col items-center justify-center w-full max-w-full">
              <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="font-heading font-semibold text-xs text-orange-950">กำลังโหลดข้อมูล...</p>
            </div>
          ) : (
            <div className={isMapFullScreen ? "flex-grow flex flex-col w-full max-w-full min-w-0" : "animate-fade-in flex-grow flex flex-col w-full max-w-full min-w-0"} id="active-tab-container">
              {/* Render selected module panel */}
              {activeTab === 'schedule' && (
                <TaskSchedule 
                  tasks={tasks} 
                  onSaveTasks={(items) => handleSaveCollection('tasks', items)} 
                  showToast={showToast} 
                  showConfirm={showConfirm}
                  docs={docs}
                  onSaveDocs={(items) => handleSaveCollection('docs', items)}
                />
              )}

              {activeTab === 'equipment' && (
                <EquipmentBorrow 
                  equipment={equipment} 
                  borrows={borrows} 
                  dispenses={dispenses}
                  onSaveEquipment={(items) => handleSaveCollection('equipment', items)} 
                  onSaveBorrows={(items) => handleSaveCollection('borrows', items)} 
                  onSaveDispenses={(items) => handleSaveCollection('dispenses', items)}
                  onRefreshData={loadAllData}
                  showToast={showToast} 
                  showConfirm={showConfirm}
                />
              )}


              {activeTab === 'docs' && (
                <OfficialDocs 
                  docs={docs} 
                  onSaveDocs={(items) => handleSaveCollection('docs', items)} 
                  tasks={tasks}
                  onSaveTasks={(items) => handleSaveCollection('tasks', items)}
                  showToast={showToast} 
                  showConfirm={showConfirm}
                />
              )}

              {activeTab === 'expenses' && (
                <Expenses 
                  expenses={expenses} 
                  onSaveExpenses={(items) => handleSaveCollection('expenses', items)} 
                  showToast={showToast} 
                  showConfirm={showConfirm}
                />
              )}

              {activeTab === 'websites' && (
                <RelatedWebsites 
                  links={links} 
                  onSaveLinks={(items) => handleSaveCollection('links', items)} 
                  showToast={showToast} 
                  showConfirm={showConfirm}
                />
              )}

              {activeTab === 'employees' && (
                <EmployeeInfo 
                  employees={employees} 
                  onSaveEmployees={(items) => handleSaveCollection('employees', items)} 
                  showToast={showToast} 
                  showConfirm={showConfirm}
                />
              )}

              {activeTab === 'locations' && (
                <MonJongLocations 
                  locations={locations} 
                  onSaveLocations={(items) => handleSaveCollection('locations', items)} 
                  showToast={showToast} 
                  showConfirm={showConfirm}
                  onFullScreenToggle={setIsMapFullScreen}
                />
              )}

              {activeTab === 'rain' && (
                <RainDailyEWS 
                  showToast={showToast} 
                  showConfirm={showConfirm}
                  tasks={tasks}
                  expenses={expenses}
                />
              )}
              
              {activeTab === 'cloud' && (
                <CloudStorage 
                  files={cloudFiles} 
                  onSaveFiles={(items) => handleSaveCollection('cloudFiles', items)} 
                  currentUser={currentUser}
                  showToast={showToast} 
                  showConfirm={showConfirm}
                />
              )}
              {activeTab === 'volunteers' && (
                <Volunteers 
                  volunteers={volunteers}
                  finances={volunteerFinances}
                  onSaveVolunteers={(items) => handleSaveCollection('volunteers', items)}
                  onSaveFinances={(items) => handleSaveCollection('volunteerFinances', items)}
                  currentUser={currentUser}
                  showToast={showToast}
                />
              )}
            </div>
          )}

        </main>

        {/* FOOTER OF WORKSPACE */}
        <footer className="py-5 text-center text-xs text-gray-400 border-t border-orange-100 bg-white/40 backdrop-blur-sm shrink-0 mt-auto" id="main-footer">
          <div className="w-full px-6 text-center">
            <p>งานป้องกันและบรรเทาสาธารณภัย อบต.ม่อนจอง © 2026. พัฒนาระบบโดย Oam snr</p>
          </div>
        </footer>

      </div>

      {/* SETTINGS DIALOG (GOOGLE SHEETS SETUP) */}
      {isGasModalOpen && (
        <GasSettings 
          onClose={() => setIsGasModalOpen(false)} 
          onUrlUpdated={handleUrlUpdated} 
          showToast={showToast} 
        />
      )}

      {/* NOTIFICATION TOAST POPUP */}
      {toast && (
        <div 
          className={`fixed bottom-6 right-6 max-w-sm p-4 rounded-xl shadow-lg flex items-start space-x-3 border z-[99999] animate-slide-in-up transition-all ${
            toast.type === 'success' 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-900' 
              : toast.type === 'error'
              ? 'bg-rose-50 border-rose-100 text-rose-900'
              : 'bg-orange-50 border-orange-100 text-orange-900'
          }`}
          id="toast-popup"
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />}
          {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />}
          
          <div className="text-xs">
            <span className="font-bold block font-heading mb-0.5">
              {toast.type === 'success' ? 'ดำเนินการสำเร็จ' : toast.type === 'error' ? 'แจ้งเตือนข้อผิดพลาด' : 'ข้อมูลระบบ'}
            </span>
            <p className="font-sans leading-relaxed text-gray-600">{toast.message}</p>
          </div>
        </div>
      )}

      {showTodayTasks && currentUser && (
        <TodayTasksPopup
          isOpen={showTodayTasks}
          tasks={tasks}
          onClose={() => setShowTodayTasks(false)}
          userName={currentUser.name}
        />
      )}

      {confirmState && (
        <CenteredConfirm
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          type={confirmState.type}
          onConfirm={() => {
            confirmState.resolve(true);
            setConfirmState(null);
          }}
          onCancel={() => {
            confirmState.resolve(false);
            setConfirmState(null);
          }}
        />
      )}

      {/* PROFILE EDIT DIALOG */}
      <AnimatePresence>
        {isProfileEditOpen && currentUser && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[99] flex items-center justify-center p-4 overflow-y-auto"
            id="profile-edit-modal"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              transition={{ type: "spring", damping: 20, stiffness: 280 }}
              className="bg-orange-50/95 backdrop-blur-sm rounded-[2.5rem] w-full max-w-3xl shadow-[0_25px_50px_-12px_rgba(234,88,12,0.25)] border-4 border-white overflow-hidden transform relative font-sans text-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Banner Accent */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 z-10" />

              {/* Header */}
              <div className="bg-gradient-to-br from-orange-500 to-amber-500 text-white p-6 relative flex items-center gap-4 border-b-4 border-white/50">
                <button 
                  type="button"
                  onClick={() => setIsProfileEditOpen(false)}
                  className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all hover:rotate-90 active:scale-90"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/80 shadow-md bg-white shrink-0 hidden sm:block">
                  <img src={chibiOfficerWork} alt="Chibi Header" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-lg sm:text-xl flex items-center gap-2 tracking-wide drop-shadow-sm">
                    <UserCheck className="w-6 h-6 text-orange-200" />
                    แก้ไขข้อมูลโปรไฟล์ & ตั้งรหัสผ่านใหม่ ✨
                  </h3>
                  <p className="text-orange-50 text-xs mt-0.5 font-medium">จัดการบัญชีผู้ใช้งาน และปรับปรุงรหัสผ่านความปลอดภัยสไตล์จิบิแสนน่ารัก</p>
                </div>
              </div>

              {/* Main Content Layout */}
              <form onSubmit={handleSaveProfile} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  
                  {/* LEFT COLUMN: Chibi Avatar & Cartoon Mascot Status */}
                  <div className="md:col-span-5 bg-white/80 rounded-3xl p-5 border-2 border-orange-100 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                    {/* Floating decorative elements */}
                    <div className="absolute top-2 left-2 w-4 h-4 rounded-full bg-amber-200/40 animate-pulse" />
                    <div className="absolute bottom-4 right-3 w-6 h-6 rounded-full bg-orange-200/40 animate-bounce" style={{ animationDuration: '4s' }} />
                    
                    <div className="relative group/avatar mb-4">
                      <ProfileAvatar 
                        src={profilePhotoUrl} 
                        name={profileName || 'User'} 
                        className="w-28 h-28 rounded-full border-4 border-orange-400 shadow-xl object-cover"
                      />
                      
                      {/* Photo Change trigger Overlay */}
                      <label className="absolute bottom-0 right-0 bg-gradient-to-tr from-orange-500 to-amber-500 text-white p-2.5 rounded-full cursor-pointer hover:from-orange-600 hover:to-amber-600 shadow-lg border-2 border-white transition-transform hover:scale-110 active:scale-95 flex items-center justify-center">
                        <Camera className="w-4 h-4" />
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleProfilePhotoChange}
                          className="hidden" 
                        />
                      </label>

                      {isUploadingProfile && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center border-4 border-orange-400">
                          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    
                    <h4 className="text-sm font-black text-gray-800 font-heading">{profileName || 'ชื่อพนักงาน'}</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded-full">{profilePosition || 'ตำแหน่งงาน'}</p>

                    {/* Cute Separator */}
                    <div className="w-full border-t border-dashed border-orange-200/60 my-4" />

                    {/* Chibi Mascot Dynamic Status Area */}
                    <div className="w-full flex flex-col items-center">
                      <AnimatePresence mode="wait">
                        {!isOldPasswordVerified ? (
                          <motion.div 
                            key="unverified-chibi"
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="text-center flex flex-col items-center w-full"
                          >
                            <p className="text-[11px] font-bold text-amber-600 flex items-center justify-center gap-1 bg-amber-50 px-3 py-2.5 rounded-xl border border-amber-100 font-heading w-full shadow-sm">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              กรุณายืนยันรหัสผ่านเดิมก่อนแก้ไข
                            </p>
                          </motion.div>
                        ) : (
                          <motion.div 
                            key="verified-chibi"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 260, damping: 15 }}
                            className="text-center flex flex-col items-center w-full"
                          >
                            <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-3 py-2.5 rounded-xl border border-emerald-100 flex flex-col items-center justify-center gap-1 font-heading w-full shadow-sm">
                              <span className="flex items-center gap-1">✓ ยืนยันสิทธิ์สำเร็จ! 🎉</span>
                              <span className="text-[10px] text-emerald-500 font-normal">สามารถตั้งรหัสผ่านใหม่ได้แล้ว</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                  </div>

                  {/* RIGHT COLUMN: Form Inputs */}
                  <div className="md:col-span-7 space-y-4">
                    <div className="bg-white/80 rounded-3xl p-5 border-2 border-orange-100 shadow-sm space-y-3.5">
                      <div>
                        <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1 font-heading flex items-center gap-1">
                          📧 อีเมลประจำบัญชี (แก้ไขไม่ได้)
                        </label>
                        <input 
                          type="email" 
                          value={currentUser.email} 
                          disabled 
                          className="w-full px-4 py-2.5 rounded-xl text-xs bg-gray-100/80 border-2 border-gray-200/50 text-gray-400 font-bold cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-gray-700 uppercase tracking-wider mb-1 font-heading flex items-center gap-1">
                          👤 ชื่อ-นามสกุลจริง
                        </label>
                        <input 
                          type="text" 
                          value={profileName} 
                          onChange={(e) => setProfileName(e.target.value)}
                          required
                          placeholder="กรอกชื่อและนามสกุลจริง"
                          className="w-full px-4 py-2.5 rounded-xl text-xs border-2 border-orange-100 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100/50 transition-all font-medium bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-black text-gray-700 uppercase tracking-wider mb-1 font-heading flex items-center gap-1">
                            💼 ตำแหน่งงาน
                          </label>
                          <input 
                            type="text" 
                            value={profilePosition} 
                            onChange={(e) => setProfilePosition(e.target.value)}
                            required
                            placeholder="ระบุตำแหน่ง"
                            className="w-full px-4 py-2.5 rounded-xl text-xs border-2 border-orange-100 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100/50 transition-all font-medium bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black text-gray-700 uppercase tracking-wider mb-1 font-heading flex items-center gap-1">
                            📞 เบอร์โทรศัพท์
                          </label>
                          <input 
                            type="tel" 
                            value={profileTel} 
                            onChange={(e) => setProfileTel(e.target.value)}
                            required
                            pattern="[0-9]{9,10}"
                            placeholder="มือถือ 9-10 หลัก"
                            className="w-full px-4 py-2.5 rounded-xl text-xs border-2 border-orange-100 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100/50 transition-all font-medium bg-white"
                          />
                        </div>
                      </div>

                      {/* PASSWORD CHANGE WORKFLOW SECTION */}
                      <div className="pt-2 border-t border-dashed border-orange-100">
                        <label className="block text-[11px] font-black text-gray-700 uppercase tracking-wider mb-1.5 font-heading flex items-center gap-1">
                          🔑 รหัสผ่านเดิม (เพื่อยืนยันสิทธิ์)
                        </label>
                        <div className="flex gap-2">
                          <input 
                            type="password" 
                            value={oldPasswordInput} 
                            onChange={(e) => setOldPasswordInput(e.target.value)}
                            placeholder={isOldPasswordVerified ? "ยืนยันถูกต้องแล้ว" : "กรอกรหัสผ่านปัจจุบันเพื่อปลดล็อก"}
                            disabled={isOldPasswordVerified}
                            className={`flex-1 px-4 py-2.5 rounded-xl text-xs border-2 font-medium transition-all ${
                              isOldPasswordVerified 
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-bold cursor-not-allowed" 
                                : "border-orange-100 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100/50 bg-white"
                            }`}
                          />
                          {!isOldPasswordVerified && (
                            <motion.button
                              whileHover={{ scale: 1.03, translateY: -1 }}
                              whileTap={{ scale: 0.97 }}
                              type="button"
                              onClick={async () => {
                                if (!oldPasswordInput) {
                                  showToast('กรุณากรอกรหัสผ่านเดิม', 'error');
                                  return;
                                }
                                setLoading(true);
                                let verified = false;

                                // 1. ตรวจสอบจาก currentUser state โดยตรง
                                if (currentUser?.password && oldPasswordInput === currentUser.password) {
                                  verified = true;
                                }

                                // 2. ตรวจสอบจาก Local Users ใน localStorage เป็น fallback
                                if (!verified && currentUser?.email) {
                                  try {
                                    const localUsersStr = localStorage.getItem('orange_office_local_users') || '[]';
                                    const localUsers = JSON.parse(localUsersStr);
                                    const found = localUsers.find((u: any) => u.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim());
                                    if (found && found.password === oldPasswordInput) {
                                      verified = true;
                                    }
                                  } catch (e) {
                                    console.error(e);
                                  }
                                }

                                // 3. ตรวจสอบกับ Google Sheets Web App
                                if (!verified && currentUser?.email && gasUrl) {
                                  try {
                                    const resData = await loginUserClient(currentUser.email, oldPasswordInput);
                                    if (resData.success) {
                                      verified = true;
                                    }
                                  } catch (err) {
                                    console.error('GAS verification failed:', err);
                                  }
                                }

                                setLoading(false);

                                if (verified) {
                                  setIsOldPasswordVerified(true);
                                  const updated = { ...currentUser, password: oldPasswordInput };
                                  setCurrentUser(updated);
                                  setLoggedUser(updated);
                                  showToast('ยืนยันรหัสผ่านเดิมถูกต้อง ✨', 'success');
                                } else {
                                  showToast('รหัสผ่านเดิมไม่ถูกต้อง ❌', 'error');
                                }
                              }}
                              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-xs font-black font-heading shadow-md shadow-orange-500/20 active:translate-y-[2px]"
                            >
                              ยืนยันสิทธิ์
                            </motion.button>
                          )}
                          {isOldPasswordVerified && (
                            <div className="px-3.5 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center justify-center shadow-md shadow-emerald-500/20">
                              ✓ ผ่าน
                            </div>
                          )}
                        </div>
                      </div>

                      {/* NEW PASSWORD INPUT */}
                      <AnimatePresence>
                        {isOldPasswordVerified && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0, scale: 0.95 }}
                            animate={{ opacity: 1, height: 'auto', scale: 1 }}
                            exit={{ opacity: 0, height: 0, scale: 0.95 }}
                            className="pt-3 border-t-2 border-dashed border-emerald-100/50 overflow-hidden"
                          >
                            <label className="block text-[11px] font-black text-emerald-700 uppercase tracking-wider mb-1 font-heading flex items-center gap-1">
                              ⭐ รหัสผ่านใหม่ที่ต้องการเปลี่ยน (6-12 ตัวอักษร)
                            </label>
                            <input 
                              type="password" 
                              value={newPasswordInput} 
                              onChange={(e) => setNewPasswordInput(e.target.value)}
                              placeholder="กรอกรหัสผ่านใหม่ (ต้องจำให้แม่นยำ!)"
                              className="w-full px-4 py-2.5 rounded-xl text-xs border-2 border-emerald-200 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 bg-white text-emerald-900 font-bold"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>

                    {/* ACTION BUTTONS WITH 3D PLAYFUL DESIGN */}
                    <div className="flex space-x-3 pt-2">
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button" 
                        onClick={() => setIsProfileEditOpen(false)}
                        className="flex-1 py-3 rounded-2xl border-2 border-gray-300 text-gray-600 bg-white text-xs font-black font-heading hover:bg-gray-50 active:translate-y-[2px] shadow-sm transition-all"
                      >
                        ปิดหน้าต่าง ✖
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit" 
                        disabled={isUploadingProfile}
                        className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black font-heading flex items-center justify-center space-x-2 shadow-[0_4px_0_0_#ea580c] active:translate-y-[2px] active:shadow-[0_2px_0_0_#ea580c] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save className="w-4 h-4" />
                        <span>บันทึกข้อมูล & รหัสผ่านใหม่ 💾</span>
                      </motion.button>
                    </div>

                  </div>

                </div>
              </form>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
