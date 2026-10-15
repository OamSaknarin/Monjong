import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DispenseRecord, Equipment } from '../types';
import { Printer, Download, X, FileText, ZoomIn, ZoomOut, ChevronUp, ChevronDown, Layers } from 'lucide-react';
import logo from '../assets/logo.png';
import { printElement, downloadPdfFromContainer } from '../utils/pdfExport';

interface DispenseSlipPdfModalProps {
  record: DispenseRecord;
  allRecords?: DispenseRecord[];
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

export default function DispenseSlipPdfModal({
  record,
  allRecords = [],
  equipment,
  onClose,
  showToast
}: DispenseSlipPdfModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Customizable Signee Names & Positions
  const [headOfOfficeName, setHeadOfOfficeName] = useState(record.headOfOfficeName || '');
  const [headOfOfficePosition, setHeadOfOfficePosition] = useState(record.headOfOfficePosition || '');
  
  const [paladName, setPaladName] = useState(record.paladName || '');
  const [paladPosition, setPaladPosition] = useState(record.paladPosition || '');
  
  const [mayorName, setMayorName] = useState(record.mayorName || '');
  const [mayorPosition, setMayorPosition] = useState(record.mayorPosition || '');
  
  const [storekeeperName, setStorekeeperName] = useState(record.certifier || '');
  const [storekeeperPosition, setStorekeeperPosition] = useState(record.certifierPosition || '');

  const [customSlipNo, setCustomSlipNo] = useState(() => {
    const rawId = record.groupId || record.id;
    // Extract digits first
    const digits = rawId.replace(/\D/g, '');
    const numPart = digits.length >= 4 ? digits.slice(-6) : getNumericHash(rawId);
    return `MJ-${numPart}`;
  });

  const printRef = useRef<HTMLDivElement>(null);
  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);

