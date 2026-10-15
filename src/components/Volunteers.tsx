import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Volunteer, VolunteerFinance, VolunteerFamily, VolunteerEducationItem, VolunteerWorkItem, VolunteerHonorItem, VolunteerGalleryFile, User } from '../types';
import { Shield, CreditCard, Plus, Edit2, Trash2, Search, Save, X, Image as ImageIcon, FileText, Download, Users, Briefcase, GraduationCap, Award, Printer, Eye, FileDown, User as UserIcon, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import VolunteersPdfModal from './VolunteersPdfModal';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { captureElementToPng } from '../utils/pdfExport';

// Extend jsPDF for autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface VolunteersProps {
  volunteers: Volunteer[];
  finances: VolunteerFinance[];
  onSaveVolunteers: (items: Volunteer[]) => void;
  onSaveFinances: (items: VolunteerFinance[]) => void;
  currentUser: User | null;
  showToast: (msg: string, type: 'success'|'error') => void;
}

export default function Volunteers({
  volunteers,
  finances,
  onSaveVolunteers,
  onSaveFinances,
  currentUser,
  showToast
}: VolunteersProps) {
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'finance'>('profile');
  const [searchTerm, setSearchTerm] = useState('');

  // Editing state
  const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Viewing detail state
  const [viewingVolunteer, setViewingVolunteer] = useState<Volunteer | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Profile sections
  const [profileSection, setProfileSection] = useState<'personal' | 'education' | 'work' | 'honors'>('personal');
  const [formError, setFormError] = useState<string | null>(null);

  // Helper for generating IDs
  const generateId = () => Math.random().toString(36).substring(2, 9);

  const handleDeleteVolunteer = (id: string, name: string) => {
    if (window.confirm(`คุณต้องการลบข้อมูลอาสาสมัคร "${name || 'ท่านนี้'}" ออกจากระบบใช่หรือไม่?`)) {
      const updated = (volunteers || []).filter(v => v.id !== id);
      onSaveVolunteers(updated);
      showToast('ลบข้อมูลอาสาสมัครเรียบร้อยแล้ว', 'success');
      if (viewingVolunteer?.id === id) {
        setViewingVolunteer(null);
      }
    }
  };

  const [isDownloadingDetailPdf, setIsDownloadingDetailPdf] = useState(false);
  const profileScrollRef = useRef<HTMLDivElement>(null);
  const profilePrintRef = useRef<HTMLDivElement>(null);

  const scrollToProfileTop = () => {
    if (profileScrollRef.current) {
      profileScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToProfileBottom = () => {
    if (profileScrollRef.current) {
      profileScrollRef.current.scrollTo({ top: profileScrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  const handleDownloadDetailPdf = async () => {
    if (!profilePrintRef.current) return;
    setIsDownloadingDetailPdf(true);
    try {
      showToast('กำลังประมวลผลไฟล์ PDF...', 'info' as any);
      const imgData = await captureElementToPng(profilePrintRef.current);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const elementWidth = profilePrintRef.current.offsetWidth || 794;
      const elementHeight = profilePrintRef.current.offsetHeight || 1122;
      const pdfHeight = (elementHeight * pdfWidth) / elementWidth;
      
      let position = 0;
      let heightLeft = pdfHeight;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      pdf.save(`ประวัติ_อปพร_${viewingVolunteer?.name || 'รายบุคคล'}.pdf`);
      showToast('ดาวน์โหลดไฟล์ PDF เรียบร้อยแล้ว', 'success');
    } catch (err) {
      console.error('Error generating detail PDF:', err);
      showToast('เกิดข้อผิดพลาดในการดาวน์โหลด PDF', 'error');
    } finally {
      setIsDownloadingDetailPdf(false);
    }
  };

  const handlePrintPDF = (vol: Volunteer) => {
    setViewingVolunteer(vol);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (dataUrl: string, name: string, type: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      callback(dataUrl, file.name, file.type.startsWith('image/') ? 'image' : 'file');
    };
    reader.readAsDataURL(file);
  };

  // Profile View
  const renderProfile = () => {
    if (isEditing && editingVolunteer) {
      return renderVolunteerEditor();
    }

    const filtered = (volunteers || []).filter(v => 
      (v.name || '').includes(searchTerm) || (v.code || '').includes(searchTerm)
    );

    const exportVolunteersToSheet = () => {
      const list = filtered.length > 0 ? filtered : volunteers || [];
      if (list.length === 0) {
        showToast('ไม่มีข้อมูล อปพร. สำหรับส่งออก', 'error');
        return;
      }
      const dataToExport = list.map(v => {
        const specialAbilitiesText = v.specialAbilities?.map(s => s.detail).filter(Boolean).join(', ') || '-';
        const licenseText = v.license?.type && v.license.type !== 'ไม่มี' 
          ? `${v.license.type === 'อื่นๆ' ? (v.license.otherType || 'อื่นๆ') : v.license.type} (เลขที่: ${v.license.no || '-'}, หมดอายุ: ${v.license.expiryDate || '-'})`
          : 'ไม่มี';
        const familyText = v.family && v.family.length > 0
          ? v.family.map(f => `${f.relation}: ${f.name} (อายุ ${f.age} ปี, อาชีพ ${f.job})`).join(' | ')
          : '-';
        const eduText = v.education && v.education.length > 0 
          ? v.education.map(e => `${e.degree || ''} ${e.institution || ''} (ปี ${e.year || ''})`).join(' | ') 
          : '-';
        const workText = v.workHistory && v.workHistory.length > 0 
          ? v.workHistory.map(w => `${w.position || ''} - ${w.workplace || ''} (${w.startYear || ''}-${w.endYear || ''})`).join(' | ') 
          : '-';
        const honorText = v.honors && v.honors.length > 0 
          ? v.honors.map(h => `${h.detail || ''} (ปี พ.ศ. ${h.year || ''})`).join(' | ') 
          : '-';

        return {
          'รหัส อปพร.': v.code || '-',
          'ชื่อ-นามสกุล': v.name || '-',
          'เลขบัตรประชาชน': v.idCard || '-',
          'วัน/เดือน/ปีเกิด': v.birthDate || '-',
          'อายุ (ปี)': v.age || '-',
          'สัญชาติ': v.nationality || '-',
          'เชื้อชาติ': v.race || '-',
          'กรุ๊ปเลือด': v.bloodGroup || '-',
          'เบอร์โทรศัพท์': v.tel || '-',
          'มือถือ': v.mobile || '-',
          'อาชีพ': v.occupation || '-',
          'รายได้ต่อเดือน (บาท)': v.income || '-',
          'โรคประจำตัว': v.disease || '-',
          'น้ำหนัก (กก.)': v.weight || '-',
          'ส่วนสูง (ซม.)': v.height || '-',
          'รอบอก (นิ้ว)': v.chest || '-',
          'ไหล่ (นิ้ว)': v.shoulder || '-',
          'เอว (นิ้ว)': v.waist || '-',
          'ต้นขา (นิ้ว)': v.thigh || '-',
          'ไซต์เสื้อ': v.shirtSize || '-',
          'ไซต์กางเกง': v.pantsSize || '-',
          'ไซต์รองเท้า': v.shoeSize || '-',
          'บ้านเลขที่ปัจจุบัน': v.addressHouseNo || '-',
          'ตำบลปัจจุบัน': v.addressSubdistrict || '-',
          'อำเภอปัจจุบัน': v.addressDistrict || '-',
          'จังหวัดปัจจุบัน': v.addressProvince || '-',
          'รหัสไปรษณีย์ปัจจุบัน': v.addressZipcode || '-',
          'บ้านเลขที่ภูมิลำเนา': v.nativeHouseNo || '-',
          'ตำบลภูมิลำเนา': v.nativeSubdistrict || '-',
          'อำเภอภูมิลำเนา': v.nativeDistrict || '-',
          'จังหวัดภูมิลำเนา': v.nativeProvince || '-',
          'รหัสไปรษณีย์ภูมิลำเนา': v.nativeZipcode || '-',
          'ความสามารถพิเศษ': specialAbilitiesText,
          'ใบอนุญาตขับขี่': licenseText,
          'ข้อมูลครอบครัว': familyText,
          'ประวัติการศึกษา': eduText,
          'ประวัติการทำงาน': workText,
          'เครื่องราชฯ/อบรม/ผลงาน': honorText
        };
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "ประวัติ อปพร.");
      XLSX.writeFile(wb, `รายงานข้อมูล_อปพร_ทั้งหมด_${new Date().toISOString().slice(0,10)}.xlsx`);
      showToast('บันทึกและส่งออกข้อมูลลง Sheet (.xlsx) เรียบร้อยแล้ว', 'success');
    };

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหา"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-xl bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPdfModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 font-medium shadow-xs transition-colors cursor-pointer"
              title="พิมพ์หรือส่งออกรายงาน PDF ทำเนียบ อปพร."
            >
              <Printer className="w-4 h-4" /> พิมพ์ / รายงาน PDF
            </button>
            <button
              onClick={exportVolunteersToSheet}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium shadow-xs transition-colors cursor-pointer"
              title="ส่งออกประวัติ อปพร. ทั้งหมดลง Excel / Sheet"
            >
              <FileDown className="w-4 h-4" /> excel
            </button>
            <button
              onClick={() => {
                setFormError(null);
                setEditingVolunteer({
                  id: generateId(),
                  code: '',
                  name: '',
                  idCard: '',
                  birthDate: '',
                  address: '',
                  addressHouseNo: '',
                  addressSubdistrict: 'ม่อนจอง',
                  addressDistrict: 'อมก๋อย',
                  addressProvince: 'เชียงใหม่',
                  addressZipcode: '50310',
                  tel: '',
                  mobile: '',
                  bloodGroup: '-',
                  photoUrl: '',
                  family: [],
                  education: [],
                  workHistory: [],
                  honors: [],
                  galleryFiles: []
                });
                setIsEditing(true);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> เพิ่มประวัติ อปพร.
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">
              ไม่มีข้อมูล อปพร. ในระบบ
            </div>
          ) : filtered.map(vol => (
            <div key={vol.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden mb-3 border-2 border-amber-200 flex items-center justify-center shadow-xs">
                  {vol.photoUrl ? (
                    <img src={vol.photoUrl} alt={vol.name} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <h3 className="font-bold text-lg text-gray-800 text-center">{vol.name || 'ไม่มีชื่อ'}</h3>
                <span className="text-blue-600 font-semibold text-xs bg-blue-50 px-3 py-1 rounded-full mt-1 border border-blue-100">
                  รหัส อปพร.: {vol.code || '-'}
                </span>
                <div className="w-full mt-3 text-xs text-gray-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="truncate"><span className="font-semibold text-gray-700">เลขบัตรประชาชน:</span> {vol.idCard || '-'}</p>
                  <p className="truncate"><span className="font-semibold text-gray-700">โทรศัพท์:</span> {vol.tel || '-'}</p>
                  <p className="truncate"><span className="font-semibold text-gray-700">มือถือ:</span> {vol.mobile || '-'}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setViewingVolunteer(vol)}
                  className="py-2 px-2.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" /> รายละเอียด
                </button>
                <button
                  onClick={() => handlePrintPDF(vol)}
                  className="py-2 px-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> รายงาน .PDF
                </button>
                <button
                  onClick={() => {
                    setFormError(null);
                    setEditingVolunteer(vol);
                    setIsEditing(true);
                  }}
                  className="py-2 px-2.5 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" /> แก้ไข
                </button>
                <button
                  onClick={() => handleDeleteVolunteer(vol.id, vol.name)}
                  className="py-2 px-2.5 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> ลบข้อมูล
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderVolunteerEditor = () => {
    if (!editingVolunteer) return null;

    const saveVolunteer = () => {
      // Validation for required fields
      const requiredFields = [
        { field: editingVolunteer.code, name: 'รหัสประจำตัว อปพร.' },
        { field: editingVolunteer.firstName, name: 'ชื่อ' },
        { field: editingVolunteer.lastName, name: 'นามสกุล' },
        { field: editingVolunteer.idCard, name: 'เลขบัตรประชาชน' },
        { field: editingVolunteer.tel, name: 'เบอร์โทรศัพท์' },
        { field: editingVolunteer.mobile, name: 'มือถือ' },
        { field: editingVolunteer.birthDate, name: 'วัน/เดือน/ปี เกิด' },
        { field: editingVolunteer.age, name: 'อายุ' },
        { field: editingVolunteer.nationality, name: 'สัญชาติ' },
        { field: editingVolunteer.race, name: 'เชื้อชาติ' },
        { field: editingVolunteer.bloodGroup, name: 'กรุ๊ปเลือด' },
        { field: editingVolunteer.disease, name: 'โรคประจำตัว' },
        { field: editingVolunteer.occupation, name: 'ประกอบอาชีพ' },
        { field: editingVolunteer.income, name: 'รายได้ต่อเดือน' },
        { field: editingVolunteer.addressHouseNo, name: 'บ้านเลขที่ (ที่อยู่ปัจจุบัน)' },
        { field: editingVolunteer.addressSubdistrict, name: 'ตำบล (ที่อยู่ปัจจุบัน)' },
        { field: editingVolunteer.addressDistrict, name: 'อำเภอ (ที่อยู่ปัจจุบัน)' },
        { field: editingVolunteer.addressProvince, name: 'จังหวัด (ที่อยู่ปัจจุบัน)' },
        { field: editingVolunteer.addressZipcode, name: 'รหัสไปรษณีย์ (ที่อยู่ปัจจุบัน)' },
        { field: editingVolunteer.nativeHouseNo, name: 'บ้านเลขที่ (ภูมิลำเนาเดิม)' },
        { field: editingVolunteer.nativeSubdistrict, name: 'ตำบล (ภูมิลำเนาเดิม)' },
        { field: editingVolunteer.nativeDistrict, name: 'อำเภอ (ภูมิลำเนาเดิม)' },
        { field: editingVolunteer.nativeProvince, name: 'จังหวัด (ภูมิลำเนาเดิม)' },
        { field: editingVolunteer.nativeZipcode, name: 'รหัสไปรษณีย์ (ภูมิลำเนาเดิม)' },
        { field: editingVolunteer.photoUrl, name: 'รูปโปรไฟล์' }
      ];

      const missing = requiredFields.find(f => !f.field || String(f.field).trim() === '');
      if (missing) {
        const msg = `กรุณากรอกข้อมูล "${missing.name}" ให้เรียบร้อยก่อนบันทึกข้อมูล`;
        setFormError(msg);
        showToast(msg, 'error');
        setProfileSection('personal');
        return;
      }

      if (!editingVolunteer.idCard || editingVolunteer.idCard.length !== 13) {
        const msg = 'กรุณากรอก "เลขบัตรประชาชน" เป็นตัวเลขให้ครบ 13 หลัก';
        setFormError(msg);
        showToast(msg, 'error');
        setProfileSection('personal');
        return;
      }

      if (!editingVolunteer.tel || editingVolunteer.tel.length !== 10) {
        const msg = 'กรุณากรอก "เบอร์โทรศัพท์" เป็นตัวเลข 10 หลัก';
        setFormError(msg);
        showToast(msg, 'error');
        setProfileSection('personal');
        return;
      }

      if (!editingVolunteer.mobile || editingVolunteer.mobile.length !== 10) {
        const msg = 'กรุณากรอก "มือถือ" เป็นตัวเลข 10 หลัก';
        setFormError(msg);
        showToast(msg, 'error');
        setProfileSection('personal');
        return;
      }

      // Check family fields if family items added
      if (editingVolunteer.family && editingVolunteer.family.length > 0) {
        const incompleteFamily = editingVolunteer.family.some(f => !f.name || !f.age || !f.job);
        if (incompleteFamily) {
          const msg = 'กรุณากรอกข้อมูลครอบครัวให้ครบถ้วนก่อนบันทึกข้อมูล (ชื่อ, อายุ, อาชีพ)';
          setFormError(msg);
          showToast(msg, 'error');
          setProfileSection('personal'); 
          return;
        }
      }

      // Check license fields
      if (editingVolunteer.license?.type && editingVolunteer.license.type !== 'ไม่มี') {
        if (editingVolunteer.license.type === 'อื่นๆ' && !editingVolunteer.license.otherType) {
          const msg = 'กรุณาระบุประเภทใบอนุญาตขับขี่ก่อนบันทึกข้อมูล';
          setFormError(msg);
          showToast(msg, 'error');
          setProfileSection('personal');
          return;
        }
        if (!editingVolunteer.license.no || !editingVolunteer.license.issueDate || !editingVolunteer.license.expiryDate || !editingVolunteer.license.issuedBy) {
          const msg = 'กรุณากรอกข้อมูลใบอนุญาตขับขี่ให้ครบถ้วนก่อนบันทึกข้อมูล';
          setFormError(msg);
          showToast(msg, 'error');
          setProfileSection('personal');
          return;
        }
      }
      
      setFormError(null);
      // Update the composite address fields
      const updatedVolunteer = {
        ...editingVolunteer,
        address: `${editingVolunteer.addressHouseNo} ต.${editingVolunteer.addressSubdistrict} อ.${editingVolunteer.addressDistrict} จ.${editingVolunteer.addressProvince} ${editingVolunteer.addressZipcode}`,
        nativeAddress: `${editingVolunteer.nativeHouseNo} ต.${editingVolunteer.nativeSubdistrict} อ.${editingVolunteer.nativeDistrict} จ.${editingVolunteer.nativeProvince} ${editingVolunteer.nativeZipcode}`
      };

      const currentList = volunteers || [];
      const isNew = !currentList.some(v => v.id === updatedVolunteer.id);
      const newVols = isNew 
        ? [...currentList, updatedVolunteer]
        : currentList.map(v => v.id === updatedVolunteer.id ? updatedVolunteer : v);
      
      onSaveVolunteers(newVols);
      showToast('บันทึกข้อมูลเรียบร้อย', 'success');
      setIsEditing(false);
      setEditingVolunteer(null);
    };

    return (
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <h2 className="text-xl font-bold text-gray-800">ข้อมูลอาสาสมัครป้องกันภัยฝ่ายพลเรือน{editingVolunteer.name ? `: ${editingVolunteer.name}` : ''}</h2>
          
        </div>

        {formError && (
          <div className="mb-6 p-4 bg-rose-50 border-2 border-rose-200 text-rose-800 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in shadow-xs">
            <div className="flex items-center gap-3 font-bold text-sm">
              <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
                !
              </div>
              <span>{formError}</span>
            </div>
            <button onClick={() => setFormError(null)} className="px-3 py-1 bg-rose-200/80 hover:bg-rose-200 text-rose-900 rounded-lg text-xs font-bold cursor-pointer transition-colors shrink-0">
              ปิด
            </button>
          </div>
        )}

        {/* Profile Tabs */}
        <div className="bg-slate-100/90 p-1.5 rounded-2xl flex gap-1.5 mb-6 overflow-x-auto hide-scrollbar border border-slate-200/80">
          {[
            { id: 'personal', label: 'ประวัติส่วนตัว', icon: <Users className="w-4 h-4" /> },
            { id: 'education', label: 'ประวัติการศึกษา', icon: <GraduationCap className="w-4 h-4" /> },
            { id: 'work', label: 'ประวัติการทำงาน', icon: <Briefcase className="w-4 h-4" /> },
            { id: 'honors', label: 'เกียรติประวัติ', icon: <Award className="w-4 h-4" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setProfileSection(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                profileSection === tab.id
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-200/80 scale-[1.01]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* 1. Personal */}
        {profileSection === 'personal' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            {/* 1. ข้อมูลส่วนตัวเบื้องต้น (สีส้มอ่อน Amber) */}
            <div className="bg-amber-50/40 p-5 md:p-6 rounded-2xl border border-amber-200/60 shadow-xs">
              <label className="block text-base font-bold text-amber-900 mb-4">ข้อมูลส่วนตัวเบื้องต้น</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">รหัสประจำตัว อปพร.</label>
                  <input
                    type="text"
                    value={editingVolunteer.code || ''}
                    onChange={e => setEditingVolunteer({...editingVolunteer, code: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">เลขบัตรประชาชน</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={13}
                    value={editingVolunteer.idCard || ''}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 13);
                      setEditingVolunteer({...editingVolunteer, idCard: val});
                    }}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">คำนำหน้า</label>
                  <select
                    value={editingVolunteer.prefix || ''}
                    onChange={e => setEditingVolunteer({...editingVolunteer, prefix: e.target.value, name: `${e.target.value}${editingVolunteer.firstName || ''} ${editingVolunteer.lastName || ''}`.trim()})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  >
                    <option value="">- เลือก -</option>
                    <option value="นาย">นาย</option>
                    <option value="นาง">นาง</option>
                    <option value="นางสาว">นางสาว</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">ชื่อ</label>
                  <input
                    type="text"
                    value={editingVolunteer.firstName || ''}
                    onChange={e => setEditingVolunteer({...editingVolunteer, firstName: e.target.value, name: `${editingVolunteer.prefix || ''}${e.target.value} ${editingVolunteer.lastName || ''}`.trim()})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">นามสกุล</label>
                  <input
                    type="text"
                    value={editingVolunteer.lastName || ''}
                    onChange={e => setEditingVolunteer({...editingVolunteer, lastName: e.target.value, name: `${editingVolunteer.prefix || ''}${editingVolunteer.firstName || ''} ${e.target.value}`.trim()})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={editingVolunteer.tel || ''}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setEditingVolunteer({...editingVolunteer, tel: val});
                    }}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">มือถือ</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={editingVolunteer.mobile || ''}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setEditingVolunteer({...editingVolunteer, mobile: val});
                    }}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">วัน/เดือน/ปี เกิด</label>
                  <input
                    type="date"
                    value={editingVolunteer.birthDate || ''}
                    onChange={e => setEditingVolunteer({...editingVolunteer, birthDate: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">อายุ (ปี)</label>
                  <input
                    type="number"
                    value={editingVolunteer.age || ''}
                    onChange={e => setEditingVolunteer({...editingVolunteer, age: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">สัญชาติ</label>
                  <input
                    type="text"
                    value={editingVolunteer.nationality || ''}
                    onChange={e => setEditingVolunteer({...editingVolunteer, nationality: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">เชื้อชาติ</label>
                  <input
                    type="text"
                    value={editingVolunteer.race || ''}
                    onChange={e => setEditingVolunteer({...editingVolunteer, race: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">กรุ๊ปเลือด</label>
                  <select
                    value={editingVolunteer.bloodGroup || '-'}
                    onChange={e => setEditingVolunteer({...editingVolunteer, bloodGroup: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  >
                    <option value="-">เลือกกรุ๊ปเลือด</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="O">O</option>
                    <option value="AB">AB</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">โรคประจำตัว</label>
                  <input
                    type="text"
                    value={editingVolunteer.disease || ''}
                    onChange={e => setEditingVolunteer({...editingVolunteer, disease: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">ประกอบอาชีพ</label>
                  <input
                    type="text"
                    value={editingVolunteer.occupation || ''}
                    onChange={e => setEditingVolunteer({...editingVolunteer, occupation: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">รายได้ต่อเดือน</label>
                  <input
                    type="text"
                    value={editingVolunteer.income || ''}
                    onChange={e => setEditingVolunteer({...editingVolunteer, income: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  />
                </div>
              </div>
            </div>

            {/* 1.5 สัดส่วนร่างกาย (สีชมพู Pink) */}
            <div className="bg-pink-50/40 p-5 md:p-6 rounded-2xl border border-pink-200/60 shadow-xs">
              <h3 className="font-bold text-lg text-pink-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600"><UserIcon className="w-4 h-4" /></span>
                สัดส่วนร่างกาย
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">น้ำหนัก (กก.)</label>
                  <input type="text" value={editingVolunteer.weight || ''} onChange={e => setEditingVolunteer({...editingVolunteer, weight: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">ส่วนสูง (ซม.)</label>
                  <input type="text" value={editingVolunteer.height || ''} onChange={e => setEditingVolunteer({...editingVolunteer, height: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">รอบอก (นิ้ว)</label>
                  <input type="text" value={editingVolunteer.chest || ''} onChange={e => setEditingVolunteer({...editingVolunteer, chest: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">ไหล่ (นิ้ว)</label>
                  <input type="text" value={editingVolunteer.shoulder || ''} onChange={e => setEditingVolunteer({...editingVolunteer, shoulder: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">เอว (นิ้ว)</label>
                  <input type="text" value={editingVolunteer.waist || ''} onChange={e => setEditingVolunteer({...editingVolunteer, waist: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">ต้นขา (นิ้ว)</label>
                  <input type="text" value={editingVolunteer.thigh || ''} onChange={e => setEditingVolunteer({...editingVolunteer, thigh: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">ไซต์เสื้อ</label>
                  <input type="text" value={editingVolunteer.shirtSize || ''} onChange={e => setEditingVolunteer({...editingVolunteer, shirtSize: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">ไซต์กางเกง</label>
                  <input type="text" value={editingVolunteer.pantsSize || ''} onChange={e => setEditingVolunteer({...editingVolunteer, pantsSize: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">ไซต์รองเท้า</label>
                  <input type="text" value={editingVolunteer.shoeSize || ''} onChange={e => setEditingVolunteer({...editingVolunteer, shoeSize: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all bg-white" />
                </div>
              </div>
            </div>

            {/* 2. ที่อยู่ปัจจุบัน (สีฟ้า Blue) */}
            <div className="bg-blue-50/40 p-5 md:p-6 rounded-2xl border border-blue-200/60 shadow-xs">
              <label className="block text-base font-bold text-blue-900 mb-4">ที่อยู่ปัจจุบัน</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-5">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">บ้านเลขที่</label>
                  <input type="text" value={editingVolunteer.addressHouseNo || ''} onChange={e => setEditingVolunteer({...editingVolunteer, addressHouseNo: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ตำบล</label>
                  <input type="text" value={editingVolunteer.addressSubdistrict || ''} onChange={e => setEditingVolunteer({...editingVolunteer, addressSubdistrict: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">อำเภอ</label>
                  <input type="text" value={editingVolunteer.addressDistrict || ''} onChange={e => setEditingVolunteer({...editingVolunteer, addressDistrict: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">จังหวัด</label>
                  <input type="text" value={editingVolunteer.addressProvince || ''} onChange={e => setEditingVolunteer({...editingVolunteer, addressProvince: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">รหัสไปรษณีย์</label>
                  <input type="text" value={editingVolunteer.addressZipcode || ''} onChange={e => setEditingVolunteer({...editingVolunteer, addressZipcode: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none bg-white" />
                </div>
              </div>
            </div>

            {/* 3. ภูมิลำเนาเดิม (สีเขียว Emerald) */}
            <div className="bg-emerald-50/40 p-5 md:p-6 rounded-2xl border border-emerald-200/60 shadow-xs">
              <div className="flex justify-between items-center mb-4">
                <label className="block text-base font-bold text-emerald-900">ภูมิลำเนาเดิม</label>
                <button 
                  onClick={() => setEditingVolunteer({
                    ...editingVolunteer, 
                    nativeHouseNo: editingVolunteer.addressHouseNo,
                    nativeSubdistrict: editingVolunteer.addressSubdistrict,
                    nativeDistrict: editingVolunteer.addressDistrict,
                    nativeProvince: editingVolunteer.addressProvince,
                    nativeZipcode: editingVolunteer.addressZipcode
                  })}
                  className="text-xs text-emerald-700 hover:text-emerald-900 bg-emerald-100/70 hover:bg-emerald-200/80 px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  เหมือนกันกับที่อยู่ปัจจุบัน
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-5">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">บ้านเลขที่</label>
                  <input type="text" value={editingVolunteer.nativeHouseNo || ''} onChange={e => setEditingVolunteer({...editingVolunteer, nativeHouseNo: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ตำบล</label>
                  <input type="text" value={editingVolunteer.nativeSubdistrict || ''} onChange={e => setEditingVolunteer({...editingVolunteer, nativeSubdistrict: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">อำเภอ</label>
                  <input type="text" value={editingVolunteer.nativeDistrict || ''} onChange={e => setEditingVolunteer({...editingVolunteer, nativeDistrict: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">จังหวัด</label>
                  <input type="text" value={editingVolunteer.nativeProvince || ''} onChange={e => setEditingVolunteer({...editingVolunteer, nativeProvince: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">รหัสไปรษณีย์</label>
                  <input type="text" value={editingVolunteer.nativeZipcode || ''} onChange={e => setEditingVolunteer({...editingVolunteer, nativeZipcode: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 outline-none bg-white" />
                </div>
              </div>
            </div>

          {/* 4. ความสามารถพิเศษ (สีส้ม Orange) */}
          <div className="bg-orange-50/40 p-5 md:p-6 rounded-2xl border border-orange-200/60 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-base font-bold text-orange-900">ความสามารถพิเศษ</label>
              <button
                onClick={() => setEditingVolunteer({
                  ...editingVolunteer,
                  specialAbilities: [...(editingVolunteer.specialAbilities || []), { id: generateId(), detail: '' }]
                })}
                className="text-orange-700 bg-orange-100/70 hover:bg-orange-200 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
              >
                <Plus className="w-4 h-4" /> เพิ่มความสามารถ
              </button>
            </div>
            
            <div className="space-y-3">
              {(!editingVolunteer.specialAbilities || editingVolunteer.specialAbilities.length === 0) ? (
                <p className="text-gray-400 text-sm text-center py-2">ยังไม่ได้ระบุความสามารถพิเศษ</p>
              ) : editingVolunteer.specialAbilities.map(ability => (
                <div key={ability.id} className="flex gap-2 items-center bg-white p-2.5 rounded-xl border border-orange-100/80 shadow-xs">
                  <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {editingVolunteer.specialAbilities!.findIndex(a => a.id === ability.id) + 1}
                  </div>
                  <input
                    type="text"
                    placeholder="ระบุความสามารถพิเศษ..."
                    value={ability.detail || ''}
                    onChange={e => {
                      const newAbilities = editingVolunteer.specialAbilities!.map(a => a.id === ability.id ? {...a, detail: e.target.value} : a);
                      setEditingVolunteer({...editingVolunteer, specialAbilities: newAbilities});
                    }}
                    className="p-2 border-transparent bg-transparent rounded-lg flex-1 w-full focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                  />
                  <button
                    onClick={() => {
                      const newAbilities = editingVolunteer.specialAbilities!.filter(a => a.id !== ability.id);
                      setEditingVolunteer({...editingVolunteer, specialAbilities: newAbilities});
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 5. ใบอนุญาตขับขี่ (สีม่วงคราม Indigo) */}
          <div className="bg-indigo-50/40 p-5 md:p-6 rounded-2xl border border-indigo-200/60 shadow-xs">
            <label className="block text-base font-bold text-indigo-900 mb-4">ใบอนุญาตขับขี่</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <select
                  value={editingVolunteer.license?.type || ''}
                  onChange={e => {
                    const newType = e.target.value;
                    setEditingVolunteer({
                      ...editingVolunteer, 
                      license: { ...(editingVolunteer.license || {}), type: newType, no: '', issueDate: '', expiryDate: '', issuedBy: '', otherType: '' } as any
                    });
                  }}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-white"
                >
                  <option value="">เลือกใบอนุญาตขับขี่</option>
                  <option value="ไม่มี">ไม่มี</option>
                  <option value="รถจักรยานยนต์">ใบขับขี่รถจักรยานยนต์</option>
                  <option value="รถยนต์">ใบขับขี่รถยนต์</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
              </div>
              {editingVolunteer.license?.type === 'อื่นๆ' && (
                <div>
                  <input
                    type="text"
                    placeholder="ระบุประเภทใบขับขี่"
                    value={editingVolunteer.license?.otherType || ''}
                    onChange={e => setEditingVolunteer({
                      ...editingVolunteer, 
                      license: { ...editingVolunteer.license, otherType: e.target.value } as any
                    })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-white"
                  />
                </div>
              )}
            </div>
            
            {editingVolunteer.license?.type && editingVolunteer.license?.type !== 'ไม่มี' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 mt-5">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ฉบับที่</label>
                  <input
                    type="text"
                    value={editingVolunteer.license?.no || ''}
                    onChange={e => setEditingVolunteer({
                      ...editingVolunteer, 
                      license: { ...editingVolunteer.license, no: e.target.value } as any
                    })}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">วันอนุญาต</label>
                  <input
                    type="date"
                    value={editingVolunteer.license?.issueDate || ''}
                    onChange={e => setEditingVolunteer({
                      ...editingVolunteer, 
                      license: { ...editingVolunteer.license, issueDate: e.target.value } as any
                    })}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">วันหมดอายุ</label>
                  <input
                    type="date"
                    value={editingVolunteer.license?.expiryDate || ''}
                    onChange={e => setEditingVolunteer({
                      ...editingVolunteer, 
                      license: { ...editingVolunteer.license, expiryDate: e.target.value } as any
                    })}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">สถานที่ออก</label>
                  <input
                    type="text"
                    value={editingVolunteer.license?.issuedBy || ''}
                    onChange={e => setEditingVolunteer({
                      ...editingVolunteer, 
                      license: { ...editingVolunteer.license, issuedBy: e.target.value } as any
                    })}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 6. รูปโปรไฟล์ (สีชมพู Pink) */}
          <div className="bg-pink-50/40 p-5 md:p-6 rounded-2xl border border-pink-200/60 shadow-xs">
            <label className="block text-base font-bold text-pink-900 mb-3">รูปโปรไฟล์ (อัพโหลดไฟล์ หรือ ใส่ลิงก์)</label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="URL รูปภาพ หรือ กดปุ่มอัพโหลดรูป..."
                value={editingVolunteer.photoUrl || ''}
                onChange={e => setEditingVolunteer({...editingVolunteer, photoUrl: e.target.value})}
                className="flex-1 p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all bg-white"
              />
              <label className="cursor-pointer px-4 py-2.5 bg-pink-100 text-pink-700 hover:bg-pink-200 rounded-xl font-medium whitespace-nowrap transition-colors">
                อัพโหลดรูป
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => handleFileUpload(e, (dataUrl) => {
                    setEditingVolunteer({...editingVolunteer, photoUrl: dataUrl});
                  })}
                />
              </label>
            </div>
          </div>

          {/* 7. ข้อมูลครอบครัว (สีม่วง Purple) */}
          <div className="bg-purple-50/40 p-5 md:p-6 rounded-2xl border border-purple-200/60 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-purple-900">ข้อมูลครอบครัว</h3>
              <button
                onClick={() => setEditingVolunteer({
                  ...editingVolunteer,
                  family: [...(editingVolunteer.family || []), { id: generateId(), relation: 'อื่นๆ', name: '' }]
                })}
                className="text-purple-700 bg-purple-100/70 hover:bg-purple-200 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
              >
                <Plus className="w-4 h-4" /> เพิ่มครอบครัว
              </button>
            </div>
            
            <div className="space-y-3">
              {(!editingVolunteer.family || editingVolunteer.family.length === 0) ? (
                <p className="text-gray-400 text-sm text-center py-4">ยังไม่มีข้อมูลครอบครัว</p>
              ) : editingVolunteer.family.map(fam => (
                <div key={fam.id} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-white p-2.5 rounded-xl border border-purple-100/80 shadow-xs">
                  <select
                    value={fam.relation || 'อื่นๆ'}
                    onChange={e => {
                      const newFam = editingVolunteer.family.map(f => f.id === fam.id ? {...f, relation: e.target.value as any} : f);
                      setEditingVolunteer({...editingVolunteer, family: newFam});
                    }}
                    className="p-2 border border-gray-200 rounded-lg bg-gray-50 w-full sm:w-auto text-sm"
                  >
                    <option value="บิดา">บิดา</option>
                    <option value="มารดา">มารดา</option>
                    <option value="ภรรยา">ภรรยา</option>
                    <option value="สามี">สามี</option>
                    <option value="บุตร">บุตร</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </select>
                  <input
                    type="text"
                    placeholder="ชื่อ-สกุล"
                    value={fam.name || ''}
                    onChange={e => {
                      const newFam = editingVolunteer.family.map(f => f.id === fam.id ? {...f, name: e.target.value} : f);
                      setEditingVolunteer({...editingVolunteer, family: newFam});
                    }}
                    className="p-2 border border-gray-200 rounded-lg flex-1 w-full text-sm"
                  />
                  <input
                    type="text"
                    placeholder="อายุ"
                    value={fam.age || ''}
                    onChange={e => {
                      const newFam = editingVolunteer.family.map(f => f.id === fam.id ? {...f, age: e.target.value} : f);
                      setEditingVolunteer({...editingVolunteer, family: newFam});
                    }}
                    className="p-2 border border-gray-200 rounded-lg w-full sm:w-24 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="อาชีพ"
                    value={fam.job || ''}
                    onChange={e => {
                      const newFam = editingVolunteer.family.map(f => f.id === fam.id ? {...f, job: e.target.value} : f);
                      setEditingVolunteer({...editingVolunteer, family: newFam});
                    }}
                    className="p-2 border border-gray-200 rounded-lg w-full sm:w-48 text-sm"
                  />
                  <button
                    onClick={() => {
                      const newFam = editingVolunteer.family.filter(f => f.id !== fam.id);
                      setEditingVolunteer({...editingVolunteer, family: newFam});
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg w-full sm:w-auto flex justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 8. อัลบั้มรูปภาพ (สีเทาฟ้า Slate) */}
          <div className="bg-slate-50/70 p-5 md:p-6 rounded-2xl border border-slate-200/60 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-blue-500" />
                อัลบั้มรูปภาพ
              </h3>
              <label className="cursor-pointer text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors">
                <Plus className="w-4 h-4" /> อัพโหลดไฟล์
                <input 
                  type="file" 
                  accept="image/*,.pdf,.doc,.docx"
                  multiple
                  className="hidden" 
                  onChange={(e) => {
                    const files = e.target.files;
                    if (!files) return;
                    const newFiles = Array.from(files) as File[];
                    newFiles.forEach((file: File) => {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const dataUrl = event.target?.result as string;
                        setEditingVolunteer(prev => ({...prev!, galleryFiles: [...(prev!.galleryFiles || []), { id: generateId(), url: dataUrl, name: file.name, type: file.type.startsWith('image/') ? 'image' : 'file' }]}));
                      };
                      reader.readAsDataURL(file);
                    });
                  }}
                />
              </label>
            </div>
            <p className="text-sm text-gray-500 mb-4">รองรับรูปภาพและเอกสาร</p>
            
            <div className="space-y-3">
              {(!editingVolunteer.galleryFiles || editingVolunteer.galleryFiles.length === 0) ? (
                <p className="text-gray-400 text-sm text-center py-4">ยังไม่มีรูปภาพ</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {editingVolunteer.galleryFiles.map((gf) => (
                    <div key={gf.id} className="relative group rounded-xl border border-gray-200 overflow-hidden bg-white aspect-square flex flex-col items-center justify-center shadow-xs">
                      {gf.type === 'image' ? (
                        <img src={gf.url} alt={gf.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center">
                          <FileText className="w-8 h-8 text-blue-500 mb-2" />
                          <span className="text-xs text-gray-600 truncate w-full px-2">{gf.name}</span>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          const newUrls = editingVolunteer.galleryFiles.filter(f => f.id !== gf.id);
                          setEditingVolunteer({...editingVolunteer, galleryFiles: newUrls});
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

        {/* 2. Education */}
        {profileSection === 'education' && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center mb-6">
               <h3 className="font-bold text-lg text-gray-800">ประวัติการศึกษา</h3>
              <button
                onClick={() => setEditingVolunteer({
                  ...editingVolunteer,
                  education: [...(editingVolunteer.education || []), { id: generateId(), year: '', degree: '', institution: '', gpa: '' }]
                })}
                className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
              >
                <Plus className="w-4 h-4" /> เพิ่มประวัติ
              </button>
            </div>
            
            <div className="space-y-3">
              {(!editingVolunteer.education || editingVolunteer.education.length === 0) ? (
                <p className="text-gray-400 text-sm text-center py-8 bg-gray-50 rounded-xl border border-gray-100 border-dashed">ไม่มีข้อมูล</p>
              ) : editingVolunteer.education.map(edu => (
                <div key={edu.id} className="flex flex-col md:flex-row gap-2 bg-white p-3 rounded-xl border border-gray-100 shadow-sm items-start md:items-center">
                  <input
                    type="text"
                    placeholder="ปีการศึกษา"
                    value={edu.year || ''}
                    onChange={e => {
                      const newEdu = editingVolunteer.education.map(f => f.id === edu.id ? {...f, year: e.target.value} : f);
                      setEditingVolunteer({...editingVolunteer, education: newEdu});
                    }}
                    className="p-2 border border-gray-200 rounded-lg w-full md:w-28"
                  />
                  <input
                    type="text"
                    placeholder="วุฒิการศึกษา"
                    value={edu.degree || ''}
                    onChange={e => {
                      const newEdu = editingVolunteer.education.map(f => f.id === edu.id ? {...f, degree: e.target.value} : f);
                      setEditingVolunteer({...editingVolunteer, education: newEdu});
                    }}
                    className="p-2 border border-gray-200 rounded-lg w-full md:w-1/4"
                  />
                  <input
                    type="text"
                    placeholder="สถานศึกษา"
                    value={edu.institution || ''}
                    onChange={e => {
                      const newEdu = editingVolunteer.education.map(f => f.id === edu.id ? {...f, institution: e.target.value} : f);
                      setEditingVolunteer({...editingVolunteer, education: newEdu});
                    }}
                    className="p-2 border border-gray-200 rounded-lg flex-1 w-full"
                  />
                  <input
                    type="text"
                    placeholder="เกรดเฉลี่ย"
                    value={edu.gpa || ''}
                    onChange={e => {
                      const newEdu = editingVolunteer.education.map(f => f.id === edu.id ? {...f, gpa: e.target.value} : f);
                      setEditingVolunteer({...editingVolunteer, education: newEdu});
                    }}
                    className="p-2 border border-gray-200 rounded-lg w-full md:w-24"
                  />
                  <button
                    onClick={() => {
                      const newEdu = editingVolunteer.education.filter(f => f.id !== edu.id);
                      setEditingVolunteer({...editingVolunteer, education: newEdu});
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg flex justify-center w-full md:w-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Work */}
        {profileSection === 'work' && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-gray-800">ประวัติการทำงาน</h3>
              <button
                onClick={() => setEditingVolunteer({
                  ...editingVolunteer,
                  workHistory: [...(editingVolunteer.workHistory || []), { id: generateId(), startYear: '', endYear: '', workplace: '', position: '', salary: '' }]
                })}
                className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
              >
                <Plus className="w-4 h-4" /> เพิ่มประวัติ
              </button>
            </div>
            
            <div className="space-y-3">
              {(!editingVolunteer.workHistory || editingVolunteer.workHistory.length === 0) ? (
                 <p className="text-gray-400 text-sm text-center py-8 bg-gray-50 rounded-xl border border-gray-100 border-dashed">ไม่มีข้อมูล</p>
              ) : editingVolunteer.workHistory.map(work => (
                <div key={work.id} className="flex flex-col md:flex-row gap-2 bg-white p-3 rounded-xl border border-gray-100 shadow-sm items-start md:items-center">
                  <div className="flex gap-2 w-full md:w-48">
                    <input
                      type="text"
                      placeholder="ตั้งแต่ พ.ศ."
                      value={work.startYear || ''}
                      onChange={e => {
                        const newWork = editingVolunteer.workHistory.map(f => f.id === work.id ? {...f, startYear: e.target.value} : f);
                        setEditingVolunteer({...editingVolunteer, workHistory: newWork});
                      }}
                      className="p-2 border border-gray-200 rounded-lg w-1/2"
                    />
                    <span className="self-center text-gray-400">-</span>
                    <input
                      type="text"
                      placeholder="ถึง พ.ศ."
                      value={work.endYear || ''}
                      onChange={e => {
                        const newWork = editingVolunteer.workHistory.map(f => f.id === work.id ? {...f, endYear: e.target.value} : f);
                        setEditingVolunteer({...editingVolunteer, workHistory: newWork});
                      }}
                      className="p-2 border border-gray-200 rounded-lg w-1/2"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="สถานที่"
                    value={work.workplace || ''}
                    onChange={e => {
                      const newWork = editingVolunteer.workHistory.map(f => f.id === work.id ? {...f, workplace: e.target.value} : f);
                      setEditingVolunteer({...editingVolunteer, workHistory: newWork});
                    }}
                    className="p-2 border border-gray-200 rounded-lg flex-1 w-full"
                  />
                  <input
                    type="text"
                    placeholder="ตำแหน่ง"
                    value={work.position || ''}
                    onChange={e => {
                      const newWork = editingVolunteer.workHistory.map(f => f.id === work.id ? {...f, position: e.target.value} : f);
                      setEditingVolunteer({...editingVolunteer, workHistory: newWork});
                    }}
                    className="p-2 border border-gray-200 rounded-lg w-full md:w-1/4"
                  />
                  <input
                    type="text"
                    placeholder="เงินเดือน"
                    value={work.salary || ''}
                    onChange={e => {
                      const newWork = editingVolunteer.workHistory.map(f => f.id === work.id ? {...f, salary: e.target.value} : f);
                      setEditingVolunteer({...editingVolunteer, workHistory: newWork});
                    }}
                    className="p-2 border border-gray-200 rounded-lg w-full md:w-28"
                  />
                  <button
                    onClick={() => {
                      const newWork = editingVolunteer.workHistory.filter(f => f.id !== work.id);
                      setEditingVolunteer({...editingVolunteer, workHistory: newWork});
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg flex justify-center w-full md:w-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Honors */}
        {profileSection === 'honors' && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
             <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-gray-800">เกียรติประวัติ</h3>
              <button
                onClick={() => setEditingVolunteer({
                  ...editingVolunteer,
                  honors: [...(editingVolunteer.honors || []), { id: generateId(), year: '', detail: '', fileUrl: '', fileName: '' }]
                })}
                className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
              >
                <Plus className="w-4 h-4" /> เพิ่มเกียรติประวัติ
              </button>
            </div>
            
            <div className="space-y-3">
              {(!editingVolunteer.honors || editingVolunteer.honors.length === 0) ? (
                 <p className="text-gray-400 text-sm text-center py-8 bg-gray-50 rounded-xl border border-gray-100 border-dashed">ไม่มีข้อมูล</p>
              ) : editingVolunteer.honors.map(honor => (
                <div key={honor.id} className="flex flex-col md:flex-row gap-2 bg-white p-3 rounded-xl border border-gray-100 shadow-sm items-start md:items-center">
                  <input
                    type="text"
                    placeholder="ปี พ.ศ. หรือ วันที่"
                    value={honor.year || ''}
                    onChange={e => {
                      const newHonor = editingVolunteer.honors.map(f => f.id === honor.id ? {...f, year: e.target.value} : f);
                      setEditingVolunteer({...editingVolunteer, honors: newHonor});
                    }}
                    className="p-2 border border-gray-200 rounded-lg w-full md:w-1/4"
                  />
                  <input
                    type="text"
                    placeholder="รางวัล หรือ เกียรติบัตรที่ได้รับ"
                    value={honor.detail || ''}
                    onChange={e => {
                      const newHonor = editingVolunteer.honors.map(f => f.id === honor.id ? {...f, detail: e.target.value} : f);
                      setEditingVolunteer({...editingVolunteer, honors: newHonor});
                    }}
                    className="p-2 border border-gray-200 rounded-lg flex-1 w-full"
                  />
                  <div className="flex gap-2 items-center w-full md:w-auto">
                    {honor.fileUrl ? (
                      <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg bg-gray-50 flex-1 md:w-48 overflow-hidden text-sm">
                        <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                        <span className="truncate flex-1 text-gray-700">{honor.fileName || 'แนบไฟล์แล้ว'}</span>
                        <button
                          onClick={() => {
                            const newHonor = editingVolunteer.honors.map(f => f.id === honor.id ? {...f, fileUrl: '', fileName: ''} : f);
                            setEditingVolunteer({...editingVolunteer, honors: newHonor});
                          }}
                          className="text-red-500 hover:text-red-700 ml-1 p-0.5"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium whitespace-nowrap text-sm text-center flex-1 md:flex-none">
                        อัพโหลดไฟล์
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={(e) => handleFileUpload(e, (dataUrl, name) => {
                            const newHonor = editingVolunteer.honors.map(f => f.id === honor.id ? {...f, fileUrl: dataUrl, fileName: name} : f);
                            setEditingVolunteer({...editingVolunteer, honors: newHonor});
                          })}
                        />
                      </label>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      const newHonor = editingVolunteer.honors.filter(f => f.id !== honor.id);
                      setEditingVolunteer({...editingVolunteer, honors: newHonor});
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg flex justify-center w-full md:w-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Bottom Action bar */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button onClick={() => { setFormError(null); setIsEditing(false); }} className="px-5 py-2.5 border rounded-xl hover:bg-gray-50 font-medium text-gray-600 cursor-pointer">
            ยกเลิก
          </button>
          <button onClick={saveVolunteer} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center gap-2 font-medium shadow-md shadow-blue-500/20 cursor-pointer">
            <Save className="w-4 h-4" /> บันทึก
          </button>
        </div>
      </div>
    );
  };

  // Finance View
  const [financeSearch, setFinanceSearch] = useState('');
  const [selectedVolunteer, setSelectedVolunteer] = useState<string>('all');
  const [isEditingFinance, setIsEditingFinance] = useState(false);
  const [editingFinance, setEditingFinance] = useState<VolunteerFinance | null>(null);
  const [financeFormError, setFinanceFormError] = useState<string | null>(null);

  const renderFinance = () => {
    const saveFinance = () => {
      if (!editingFinance) return;
      if (!editingFinance.volunteerId) {
        const msg = 'กรุณาเลือก อปพร. ผู้ได้รับเงิน';
        setFinanceFormError(msg);
        showToast(msg, 'error');
        return;
      }
      if (!editingFinance.date) {
        const msg = 'กรุณาระบุวันที่ทำรายการ / วันที่เบิกจ่าย';
        setFinanceFormError(msg);
        showToast(msg, 'error');
        return;
      }
      if (!editingFinance.description || !editingFinance.description.trim()) {
        const msg = 'กรุณากรอกรายละเอียดหรือหมายเหตุการเบิกจ่าย';
        setFinanceFormError(msg);
        showToast(msg, 'error');
        return;
      }
      if (!editingFinance.amount || editingFinance.amount <= 0) {
        const msg = 'กรุณากรอกจำนวนเงิน (บาท) ให้มากกว่า 0';
        setFinanceFormError(msg);
        showToast(msg, 'error');
        return;
      }

      setFinanceFormError(null);
      const currentList = finances || [];
      const isNew = !currentList.some(f => f.id === editingFinance.id);
      const newFin = isNew 
        ? [...currentList, editingFinance]
        : currentList.map(f => f.id === editingFinance.id ? editingFinance : f);
      onSaveFinances(newFin);
      showToast('บันทึกข้อมูลการเงินเรียบร้อยแล้ว', 'success');
      setIsEditingFinance(false);
    };

    if (isEditingFinance && editingFinance) {
      return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6 animate-in fade-in duration-200">
          {/* Form Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingFinance.id && (finances || []).some(f => f.id === editingFinance.id) ? 'แก้ไขข้อมูลการเงินและเบิกจ่าย' : 'เพิ่มรายการการเงินและเบิกจ่าย'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">กรอกรายละเอียดข้อมูลการเงินเพื่อบันทึกเข้าสู่ระบบบัญชี อปพร.</p>
              </div>
            </div>
            
          </div>

          {/* Form Error Notification */}
          {financeFormError && (
            <div className="p-4 bg-rose-50 border-2 border-rose-200 text-rose-800 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in shadow-xs">
              <div className="flex items-center gap-3 font-bold text-sm">
                <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
                  !
                </div>
                <span>{financeFormError}</span>
              </div>
              <button
                onClick={() => setFinanceFormError(null)}
                className="px-3 py-1 bg-rose-200/80 hover:bg-rose-200 text-rose-900 rounded-lg text-xs font-bold cursor-pointer transition-colors shrink-0"
              >
                ปิด
              </button>
            </div>
          )}

          {/* Form Sections */}
          <div className="space-y-6">
            {/* Section 1: ข้อมูลผู้เบิกและวันที่ */}
            <div className="bg-slate-50/60 p-5 md:p-6 rounded-2xl border border-slate-200/80 space-y-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-3">
                <UserIcon className="w-4 h-4 text-blue-600" />
                1. ข้อมูลผู้ได้รับเงิน และวันที่รายการ
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    เลือก อปพร. ผู้ได้รับเงิน <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editingFinance.volunteerId}
                    onChange={e => setEditingFinance({ ...editingFinance, volunteerId: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none bg-white font-medium text-gray-800"
                  >
                    <option value="" disabled>-- เลือกรายชื่อ อปพร. --</option>
                    {(volunteers || []).map(v => (
                      <option key={v.id} value={v.id}>{v.name} (รหัส: {v.code || '-'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    วันที่ทำรายการ / วันที่เบิกจ่าย <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editingFinance.date}
                    onChange={e => setEditingFinance({ ...editingFinance, date: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none bg-white font-medium text-gray-800"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: ประเภทและจำนวนเงิน */}
            <div className="bg-slate-50/60 p-5 md:p-6 rounded-2xl border border-slate-200/80 space-y-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-3">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                2. ประเภทรายการ และจำนวนเงิน
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    ประเภทค่าใช้จ่าย / การเบิกจ่าย <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editingFinance.type}
                    onChange={e => setEditingFinance({ ...editingFinance, type: e.target.value as any })}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none bg-white font-medium text-gray-800"
                  >
                    <option value="ค่าป่วยการ">ค่าป่วยการ</option>
                    <option value="ค่าตอบแทน">ค่าตอบแทน</option>
                    <option value="ค่าเดินทาง">ค่าเดินทาง</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    จำนวนเงิน (บาท) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={editingFinance.amount || ''}
                      onChange={e => setEditingFinance({ ...editingFinance, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2.5 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-xl font-bold text-blue-600 bg-white"
                    />
                    <span className="absolute right-3 top-3 text-sm font-bold text-gray-400">บาท</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  รายละเอียด / หมายเหตุการเบิกจ่าย <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="ระบุรายละเอียดโครงการ หรือเหตุผลการเบิกจ่าย..."
                  value={editingFinance.description}
                  onChange={e => setEditingFinance({ ...editingFinance, description: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none bg-white font-medium text-gray-800"
                />
              </div>
            </div>
          </div>

          {/* Bottom Action bar */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => {
                setFinanceFormError(null);
                setIsEditingFinance(false);
              }}
              className="px-5 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 font-semibold text-gray-600 transition-colors cursor-pointer text-sm"
            >
              ยกเลิก
            </button>
            <button
              onClick={saveFinance}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center gap-2 font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer text-sm"
            >
              <Save className="w-4 h-4" /> บันทึกข้อมูล
            </button>
          </div>
        </div>
      );
    }

    let filtered = finances || [];
    if (selectedVolunteer !== 'all') {
      filtered = filtered.filter(f => f.volunteerId === selectedVolunteer);
    }
    if (financeSearch) {
      filtered = filtered.filter(f => (f.description || '').includes(financeSearch));
    }

    const exportToExcel = () => {
      const dataToExport = filtered.map(f => {
        const vol = (volunteers || []).find(v => v.id === f.volunteerId);
        return {
          'วันที่': f.date,
          'ชื่อ อปพร.': vol ? vol.name : 'ไม่ระบุ',
          'ประเภท': f.type,
          'รายละเอียด': f.description,
          'จำนวนเงิน (บาท)': f.amount
        };
      });
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Finance");
      XLSX.writeFile(wb, `อปพร_การเงิน_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    const exportToPDF = () => {
      const doc = new jsPDF();
      doc.addFont("https://cdn.jsdelivr.net/gh/lazywasabi/thai-web-fonts@3/fonts/THSarabunNew/THSarabunNew.ttf", "THSarabunNew", "normal");
      doc.setFont("THSarabunNew");
      
      const tableColumn = ["Date", "Name", "Type", "Detail", "Amount"];
      const tableRows: any[] = [];

      filtered.forEach(f => {
        const vol = (volunteers || []).find(v => v.id === f.volunteerId);
        tableRows.push([
          f.date,
          vol ? vol.name : '-',
          f.type,
          f.description,
          f.amount.toString()
        ]);
      });

      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        styles: { font: "THSarabunNew" }
      });

      doc.save(`อปพร_การเงิน_${new Date().toISOString().slice(0,10)}.pdf`);
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหา"
                value={financeSearch}
                onChange={e => setFinanceSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <select
              value={selectedVolunteer}
              onChange={e => setSelectedVolunteer(e.target.value)}
              className="p-2 border border-gray-200 rounded-xl bg-gray-50 min-w-[200px]"
            >
              <option value="all">อปพร. ทั้งหมด</option>
              {(volunteers || []).map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={exportToExcel} className="flex-1 md:flex-none justify-center items-center flex gap-2 px-4 py-2 bg-[#107c41] text-white rounded-xl hover:bg-[#0c5c30] text-sm font-medium shadow-sm transition-colors cursor-pointer">
              <FileText className="w-4 h-4" /> excel
            </button>
            <button onClick={exportToPDF} className="flex-1 md:flex-none justify-center items-center flex gap-2 px-4 py-2 bg-[#f40f02] text-white rounded-xl hover:bg-[#c20b00] text-sm font-medium shadow-sm transition-colors cursor-pointer">
              <Download className="w-4 h-4" /> PDF
            </button>
            <button
              onClick={() => {
                setEditingFinance({
                  id: generateId(),
                  volunteerId: (volunteers || [])[0]?.id || '',
                  date: new Date().toISOString().slice(0,10),
                  type: 'ค่าป่วยการ',
                  amount: 0,
                  description: ''
                });
                setFinanceFormError(null);
                setIsEditingFinance(true);
              }}
              className="flex-1 md:flex-none justify-center items-center flex gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> เพิ่มรายการ
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-sm">
                  <th className="p-4 font-bold text-gray-700">วันที่</th>
                  <th className="p-4 font-bold text-gray-700">ชื่อ อปพร.</th>
                  <th className="p-4 font-bold text-gray-700">ประเภท</th>
                  <th className="p-4 font-bold text-gray-700">รายละเอียด</th>
                  <th className="p-4 font-bold text-gray-700 text-right">จำนวนเงิน (บาท)</th>
                  <th className="p-4 font-bold text-gray-700 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-gray-400 bg-gray-50/50">
                      ไม่มีข้อมูลการเบิกจ่าย
                    </td>
                  </tr>
                ) : filtered.map(f => {
                  const vol = (volunteers || []).find(v => v.id === f.volunteerId);
                  return (
                    <tr key={f.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                      <td className="p-4 whitespace-nowrap text-gray-600">{f.date}</td>
                      <td className="p-4 font-medium text-gray-900">{vol ? vol.name : 'ไม่ระบุ'}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          f.type === 'ค่าป่วยการ' ? 'bg-blue-100 text-blue-700' :
                          f.type === 'ค่าตอบแทน' ? 'bg-green-100 text-green-700' :
                          f.type === 'ค่าเดินทาง' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {f.type}
                        </span>
                      </td>
                      <td className="p-4 text-gray-600">{f.description}</td>
                      <td className="p-4 text-right font-bold text-gray-900">
                        {f.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingFinance(f);
                              setFinanceFormError(null);
                              setIsEditingFinance(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('ต้องการลบรายการนี้ใช่หรือไม่?')) {
                                const newFin = (finances || []).filter(x => x.id !== f.id);
                                onSaveFinances(newFin);
                                showToast('ลบข้อมูลแล้ว', 'success');
                              }
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderDetailModal = () => {
    if (!viewingVolunteer || typeof document === 'undefined') return null;

    return createPortal(
      <div className="fixed inset-0 w-full h-full max-h-screen bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
        <div className="bg-white w-full max-w-4xl h-[94vh] max-h-[94vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
          {/* Action Header - hidden in print mode */}
          <div className="p-3 sm:p-4 md:p-5 bg-slate-900 text-white flex flex-wrap justify-between items-center gap-3 border-b border-slate-800 print:hidden shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-400/30">
                <Shield className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-sm md:text-base font-bold flex items-center gap-2">
                  <span>แบบรายงานประวัติ อปพร.</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-900/80 text-blue-300 text-[10px] font-bold">
                    พรีวิวก่อนส่งออก
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">{viewingVolunteer.name} (รหัส: {viewingVolunteer.code || '-'})</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {/* Quick Jump Buttons */}
              <div className="flex items-center gap-0.5 bg-slate-800 p-0.5 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={scrollToProfileTop}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition cursor-pointer"
                  title="เลื่อนขึ้นบนสุด"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={scrollToProfileBottom}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition cursor-pointer"
                  title="เลื่อนลงล่างสุด (ดูลายเซ็น)"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Download PDF button */}
              <button
                type="button"
                onClick={handleDownloadDetailPdf}
                disabled={isDownloadingDetailPdf}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-900/20 cursor-pointer"
                title="ดาวน์โหลดไฟล์ PDF คุณภาพสูง"
              >
                {isDownloadingDetailPdf ? (
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>{isDownloadingDetailPdf ? 'กำลังสร้าง...' : 'ดาวน์โหลด .PDF'}</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
                title="พิมพ์เอกสาร"
              >
                <Printer className="w-3.5 h-3.5" /> พิมพ์
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingVolunteer(viewingVolunteer);
                  setViewingVolunteer(null);
                  setIsEditing(true);
                }}
                className="px-3 py-1.5 bg-amber-600 text-white hover:bg-amber-500 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" /> แก้ไข
              </button>

              <button
                type="button"
                onClick={() => handleDeleteVolunteer(viewingVolunteer.id, viewingVolunteer.name)}
                className="px-3 py-1.5 bg-rose-600 text-white hover:bg-rose-500 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> ลบ
              </button>

              <button
                type="button"
                onClick={() => setViewingVolunteer(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all ml-1 cursor-pointer"
                title="ปิด"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Official Profile Document Body with smooth scrolling */}
          <div 
            ref={profileScrollRef}
            className="flex-1 p-4 sm:p-6 md:p-10 overflow-y-auto space-y-8 print:p-0 print:overflow-visible custom-scrollbar relative focus:outline-none"
            style={{
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
              scrollBehavior: 'smooth'
            }}
            tabIndex={0}
            onWheel={(e) => {
              if (profileScrollRef.current) {
                profileScrollRef.current.scrollTop += e.deltaY;
              }
            }}
          >
            <div ref={profilePrintRef} className="space-y-8 bg-white p-2">
            {/* Document Header for Official Report Printout */}
            <div className="text-center border-b-2 border-amber-500 pb-6">
              <div className="flex justify-center items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xl shadow-md">
                  <Shield className="w-7 h-7" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">แบบรายงานประวัติอาสาสมัครป้องกันภัยฝ่ายพลเรือน (อปพร.)</h1>
              <p className="text-sm font-medium text-gray-600 mt-1">ศูนย์อาสาสมัครป้องกันภัยฝ่ายพลเรือน เทศบาลตำบลม่อนจอง อำเภออมก๋อย จังหวัดเชียงใหม่</p>
            </div>

            {/* Top Profile Summary Card */}
            <div className="bg-gradient-to-r from-slate-50 to-amber-50/30 p-6 rounded-2xl border border-amber-200/60 flex flex-col md:flex-row gap-6 items-center md:items-start">
              <div className="w-32 h-36 rounded-2xl bg-white border-2 border-amber-300 overflow-hidden shadow-sm shrink-0 flex items-center justify-center">
                {viewingVolunteer.photoUrl ? (
                  <img src={viewingVolunteer.photoUrl} alt={viewingVolunteer.name} className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-16 h-16 text-gray-300" />
                )}
              </div>
              <div className="flex-1 space-y-3 text-center md:text-left w-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-amber-200/50 pb-2">
                  <h2 className="text-2xl font-bold text-gray-900">{viewingVolunteer.name || 'ไม่ระบุชื่อ'}</h2>
                  <span className="inline-block px-3.5 py-1 bg-amber-600 text-white rounded-full font-bold text-sm shadow-xs">
                    รหัส อปพร.: {viewingVolunteer.code || '-'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="bg-white/80 p-2.5 rounded-xl border border-gray-100">
                    <span className="text-gray-500 text-xs block">เลขบัตรประชาชน</span>
                    <span className="font-bold text-gray-800">{viewingVolunteer.idCard || '-'}</span>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-gray-100">
                    <span className="text-gray-500 text-xs block">เบอร์โทรศัพท์</span>
                    <span className="font-bold text-gray-800">{viewingVolunteer.tel || '-'}</span>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-gray-100">
                    <span className="text-gray-500 text-xs block">มือถือ</span>
                    <span className="font-bold text-gray-800">{viewingVolunteer.mobile || '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 1: ข้อมูลส่วนตัวเบื้องต้น */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-amber-900 border-l-4 border-amber-500 pl-3 py-0.5 bg-amber-50/50 rounded-r-lg">
                1. ข้อมูลส่วนตัวเบื้องต้น
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-gray-200 text-sm">
                <div><span className="text-gray-500 text-xs block">วัน/เดือน/ปี เกิด</span><span className="font-semibold text-gray-800">{viewingVolunteer.birthDate || '-'}</span></div>
                <div><span className="text-gray-500 text-xs block">อายุ</span><span className="font-semibold text-gray-800">{viewingVolunteer.age ? `${viewingVolunteer.age} ปี` : '-'}</span></div>
                <div><span className="text-gray-500 text-xs block">สัญชาติ</span><span className="font-semibold text-gray-800">{viewingVolunteer.nationality || '-'}</span></div>
                <div><span className="text-gray-500 text-xs block">เชื้อชาติ</span><span className="font-semibold text-gray-800">{viewingVolunteer.race || '-'}</span></div>
                <div><span className="text-gray-500 text-xs block">กรุ๊ปเลือด</span><span className="font-semibold text-gray-800">{viewingVolunteer.bloodGroup || '-'}</span></div>
                <div><span className="text-gray-500 text-xs block">โรคประจำตัว</span><span className="font-semibold text-gray-800">{viewingVolunteer.disease || '-'}</span></div>
                <div><span className="text-gray-500 text-xs block">อาชีพ</span><span className="font-semibold text-gray-800">{viewingVolunteer.occupation || '-'}</span></div>
                <div><span className="text-gray-500 text-xs block">รายได้ต่อเดือน</span><span className="font-semibold text-gray-800">{viewingVolunteer.income ? `${viewingVolunteer.income} บาท` : '-'}</span></div>
              </div>
            </div>


            {/* Section 1.5: สัดส่วนร่างกาย */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-pink-900 border-l-4 border-pink-500 pl-3 py-0.5 bg-pink-50/50 rounded-r-lg">
                สัดส่วนร่างกาย
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 bg-white p-4 rounded-2xl border border-gray-200 text-sm">
                <div><span className="text-gray-500 text-xs block">น้ำหนัก</span><span className="font-semibold text-gray-800">{viewingVolunteer.weight ? `${viewingVolunteer.weight} กก.` : '-'}</span></div>
                <div><span className="text-gray-500 text-xs block">ส่วนสูง</span><span className="font-semibold text-gray-800">{viewingVolunteer.height ? `${viewingVolunteer.height} ซม.` : '-'}</span></div>
                <div><span className="text-gray-500 text-xs block">รอบอก</span><span className="font-semibold text-gray-800">{viewingVolunteer.chest ? `${viewingVolunteer.chest} นิ้ว` : '-'}</span></div>
                <div><span className="text-gray-500 text-xs block">ไหล่</span><span className="font-semibold text-gray-800">{viewingVolunteer.shoulder ? `${viewingVolunteer.shoulder} นิ้ว` : '-'}</span></div>
                <div><span className="text-gray-500 text-xs block">เอว</span><span className="font-semibold text-gray-800">{viewingVolunteer.waist ? `${viewingVolunteer.waist} นิ้ว` : '-'}</span></div>
                <div><span className="text-gray-500 text-xs block">ต้นขา</span><span className="font-semibold text-gray-800">{viewingVolunteer.thigh ? `${viewingVolunteer.thigh} นิ้ว` : '-'}</span></div>
                <div><span className="text-gray-500 text-xs block">ไซต์เสื้อ</span><span className="font-semibold text-gray-800">{viewingVolunteer.shirtSize || '-'}</span></div>
                <div><span className="text-gray-500 text-xs block">ไซต์กางเกง</span><span className="font-semibold text-gray-800">{viewingVolunteer.pantsSize || '-'}</span></div>
                <div><span className="text-gray-500 text-xs block">ไซต์รองเท้า</span><span className="font-semibold text-gray-800">{viewingVolunteer.shoeSize || '-'}</span></div>
              </div>
            </div>

            {/* Section 2: ที่อยู่และการติดต่อ */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-blue-900 border-l-4 border-blue-500 pl-3 py-0.5 bg-blue-50/50 rounded-r-lg">
                2. ข้อมูลที่อยู่ปัจจุบัน และ ภูมิลำเนาเดิม
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50/30 p-4 rounded-2xl border border-blue-200/60 text-sm space-y-1">
                  <span className="font-bold text-blue-900 block mb-1">ที่อยู่ปัจจุบัน</span>
                  <p className="text-gray-700">บ้านเลขที่: {viewingVolunteer.addressHouseNo || '-'}</p>
                  <p className="text-gray-700">ตำบล: {viewingVolunteer.addressSubdistrict || '-'}  อำเภอ: {viewingVolunteer.addressDistrict || '-'}</p>
                  <p className="text-gray-700">จังหวัด: {viewingVolunteer.addressProvince || '-'} {viewingVolunteer.addressZipcode || ''}</p>
                </div>
                <div className="bg-emerald-50/30 p-4 rounded-2xl border border-emerald-200/60 text-sm space-y-1">
                  <span className="font-bold text-emerald-900 block mb-1">ภูมิลำเนาเดิม</span>
                  <p className="text-gray-700">บ้านเลขที่: {viewingVolunteer.nativeHouseNo || '-'}</p>
                  <p className="text-gray-700">ตำบล: {viewingVolunteer.nativeSubdistrict || '-'}  อำเภอ: {viewingVolunteer.nativeDistrict || '-'}</p>
                  <p className="text-gray-700">จังหวัด: {viewingVolunteer.nativeProvince || '-'} {viewingVolunteer.nativeZipcode || ''}</p>
                </div>
              </div>
            </div>

            {/* Section 3: ความสามารถพิเศษ & ใบอนุญาตขับขี่ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-orange-50/30 p-4 rounded-2xl border border-orange-200/60 text-sm">
                <h3 className="font-bold text-orange-900 mb-2">3. ความสามารถพิเศษ</h3>
                {viewingVolunteer.specialAbilities && viewingVolunteer.specialAbilities.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {viewingVolunteer.specialAbilities.map(sa => (
                      <li key={sa.id}>{sa.detail}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 italic">ไม่มีข้อมูลระบุ</p>
                )}
              </div>
              <div className="bg-indigo-50/30 p-4 rounded-2xl border border-indigo-200/60 text-sm">
                <h3 className="font-bold text-indigo-900 mb-2">4. ใบอนุญาตขับขี่</h3>
                {viewingVolunteer.license?.type && viewingVolunteer.license.type !== 'ไม่มี' ? (
                  <div className="space-y-1 text-gray-700">
                    <p><span className="font-semibold">ประเภท:</span> {viewingVolunteer.license.type === 'อื่นๆ' ? viewingVolunteer.license.otherType : viewingVolunteer.license.type}</p>
                    <p><span className="font-semibold">ฉบับที่:</span> {viewingVolunteer.license.no || '-'}</p>
                    <p><span className="font-semibold">วันอนุญาต:</span> {viewingVolunteer.license.issueDate || '-'} <span className="font-semibold ml-2">วันหมดอายุ:</span> {viewingVolunteer.license.expiryDate || '-'}</p>
                    <p><span className="font-semibold">สถานที่ออก:</span> {viewingVolunteer.license.issuedBy || '-'}</p>
                  </div>
                ) : (
                  <p className="text-gray-400 italic">ไม่มีใบอนุญาตขับขี่</p>
                )}
              </div>
            </div>

            {/* Section 4: สมาชิกครอบครัว */}
            <div className="space-y-2">
              <h3 className="text-base font-bold text-purple-900 border-l-4 border-purple-500 pl-3 py-0.5 bg-purple-50/50 rounded-r-lg">
                5. ข้อมูลสมาชิกครอบครัว
              </h3>
              {viewingVolunteer.family && viewingVolunteer.family.length > 0 ? (
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-sm text-left text-gray-700">
                    <thead className="bg-purple-50/80 text-purple-900 font-bold border-b border-gray-200">
                      <tr>
                        <th className="p-2.5">ความสัมพันธ์</th>
                        <th className="p-2.5">ชื่อ-นามสกุล</th>
                        <th className="p-2.5">อายุ</th>
                        <th className="p-2.5">อาชีพ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {viewingVolunteer.family.map((fam, idx) => (
                        <tr key={fam.id || idx}>
                          <td className="p-2.5 font-medium">{fam.relation}</td>
                          <td className="p-2.5">{fam.name}</td>
                          <td className="p-2.5">{fam.age} ปี</td>
                          <td className="p-2.5">{fam.job}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-400 italic text-sm pl-2">ไม่มีข้อมูลสมาชิกครอบครัว</p>
              )}
            </div>

            {/* Section 5: ประวัติการศึกษา & การทำงาน & เครื่องราชฯ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm">
                <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-blue-600" /> ประวัติการศึกษา</h3>
                {viewingVolunteer.education && viewingVolunteer.education.length > 0 ? (
                  <div className="space-y-2">
                    {viewingVolunteer.education.map(edu => (
                      <div key={edu.id} className="bg-white p-2.5 rounded-xl border border-slate-100 text-xs">
                        <p className="font-bold text-slate-900">{edu.degree || '-'}</p>
                        <p className="text-gray-600">{edu.institution || '-'} (ปีการศึกษา {edu.year || '-'})</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-gray-400 italic text-xs">ไม่มีข้อมูล</p>}
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm">
                <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-emerald-600" /> ประวัติการทำงาน</h3>
                {viewingVolunteer.workHistory && viewingVolunteer.workHistory.length > 0 ? (
                  <div className="space-y-2">
                    {viewingVolunteer.workHistory.map(wk => (
                      <div key={wk.id} className="bg-white p-2.5 rounded-xl border border-slate-100 text-xs">
                        <p className="font-bold text-slate-900">{wk.position || '-'}</p>
                        <p className="text-gray-600">{wk.workplace || '-'} (พ.ศ. {wk.startYear || '-'}-{wk.endYear || '-'})</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-gray-400 italic text-xs">ไม่มีข้อมูล</p>}
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm">
                <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5"><Award className="w-4 h-4 text-amber-600" /> ประวัติการอบรม / ผลงาน</h3>
                {viewingVolunteer.honors && viewingVolunteer.honors.length > 0 ? (
                  <div className="space-y-2">
                    {viewingVolunteer.honors.map(h => (
                      <div key={h.id} className="bg-white p-2.5 rounded-xl border border-slate-100 text-xs">
                        <p className="font-bold text-slate-900">{h.detail || '-'}</p>
                        <p className="text-gray-600">ปี พ.ศ. {h.year || '-'}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-gray-400 italic text-xs">ไม่มีข้อมูล</p>}
              </div>
            </div>

            {/* Print Signature Footer */}
            <div className="pt-8 mt-8 border-t border-gray-300 grid grid-cols-2 gap-8 text-center text-xs text-gray-700">
              <div>
                <p className="mb-12">ลงชื่อ..........................................................ผู้รายงาน</p>
                <p>({viewingVolunteer.name || '..........................................................'})</p>
                <p className="mt-1">ตำแหน่ง อาสาสมัครป้องกันภัยฝ่ายพลเรือน</p>
              </div>
              <div>
                <p className="mb-12">ลงชื่อ..........................................................ผู้รับรองประวัติ</p>
                <p>(..........................................................)</p>
                <p className="mt-1">ผู้อำนวยการศูนย์ อปพร. เทศบาลตำบลม่อนจอง</p>
              </div>
            </div>
          </div>

          {/* Floating Quick Jump Pill for Long Profiles */}
          <div className="sticky bottom-3 mx-auto w-fit z-30 bg-slate-900/90 text-white backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-xl border border-slate-700 flex items-center gap-2 text-xs pointer-events-auto print:hidden">
            <span className="text-slate-300 text-[11px]">แบบรายงานประวัติ</span>
            <div className="h-3.5 w-px bg-slate-700" />
            <button
              type="button"
              onClick={scrollToProfileTop}
              className="text-slate-300 hover:text-white flex items-center gap-1 font-bold cursor-pointer"
            >
              <ChevronUp className="w-3.5 h-3.5" /> บนสุด
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              onClick={scrollToProfileBottom}
              className="text-slate-300 hover:text-white flex items-center gap-1 font-bold cursor-pointer"
            >
              <ChevronDown className="w-3.5 h-3.5" /> ล่างสุด (ลายเซ็น)
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row gap-3 mb-8 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
        <button
          onClick={() => { setActiveSubTab('profile'); setIsEditing(false); }}
          className={`flex-1 flex justify-center items-center gap-2 px-6 py-3.5 rounded-xl font-bold transition-all ${
            activeSubTab === 'profile' 
              ? 'bg-blue-50 text-blue-700 shadow-sm' 
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
          }`}
        >
          <Shield className="w-5 h-5" /> ระบบประวัติ อปพร.
        </button>
        <button
          onClick={() => { setActiveSubTab('finance'); setIsEditing(false); }}
          className={`flex-1 flex justify-center items-center gap-2 px-6 py-3.5 rounded-xl font-bold transition-all ${
            activeSubTab === 'finance' 
              ? 'bg-blue-50 text-blue-700 shadow-sm' 
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
          }`}
        >
          <CreditCard className="w-5 h-5" /> ระบบการเงิน-การบัญชี
        </button>
      </div>

      <div className="animate-in fade-in zoom-in-[0.98] duration-300">
        {activeSubTab === 'profile' ? renderProfile() : renderFinance()}
      </div>

      {renderDetailModal()}

      {/* Volunteers Summary PDF Modal */}
      {isPdfModalOpen && (
        <VolunteersPdfModal
          volunteers={(volunteers || []).filter(v => (v.name || '').includes(searchTerm) || (v.code || '').includes(searchTerm))}
          allVolunteers={volunteers || []}
          onClose={() => setIsPdfModalOpen(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
}
