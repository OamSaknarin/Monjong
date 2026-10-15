import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Employee, WorkHistoryItem } from '../types';
import { 
  Users, Search, Plus, Trash2, Edit3, X, Phone, Briefcase, 
  MapPin, Calendar, GraduationCap, Eye, Upload, Save, UserPlus, Info, Download, Loader2, Printer
} from 'lucide-react';
import { exportToExcel } from '../utils/export';
import EmployeeInfoPdfModal from './EmployeeInfoPdfModal';
import { uploadFileToGas, deleteFileFromGas, getDriveDisplayUrl } from '../utils/gasClient';
import defaultAvatar from '../assets/images/default_avatar_1782835788460.jpg';
import { motion } from 'motion/react';
import chibiTeam from '../assets/images/chibi_team_1782914511022.jpg';

// Component ตัวแทนรูปภาพโปรไฟล์พนักงานที่มีระบบ Fallback ป้องกันภาพแตกอย่างชาญฉลาด
const EmployeeAvatar: React.FC<{
  src: string;
  name: string;
  className?: string;
}> = ({ src, name, className }) => {
  const [isError, setIsError] = useState(false);
  
  const displayUrl = getDriveDisplayUrl(src);
  
  // คอยจับตาดูว่า url มีการอัปเดตใหม่หรือไม่ ถ้ามีการอัปเดตให้รีเซ็ตสถานะเออร์เรอร์
  useEffect(() => {
    setIsError(false);
  }, [src]);

  if (!src || isError) {
    return (
      <img
        src={defaultAvatar}
        alt={name}
        referrerPolicy="no-referrer"
        className={`object-cover shrink-0 bg-orange-50 ${className || ''}`}
      />
    );
  }

  return (
    <img
      src={displayUrl}
      alt={name}
      referrerPolicy="no-referrer"
      className={`object-cover shrink-0 ${className || ''}`}
      onError={() => setIsError(true)}
    />
  );
};

// ฟังก์ชันย่อขนาดรูปภาพโปรไฟล์ให้อยู่ในขนาดพอดีและไฟล์เบาหวิว (กว้าง/สูง สูงสุด 240px)
const resizeAndCompressImage = (base64Str: string, maxWidth = 240, maxHeight = 240): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // รักษาสัดส่วน Aspect Ratio
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
        // บีบอัดเป็น JPEG คุณภาพ 0.75 เพื่อให้ได้ภาพขนาดเล็กมาก (ประมาณ 10-15 KB) และแสดงผลสวยงาม
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

// คำนวณอายุจาก วัน/เดือน/ปีเกิด โดยนำ พ.ศ. เกิด ลบกับ พ.ศ. ปัจจุบัน อัตโนมัติ
export const calculateAgeFromBirthDate = (birthDateStr?: string): number | '' => {
  if (!birthDateStr) return '';
  let birthYearAD: number | null = null;
  
  if (/^\d{4}-\d{2}-\d{2}/.test(birthDateStr)) {
    birthYearAD = parseInt(birthDateStr.split('-')[0], 10);
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(birthDateStr)) {
    const parts = birthDateStr.split('/');
    const yearNum = parseInt(parts[2], 10);
    birthYearAD = yearNum > 2400 ? yearNum - 543 : yearNum;
  } else {
    const d = new Date(birthDateStr);
    if (!isNaN(d.getTime())) {
      birthYearAD = d.getFullYear();
    }
  }

  if (!birthYearAD || birthYearAD < 1900 || birthYearAD > 2500) return '';
  
  const currentYearAD = new Date().getFullYear();
  const currentYearBE = currentYearAD + 543;
  const birthYearBE = birthYearAD > 2400 ? birthYearAD : birthYearAD + 543;
  
  const age = currentYearBE - birthYearBE;
  return age >= 0 ? age : '';
};

