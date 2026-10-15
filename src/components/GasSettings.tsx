import React, { useState } from 'react';
import { GOOGLE_APPS_SCRIPT_CODE } from '../utils/gasCode';
import { getGasUrl, setGasUrl, testGasDriveAccess } from '../utils/gasClient';
import { Sparkles, Copy, Check, FileCode, ShieldAlert, RefreshCw, X, Database, HardDrive, CheckCircle2, AlertTriangle, Play, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface GasSettingsProps {
  onClose: () => void;
  onUrlUpdated: (url: string) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function GasSettings({ onClose, onUrlUpdated, showToast }: GasSettingsProps) {
  const [urlInput, setUrlInput] = useState(getGasUrl());
  const [copied, setCopied] = useState(false);
  const [isTestingDrive, setIsTestingDrive] = useState(false);
  const [driveTestResult, setDriveTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message?: string;
    error?: string;
    isPermissionError?: boolean;
  } | null>(null);

  const handleTestDrive = async () => {
    setIsTestingDrive(true);
    setDriveTestResult(null);
    try {
      const res = await testGasDriveAccess();
      setDriveTestResult({
        tested: true,
        success: res.success,
        message: res.message,
        error: res.error,
        isPermissionError: res.isPermissionError
      });
      if (res.success) {
        showToast('✅ Google Drive พร้อมใช้งาน: อัปโหลดและย้ายไฟล์ลงถังขยะได้ 100%', 'success');
      } else if (res.isPermissionError) {
        showToast('⚠️ สคริปต์ยังไม่ได้รับสิทธิ์ Google Drive (Access denied) กรุณากด Run ใน Apps Script', 'error');
      } else {
        showToast(`สถานะ Drive: ${res.error || 'ตรวจสอบไม่สำเร็จ'}`, 'info');
      }
    } catch (e: any) {
      setDriveTestResult({
        tested: true,
        success: false,
        error: String(e)
      });
      showToast('ไม่สามารถเชื่อมต่อทดสอบได้', 'error');
    } finally {
      setIsTestingDrive(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopied(true);
    showToast('คัดลอกโค้ด Apps Script ลงคลิปบอร์ดแล้ว', 'success');
    setTimeout(() => {
      setCopied(false);
    }, 3000);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = urlInput.trim();
    
    // สนับสนุนทั้งแบบ Google Apps Script Web App และสเปรดชีตลิงก์ตรง!
    const isGasUrl = /^https:\/\/script\.google\.com\/macros\/s\/.*\/exec$/i.test(cleanUrl);
    const isSheetUrl = /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i.test(cleanUrl);

    if (cleanUrl && !isGasUrl && !isSheetUrl) {
      showToast('รูปแบบ URL ไม่ถูกต้อง! ต้องเป็น URL สคริปต์เว็บแอป หรือ URL สเปรดชีต Google Sheet โดยตรง', 'error');
      return;
    }

    setGasUrl(cleanUrl);
    onUrlUpdated(cleanUrl);
    
    if (cleanUrl) {
      if (isSheetUrl) {
        showToast(
          'เชื่อมต่อกับ Google Sheet ลิงก์ตรงสำเร็จ! (เปิดใช้โหมดดึงข้อมูลอัจฉริยะแบบอ่านตรงแล้ว)', 
          'success'
        );
      } else {
        showToast(
          'เชื่อมต่อฐานข้อมูล Google Sheets ผ่านเว็บแอปเรียบร้อยแล้ว! ข้อมูลจะซิงก์สองทาง', 
          'success'
        );
      }
    } else {
      showToast('สลับกลับมาใช้ฐานข้อมูล Sandbox จำลองเรียบร้อย', 'success');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" id="gas-settings-overlay">
      <div className="bg-orange-50/95 backdrop-blur-sm rounded-[2.5rem] border-4 border-white shadow-[0_25px_50px_-12px_rgba(234,88,12,0.25)] max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slide-up relative font-sans text-gray-800">
        {/* Top Banner Accent */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 z-10" />

        {/* Header */}
        <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-5 sm:p-6 text-white flex justify-between items-center shrink-0 border-b-4 border-white/50 relative">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/50 shadow-md bg-white shrink-0 flex items-center justify-center text-xl">
              <Database className="w-5 h-5 text-orange-500 animate-pulse" />
            </div>
            <div>
              <h3 className="font-heading font-black text-sm sm:text-base tracking-wide drop-shadow-sm">การเชื่อมต่อฐานข้อมูลหลัก Google Sheets</h3>
              <p className="text-orange-50 text-[10px] sm:text-xs mt-0.5 font-medium">ควบคุมข้อมูลแบบคลาวด์ผ่าน Google Apps Script (doPost Web App)</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all hover:rotate-90 active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-gray-700 leading-relaxed custom-scrollbar">
          
          {/* Quick Alert */}
          <div className="bg-orange-100/60 border border-orange-200/80 rounded-2xl p-4 flex items-start space-x-3 text-orange-950">
            <Sparkles className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block font-heading text-xs mb-0.5">ระบบฐานข้อมูลแบบไฮบริด (Hybrid Sandbox / Google Sheets)</span>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                หากยังไม่ได้ติดตั้ง Google Sheets, ระบบจะบันทึกข้อมูลทุกอย่างลงบน <span className="font-bold text-orange-700">LocalStorage ของเบราว์เซอร์คุณโดยอัตโนมัติ</span> เพื่อให้ทดสอบเล่นพอร์ทัลได้ 100% ทันที! แต่เพื่อการใช้งานจริงถาวร คุณสามารถสร้างสคริปต์เชื่อมต่อตามคู่มือข้างล่างนี้
              </p>
            </div>
          </div>

          {/* Setup steps */}
          <div className="space-y-3">
            <h4 className="font-heading font-black text-orange-950 text-xs border-b border-orange-100 pb-1.5 flex items-center gap-1">
              <span>📋 ขั้นตอนการติดตั้งบน Google Sheets (ง่ายใน 2 นาที)</span>
            </h4>
            
            <ol className="list-decimal pl-4 space-y-2 text-[11px] text-gray-600">
              <li>สร้างสเปรดชีตเปล่าใหม่ขึ้นมาหนึ่งอันบน <a href="https://sheets.google.com" target="_blank" rel="noopener" className="text-orange-600 underline font-bold hover:text-orange-700 transition-colors">Google Sheets</a></li>
              <li>คลิกเมนู <span className="font-bold text-gray-800">"ส่วนขยาย" (Extensions)</span> &gt; <span className="font-bold text-gray-800">"Apps Script"</span></li>
              <li>ลบโค้ดเดิมในนั้นออกให้หมด แล้วกดปุ่มคัดลอก <span className="font-bold text-orange-700">"คัดลอกโค้ดสคริปต์ Code.gs"</span> ข้างล่างไปวางแทนที่</li>
              <li>⭐ <span className="font-bold text-amber-700">สำคัญสำหรับ Google Drive & ถังขยะ:</span> ที่แถบด้านบน เลือกฟังก์ชัน <code className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold text-[10px]">authorizeGoogleDrive</code> แล้วกดปุ่ม ▶️ <span className="font-bold text-gray-900">"เรียกใช้" (Run)</span> เพื่อกดอนุมัติสิทธิ์ (Review Permissions &gt; ขั้นสูง &gt; อนุญาต)</li>
              <li>คลิก <span className="font-bold text-gray-800">"การทำให้ใช้งานได้" (Deploy)</span> &gt; <span className="font-bold text-gray-800">"การทำให้ใช้งานได้ใหม่" (New Deployment)</span></li>
              <li>เลือกประเภทเป็น <span className="font-bold text-gray-800">"เว็บแอป" (Web App)</span> แล้วตั้งค่าดังนี้:
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>ผู้ดูแลสิทธิ์: <span className="text-orange-700 font-bold">บัญชี Google ของฉัน (Me)</span></li>
                  <li>ผู้มีสิทธิ์เข้าถึง: เลือกเป็น <span className="text-orange-700 font-bold">"ทุกคน" (Anyone)</span> *(สำคัญมากเพื่อให้ตัวเว็บแอปเชื่อมต่อได้)*</li>
                </ul>
              </li>
              <li>กด "ทำให้ใช้งานได้" และคัดลอก <span className="font-bold text-gray-800">URL เว็บแอป (Web App URL)</span> ที่ได้ นำมาวางกรอกในช่องด้านล่างนี้แล้วกดบันทึก!</li>
            </ol>
          </div>

          {/* Google Drive & Trash Permission Section */}
          <div className="bg-amber-50/90 border-2 border-amber-300/80 rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-heading font-black text-amber-950 text-xs">
                    📁 สิทธิ์ Google Drive & การย้ายไฟล์ไปไว้ในถังขยะ
                  </h4>
                  <p className="text-[10px] text-amber-800">
                    จำเป็นต้องกดอนุมัติสิทธิ์ 1 ครั้งใน Apps Script เพื่อให้สคริปต์สามารถบันทึกไฟล์และย้ายไฟล์ลงถังขยะได้
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleTestDrive}
                disabled={isTestingDrive}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-heading font-bold text-[10px] rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50 shrink-0"
              >
                {isTestingDrive ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                <span>{isTestingDrive ? 'กำลังทดสอบ...' : 'ทดสอบสิทธิ์ Google Drive'}</span>
              </button>
            </div>

            {driveTestResult && (
              <div className={`p-3 rounded-xl border text-[11px] leading-relaxed flex items-start gap-2.5 ${
                driveTestResult.success 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}>
                {driveTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold block text-xs">
                    {driveTestResult.success 
                      ? '✅ สิทธิ์ Google Drive ผ่านสมบูรณ์ 100%' 
                      : '⚠️ ยังไม่ได้รับสิทธิ์ Google Drive (Access denied: DriveApp)'}
                  </span>
                  <span className="text-[10.5px]">
                    {driveTestResult.success 
                      ? (driveTestResult.message || 'พร้อมสร้างโฟลเดอร์ อัปโหลดเอกสาร และย้ายไฟล์ลงถังขยะ Google Drive')
                      : 'กรุณาเปิด Apps Script แล้วเลือกฟังก์ชัน authorizeGoogleDrive กด Run ▶️ เพื่อให้สิทธิ์'}
                  </span>
                </div>
              </div>
            )}

            {/* Step-by-step for Authorize */}
            <div className="bg-white/90 p-3 rounded-xl border border-amber-200 text-[11px] space-y-2 text-gray-700">
              <span className="font-bold text-amber-950 block text-[11px]">
                📌 วิธีแก้ไขให้ไฟล์ขึ้นใน Drive และย้ายลงถังขยะเมื่อกดลบ:
              </span>
              <ol className="list-decimal pl-4 space-y-1.5 text-[10.5px] text-gray-600">
                <li>เปิด Google Sheet ของคุณ &gt; ไปที่เมนู <span className="font-bold text-gray-800">"ส่วนขยาย" (Extensions) &gt; "Apps Script"</span></li>
                <li>วางโค้ดล่าสุดจากปุ่มคัดลอกด้านล่างนี้ลงไป แล้วกดปุ่ม <b>บันทึก 💾</b></li>
                <li>ที่แถบเครื่องมือด้านบน เลือกฟังก์ชัน <code className="bg-amber-100 text-amber-950 px-1 py-0.5 rounded font-mono font-bold">authorizeGoogleDrive</code> แล้วกดปุ่ม ▶️ <b>"เรียกใช้" (Run)</b></li>
                <li>กด <b>"ตรวจสอบสิทธิ์" (Review Permissions)</b> &gt; เลือกบัญชีของคุณ &gt; กด <b>"ขั้นสูง" (Advanced)</b> &gt; กด <b>"ไปที่ ... (ไม่ปลอดภัย)"</b> &gt; กด <b>"อนุญาต" (Allow)</b></li>
                <li>คลิกเมนู <b>"การทำให้ใช้งานได้" (Deploy)</b> &gt; <b>"จัดการการทำให้ใช้งานได้"</b> &gt; กดรูปดินสอ ✏️ &gt; เลือก <b>"เวอร์ชันใหม่" (New version)</b> &gt; กด <b>"ทำให้ใช้งานได้"</b></li>
              </ol>
            </div>
          </div>

          {/* Copy Script Area */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-heading font-bold text-orange-950 flex items-center gap-1">
                <FileCode className="w-4 h-4 text-orange-500" />
                <span>ซอร์สโค้ดสำหรับวางใน Google Apps Script (Code.gs)</span>
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-2.5 py-1.5 bg-orange-100/80 hover:bg-orange-100 border border-orange-200 text-orange-800 rounded-lg font-heading font-semibold text-[10px] flex items-center gap-1 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-orange-600" />}
                <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอกโค้ดสคริปต์ Code.gs'}</span>
              </button>
            </div>

            <div className="relative">
              <pre className="p-3 bg-white border border-orange-100 rounded-xl overflow-x-auto text-[10px] font-mono h-32 max-h-32 text-gray-500 leading-normal scrollbar-thin">
                {GOOGLE_APPS_SCRIPT_CODE}
              </pre>
              <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none rounded-b-xl" />
            </div>
          </div>

          {/* Configuration Form */}
          <form onSubmit={handleSaveSettings} className="pt-4 border-t border-orange-200/50 space-y-4">
            <div>
              <label className="block text-xs font-bold text-orange-950 mb-1.5 font-heading">
                ลิงก์สเปรดชีต Google Sheet หรือ URL เว็บแอป (Google Apps Script)
              </label>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/... หรือ https://script.google.com/macros/s/.../exec"
                className="w-full p-2.5 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-xl outline-none font-mono text-xs transition-all"
              />
              <p className="mt-1.5 text-[10px] text-gray-500">
                💡 <b>ตั้งค่าลิงก์อัตโนมัติ:</b> คุณสามารถนำ URL ของ Google Sheet ที่คุณสร้างไว้มาวางในช่องนี้ได้ทันที (เพียงแชร์ชีตให้เป็น "ทุกคนที่มีลิงก์มีสิทธิ์อ่าน" หรือ "Anyone with link can view") เพื่อดึงข้อมูลมาแสดงผลอัตโนมัติ!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row-reverse gap-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-heading font-black text-xs rounded-2xl shadow-[0_4px_0_0_#ea580c] active:translate-y-[2px] active:shadow-[0_2px_0_0_#ea580c] transition-all"
              >
                บันทึกการเชื่อมต่อและดึงข้อมูลใหม่ 💾
              </motion.button>
              
              {getGasUrl() && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => {
                    setUrlInput('');
                    setGasUrl('');
                    onUrlUpdated('');
                    showToast('สลับกลับมาใช้ฐานข้อมูล Sandbox จำลองเรียบร้อย', 'success');
                    onClose();
                  }}
                  className="flex-1 py-3 border-2 border-rose-200 text-rose-700 hover:bg-rose-50 font-heading font-bold text-xs rounded-2xl active:translate-y-[2px] shadow-sm transition-all"
                >
                  ถอนการเชื่อมต่อ Google Sheets 🔌
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={onClose}
                className="px-5 py-3 border-2 border-gray-300 text-gray-600 bg-white font-heading font-bold text-xs rounded-2xl hover:bg-gray-50 active:translate-y-[2px] shadow-sm transition-all"
              >
                ปิดหน้าต่าง ✖
              </motion.button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
