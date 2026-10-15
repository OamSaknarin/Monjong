import React, { useState, useRef, useEffect } from 'react';
import { Cloud, Upload, Trash2, Download, FileText, File, Clock, Search, ShieldAlert, FileImage, FileCode, CheckCircle2, X, Pencil, Printer, FileDown } from 'lucide-react';
import CloudStoragePdfModal from './CloudStoragePdfModal';
import { exportToExcel } from '../utils/export';
import { CloudFile, User } from '../types';
import { getGasUrl, isGoogleSheetsUrl, uploadFileToGas, deleteFileFromGas } from '../utils/gasClient';
import { deleteFileFromGoogleDriveDetailed } from '../utils/googleDriveClient';
import { getThaiNow } from '../utils/dateUtils';
import { motion } from 'motion/react';

interface CloudStorageProps {
  files: CloudFile[];
  onSaveFiles: (files: CloudFile[]) => void;
  currentUser: User;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  showConfirm: (title: string, message: string, type: 'save' | 'edit' | 'delete' | 'default') => Promise<boolean>;
}

export default function CloudStorage({ files, onSaveFiles, currentUser, showToast, showConfirm }: CloudStorageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-cleanup: Filter out files older than 7 days
  useEffect(() => {
    const now = getThaiNow();
    const validFiles = files.filter(file => {
      const expiryDate = new Date(file.expiryDate);
      return expiryDate > now;
    });

    if (validFiles.length !== files.length) {
      console.log('Cleaning up expired files...');
      onSaveFiles(validFiles);
    }
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    setIsUploading(true);
    
    const newFiles: CloudFile[] = [];
    const now = getThaiNow();
    const expiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    const gasUrl = getGasUrl();
    const isRealGasConnected = gasUrl && !isGoogleSheetsUrl(gasUrl);

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      try {
        // อ่านไฟล์เป็น base64
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });

        let finalDataUrl = '';
        let fileIdToUse = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        if (isRealGasConnected) {
          showToast(`กำลังอัปโหลด "${file.name}" ไปยัง Google Drive...`, 'info');
          const uploadRes = await uploadFileToGas(file.name, file.type || 'application/octet-stream', base64Data);
          if (uploadRes.success && uploadRes.url) {
            finalDataUrl = uploadRes.url;
            if (uploadRes.fileId) {
              fileIdToUse = uploadRes.fileId;
            }
          } else {
            console.warn('Google Drive upload via GAS returned error:', uploadRes.error);
            const errStr = uploadRes.error || '';
            const isPerm = errStr.includes('Access denied') || errStr.includes('DriveApp');
            if (file.size < 4 * 1024 * 1024) {
              finalDataUrl = base64Data;
              if (isPerm) {
                showToast(`⚠️ บันทึกไฟล์ "${file.name}" ในระบบแล้ว แต่ยังไม่เข้า Drive เนื่องจากสิทธิ์ DriveApp ยังไม่อนุมัติใน Apps Script`, 'error');
              } else {
                showToast(`บันทึกไฟล์ "${file.name}" ในระบบเรียบร้อย (เปิดดูและดาวน์โหลดได้ปกติ)`, 'info');
              }
            } else {
              throw new Error(uploadRes.error || 'ไม่สามารถบันทึกไฟล์ในไดรฟ์ได้');
            }
          }
        } else {
          // โหมด Sandbox / ลิงก์ Sheet โดยตรง -> บันทึก base64 ในเครื่อง (ขนาดไฟล์ < 1.5MB)
          if (file.size < 1.5 * 1024 * 1024) {
            finalDataUrl = base64Data;
          } else {
            finalDataUrl = 'mock-url-large-file';
            showToast(`ไฟล์ "${file.name}" มีขนาดใหญ่เกิน 1.5MB จึงบันทึกเป็นชื่อจำลองสำหรับทดสอบ (เชื่อมสคริปต์เพื่ออัปโหลดไดรฟ์จริงได้)`, 'info');
          }
        }

        const newFile: CloudFile = {
          id: fileIdToUse,
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileSize: file.size,
          uploadDate: now.toISOString(),
          expiryDate: expiry.toISOString(),
          dataUrl: finalDataUrl,
          uploader: currentUser.name
        };

        newFiles.push(newFile);
      } catch (err) {
        console.error('File upload error:', err);
        showToast(`อัปโหลดไฟล์ "${file.name}" ไม่สำเร็จ: ${String(err)}`, 'error');
      }
    }

    if (newFiles.length > 0) {
      onSaveFiles([...files, ...newFiles]);
      showToast(`อัปโหลด ${newFiles.length} ไฟล์สำเร็จ (ไฟล์จัดเก็บชั่วคราว 7 วัน)`, 'success');
    }
    
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const deleteFile = async (id: string) => {
    const targetFile = files.find(f => f.id === id);
    const label = targetFile ? targetFile.fileName : 'ไฟล์นี้';

    const confirmed = await showConfirm(
      'ยืนยันการลบไฟล์',
      `คุณต้องการลบไฟล์ "${label}" ออกจากระบบคลาวด์ใช่หรือไม่?`,
      'delete'
    );

    if (confirmed) {
      const updated = files.filter(f => f.id !== id);
      
      // พยายามย้ายไฟล์ไปไว้ในถังขยะ Google Drive ด้วย (ถ้ามีไฟล์บนไดรฟ์จริง)
      if (targetFile && targetFile.dataUrl && targetFile.dataUrl.startsWith('http')) {
        try {
          const delRes = await deleteFileFromGoogleDriveDetailed(id, targetFile.dataUrl);
          if (!delRes.success) {
            const isPerm = delRes.isPermissionError;
            const forceDelete = await showConfirm(
              isPerm ? 'สิทธิ์ Google Drive ยังไม่อนุมัติ (Access denied)' : 'ไม่สามารถย้ายไฟล์ในไดรฟ์ไปถังขยะ',
              isPerm 
                ? 'Google Apps Script ยังไม่ได้รับสิทธิ์เข้าถึง Google Drive (Access denied: DriveApp)\n\n' +
                  'วิธีแก้ไข:\n' +
                  '1. เปิด Apps Script ใน Google Sheet ของคุณ\n' +
                  '2. เลือกฟังก์ชัน "authorizeGoogleDrive" ที่แถบด้านบนแล้วกดปุ่ม "เรียกใช้" (Run ▶️)\n' +
                  '3. กดอนุญาตสิทธิ์ (Allow) ให้เรียบร้อย\n\n' +
                  'ต้องการลบรายการนี้ออกจากระบบไปก่อนหรือไม่?'
                : `ไม่สามารถย้ายไฟล์ใน Google Drive ไปไว้ในถังขยะได้: ${delRes.error || 'ไฟล์อาจถูกลบไปแล้ว'}\n\nต้องการลบเฉพาะข้อมูลรายการออกจากระบบหรือไม่?`,
              'delete'
            );
            if (!forceDelete) {
              return;
            }
          }
        } catch (e) {
          console.warn('Could not move to trash from Drive, but proceeding:', e);
          const forceDelete = await showConfirm(
            'ข้อผิดพลาดในการเชื่อมต่อ Apps Script',
            'เกิดข้อผิดพลาดในการเชื่อมต่อกับสคริปต์ Google Apps Script\n\nต้องการบังคับลบเฉพาะข้อมูลรายการออกจากระบบหรือไม่?',
            'delete'
          );
          if (!forceDelete) {
            return;
          }
        }
      }
      
      onSaveFiles(updated);
      showToast('นำรายการไฟล์ออกจากระบบเรียบร้อยแล้ว', 'success');
    }
  };

  const startEdit = (file: CloudFile) => {
    setEditingFileId(file.id);
    setNewFileName(file.fileName);
  };

  const saveEdit = async () => {
    if (!newFileName.trim()) return;

    const confirmed = await showConfirm(
      'ยืนยันการเปลี่ยนชื่อไฟล์',
      `คุณต้องการเปลี่ยนชื่อไฟล์เป็น "${newFileName.trim()}" ใช่หรือไม่?`,
      'edit'
    );
    if (!confirmed) return;

    const updated = files.map(f => f.id === editingFileId ? { ...f, fileName: newFileName.trim() } : f);
    onSaveFiles(updated);
    setEditingFileId(null);
    showToast('แก้ไขชื่อไฟล์สำเร็จ', 'success');
  };

  const downloadFile = (file: CloudFile) => {
    if (file.dataUrl === 'mock-url-large-file') {
      showToast('ไฟล์ขนาดใหญ่ถูกจำลองการจัดเก็บ ไม่สามารถดาวน์โหลดข้อมูลจริงได้ในรุ่นจำลอง Sandbox นี้', 'info');
      return;
    }

    if (file.dataUrl.startsWith('http')) {
      // ดึง Google Drive File ID จาก URL
      const match = file.dataUrl.match(/[\w-]{25,}/);
      if (match) {
        const fileId = match[0];
        // แปลงเป็นลิงก์ดาวน์โหลดโดยตรง (Direct Download Link)
        const downloadUrl = `https://docs.google.com/uc?export=download&id=${fileId}`;
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('กำลังดาวน์โหลดไฟล์โดยตรงจาก Google Drive...', 'success');
        return;
      }
    }

    const link = document.createElement('a');
    link.href = file.dataUrl;
    link.download = file.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <FileImage className="w-8 h-8 text-amber-500" />;

    if (type.includes('pdf')) return <FileText className="w-8 h-8 text-rose-500" />;
    if (type.includes('word') || type.includes('text')) return <FileText className="w-8 h-8 text-orange-500" />;
    if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) return <FileText className="w-8 h-8 text-emerald-600" />;
    if (type.includes('zip') || type.includes('rar')) return <File className="w-8 h-8 text-amber-600" />;
    if (type.includes('javascript') || type.includes('html') || type.includes('css') || type.includes('json')) return <FileCode className="w-8 h-8 text-purple-500" />;
    return <File className="w-8 h-8 text-gray-400" />;
  };

  const filteredFiles = files.filter(f => 
    f.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.uploader.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

  const getDaysLeft = (expiry: string) => {
    const diff = new Date(expiry).getTime() - getThaiNow().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const handleExportExcel = () => {
    const dataToExport = filteredFiles.map(f => ({
      'ชื่อไฟล์': f.fileName,
      'ขนาดไฟล์': formatSize(f.fileSize),
      'ประเภท': f.fileType,
      'ผู้อัปโหลด': f.uploader,
      'วันที่อัปโหลด': f.uploadDate ? new Date(f.uploadDate).toLocaleString('th-TH') : '-',
      'หมดอายุ': f.expiryDate ? new Date(f.expiryDate).toLocaleString('th-TH') : '-'
    }));
    exportToExcel(dataToExport, 'ไฟล์คลาวด์', 'รายการไฟล์');
    showToast('ส่งออกไฟล์ Excel เรียบร้อย', 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in flex-grow flex flex-col w-full max-w-full min-w-0" id="cloud-storage-container">
      
      {/* Header & Upload Section */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-cyan-200 p-4 sm:p-6 md:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 w-full max-w-full min-w-0">
        {/* Top Gradient Glow Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-cyan-500 to-sky-600" />
        {/* Background visual graphics */}
        <div className="absolute -top-10 -right-10 w-80 h-80 bg-gradient-to-br from-cyan-500/10 to-sky-500/5 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-gradient-to-tr from-sky-500/10 to-cyan-400/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center space-x-4 relative z-10">
          <div className="p-4 bg-gradient-to-tr from-cyan-500 to-sky-600 text-white rounded-2xl shadow-lg shadow-cyan-500/30">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-cyan-950 tracking-tight font-heading">ระบบคลาวด์จัดเก็บไฟล์</h2>
            <p className="text-xs sm:text-sm text-cyan-600 font-bold flex items-center gap-1.5 mt-0.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              ไฟล์จะถูกลบอัตโนมัติภายใน 7 วัน
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 relative z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหา"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 outline-none w-full sm:w-64 transition-all"
            />
          </div>
          
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl border border-cyan-200 bg-white hover:bg-cyan-50 text-cyan-800 text-xs font-heading font-extrabold transition-all duration-200 shadow-xs active:scale-95 cursor-pointer shrink-0"
              title="ส่งออกรายการไฟล์ลง Excel"
            >
              <FileDown className="w-4 h-4 text-cyan-600" />
              <span>excel</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center justify-center space-x-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-300 text-white px-5 py-2.5 rounded-xl text-xs font-heading font-bold shadow-md shadow-cyan-500/10 transition active:scale-95 shrink-0"
            >
              {isUploading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>อัปโหลดไฟล์ด่วน</span>
            </button>
          </div>
        </div>
      </div>

      {/* Files List */}
      <div className="bg-white rounded-3xl shadow-sm border border-orange-100 overflow-hidden flex-grow flex flex-col">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 font-heading">รายการไฟล์ในคลาวด์</h3>
          <span className="text-[10px] px-2 py-1 bg-white border border-gray-200 rounded-lg text-gray-500 font-mono">
            {filteredFiles.length} RESULTS
          </span>
        </div>

        {filteredFiles.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
              <Cloud className="w-8 h-8 text-gray-300" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-400 font-heading">ยังไม่มีไฟล์ในระบบคลาวด์</p>
              <p className="text-xs text-gray-400">อัปโหลดไฟล์แรกของคุณเพื่อเริ่มแชร์งาน</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto w-full max-w-full min-w-0 custom-scrollbar">
            <table className="w-full text-left min-w-[650px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">ไฟล์</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">ขนาด / ประเภท</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">ผู้อัปโหลด</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">เหลือเวลาจัดเก็บ</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredFiles.map((file) => {
                  const daysLeft = getDaysLeft(file.expiryDate);
                  const isEditing = editingFileId === file.id;

                  return (
                    <tr key={file.id} className="hover:bg-orange-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="shrink-0 p-2 bg-gray-50 rounded-xl group-hover:bg-white transition-colors border border-transparent group-hover:border-orange-100">
                            {getFileIcon(file.fileType)}
                          </div>
                          <div>
                            {isEditing ? (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={newFileName}
                                  onChange={(e) => setNewFileName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEdit();
                                    if (e.key === 'Escape') setEditingFileId(null);
                                  }}
                                  className="text-xs px-2 py-1 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs border border-orange-300 rounded focus:ring-1 focus:ring-orange-500 outline-none w-full max-w-[150px] transition-all"
                                  autoFocus
                                />
                                <button 
                                  onClick={saveEdit}
                                  className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={() => setEditingFileId(null)}
                                  className="p-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <p className="text-xs font-bold text-gray-900 font-heading truncate max-w-[200px]">{file.fileName}</p>
                            )}
                            <p className="text-[10px] text-gray-400 mt-0.5">อัปโหลด: {new Date(file.uploadDate).toLocaleString('th-TH')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-mono font-bold">
                            {formatSize(file.fileSize)}
                          </span>
                          <p className="text-[9px] text-gray-400 truncate max-w-[120px]">{file.fileType}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-700 border border-orange-200">
                            {file.uploader.charAt(0)}
                          </div>
                          <span className="text-[10px] font-bold text-gray-600">{file.uploader}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1.5">
                          <Clock className={`w-3.5 h-3.5 ${daysLeft <= 1 ? 'text-rose-500 animate-pulse' : 'text-amber-500'}`} />
                          <span className={`text-[10px] font-bold ${daysLeft <= 1 ? 'text-rose-600' : 'text-amber-600'}`}>
                            {daysLeft} วัน
                          </span>
                        </div>
                        <div className="w-16 h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${daysLeft <= 1 ? 'bg-rose-500' : 'bg-amber-500'}`} 
                            style={{ width: `${(daysLeft / 7) * 100}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2 opacity-100">
                          <button 
                            onClick={() => downloadFile(file)}
                            className="p-2 bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white rounded-xl transition-all shadow-sm"
                            title="ดาวน์โหลด"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => startEdit(file)}
                            className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white rounded-xl transition-all shadow-sm"
                            title="แก้ไขชื่อไฟล์"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deleteFile(file.id)}
                            className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all shadow-sm"
                            title="ลบไฟล์"
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
        )}
      </div>

      {/* Info Card */}
      <div className="bg-orange-50 border border-orange-100 p-5 rounded-3xl flex items-start space-x-4">
        <div className="shrink-0 p-2 bg-orange-100 text-orange-600 rounded-xl mt-1">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-orange-950 font-heading">ข้อควรระวังการใช้งานระบบคลาวด์</h4>
          <p className="text-xs text-orange-800 leading-relaxed">
            ระบบคลาวด์นี้ออกแบบมาเพื่อรับ-ส่งไฟล์งานด่วนภายในหน่วยงาน ไฟล์ทั้งหมดจะถูกลบโดยอัตโนมัติภายใน 7 วันนับจากวันที่อัปโหลด 
            กรุณาสำรองไฟล์งานสำคัญลงในเครื่องคอมพิวเตอร์หรือพื้นที่จัดเก็บถาวรอื่น ๆ หากต้องการใช้งานในระยะยาว
          </p>
        </div>
      </div>

      {/* Cloud Files PDF Report Modal */}
      {isPdfModalOpen && (
        <CloudStoragePdfModal
          files={filteredFiles}
          allFiles={files}
          onClose={() => setIsPdfModalOpen(false)}
          showToast={showToast}
        />
      )}

    </div>
  );
}
