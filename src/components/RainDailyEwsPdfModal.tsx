import React, { useRef, useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Download, X, CloudRain, Droplets, AlertCircle, RotateCcw, FileText, ZoomIn, ZoomOut, ChevronUp, ChevronDown, Image as ImageIcon } from 'lucide-react';
import logo from '../assets/logo.png';
import { getThaiTodayStr } from '../utils/dateUtils';
import { printElement, downloadPdfFromContainer, downloadImageFromContainer } from '../utils/pdfExport';

interface RainDailyEwsPdfModalProps {
  currentTime: Date;
  tmdDailyForecast: any;
  latestWarning: any;
  monJongRainStations: any[];
  monJongWaterStations: any[];
  highlightProvinces: (text: string) => React.ReactNode;
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

export default function RainDailyEwsPdfModal({
  currentTime,
  tmdDailyForecast,
  latestWarning,
  monJongRainStations,
  monJongWaterStations,
  highlightProvinces,
  onClose,
  showToast
}: RainDailyEwsPdfModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  
  const [reporterName, setReporterName] = useState('');
  const [reporterPosition, setReporterPosition] = useState('');
  const [approverName, setApproverName] = useState('');
  const [approverPosition, setApproverPosition] = useState('');

  // Interactive Zoom and Smooth Scroll Controls
  const [zoom, setZoom] = useState<number>(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 60 : 85));
  const printRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
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

  const reportDateStr = useMemo(() => {
    return formatThaiDate(getThaiTodayStr());
  }, []);

  const timeStr = useMemo(() => {
    return currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
  }, [currentTime]);