  // Interactive Zoom and Smooth Scroll Controls
  const [zoom, setZoom] = useState<number>(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 55 : 80));
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToPage2 = () => {
    if (page2Ref.current) {
      page2Ref.current.scrollIntoView({ behavior: 'smooth' });
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

  // Filter items in the same requisition slip / group
  const groupItems = React.useMemo(() => {
    if (record.groupId) {
      const matched = allRecords.filter(r => r.groupId === record.groupId);
      if (matched.length > 0) return matched;
    }
    // Fallback match by recipientName & dispenseDate
    const matched = allRecords.filter(r => 
      r.recipientName === record.recipientName && 
      r.dispenseDate === record.dispenseDate
    );
    return matched.length > 0 ? matched : [record];
  }, [record, allRecords]);

  // Find equipment details
  const itemsDetails = React.useMemo(() => {
    return groupItems.map(item => {
      const eq = equipment.find(e => e.id === item.itemId);
      return {
        ...item,
        code: item.itemCode || eq?.code || '-',
        type: item.itemType || eq?.type || 'พัสดุ/วัสดุทั่วไป',
        qty: item.qty || 1,
        unit: item.unit || 'ชิ้น',
        location: eq?.location || '-'
      };
    });
  }, [groupItems, equipment]);

  // Slip ID / Reference Number
  const slipNo = customSlipNo;

  const [isPrinting, setIsPrinting] = useState(false);

  // Handle direct print with exact preview styles
  const handlePrint = async () => {
    if (!printRef.current || isPrinting || isGenerating) return;
    setIsPrinting(true);
    try {
      await printElement(printRef.current, `ใบเบิกพัสดุและใบรับพัสดุ - ${record.recipientName}`, false, showToast);
    } catch (err) {
      console.error('Print error:', err);
      showToast('ไม่สามารถเปิดหน้าต่างพิมพ์ได้ กรุณาใช้ปุ่มดาวน์โหลด PDF', 'error');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    const docName = `ใบเบิกพัสดุและใบรับพัสดุ_${record.recipientName.replace(/\s+/g, '_')}_${record.dispenseDate}.pdf`;
    await downloadPdfFromContainer({
      container: printRef.current,
      filename: docName,
      isLandscape: false,
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
          <div className="p-2 bg-amber-600/20 text-amber-400 rounded-lg border border-amber-500/30 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading font-black text-xs sm:text-sm md:text-base text-white flex items-center gap-2">
              <span>พิมพ์และส่งออกใบเบิกพัสดุ & สำเนาใบรับพัสดุ</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-900/80 text-amber-300 text-[10px] font-bold border border-amber-700/50 flex items-center gap-1">
                <Layers className="w-3 h-3" />
                <span>ชุด 2 หน้า A4</span>
              </span>
            </h2>
            <p className="text-[10px] sm:text-[11px] text-slate-300">
              หน้า 1: ใบเบิกพัสดุ (๓ ความเห็น) • หน้า 2: สำเนาใบรับพัสดุ
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
              {!([40, 50, 55, 60, 65, 70, 75, 80, 85, 90, 100, 110, 120, 125, 150].includes(zoom)) && (
                <option value={zoom} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">{zoom}%</option>
              )}
              <option value={40} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">40%</option>
              <option value={50} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">50%</option>
              <option value={55} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">55% (จอมือถือ)</option>
              <option value={60} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">60%</option>
              <option value={65} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">65%</option>
              <option value={70} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">70%</option>
              <option value={75} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">75%</option>
              <option value={80} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">80% (ปกติ)</option>
              <option value={85} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">85%</option>
              <option value={90} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">90%</option>
              <option value={100} style={{ color: '#000000', backgroundColor: '#ffffff' }} className="text-black font-bold bg-white">100%</option>
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
                  const fit = Math.min(100, Math.max(45, Math.floor((cWidth / 794) * 100)));
                  setZoom(fit);
                } else {
                  setZoom(60);
                }
              }}
              className="px-2 py-1 bg-amber-700 hover:bg-amber-600 text-white rounded-md font-bold text-[10px] transition cursor-pointer"
              title="ปรับขนาดให้พอดีจอ"
            >
              พอดีจอ
            </button>
          </div>

          {/* Quick Jump Buttons */}
          <div className="flex items-center gap-1 bg-slate-700/80 p-0.5 rounded-xl border border-slate-600 text-xs">
            <button
              type="button"
              onClick={scrollToTop}
              className="px-2 py-1 text-slate-200 hover:text-white hover:bg-slate-600 rounded-lg transition cursor-pointer font-bold text-[11px] flex items-center gap-1"
              title="เลื่อนไปหน้า 1 (ใบเบิกพัสดุ)"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span>หน้า 1</span>
            </button>
            <button
              type="button"
              onClick={scrollToPage2}
              className="px-2 py-1 text-amber-300 hover:text-white hover:bg-slate-600 rounded-lg transition cursor-pointer font-bold text-[11px] flex items-center gap-1"
              title="เลื่อนไปหน้า 2 (ใบรับพัสดุ)"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>หน้า 2 (ใบรับพัสดุ)</span>
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

          {/* Action Buttons */}
          <button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting || isGenerating}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-heading font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            title="สั่งพิมพ์เอกสาร 2 หน้าไปยังเครื่องพิมพ์หรือบันทึกเป็น PDF"
          >
            <Printer className="w-4 h-4" />
            <span>{isPrinting ? 'กำลังพิมพ์...' : 'พิมพ์เอกสาร (2 หน้า)'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGenerating || isPrinting}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-heading font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            title="ดาวน์โหลดไฟล์ PDF คุณภาพสูง 2 หน้าลงเครื่อง"
          >
            <Download className="w-4 h-4" />
            <span>{isGenerating ? 'กำลังสร้าง...' : 'ดาวน์โหลด PDF'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl transition cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Sub-header for Approver Name & Position Inputs */}
      <div className="bg-amber-100/95 text-amber-950 px-4 py-3 border-b border-amber-200 shrink-0 font-sans shadow-inner">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 pb-2">
            <h3 className="font-heading font-black text-xs text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>✍️ แก้ไขเลขที่เอกสาร ชื่อ และตำแหน่งของผู้ลงนามในเอกสารทั้ง ๒ หน้า</span>
            </h3>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[11px] text-amber-900">เลขที่เอกสาร:</span>
              <input
                type="text"
                value={customSlipNo}
                onChange={(e) => setCustomSlipNo(e.target.value)}
                placeholder="MJ-xxxxxx"
                className="px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-amber-950 outline-none focus:ring-2 focus:ring-amber-500 w-40 shadow-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px]">
            {/* ๑. หน.สำนักปลัด */}
            <div className="space-y-1.5 bg-amber-50/50 p-2 rounded-xl border border-amber-200/50">
              <span className="font-black text-amber-900 block">๑. หน.สำนักปลัด</span>
              <div className="space-y-1">
                <input
                  type="text"
                  value={headOfOfficeName}
                  onChange={(e) => setHeadOfOfficeName(e.target.value)}
                  placeholder="ชื่อ-นามสกุล หน.สำนักปลัด"
                  className="w-full px-2 py-1 bg-white border border-amber-300 rounded-md text-xs font-sarabun text-gray-900 outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
                />
                <input
                  type="text"
                  value={headOfOfficePosition}
                  onChange={(e) => setHeadOfOfficePosition(e.target.value)}
                  placeholder="ตำแหน่ง หน.สำนักปลัด"
                  className="w-full px-2 py-1 bg-white border border-amber-300 rounded-md text-[10px] font-sarabun text-gray-600 outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
                />
              </div>
            </div>

            {/* ๒. ปลัด อบต. */}
            <div className="space-y-1.5 bg-amber-50/50 p-2 rounded-xl border border-amber-200/50">
              <span className="font-black text-amber-900 block">๒. ปลัด อบต.</span>
              <div className="space-y-1">
                <input
                  type="text"
                  value={paladName}
                  onChange={(e) => setPaladName(e.target.value)}
                  placeholder="ชื่อ-นามสกุล ปลัด อบต."
                  className="w-full px-2 py-1 bg-white border border-amber-300 rounded-md text-xs font-sarabun text-gray-900 outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
                />
                <input
                  type="text"
                  value={paladPosition}
                  onChange={(e) => setPaladPosition(e.target.value)}
                  placeholder="ตำแหน่ง ปลัด อบต."
                  className="w-full px-2 py-1 bg-white border border-amber-300 rounded-md text-[10px] font-sarabun text-gray-600 outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
                />
              </div>
            </div>

            {/* ๓. นายก อบต. */}
            <div className="space-y-1.5 bg-amber-50/50 p-2 rounded-xl border border-amber-200/50">
              <span className="font-black text-amber-900 block">๓. นายก อบต.</span>
              <div className="space-y-1">
                <input
                  type="text"
                  value={mayorName}
                  onChange={(e) => setMayorName(e.target.value)}
                  placeholder="ชื่อ-นามสกุล นายก อบต."
                  className="w-full px-2 py-1 bg-white border border-amber-300 rounded-md text-xs font-sarabun text-gray-900 outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
                />
                <input
                  type="text"
                  value={mayorPosition}
                  onChange={(e) => setMayorPosition(e.target.value)}
                  placeholder="ตำแหน่ง นายก อบต."
                  className="w-full px-2 py-1 bg-white border border-amber-300 rounded-md text-[10px] font-sarabun text-gray-600 outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
                />
              </div>
            </div>

            {/* ๔. ผู้จ่ายพัสดุ */}
            <div className="space-y-1.5 bg-amber-50/50 p-2 rounded-xl border border-amber-200/50">
              <span className="font-black text-amber-900 block">๔. ผู้จ่ายพัสดุ</span>
              <div className="space-y-1">
                <input
                  type="text"
                  value={storekeeperName}
                  onChange={(e) => setStorekeeperName(e.target.value)}
                  placeholder="ชื่อผู้จ่ายพัสดุ"
                  className="w-full px-2 py-1 bg-white border border-amber-300 rounded-md text-xs font-sarabun text-gray-900 outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
                />
                <input
                  type="text"
                  value={storekeeperPosition}
                  onChange={(e) => setStorekeeperPosition(e.target.value)}
                  placeholder="ตำแหน่งผู้จ่ายพัสดุ"
                  className="w-full px-2 py-1 bg-white border border-amber-300 rounded-md text-[10px] font-sarabun text-gray-600 outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Document Preview Canvas with guaranteed smooth scroll & touch */}
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
        <div className="min-w-fit w-full flex flex-col items-center gap-8 pb-24" ref={printRef}>
          <div 
            className="flex flex-col items-center gap-8 w-full origin-top transition-transform duration-100"
            style={{
              zoom: `${zoom}%`,
              transformOrigin: 'top center'
            }}
          >
            {/* ========================================================================= */}
            {/* PAGE 1: ใบเบิกพัสดุ (พร้อม ๓ ความเห็น: หน.สำนักปลัด, ปลัด, นายก) */}
            {/* ========================================================================= */}
            <div 
              ref={page1Ref}
              className="a4-sheet bg-white p-8 sm:p-11 w-[210mm] max-w-full min-h-[297mm] text-black font-sarabun flex flex-col justify-between shrink-0 shadow-2xl border border-gray-300 rounded-xs my-2 relative"
              style={{ boxSizing: 'border-box', pageBreakAfter: 'always', breakAfter: 'page' }}
            >
              <div>
                {/* Header: Emblem & Official Letter Heading */}
                <div className="relative mb-3 font-sarabun">
                  {/* Emblem / Logo centered at top */}
                  <div className="flex justify-center mb-1.5">
                    <img
                      src={logo}
                      alt="ตราหน่วยงาน"
                      className="w-18 h-18 object-contain shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Center Title */}
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-black text-center tracking-widest font-sarabun leading-tight mb-4">
                    ใบเบิกพัสดุ
                  </h1>

                  {/* Dispatch Letter Details Header */}
                  <div className="space-y-2 text-xs sm:text-sm border-b-2 border-black pb-3 font-sarabun">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-black shrink-0">ที่:</span>
                        <span className="font-mono font-medium">
                          {slipNo}
                        </span>
                      </div>
                      <div className="text-right font-medium leading-tight">
                        <p className="font-bold">เขียนที่ องค์การบริหารส่วนตำบลม่อนจอง</p>
                      </div>
                    </div>

                    {/* Date line starting aligned under heading (~48% from left) */}
                    <div className="flex items-baseline gap-2 pl-[48%] pt-0.5">
                      <span className="font-bold text-black shrink-0">วันที่:</span>
                      <span className="font-medium">
                        {formatThaiFullDate(record.dispenseDate)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subject (เรื่อง) Below line */}
                <div className="text-xs sm:text-sm font-sarabun mb-2 flex items-baseline gap-2">
                  <span className="font-bold text-black shrink-0">เรื่อง:</span>
                  <span className="font-normal">
                    ขอเบิกพัสดุ ครุภัณฑ์ และวัสดุอุปกรณ์
                  </span>
                </div>

                {/* Salutation (เรียน) */}
                <div className="text-xs sm:text-sm font-sarabun mb-3 flex items-baseline gap-2">
                  <span className="font-bold">เรียน:</span>
                  <span>{mayorPosition.trim() ? mayorPosition.trim() : 'นายกองค์การบริหารส่วนตำบลม่อนจอง'}</span>
                </div>

                {/* Body Paragraph */}
                <div className="text-xs sm:text-sm font-sarabun leading-relaxed text-justify space-y-2 mb-3">
                  <p className="indent-12">
                    ด้วย ข้าพเจ้า <span className="font-bold">{record.recipientName}</span> ตำแหน่ง <span className="font-bold">{record.recipientPosition}</span> สังกัด/ส่วนงาน <span className="font-bold">{record.department || 'องค์การบริหารส่วนตำบลม่อนจอง'}</span> หมายเลขโทรศัพท์ติดต่อ <span className="font-mono">{record.recipientTel || '-'}</span> มีความประสงค์ขอเบิกพัสดุ ครุภัณฑ์ และวัสดุอุปกรณ์ งานป้องกันและบรรเทาสาธารณภัย องค์การบริหารส่วนตำบลม่อนจอง {record.purpose ? `เพื่อนำไปใช้สำหรับ ${record.purpose}` : 'เพื่อนำไปใช้ในการปฏิบัติราชการและภารกิจของหน่วยงาน'} โดยมีรายการดังต่อไปนี้
                  </p>
                </div>

                {/* Items Table */}
                <div className="mb-3">
                  <div className="border border-black rounded-xs overflow-hidden text-xs font-sarabun">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-100 border-b border-black text-black font-bold text-center">
                          <th className="py-1.5 px-1 w-14 border-r border-black whitespace-nowrap text-center">ลำดับ</th>
                          <th className="p-1.5 w-28 border-r border-black">รหัสพัสดุ/วัสดุ</th>
                          <th className="p-1.5 border-r border-black text-left">รายการพัสดุ - ครุภัณฑ์ - วัสดุอุปกรณ์</th>
                          <th className="p-1.5 w-16 border-r border-black">จำนวน</th>
                          <th className="p-1.5 w-16 border-r border-black">หน่วยนับ</th>
                          <th className="p-1.5 w-24">หมายเหตุ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black">
                        {itemsDetails.map((item, index) => (
                          <tr key={item.id || index} className="text-center">
                            <td className="py-1.5 px-1 w-14 border-r border-black font-mono whitespace-nowrap text-center">
                              {index + 1}
                            </td>
                            <td className="p-1.5 border-r border-black font-mono font-bold text-[11px]">
                              {item.code}
                            </td>
                            <td className="p-1.5 border-r border-black text-left font-semibold">
                              {item.itemName}
                            </td>
                            <td className="p-1.5 border-r border-black font-mono font-bold">
                              {item.qty}
                            </td>
                            <td className="p-1.5 border-r border-black font-medium">
                              {item.unit}
                            </td>
                            <td className="p-1.5 text-gray-700 text-[10px]">
                              {item.note || item.status || 'เบิกใช้งาน'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Warranties & Undertakings (ลบคำว่า "ในการนี้" ออกตามที่ผู้ใช้สั่งการ) */}
                <div className="text-xs sm:text-sm font-sarabun leading-relaxed text-justify space-y-1 mb-4">
                  <p className="indent-12">
                    ข้าพเจ้าขอรับรองว่าจะนำพัสดุและวัสดุอุปกรณ์ข้างต้นไปใช้ประโยชน์ในงานราชการและภารกิจของทางราชการตามวัตถุประสงค์ที่ได้รับอนุมัติอย่างถูกต้อง คุ้มค่า และเกิดประโยชน์สูงสุดแก่ทางราชการ
                  </p>
                  <p className="pl-[48%] font-medium pt-0.5">
                    จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ
                  </p>
                </div>

                {/* Requester Signature Block (Right Aligned) */}
                <div className="flex justify-end font-sarabun text-xs sm:text-sm mb-4">
                  <div className="text-center space-y-0.5 w-60">
                    <p>(ลงชื่อ)...........................................................</p>
                    <p className="font-bold">( {record.recipientName} )</p>
                    <p className="text-gray-700 text-xs">ตำแหน่ง {record.recipientPosition}</p>
                    <p className="font-semibold text-xs pt-0.5">ผู้ขอเบิก</p>
                  </div>
                </div>

                <div className="border-t-2 border-black pt-3 grid grid-cols-3 gap-3 text-[11px] font-sarabun text-left">
                  {/* ๑. ความเห็นหัวหน้าสำนักปลัด */}
                  <div className="border-r border-gray-300 pr-2.5 flex flex-col justify-between text-left">
                    <div className="space-y-1 text-left">
                      <p className="font-bold text-gray-900 text-left">๑. ความเห็นหัวหน้าสำนักปลัด</p>
                      <div className="pt-1.5 space-y-1 text-left">
                        <p className="text-gray-400 tracking-wider text-[11px] font-mono leading-none">.......................................................</p>
                        <p className="text-gray-400 tracking-wider text-[11px] font-mono leading-none">.......................................................</p>
                      </div>
                    </div>
                    <div className="pt-4 text-center space-y-0.5">
                      <p className="text-center">(ลงชื่อ)...........................................................</p>
                      <p className="font-bold text-center">
                        ( {headOfOfficeName.trim() ? headOfOfficeName.trim() : '...........................................................'} )
                      </p>
                      <p className="text-gray-600 text-[10px] text-center">{headOfOfficePosition.trim() ? headOfOfficePosition.trim() : 'ตำแหน่ง ...........................................................'}</p>
                      <p className="text-gray-500 text-[10px] text-center">วันที่ ......./......./.......</p>
                    </div>
                  </div>

                  {/* ๒. ความเห็นปลัด */}
                  <div className="border-r border-gray-300 pr-2.5 flex flex-col justify-between text-left">
                    <div className="space-y-1 text-left">
                      <p className="font-bold text-gray-900 text-left">๒. ความเห็นปลัด</p>
                      <div className="pt-1.5 space-y-1 text-left">
                        <p className="text-gray-400 tracking-wider text-[11px] font-mono leading-none">.......................................................</p>
                        <p className="text-gray-400 tracking-wider text-[11px] font-mono leading-none">.......................................................</p>
                      </div>
                    </div>
                    <div className="pt-4 text-center space-y-0.5">
                      <p className="text-center">(ลงชื่อ)...........................................................</p>
                      <p className="font-bold text-center">
                        ( {paladName.trim() ? paladName.trim() : '...........................................................'} )
                      </p>
                      <p className="text-gray-600 text-[10px] text-center">{paladPosition.trim() ? paladPosition.trim() : 'ตำแหน่ง ...........................................................'}</p>
                      <p className="text-gray-500 text-[10px] text-center">วันที่ ......./......./.......</p>
                    </div>
                  </div>

                  {/* ๓. ความเห็นนายก */}
                  <div className="flex flex-col justify-between text-left">
                    <div className="space-y-1 text-left">
                      <p className="font-bold text-gray-900 text-left">๓. ความเห็นนายก</p>
                      <div className="flex items-center gap-3 my-1">
                        <label className="flex items-center gap-1 font-semibold">
                           <span className="w-3 h-3 border border-black inline-block rounded-xs"></span>
                           <span>อนุมัติ</span>
                        </label>
                        <label className="flex items-center gap-1 font-semibold">
                           <span className="w-3 h-3 border border-black inline-block rounded-xs"></span>
                           <span>ไม่อนุมัติ</span>
                        </label>
                      </div>
                    </div>
                    <div className="pt-4 text-center space-y-0.5">
                      <p className="text-center">(ลงชื่อ)...........................................................</p>
                      <p className="font-bold text-center">
                        ( {mayorName.trim() ? mayorName.trim() : '...........................................................'} )
                      </p>
                      <p className="text-gray-600 text-[10px] text-center">{mayorPosition.trim() ? mayorPosition.trim() : 'ตำแหน่ง ...........................................................'}</p>
                      <p className="text-gray-500 text-[10px] text-center">วันที่ ......./......./.......</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Page Number footer */}
              <div className="text-right text-[10px] text-gray-400 pt-2 border-t border-dotted border-gray-300">
                หน้าที่ ๑ / ๒ (ใบเบิกพัสดุ - งานป้องกันและบรรเทาสาธารณภัย อบต.ม่อนจอง)
              </div>
            </div>

            {/* ========================================================================= */}
            {/* PAGE 2: ใบรับพัสดุ (สำเนาใบรับพัสดุและอุปกรณ์) */}
            {/* ========================================================================= */}
            <div 
              ref={page2Ref}
              className="a4-sheet bg-white p-8 sm:p-11 w-[210mm] max-w-full min-h-[297mm] text-black font-sarabun flex flex-col justify-between shrink-0 shadow-2xl border border-gray-300 rounded-xs my-2 relative"
              style={{ boxSizing: 'border-box', pageBreakAfter: 'always', breakAfter: 'page' }}
            >
              <div>
                {/* Header: Emblem & Official Receipt Heading */}
                <div className="relative mb-3 font-sarabun">
                  {/* Emblem / Logo centered at top */}
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
                      ใบรับพัสดุ
                    </h1>
                  </div>

                  {/* Dispatch Letter Details Header */}
                  <div className="space-y-2 text-xs sm:text-sm border-b-2 border-black pb-3 font-sarabun">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-black shrink-0">อ้างถึงใบเบิกเลขที่:</span>
                        <span className="font-mono font-bold text-amber-900">
                          {slipNo}
                        </span>
                      </div>
                      <div className="text-right font-medium leading-tight">
                        <p className="font-bold">เขียนที่ องค์การบริหารส่วนตำบลม่อนจอง</p>
                      </div>
                    </div>

                    {/* Date line starting aligned under heading (~48% from left) */}
                    <div className="flex items-baseline gap-2 pl-[48%] pt-0.5">
                      <span className="font-bold text-black shrink-0">วันที่ส่งมอบ:</span>
                      <span className="font-medium">
                        {formatThaiFullDate(record.dispenseDate)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subject & Reference (เรื่อง/อ้างถึง) */}
                <div className="text-xs sm:text-sm font-sarabun mb-2 flex items-baseline gap-2">
                  <span className="font-bold text-black shrink-0">เรื่อง:</span>
                  <span className="font-normal">
                    การส่งมอบและรับมอบพัสดุ ครุภัณฑ์ และวัสดุอุปกรณ์ตามใบเบิก
                  </span>
                </div>

                {/* Salutation (เรียน) */}
                <div className="text-xs sm:text-sm font-sarabun mb-3 flex items-baseline gap-2">
                  <span className="font-bold">เรียน:</span>
                  <span>หัวหน้าสำนักปลัด / นายกองค์การบริหารส่วนตำบลม่อนจอง</span>
                </div>

                {/* Body Paragraph */}
                <div className="text-xs sm:text-sm font-sarabun leading-relaxed text-justify space-y-2 mb-3">
                  <p className="indent-12">
                    ตามที่ ข้าพเจ้า <span className="font-bold">{record.recipientName}</span> ตำแหน่ง <span className="font-bold">{record.recipientPosition}</span> สังกัด/ส่วนงาน <span className="font-bold">{record.department || 'องค์การบริหารส่วนตำบลม่อนจอง'}</span> ได้รับอนุมัติให้เบิกพัสดุ ครุภัณฑ์ และวัสดุอุปกรณ์ ตามใบเบิกเลขที่ <span className="font-mono font-bold">{slipNo}</span> ลงวันที่ <span className="font-medium">{formatThaiFullDate(record.dispenseDate)}</span> เพื่อนำไปใช้สำหรับ <span className="font-medium">{record.purpose || 'การปฏิบัติราชการและภารกิจของหน่วยงาน'}</span> นั้น
                  </p>
                  <p className="indent-12">
                    บัดนี้ เจ้าหน้าที่พัสดุ/ผู้จ่ายของ ได้ทำการส่งมอบพัสดุและวัสดุอุปกรณ์ดังกล่าว และข้าพเจ้าได้รับมอบพัสดุไว้ในความครอบครองในสภาพถูกต้อง ครบถ้วน เรียบร้อยทุกประการแล้ว ดังมีรายการต่อไปนี้
                  </p>
                </div>

                {/* Items Table */}
                <div className="mb-4">
                  <div className="border border-black rounded-xs overflow-hidden text-xs font-sarabun">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-100 border-b border-black text-black font-bold text-center">
                          <th className="py-1.5 px-1 w-14 border-r border-black whitespace-nowrap text-center">ลำดับ</th>
                          <th className="p-1.5 w-28 border-r border-black">รหัสพัสดุ/วัสดุ</th>
                          <th className="p-1.5 border-r border-black text-left">รายการพัสดุ - ครุภัณฑ์ - วัสดุอุปกรณ์</th>
                          <th className="p-1.5 w-16 border-r border-black">จำนวน</th>
                          <th className="p-1.5 w-16 border-r border-black">หน่วยนับ</th>
                          <th className="p-1.5 w-28">ผลการตรวจรับ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black">
                        {itemsDetails.map((item, index) => (
                          <tr key={item.id || index} className="text-center">
                            <td className="py-1.5 px-1 w-14 border-r border-black font-mono whitespace-nowrap text-center">
                              {index + 1}
                            </td>
                            <td className="p-1.5 border-r border-black font-mono font-bold text-[11px]">
                              {item.code}
                            </td>
                            <td className="p-1.5 border-r border-black text-left font-semibold">
                              {item.itemName}
                            </td>
                            <td className="p-1.5 border-r border-black font-mono font-bold">
                              {item.qty}
                            </td>
                            <td className="p-1.5 border-r border-black font-medium">
                              {item.unit}
                            </td>
                            <td className="p-1.5 text-emerald-800 font-semibold text-[11px]">
                              ✓ ถูกต้องครบถ้วน
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Undertaking Statement (ไม่มีคำว่า "ในการนี้") */}
                <div className="text-xs sm:text-sm font-sarabun leading-relaxed text-justify space-y-1 mb-6">
                  <p className="indent-12">
                    ข้าพเจ้าขอรับรองว่าได้รับมอบพัสดุและวัสดุอุปกรณ์ตามรายการข้างต้นไว้ถูกต้อง ครบถ้วน และจะจัดเก็บดูแลรักษาพร้อมนำไปใช้ในงานราชการให้เกิดประโยชน์สูงสุดแก่ทางราชการต่อไป
                  </p>
                </div>

                {/* Handover & Receipt Signatures (3 Columns) */}
                <div className="border-t-2 border-black pt-4 grid grid-cols-3 gap-3 text-xs font-sarabun">
                  {/* ผู้รับมอบพัสดุ */}
                  <div className="text-center space-y-1 border-r border-gray-300 pr-2">
                    <p className="font-bold text-gray-900 mb-6">ผู้รับมอบพัสดุ</p>
                    <p>(ลงชื่อ)...........................................................</p>
                    <p className="font-bold">( {record.recipientName} )</p>
                    <p className="text-gray-600 text-[11px]">ตำแหน่ง {record.recipientPosition}</p>
                    <p className="text-gray-500 text-[10px]">วันที่ ......./......./.......</p>
                  </div>

                  {/* ผู้ส่งมอบพัสดุ */}
                  <div className="text-center space-y-1 border-r border-gray-300 pr-2">
                    <p className="font-bold text-gray-900 mb-6">ผู้ส่งมอบพัสดุ (ผู้จ่าย)</p>
                    <p>(ลงชื่อ)...........................................................</p>
                    <p className="font-bold">( {storekeeperName.trim() ? storekeeperName.trim() : '...........................................................'} )</p>
                    <p className="text-gray-600 text-[11px]">{storekeeperPosition.trim() ? storekeeperPosition.trim() : 'ตำแหน่ง ...........................................................'}</p>
                    <p className="text-gray-500 text-[10px]">วันที่ ......./......./.......</p>
                  </div>

                  {/* พยาน / ผู้ตรวจรับ */}
                  <div className="text-center space-y-1">
                    <p className="font-bold text-gray-900 mb-6">พยาน / ผู้รับรอง</p>
                    <p>(ลงชื่อ)...........................................................</p>
                    <p className="font-bold">( {headOfOfficeName.trim() ? headOfOfficeName.trim() : '...........................................................'} )</p>
                    <p className="text-gray-600 text-[11px]">{headOfOfficePosition.trim() ? headOfOfficePosition.trim() : 'ตำแหน่ง ...........................................................'}</p>
                    <p className="text-gray-500 text-[10px]">วันที่ ......./......./.......</p>
                  </div>
                </div>
              </div>

              {/* Page Number footer */}
              <div className="text-right text-[10px] text-gray-400 pt-2 border-t border-dotted border-gray-300">
                หน้าที่ ๒ / ๒ (สำเนาใบรับพัสดุ - งานป้องกันและบรรเทาสาธารณภัย อบต.ม่อนจอง)
              </div>
            </div>
          </div>
        </div>

        {/* Floating Quick Navigation & Scroll Indicator Bar */}
        <div className="sticky bottom-3 z-30 bg-slate-900/90 text-white backdrop-blur-md px-4 py-2 rounded-full shadow-2xl border border-slate-700 flex items-center gap-3 text-xs pointer-events-auto">
          <span className="text-slate-300 font-medium">
            ใบเบิกพัสดุ & ใบรับพัสดุ <span className="text-amber-400 font-bold">๒</span> หน้า A4 (ขนาดปัจจุบัน: {zoom}%)
          </span>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={scrollToTop}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition font-bold flex items-center gap-1 border border-slate-600 cursor-pointer"
              title="เลื่อนไปหน้า 1"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span>หน้า 1 (ใบเบิก)</span>
            </button>
            <button
              type="button"
              onClick={scrollToPage2}
              className="px-2.5 py-1 bg-amber-900/80 hover:bg-amber-800 text-amber-200 hover:text-white rounded-lg transition font-bold flex items-center gap-1 border border-amber-600/70 cursor-pointer"
              title="เลื่อนไปหน้า 2"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>หน้า 2 (ใบรับ)</span>
            </button>
            <button
              type="button"
              onClick={scrollToBottom}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition font-bold flex items-center gap-1 border border-slate-600 cursor-pointer"
              title="เลื่อนลงล่างสุด (ดูลายเซ็น)"
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
