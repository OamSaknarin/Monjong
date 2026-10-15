import React, { useRef, useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RelatedLink } from '../types';
import { Printer, Download, X, Globe, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import logo from '../assets/logo.png';
import { getThaiTodayStr } from '../utils/dateUtils';
import { downloadPdfFromContainer, printElement } from '../utils/pdfExport';

interface RelatedWebsitesPdfModalProps {
  links: RelatedLink[];
  allLinks?: RelatedLink[];
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
      }
    }
  }
  return dateStr;
};

export default function RelatedWebsitesPdfModal({
  links,
  allLinks = [],
  onClose,
  showToast
}: RelatedWebsitesPdfModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [dataSource, setDataSource] = useState<'filtered' | 'all'>('all');
  const [reporterName, setReporterName] = useState('');
  const [reporterPosition, setReporterPosition] = useState('');
  const [approverName, setApproverName] = useState('');
  const [approverPosition, setApproverPosition] = useState('');
  const [zoom, setZoom] = useState<number>(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 60 : 85));

  const printRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when modal opens
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const activeLinks = useMemo(() => {
    return dataSource === 'filtered' ? links : (allLinks.length > 0 ? allLinks : links);
  }, [dataSource, links, allLinks]);

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
    if (activeLinks.length === 0) return [[]];
    const result: RelatedLink[][] = [];
    let remaining = [...activeLinks];

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
  }, [activeLinks, itemsPerPageFirst, itemsPerPageNext]);

  const handlePrint = () => {
    if (!printRef.current) return;
    printElement(printRef.current, 'ทำเนียบระบบสารสนเทศและเว็บไซต์ - อบต.ม่อนจอง', orientation === 'landscape');
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsGenerating(true);

    try {
      await downloadPdfFromContainer({
        container: printRef.current,
        filename: `ทำเนียบเว็บไซต์และระบบสารสนเทศ_${getThaiTodayStr()}.pdf`,
        isLandscape: orientation === 'landscape',
        showToast
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
      showToast('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 w-full h-full max-h-screen overflow-hidden bg-slate-900/90 backdrop-blur-md flex flex-col z-[9999] font-sans">
      {/* Top Controls Header */}
      <div className="bg-slate-800 text-white p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-md border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-600/20 text-teal-400 rounded-lg border border-teal-500/30">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading font-black text-sm sm:text-base text-white">
              พิมพ์และส่งออกรายงานทำเนียบระบบสารสนเทศและเว็บไซต์ที่เกี่ยวข้อง
            </h2>
            <p className="text-[11px] text-slate-300">
              พรีวิวรายงานเอกสารมาตรฐาน A4 (งานเทคโนโลยีสารสนเทศ อบต.ม่อนจอง)
            </p>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Data Source */}
          <select
            value={dataSource}
            onChange={(e) => setDataSource(e.target.value as any)}
            className="bg-slate-700 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-teal-500 font-medium"
          >
            <option value="all">เว็บไซต์ทั้งหมด ({allLinks.length || links.length} ลิงก์)</option>
            <option value="filtered">ตามตัวกรอง ({links.length} ลิงก์)</option>
          </select>

          {/* Items Per Page */}
          <select
            value={itemsPerPageSetting}
            onChange={(e) => setItemsPerPageSetting(e.target.value === 'auto' ? 'auto' : Number(e.target.value))}
            className="bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-teal-500 font-medium"
            title="จำนวนรายการต่อหน้า"
          >
            <option value="auto">อัตโนมัติ/หน้า</option>
            <option value={8}>8 รายการ/หน้า</option>
            <option value={10}>10 รายการ/หน้า</option>
            <option value={12}>12 รายการ/หน้า</option>
            <option value={15}>15 รายการ/หน้า</option>
            <option value={20}>20 รายการ/หน้า</option>
          </select>

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

          {/* Orientation Toggle */}
          <div className="flex items-center bg-slate-700/80 p-1 rounded-xl border border-slate-600 text-xs">
            <button
              type="button"
              onClick={() => setOrientation('landscape')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                orientation === 'landscape' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              แนวนอน
            </button>
            <button
              type="button"
              onClick={() => setOrientation('portrait')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                orientation === 'portrait' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              แนวตั้ง
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
                className="bg-slate-800 border border-slate-600 rounded px-2 py-0.5 text-xs text-white placeholder-slate-400 w-28 outline-none focus:border-teal-500"
                title="ชื่อผู้จัดทำรายงาน"
              />
              <input
                type="text"
                placeholder="ตำแหน่ง"
                value={reporterPosition}
                onChange={(e) => setReporterPosition(e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded px-2 py-0.5 text-xs text-white placeholder-slate-400 w-32 outline-none focus:border-teal-500"
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
                className="bg-slate-800 border border-slate-600 rounded px-2 py-0.5 text-xs text-white placeholder-slate-400 w-28 outline-none focus:border-teal-500"
                title="ชื่อผู้ตรวจรับรอง"
              />
              <input
                type="text"
                placeholder="ตำแหน่ง"
                value={approverPosition}
                onChange={(e) => setApproverPosition(e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded px-2 py-0.5 text-xs text-white placeholder-slate-400 w-32 outline-none focus:border-teal-500"
                title="ตำแหน่งผู้ตรวจรับรอง"
              />
            </div>
          </div>

          {/* Print / Download buttons */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-heading font-bold text-xs rounded-xl border border-slate-500 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGenerating}
            className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-heading font-bold text-xs rounded-xl shadow-md border border-teal-500 transition flex items-center gap-1.5 cursor-pointer"
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

      {/* Main Preview Container */}
      <div className="flex-1 w-full overflow-y-auto overflow-x-auto min-h-0 p-3 sm:p-6 md:p-8 bg-slate-200/90 flex flex-col items-center gap-6 custom-scrollbar overscroll-contain touch-pan-y focus:outline-none">
        <div 
          ref={printRef} 
          className="flex flex-col items-center gap-6 w-full origin-top transition-transform duration-100"
          style={{ zoom: `${zoom}%` }}
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
                className={`a4-sheet bg-white text-gray-900 shadow-2xl p-6 sm:p-8 border border-gray-300 relative flex flex-col justify-between transition-all rounded-sm shrink-0 my-2 ${
                  orientation === 'landscape'
                    ? 'w-full max-w-[1050px] min-h-[742px]'
                    : 'w-full max-w-[760px] min-h-[1050px]'
                }`}
              >
                <div>
                  {/* Header Document Section */}
                  <div className="flex items-start justify-between border-b-2 border-gray-800 pb-3 mb-3">
                    <div className="flex items-center gap-3">
                      <img src={logo} alt="ตรา อบต." className="w-14 h-14 object-contain shrink-0" />
                      <div>
                        <h1 className="font-heading font-black text-base sm:text-lg text-gray-900 leading-tight">
                          รายงานทำเนียบระบบสารสนเทศและเว็บไซต์หน่วยงานที่เกี่ยวข้อง
                        </h1>
                        <p className="text-xs text-gray-700 mt-0.5">
                          งานป้องกันและบรรเทาสาธารณภัย องค์การบริหารส่วนตำบลม่อนจอง อำเภออมก๋อย จังหวัดเชียงใหม่
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-xs text-gray-700 shrink-0 font-medium">
                      <p>วันที่ออกรายงาน: <span className="font-bold text-gray-900">{reportDateStr}</span></p>
                      <p className="mt-0.5 text-teal-800 font-bold">
                        หน้า {pageIdx + 1} จาก {totalPages}
                      </p>
                    </div>
                  </div>

                  {/* Summary Statistics Strip - page 1 only */}
                  {pageIdx === 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-3 text-center text-xs">
                      <div className="bg-teal-50 p-2 rounded border border-teal-200">
                        <span className="text-teal-700 block text-[10px]">จำนวนเว็บไซต์ภายนอก</span>
                        <span className="font-bold text-teal-900 text-sm">{activeLinks.length} ลิงก์</span>
                      </div>
                      <div className="bg-blue-50 p-2 rounded border border-blue-200">
                        <span className="text-blue-700 block text-[10px]">หมวดหมู่หลัก</span>
                        <span className="font-bold text-blue-900 text-sm">หน่วยงานรัฐ / อุตุนิยมวิทยา</span>
                      </div>
                      <div className="bg-gray-50 p-2 rounded border border-gray-200">
                        <span className="text-gray-600 block text-[10px]">สถานะลิงก์เชื่อมโยง</span>
                        <span className="font-bold text-gray-800 text-sm">ใช้งานได้ปกติ</span>
                      </div>
                    </div>
                  )}

                  {/* Table */}
                  <div className="overflow-x-auto mb-3">
                    <table className="w-full text-left border-collapse text-xs" style={{ border: '1px solid #4b5563' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                          <th style={{ border: '1px solid #4b5563', padding: '5px 4px', width: '44px', minWidth: '44px', textAlign: 'center', whiteSpace: 'nowrap' }}>ลำดับ</th>
                          <th style={{ border: '1px solid #4b5563', padding: '5px 7px', width: '150px' }}>ชื่อเว็บไซต์ / ระบบสารสนเทศ</th>
                          <th style={{ border: '1px solid #4b5563', padding: '5px 7px' }}>ที่อยู่เว็บไซต์ (URL)</th>
                          <th style={{ border: '1px solid #4b5563', padding: '5px 7px', width: '120px' }}>หมวดหมู่ / หน่วยงาน</th>
                          <th style={{ border: '1px solid #4b5563', padding: '5px 7px', width: '130px' }}>คำอธิบาย / การใช้งาน</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageItems.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ border: '1px solid #4b5563', padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                              ไม่พบข้อมูลเว็บไซต์ที่เกี่ยวข้อง
                            </td>
                          </tr>
                        ) : (
                          pageItems.map((item, index) => {
                            const itemNum = startIdx + index;
                            return (
                              <tr key={item.id || index}>
                                <td style={{ border: '1px solid #4b5563', padding: '5px 4px', width: '44px', minWidth: '44px', textAlign: 'center', whiteSpace: 'nowrap', fontWeight: 600 }}>{itemNum}</td>
                                <td style={{ border: '1px solid #4b5563', padding: '5px 7px', fontWeight: 600, color: '#111827' }}>
                                  {item.title}
                                </td>
                                <td style={{ border: '1px solid #4b5563', padding: '5px 7px', fontFamily: 'monospace', color: '#1d4ed8', fontSize: '11px' }}>
                                  {item.url}
                                </td>
                                <td style={{ border: '1px solid #4b5563', padding: '5px 7px' }}>{item.category || 'หน่วยงานภายนอก'}</td>
                                <td style={{ border: '1px solid #4b5563', padding: '5px 7px', color: '#6b7280', fontSize: '11px' }}>
                                  {item.description || '-'}
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
                    <span>ทำเนียบระบบสารสนเทศ งานป้องกันและบรรเทาสาธารณภัย อบต.ม่อนจอง</span>
                    <span className="font-semibold text-gray-700">หน้า {pageIdx + 1} จาก {totalPages}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