  const handlePrint = () => {
    if (!printRef.current) return;
    
    // Save names to localStorage
    localStorage.setItem('reporter_name', reporterName);
    localStorage.setItem('reporter_position', reporterPosition);

    printElement(
      printRef.current, 
      'รายงานสถานการณ์เฝ้าระวังภัยพิบัติและอุตุนิยมวิทยา - อบต.ม่อนจอง', 
      orientation === 'landscape'
    );
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsGenerating(true);

    try {
      // Save names to localStorage
      localStorage.setItem('reporter_name', reporterName);
      localStorage.setItem('reporter_position', reporterPosition);

      await downloadPdfFromContainer({
        container: printRef.current,
        filename: `MonJong_EWS_Report_${getThaiTodayStr()}.pdf`,
        isLandscape: orientation === 'landscape',
        showToast
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
      showToast('เกิดข้อผิดพลาดในการดาวน์โหลด PDF', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!printRef.current) return;
    setIsGeneratingImage(true);

    try {
      localStorage.setItem('reporter_name', reporterName);
      localStorage.setItem('reporter_position', reporterPosition);

      await downloadImageFromContainer({
        container: printRef.current,
        filename: `MonJong_EWS_Report_${getThaiTodayStr()}.png`,
        format: 'png',
        showToast
      });
    } catch (err) {
      console.error('Error generating Image:', err);
      showToast('เกิดข้อผิดพลาดในการส่งออกรูปภาพ', 'error');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 w-full h-full max-h-screen overflow-hidden bg-slate-900/95 backdrop-blur-md z-[9999] flex flex-col font-sans">
      {/* Top Controls Header */}
      <div className="bg-slate-800 text-white p-2.5 sm:p-4 flex flex-wrap items-center justify-between gap-2.5 shadow-md border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-orange-600/20 text-orange-400 rounded-lg border border-orange-500/30 shrink-0">
            <CloudRain className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading font-black text-xs sm:text-sm md:text-base text-white flex items-center gap-2">
              <span>พิมพ์และส่งออกรายงานสถานการณ์น้ำเฝ้าระวังภัยพิบัติ</span>
              <span className="px-2 py-0.5 rounded-full bg-orange-900/80 text-orange-300 text-[10px] font-bold border border-orange-700/50">
                1 หน้า A4
              </span>
            </h2>
            <p className="text-[10px] sm:text-[11px] text-slate-300">
              พรีวิวรายงานเอกสารมาตรฐาน A4 (ศูนย์เฝ้าระวังภัยพิบัติ อบต.ม่อนจอง)
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Orientation Toggle */}
          <div className="flex items-center bg-slate-700/80 p-0.5 rounded-xl border border-slate-600 text-xs">
            <button
              type="button"
              onClick={() => setOrientation('landscape')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition ${
                orientation === 'landscape'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              แนวนอน
            </button>
            <button
              type="button"
              onClick={() => setOrientation('portrait')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition ${
                orientation === 'portrait'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
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
              className="px-2 py-1 bg-orange-700 hover:bg-orange-600 text-white rounded-md font-bold text-[10px] transition cursor-pointer"
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

          {/* Reporter & Approver Names */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-700/80 px-2 py-1 rounded-lg border border-slate-600">
              <span className="text-slate-300 font-bold text-[11px] whitespace-nowrap">ผู้จัดทำ:</span>
              <input
                type="text"
                placeholder="ชื่อผู้จัดทำ"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded px-2 py-0.5 text-xs text-white placeholder-slate-400 w-28 outline-none focus:border-orange-500"
                title="ชื่อผู้จัดทำรายงาน"
              />
              <input
                type="text"
                placeholder="ตำแหน่ง"
                value={reporterPosition}
                onChange={(e) => setReporterPosition(e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded px-2 py-0.5 text-xs text-white placeholder-slate-400 w-32 outline-none focus:border-orange-500"
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
                className="bg-slate-800 border border-slate-600 rounded px-2 py-0.5 text-xs text-white placeholder-slate-400 w-28 outline-none focus:border-orange-500"
                title="ชื่อผู้ตรวจรับรอง"
              />
              <input
                type="text"
                placeholder="ตำแหน่ง"
                value={approverPosition}
                onChange={(e) => setApproverPosition(e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded px-2 py-0.5 text-xs text-white placeholder-slate-400 w-32 outline-none focus:border-orange-500"
                title="ตำแหน่งผู้ตรวจรับรอง"
              />
            </div>
          </div>

          {/* Buttons */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-heading font-bold text-xs rounded-xl border border-slate-500 transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            title="พิมพ์เอกสารออกเครื่องพิมพ์โดยตรง"
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
            className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-heading font-bold text-xs rounded-xl shadow-md border border-orange-500 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="ดาวน์โหลดเป็นไฟล์ PDF คุณภาพมาตรฐาน"
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
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition cursor-pointer"
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
          <div
            className={`a4-sheet bg-white text-gray-900 shadow-2xl p-6 sm:p-8 border border-gray-300 relative flex flex-col justify-between rounded-sm shrink-0 my-2 ${
              orientation === 'landscape'
                ? 'w-[1050px] min-h-[742px] max-w-none'
                : 'w-[760px] min-h-[1075px] max-w-none'
            }`}
          >
            <div>
              {/* Official Letterhead Header */}
              <div className="flex items-start justify-between border-b-2 border-orange-600 pb-3 mb-4">
                <div className="flex items-center gap-3">
                  <img src={logo} alt="ตรา อบต.ม่อนจอง" className="w-14 h-14 object-contain shrink-0" />
                  <div>
                    <h1 className="font-heading font-black text-base sm:text-lg text-gray-900 leading-tight">
                      รายงานสถานการณ์เฝ้าระวังภัยพิบัติทางธรรมชาติ และข้อมูลอุตุนิยมวิทยา
                    </h1>
                    <p className="text-xs text-gray-700 mt-0.5">
                      ศูนย์ปฏิบัติการร่วมเฝ้าระวังภัยพิบัติ องค์การบริหารส่วนตำบลม่อนจอง อำเภออมก๋อย จังหวัดเชียงใหม่
                    </p>
                  </div>
                </div>

                <div className="text-right text-xs text-gray-700 shrink-0 font-medium">
                  <p>วันที่ออกรายงาน: <span className="font-bold text-gray-900">{reportDateStr}</span></p>
                  <p className="mt-0.5 text-orange-700 font-bold">เวลาออกรายงาน: {timeStr}</p>
                </div>
              </div>

              {/* Weather Summary Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-center">
                <div className="p-2 bg-orange-50/80 border border-orange-200 rounded">
                  <p className="text-[10px] text-orange-800 font-semibold">สถานีวัดน้ำฝน (RF)</p>
                  <p className="text-xs font-bold text-orange-950">{monJongRainStations.length} สถานี</p>
                </div>
                <div className="p-2 bg-blue-50/80 border border-blue-200 rounded">
                  <p className="text-[10px] text-blue-800 font-semibold">สถานีวัดระดับน้ำ (WL)</p>
                  <p className="text-xs font-bold text-blue-950">{monJongWaterStations.length} สถานี</p>
                </div>
                <div className="p-2 bg-sky-50/80 border border-sky-200 rounded">
                  <p className="text-[10px] text-sky-800 font-semibold">สภาพอากาศภาคเหนือ</p>
                  <p className="text-xs font-bold text-sky-950">
                    {tmdDailyForecast?.northern?.rainSummary ? 'มีกลุ่มฝนกระจาย' : 'ปกติ'}
                  </p>
                </div>
                <div className="p-2 bg-rose-50/80 border border-rose-200 rounded">
                  <p className="text-[10px] text-rose-800 font-semibold">สถานะเฝ้าระวังภัย</p>
                  <p className="text-xs font-bold text-rose-900">
                    {latestWarning?.summary ? 'มีประกาศเตือนภัย' : 'สภาวะปกติ'}
                  </p>
                </div>
              </div>

              {/* TMD Forecast Section if available */}
              {tmdDailyForecast?.northern && (
                <div className="mb-4 bg-sky-50/60 border border-sky-300 p-3 rounded-lg text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-sky-900 border-b border-sky-200 pb-1 mb-1.5">
                    <CloudRain className="w-4 h-4 text-sky-600" />
                    <span>พยากรณ์อากาศประจำวัน ภาคเหนือ (กรมอุตุนิยมวิทยา)</span>
                  </div>
                  <p className="text-gray-800 text-[11px] leading-relaxed">
                    <span className="font-semibold text-sky-900">สภาวะฝน: </span>
                    {tmdDailyForecast.northern.rainSummary} |{' '}
                    <span className="font-semibold text-sky-900">อุณหภูมิ: </span>
                    ต่ำสุด {tmdDailyForecast.northern.tempMin} °C / สูงสุด {tmdDailyForecast.northern.tempMax} °C |{' '}
                    <span className="font-semibold text-sky-900">ลม: </span>
                    {tmdDailyForecast.northern.windSummary}
                  </p>
                  {tmdDailyForecast.northern.description && (
                    <p className="text-gray-600 text-[10px] mt-1 italic border-t border-sky-100 pt-1">
                      {tmdDailyForecast.northern.description}
                    </p>
                  )}
                </div>
              )}

              {/* TMD Warning Alert if available */}
              {latestWarning?.summary && (
                <div className="mb-4 bg-rose-50/80 border border-rose-300 p-3 rounded-lg text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-rose-900 border-b border-rose-200 pb-1 mb-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>ประกาศเตือนภัยกรมอุตุนิยมวิทยา</span>
                  </div>
                  <div className="text-rose-950 text-[11px] leading-relaxed space-y-1">
                    {latestWarning.summary.split('\n').filter(Boolean).map((line: string, idx: number) => (
                      <p key={idx} className="flex items-start gap-1">
                        <span className="text-rose-600 font-bold">•</span>
                        <span>{line.replace(/^[-•*\d.]+\s*/, '').trim()}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Stations Grid / Tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* RF Stations Table */}
                <div className="border border-gray-400 rounded overflow-hidden">
                  <div className="bg-orange-100/80 px-3 py-1.5 border-b border-gray-400 flex items-center justify-between">
                    <span className="font-bold text-xs text-orange-950 flex items-center gap-1.5">
                      <CloudRain className="w-3.5 h-3.5 text-orange-600" />
                      ข้อมูลสถานีวัดน้ำฝน (RF)
                    </span>
                    <span className="text-[10px] text-gray-600 font-medium">รวม {monJongRainStations.length} สถานี</span>
                  </div>
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-gray-100 text-gray-800 font-semibold border-b border-gray-400">
                        <th className="p-1.5 border-r border-gray-400">ชื่อสถานี</th>
                        <th className="p-1.5 border-r border-gray-400 text-right">ปริมาณฝน (มม.)</th>
                        <th className="p-1.5 text-center">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monJongRainStations.map((st, i) => (
                        <tr key={i} className="border-b border-gray-300 last:border-b-0">
                          <td className="p-1.5 border-r border-gray-300 font-medium text-gray-900">
                            {st.stationName.replace('ต.ม่อนจอง อ.อมก๋อย จ.เชียงใหม่', '').replace('ม่อนจอง', '').replace('บ้าน', 'บ.').trim()}
                          </td>
                          <td className="p-1.5 border-r border-gray-300 text-right font-bold text-gray-900">
                            {st.rainVal.toFixed(2)}
                          </td>
                          <td className="p-1.5 text-center font-bold text-[10px]">
                            <span className={`px-1.5 py-0.5 rounded ${
                              st.status === 'ฝนหนัก'
                                ? 'bg-rose-100 text-rose-800'
                                : st.status === 'ฝนปานกลาง'
                                ? 'bg-amber-100 text-amber-800'
                                : st.status === 'ฝนเล็กน้อย'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {st.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {monJongRainStations.length === 0 && (
                        <tr>
                          <td colSpan={3} className="p-3 text-center text-gray-500 italic">
                            ไม่มีข้อมูลสถานีวัดน้ำฝน
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* WL Stations Table */}
                <div className="border border-gray-400 rounded overflow-hidden">
                  <div className="bg-blue-100/80 px-3 py-1.5 border-b border-gray-400 flex items-center justify-between">
                    <span className="font-bold text-xs text-blue-950 flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-blue-600" />
                      ข้อมูลสถานีวัดระดับน้ำ (WL)
                    </span>
                    <span className="text-[10px] text-gray-600 font-medium">รวม {monJongWaterStations.length} สถานี</span>
                  </div>
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-gray-100 text-gray-800 font-semibold border-b border-gray-400">
                        <th className="p-1.5 border-r border-gray-400">ชื่อลำธาร / สถานี</th>
                        <th className="p-1.5 border-r border-gray-400 text-right">ระดับน้ำ (ม.)</th>
                        <th className="p-1.5 text-center">ระดับตลิ่ง</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monJongWaterStations.map((st, i) => (
                        <tr key={i} className="border-b border-gray-300 last:border-b-0">
                          <td className="p-1.5 border-r border-gray-300 font-medium text-gray-900">
                            {st.stationName.replace('น้ำแม่ตื่น', 'ม.ตื่น').replace('บ้าน', 'บ.').trim()}
                          </td>
                          <td className="p-1.5 border-r border-gray-300 text-right font-bold text-gray-900">
                            {st.waterLevel.toFixed(2)}
                          </td>
                          <td className="p-1.5 text-center text-[10px] text-gray-700">
                            ต่ำกว่า {(st.bankLevel - st.waterLevel).toFixed(2)} ม. ({st.percentStorage.toFixed(0)}%)
                          </td>
                        </tr>
                      ))}
                      {monJongWaterStations.length === 0 && (
                        <tr>
                          <td colSpan={3} className="p-3 text-center text-gray-500 italic">
                            ไม่มีข้อมูลสถานีวัดระดับน้ำ
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Signatures and Footer Notice */}
            <div className="mt-4 pt-3 border-t border-gray-300">
              <div className="grid grid-cols-2 gap-8 text-xs">
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

              {/* Footer Notice */}
              <div className="mt-3 pt-2 border-t border-gray-200 text-center text-[10px] text-gray-500 flex justify-between items-center">
                <span>เอกสารนี้สร้างจากระบบสารสนเทศงานป้องกันและบรรเทาสาธารณภัย อบต.ม่อนจอง</span>
                <span className="font-semibold text-gray-700">ศูนย์ปฏิบัติการเฝ้าระวังภัยพิบัติ EWS</span>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Floating Quick Navigation & Scroll Indicator Bar */}
        <div className="sticky bottom-3 z-30 bg-slate-900/90 text-white backdrop-blur-md px-4 py-2 rounded-full shadow-2xl border border-slate-700 flex items-center gap-3 text-xs pointer-events-auto">
          <span className="text-slate-300 font-medium">
            รายงานเฝ้าระวังภัยพิบัติ <span className="text-orange-400 font-bold">1</span> หน้า A4 (ขนาดปัจจุบัน: {zoom}%)
          </span>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={scrollToTop}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition font-bold flex items-center gap-1 border border-slate-600 cursor-pointer"
              title="เลื่อนขึ้นด้านบนสุด"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span>บนสุด</span>
            </button>
            <button
              type="button"
              onClick={scrollToBottom}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition font-bold flex items-center gap-1 border border-slate-600 cursor-pointer"
              title="เลื่อนลงดูลายเซ็นท้ายเอกสาร"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>ล่างสุด (ลายเซ็น)</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
