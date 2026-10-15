import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { OfficialDoc, TaskItem } from '../types';
import { getThaiTodayStr } from '../utils/dateUtils';
import { FileText, Search, Plus, Trash2, Edit3, X, FolderArchive, MailCheck, MailQuestion, Newspaper, Calendar, Download, HelpCircle, AlertOctagon, CheckSquare, UploadCloud, ExternalLink, Paperclip, Loader2, Eye, Building2, Info, Printer } from 'lucide-react';
import { exportToExcel } from '../utils/export';
import { uploadFileToGoogleDrive, deleteFileFromGoogleDriveDetailed, openDocumentFile } from '../utils/googleDriveClient';
import { motion } from 'motion/react';
import OfficialDocsPdfModal from './OfficialDocsPdfModal';

interface OfficialDocsProps {
  docs: OfficialDoc[];
  onSaveDocs: (updated: OfficialDoc[]) => void;
  tasks?: TaskItem[];
  onSaveTasks?: (updated: TaskItem[]) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  showConfirm: (title: string, message: string, type: 'save' | 'edit' | 'delete' | 'default') => Promise<boolean>;
}

export default function OfficialDocs({ docs, onSaveDocs, tasks, onSaveTasks, showToast, showConfirm }: OfficialDocsProps) {
  // Search query & filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDocType, setFilterDocType] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<OfficialDoc | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Form Inputs
  const [docNo, setDocNo] = useState('');
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState(getThaiTodayStr());
  const [agency, setAgency] = useState('');
  const [docType, setDocType] = useState<'หนังสือรับ' | 'หนังสือส่ง' | 'ประกาศ' | 'คำสั่ง' | 'แบบคำร้อง'>('หนังสือรับ');
  const [receiveNo, setReceiveNo] = useState('');
  const [shelfNo, setShelfNo] = useState('');
  const [note, setNote] = useState('');

  // Petition Fields
  const [petitionStatus, setPetitionStatus] = useState<'รอสำรวจ' | 'ช่วยเหลือได้' | 'ช่วยเหลือไม่ได้'>('รอสำรวจ');
  const [surveyDate, setSurveyDate] = useState(getThaiTodayStr());
  const [noHelpReason, setNoHelpReason] = useState('');
  const [helpDetail, setHelpDetail] = useState('');

  // Google Drive File Attachment State
  const [fileUrl, setFileUrl] = useState('');
  const [fileId, setFileId] = useState('');
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = docs.map(d => ({
      'ประเภท': d.docType,
      'เลขที่หนังสือ': d.docNo,
      'เรื่อง': d.subject,
      'วันที่': d.date,
      'หน่วยงาน': d.agency,
      'แฟ้ม': d.shelfNo,
      'สถานะคำร้อง': d.petitionStatus || '-',
      'วันที่สำรวจ': d.surveyDate || '-',
      'เหตุผลช่วยไม่ได้': d.noHelpReason || '-',
      'รายละเอียดช่วยเหลือ': d.helpDetail || '-',
      'ลิงก์ไฟล์ Drive': d.fileUrl || '-',
      'ชื่อไฟล์': d.fileName || '-'
    }));
    exportToExcel(data, 'ทะเบียนหนังสือราชการ', 'เอกสารทั้งหมด');
    showToast('ส่งออกไฟล์ Excel เรียบร้อย', 'success');
  };

  // Handle open modal for adding
  const handleOpenAddDoc = () => {
    setEditingDocId(null);
    setDocNo('');
    setSubject('');
    setDate(getThaiTodayStr());
    setAgency('');
    setDocType('หนังสือรับ');
    setReceiveNo('');
    setShelfNo('');
    setNote('');
    setPetitionStatus('รอสำรวจ');
    setSurveyDate(getThaiTodayStr());
    setNoHelpReason('');
    setHelpDetail('');
    setFileUrl('');
    setFileId('');
    setFileName('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsModalOpen(true);
  };

  // Handle open modal for editing
  const handleOpenEditDoc = (doc: OfficialDoc) => {
    setEditingDocId(doc.id);
    setDocNo(doc.docNo || '');
    setSubject(doc.subject || '');
    setDate(doc.date || getThaiTodayStr());
    setAgency(doc.agency || '');
    setDocType(doc.docType);
    setReceiveNo(doc.receiveNo || '');
    setShelfNo(doc.shelfNo || '');
    setNote(doc.note || '');
    setPetitionStatus(doc.petitionStatus || 'รอสำรวจ');
    setSurveyDate(doc.surveyDate || getThaiTodayStr());
    setNoHelpReason(doc.noHelpReason || '');
    setHelpDetail(doc.helpDetail || '');
    setFileUrl(doc.fileUrl || '');
    setFileId(doc.fileId || '');
    setFileName(doc.fileName || '');
    setIsModalOpen(true);
  };

  // จัดการอัปโหลดไฟล์ไปยัง Google Drive ทันทีเมื่อเลือกไฟล์
  const handleFileSelectAndUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setSelectedFile(file);
    showToast(`กำลังอัปโหลดเอกสาร "${file.name}" ไปยัง Google Drive...`, 'info');

    try {
      const uploadResult = await uploadFileToGoogleDrive(file);
      const uploadedUrl = uploadResult.webViewLink || uploadResult.webContentLink || '';
      setFileUrl(uploadedUrl);
      setFileId(uploadResult.fileId);
      setFileName(uploadResult.fileName);
      setSelectedFile(null);
      if (uploadResult.isLocalFallback) {
        showToast(`แนบไฟล์เอกสาร "${file.name}" ในระบบเรียบร้อย (เปิดดูและดาวน์โหลดได้ทันที)`, 'success');
      } else {
        showToast(`บันทึกเอกสาร "${file.name}" ลงใน Google Drive สำเร็จ`, 'success');
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      showToast(`ไม่สามารถอัปโหลดไฟล์ไป Google Drive ได้: ${err.message || 'โปรดตรวจสอบการเชื่อมต่อ'}`, 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // จัดการนำไฟล์เอกสารออกและย้ายไฟล์ไปไว้ในถังขยะของ Google Drive
  const handleRemoveAttachedFile = async () => {
    if (!fileUrl && !fileId) {
      setFileUrl('');
      setFileId('');
      setFileName('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const confirmed = await showConfirm(
      'ยืนยันย้ายไฟล์ไปไว้ในถังขยะ',
      `คุณต้องการนำเอกสาร "${fileName || 'ไฟล์แนบ'}" ออกจากรายการ และย้ายไฟล์ไปไว้ในถังขยะของ Google Drive ใช่หรือไม่?`,
      'delete'
    );
    if (!confirmed) return;

    try {
      showToast('กำลังย้ายเอกสารไปไว้ในถังขยะ Google Drive...', 'info');
      const delRes = await deleteFileFromGoogleDriveDetailed(fileId, fileUrl);
      if (delRes.success) {
        if (delRes.isLocalOnly) {
          showToast('นำไฟล์แนบออกจากรายการเรียบร้อย (ไฟล์ไม่ได้อยู่บน Google Drive)', 'info');
        } else {
          showToast(delRes.message || 'ย้ายเอกสารไปไว้ในถังขยะ Google Drive เรียบร้อยแล้ว', 'success');
        }
      } else if (delRes.isPermissionError) {
        showToast('Google Apps Script ยังไม่ได้รับสิทธิ์เข้าถึง Google Drive (Access denied) กรุณากด Run ฟังก์ชันใน Apps Script', 'error');
      } else {
        showToast(`ไม่สามารถย้ายไฟล์ใน Google Drive ได้: ${delRes.error || 'ไฟล์อาจถูกลบไปแล้ว'}`, 'error');
      }
    } catch (err) {
      console.warn('Failed to move file to trash:', err);
      showToast('ไม่สามารถย้ายไฟล์ใน Google Drive ได้', 'info');
    } finally {
      setFileUrl('');
      setFileId('');
      setFileName('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const safeDocNo = String(docNo || '');
    const safeSubject = String(subject || '');
    const safeAgency = String(agency || '');
    const safeShelfNo = String(shelfNo || '');

    if (!safeDocNo.trim() || !safeSubject.trim() || !safeAgency.trim() || !safeShelfNo.trim()) {
      showToast('กรุณากรอกข้อมูลหนังสือราชการในช่องจำเป็นให้ครบถ้วน', 'error');
      return;
    }

    if (!date) {
      showToast('กรุณาระบุลงวันที่เอกสาร', 'error');
      return;
    }

    if (docType === 'หนังสือรับ' && !(receiveNo || '').trim()) {
      showToast('กรุณากรอกเลขที่รับสำหรับหนังสือรับด้วยค่ะ', 'error');
      return;
    }

    if (docType === 'แบบคำร้อง' && petitionStatus === 'รอสำรวจ' && !surveyDate) {
      showToast('กรุณาระบุวันที่ออกสำรวจด้วยค่ะ', 'error');
      return;
    }

    if (docType === 'แบบคำร้อง' && petitionStatus === 'ช่วยเหลือไม่ได้' && !(noHelpReason || '').trim()) {
      showToast('กรุณาระบุเหตุผลที่ช่วยเหลือไม่ได้ด้วยค่ะ', 'error');
      return;
    }

    if (docType === 'แบบคำร้อง' && petitionStatus === 'ช่วยเหลือได้' && !(helpDetail || '').trim()) {
      showToast('กรุณาระบุรายละเอียดการช่วยเหลือด้วยค่ะ', 'error');
      return;
    }

    let finalFileUrl = fileUrl;
    let finalFileId = fileId;
    let finalFileName = fileName;

    // หากมีการเลือกไฟล์ใหม่อัปโหลดขึ้น Google Drive
    if (selectedFile) {
      setIsUploading(true);
      try {
        showToast(`กำลังประมวลผลไฟล์ "${selectedFile.name}"...`, 'info');
        const uploadResult = await uploadFileToGoogleDrive(selectedFile);
        finalFileUrl = uploadResult.webViewLink || uploadResult.webContentLink || '';
        finalFileId = uploadResult.fileId;
        finalFileName = uploadResult.fileName;
        if (uploadResult.isPermissionError) {
          showToast('⚠️ สคริปต์ยังไม่ได้รับสิทธิ์ Google Drive (Access denied: DriveApp) จึงแนบไฟล์ชั่วคราวในระบบ กรุณากด Run ฟังก์ชันใน Apps Script เพื่อเปิดใช้งานไดรฟ์', 'error');
        } else if (uploadResult.isLocalFallback) {
          showToast('แนบไฟล์เอกสารในระบบเรียบร้อย (เปิดดูและดาวน์โหลดได้ทันที)', 'success');
        } else {
          showToast('อัปโหลดไฟล์เอกสารไปยัง Google Drive สำเร็จ', 'success');
        }
      } catch (err: any) {
        console.error('Upload error:', err);
        showToast(`ไม่สามารถแนบไฟล์ได้: ${err.message || 'โปรดตรวจสอบการเชื่อมต่อ'}`, 'error');
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    const updatedDoc: OfficialDoc = {
      id: editingDocId || 'doc-' + Date.now(),
      docNo: safeDocNo.trim(),
      subject: safeSubject.trim(),
      date,
      agency: safeAgency.trim(),
      docType,
      receiveNo: docType === 'หนังสือรับ' ? (receiveNo || '').trim() : undefined,
      shelfNo: safeShelfNo.trim(),
      note: (note || '').trim(),
      petitionStatus: docType === 'แบบคำร้อง' ? petitionStatus : undefined,
      surveyDate: (docType === 'แบบคำร้อง' && petitionStatus === 'รอสำรวจ') ? surveyDate : undefined,
      noHelpReason: (docType === 'แบบคำร้อง' && petitionStatus === 'ช่วยเหลือไม่ได้') ? (noHelpReason || '').trim() : undefined,
      helpDetail: (docType === 'แบบคำร้อง' && petitionStatus === 'ช่วยเหลือได้') ? (helpDetail || '').trim() : undefined,
      fileUrl: finalFileUrl || undefined,
      fileId: finalFileId || undefined,
      fileName: finalFileName || undefined
    };

    let originalSubject = '';
    if (editingDocId) {
      const originalDoc = docs.find(d => d.id === editingDocId);
      if (originalDoc) {
        originalSubject = originalDoc.subject || '';
      }
    }

    if (editingDocId) {
      // Edit
      const confirmed = await showConfirm(
        'ยืนยันการแก้ไขหนังสือราชการ',
        `คุณต้องการบันทึกการแก้ไขข้อมูลหนังสือราชการ เลขที่ "${safeDocNo.trim()}" ใช่หรือไม่?`,
        'edit'
      );
      if (!confirmed) return;

      const updated = docs.map(d => d.id === editingDocId ? updatedDoc : d);
      onSaveDocs(updated);
      showToast('แก้ไขข้อมูลหนังสือราชการเรียบร้อย', 'success');
    } else {
      // Add
      const confirmed = await showConfirm(
        'ยืนยันการขึ้นทะเบียนหนังสือราชการ',
        `คุณต้องการขึ้นทะเบียนหนังสือราชการ เรื่อง "${safeSubject.trim()}" ใช่หรือไม่?`,
        'save'
      );
      if (!confirmed) return;

      onSaveDocs([...docs, updatedDoc]);
      showToast('ขึ้นทะเบียนหนังสือราชการสำเร็จ', 'success');
    }

    // เพิ่มงานอัตโนมัติตามวันที่ที่เลือก กรณีเป็นแบบคำร้องที่เลือก รอสำรวจ
    if (docType === 'แบบคำร้อง' && petitionStatus === 'รอสำรวจ' && surveyDate) {
      if (onSaveTasks && tasks) {
        const searchSubject = originalSubject || safeSubject.trim();
        const existingTaskIndex = tasks.findIndex(t => (t.task || '') === searchSubject && t.type === 'ลงพื้นที่สำรวจ');
        
        if (existingTaskIndex !== -1) {
          const updatedTasks = [...tasks];
          updatedTasks[existingTaskIndex] = {
            ...updatedTasks[existingTaskIndex],
            date: surveyDate,
            originalDate: surveyDate,
            task: safeSubject.trim()
          };
          onSaveTasks(updatedTasks);
          showToast(`ปรับปรุงวันที่ออกสำรวจและภารกิจลงพื้นที่ในปฏิทินเป็นวันที่ ${surveyDate} แล้ว`, 'info');
        } else {
          const newTask: TaskItem = {
            id: 'task-auto-' + Date.now(),
            date: surveyDate,
            originalDate: surveyDate,
            task: safeSubject.trim(),
            status: 'ยังไม่ได้ทำ',
            type: 'ลงพื้นที่สำรวจ'
          };
          onSaveTasks([...tasks, newTask]);
          showToast(`เพิ่มภารกิจลงพื้นที่สำรวจเรื่อง "${safeSubject.trim()}" ในปฏิทินปฏิบัติงานวันที่ ${surveyDate} อัตโนมัติเรียบร้อย`, 'info');
        }
      }
    }

    setIsModalOpen(false);
  };

  const handleDeleteDoc = async (id: string) => {
    const docToDelete = docs.find(d => d.id === id);
    const label = docToDelete ? docToDelete.subject : 'รายการนี้';

    const hasDriveFile = Boolean(docToDelete?.fileId || docToDelete?.fileUrl);
    const confirmMessage = hasDriveFile
      ? `คุณต้องการลบหนังสือราชการเรื่อง "${label}" ออกจากระบบ และย้ายไฟล์แนบไปไว้ในถังขยะของ Google Drive ด้วยใช่หรือไม่?`
      : `คุณต้องการลบหนังสือราชการเรื่อง "${label}" ออกจากระบบควบคุมเอกสารใช่หรือไม่?`;

    const confirmed = await showConfirm(
      'ยืนยันการลบหนังสือราชการ',
      confirmMessage,
      'delete'
    );
    if (confirmed) {
      // หากมีไฟล์ใน Google Drive ให้สั่งย้ายไฟล์ไปไว้ในถังขยะตามที่ผู้ใช้ร้องขอ
      if (docToDelete?.fileId || docToDelete?.fileUrl) {
        try {
          showToast('กำลังย้ายเอกสารแนบไปไว้ในถังขยะ Google Drive...', 'info');
          const delRes = await deleteFileFromGoogleDriveDetailed(docToDelete.fileId || '', docToDelete.fileUrl);
          if (delRes.success) {
            if (delRes.isLocalOnly) {
              showToast('ไฟล์แนบนี้อยู่ในฐานข้อมูลระบบ (ไม่ได้อยู่บน Google Drive)', 'info');
            } else {
              showToast(delRes.message || 'ย้ายไฟล์แนบไปไว้ในถังขยะ Google Drive สำเร็จ', 'success');
            }
          } else if (delRes.isPermissionError) {
            showToast('คำเตือน: Google Apps Script ยังไม่ได้รับสิทธิ์ Google Drive (Access denied: DriveApp) จึงไม่สามารถย้ายไฟล์ลงถังขยะ Drive ได้', 'error');
          } else {
            showToast(`ไม่สามารถย้ายไฟล์ใน Google Drive ได้: ${delRes.error || 'ไฟล์อาจถูกลบไปแล้ว'}`, 'error');
          }
        } catch (driveErr) {
          console.error('Trash Drive file error:', driveErr);
          showToast('ไม่สามารถย้ายไฟล์ไปไว้ในถังขยะ Google Drive ได้', 'error');
        }
      }

      const filtered = docs.filter(d => d.id !== id);
      onSaveDocs(filtered);
      showToast('ลบรายการหนังสือราชการสำเร็จ', 'success');
    }
  };

  // กรองและเรียงลำดับหนังสือราชการ (ทีหลังอยู่ด้านบน บันทึกก่อนอยู่ด้านล่าง)
  const filteredDocs = useMemo(() => {
    const filtered = docs.filter(doc => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = String(doc.docNo || '').toLowerCase().includes(q) ||
                            String(doc.subject || '').toLowerCase().includes(q) ||
                            String(doc.agency || '').toLowerCase().includes(q) ||
                            String(doc.shelfNo || '').toLowerCase().includes(q) ||
                            (doc.receiveNo && String(doc.receiveNo).toLowerCase().includes(q));
      const matchesType = filterDocType === 'all' || doc.docType === filterDocType;
      return matchesSearch && matchesType;
    });

    return filtered.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA); // ใหม่กว่าอยู่บน เก่ากว่าอยู่ล่าง
      }
      return b.id.localeCompare(a.id); // หากวันที่เท่ากัน ให้รายการที่ลงทะเบียนทีหลังอยู่บน
    });
  }, [docs, searchQuery, filterDocType]);

  const getDocTypeIcon = (type: string) => {
    switch (type) {
      case 'หนังสือรับ': return <MailCheck className="w-5 h-5 text-amber-500" />;
      case 'หนังสือส่ง': return <MailQuestion className="w-5 h-5 text-orange-500" />;
      case 'ประกาศ': return <Newspaper className="w-5 h-5 text-amber-500" />;
      case 'คำสั่ง': return <FileText className="w-5 h-5 text-red-500" />;
      case 'แบบคำร้อง': return <FileText className="w-5 h-5 text-purple-500" />;
      default: return <FileText className="w-5 h-5 text-orange-500" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-purple-200 p-4 sm:p-6 md:p-8 shadow-xl relative overflow-hidden flex-grow flex flex-col w-full max-w-full min-w-0" id="official-docs-panel">
      {/* Top Gradient Glow Accent Bar */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-500 to-indigo-600" />
      
      {isModalOpen ? (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-6 md:p-8 space-y-6 animate-in fade-in duration-200 z-10 relative w-full max-w-full min-w-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100 shrink-0">
                <FolderArchive className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 break-words">
                  {editingDocId ? 'แก้ไขทะเบียนหนังสือราชการ' : 'ลงทะเบียนหนังสือใหม่'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5 break-words">กรอกรายละเอียดเพื่อลงทะเบียนหนังสือราชการเข้าสู่ระบบ</p>
              </div>
            </div>
            
          </div>

          <form onSubmit={handleDocSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">ประเภทหนังสือ <span className="text-red-500">*</span></label>
                <select
                  value={docType}
                  onChange={(e: any) => setDocType(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none bg-white font-medium text-gray-800"
                >
                  <option value="หนังสือรับ">หนังสือรับ</option>
                  <option value="หนังสือส่ง">หนังสือส่ง</option>
                  <option value="ประกาศ">หนังสือประกาศ</option>
                  <option value="คำสั่ง">คำสั่ง</option>
                  <option value="แบบคำร้อง">แบบคำร้อง</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">ลงวันที่เอกสาร <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none bg-white font-medium text-gray-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">เลขที่หนังสือราชการ <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={docNo}
                  onChange={(e) => setDocNo(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none bg-white font-medium text-gray-800"
                />
              </div>

              {docType === 'หนังสือรับ' && (
                <div className="animate-in fade-in">
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">เลขที่รับเอกสารสารบรรณ <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={receiveNo}
                    onChange={(e) => setReceiveNo(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none bg-white font-medium text-gray-800"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">เรื่อง / หัวข้อสาระสำคัญหนังสือ <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none bg-white font-medium text-gray-800"
              />
            </div>

            {docType === 'แบบคำร้อง' && (
              <div className="animate-in fade-in p-5 bg-amber-50 rounded-2xl border border-amber-200 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-amber-900 mb-2">สถานะคำร้อง <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(['รอสำรวจ', 'ช่วยเหลือได้', 'ช่วยเหลือไม่ได้'] as const).map(status => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setPetitionStatus(status)}
                        className={`p-2.5 rounded-xl text-sm font-bold transition-all border flex items-center justify-center gap-1.5 ${
                          petitionStatus === status
                            ? 'bg-amber-500 text-white border-amber-600 shadow-md'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'
                        }`}
                      >
                        {status === 'รอสำรวจ' && <HelpCircle className="w-4 h-4" />}
                        {status === 'ช่วยเหลือได้' && <CheckSquare className="w-4 h-4" />}
                        {status === 'ช่วยเหลือไม่ได้' && <AlertOctagon className="w-4 h-4" />}
                        <span>{status}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {petitionStatus === 'รอสำรวจ' && (
                  <div className="animate-in fade-in">
                    <label className="block text-sm font-bold text-amber-900 mb-1.5">วันที่ออกสำรวจ <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={surveyDate}
                      onChange={(e) => setSurveyDate(e.target.value)}
                      className="w-full p-2.5 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none bg-white font-medium text-amber-950"
                    />
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" /> ภารกิจจะถูกเพิ่มลงในรายการที่ต้องทำอัตโนมัติ
                    </p>
                  </div>
                )}

                {petitionStatus === 'ช่วยเหลือไม่ได้' && (
                  <div className="animate-in fade-in">
                    <label className="block text-sm font-bold text-amber-900 mb-1.5">เหตุผลที่ช่วยเหลือไม่ได้ <span className="text-red-500">*</span></label>
                    <textarea
                      value={noHelpReason}
                      onChange={(e) => setNoHelpReason(e.target.value)}
                      placeholder="โปรดระบุสาเหตุ..."
                      rows={2}
                      className="w-full p-2.5 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none bg-white font-medium"
                    />
                  </div>
                )}

                {petitionStatus === 'ช่วยเหลือได้' && (
                  <div className="animate-in fade-in">
                    <label className="block text-sm font-bold text-amber-900 mb-1.5">รายละเอียดการช่วยเหลือ <span className="text-red-500">*</span></label>
                    <textarea
                      value={helpDetail}
                      onChange={(e) => setHelpDetail(e.target.value)}
                      placeholder="โปรดระบุรายละเอียด..."
                      rows={2}
                      className="w-full p-2.5 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none bg-white font-medium"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">จากหน่วยงาน/ต้นทาง <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={agency}
                  onChange={(e) => setAgency(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none bg-white font-medium text-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">แฟ้มเก็บเลขที่ <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={shelfNo}
                  onChange={(e) => setShelfNo(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none bg-white font-medium text-gray-800"
                />
              </div>
            </div>

            {/* Google Drive Document Attachment Section */}
            <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-200 transition-all space-y-3">
              <div className="flex items-center justify-between">
                <label 
                  id="doc-attachment-label"
                  className="text-sm font-heading font-bold text-purple-950 flex items-center gap-2"
                >
                  <span className="p-1.5 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                    <Paperclip className="w-4 h-4" />
                  </span>
                  แนบไฟล์เอกสาร (บันทึกจัดเก็บบน Google Drive)
                </label>
                {fileUrl && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    บันทึกใน Google Drive แล้ว
                  </span>
                )}
              </div>
              
              {isUploading ? (
                <div className="p-4 bg-white rounded-xl border border-purple-200 flex items-center justify-center gap-3 shadow-xs animate-in fade-in">
                  <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                  <span className="text-xs sm:text-sm font-semibold text-purple-900">
                    กำลังอัปโหลดและบันทึกเอกสารลงใน Google Drive... กรุณารอสักครู่
                  </span>
                </div>
              ) : fileUrl ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white rounded-xl border border-purple-200 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <span 
                      id="doc-attachment-file-icon"
                      className="p-2.5 bg-purple-50 text-purple-700 rounded-xl border border-purple-100 flex-shrink-0 flex items-center justify-center shadow-xs"
                    >
                      <FileText className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-heading font-semibold text-gray-800 truncate" title={fileName || 'ไฟล์เอกสาร'}>
                        {fileName || 'ไฟล์เอกสารใน Google Drive'}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <button 
                          type="button"
                          onClick={() => openDocumentFile(fileUrl, fileName)}
                          className="text-xs text-purple-600 hover:text-purple-800 hover:underline inline-flex items-center gap-1 font-medium cursor-pointer text-left"
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" /> {fileUrl.includes('drive.google.com') ? 'เปิดดูใน Google Drive' : 'เปิดดูไฟล์แนบ'}
                        </button>
                        <span className="text-gray-300 text-xs">•</span>
                        <span className="text-[11px] text-gray-500 font-sans">โฟลเดอร์: หนังสือราชการ</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveAttachedFile}
                    className="self-end sm:self-center px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition border border-red-200 flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    title="ย้ายเอกสารไปไว้ในถังขยะ Google Drive"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> ย้ายไปถังขยะ Drive
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="doc-file-upload"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,image/*"
                    className="sr-only"
                    onChange={handleFileSelectAndUpload}
                  />
                  <label
                    htmlFor="doc-file-upload"
                    className="flex flex-col sm:flex-row items-center justify-center gap-3 p-4 bg-white hover:bg-purple-50/80 border-2 border-dashed border-purple-200 hover:border-purple-400 rounded-2xl cursor-pointer transition-all duration-200 text-center sm:text-left group shadow-xs active:scale-[0.99]"
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-100 group-hover:bg-purple-200 text-purple-700 flex items-center justify-center shrink-0 transition-colors shadow-xs">
                      <UploadCloud className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-heading font-bold text-purple-950 group-hover:text-purple-700 transition-colors">
                        แตะที่นี่เพื่อเลือกไฟล์และบันทึกลงใน Google Drive
                      </div>
                      <div className="text-[11px] text-gray-500 font-sans mt-0.5">
                        รองรับ PDF, Word, Excel หรือรูปภาพ (ระบบจะจัดเก็บไฟล์ลงโฟลเดอร์ &quot;หนังสือราชการ&quot; บน Google Drive ทันที)
                      </div>
                    </div>
                    <span className="px-3 py-1.5 bg-purple-600 group-hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 transition-colors">
                      เลือกไฟล์
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">หมายเหตุเพิ่มเติม</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none bg-white font-medium text-gray-800"
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isUploading}
                className="px-5 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 font-semibold text-gray-600 transition-colors cursor-pointer text-sm disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDocSubmit}
                disabled={isUploading}
                className="px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 flex items-center justify-center gap-2 font-bold shadow-md shadow-purple-500/20 transition-all cursor-pointer text-sm disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> กำลังอัปโหลดลง Drive...
                  </>
                ) : (
                  editingDocId ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* Background visual graphics */}
          <div className="absolute -top-10 -right-10 w-80 h-80 bg-gradient-to-br from-purple-500/10 to-indigo-500/5 rounded-full blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-gradient-to-tr from-indigo-500/10 to-purple-400/5 rounded-full blur-3xl pointer-events-none" />
          
          {/* Title block */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-purple-100 pb-6 mb-6 relative z-10 w-full max-w-full min-w-0">
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
              <div className="p-3 sm:p-4 bg-gradient-to-tr from-purple-500 to-indigo-600 text-white rounded-2xl shadow-lg shadow-purple-500/30 shrink-0">
                <FolderArchive className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h2 className="font-heading text-lg sm:text-xl md:text-2xl font-black text-purple-950 tracking-tight break-words">ทะเบียนหนังสือราชการ</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5 font-medium break-words">ระบบงานสารบรรณ รับ-ส่ง และจัดเก็บเอกสาร</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleExport}
                className="flex-1 sm:flex-none justify-center items-center space-x-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border-2 border-purple-200 text-purple-800 hover:text-white hover:bg-purple-500 hover:border-purple-500 text-xs sm:text-sm font-heading font-extrabold transition-all duration-200 shadow-xs active:scale-95 cursor-pointer flex"
                title="ส่งออกเป็น Excel"
              >
                <Download className="w-4 h-4" />
                <span>Excel</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6 relative z-10 w-full max-w-full min-w-0">
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-grow min-w-0">
              <div className="relative w-full md:w-96 min-w-0">
                <Search className="absolute left-3 top-3 w-5 h-5 text-purple-300" />
                <input
                  type="text"
                  placeholder="ค้นหา"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-purple-50/50 border-2 border-purple-100 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-400/20 transition-all font-medium text-purple-900 placeholder-purple-400"
                />
              </div>
              
              <div className="w-full sm:w-48 shrink-0">
                <select
                  value={filterDocType}
                  onChange={(e) => setFilterDocType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-purple-50/50 border-2 border-purple-100 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-400/20 font-medium text-purple-800 cursor-pointer appearance-none"
                >
                  <option value="all">ทุกประเภทเอกสาร</option>
                  <option value="หนังสือรับ">หนังสือรับ</option>
                  <option value="หนังสือส่ง">หนังสือส่ง</option>
                  <option value="ประกาศ">หนังสือประกาศ</option>
                  <option value="คำสั่ง">คำสั่ง</option>
                  <option value="แบบคำร้อง">แบบคำร้อง</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleOpenAddDoc}
              className="w-full md:w-auto px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/30 flex items-center justify-center gap-2 font-heading font-extrabold transition-all duration-200 active:scale-95 shrink-0 cursor-pointer"
            >
              <Plus className="w-5 h-5" /> ลงทะเบียนหนังสือ
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-purple-100 overflow-x-auto shadow-sm relative z-10 custom-scrollbar flex-grow w-full max-w-full min-w-0">
            <table className="w-full text-sm text-left whitespace-nowrap min-w-[750px]">
              <thead className="bg-purple-50/80 text-purple-900 text-xs uppercase font-heading font-black tracking-wider">
                <tr>
                  <th className="p-4 rounded-tl-2xl">ประเภท</th>
                  <th className="p-4">วันที่/เลขที่</th>
                  <th className="p-4">เรื่อง</th>
                  <th className="p-4">ต้นทาง</th>
                  <th className="p-4">การจัดเก็บ</th>
                  <th className="p-4 text-center">ไฟล์แนบ (Drive)</th>
                  <th className="p-4 text-center rounded-tr-2xl">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50 font-sans">
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-purple-400 font-medium bg-purple-50/30">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FolderArchive className="w-12 h-12 text-purple-200 mb-2" />
                        ยังไม่มีข้อมูลหนังสือราชการ
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map(doc => (
                    <tr 
                      key={doc.id} 
                      onClick={() => setViewingDoc(doc)}
                      className="hover:bg-purple-50/70 transition-colors cursor-pointer group"
                      title="คลิกเพื่อดูรายละเอียดเอกสาร"
                    >
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <div className="p-2 rounded-xl bg-white shadow-xs border border-purple-100 flex-shrink-0 group-hover:border-purple-300 group-hover:bg-purple-50/50 transition-colors">
                            {getDocTypeIcon(doc.docType)}
                          </div>
                          <div>
                            <span className="font-bold text-gray-800 text-xs block group-hover:text-purple-700 transition-colors">{doc.docType}</span>
                            {doc.docType === 'แบบคำร้อง' && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 inline-block ${
                                doc.petitionStatus === 'รอสำรวจ' ? 'bg-amber-100 text-amber-700' :
                                doc.petitionStatus === 'ช่วยเหลือได้' ? 'bg-emerald-100 text-emerald-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {doc.petitionStatus || 'รอสำรวจ'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-mono text-xs font-semibold text-gray-900">{doc.date}</div>
                        <div className="font-mono text-[11px] text-gray-500">{doc.docNo}</div>
                        {doc.docType === 'หนังสือรับ' && doc.receiveNo && (
                          <div className="font-mono text-[10px] text-orange-500 font-bold mt-0.5">รับ: {doc.receiveNo}</div>
                        )}
                      </td>
                      <td className="p-3 max-w-[250px] whitespace-normal">
                        <div className="font-bold text-gray-800 text-sm line-clamp-2 leading-snug group-hover:text-purple-900 transition-colors">{doc.subject}</div>
                        {doc.note && (
                          <div className="text-[11px] text-gray-500 mt-1 flex items-start gap-1">
                            <span className="font-bold text-gray-400">หมายเหตุ:</span> 
                            <span className="line-clamp-1">{doc.note}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="text-xs text-gray-700 max-w-[150px] truncate" title={doc.agency}>{doc.agency}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded-md bg-orange-50 border border-orange-100 text-orange-800 font-mono font-bold text-[10px]">
                          📂 {doc.shelfNo}
                        </span>
                      </td>
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {doc.fileUrl ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDocumentFile(doc.fileUrl!, doc.fileName);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs transition border border-purple-200 shadow-xs max-w-[150px] truncate cursor-pointer"
                            title={doc.fileName || 'เปิดดูไฟล์'}
                          >
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{doc.fileName || (doc.fileUrl.includes('drive.google.com') ? 'ดูไฟล์ Drive' : 'ดูไฟล์แนบ')}</span>
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 font-mono">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingDoc(doc);
                            }}
                            className="p-1.5 rounded text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition cursor-pointer"
                            title="ดูรายละเอียดเอกสาร"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditDoc(doc);
                            }}
                            className="p-1.5 rounded text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition cursor-pointer"
                            title="แก้ไขรายละเอียด"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDoc(doc.id);
                            }}
                            className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                            title="ลบออก"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Document Detail Modal */}
      {viewingDoc && createPortal(
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
          onClick={() => setViewingDoc(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-purple-100 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150 relative font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Accent Bar */}
            <div className="h-2 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600" />
            
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 flex items-start justify-between gap-4 bg-gray-50/60">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100/80 text-purple-700 rounded-2xl border border-purple-200/60 shadow-xs">
                  {getDocTypeIcon(viewingDoc.docType)}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                      {viewingDoc.docType}
                    </span>
                    {viewingDoc.docType === 'แบบคำร้อง' && viewingDoc.petitionStatus && (
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        viewingDoc.petitionStatus === 'รอสำรวจ' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        viewingDoc.petitionStatus === 'ช่วยเหลือได้' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {viewingDoc.petitionStatus}
                      </span>
                    )}
                  </div>
                  <h3 className="font-heading font-black text-lg text-gray-900 mt-1">
                    รายละเอียดหนังสือราชการ
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingDoc(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                title="ปิด"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-sm">
              {/* Subject Card */}
              <div className="bg-purple-50/70 border border-purple-200/70 rounded-2xl p-4 sm:p-5 shadow-xs">
                <div className="text-xs font-bold text-purple-800 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-purple-600" />
                  เรื่อง
                </div>
                <div className="text-base sm:text-lg font-bold text-gray-900 leading-relaxed break-words">
                  {viewingDoc.subject}
                </div>
              </div>

              {/* Core Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                  <span className="text-xs font-medium text-gray-500 block mb-0.5">เลขที่หนังสือ</span>
                  <span className="font-mono font-bold text-gray-900 text-sm sm:text-base">{viewingDoc.docNo || '-'}</span>
                </div>

                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                  <span className="text-xs font-medium text-gray-500 block mb-0.5">วันที่ลงทะเบียน</span>
                  <span className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {viewingDoc.date || '-'}
                  </span>
                </div>

                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                  <span className="text-xs font-medium text-gray-500 block mb-0.5">หน่วยงาน / จาก / ถึง</span>
                  <span className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="break-words">{viewingDoc.agency || '-'}</span>
                  </span>
                </div>

                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                  <span className="text-xs font-medium text-gray-500 block mb-0.5">ตู้ / แฟ้มจัดเก็บ</span>
                  <span className="font-mono font-bold text-orange-700 text-sm">
                    📂 {viewingDoc.shelfNo || '-'}
                  </span>
                </div>

                {viewingDoc.docType === 'หนังสือรับ' && viewingDoc.receiveNo && (
                  <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 sm:col-span-2">
                    <span className="text-xs font-medium text-gray-500 block mb-0.5">เลขที่รับเอกสาร</span>
                    <span className="font-mono font-bold text-orange-600 text-sm">{viewingDoc.receiveNo}</span>
                  </div>
                )}
              </div>

              {/* Petition Details */}
              {viewingDoc.docType === 'แบบคำร้อง' && (
                <div className="border border-amber-200/80 bg-amber-50/40 rounded-2xl p-4 sm:p-5 space-y-3">
                  <h4 className="font-bold text-amber-900 text-xs sm:text-sm flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-600" />
                    ข้อมูลความคืบหน้าแบบคำร้อง
                  </h4>
                  <div className="space-y-2 text-xs sm:text-sm">
                    {viewingDoc.surveyDate && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 font-medium">วันที่นัดหมายสำรวจ:</span>
                        <span className="font-bold text-gray-900">{viewingDoc.surveyDate}</span>
                      </div>
                    )}
                    {viewingDoc.helpDetail && (
                      <div>
                        <span className="text-emerald-700 font-bold block mb-1">รายละเอียดการช่วยเหลือ:</span>
                        <div className="bg-white p-3 rounded-xl border border-emerald-200 text-gray-800 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                          {viewingDoc.helpDetail}
                        </div>
                      </div>
                    )}
                    {viewingDoc.noHelpReason && (
                      <div>
                        <span className="text-red-700 font-bold block mb-1">เหตุผลที่ไม่สามารถช่วยเหลือได้:</span>
                        <div className="bg-white p-3 rounded-xl border border-red-200 text-gray-800 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                          {viewingDoc.noHelpReason}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Attached File */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <span className="text-xs font-bold text-gray-600 block mb-2 flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-purple-600" />
                  ไฟล์แนบเอกสาร
                </span>
                {viewingDoc.fileUrl ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-purple-200/70 shadow-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-gray-800 truncate max-w-[280px]" title={viewingDoc.fileName || 'ไฟล์เอกสาร'}>
                        {viewingDoc.fileName || 'ไฟล์เอกสารแนบ'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => openDocumentFile(viewingDoc.fileUrl!, viewingDoc.fileName)}
                      className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {viewingDoc.fileUrl.includes('drive.google.com') ? 'เปิดดูใน Google Drive' : 'เปิดดู / ดาวน์โหลดไฟล์'}
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic">ไม่มีไฟล์แนบในเอกสารนี้</span>
                )}
              </div>

              {/* Note */}
              {viewingDoc.note && (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <span className="text-xs font-bold text-gray-600 block mb-1">หมายเหตุ</span>
                  <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {viewingDoc.note}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  const docToEdit = viewingDoc;
                  setViewingDoc(null);
                  handleOpenEditDoc(docToEdit);
                }}
                className="px-4 py-2 bg-white hover:bg-orange-50 text-orange-700 border border-orange-200 font-bold text-xs sm:text-sm rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Edit3 className="w-4 h-4" />
                แก้ไขข้อมูล
              </button>

              <button
                type="button"
                onClick={() => setViewingDoc(null)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* PDF Report Print/Export Modal */}
      {isPdfModalOpen && (
        <OfficialDocsPdfModal
          docs={filteredDocs}
          allDocs={docs}
          currentFilterType={filterDocType}
          searchQuery={searchQuery}
          onClose={() => setIsPdfModalOpen(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
}
