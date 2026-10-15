import React, { useRef, useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ExpenseRecord } from '../types';
import { Printer, Download, X, Coins, RotateCcw, ZoomIn, ZoomOut, ChevronUp, ChevronDown, Image as ImageIcon } from 'lucide-react';
import logo from '../assets/logo.png';
import { getThaiTodayStr } from '../utils/dateUtils';
import { printElement, downloadPdfFromContainer, downloadImageFromContainer } from '../utils/pdfExport';

interface ExpensesPdfModalProps {
  expenses: ExpenseRecord[];
  allExpenses?: ExpenseRecord[];
  currentFilterPlan?: string;
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

export default function ExpensesPdfModal({
  expenses,
  allExpenses = [],
  currentFilterPlan = 'all',
  searchQuery = '',
  onClose,
  showToast
}: ExpensesPdfModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [dataSource, setDataSource] = useState<'filtered' | 'all'>('filtered');
  const [selectedPlan, setSelectedPlan] = useState<string>(currentFilterPlan);
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

  const baseList = dataSource === 'filtered' ? expenses : (allExpenses.length > 0 ? allExpenses : expenses);

  const uniquePlans = useMemo(() => {
    const full = allExpenses.length > 0 ? allExpenses : expenses;
    return Array.from(new Set(full.map(e => e.planName).filter(Boolean)));
  }, [allExpenses, expenses]);

  const activeExpenses = useMemo(() => {
    return baseList.filter(e => {
      if (selectedPlan !== 'all' && e.planName !== selectedPlan) return false;
      return true;
    });
  }, [baseList, selectedPlan]);

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
    if (activeExpenses.length === 0) return [[]];
    const result: ExpenseRecord[][] = [];
    let remaining = [...activeExpenses];

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
  }, [activeExpenses, itemsPerPageFirst, itemsPerPageNext]);

  const reportDateStr = useMemo(() => {
    return formatThaiDate(getThaiTodayStr());
  }, []);

  const stats = useMemo(() => {
    const count = activeExpenses.length;
    const totalPlanned = activeExpenses.reduce((acc, curr) => acc + (Number(curr.plannedBudget) || 0), 0);
    const totalSpent = activeExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const remaining = totalPlanned - totalSpent;
    return { count, totalPlanned, totalSpent, remaining };
  }, [activeExpenses]);

  const handlePrint = () => {
    if (!printRef.current) return;
    printElement(printRef.current, 'รายงานบัญชีรายจ่ายและงบประมาณ - อบต.ม่อนจอง', orientation === 'landscape', showToast);
  };

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const handleDownloadImage = async () => {
    if (!printRef.current) return;
    await downloadImageFromContainer({
      container: printRef.current,
      filename: `รายงานรายจ่ายและงบประมาณ_${getThaiTodayStr()}.png`,
      format: 'png',
      onProgress: setIsGeneratingImage,
      showToast
    });
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    await downloadPdfFromContainer({
      container: printRef.current,
      filename: `รายงานรายจ่ายและงบประมาณ_${getThaiTodayStr()}.pdf`,
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
          <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg border border-emerald-500/30 shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading font-black text-xs sm:text-sm md:text-base text-white flex items-center gap-2">
              <span>พิมพ์และส่งออกรายงานบัญชีรายจ่ายและงบประมาณ</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-900/80 text-emerald-300 text-[10px] font-bold border border-emerald-700/50">
                {pages.length} หน้า A4
              </span>
            </h2>
            <p className="text-[10px] sm:text-[11px] text-slate-300">
              พรีวิวรายงานเอกสารมาตรฐาน A4 (ศูนย์ป้องกันและบรรเทาสาธารณภัย อบต.ม่อนจอง)
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
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
              className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-md font-bold text-[10px] transition cursor-pointer"
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

          <button
            type="button"
            onClick={handlePrint}
            disabled={isGenerating}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-heading font-bold text-xs rounded-xl border border-slate-500 transition flex items-center gap-1.5 cursor-pointer"
            title="พิมพ์เอกสาร"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">พิมพ์</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={isGeneratingImage || isGenerating}
            className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-heading font-bold text-xs rounded-xl shadow-md border border-teal-500 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
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
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-heading font-bold text-xs rounded-xl shadow-md border border-emerald-500 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
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
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition ml-1"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

        {/* Options Toolbar */}
        <div className="px-4 sm:px-6 py-2.5 bg-gray-50/90 border-b border-gray-200 flex flex-wrap items-center gap-3 text-xs font-heading shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-bold">ข้อมูล:</span>
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setDataSource('filtered')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                  dataSource === 'filtered' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                ตามที่กรอง ({expenses.length})
              </button>
              <button
                type="button"
                onClick={() => setDataSource('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                  dataSource === 'all' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                ทั้งหมด ({allExpenses.length || expenses.length})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-bold">แผนงาน:</span>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 outline-none"
            >
              <option value="all">ทุกแผนงาน</option>
              {uniquePlans.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-bold">การวางแนว:</span>
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                  orientation === 'landscape' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                แนวนอน
              </button>
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                  orientation === 'portrait' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                แนวตั้ง
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-bold">แบ่งหน้า:</span>
            <select
              value={itemsPerPageSetting}
              onChange={(e) => {
                const val = e.target.value;
                setItemsPerPageSetting(val === 'auto' ? 'auto' : Number(val));
              }}
              className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 outline-none"
            >
              <option value="auto">อัตโนมัติ (A4 Standard)</option>
              <option value="8">8 รายการ / หน้า</option>
              <option value="10">10 รายการ / หน้า</option>
              <option value="12">12 รายการ / หน้า</option>
              <option value="15">15 รายการ / หน้า</option>
              <option value="20">20 รายการ / หน้า</option>
            </select>
          </div>

          <div className="hidden lg:flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1 bg-gray-50/80 px-2 py-1 rounded-lg border border-gray-200">
              <span className="text-gray-500 font-bold text-[11px] whitespace-nowrap">ผู้จัดทำ:</span>
              <input
                type="text"
                placeholder="ชื่อผู้จัดทำ"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                className="bg-white border border-gray-200 rounded-md px-2 py-0.5 text-xs text-gray-700 w-28 outline-none focus:border-sky-500"
                title="ชื่อผู้จัดทำรายงาน"
              />
              <input
                type="text"
                placeholder="ตำแหน่ง"
                value={reporterPosition}
                onChange={(e) => setReporterPosition(e.target.value)}
                className="bg-white border border-gray-200 rounded-md px-2 py-0.5 text-xs text-gray-700 w-32 outline-none focus:border-sky-500"
                title="ตำแหน่งผู้จัดทำรายงาน"
              />
            </div>
            <div className="flex items-center gap-1 bg-gray-50/80 px-2 py-1 rounded-lg border border-gray-200">
              <span className="text-gray-500 font-bold text-[11px] whitespace-nowrap">ผู้รับรอง:</span>
              <input
                type="text"
                placeholder="ชื่อผู้รับรอง"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                className="bg-white border border-gray-200 rounded-md px-2 py-0.5 text-xs text-gray-700 w-28 outline-none focus:border-sky-500"
                title="ชื่อผู้ตรวจรับรองรายงาน"
              />
              <input
                type="text"
                placeholder="ตำแหน่ง"
                value={approverPosition}
                onChange={(e) => setApproverPosition(e.target.value)}
                className="bg-white border border-gray-200 rounded-md px-2 py-0.5 text-xs text-gray-700 w-32 outline-none focus:border-sky-500"
                title="ตำแหน่งผู้ตรวจรับรองรายงาน"
              />
            </div>
          </div>
        </div>

        {/* Paper Document Preview with guaranteed smooth scrolling */}
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
                    {/* Header */}
                    <div className="flex items-start justify-between border-b-2 border-gray-800 pb-3 mb-3">
                      <div className="flex items-center gap-3">
                        <img src={logo} alt="ตรา อบต.ม่อนจอง" className="w-14 h-14 object-contain shrink-0" />
                        <div>
                          <h1 className="font-heading font-black text-base sm:text-lg text-gray-900 leading-tight">
                            รายงานบัญชีรายจ่ายและการเบิกจ่ายงบประมาณ
                          </h1>
                          <p className="text-xs text-gray-700 mt-0.5">
                            งานป้องกันและบรรเทาสาธารณภัย องค์การบริหารส่วนตำบลม่อนจอง อำเภออมก๋อย จังหวัดเชียงใหม่
                          </p>
                        </div>
                      </div>

                      <div className="text-right text-xs text-gray-700 shrink-0 font-medium">
                        <p>วันที่ออกรายงาน: <span className="font-bold text-gray-900">{reportDateStr}</span></p>
                        <p className="mt-0.5 text-emerald-800 font-bold">
                          หน้า {pageIdx + 1} จาก {totalPages}
                        </p>
                      </div>
                    </div>

                    {/* Stats summary cards - only on first page */}
                    {pageIdx === 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-center">
                        <div className="p-2 bg-gray-50 border border-gray-300 rounded">
                          <p className="text-[10px] text-gray-600 font-semibold">รายการรวม</p>
                          <p className="text-xs font-bold text-gray-900">{stats.count} รายการ</p>
                        </div>
                        <div className="p-2 bg-blue-50/70 border border-blue-300 rounded">
                          <p className="text-[10px] text-blue-800 font-semibold">งบประมาณตามแผน</p>
                          <p className="text-xs font-bold text-blue-900">
                            {stats.totalPlanned.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                          </p>
                        </div>
                        <div className="p-2 bg-rose-50/70 border border-rose-300 rounded">
                          <p className="text-[10px] text-rose-800 font-semibold">ยอดเบิกจ่ายจริง</p>
                          <p className="text-xs font-bold text-rose-900">
                            {stats.totalSpent.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                          </p>
                        </div>
                        <div className="p-2 bg-emerald-50/70 border border-emerald-300 rounded">
                          <p className="text-[10px] text-emerald-800 font-semibold">งบประมาณคงเหลือ</p>
                          <p className="text-xs font-bold text-emerald-900">
                            {stats.remaining.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Main Table without inner scroll trap */}
                    <div className="w-full mb-3 overflow-visible">
                      <table className="w-full text-left border-collapse text-xs" style={{ border: '1px solid #4b5563' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f3f4f6' }}>
                            <th style={{ border: '1px solid #4b5563', padding: '5px 4px', width: '44px', minWidth: '44px', textAlign: 'center', whiteSpace: 'nowrap' }}>ลำดับ</th>
                            <th style={{ border: '1px solid #4b5563', padding: '5px 7px', width: '85px' }}>วันที่</th>
                            <th style={{ border: '1px solid #4b5563', padding: '5px 7px' }}>รายการ / เพื่อจ่ายเป็นค่า</th>
                            <th style={{ border: '1px solid #4b5563', padding: '5px 7px', width: '110px' }}>แผนงาน</th>
                            <th style={{ border: '1px solid #4b5563', padding: '5px 7px', width: '120px' }}>งบ / โครงการ</th>
                            <th style={{ border: '1px solid #4b5563', padding: '5px 7px', width: '95px', textAlign: 'right' }}>งบตามแผน (บาท)</th>
                            <th style={{ border: '1px solid #4b5563', padding: '5px 7px', width: '95px', textAlign: 'right' }}>ยอดเบิกจ่าย (บาท)</th>
                            <th style={{ border: '1px solid #4b5563', padding: '5px 7px', width: '90px' }}>หมายเหตุ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageItems.length === 0 ? (
                            <tr>
                              <td colSpan={8} style={{ border: '1px solid #4b5563', padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                                ไม่พบข้อมูลรายจ่ายตามเงื่อนไขที่เลือก
                              </td>
                            </tr>
                          ) : (
                            pageItems.map((exp, index) => {
                              const itemNum = startIdx + index;
                              const amountNum = Number(exp.amount) || 0;
                              const plannedNum = Number(exp.plannedBudget) || 0;
                              return (
                                <tr key={exp.id}>
                                  <td style={{ border: '1px solid #4b5563', padding: '5px 4px', width: '44px', minWidth: '44px', textAlign: 'center', whiteSpace: 'nowrap', fontWeight: 600 }}>{itemNum}</td>
                                  <td style={{ border: '1px solid #4b5563', padding: '5px 7px' }}>{formatThaiDate(exp.date)}</td>
                                  <td style={{ border: '1px solid #4b5563', padding: '5px 7px' }}>
                                    <p className="font-bold text-gray-900">{exp.item}</p>
                                    {exp.purpose && <p className="text-[10px] text-gray-600">เพื่อ: {exp.purpose}</p>}
                                  </td>
                                  <td style={{ border: '1px solid #4b5563', padding: '5px 7px' }}>{exp.planName || '-'}</td>
                                  <td style={{ border: '1px solid #4b5563', padding: '5px 7px' }}>
                                    <p>{exp.budget || '-'}</p>
                                    {exp.project && <p className="text-[10px] text-gray-500">{exp.project}</p>}
                                  </td>
                                  <td style={{ border: '1px solid #4b5563', padding: '5px 7px', textAlign: 'right', color: '#2563eb' }}>
                                    {plannedNum > 0 ? plannedNum.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
                                  </td>
                                  <td style={{ border: '1px solid #4b5563', padding: '5px 7px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                                    {amountNum.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td style={{ border: '1px solid #4b5563', padding: '5px 7px', color: '#6b7280', fontSize: '11px' }}>
                                    {exp.note || exp.details || '-'}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                        {/* Footer summary row on last page */}
                        {pageIdx === totalPages - 1 && activeExpenses.length > 0 && (
                          <tfoot>
                            <tr style={{ backgroundColor: '#f9fafb', fontWeight: 700 }}>
                              <td colSpan={5} style={{ border: '1px solid #4b5563', padding: '5px 7px', textAlign: 'center' }}>
                                รวมทั้งสิ้น ({activeExpenses.length} รายการ)
                              </td>
                              <td style={{ border: '1px solid #4b5563', padding: '5px 7px', textAlign: 'right', color: '#1d4ed8' }}>
                                {stats.totalPlanned.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                              </td>
                              <td style={{ border: '1px solid #4b5563', padding: '5px 7px', textAlign: 'right', color: '#b91c1c' }}>
                                {stats.totalSpent.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                              </td>
                              <td style={{ border: '1px solid #4b5563', padding: '5px 7px' }}></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>

                  {/* Bottom section (signatures only on last page) */}
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
                      <span>เอกสารนี้สร้างจากระบบสารสนเทศงานป้องกันและบรรเทาสาธารณภัย อบต.ม่อนจอง</span>
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
              เอกสารทั้งหมด <span className="font-bold text-emerald-400">{pages.length}</span> หน้า (ซูม {zoom}%)
            </span>
            <div className="h-3 w-px bg-slate-700" />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={scrollToTop}
                className="flex items-center gap-1 px-2 py-0.5 hover:bg-slate-800 rounded-md text-[11px] text-slate-300 hover:text-white transition cursor-pointer"
                title="เลื่อนไปบนสุด"
              >
                <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>บนสุด</span>
              </button>
              <button
                type="button"
                onClick={scrollToBottom}
                className="flex items-center gap-1 px-2 py-0.5 hover:bg-slate-800 rounded-md text-[11px] text-slate-300 hover:text-white transition cursor-pointer"
                title="เลื่อนไปล่างสุด (ตรวจสอบลายเซ็น)"
              >
                <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                <span>ล่างสุด</span>
              </button>
            </div>
          </div>
        </div>
    </div>,
    document.body
  );
}
