import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BorrowRecord, Equipment } from '../types';
import { Printer, Download, X, FileText, ZoomIn, ZoomOut, ChevronUp, ChevronDown, Layers, CheckCircle2 } from 'lucide-react';
import logo from '../assets/logo.png';
import { printElement, downloadPdfFromContainer } from '../utils/pdfExport';

interface BorrowSlipPdfModalProps {
  record: BorrowRecord;
  allRecords?: BorrowRecord[];
  equipment: Equipment[];
  onClose: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

// Helper for Full Thai Date Format (เช่น 26 กรกฎาคม 2569)
const formatThaiFullDate = (dateStr: string) => {
  if (!dateStr) return '-';
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        const [y, m, d] = parts;
        const dayNum = parseInt(d, 10);
        const monthNum = parseInt(m, 10) - 1;
        const yearBE = Number(y) < 2500 ? Number(y) + 543 : Number(y);
        if (monthNum >= 0 && monthNum < 12) {
          return `${dayNum} ${THAI_MONTHS[monthNum]} ${yearBE}`;
        }
      } else if (parts[2].length === 4) {
        // DD-MM-YYYY
        const [d, m, y] = parts;
        const dayNum = parseInt(d, 10);
        const monthNum = parseInt(m, 10) - 1;
        const yearBE = Number(y) < 2500 ? Number(y) + 543 : Number(y);
        if (monthNum >= 0 && monthNum < 12) {
          return `${dayNum} ${THAI_MONTHS[monthNum]} ${yearBE}`;
        }
      }
    }
  }
  return dateStr;
};

// Helper for Short Thai Date (วัน/เดือน/ปี พ.ศ.)
const formatThaiDMY = (dateStr: string) => {
  if (!dateStr) return '-';
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        const [y, m, d] = parts;
        const yearBE = Number(y) < 2500 ? Number(y) + 543 : Number(y);
        return `${d}/${m}/${yearBE}`;
      } else if (parts[2].length === 4) {
        const [d, m, y] = parts;
        const yearBE = Number(y) < 2500 ? Number(y) + 543 : Number(y);
        return `${d}/${m}/${yearBE}`;
      }
    }
  }
  return dateStr;
};

// Helper to hash string to clean 6-digit numeric string
const getNumericHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) % 1000000;
  }
  return String(Math.abs(hash)).padStart(6, '0');
};

