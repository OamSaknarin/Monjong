import React, { useRef, useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Equipment, BorrowRecord, DispenseRecord } from '../types';
import { Printer, Download, X, Package, RotateCcw, HandHelping, ZoomIn, ZoomOut, ChevronUp, ChevronDown, ClipboardList, Image as ImageIcon } from 'lucide-react';
import logo from '../assets/logo.png';
import { getThaiTodayStr } from '../utils/dateUtils';
import { printElement, downloadPdfFromContainer, downloadImageFromContainer } from '../utils/pdfExport';

interface EquipmentPdfModalProps {
  equipment: Equipment[];
  allEquipment?: Equipment[];
  borrows: BorrowRecord[];
  dispenses?: DispenseRecord[];
  getStockInfo?: (item: Equipment) => { total: number; borrowed: number; dispensed?: number; available: number };
  initialMode?: 'inventory' | 'borrows' | 'dispenses';
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

export default function EquipmentPdfModal({
  equipment,
  borrows,
  dispenses = [],
  getStockInfo,
  initialMode = 'inventory',
  onClose,
  showToast
}: EquipmentPdfModalProps) {
  const effectiveGetStockInfo = (item: Equipment) => {
    if (getStockInfo) return getStockInfo(item);
    const itemBorrows = (borrows || []).filter(b => b.itemId === item.id && !b.returnedDate);
    const borrowed = itemBorrows.reduce((sum, b) => sum + (Number(b.qty) || 1), 0);
    const itemDispenses = (dispenses || []).filter(d => d.itemId === item.id && d.status !== 'ยกเลิก');
    const dispensed = itemDispenses.reduce((sum, d) => sum + (Number(d.qty) || 1), 0);
    const total = Number(item.qty) || 1;
    const available = Math.max(0, total - borrowed - dispensed);
    return { total, borrowed, dispensed, available };
  };
  const [mode, setMode] = useState<'inventory' | 'borrows' | 'dispenses'>(initialMode);
  const [isGenerating, setIsGenerating] = useState(false);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
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



  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(equipment.map(e => e.type || 'ทั่วไป'))).filter(Boolean);
  }, [equipment]);

  // Filtered equipment
  const filteredEquipment = useMemo(() => {
    return equipment.filter(item => {
      const matchType = filterType === 'all' || item.type === filterType;
      const matchStatus = filterStatus === 'all' || item.status === filterStatus;
      return matchType && matchStatus;
    });
  }, [equipment, filterType, filterStatus]);

  // Filtered borrows
  const filteredBorrows = useMemo(() => {
    return borrows.filter(b => {
      if (filterStatus === 'borrowed') return !b.returnedDate;
      if (filterStatus === 'returned') return !!b.returnedDate;
      return true;
    });
  }, [borrows, filterStatus]);

  // Inventory stats
  const inventoryStats = useMemo(() => {
    let totalItems = 0;
    let normalCount = 0;
    let damagedCount = 0;
    let brokenCount = 0;
    let totalBorrowedUnits = 0;
    let totalDispensedUnits = 0;
    let totalAvailableUnits = 0;

    filteredEquipment.forEach(item => {
      const { total, borrowed, dispensed = 0, available } = effectiveGetStockInfo(item);
      totalItems += total;
      totalBorrowedUnits += borrowed;
      totalDispensedUnits += dispensed;
      totalAvailableUnits += available;
      if (item.status === 'ปกติ') normalCount++;
      else if (item.status === 'ชำรุด') damagedCount++;
      else if (item.status === 'เสีย' || item.status === 'จำหน่าย') brokenCount++;
    });

    return {
      kinds: filteredEquipment.length,
      totalUnits: totalItems,
      normalKinds: normalCount,
      issueKinds: damagedCount + brokenCount,
      borrowedUnits: totalBorrowedUnits,
      dispensedUnits: totalDispensedUnits,
      availableUnits: totalAvailableUnits
    };
  }, [filteredEquipment, getStockInfo, borrows, dispenses]);

  // Filtered dispenses
  const filteredDispenses = useMemo(() => {
    return (dispenses || []).filter(d => {
      if (filterStatus === 'dispensed') return d.status === 'เบิกจ่ายแล้ว';
      if (filterStatus === 'pending') return d.status === 'รออนุมัติ';
      if (filterStatus === 'cancelled') return d.status === 'ยกเลิก';
      return true;
    });
  }, [dispenses, filterStatus]);

  // Dispenses stats
  const dispenseStats = useMemo(() => {
    const total = filteredDispenses.length;
    const dispensed = filteredDispenses.filter(d => d.status === 'เบิกจ่ายแล้ว').length;
    const pending = filteredDispenses.filter(d => d.status === 'รออนุมัติ').length;
    const totalUnits = filteredDispenses.reduce((acc, d) => acc + (Number(d.qty) || 1), 0);
    return { total, dispensed, pending, totalUnits };
  }, [filteredDispenses]);

  // Borrows stats
  const borrowStats = useMemo(() => {
    const total = filteredBorrows.length;
    const active = filteredBorrows.filter(b => !b.returnedDate).length;
    const returned = filteredBorrows.filter(b => !!b.returnedDate).length;
    return { total, active, returned };
  }, [filteredBorrows]);

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

  const activeItems = mode === 'inventory' ? filteredEquipment : mode === 'borrows' ? filteredBorrows : filteredDispenses;

  const pages = useMemo(() => {
    if (activeItems.length === 0) return [[]];
    const result: any[][] = [];
    let remaining = [...activeItems];

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
  }, [activeItems, itemsPerPageFirst, itemsPerPageNext]);

  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    if (!printRef.current || isPrinting || isGenerating) return;
    setIsPrinting(true);
    const reportTitle = mode === 'inventory'
      ? 'รายงานพัสดุครุภัณฑ์ - อบต.ม่อนจอง'
      : mode === 'borrows'
      ? 'รายงานประวัติการยืม-คืนพัสดุ - อบต.ม่อนจอง'
      : 'รายงานประวัติการเบิกพัสดุ - อบต.ม่อนจอง';
    try {
      await printElement(printRef.current, reportTitle, orientation === 'landscape', showToast);
    } catch (err) {
      console.error('Print error:', err);
      showToast('เกิดข้อผิดพลาดในการพิมพ์', 'error');
    } finally {
      setIsPrinting(false);
    }
  };

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const handleDownloadImage = async () => {
    if (!printRef.current) return;
    const baseName = mode === 'inventory' 
      ? `ทะเบียนครุภัณฑ์_อบตม่อนจอง_${getThaiTodayStr()}`
      : mode === 'borrows'
      ? `รายงานการยืมคืน_อบตม่อนจอง_${getThaiTodayStr()}`
      : `รายงานการเบิกพัสดุ_อบตม่อนจอง_${getThaiTodayStr()}`;

    await downloadImageFromContainer({
      container: printRef.current,
      filename: `${baseName}.png`,
      format: 'png',
      onProgress: setIsGeneratingImage,
      showToast
    });
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    const fileName = mode === 'inventory' 
      ? `ทะเบียนครุภัณฑ์_อบตม่อนจอง_${getThaiTodayStr()}.pdf`
      : mode === 'borrows'
      ? `รายงานการยืมคืน_อบตม่อนจอง_${getThaiTodayStr()}.pdf`
      : `รายงานการเบิกพัสดุ_อบตม่อนจอง_${getThaiTodayStr()}.pdf`;

    await downloadPdfFromContainer({
      container: printRef.current,
      filename: fileName,
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
          <div className="p-2 bg-sky-600/20 text-sky-400 rounded-lg border border-sky-500/30 shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading font-black text-xs sm:text-sm md:text-base text-white flex items-center gap-2">
              <span>พิมพ์และส่งออกรายงานพัสดุครุภัณฑ์</span>
              <span className="px-2 py-0.5 rounded-full bg-sky-900/80 text-sky-300 text-[10px] font-bold border border-sky-700/50">
                {pages.length} หน้า A4
              </span>
            </h2>
            <p className="text-[10px] sm:text-[11px] text-slate-300">
              พรีวิวรายงานเอกสารมาตรฐาน A4 (งานคลังพัสดุ อบต.ม่อนจอง)
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
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg transition cursor-pointer"
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
              className="px-2 py-1 bg-sky-700 hover:bg-sky-600 text-white rounded-md font-bold text-[10px] transition cursor-pointer"
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
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg transition cursor-pointer"
              title="เลื่อนขึ้นบนสุด"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={scrollToBottom}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-600 rounded-lg transition cursor-pointer"
              title="เลื่อนลงล่างสุด (ดูลายเซ็น)"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting || isGenerating}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-heading font-bold text-xs rounded-xl border border-slate-500 transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            title="พิมพ์เอกสาร"
          >
            {isPrinting ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{isPrinting ? 'กำลังพิมพ์...' : 'พิมพ์'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={isGeneratingImage || isGenerating || isPrinting}
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
            disabled={isGenerating || isGeneratingImage || isPrinting}
            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-heading font-bold text-xs rounded-xl shadow-md border border-sky-500 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="ดาวน์โหลดเป็นไฟล์ PDF"
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
        <div className="px-6 py-3 bg-gray-50/70 border-b border-gray-100 flex flex-wrap items-center gap-4 text-xs font-heading shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-bold">ประเภทรายงาน:</span>
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setMode('inventory')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 ${
                  mode === 'inventory' ? 'bg-sky-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>คลังพัสดุ ({equipment.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('borrows')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 ${
                  mode === 'borrows' ? 'bg-sky-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <HandHelping className="w-3.5 h-3.5" />
                <span>ประวัติยืม-คืน ({borrows.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('dispenses')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 ${
                  mode === 'dispenses' ? 'bg-sky-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>ประวัติการเบิกจ่าย ({dispenses.length})</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-bold">การวางแนว:</span>
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                  orientation === 'landscape' ? 'bg-sky-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                แนวนอน (แนะนำ)
              </button>
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                  orientation === 'portrait' ? 'bg-sky-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                แนวตั้ง
              </button>
            </div>
          </div>

          {mode === 'inventory' ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-bold">หมวดหมู่:</span>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 outline-none"
                >
                  <option value="all">ทุกหมวดหมู่ ({equipment.length})</option>
                  {uniqueTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-bold">สภาพ:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 outline-none"
                >
                  <option value="all">ทุกสถานะ</option>
                  <option value="ปกติ">ปกติ</option>
                  <option value="ชำรุด">ชำรุด</option>
                  <option value="เสีย">เสีย</option>
                  <option value="จำหน่าย">จำหน่าย</option>
                </select>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 font-bold">สถานะการยืม:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 outline-none"
              >
                <option value="all">รายการทั้งหมด ({borrows.length})</option>
                <option value="borrowed">กำลังยืมอยู่ (ยังไม่คืน)</option>
                <option value="returned">คืนพัสดุแล้ว</option>
              </select>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <div className="flex items-center gap-1.5 bg-gray-50/80 px-2 py-1 rounded-lg border border-gray-200">
              <span className="text-gray-500 font-bold text-[11px] whitespace-nowrap">ผู้รายงาน:</span>
              <input
                type="text"
                placeholder="ชื่อผู้รายงาน"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                className="bg-white border border-gray-200 rounded-md px-2 py-0.5 text-xs text-gray-700 w-32 outline-none focus:border-sky-500"
                title="ชื่อผู้จัดทำรายงาน"
              />
              <input
                type="text"
                placeholder="ตำแหน่งผู้รายงาน"
                value={reporterPosition}
                onChange={(e) => setReporterPosition(e.target.value)}
                className="bg-white border border-gray-200 rounded-md px-2 py-0.5 text-xs text-gray-700 w-36 outline-none focus:border-sky-500"
                title="ตำแหน่งผู้จัดทำรายงาน"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-gray-50/80 px-2 py-1 rounded-lg border border-gray-200">
              <span className="text-gray-500 font-bold text-[11px] whitespace-nowrap">ผู้ตรวจรับรอง:</span>
              <input
                type="text"
                placeholder="ชื่อผู้ตรวจรับรอง"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                className="bg-white border border-gray-200 rounded-md px-2 py-0.5 text-xs text-gray-700 w-32 outline-none focus:border-sky-500"
                title="ชื่อผู้รับรองรายงาน"
              />
              <input
                type="text"
                placeholder="ตำแหน่งผู้ตรวจรับรอง"
                value={approverPosition}
                onChange={(e) => setApproverPosition(e.target.value)}
                className="bg-white border border-gray-200 rounded-md px-2 py-0.5 text-xs text-gray-700 w-36 outline-none focus:border-sky-500"
                title="ตำแหน่งผู้รับรองรายงาน"
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
                            {mode === 'inventory' 
                              ? 'ทะเบียนบัญชีคุมพัสดุ ครุภัณฑ์ และเครื่องมือบรรเทาสาธารณภัย'
                              : mode === 'borrows'
                              ? 'รายงานประวัติการยืม-คืนพัสดุและอุปกรณ์กู้ชีพกู้ภัย'
                              : 'รายงานประวัติการเบิกพัสดุ ครุภัณฑ์ และวัสดุอุปกรณ์'}
                          </h1>
                          <p className="text-xs text-gray-700 mt-0.5">
                            งานป้องกันและบรรเทาสาธารณภัย องค์การบริหารส่วนตำบลม่อนจอง อำเภออมก๋อย จังหวัดเชียงใหม่
                          </p>
                        </div>
                      </div>

                      <div className="text-right text-xs text-gray-700 shrink-0 font-medium">
                        <p>วันที่ออกรายงาน: <span className="font-bold text-gray-900">{reportDateStr}</span></p>
                        <p className="mt-0.5 text-sky-800 font-bold">
                          หน้า {pageIdx + 1} จาก {totalPages}
                        </p>
                      </div>
                    </div>

                    {/* Stats summary cards - only on page 1 */}
                    {pageIdx === 0 && (
                      mode === 'inventory' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 mb-3 text-center">
                          <div className="p-2 bg-gray-50 border border-gray-300 rounded">
                            <p className="text-[10px] text-gray-600 font-semibold">จำนวนชนิดพัสดุ</p>
                            <p className="text-xs font-bold text-gray-900">{inventoryStats.kinds} ชนิด</p>
                          </div>
                          <div className="p-2 bg-gray-50 border border-gray-300 rounded">
                            <p className="text-[10px] text-gray-600 font-semibold">ยอดรวมทั้งสิ้น</p>
                            <p className="text-xs font-bold text-sky-800">{inventoryStats.totalUnits} หน่วย</p>
                          </div>
                          <div className="p-2 bg-emerald-50/70 border border-emerald-300 rounded">
                            <p className="text-[10px] text-emerald-800 font-semibold">สภาพปกติ</p>
                            <p className="text-xs font-bold text-emerald-900">{inventoryStats.normalKinds} ชนิด</p>
                          </div>
                          <div className="p-2 bg-amber-50/70 border border-amber-300 rounded">
                            <p className="text-[10px] text-amber-800 font-semibold">ชำรุด / เสีย</p>
                            <p className="text-xs font-bold text-amber-900">{inventoryStats.issueKinds} ชนิด</p>
                          </div>
                          <div className="p-2 bg-blue-50/70 border border-blue-300 rounded">
                            <p className="text-[10px] text-blue-800 font-semibold">ถูกยืมอยู่</p>
                            <p className="text-xs font-bold text-blue-900">{inventoryStats.borrowedUnits} หน่วย</p>
                          </div>
                          <div className="p-2 bg-purple-50/70 border border-purple-300 rounded">
                            <p className="text-[10px] text-purple-800 font-semibold">เบิกจ่ายแล้ว</p>
                            <p className="text-xs font-bold text-purple-900">{inventoryStats.dispensedUnits} หน่วย</p>
                          </div>
                          <div className="p-2 bg-emerald-50/70 border border-emerald-300 rounded">
                            <p className="text-[10px] text-emerald-800 font-semibold">คงเหลือพร้อมใช้งาน</p>
                            <p className="text-xs font-bold text-emerald-900">{inventoryStats.availableUnits} หน่วย</p>
                          </div>
                        </div>
                      ) : mode === 'borrows' ? (
                        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                          <div className="p-2 bg-gray-50 border border-gray-300 rounded">
                            <p className="text-[10px] text-gray-600 font-semibold">รายการยืมทั้งหมด</p>
                            <p className="text-xs font-bold text-gray-900">{borrowStats.total} ครั้ง</p>
                          </div>
                          <div className="p-2 bg-amber-50/70 border border-amber-300 rounded">
                            <p className="text-[10px] text-amber-800 font-semibold">กำลังยืมอยู่ (ยังไม่คืน)</p>
                            <p className="text-xs font-bold text-amber-900">{borrowStats.active} รายการ</p>
                          </div>
                          <div className="p-2 bg-emerald-50/70 border border-emerald-300 rounded">
                            <p className="text-[10px] text-emerald-800 font-semibold">ส่งคืนเรียบร้อยแล้ว</p>
                            <p className="text-xs font-bold text-emerald-900">{borrowStats.returned} รายการ</p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2 mb-3 text-center">
                          <div className="p-2 bg-gray-50 border border-gray-300 rounded">
                            <p className="text-[10px] text-gray-600 font-semibold">รายการเบิกทั้งหมด</p>
                            <p className="text-xs font-bold text-gray-900">{dispenseStats.total} รายการ</p>
                          </div>
                          <div className="p-2 bg-purple-50/70 border border-purple-300 rounded">
                            <p className="text-[10px] text-purple-800 font-semibold">เบิกจ่ายแล้ว</p>
                            <p className="text-xs font-bold text-purple-900">{dispenseStats.dispensed} รายการ</p>
                          </div>
                          <div className="p-2 bg-amber-50/70 border border-amber-300 rounded">
                            <p className="text-[10px] text-amber-800 font-semibold">รออนุมัติ</p>
                            <p className="text-xs font-bold text-amber-900">{dispenseStats.pending} รายการ</p>
                          </div>
                          <div className="p-2 bg-sky-50/70 border border-sky-300 rounded">
                            <p className="text-[10px] text-sky-800 font-semibold">จำนวนชิ้นที่เบิกรวม</p>
                            <p className="text-xs font-bold text-sky-900">{dispenseStats.totalUnits} ชิ้น</p>
                          </div>
                        </div>
                      )
                    )}

                    {/* Main Table without inner scroll trap */}
                    <div className="w-full mb-3 overflow-visible">
                      {mode === 'inventory' ? (
                        <table className="w-full text-left border-collapse text-xs" style={{ border: '1px solid #4b5563' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f3f4f6' }}>
                              <th style={{ border: '1px solid #4b5563', padding: '5px 4px', width: '44px', minWidth: '44px', textAlign: 'center', whiteSpace: 'nowrap' }}>ลำดับ</th>
                              <th style={{ border: '1px solid #4b5563', padding: '5px 6px', width: '88px', whiteSpace: 'nowrap' }}>รหัสพัสดุ</th>
                              <th style={{ border: '1px solid #4b5563', padding: '5px 6px', minWidth: '150px' }}>รายการพัสดุ / ครุภัณฑ์</th>
                              <th style={{ border: '1px solid #4b5563', padding: '5px 6px', width: '75px', whiteSpace: 'nowrap' }}>ประเภท</th>
                              <th style={{ border: '1px solid #4b5563', padding: '5px 4px', width: '60px', textAlign: 'center', whiteSpace: 'nowrap' }}>สถานะ</th>
                              <th style={{ border: '1px solid #4b5563', padding: '5px 6px', width: '80px', whiteSpace: 'nowrap' }}>สถานที่จัดเก็บ</th>
                              <th style={{ border: '1px solid #4b5563', padding: '5px 4px', width: '64px', textAlign: 'center', whiteSpace: 'nowrap' }}>ยอดรวม</th>
                              <th style={{ border: '1px solid #4b5563', padding: '5px 4px', width: '54px', textAlign: 'center', whiteSpace: 'nowrap' }}>ถูกยืม</th>
                              <th style={{ border: '1px solid #4b5563', padding: '5px 4px', width: '54px', textAlign: 'center', backgroundColor: '#f5f3ff', color: '#581c87', whiteSpace: 'nowrap' }}>ถูกเบิก</th>
                              <th style={{ border: '1px solid #4b5563', padding: '5px 4px', width: '58px', textAlign: 'center', whiteSpace: 'nowrap' }}>คงเหลือ</th>
                              <th style={{ border: '1px solid #4b5563', padding: '5px 6px', width: '75px', whiteSpace: 'nowrap' }}>หมายเหตุ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageItems.length === 0 ? (
                              <tr>
                                <td colSpan={11} style={{ border: '1px solid #4b5563', padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                                  ไม่พบข้อมูลพัสดุครุภัณฑ์ตามเงื่อนไขที่เลือก
                                </td>
                              </tr>
                            ) : (
                              pageItems.map((item, index) => {
                                const itemNum = startIdx + index;
                                const { total, borrowed, dispensed = 0, available } = effectiveGetStockInfo(item);
                                return (
                                  <tr key={item.id}>
                                    <td style={{ border: '1px solid #4b5563', padding: '5px 4px', width: '44px', minWidth: '44px', textAlign: 'center', whiteSpace: 'nowrap', fontWeight: 600, color: '#374151' }}>{itemNum}</td>
                                    <td style={{ border: '1px solid #4b5563', padding: '5px 6px', fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap' }}>{item.code || '-'}</td>
                                    <td style={{ border: '1px solid #4b5563', padding: '5px 6px', fontWeight: 600 }}>{item.name}</td>
                                    <td style={{ border: '1px solid #4b5563', padding: '5px 6px', whiteSpace: 'nowrap' }}>{item.type}</td>
                                    <td style={{ border: '1px solid #4b5563', padding: '5px 4px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                      <span style={{
                                        padding: '2px 5px',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        backgroundColor: item.status === 'ปกติ' ? '#ecfdf5' : '#fffbeb',
                                        color: item.status === 'ปกติ' ? '#065f46' : '#92400e',
                                        border: '1px solid #d1d5db'
                                      }}>
                                        {item.status}
                                      </span>
                                    </td>
                                    <td style={{ border: '1px solid #4b5563', padding: '5px 6px' }}>{item.location || '-'}</td>
                                    <td style={{ border: '1px solid #4b5563', padding: '5px 4px', textAlign: 'center', fontWeight: 700, whiteSpace: 'nowrap', color: '#111827' }}>{total}</td>
                                    <td style={{ border: '1px solid #4b5563', padding: '5px 4px', textAlign: 'center', color: borrowed > 0 ? '#b91c1c' : '#4b5563', whiteSpace: 'nowrap', fontWeight: borrowed > 0 ? 600 : 'normal' }}>
                                      {borrowed > 0 ? borrowed : '-'}
                                    </td>
                                    <td style={{ border: '1px solid #4b5563', padding: '5px 4px', textAlign: 'center', color: dispensed > 0 ? '#7e22ce' : '#4b5563', backgroundColor: dispensed > 0 ? '#faf5ff' : 'transparent', fontWeight: dispensed > 0 ? 600 : 'normal', whiteSpace: 'nowrap' }}>
                                      {dispensed > 0 ? dispensed : '-'}
                                    </td>
                                    <td style={{ border: '1px solid #4b5563', padding: '5px 4px', textAlign: 'center', fontWeight: 700, color: '#047857', whiteSpace: 'nowrap' }}>{available}</td>
                                    <td style={{ border: '1px solid #4b5563', padding: '5px 6px', color: '#6b7280', fontSize: '11px' }}>{item.note || '-'}</td>
                                  </tr>
                                );
                              })
                            )}
                            {pageIdx === pages.length - 1 && pageItems.length > 0 && (
                              <tr style={{ backgroundColor: '#f9fafb', fontWeight: 700 }}>
                                <td colSpan={6} style={{ border: '1px solid #4b5563', padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                  รวมทั้งสิ้น ({inventoryStats.kinds} ชนิด):
                                </td>
                                <td style={{ border: '1px solid #4b5563', padding: '6px 4px', textAlign: 'center', color: '#1e3a8a', whiteSpace: 'nowrap', fontWeight: 800 }}>
                                  {inventoryStats.totalUnits}
                                </td>
                                <td style={{ border: '1px solid #4b5563', padding: '6px 4px', textAlign: 'center', color: '#b91c1c', whiteSpace: 'nowrap', fontWeight: 700 }}>
                                  {inventoryStats.borrowedUnits}
                                </td>
                                <td style={{ border: '1px solid #4b5563', padding: '6px 4px', textAlign: 'center', color: '#7e22ce', backgroundColor: '#faf5ff', whiteSpace: 'nowrap', fontWeight: 700 }}>
                                  {inventoryStats.dispensedUnits}
                                </td>
                                <td style={{ border: '1px solid #4b5563', padding: '6px 4px', textAlign: 'center', color: '#047857', whiteSpace: 'nowrap', fontWeight: 800 }}>
                                  {inventoryStats.availableUnits}
                                </td>
                                <td style={{ border: '1px solid #4b5563', padding: '6px 4px', textAlign: 'center', color: '#6b7280', fontSize: '11px' }}>
                                  -
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      ) : mode === 'borrows' ? (
                        <table className="w-full text-left border-collapse text-xs" style={{ border: '1px solid #4b5563' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f3f4f6' }}>
                              <th style={{ border: '1px solid #4b5563', padding: '5px 4px', width: '44px', minWidth: '44px', textAlign: 'center', whiteSpace: 'nowrap' }}>ลำดับ</th>
                              <th style={{ border: '1px solid #4b5563', padding: '5px 7px', width: '85px' }}>วันที่ยืม</th>
                              <th style={{ border: '1px solid #4b5563', padding: '5px 7px', width: '130px' }}>ผู้ขอยืม / ตำแหน่ง</th>
                              <th style={{ border: '1px solid #4b5563', padding: '5px 7px' }}>รายการพัสดุที่ยืม</th>
                              <th style={{ border: '1px solid #4b5563', padding: '5px 7px', width: '90px' }}>เบอร์โทร</th>
                              <th style={{ border: '1px solid #4b5563', padding: '5px 7px', width: '85px' }}>กำหนดคืน</th>
                              <th style={{ border: '1px solid #4b5563', padding: '5px 7px', width: '85px' }}>วันที่คืนจริง</th>
                              <th style={{ border: '1px solid #4b5563', padding: '5px 7px', width: '80px', textAlign: 'center' }}>สถานะ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageItems.length === 0 ? (
                              <tr>
                                <td colSpan={8} style={{ border: '1px solid #4b5563', padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                                  ไม่พบประวัติการยืม-คืนพัสดุ
                                </td>
                              </tr>
                            ) : (
                              pageItems.map((b, index) => {
                                const itemNum = startIdx + index;
                                const itemObj = equipment.find(e => e.id === b.itemId);
                                const isReturned = !!b.returnedDate;
                                return (
                                  <tr key={b.id}>
                                    <td style={{ border: '1px solid #4b5563', padding: '5px 4px', width: '44px', minWidth: '44px', textAlign: 'center', whiteSpace: 'nowrap', fontWeight: 600 }}>{itemNum}</td>
                                    <td style={{ border: '1px solid #4b5563', padding: '5px 7px' }}>{formatThaiDate(b.borrowDate)}</td>
                                    <td style={{ border: '1px solid #4b5563', padding: '5px 7px' }}>
                                      <p className="font-bold">{b.borrowerName}</p>
                                      {b.borrowerPosition && <p className="text-[10px] text-gray-500">{b.borrowerPosition}</p>}
                                    </td>
                                    <td style={{ border: '1px solid #4b5563', padding: '5px 7px' }}>
                                      <p className="font-semibold text-gray-900">{b.itemName || itemObj?.name || 'พัสดุ'}</p>
                                      <p className="text-[10px] text-gray-600">จำนวน: {b.qty || 1} รายการ {b.note ? `(${b.note})` : ''}</p>
                                    </td>
                                    <td style={{ border: '1px solid #4b5563', padding: '5px 7px' }}>{b.borrowerTel || '-'}</td>
                                    <td style={{ border: '1px solid #4b5563', padding: '5px 7px' }}>{formatThaiDate(b.expectedReturnDate)}</td>
                                    <td style={{ border: '1px solid #4b5563', padding: '5px 7px' }}>{b.returnedDate ? formatThaiDate(b.returnedDate) : '-'}</td>
                                    <td style={{ border: '1px solid #4b5563', padding: '5px 7px', textAlign: 'center' }}>
                                      <span style={{
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        backgroundColor: isReturned ? '#ecfdf5' : '#fffbeb',
                                        color: isReturned ? '#065f46' : '#b45309',
                                        border: '1px solid #d1d5db'
                                      }}>
                                        {isReturned ? 'คืนแล้ว' : 'กำลังยืม'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      ) : (
                        <table className="w-full text-left border-collapse text-xs" style={{ border: '1px solid #4b5563' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f3f4f6' }}>
                              <th style={{ border: '1px solid #4b5563', padding: '5px 4px', width: '44px', minWidth: '44px', textAlign: 'center', whiteSpace: 'nowrap' }}>ลำดับ</th>
                              <th style={{ border: '1px solid #4b5563', padding: '5px 7px', width: '85px', textAlign: 'center', whiteSpace: 'nowrap' }}>วันที่เบิก</th>
                              <th style={{ border: '1px solid #4b5563', padding: '5px 7px', width: '130px' }}>ผู้ขอเบิก / ตำแหน่ง</th>
                              <th style={{ border: '1px solid #4b5563', padding: '5px 7px', width: '110px' }}>สังกัด / ส่วนงาน</th>
                              <th style={{ border: '1px solid #4b5563', padding: '5px 7px' }}>รายการพัสดุที่เบิก</th>
                              <th style={{ border: '1px solid #4b5563', padding: '5px 4px', width: '60px', textAlign: 'center', whiteSpace: 'nowrap' }}>จำนวน</th>
                              <th style={{ border: '1px solid #4b5563', padding: '5px 7px', width: '130px' }}>วัตถุประสงค์การใช้</th>
                              <th style={{ border: '1px solid #4b5563', padding: '5px 7px', width: '100px' }}>ผู้อนุมัติ/ผู้จ่าย</th>
                              <th style={{ border: '1px solid #4b5563', padding: '5px 7px', width: '80px', textAlign: 'center' }}>สถานะ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageItems.length === 0 ? (
                              <tr>
                                <td colSpan={9} style={{ border: '1px solid #4b5563', padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                                  ไม่พบประวัติการเบิกพัสดุ
                                </td>
                              </tr>
                            ) : (
                              pageItems.map((d: DispenseRecord, index: number) => {
                                const itemNum = startIdx + index;
                                return (
                                  <tr key={d.id}>
                                    <td style={{ border: '1px solid #4b5563', padding: '5px 4px', width: '44px', minWidth: '44px', textAlign: 'center', whiteSpace: 'nowrap', fontWeight: 600 }}>{itemNum}</td>
                                    <td style={{ border: '1px solid #4b5563', padding: '5px 7px', textAlign: 'center', whiteSpace: 'nowrap' }}>{formatThaiDate(d.dispenseDate)}</td>
                                    <td style={{ border: '1px solid #4b5563', padding: '5px 7px' }}>
                                      <p className="font-bold">{d.recipientName}</p>
                                      {d.recipientPosition && <p className="text-[10px] text-gray-500">{d.recipientPosition}</p>}
                                    </td>
                                    <td style={{ border: '1px solid #4b5563', padding: '5px 7px' }}>{d.department || 'งานป้องกันฯ'}</td>
                                    <td style={{ border: '1px solid #4b5563', padding: '5px 7px' }}>
                                      <p className="font-semibold text-gray-900">{d.itemName}</p>
                                      {d.itemCode && <p className="text-[10px] text-gray-500 font-mono">รหัส: {d.itemCode}</p>}
                                    </td>
                                    <td style={{ border: '1px solid #4b5563', padding: '5px 4px', textAlign: 'center', fontWeight: 700, color: '#7e22ce', whiteSpace: 'nowrap' }}>
                                      {d.qty || 1} {d.unit || 'ชิ้น'}
                                    </td>
                                    <td style={{ border: '1px solid #4b5563', padding: '5px 7px', fontSize: '11px' }}>{d.purpose || '-'}</td>
                                    <td style={{ border: '1px solid #4b5563', padding: '5px 7px' }}>
                                      <p className="font-medium">{d.certifier || '-'}</p>
                                      {d.certifierPosition && <p className="text-[10px] text-gray-500">{d.certifierPosition}</p>}
                                    </td>
                                    <td style={{ border: '1px solid #4b5563', padding: '5px 7px', textAlign: 'center' }}>
                                      <span style={{
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        backgroundColor: d.status === 'เบิกจ่ายแล้ว' ? '#faf5ff' : d.status === 'รออนุมัติ' ? '#fffbeb' : '#fef2f2',
                                        color: d.status === 'เบิกจ่ายแล้ว' ? '#7e22ce' : d.status === 'รออนุมัติ' ? '#b45309' : '#dc2626',
                                        border: '1px solid #d1d5db'
                                      }}>
                                        {d.status}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* Bottom section (signatures only on last page) */}
                  <div>
                    {pageIdx === totalPages - 1 && (
                      <div className="grid grid-cols-2 gap-8 pt-4 mt-2 text-xs border-t border-gray-300">
                        <div className="text-center space-y-1">
                          <p>ลงชื่อ ................................................................ ผู้รายงาน</p>
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
              เอกสารทั้งหมด <span className="font-bold text-sky-400">{pages.length}</span> หน้า (ซูม {zoom}%)
            </span>
            <div className="h-3 w-px bg-slate-700" />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={scrollToTop}
                className="flex items-center gap-1 px-2 py-0.5 hover:bg-slate-800 rounded-md text-[11px] text-slate-300 hover:text-white transition cursor-pointer"
                title="เลื่อนไปบนสุด"
              >
                <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
                <span>บนสุด</span>
              </button>
              <button
                type="button"
                onClick={scrollToBottom}
                className="flex items-center gap-1 px-2 py-0.5 hover:bg-slate-800 rounded-md text-[11px] text-slate-300 hover:text-white transition cursor-pointer"
                title="เลื่อนไปล่างสุด (ตรวจสอบลายเซ็น)"
              >
                <ChevronDown className="w-3.5 h-3.5 text-sky-400" />
                <span>ล่างสุด</span>
              </button>
            </div>
          </div>
        </div>
    </div>,
    document.body
  );
}
