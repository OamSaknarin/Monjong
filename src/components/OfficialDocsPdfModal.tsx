import React, { useRef, useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { OfficialDoc } from '../types';
import { Printer, Download, X, FileText, CheckCircle2, RotateCcw, ZoomIn, ZoomOut, ChevronUp, ChevronDown, Image as ImageIcon } from 'lucide-react';
import logo from '../assets/logo.png';
import { getThaiTodayStr } from '../utils/dateUtils';
import { printElement, downloadPdfFromContainer, downloadImageFromContainer } from '../utils/pdfExport';

interface OfficialDocsPdfModalProps {
  docs: OfficialDoc[];
  allDocs?: OfficialDoc[];
  currentFilterType?: string;
  searchQuery?: string;
  onClose: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const formatThaiDate = (dateStr: string) => {
  if (!dateStr) return '-';
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        const [y, m, d] = parts;
        const dayNum = parseInt(d, 10);
        const monthNum = parseInt(m, 10) - 1;
        const yearBE = Number(y) < 2500 ? Number(y) + 543 : Number(y);
        if (monthNum >= 0 && monthNum < 12) {
          return `${dayNum} ${THAI_MONTHS[monthNum]} ${yearBE}`;
        }
      } else if (parts[2].length === 4) {
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

export default function OfficialDocsPdfModal({
  docs,
  allDocs = [],
  currentFilterType = 'all',
  searchQuery = '',
  onClose,
  showToast
}: OfficialDocsPdfModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [dataSource, setDataSource] = useState<'filtered' | 'all'>('filtered');
  const [reporterName, setReporterName] = useState('');
  const [reporterPosition, setReporterPosition] = useState('');
  const [approverName, setApproverName] = useState('');
  const [approverPosition, setApproverPosition] = useState('');
  
  // Dynamic Zoom & Scroll Controls
  const [zoom, setZoom] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 65; // Auto fit on small / mobile viewports
    }
    return 100;
  });

  const printRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ 
        top: scrollContainerRef.current.scrollHeight, 
        behavior: 'smooth' 
      });
    }
  };

  const activeDocs = useMemo(() => {
    return dataSource === 'filtered' ? docs : (allDocs.length > 0 ? allDocs : docs);
  }, [dataSource, docs, allDocs]);

  // Statistics
  const stats = useMemo(() => {
    const counts = {
      total: activeDocs.length,
      received: 0,
      sent: 0,
      announcement: 0,
      order: 0,
      petition: 0
    };
    activeDocs.forEach(d => {
      if (d.docType === 'หนังสือรับ') counts.received++;
      else if (d.docType === 'หนังสือส่ง') counts.sent++;
      else if (d.docType === 'ประกาศ') counts.announcement++;
      else if (d.docType === 'คำสั่ง') counts.order++;
      else if (d.docType === 'แบบคำร้อง') counts.petition++;
    });
    return counts;
  }, [activeDocs]);

  const reportDateStr = useMemo(() => {
    return formatThaiDate(getThaiTodayStr());
  }, []);

  // Items per page settings
  const [itemsPerPageSetting, setItemsPerPageSetting] = useState<number | 'auto'>('auto');

  const itemsPerPageFirst = useMemo(() => {
    if (itemsPerPageSetting !== 'auto') return itemsPerPageSetting;
    return orientation === 'landscape' ? 8 : 12;
  }, [itemsPerPageSetting, orientation]);

  const itemsPerPageNext = useMemo(() => {
    if (itemsPerPageSetting !== 'auto') return itemsPerPageSetting;
    return orientation === 'landscape' ? 12 : 16;
  }, [itemsPerPageSetting, orientation]);

  const pages = useMemo(() => {
    if (activeDocs.length === 0) return [[]];
    const result: OfficialDoc[][] = [];
    let remaining = [...activeDocs];

    // Page 1
    const p1 = remaining.slice(0, itemsPerPageFirst);
    result.push(p1);
    remaining = remaining.slice(itemsPerPageFirst);

    // Subsequent pages
    while (remaining.length > 0) {
      const pNext = remaining.slice(0, itemsPerPageNext);
      result.push(pNext);
      remaining = remaining.slice(itemsPerPageNext);
    }

    return result;
  }, [activeDocs, itemsPerPageFirst, itemsPerPageNext]);

  // Direct print with exact preview styles
  const handlePrint = () => {
    if (!printRef.current) return;
    printElement(printRef.current, 'รายงานทะเบียนหนังสือราชการ - อบต.ม่อนจอง', orientation === 'landscape', showToast);
  };

  // High quality PDF generation
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const handleDownloadImage = async () => {
    if (!printRef.current) return;
    await downloadImageFromContainer({
      container: printRef.current,
      filename: `รายงานทะเบียนหนังสือราชการ_${getThaiTodayStr()}.png`,
      format: 'png',
      onProgress: setIsGeneratingImage,
      showToast
    });
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    await downloadPdfFromContainer({
      container: printRef.current,
      filename: `รายงานทะเบียนหนังสือราชการ_${getThaiTodayStr()}.pdf`,
      isLandscape: orientation === 'landscape',
      onProgress: setIsGenerating,
      showToast
    });
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 w-full h-full max-h-screen overflow-hidden bg-slate-900/95 backdrop-blur-md flex flex-col z-[9999] font-sans">
      {/* Top Controls Header */}
      <div className="bg-slate-800 text-white p-2.5 sm:p-4 flex flex-wrap items-center justify-between gap-2.5 shadow-md border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-600/20 text-purple-400 rounded-lg border border-purple-500/30 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading font-black text-xs sm:text-sm md:text-base text-white flex items-center gap-2">
              <span>พิมพ์และส่งออกรายงานทะเบียนหนังสือราชการ</span>
              <span className="px-2 py-0.5 rounded-full bg-purple-900/80 text-purple-300 text-[10px] font-bold border border-purple-700/50">
                {pages.length} หน้า A4
              </span>
            </h2>
            <p className="text-[10px] sm:text-[11px] text-slate-300">
              พรีวิวรายงานเอกสารมาตรฐาน A4 (งานสารบรรณ อบต.ม่อนจอง)
            </p>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Data Source */}
          <select
            value={dataSource}
            onChange={(e) => setDataSource(e.target.value as any)}
            className="bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-purple-500 font-medium"
          >
            <option value="filtered">ตามตัวกรอง ({docs.length} รายการ)</option>
            <option value="all">ทั้งหมด ({allDocs.length || docs.length} รายการ)</option>
          </select>

          {/* Items Per Page */}
          <select
            value={itemsPerPageSetting}
            onChange={(e) => setItemsPerPageSetting(e.target.value === 'auto' ? 'auto' : Number(e.target.value))}
            className="bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-purple-500 font-medium"
            title="จำนวนรายการต่อหน้า"
          >
            <option value="auto">อัตโนมัติ/หน้า</option>
            <option value={8}>8 รายการ/หน้า</option>
            <option value={10}>10 รายการ/หน้า</option>
            <option value={12}>12 รายการ/หน้า</option>
            <option value={15}>15 รายการ/หน้า</option>
            <option value={20}>20 รายการ/หน้า</option>
          </select>

          {/* Orientation Toggle */}
          <div className="flex items-center bg-slate-700/80 p-0.5 rounded-xl border border-slate-600 text-xs">
            <button
              type="button"
              onClick={() => setOrientation('landscape')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition ${
                orientation === 'landscape' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              แนวนอน
            </button>
            <button
              type="button"
              onClick={() => setOrientation('portrait')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition ${
                orientation === 'portrait' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              แนวตั้ง
            </button>
          </div>

          {/* Zoom / Scaling Controls */}
          <div className="flex items-center gap-1 bg-slate-700/90 p-1 rounded-xl border border-slate-600 text-xs">
            <button
              type="button"
              onClick={() => setZoom(z => Math.max(40, z - 10))}
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg transition"
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
              <option value={60} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">60%</option>
              <option value={65} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">65% (พอดีจอเล็ก)</option>
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
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg transition"
              title="ซูมขยายเอกสาร (+10%)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (scrollContainerRef.current) {
                  const cWidth = scrollContainerRef.current.clientWidth - 48;
                  const targetWidth = orientation === 'landscape' ? 1050 : 760;
                  const fit = Math.min(100, Math.max(45, Math.floor((cWidth / targetWidth) * 100)));
                  setZoom(fit);
                } else {
                  setZoom(65);
                }
              }}
              className="px-2 py-1 bg-purple-700 hover:bg-purple-600 text-white rounded-md font-bold text-[10px] transition cursor-pointer"
              title="ปรับขนาดให้พอดีจอ"
            >
              พอดีจอ
            </button>
          </div>

          {/* Quick Jump Buttons */}
          <div className="hidden sm:flex items-center gap-0.5 bg-slate-700/80 p-0.5 rounded-xl border border-slate-600">
            <button
              type="button"
              onClick={scrollToTop}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg transition"
              title="เลื่อนขึ้นบนสุด"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={scrollToBottom}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg transition"
              title="เลื่อนลงล่างสุด (ดูลายเซ็น)"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Reporter & Approver Inputs */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-700/80 px-2 py-1 rounded-lg border border-slate-600">
              <span className="text-slate-300 font-bold text-[11px] whitespace-nowrap">ผู้จัดทำ:</span>
              <input
                type="text"
                placeholder="ชื่อผู้จัดทำ"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded px-2 py-0.5 text-xs text-white placeholder-slate-400 w-28 outline-none focus:border-purple-500"
                title="ชื่อผู้จัดทำรายงาน"
              />
              <input
                type="text"
                placeholder="ตำแหน่ง"
                value={reporterPosition}
                onChange={(e) => setReporterPosition(e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded px-2 py-0.5 text-xs text-white placeholder-slate-400 w-32 outline-none focus:border-purple-500"
                title="ตำแหน่งผู้จัดทำรายงาน"
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-700/80 px-2 py-1 rounded-lg border border-slate-600">
              <span className="text-slate-300 font-bold text-[11px] whitespace-nowrap">ผู้รับรอง:</span>
              <input
                type="text"
                placeholder="ชื่อผู้รับรอง"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded px-2 py-0.5 text-xs text-white placeholder-slate-400 w-28 outline-none focus:border-purple-500"
                title="ชื่อผู้ตรวจรับรอง"
              />
              <input
                type="text"
                placeholder="ตำแหน่ง"
                value={approverPosition}
                onChange={(e) => setApproverPosition(e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded px-2 py-0.5 text-xs text-white placeholder-slate-400 w-32 outline-none focus:border-purple-500"
                title="ตำแหน่งผู้ตรวจรับรอง"
              />
            </div>
          </div>

          {/* Print / Download buttons */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-heading font-bold text-xs rounded-xl border border-slate-500 transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">พิมพ์</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={isGeneratingImage || isGenerating}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-heading font-bold text-xs rounded-xl shadow-md border border-emerald-500 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="ส่งออกรายงานเป็นไฟล์รูปภาพ PNG ความละเอียดสูง"
          >
            {isGeneratingImage ? (
              <RotateCcw className="w-4 h-4 animate-spin" />
            ) : (
              <ImageIcon className="w-4 h-4" />
            )}
            <span>{isGeneratingImage ? 'กำลังบันทึกภาพ...' : 'ส่งออกเป็นรูปภาพ'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGenerating || isGeneratingImage}
            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-heading font-bold text-xs rounded-xl shadow-md border border-purple-500 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            {isGenerating ? (
              <RotateCcw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{isGenerating ? 'กำลังสร้าง...' : 'ดาวน์โหลด PDF'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Preview Container with guaranteed smooth scroll & touch */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 w-full overflow-y-auto overflow-x-auto min-h-0 p-2 sm:p-4 md:p-6 bg-slate-200/90 custom-scrollbar touch-auto focus:outline-none relative"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x pan-y',
          scrollBehavior: 'smooth'
        }}
        tabIndex={0}
        onWheel={(e) => {
          if (scrollContainerRef.current) {
            if (e.shiftKey) {
              scrollContainerRef.current.scrollLeft += e.deltaY || e.deltaX;
            } else {
              scrollContainerRef.current.scrollTop += e.deltaY;
            }
          }
        }}
        onKeyDown={(e) => {
          if (!scrollContainerRef.current) return;
          if (e.key === 'ArrowDown') {
            scrollContainerRef.current.scrollTop += 60;
          } else if (e.key === 'ArrowUp') {
            scrollContainerRef.current.scrollTop -= 60;
          } else if (e.key === 'PageDown' || e.key === ' ') {
            e.preventDefault();
            scrollContainerRef.current.scrollTop += 400;
          } else if (e.key === 'PageUp') {
            e.preventDefault();
            scrollContainerRef.current.scrollTop -= 400;
          } else if (e.key === 'Home') {
            e.preventDefault();
            scrollToTop();
          } else if (e.key === 'End') {
            e.preventDefault();
            scrollToBottom();
          }
        }}
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
          {pages.map((pageItems, pageIdx) => {
            const totalPages = pages.length;
            let startIdx = 1;
            if (pageIdx > 0) {
              startIdx = itemsPerPageFirst + (pageIdx - 1) * itemsPerPageNext + 1;
            }

            return (
              <div
                key={`page-${pageIdx}`}
                className={`a4-sheet bg-white text-gray-900 shadow-2xl p-6 sm:p-8 border border-gray-300 relative flex flex-col justify-between rounded-sm shrink-0 my-2 ${
                  orientation === 'landscape'
                    ? 'w-[1050px] min-h-[742px] max-w-none'
                    : 'w-[760px] min-h-[1075px] max-w-none'
                }`}
              >
                <div>
                  {/* Header Document Section */}
                  <div className="flex items-start justify-between border-b-2 border-gray-800 pb-3 mb-3">
                    <div className="flex items-center gap-3">
                      <img src={logo} alt="ตรา อบต." className="w-14 h-14 object-contain shrink-0" />
                      <div>
                        <h1 className="font-heading font-black text-base sm:text-lg text-gray-900 leading-tight">
                          รายงานทะเบียนหนังสือราชการ
                        </h1>
                        <p className="text-xs text-gray-700 mt-0.5">
                          งานป้องกันและบรรเทาสาธารณภัย องค์การบริหารส่วนตำบลม่อนจอง อำเภออมก๋อย จังหวัดเชียงใหม่
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-xs text-gray-700 shrink-0 font-medium">
                      <p>วันที่ออกรายงาน: <span className="font-bold text-gray-900">{reportDateStr}</span></p>
                      <p className="mt-0.5 text-purple-800 font-bold">
                        หน้า {pageIdx + 1} จาก {totalPages}
                      </p>
                    </div>
                  </div>

                  {/* Summary Statistics Strip - page 1 only */}
                  {pageIdx === 0 && (
                    <div className="grid grid-cols-6 gap-2 mb-3 text-center text-xs">
                      <div className="bg-gray-100 p-2 rounded border border-gray-300">
                        <span className="text-gray-500 block text-[10px]">เอกสารทั้งหมด</span>
                        <span className="font-bold text-gray-900 text-sm">{stats.total}</span>
                      </div>
                      <div className="bg-blue-50 p-2 rounded border border-blue-200">
                        <span className="text-blue-700 block text-[10px]">หนังสือรับ</span>
                        <span className="font-bold text-blue-900 text-sm">{stats.received}</span>
                      </div>
                      <div className="bg-emerald-50 p-2 rounded border border-emerald-200">
                        <span className="text-emerald-700 block text-[10px]">หนังสือส่ง</span>
                        <span className="font-bold text-emerald-900 text-sm">{stats.sent}</span>
                      </div>
                      <div className="bg-purple-50 p-2 rounded border border-purple-200">
                        <span className="text-purple-700 block text-[10px]">ประกาศ</span>
                        <span className="font-bold text-purple-900 text-sm">{stats.announcement}</span>
                      </div>
                      <div className="bg-rose-50 p-2 rounded border border-rose-200">
                        <span className="text-rose-700 block text-[10px]">คำสั่ง</span>
                        <span className="font-bold text-rose-900 text-sm">{stats.order}</span>
                      </div>
                      <div className="bg-amber-50 p-2 rounded border border-amber-200">
                        <span className="text-amber-700 block text-[10px]">แบบคำร้อง</span>
                        <span className="font-bold text-amber-900 text-sm">{stats.petition}</span>
                      </div>
                    </div>
                  )}

                  {/* Table - without inner scroll capture so full page scrolls naturally */}
                  <div className="w-full mb-3 overflow-visible">
                    <table className="w-full text-left border-collapse text-xs" style={{ border: '1px solid #4b5563' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                          <th style={{ border: '1px solid #4b5563', padding: '5px 4px', width: '44px', minWidth: '44px', textAlign: 'center', whiteSpace: 'nowrap' }}>ลำดับ</th>
                          <th style={{ border: '1px solid #4b5563', padding: '5px 7px', width: '85px', textAlign: 'center' }}>วันที่</th>
                          <th style={{ border: '1px solid #4b5563', padding: '5px 7px', width: '110px' }}>เลขที่หนังสือ</th>
                          <th style={{ border: '1px solid #4b5563', padding: '5px 7px', width: '85px', textAlign: 'center' }}>ประเภท</th>
                          <th style={{ border: '1px solid #4b5563', padding: '5px 7px' }}>เรื่อง</th>
                          <th style={{ border: '1px solid #4b5563', padding: '5px 7px', width: '120px' }}>หน่วยงาน/ถึง</th>
                          <th style={{ border: '1px solid #4b5563', padding: '5px 7px', width: '75px', textAlign: 'center' }}>ตู้/แฟ้ม</th>
                          <th style={{ border: '1px solid #4b5563', padding: '5px 7px', width: '100px' }}>หมายเหตุ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageItems.length === 0 ? (
                          <tr>
                            <td colSpan={8} style={{ border: '1px solid #4b5563', padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                              ไม่มีข้อมูลหนังสือราชการตามเงื่อนไขที่เลือก
                            </td>
                          </tr>
                        ) : (
                          pageItems.map((doc, index) => {
                            const itemNum = startIdx + index;
                            return (
                              <tr key={doc.id || index}>
                                <td style={{ border: '1px solid #4b5563', padding: '5px 4px', width: '44px', minWidth: '44px', textAlign: 'center', whiteSpace: 'nowrap', fontWeight: 600 }}>{itemNum}</td>
                                <td style={{ border: '1px solid #4b5563', padding: '5px 7px', textAlign: 'center' }}>{doc.date ? formatThaiDate(doc.date) : '-'}</td>
                                <td style={{ border: '1px solid #4b5563', padding: '5px 7px', fontWeight: 600 }}>
                                  {doc.docNo || '-'}
                                  {doc.receiveNo && <span className="block text-[10px] text-gray-500">รับ: {doc.receiveNo}</span>}
                                </td>
                                <td style={{ border: '1px solid #4b5563', padding: '5px 7px', textAlign: 'center', fontWeight: 600 }}>
                                  {doc.docType}
                                </td>
                                <td style={{ border: '1px solid #4b5563', padding: '5px 7px', fontWeight: 500 }}>
                                  {doc.subject}
                                </td>
                                <td style={{ border: '1px solid #4b5563', padding: '5px 7px' }}>
                                  {doc.agency || '-'}
                                </td>
                                <td style={{ border: '1px solid #4b5563', padding: '5px 7px', textAlign: 'center', fontWeight: 600 }}>
                                  {doc.shelfNo || '-'}
                                </td>
                                <td style={{ border: '1px solid #4b5563', padding: '5px 7px', color: '#4b5563', fontSize: '11px' }}>
                                  {doc.docType === 'แบบคำร้อง' ? (
                                    <div className="space-y-0.5">
                                      {doc.petitionStatus && <span className="font-semibold text-gray-800 block">สถานะ: {doc.petitionStatus}</span>}
                                      {doc.surveyDate && <span className="block text-[10px] text-gray-600">วันสำรวจ: {formatThaiDate(doc.surveyDate)}</span>}
                                      {doc.helpDetail && <span className="block text-[10px] text-emerald-700">การช่วยเหลือ: {doc.helpDetail}</span>}
                                      {doc.noHelpReason && <span className="block text-[10px] text-rose-700">เหตุผล: {doc.noHelpReason}</span>}
                                      {doc.note && <span className="block text-[10px] text-gray-500">{doc.note}</span>}
                                      {!doc.petitionStatus && !doc.note && '-'}
                                    </div>
                                  ) : (
                                    doc.note || '-'
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Signatures & Footer Notice */}
                <div>
                  {pageIdx === totalPages - 1 && (
                    <div className="grid grid-cols-2 gap-8 pt-4 mt-2 text-xs border-t border-gray-300">
                      <div className="text-center space-y-1">
                        <p>ลงชื่อ ................................................................ ผู้จัดทำรายงาน</p>
                        <p className="font-bold text-gray-800">({reporterName ? reporterName : '................................................................'})</p>
                        <p className="text-gray-600">{reporterPosition ? `ตำแหน่ง ${reporterPosition}` : 'ตำแหน่ง ................................................................'}</p>
                      </div>

                      <div className="text-center space-y-1">
                        <p>ลงชื่อ ................................................................ ผู้ตรวจรับรอง</p>
                        <p className="font-bold text-gray-800">({approverName ? approverName : '................................................................'})</p>
                        <p className="text-gray-600">{approverPosition ? `ตำแหน่ง ${approverPosition}` : 'ตำแหน่ง ................................................................'}</p>
                      </div>
                    </div>
                  )}

                  {/* Footer Notice */}
                  <div className="mt-3 pt-2 border-t border-gray-200 text-center text-[10px] text-gray-500 flex justify-between items-center">
                    <span>งานสารบรรณ งานป้องกันและบรรเทาสาธารณภัย อบต.ม่อนจอง</span>
                    <span className="font-semibold text-gray-700">หน้า {pageIdx + 1} จาก {totalPages}</span>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </div>

        {/* Floating Quick Navigation & Scroll Indicator Bar */}
        <div className="sticky bottom-3 z-30 bg-slate-900/90 text-white backdrop-blur-md px-4 py-2 rounded-full shadow-2xl border border-slate-700 flex items-center gap-3 text-xs shrink-0 select-none">
          <span className="text-[11px] text-slate-300">
            เอกสารทั้งหมด <span className="font-bold text-purple-400">{pages.length}</span> หน้า (ซูม {zoom}%)
          </span>
          <div className="h-3 w-px bg-slate-700" />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={scrollToTop}
              className="flex items-center gap-1 px-2 py-0.5 hover:bg-slate-800 rounded-md text-[11px] text-slate-300 hover:text-white transition"
              title="เลื่อนไปบนสุด"
            >
              <ChevronUp className="w-3.5 h-3.5 text-purple-400" />
              <span>บนสุด</span>
            </button>
            <button
              type="button"
              onClick={scrollToBottom}
              className="flex items-center gap-1 px-2 py-0.5 hover:bg-slate-800 rounded-md text-[11px] text-slate-300 hover:text-white transition"
              title="เลื่อนไปล่างสุด (ตรวจสอบลายเซ็น)"
            >
              <ChevronDown className="w-3.5 h-3.5 text-purple-400" />
              <span>ล่างสุด</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