export default function BorrowSlipPdfModal({
  record,
  allRecords = [],
  equipment,
  onClose,
  showToast
}: BorrowSlipPdfModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // ๔ ส่วนระบุเพิ่มเติมสำหรับการยืมคืน (แก้ไขชื่อ ตำแหน่ง และข้อความได้)
  const [headOfOfficeComment, setHeadOfOfficeComment] = useState(record.headOfOfficeComment || 'เห็นควรพิจารณาอนุมัติ');
  const [headOfOfficeName, setHeadOfOfficeName] = useState(record.headOfOfficeName || '');
  const [headOfOfficePosition, setHeadOfOfficePosition] = useState(record.headOfOfficePosition || '');

  const [mayorOrder, setMayorOrder] = useState(record.mayorOrder || 'อนุมัติ');
  const [mayorName, setMayorName] = useState(record.mayorName || '');
  const [mayorPosition, setMayorPosition] = useState(record.mayorPosition || '');

  const [handoverOfficerName, setHandoverOfficerName] = useState(record.handoverOfficerName || record.certifier || '');
  const [handoverOfficerPosition, setHandoverOfficerPosition] = useState(record.handoverOfficerPosition || record.certifierPosition || '');

  const [receivingOfficerName, setReceivingOfficerName] = useState(record.receivingOfficerName || record.handoverOfficerName || '');
  const [receivingOfficerPosition, setReceivingOfficerPosition] = useState(record.receivingOfficerPosition || record.handoverOfficerPosition || '');

  const [certifierName] = useState(record.certifier || '');
  const [certifierPosition] = useState(record.certifierPosition || '');

  // Sync handover and receiving officers as they are the same person
  const handleHandoverOfficerNameChange = (val: string) => {
    setHandoverOfficerName(val);
    setReceivingOfficerName(val);
  };
  const handleHandoverOfficerPositionChange = (val: string) => {
    setHandoverOfficerPosition(val);
    setReceivingOfficerPosition(val);
  };
  const handleReceivingOfficerNameChange = (val: string) => {
    setReceivingOfficerName(val);
    setHandoverOfficerName(val);
  };
  const handleReceivingOfficerPositionChange = (val: string) => {
    setReceivingOfficerPosition(val);
    setHandoverOfficerPosition(val);
  };

  const [customSlipNo] = useState(() => {
    const rawId = record.groupId || record.id;
    const digits = rawId.replace(/\D/g, '');
    const numPart = digits.length >= 4 ? digits.slice(-6) : getNumericHash(rawId);
    return `BR-${numPart}`;
  });

  const printRef = useRef<HTMLDivElement>(null);
  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Interactive Zoom and Smooth Scroll Controls
  const [zoom, setZoom] = useState<number>(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 55 : 80));

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToPage2 = () => {
    if (page2Ref.current) {
      page2Ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  // Lock body scroll when modal opens
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Group all records belonging to the same borrower on the same borrow date if available
  const groupRecords = React.useMemo(() => {
    if (!allRecords || allRecords.length === 0) return [record];
    const matching = allRecords.filter(
      r => (record.groupId && r.groupId === record.groupId) ||
           (r.borrowerName === record.borrowerName && r.borrowDate === record.borrowDate)
    );
    return matching.length > 0 ? matching : [record];
  }, [record, allRecords]);

  // Handle PDF Download with 2 pages standard A4 export
  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    const docName = `ใบยืมพัสดุและใบส่งมอบ_${record.borrowerName.replace(/\s+/g, '_')}_${record.borrowDate}.pdf`;
    await downloadPdfFromContainer({
      container: printRef.current,
      filename: docName,
      isLandscape: false,
      onProgress: setIsGenerating,
      showToast
    });
  };

  // Handle direct print with exact preview styles
  const handlePrint = async () => {
    if (!printRef.current || isPrinting || isGenerating) return;
    setIsPrinting(true);
    try {
      await printElement(printRef.current, `ใบยืมพัสดุและใบส่งมอบ - ${record.borrowerName}`, false, showToast);
    } catch (err) {
      console.error('Print error:', err);
      showToast('ไม่สามารถเปิดหน้าต่างพิมพ์ได้ กรุณาใช้ปุ่มดาวน์โหลด PDF', 'error');
    } finally {
      setIsPrinting(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 w-full h-full max-h-screen overflow-hidden bg-slate-900/95 backdrop-blur-md flex flex-col z-[9999] font-sans">
      {/* Top Controls Header */}
      <div className="bg-slate-800 text-white p-2.5 sm:p-4 flex flex-wrap items-center justify-between gap-2.5 shadow-md border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-orange-600/20 text-orange-400 rounded-lg border border-orange-500/30 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading font-black text-xs sm:text-sm md:text-base text-white flex items-center gap-2">
              <span>พิมพ์และส่งออกใบยืมพัสดุ & ใบส่งมอบ</span>
              <span className="px-2 py-0.5 rounded-full bg-orange-900/80 text-orange-300 text-[10px] font-bold border border-orange-700/50 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-orange-400" />
                ๒ หน้า A4
              </span>
            </h2>
            <p className="text-[10px] sm:text-[11px] text-slate-300">
              หน้า 1: ใบยืมพัสดุ • หน้า 2: ใบส่งมอบ
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Zoom / Scaling Controls */}
          <div className="flex items-center gap-1 bg-slate-700/90 p-1 rounded-xl border border-slate-600 text-xs">
            <button
              type="button"
              onClick={() => setZoom(z => Math.max(40, z - 10))}
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg transition cursor-pointer"
              title="ซูมย่อเอกสาร (-10%)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <select
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="bg-white hover:bg-slate-50 !text-black font-extrabold rounded-md px-2 py-1 text-xs outline-none cursor-pointer text-center min-w-[70px] border border-slate-300 shadow-xs"
              style={{ color: '#000000', backgroundColor: '#ffffff' }}
              title="เลือกขนาดการแสดงผล"
            >
              {!([40, 50, 60, 65, 70, 75, 80, 85, 90, 100, 110, 120, 125, 150].includes(zoom)) && (
                <option value={zoom} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">{zoom}%</option>
              )}
              <option value={40} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">40%</option>
              <option value={50} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">50%</option>
              <option value={60} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">60% (จอมือถือ)</option>
              <option value={65} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">65%</option>
              <option value={70} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">70%</option>
              <option value={75} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">75%</option>
              <option value={80} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">80%</option>
              <option value={85} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">85%</option>
              <option value={90} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">90%</option>
              <option value={100} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">100% (ปกติ)</option>
              <option value={110} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">110%</option>
              <option value={120} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">120%</option>
              <option value={125} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">125%</option>
              <option value={150} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">150%</option>
            </select>
            <button
              type="button"
              onClick={() => setZoom(z => Math.min(180, z + 10))}
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg transition cursor-pointer"
              title="ซูมขยายเอกสาร (+10%)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Page Jump Buttons */}
          <div className="flex items-center gap-1 bg-slate-700/80 p-0.5 rounded-xl border border-slate-600 text-xs">
            <button
              type="button"
              onClick={scrollToTop}
              className="px-2 py-1 text-slate-200 hover:text-white hover:bg-slate-600 rounded-lg transition cursor-pointer font-bold text-[11px] flex items-center gap-1"
              title="เลื่อนไปหน้า 1 (ใบยืมพัสดุ)"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span>หน้า 1</span>
            </button>
            <button
              type="button"
              onClick={scrollToPage2}
              className="px-2 py-1 text-orange-300 hover:text-white hover:bg-slate-600 rounded-lg transition cursor-pointer font-bold text-[11px] flex items-center gap-1"
              title="เลื่อนไปหน้า 2 (ใบส่งมอบ)"
            >
              <Layers className="w-3.5 h-3.5 text-orange-400" />
              <span>หน้า 2 (ใบส่งมอบ)</span>
            </button>
            <button
              type="button"
              onClick={scrollToBottom}
              className="px-2 py-1 text-slate-200 hover:text-white hover:bg-slate-600 rounded-lg transition cursor-pointer font-bold text-[11px] flex items-center gap-1"
              title="เลื่อนลงล่างสุด"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>ล่างสุด</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting || isGenerating}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white font-heading font-black text-xs sm:text-sm rounded-xl shadow-md shadow-orange-500/20 border border-orange-400 transition flex items-center gap-2 cursor-pointer active:scale-95"
            title="พิมพ์เอกสาร 2 หน้า หรือบันทึก PDF ทันที"
          >
            {isPrinting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            <span>{isPrinting ? 'กำลังเตรียมพิมพ์...' : 'สั่งพิมพ์ (๒ หน้า)'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGenerating || isPrinting}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-heading font-bold text-xs rounded-xl shadow-xs border border-emerald-500 transition flex items-center gap-1.5 cursor-pointer"
            title="ดาวน์โหลดไฟล์ PDF 2 หน้าเก็บไว้"
          >
            <Download className="w-4 h-4" />
            <span>{isGenerating ? 'กำลังสร้าง...' : 'ดาวน์โหลด PDF'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition ml-1 cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Quick Settings Bar for Signatures and Approvals */}
      <div className="bg-amber-50/95 border-b border-amber-200/90 px-4 py-2.5 text-xs shrink-0 shadow-xs">
        <div className="max-w-7xl mx-auto space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 pb-1.5">
            <span className="font-heading font-bold text-amber-950 flex items-center gap-1.5 text-[11px]">
              <span>✍️ ตรวจสอบและแก้ไขชื่อ-ตำแหน่งของผู้อนุมัติและเจ้าหน้าที่ในเอกสารทั้ง ๒ หน้า:</span>
            </span>
            <span className="font-mono font-bold text-orange-900 bg-orange-100 px-2 py-0.5 rounded-md border border-orange-300 text-[11px]">
              เลขที่: {customSlipNo}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-[11px]">
            {/* 1. หัวหน้าสำนักปลัด */}
            <div className="bg-white/80 p-2 rounded-lg border border-amber-200 space-y-1">
              <span className="font-bold text-gray-800 block text-[10px] text-amber-900">๑. หัวหน้าสำนักปลัด:</span>
              <input
                type="text"
                value={headOfOfficeName}
                onChange={(e) => setHeadOfOfficeName(e.target.value)}
                placeholder="ชื่อหัวหน้าสำนักปลัด"
                className="w-full px-2 py-0.5 bg-white border border-gray-300 rounded text-xs text-gray-900 outline-none focus:ring-1 focus:ring-orange-400"
              />
              <input
                type="text"
                value={headOfOfficePosition}
                onChange={(e) => setHeadOfOfficePosition(e.target.value)}
                placeholder="ตำแหน่ง"
                className="w-full px-2 py-0.5 bg-white border border-gray-300 rounded text-[10px] text-gray-600 outline-none focus:ring-1 focus:ring-orange-400"
              />
            </div>

            {/* 2. นายก อบต. */}
            <div className="bg-white/80 p-2 rounded-lg border border-amber-200 space-y-1">
              <span className="font-bold text-gray-800 block text-[10px] text-amber-900">๒. คำสั่ง/การอนุมัติ (นายก อบต.):</span>
              <input
                type="text"
                value={mayorName}
                onChange={(e) => setMayorName(e.target.value)}
                placeholder="ชื่อนายก อบต."
                className="w-full px-2 py-0.5 bg-white border border-gray-300 rounded text-xs text-gray-900 outline-none focus:ring-1 focus:ring-orange-400"
              />
              <input
                type="text"
                value={mayorPosition}
                onChange={(e) => setMayorPosition(e.target.value)}
                placeholder="ตำแหน่ง"
                className="w-full px-2 py-0.5 bg-white border border-gray-300 rounded text-[10px] text-gray-600 outline-none focus:ring-1 focus:ring-orange-400"
              />
            </div>

            {/* 3. เจ้าหน้าที่ส่งมอบ */}
            <div className="bg-white/80 p-2 rounded-lg border border-amber-200 space-y-1">
              <span className="font-bold text-gray-800 block text-[10px] text-amber-900">๓. เจ้าหน้าที่ส่งมอบพัสดุ (คนเดียวกับผู้รับคืน):</span>
              <input
                type="text"
                value={handoverOfficerName}
                onChange={(e) => handleHandoverOfficerNameChange(e.target.value)}
                placeholder="ชื่อเจ้าหน้าที่ส่งมอบ"
                className="w-full px-2 py-0.5 bg-white border border-gray-300 rounded text-xs text-gray-900 outline-none focus:ring-1 focus:ring-orange-400"
              />
              <input
                type="text"
                value={handoverOfficerPosition}
                onChange={(e) => handleHandoverOfficerPositionChange(e.target.value)}
                placeholder="ตำแหน่ง"
                className="w-full px-2 py-0.5 bg-white border border-gray-300 rounded text-[10px] text-gray-600 outline-none focus:ring-1 focus:ring-orange-400"
              />
            </div>

            {/* 4. เจ้าหน้าที่รับคืน */}
            <div className="bg-white/80 p-2 rounded-lg border border-amber-200 space-y-1">
              <span className="font-bold text-gray-800 block text-[10px] text-amber-900">๔. เจ้าหน้าที่รับคืนพัสดุ (คนเดียวกับผู้ส่งมอบ):</span>
              <input
                type="text"
                value={receivingOfficerName}
                onChange={(e) => handleReceivingOfficerNameChange(e.target.value)}
                placeholder="ชื่อเจ้าหน้าที่รับคืน"
                className="w-full px-2 py-0.5 bg-white border border-gray-300 rounded text-xs text-gray-900 outline-none focus:ring-1 focus:ring-orange-400"
              />
              <input
                type="text"
                value={receivingOfficerPosition}
                onChange={(e) => handleReceivingOfficerPositionChange(e.target.value)}
                placeholder="ตำแหน่ง"
                className="w-full px-2 py-0.5 bg-white border border-gray-300 rounded text-[10px] text-gray-600 outline-none focus:ring-1 focus:ring-orange-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Document Preview Canvas with smooth scroll */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 w-full overflow-y-auto overflow-x-auto min-h-0 p-2 sm:p-4 md:p-6 bg-slate-200/90 custom-scrollbar touch-auto focus:outline-none relative"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x pan-y',
          scrollBehavior: 'smooth'
        }}
        tabIndex={0}
      >
        <div className="min-w-fit w-full flex flex-col items-center gap-6 pb-24">
          <div 
            ref={printRef}
            className="flex flex-col items-center gap-6 w-full origin-top transition-transform duration-100"
            style={{
              zoom: `${zoom}%`,
              transformOrigin: 'top center'
            }}
          >
            {/* ========================================================================= */}
            {/* PAGE 1: ใบยืมพัสดุ */}
            {/* ========================================================================= */}
            <div
              ref={page1Ref}
              className="a4-sheet bg-white p-8 sm:p-12 w-[210mm] max-w-full min-h-[297mm] text-black font-sarabun flex flex-col justify-between shrink-0 shadow-2xl border border-gray-300 rounded-xs my-2 relative"
              style={{ boxSizing: 'border-box', pageBreakAfter: 'always', breakAfter: 'page' }}
            >
              <div>
                {/* Header: Emblem & Official Letter Heading */}
                <div className="relative mb-3 font-sarabun">
                  <div className="flex justify-center mb-1.5">
                    <img
                      src={logo}
                      alt="ตราหน่วยงาน"
                      className="w-18 h-18 object-contain shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Center Title */}
                  <div className="text-center mb-4">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-black tracking-widest font-sarabun leading-tight">
                      ใบยืมพัสดุ
                    </h1>
                  </div>

                  {/* Dispatch Letter Details Header */}
                  <div className="space-y-2 text-xs sm:text-sm border-b-2 border-black pb-3 font-sarabun">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-black shrink-0">ที่:</span>
                        <span className="font-mono font-medium">
                          {customSlipNo}
                        </span>
                      </div>
                      <div className="text-right font-medium leading-tight">
                        <p className="font-bold">เขียนที่ องค์การบริหารส่วนตำบลม่อนจอง</p>
                      </div>
                    </div>

                    {/* Date line */}
                    <div className="flex items-baseline gap-2 pl-[48%] pt-1">
                      <span className="font-bold text-black shrink-0">วันที่:</span>
                      <span className="font-medium">
                        {formatThaiFullDate(record.borrowDate)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subject (เรื่อง) Below line */}
                <div className="text-xs sm:text-sm font-sarabun mb-2.5 flex items-baseline gap-2">
                  <span className="font-bold text-black shrink-0">เรื่อง:</span>
                  <span className="font-normal">
                    ขอยืมพัสดุ-ครุภัณฑ์
                  </span>
                </div>

                {/* Salutation (เรียน) */}
                <div className="text-xs sm:text-sm font-sarabun mb-3.5 flex items-baseline gap-2">
                  <span className="font-bold">เรียน:</span>
                  <span>{mayorPosition.trim() ? mayorPosition.trim() : 'นายกองค์การบริหารส่วนตำบลม่อนจอง'}</span>
                </div>

                {/* Body Paragraph */}
                <div className="text-xs sm:text-sm font-sarabun leading-relaxed text-justify space-y-2.5 mb-3.5">
                  <p className="indent-12">
                    ด้วย ข้าพเจ้า <span className="font-bold">{record.borrowerName}</span> ตำแหน่ง/สังกัด <span className="font-bold">{record.borrowerPosition}</span> หมายเลขโทรศัพท์ติดต่อ <span className="font-mono font-semibold">{record.borrowerTel}</span> มีความประสงค์ขอยืมพัสดุ-ครุภัณฑ์ งานป้องกันและบรรเทาสาธารณภัย องค์การบริหารส่วนตำบลม่อนจอง {record.note ? `เพื่อนำไปใช้สำหรับ ${record.note}` : 'เพื่อนำไปใช้ในการปฏิบัติราชการและภารกิจของหน่วยงาน'} ตั้งแต่วันที่ <span className="font-semibold">{formatThaiFullDate(record.borrowDate)}</span> ถึงวันที่ <span className="font-semibold">{formatThaiFullDate(record.returnDate)}</span> โดยมีรายการดังต่อไปนี้
                  </p>
                </div>

                {/* Items Table */}
                <div className="mb-3.5">
                  <div className="border border-black rounded-xs overflow-hidden text-xs font-sarabun">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-100 border-b border-black text-black font-bold text-center">
                          <th className="py-2 px-1 w-14 border-r border-black whitespace-nowrap text-center">ลำดับ</th>
                          <th className="p-2 w-32 border-r border-black">รหัสพัสดุ/ครุภัณฑ์</th>
                          <th className="p-2 border-r border-black text-left">รายการพัสดุ - ครุภัณฑ์</th>
                          <th className="p-2 w-20 border-r border-black">จำนวน</th>
                          <th className="p-2 w-28 border-r border-black">กำหนดวันคืน</th>
                          <th className="p-2 w-24">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black">
                        {groupRecords.map((itemRec, index) => {
                          const eqDetail = equipment.find(e => e.id === itemRec.itemId);
                          const isRet = !!itemRec.returnedDate;

                          return (
                            <tr key={itemRec.id} className="text-center">
                              <td className="py-2 px-1 w-14 border-r border-black font-mono whitespace-nowrap text-center">
                                {index + 1}
                              </td>
                              <td className="p-2 border-r border-black font-mono font-bold">
                                {eqDetail?.code || 'EQ-ITEM'}
                              </td>
                              <td className="p-2 border-r border-black text-left font-semibold">
                                {itemRec.itemName}
                              </td>
                              <td className="p-2 border-r border-black font-mono font-bold">
                                {itemRec.qty || 1} ชิ้น
                              </td>
                              <td className="p-2 border-r border-black font-mono">
                                {formatThaiDMY(itemRec.returnDate)}
                              </td>
                              <td className="p-2 font-medium">
                                {isRet ? 'ส่งคืนแล้ว' : 'อยู่ระหว่างยืม'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Warranties & Undertakings */}
                <div className="text-xs sm:text-sm font-sarabun leading-relaxed text-justify space-y-1.5 mb-4">
                  <p className="indent-12">
                    ข้าพเจ้าขอรับรองว่าจะดูแลรักษาพัสดุ-ครุภัณฑ์ข้างต้นให้อยู่ในสภาพพร้อมใช้งานและนำส่งคืนงานป้องกันและบรรเทาสาธารณภัยภายในกำหนดเวลา หากเกิดความชำรุดเสียหายหรือสูญหายเนื่องจากการใช้งาน ยินดีรับผิดชอบชดใช้ค่าเสียหายหรือจัดหามาทดแทนตามระเบียบของทางราชการทุกประการ
                  </p>
                  <p className="pl-[48%] font-medium">
                    จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ
                  </p>
                </div>

                {/* Borrower Signature Block (Right Aligned) */}
                <div className="flex justify-end font-sarabun text-xs sm:text-sm mb-4">
                  <div className="text-center space-y-0.5 w-64">
                    <p>(ลงชื่อ)...........................................................</p>
                    <p className="font-bold">( {record.borrowerName} )</p>
                    <p className="text-gray-700 text-xs">ตำแหน่ง/สังกัด {record.borrowerPosition}</p>
                    <p className="font-semibold text-xs pt-0.5">ผู้ขอยืม</p>
                  </div>
                </div>

                {/* ๔ ส่วนทางการ: ๑.ความเห็นหัวหน้าสำนักปลัด  ๒.คำสั่ง/การอนุมัติ (นายก) */}
                <div className="border-t border-black pt-3 grid grid-cols-2 gap-4 text-xs font-sarabun text-left">
                  {/* Section 1: ความเห็นหัวหน้าสำนักปลัด */}
                  <div className="space-y-1.5 border-r border-gray-300 pr-3 text-left">
                    <p className="font-bold underline text-left">๑. ความเห็นหัวหน้าสำนักปลัด</p>
                    <p className="text-gray-800 min-h-[36px] text-left">
                      {headOfOfficeComment.trim() ? headOfOfficeComment.trim() : 'ได้ตรวจสอบแล้ว พัสดุ-ครุภัณฑ์มีพร้อมใช้งาน เห็นควรพิจารณาอนุมัติ'}
                    </p>
                    <div className="pt-2 text-center space-y-0.5">
                      <p className="text-center">(ลงชื่อ)...........................................................</p>
                      <p className="font-bold text-center">
                        ( {headOfOfficeName.trim() ? headOfOfficeName.trim() : '...........................................................'} )
                      </p>
                      <p className="text-gray-600 text-[11px] leading-tight text-center">
                        {headOfOfficePosition.trim() ? headOfOfficePosition.trim() : 'ตำแหน่ง ...........................................................'}
                      </p>
                      <p className="text-gray-500 text-[10px] text-center">วันที่ ...........................................................</p>
                    </div>
                  </div>

                  {/* Section 2: คำสั่ง / การอนุมัติ (นายก) */}
                  <div className="space-y-1.5 pl-0 text-left">
                    <p className="font-bold underline text-left">๒. คำสั่ง / การอนุมัติ</p>
                    <div className="flex items-center justify-start gap-5 text-xs font-semibold my-0.5 min-h-[36px] pl-0">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <span className={`w-3.5 h-3.5 border border-black inline-flex items-center justify-center rounded-xs text-[10px] font-bold ${mayorOrder !== 'ไม่อนุมัติ' ? 'bg-black text-white' : ''}`}>
                          {mayorOrder !== 'ไม่อนุมัติ' ? '✓' : ''}
                        </span>
                        <span>อนุมัติ</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <span className={`w-3.5 h-3.5 border border-black inline-flex items-center justify-center rounded-xs text-[10px] font-bold ${mayorOrder === 'ไม่อนุมัติ' ? 'bg-black text-white' : ''}`}>
                          {mayorOrder === 'ไม่อนุมัติ' ? '✓' : ''}
                        </span>
                        <span>ไม่อนุมัติ</span>
                      </label>
                    </div>
                    <div className="pt-2 text-center space-y-0.5">
                      <p className="text-center">(ลงชื่อ)...........................................................</p>
                      <p className="font-bold text-center">
                        ( {mayorName.trim() ? mayorName.trim() : '...........................................................'} )
                      </p>
                      <p className="text-gray-600 text-[11px] leading-tight text-center">
                        {mayorPosition.trim() ? mayorPosition.trim() : 'ตำแหน่ง ...........................................................'}
                      </p>
                      <p className="text-gray-500 text-[10px] text-center">วันที่ ...........................................................</p>
                    </div>
                  </div>
                </div>

                {/* ๓. เจ้าหน้าที่ส่งมอบพัสดุ & ๔. เจ้าหน้าที่รับคืนพัสดุ */}
                <div className="mt-3 border-t border-black pt-3 grid grid-cols-2 gap-4 text-xs font-sarabun text-left">
                  <div className="space-y-1.5 border-r border-gray-300 pr-3 text-left">
                    <p className="font-bold underline text-left">๓. เจ้าหน้าที่ส่งมอบพัสดุ</p>
                    <div className="pt-2 text-center space-y-0.5">
                      <p className="text-center">(ลงชื่อ)...........................................................</p>
                      <p className="font-bold text-center">
                        ( {handoverOfficerName.trim() ? handoverOfficerName.trim() : '...........................................................'} )
                      </p>
                      <p className="text-gray-600 text-[11px] leading-tight text-center">
                        {handoverOfficerPosition.trim() ? handoverOfficerPosition.trim() : 'ตำแหน่ง ...........................................................'}
                      </p>
                      <p className="text-gray-500 text-[10px] text-center">วันที่ ...........................................................</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 pl-0 text-left">
                    <p className="font-bold underline text-left">๔. เจ้าหน้าที่รับคืนพัสดุ</p>
                    <div className="pt-2 text-center space-y-0.5">
                      <p className="text-center">(ลงชื่อ)...........................................................</p>
                      <p className="font-bold text-center">
                        ( {receivingOfficerName.trim() ? receivingOfficerName.trim() : '...........................................................'} )
                      </p>
                      <p className="text-gray-600 text-[11px] leading-tight text-center">
                        {receivingOfficerPosition.trim() ? receivingOfficerPosition.trim() : 'ตำแหน่ง ...........................................................'}
                      </p>
                      <p className="text-gray-500 text-[10px] text-center">วันที่ ...........................................................</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Sheet Footer */}
              <div className="text-[10px] text-gray-500 pt-3 border-t border-gray-200 flex justify-between items-center">
                <span>หน้าที่ ๑ / ๒ (ใบยืมพัสดุ - องค์การบริหารส่วนตำบลม่อนจอง)</span>
                <span className="font-mono text-[9px]">BR-{customSlipNo}</span>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* PAGE 2: ใบส่งมอบ */}
            {/* ========================================================================= */}
            <div
              ref={page2Ref}
              className="a4-sheet bg-white p-8 sm:p-12 w-[210mm] max-w-full min-h-[297mm] text-black font-sarabun flex flex-col justify-between shrink-0 shadow-2xl border border-gray-300 rounded-xs my-2 relative"
              style={{ boxSizing: 'border-box', pageBreakAfter: 'always', breakAfter: 'page' }}
            >
              <div>
                {/* Header: Emblem & Document Title */}
                <div className="relative mb-3 font-sarabun">
                  <div className="flex justify-center mb-1.5">
                    <img
                      src={logo}
                      alt="ตราหน่วยงาน"
                      className="w-18 h-18 object-contain shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Center Title */}
                  <div className="text-center mb-4">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-black tracking-widest font-sarabun leading-tight">
                      ใบส่งมอบ
                    </h1>
                  </div>

                  {/* Reference Header Details */}
                  <div className="space-y-2 text-xs sm:text-sm border-b-2 border-black pb-3 font-sarabun">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-black shrink-0">อ้างถึงใบยืมเลขที่:</span>
                        <span className="font-mono font-bold text-orange-900">
                          {customSlipNo}
                        </span>
                      </div>
                      <div className="text-right font-medium leading-tight">
                        <p className="font-bold">งานป้องกันและบรรเทาสาธารณภัย สำนักปลัด</p>
                        <p>องค์การบริหารส่วนตำบลม่อนจอง</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-baseline pt-1">
                      <div className="text-xs text-gray-700">
                        <span className="font-bold">วันที่ออกใบส่งมอบ:</span> {formatThaiFullDate(record.borrowDate)}
                      </div>
                      <div className="text-xs font-bold text-red-700">
                        กำหนดส่งคืนภายในวันที่: {formatThaiFullDate(record.returnDate)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Handover Certificate Text */}
                <div className="text-xs sm:text-sm font-sarabun leading-relaxed text-justify space-y-2.5 mb-4">
                  <p className="indent-12">
                    เอกสารฉบับนี้ออกให้ไว้เพื่อเป็นหลักฐานว่า งานป้องกันและบรรเทาสาธารณภัย สำนักปลัด องค์การบริหารส่วนตำบลม่อนจอง ได้ดำเนินการส่งมอบพัสดุ-ครุภัณฑ์ตามคำขอของ <span className="font-bold">{record.borrowerName}</span> ตำแหน่ง/สังกัด <span className="font-bold">{record.borrowerPosition}</span> หมายเลขโทรศัพท์ <span className="font-mono font-semibold">{record.borrowerTel}</span> เพื่อนำไปใช้สำหรับ <span className="font-medium">{record.note || 'การปฏิบัติราชการและภารกิจของหน่วยงาน'}</span> มีกำหนดระยะเวลาการยืมตั้งแต่วันที่ <span className="font-semibold">{formatThaiFullDate(record.borrowDate)}</span> ถึงวันที่ <span className="font-semibold">{formatThaiFullDate(record.returnDate)}</span> โดยมีรายการส่งมอบดังต่อไปนี้
                  </p>
                </div>

                {/* Items Table for Borrower */}
                <div className="mb-4">
                  <div className="border border-black rounded-xs overflow-hidden text-xs font-sarabun">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-orange-50 border-b border-black text-black font-bold text-center">
                          <th className="py-2 px-1 w-14 border-r border-black whitespace-nowrap text-center">ลำดับ</th>
                          <th className="p-2 w-32 border-r border-black">รหัสพัสดุ/ครุภัณฑ์</th>
                          <th className="p-2 border-r border-black text-left">รายการพัสดุ - ครุภัณฑ์</th>
                          <th className="p-2 w-20 border-r border-black">จำนวน</th>
                          <th className="p-2 w-28 border-r border-black">สภาพ ณ วันส่งมอบ</th>
                          <th className="p-2 w-28">กำหนดวันส่งคืน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black">
                        {groupRecords.map((itemRec, index) => {
                          const eqDetail = equipment.find(e => e.id === itemRec.itemId);
                          return (
                            <tr key={itemRec.id} className="text-center">
                              <td className="py-2 px-1 w-14 border-r border-black font-mono whitespace-nowrap text-center">
                                {index + 1}
                              </td>
                              <td className="p-2 border-r border-black font-mono font-bold">
                                {eqDetail?.code || 'EQ-ITEM'}
                              </td>
                              <td className="p-2 border-r border-black text-left font-semibold">
                                {itemRec.itemName}
                              </td>
                              <td className="p-2 border-r border-black font-mono font-bold text-orange-950">
                                {itemRec.qty || 1} ชิ้น
                              </td>
                              <td className="p-2 border-r border-black font-medium text-emerald-800">
                                สภาพปกติพร้อมใช้งาน
                              </td>
                              <td className="p-2 font-mono font-semibold text-black">
                                {formatThaiDMY(itemRec.returnDate)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Rules & Undertakings for Borrower */}
                <div className="bg-amber-50/50 border border-amber-200 p-3 rounded-lg text-xs font-sarabun space-y-1.5 mb-5">
                  <p className="font-bold text-amber-950 underline">ข้อปฏิบัติและเงื่อนไขสำหรับผู้ยืมพัสดุ-ครุภัณฑ์:</p>
                  <ol className="list-decimal pl-5 space-y-1 text-gray-800 leading-normal">
                    <li>ผู้ยืมต้องเก็บรักษาเอกสารฉบับนี้ไว้เป็นหลักฐาน และนำเอกสารฉบับนี้มาแสดงต่อเจ้าหน้าที่พร้อมส่งคืนพัสดุ</li>
                    <li>ผู้ยืมต้องดูแลรักษาพัสดุ-ครุภัณฑ์ให้อยู่ในสภาพสมบูรณ์พร้อมใช้งาน และส่งคืนภายในกำหนดเวลาที่ได้รับอนุมัติ</li>
                    <li>หากเกิดความชำรุด เสียหาย หรือสูญหาย ผู้ยืมยินยอมรับผิดชอบชดใช้ค่าเสียหายหรือจัดหามาทดแทนตามระเบียบทางราชการ</li>
                    <li>เมื่อเจ้าหน้าที่ตรวจสอบสภาพความเรียบร้อยและลงนามรับคืนในส่วนที่ ๒ ถือว่าการยืม-คืนเสร็จสมบูรณ์</li>
                  </ol>
                </div>

                {/* 2-Part Official Delivery & Return Confirmation Blocks */}
                <div className="space-y-4 font-sarabun text-xs">
                  {/* Part 1: Delivery at Borrow Date */}
                  <div className="border border-black rounded-lg p-3 space-y-2">
                    <p className="font-bold text-black border-b border-gray-300 pb-1 flex items-center justify-between">
                      <span>ส่วนที่ ๑: บันทึกการส่งมอบพัสดุ (ณ วันที่รับมอบของไปใช้งาน)</span>
                      <span className="text-[11px] font-normal text-gray-600">วันที่ {formatThaiFullDate(record.borrowDate)}</span>
                    </p>
                    <div className="grid grid-cols-2 gap-6 pt-2">
                      <div className="text-center space-y-0.5 border-r border-gray-200 pr-3">
                        <p className="font-bold text-gray-800">ผู้รับมอบพัสดุ (ผู้ยืม)</p>
                        <p className="pt-2">(ลงชื่อ)...........................................................</p>
                        <p className="font-bold">( {record.borrowerName} )</p>
                        <p className="text-gray-600 text-[10px]">ตำแหน่ง {record.borrowerPosition}</p>
                        <p className="text-gray-500 text-[10px]">วันที่ {formatThaiDMY(record.borrowDate)}</p>
                      </div>
                      <div className="text-center space-y-0.5">
                        <p className="font-bold text-gray-800">เจ้าหน้าที่ผู้ส่งมอบพัสดุ</p>
                        <p className="pt-2">(ลงชื่อ)...........................................................</p>
                        <p className="font-bold">( {handoverOfficerName.trim() ? handoverOfficerName.trim() : 'นายไพรศาล  คำใจ'} )</p>
                        <p className="text-gray-600 text-[10px]">{handoverOfficerPosition.trim() ? handoverOfficerPosition.trim() : 'ผู้ช่วยนักจัดการงานทั่วไป'}</p>
                        <p className="text-gray-500 text-[10px]">วันที่ {formatThaiDMY(record.borrowDate)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Part 2: Return Verification at Return Date */}
                  <div className="border border-black rounded-lg p-3 space-y-2 bg-gray-50/60">
                    <p className="font-bold text-black border-b border-gray-300 pb-1 flex items-center justify-between">
                      <span>ส่วนที่ ๒: บันทึกการตรวจรับคืนพัสดุ (ณ วันที่นำมาส่งคืนงานป้องกันฯ)</span>
                      <span className="text-[11px] font-normal text-gray-600">
                        {record.returnedDate ? `ส่งคืนจริงเมื่อ: ${formatThaiFullDate(record.returnedDate)}` : 'ลงนามเมื่อนำของมาส่งคืน'}
                      </span>
                    </p>
                    
                    <div className="flex items-center gap-6 text-[11px] pt-1">
                      <span className="font-bold text-gray-800 shrink-0">ผลการตรวจรับสภาพ:</span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <span className={`w-3.5 h-3.5 border border-black inline-flex items-center justify-center rounded-xs text-[10px] font-bold ${record.returnedDate ? 'bg-black text-white' : ''}`}>
                          {record.returnedDate ? '✓' : ''}
                        </span>
                        <span>ครบถ้วนและอยู่ในสภาพเรียบร้อยพร้อมใช้งาน</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <span className="w-3.5 h-3.5 border border-black inline-block rounded-xs"></span>
                        <span>ชำรุด / มีข้อสังเกต</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-2">
                      <div className="text-center space-y-0.5 border-r border-gray-200 pr-3">
                        <p className="font-bold text-gray-800">ผู้ส่งคืนพัสดุ (ผู้ยืม)</p>
                        <p className="pt-2">(ลงชื่อ)...........................................................</p>
                        <p className="font-bold">( {record.borrowerName} )</p>
                        <p className="text-gray-600 text-[10px]">ตำแหน่ง {record.borrowerPosition}</p>
                        <p className="text-gray-500 text-[10px]">
                          วันที่ {record.returnedDate ? formatThaiDMY(record.returnedDate) : '...........................................................'}
                        </p>
                      </div>
                      <div className="text-center space-y-0.5">
                        <p className="font-bold text-gray-800">เจ้าหน้าที่ผู้ตรวจรับคืนพัสดุ</p>
                        <p className="pt-2">(ลงชื่อ)...........................................................</p>
                        <p className="font-bold">( {receivingOfficerName.trim() ? receivingOfficerName.trim() : '...........................................................'} )</p>
                        <p className="text-gray-600 text-[10px]">{receivingOfficerPosition.trim() ? receivingOfficerPosition.trim() : 'ตำแหน่ง ...........................................................'}</p>
                        <p className="text-gray-500 text-[10px]">
                          วันที่ {record.returnedDate ? formatThaiDMY(record.returnedDate) : '...........................................................'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Sheet Footer */}
              <div className="text-[10px] text-gray-500 pt-3 border-t border-gray-200 flex justify-between items-center">
                <span>หน้าที่ ๒ / ๒ (ใบส่งมอบ - องค์การบริหารส่วนตำบลม่อนจอง)</span>
                <span className="font-mono text-[9px]">BR-{customSlipNo}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Quick Navigation & Scroll Indicator Bar */}
        <div className="sticky bottom-3 z-30 bg-slate-900/90 text-white backdrop-blur-md px-4 py-2 rounded-full shadow-2xl border border-slate-700 flex items-center gap-3 text-xs pointer-events-auto max-w-fit mx-auto">
          <span className="text-slate-300 font-medium">
            เอกสารการยืม-คืน <span className="text-orange-400 font-bold">๒</span> หน้า A4 (ขนาดปัจจุบัน: {zoom}%)
          </span>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={scrollToTop}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition font-bold flex items-center gap-1 border border-slate-600 cursor-pointer"
              title="เลื่อนขึ้นหน้า 1 (ใบยืมพัสดุ)"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span>หน้า 1 (ใบยืม)</span>
            </button>
            <button
              type="button"
              onClick={scrollToPage2}
              className="px-2.5 py-1 bg-orange-800 hover:bg-orange-700 text-orange-200 hover:text-white rounded-lg transition font-bold flex items-center gap-1 border border-orange-600 cursor-pointer"
              title="เลื่อนไปหน้า 2 (ใบส่งมอบ)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>หน้า 2 (ใบส่งมอบ)</span>
            </button>
            <button
              type="button"
              onClick={scrollToBottom}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition font-bold flex items-center gap-1 border border-slate-600 cursor-pointer"
              title="เลื่อนลงดูลายเซ็นท้ายเอกสาร"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>ล่างสุด</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