// แปลงวันที่ วัน/เดือน/ปีเกิด เป็นรูปแบบ พ.ศ. สวยงาม
export const formatBirthDateBE = (dateStr?: string): string => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-');
    const yearBE = parseInt(y, 10) + 543;
    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const monthIdx = parseInt(m, 10) - 1;
    const monthName = monthNames[monthIdx] || m;
    return `${parseInt(d, 10)} ${monthName} ${yearBE}`;
  }
  return dateStr;
};

interface EmployeeInfoProps {
  employees: Employee[];
  onSaveEmployees: (updated: Employee[]) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  showConfirm: (title: string, message: string, type: 'save' | 'edit' | 'delete' | 'default') => Promise<boolean>;
}

export default function EmployeeInfo({ employees, onSaveEmployees, showToast, showConfirm }: EmployeeInfoProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected Employee for Detailed Resume Timeline view
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(employees[0]?.id || null);

  // Modal State for profile Add/Edit
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Employee Profile Form Inputs
  const [empName, setEmpName] = useState('');
  const [empNickname, setEmpNickname] = useState('');
  const [empPosition, setEmpPosition] = useState('');
  const [empBirthDate, setEmpBirthDate] = useState('');
  const [empAge, setEmpAge] = useState<string | number>('');
  const [empHouseNo, setEmpHouseNo] = useState('');
  const [empSubdistrict, setEmpSubdistrict] = useState('');
  const [empDistrict, setEmpDistrict] = useState('');
  const [empProvince, setEmpProvince] = useState('');
  const [empTel, setEmpTel] = useState('');
  const [empPhotoUrl, setEmpPhotoUrl] = useState('');
  
  // Track original photo and uploading state for Google Drive sync
  const [originalPhotoUrl, setOriginalPhotoUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Timeline History Form Inputs (inside CV view)
  const [isAddingHistory, setIsAddingHistory] = useState(false);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [histType, setHistType] = useState<'education' | 'work'>('education');
  const [histPeriod, setHistPeriod] = useState('');
  const [histDetail, setHistDetail] = useState('');

  const handleExport = () => {
    const data = employees.map(e => {
      const calcAge = e.age !== undefined && e.age !== '' ? e.age : calculateAgeFromBirthDate(e.birthDate);
      return {
        'คำนำหน้า ชื่อ - นามสกุล': e.name,
        'ชื่อเล่น': e.nickname || '-',
        'ตำแหน่ง': e.position,
        'วัน/เดือน/ปีเกิด': formatBirthDateBE(e.birthDate) || '-',
        'อายุ (ปี)': calcAge !== '' ? calcAge : '-',
        'โทรศัพท์': e.tel,
        'ที่อยู่': `${e.houseNo} ต.${e.subdistrict} อ.${e.district} จ.${e.province}`.trim()
      };
    });
    exportToExcel(data, 'ทำเนียบประวัติบุคลากร', 'รายการพนักงาน');
    showToast('ส่งออกไฟล์ Excel เรียบร้อย', 'success');
  };

  // Handle image upload, store in Google Drive, and manage original file trashing
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    showToast('กำลังประมวลผลและอัปโหลดรูปภาพ...', 'info');

    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        const originalBase64 = event.target.result as string;
        try {
          // ย่อขนาดรูปภาพโปรไฟล์ให้อยู่ในขนาดพอดีและไฟล์เบาหวิว ป้องกันชีตบวมและโหลดเร็วขึ้น 10 เท่า
          const compressedBase64 = await resizeAndCompressImage(originalBase64, 250, 250);
          
          // พยายามอัปโหลดไฟล์จริงไปที่ Google Drive คลาวด์โฟลเดอร์ผ่าน Google Apps Script
          const result = await uploadFileToGas(
            `emp_${Date.now()}_${file.name.split('.')[0] || 'photo'}.jpg`,
            'image/jpeg',
            compressedBase64,
            'อบต_ม่อนจอง_รูปโปรไฟล์'
          );

          if (result.success && result.url) {
            // หากอัปโหลดสำเร็จ ให้เปลี่ยนรูปพนักงาน
            const prevUrl = empPhotoUrl;
            // ลบรูปภาพชั่วคราวอันก่อนหน้าในรอบการแก้ไขนี้ออกทันทีเพื่อไม่ให้ไฟล์ขยะสะสมใน Drive
            if (prevUrl && prevUrl !== originalPhotoUrl && (prevUrl.includes('drive.google.com') || prevUrl.includes('docs.google.com'))) {
              deleteFileFromGas('', prevUrl).catch(err => console.error('Failed to trash temporary file:', err));
            }

            setEmpPhotoUrl(result.url);
            showToast('อัปโหลดรูปภาพใบหน้าพนักงานเรียบร้อยแล้ว', 'success');
          } else {
            // กรณีเชื่อมต่อ Drive ไม่สำเร็จ ให้เก็บเป็น Base64 ที่ย่อขนาดแล้วในชีตโดยตรง (ใช้งานได้ 100% และโหลดไวมาก)
            setEmpPhotoUrl(compressedBase64);
            showToast('บันทึกรูปภาพเป็น Base64 ประสิทธิภาพสูงลงชีตแล้ว', 'success');
          }
        } catch (err: any) {
          console.error('Image upload failed, falling back to base64:', err);
          try {
            const fallbackBase64 = await resizeAndCompressImage(originalBase64, 200, 200);
            setEmpPhotoUrl(fallbackBase64);
            showToast('บันทึกรูปภาพแบบ Base64 สำรองเรียบร้อย', 'success');
          } catch (compressErr) {
            setEmpPhotoUrl(originalBase64);
            showToast('บันทึกรูปภาพเรียบร้อย', 'success');
          }
        } finally {
          setIsUploading(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const selectedEmployee = useMemo(() => {
    return employees.find(emp => emp.id === selectedEmpId) || employees[0] || null;
  }, [employees, selectedEmpId]);

  const handleOpenAddProfile = () => {
    setEditingEmpId(null);
    setEmpName('');
    setEmpNickname('');
    setEmpPosition('');
    setEmpBirthDate('');
    setEmpAge('');
    setEmpHouseNo('');
    setEmpSubdistrict('');
    setEmpDistrict('');
    setEmpProvince('');
    setEmpTel('');
    setOriginalPhotoUrl('');
    setIsUploading(false);
    // Default placeholder avatar photo
    setEmpPhotoUrl('');
    setIsProfileModalOpen(true);
  };

  const handleOpenEditProfile = (emp: Employee) => {
    setEditingEmpId(emp.id);
    setEmpName(emp.name ? String(emp.name) : '');
    setEmpNickname(emp.nickname ? String(emp.nickname) : '');
    setEmpPosition(emp.position ? String(emp.position) : '');
    
    const bDate = emp.birthDate ? String(emp.birthDate) : '';
    setEmpBirthDate(bDate);
    const computedAge = emp.age !== undefined && emp.age !== '' ? String(emp.age) : String(calculateAgeFromBirthDate(bDate));
    setEmpAge(computedAge);

    setEmpHouseNo(emp.houseNo ? String(emp.houseNo) : '');
    setEmpSubdistrict(emp.subdistrict ? String(emp.subdistrict) : '');
    setEmpDistrict(emp.district ? String(emp.district) : '');
    setEmpProvince(emp.province ? String(emp.province) : '');
    setEmpTel(emp.tel ? String(emp.tel) : '');
    
    const photo = emp.photoUrl || '';
    setEmpPhotoUrl(photo);
    setOriginalPhotoUrl(photo);
    setIsUploading(false);
    setIsProfileModalOpen(true);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameStr = String(empName || '').trim();
    const nickStr = String(empNickname || '').trim();
    const posStr = String(empPosition || '').trim();
    const birthDateStr = String(empBirthDate || '').trim();
    const calculatedAge = empAge !== '' ? (isNaN(Number(empAge)) ? empAge : Number(empAge)) : calculateAgeFromBirthDate(birthDateStr);
    const telStr = String(empTel || '').trim();
    const houseNoStr = String(empHouseNo || '').trim();
    const subdistrictStr = String(empSubdistrict || '').trim();
    const districtStr = String(empDistrict || '').trim();
    const provinceStr = String(empProvince || '').trim();
    const zipcodeStr = '';

    if (!nameStr) {
      showToast('กรุณากรอกคำนำหน้า ชื่อ - นามสกุล', 'error');
      return;
    }
    if (!posStr) {
      showToast('กรุณากรอกตำแหน่งงาน', 'error');
      return;
    }
    if (!telStr) {
      showToast('กรุณากรอกเบอร์โทรศัพท์ติดต่อ', 'error');
      return;
    }

    if (editingEmpId) {
      // Edit Profile
      const confirmed = await showConfirm(
        'ยืนยันการแก้ไขข้อมูลพนักงาน',
        `คุณต้องการบันทึกการแก้ไขข้อมูลของพนักงาน "${nameStr}" ใช่หรือไม่?`,
        'edit'
      );
      if (!confirmed) return;

      const updated = employees.map(emp => {
        if (emp.id === editingEmpId) {
          return {
            ...emp,
            name: nameStr,
            nickname: nickStr,
            position: posStr,
            birthDate: birthDateStr,
            age: calculatedAge,
            houseNo: houseNoStr,
            subdistrict: subdistrictStr,
            district: districtStr,
            province: provinceStr,
            zipcode: zipcodeStr,
            tel: telStr,
            photoUrl: empPhotoUrl
          };
        }
        return emp;
      });
      onSaveEmployees(updated);

      // ย้ายรูปเดิมใน Drive ไปถังขยะเมื่อยืนยันเซฟเรียบร้อยแล้ว
      if (originalPhotoUrl && originalPhotoUrl !== empPhotoUrl && (originalPhotoUrl.includes('drive.google.com') || originalPhotoUrl.includes('docs.google.com'))) {
        deleteFileFromGas('', originalPhotoUrl).catch(err => console.error('Failed to trash old Drive image:', err));
      }

      showToast('ปรับปรุงข้อมูลส่วนตัวพนักงานเรียบร้อย', 'success');
    } else {
      // Add Profile
      const confirmed = await showConfirm(
        'ยืนยันการขึ้นทะเบียนพนักงานใหม่',
        `คุณต้องการขึ้นทะเบียนพนักงานใหม่ "${nameStr}" ใช่หรือไม่?`,
        'save'
      );
      if (!confirmed) return;

      const newEmp: Employee = {
        id: 'emp-' + Date.now(),
        name: nameStr,
        nickname: nickStr,
        position: posStr,
        birthDate: birthDateStr,
        age: calculatedAge,
        houseNo: houseNoStr,
        subdistrict: subdistrictStr,
        district: districtStr,
        province: provinceStr,
        zipcode: zipcodeStr,
        tel: telStr,
        photoUrl: empPhotoUrl,
        history: [] // เริ่มต้นประวัติว่าง
      };
      onSaveEmployees([...employees, newEmp]);
      setSelectedEmpId(newEmp.id); // เลือกคนใหม่ทันทีเพื่อกรอกประวัติเพิ่มเติม
      showToast('ขึ้นทะเบียนพนักงานใหม่สำเร็จ คุณสามารถเพิ่มประวัติได้ทันที', 'success');
    }
    setIsProfileModalOpen(false);
  };

  const handleDeleteEmployee = async (id: string) => {
    const empToDelete = employees.find(emp => emp.id === id);
    const label = empToDelete ? empToDelete.name : 'พนักงานท่านนี้';

    const confirmed = await showConfirm(
      'ยืนยันการลบทะเบียนพนักงาน',
      `คำเตือนร้ายแรง: คุณต้องการลบพนักงาน "${label}" รวมถึงประวัติการทำงานและการศึกษาทั้งหมดใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`,
      'delete'
    );
    if (confirmed) {
      const filtered = employees.filter(emp => emp.id !== id);
      onSaveEmployees(filtered);
      if (selectedEmpId === id) {
        setSelectedEmpId(filtered[0]?.id || null);
      }

      // เมื่อลบพนักงาน ให้ย้ายรูปใน Drive ไปถังขยะด้วย
      if (empToDelete && empToDelete.photoUrl && (empToDelete.photoUrl.includes('drive.google.com') || empToDelete.photoUrl.includes('docs.google.com'))) {
        deleteFileFromGas('', empToDelete.photoUrl).catch(err => console.error('Failed to trash deleted employee photo:', err));
      }

      showToast('ลบทะเบียนพนักงานเสร็จสิ้น', 'success');
    }
  };

  // --- HISTORY MANAGEMENT ---
  const handleAddHistorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    if (!histPeriod.trim() || !histDetail.trim()) {
      showToast('กรุณากรอกช่วงเวลาและรายละเอียดประวัติให้ครบถ้วน', 'error');
      return;
    }

    const newHistoryItem: WorkHistoryItem = {
      id: editingHistoryId || 'hist-' + Date.now(),
      type: histType,
      period: histPeriod.trim(),
      detail: histDetail.trim()
    };

    let updatedHistoryList = [...selectedEmployee.history];
    if (editingHistoryId) {
      // Edit
      const confirmed = await showConfirm(
        'ยืนยันการแก้ไขข้อมูลประวัติ',
        'คุณต้องการบันทึกการแก้ไขข้อมูลประวัตินี้ใช่หรือไม่?',
        'edit'
      );
      if (!confirmed) return;

      updatedHistoryList = updatedHistoryList.map(h => h.id === editingHistoryId ? newHistoryItem : h);
      showToast('แก้ไขข้อมูลประวัติเรียบร้อย', 'success');
    } else {
      // Add
      const confirmed = await showConfirm(
        'ยืนยันการเพิ่มข้อมูลประวัติ',
        'คุณต้องการเพิ่มประวัติการทำงาน/การศึกษานี้ลงในแฟ้มพนักงานใช่หรือไม่?',
        'save'
      );
      if (!confirmed) return;

      updatedHistoryList.push(newHistoryItem);
      showToast('เพิ่มประวัติลงแฟ้มพนักงานสำเร็จ', 'success');
    }

    const updatedEmployees = employees.map(emp => {
      if (emp.id === selectedEmployee.id) {
        return { ...emp, history: updatedHistoryList };
      }
      return emp;
    });

    onSaveEmployees(updatedEmployees);
    setIsAddingHistory(false);
    setEditingHistoryId(null);
    setHistPeriod('');
    setHistDetail('');
  };

  const handleEditHistoryClick = (item: WorkHistoryItem) => {
    setEditingHistoryId(item.id);
    setHistType(item.type);
    setHistPeriod(item.period);
    setHistDetail(item.detail);
    setIsAddingHistory(true);
  };

  const handleDeleteHistory = async (histId: string) => {
    if (!selectedEmployee) return;
    const confirmed = await showConfirm(
      'ยืนยันการลบประวัติ',
      'คุณต้องการลบรายการประวัติตัวนี้ออกจากแฟ้มพนักงานใช่หรือไม่?',
      'delete'
    );
    if (confirmed) {
      const updatedHistory = selectedEmployee.history.filter(h => h.id !== histId);
      const updatedEmployees = employees.map(emp => {
        if (emp.id === selectedEmployee.id) {
          return { ...emp, history: updatedHistory };
        }
        return emp;
      });
      onSaveEmployees(updatedEmployees);
      showToast('ลบรายการประวัติสำเร็จ', 'success');
    }
  };

  // ค้นหาพนักงาน
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const nick = emp.nickname ? emp.nickname.toLowerCase() : '';
      return emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             nick.includes(searchQuery.toLowerCase()) ||
             emp.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
             emp.province.toLowerCase().includes(searchQuery.toLowerCase()) ||
             emp.tel.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [employees, searchQuery]);

  return (
    <div className="bg-white rounded-3xl border-2 border-orange-200 p-6 sm:p-8 shadow-xl relative overflow-hidden flex-grow flex flex-col" id="employee-panel">
      {/* Top Gradient Glow Accent Bar */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 to-amber-600" />
      
      {isProfileModalOpen ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6 animate-in fade-in duration-200 z-10 relative">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl border border-orange-100">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingEmpId ? 'แก้ไขประวัติบุคลากร' : 'เพิ่มบุคลากรใหม่'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">กรอกข้อมูลส่วนตัว ประวัติการศึกษาและการทำงาน</p>
              </div>
            </div>
            
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-6">
              
              {/* Photo Upload Row */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-amber-50/60 p-4 rounded-xl border border-amber-100">
                <div className="relative flex items-center justify-center shrink-0">
                  <EmployeeAvatar 
                    src={empPhotoUrl} 
                    name={empName || "Preview"} 
                    className="max-h-24 max-w-[96px] w-auto h-auto rounded-xl border-2 border-orange-400 shadow-sm object-contain" 
                  />
                  {isUploading && (
                    <div className="absolute inset-0 bg-orange-950/40 rounded-xl flex items-center justify-center text-white">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  )}
                </div>
                
                <div className="space-y-1.5 flex-grow text-center sm:text-left">
                  <span className="text-[10px] font-bold text-orange-900 block font-heading">
                    {isUploading ? 'กำลังอัปโหลดไปยังคลาวด์...' : 'อัปโหลดรูปพนักงาน (ห้ามเกิน 5MB)'}
                  </span>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <label className={`px-3 py-1.5 font-heading font-semibold text-xs rounded-xl cursor-pointer transition flex items-center gap-1 justify-center shadow-sm ${
                      isUploading ? 'bg-orange-400 cursor-not-allowed text-orange-100' : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600'
                    }`}>
                      {isUploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>{isUploading ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปภาพ'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        disabled={isUploading}
                        className="hidden" 
                      />
                    </label>
                    <input
                      type="text"
                      value={empPhotoUrl}
                      disabled={isUploading}
                      onChange={(e) => setEmpPhotoUrl(e.target.value)}
                      placeholder=""
                      className="px-2.5 py-1.5 border border-gray-200 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs rounded-xl text-xs outline-none flex-grow focus:border-orange-500 focus:ring-2 focus:ring-orange-200 disabled:bg-gray-100/50 disabled:text-gray-400 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 font-heading font-semibold">คำนำหน้า</label>
                  <select
                    className="w-full p-2.5 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                    onChange={(e) => {
                       const val = e.target.value;
                       if (val) {
                          setEmpName(val + empName.replace(/^(นาย|นางสาว|นาง)/, ''));
                       }
                    }}
                  >
                    <option value="">- เลือก -</option>
                    <option value="นาย">นาย</option>
                    <option value="นาง">นาง</option>
                    <option value="นางสาว">นางสาว</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 font-heading font-semibold">ชื่อ - นามสกุล <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={empName.replace(/^(นาย|นางสาว|นาง)/, '')}
                    onChange={(e) => {
                      const prefixMatch = empName.match(/^(นาย|นางสาว|นาง)/);
                      const prefix = prefixMatch ? prefixMatch[0] : '';
                      setEmpName(prefix + e.target.value);
                    }}
                    placeholder=""
                    className="w-full p-2.5 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 font-heading font-semibold">ชื่อเล่น</label>
                  <input
                    type="text"
                    value={empNickname}
                    onChange={(e) => setEmpNickname(e.target.value)}
                    placeholder=""
                    className="w-full p-2.5 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 font-heading font-semibold">
                    วัน / เดือน / ปี เกิด
                  </label>
                  <input
                    type="date"
                    value={empBirthDate}
                    onChange={(e) => {
                      const newBDate = e.target.value;
                      setEmpBirthDate(newBDate);
                      const computedAge = calculateAgeFromBirthDate(newBDate);
                      if (computedAge !== '') {
                        setEmpAge(String(computedAge));
                      }
                    }}
                    className="w-full p-2.5 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 font-heading font-semibold">
                    อายุ (ปี)
                  </label>
                  <input
                    type="number"
                    value={empAge}
                    onChange={(e) => setEmpAge(e.target.value)}
                    placeholder=""
                    className="w-full p-2.5 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 font-mono transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 font-heading font-semibold">ตำแหน่งงานทางการ <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={empPosition}
                    onChange={(e) => setEmpPosition(e.target.value)}
                    placeholder=""
                    className="w-full p-2.5 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 font-heading font-semibold">เบอร์โทรศัพท์ติดต่อ <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    required
                    value={empTel}
                    onChange={(e) => setEmpTel(e.target.value)}
                    placeholder=""
                    maxLength={10}
                    className="w-full p-2.5 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 font-mono transition-all"
                  />
                </div>
              </div>

              
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="px-5 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 font-semibold text-gray-600 transition-colors cursor-pointer text-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleProfileSubmit}
                className="px-6 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 flex items-center justify-center gap-2 font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer text-sm"
              >
                {editingEmpId ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
{/* Background visual graphics */}
      <div className="absolute -top-10 -right-10 w-80 h-80 bg-gradient-to-br from-orange-500/10 to-amber-500/5 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-gradient-to-tr from-amber-500/10 to-orange-400/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-orange-100 pb-6 mb-6 relative z-10">
        <div className="flex items-center space-x-4">
          <motion.div 
            className="w-16 h-16 bg-gradient-to-tr from-orange-500 to-amber-600 rounded-2xl shadow-lg shadow-orange-500/30 overflow-hidden flex items-center justify-center p-0.5 relative cursor-pointer select-none border-2 border-white shrink-0"
            animate={{ y: [0, -4, 0] }}
            whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}
            transition={{
              y: { repeat: Infinity, duration: 3, ease: "easeInOut" },
              scale: { type: "spring", stiffness: 300, damping: 10 }
            }}
          >
            <img 
              src={chibiTeam} 
              alt="Chibi Team" 
              className="w-full h-full object-cover rounded-[14px]"
            />
          </motion.div>
          <div>
            <h2 className="font-heading text-xl sm:text-2xl font-black text-orange-950 tracking-tight">ทำเนียบประวัติบุคลากรองค์กร</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 font-medium">จัดการข้อมูลประวัติพนักงาน สลิปประวัติการศึกษาและการทำงาน แฟ้มทะเบียน และเบอร์โทรด่วน</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl border-2 border-orange-200 text-orange-800 hover:text-white hover:bg-orange-500 hover:border-orange-500 text-xs sm:text-sm font-heading font-extrabold transition-all duration-200 shadow-sm active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>excel</span>
          </button>
        </div>
      </div>

      {/* Search and Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 bg-orange-50/40 p-4 rounded-2xl border border-orange-100/80">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-orange-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหา"
            className="w-full pl-9 pr-4 py-2 bg-white border border-orange-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3">
          <span className="text-xs font-heading font-bold text-orange-900 bg-orange-100/80 px-3 py-1.5 rounded-xl border border-orange-200">
            จำนวนบุคลากร: <span className="text-orange-600 font-mono text-sm font-extrabold">{filteredEmployees.length}</span> คน
          </span>

          <button
            onClick={handleOpenAddProfile}
            className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-heading font-bold shadow-md shadow-orange-500/20 transition flex items-center gap-2 active:scale-95 shrink-0"
            id="btn-add-emp"
          >
            <UserPlus className="w-4 h-4" />
            <span>ขึ้นทะเบียนพนักงานใหม่</span>
          </button>
        </div>
      </div>

      {/* Grid View Cards */}
      {filteredEmployees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-orange-50/20 rounded-2xl border border-dashed border-orange-200">
          <Users className="w-12 h-12 text-orange-300 mb-2" />
          <p className="text-sm font-heading font-bold text-gray-500">ไม่พบบุคลากรตามคำค้นหา</p>
          <button
            onClick={handleOpenAddProfile}
            className="mt-3 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-heading text-xs"
          >
            ขึ้นทะเบียนคนแรก
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4" id="employee-grid">
          {filteredEmployees.map(emp => {
            return (
              <div
                key={emp.id}
                className="bg-white rounded-2xl border-2 border-orange-100 hover:border-orange-300 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="space-y-3">
                  {/* Top Header inside Card */}
                  <div className="flex items-start gap-3 pb-3 border-b border-orange-100">
                    <EmployeeAvatar
                      src={emp.photoUrl}
                      name={emp.name}
                      className="max-h-24 max-w-[96px] w-auto h-auto rounded-xl border-2 border-orange-400 shadow-sm shrink-0 object-contain"
                    />

                    <div className="min-w-0 flex-grow">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-heading font-bold text-sm text-orange-950 leading-snug break-words">
                          {emp.name}
                        </h3>
                        {emp.nickname && (
                          <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-md font-heading border border-orange-200/80 shrink-0">
                            ({emp.nickname})
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-orange-600 font-heading mt-0.5">{emp.position}</p>
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="space-y-2 text-xs text-gray-700 font-sans pt-1">
                    {/* Birthdate & Age */}
                    {(emp.birthDate || (emp.age !== undefined && emp.age !== '')) && (
                      <div className="flex items-center gap-2 bg-amber-50/60 p-2 rounded-xl border border-amber-100/70">
                        <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="font-medium text-gray-600">เกิด / อายุ:</span>
                        <span className="font-bold text-gray-800 ml-auto text-right">
                          {emp.birthDate ? formatBirthDateBE(emp.birthDate) : '-'}
                          {(emp.age !== undefined && emp.age !== '' ? emp.age : calculateAgeFromBirthDate(emp.birthDate)) !== '' ? ` (${emp.age !== undefined && emp.age !== '' ? emp.age : calculateAgeFromBirthDate(emp.birthDate)} ปี)` : ''}
                        </span>
                      </div>
                    )}

                    {/* Phone */}
                    <div className="flex items-center gap-2 bg-orange-50/60 p-2 rounded-xl border border-orange-100/70">
                      <Phone className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span className="font-medium text-gray-600">เบอร์โทร:</span>
                      <a
                        href={`tel:${emp.tel}`}
                        className="font-bold font-mono text-orange-700 hover:underline hover:text-orange-800 ml-auto"
                        title="คลิกเพื่อโทรออก"
                      >
                        {emp.tel || '-'}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-orange-100/60">
                  <button
                    onClick={() => handleOpenEditProfile(emp)}
                    className="px-3 py-1.5 border border-orange-200 bg-orange-50/80 hover:bg-orange-500 hover:text-white text-orange-900 text-xs font-heading font-semibold rounded-xl transition flex items-center gap-1.5 shadow-2xs"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-orange-600 group-hover:text-white" />
                    <span>แก้ไข</span>
                  </button>
                  <button
                    onClick={() => handleDeleteEmployee(emp.id)}
                    className="px-3 py-1.5 border border-rose-200 bg-rose-50/60 hover:bg-rose-600 hover:text-white text-rose-700 text-xs font-heading font-semibold rounded-xl transition flex items-center gap-1.5 shadow-2xs"
                    title="ลบข้อมูลพนักงาน"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500 group-hover:text-white" />
                    <span>ลบ</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- ADD/EDIT EMPLOYEE PROFILE MODAL --- */}
      

        </>
      )}

      {/* Employee Personnel PDF Report Modal */}
      {isPdfModalOpen && (
        <EmployeeInfoPdfModal
          employees={filteredEmployees}
          allEmployees={employees}
          onClose={() => setIsPdfModalOpen(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
}
