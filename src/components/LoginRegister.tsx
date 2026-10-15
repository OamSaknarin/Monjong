import React, { useState } from 'react';
import { loginUserClient, registerUserClient } from '../utils/gasClient';
import { User } from '../types';
import { KeyRound, Mail, User as UserIcon, Phone, Briefcase, ChevronRight, Wand2, CheckCircle2, AlertTriangle, Info, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import logo from '../assets/logo.png';
import { motion } from 'motion/react';
import disasterBg from '../assets/images/disaster_relief_bg_1782839318929.jpg';

interface LoginRegisterProps {
  onLoginSuccess: (user: User) => void;
  gasUrlSet: boolean;
  onOpenGasSettings: () => void;
}

export default function LoginRegister({ onLoginSuccess, gasUrlSet, onOpenGasSettings }: LoginRegisterProps) {
  const [isLogin, setIsLogin] = useState(true);
  
  // Login Fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
  // Register Fields
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regName, setRegName] = useState('');
  const [regTel, setRegTel] = useState('');
  const [regPosition, setRegPosition] = useState('');
  
  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [loading, setLoading] = useState(false);

  // Center Alert Modal State
  const [modalAlert, setModalAlert] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error';
    onClose?: () => void;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const validatePassword = (pwd: string): boolean => {
    return pwd.length === 6 && /^[A-Za-z0-9]+$/.test(pwd);
  };

  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setModalAlert({
        isOpen: true,
        title: 'ข้อมูลไม่ครบถ้วน',
        message: 'กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วนเพื่อเข้าสู่ระบบ',
        type: 'error'
      });
      return;
    }
    if (!validateEmail(loginEmail)) {
      setModalAlert({
        isOpen: true,
        title: 'รูปแบบอีเมลไม่ถูกต้อง',
        message: 'กรุณาตรวจสอบและกรอกรูปแบบอีเมลให้ถูกต้อง (เช่น user@gmail.com)',
        type: 'error'
      });
      return;
    }
    
    setLoading(true);
    try {
      const result = await loginUserClient(loginEmail, loginPassword);
      if (result.success && result.user) {
        setModalAlert({
          isOpen: true,
          title: 'เข้าสู่ระบบสำเร็จ',
          message: 'ยินดีต้อนรับเข้าสู่ระบบงานป้องกันและบรรเทาสาธารณภัย อบต.ม่อนจอง เจ้าหน้าที่พร้อมปฏิบัติงาน!',
          type: 'success',
          onClose: () => {
            onLoginSuccess(result.user!);
          }
        });
      } else {
        setModalAlert({
          isOpen: true,
          title: 'เข้าสู่ระบบไม่สำเร็จ',
          message: result.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง',
          type: 'error'
        });
      }
    } catch (err) {
      setModalAlert({
        isOpen: true,
        title: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
        message: 'ไม่สามารถติดต่อฐานข้อมูลได้ชั่วคราว กรุณาตรวจสอบอินเทอร์เน็ตหรือการเชื่อมต่อ Google Sheets',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regTel.length < 9 || regTel.length > 10 || !/^\d+$/.test(regTel)) {
      setModalAlert({
        isOpen: true,
        title: 'เบอร์โทรศัพท์ไม่ถูกต้อง',
        message: 'กรุณากรอกเบอร์โทรศัพท์เป็นตัวเลขยาว 9-10 หลักให้ถูกต้อง',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      const result = await registerUserClient({
        email: regEmail,
        password: regPassword,
        name: regName,
        tel: regTel,
        position: regPosition
      });
      if (result.success) {
        setModalAlert({
          isOpen: true,
          title: 'สมัครสมาชิกสำเร็จ',
          message: 'สมัครบัญชีเจ้าหน้าที่ใหม่เสร็จสิ้น! สามารถใช้รหัสผ่านในการเข้าสู่ระบบได้ทันที',
          type: 'success',
          onClose: () => {
            setIsLogin(true);
            setRegEmail('');
            setRegPassword('');
            setRegName('');
            setRegTel('');
            setRegPosition('');
          }
        });
      } else {
        setModalAlert({
          isOpen: true,
          title: 'สมัครสมาชิกไม่สำเร็จ',
          message: result.error || 'เกิดข้อผิดพลาดในการสมัครสมาชิก กรุณาลองใหม่อีกครั้ง',
          type: 'error'
        });
      }
    } catch (err) {
      setModalAlert({
        isOpen: true,
        title: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
        message: 'ไม่สามารถติดต่อฐานข้อมูลได้ชั่วคราว กรุณาตรวจสอบอินเทอร์เน็ตหรือการเชื่อมต่อ Google Sheets',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfaf8] flex flex-col justify-between relative overflow-hidden" id="login-container">
      {/* 3D Chibi Disaster Relief Motion Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        <motion.div
          className="absolute inset-[-40px] bg-cover bg-center opacity-85"
          style={{ backgroundImage: `url(${disasterBg})` }}
          animate={{
            scale: [1.02, 1.06, 1.02],
            x: [-10, 10, -10],
            y: [-6, 6, -6],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />
        {/* Soft elegant gradient overlay to guarantee perfect contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-orange-50/50 via-white/40 to-amber-100/50 backdrop-blur-[2px]" />
      </div>

      {/* Header Bar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-orange-100 bg-white/70 backdrop-blur-md z-10">
        <div className="flex items-center space-x-3">
          <img src={logo} alt="อบต. ม่อนจอง" className="w-12 h-12 shrink-0 object-contain" referrerPolicy="no-referrer" />
          <div>
            <h1 className="font-heading text-xs sm:text-sm font-bold text-orange-950 tracking-tight leading-none whitespace-nowrap">
              งานป้องกันและบรรเทาสาธารณภัย
            </h1>
            <p className="text-[10px] text-orange-600 font-bold mt-1.5">อบต.ม่อนจอง</p>
          </div>
        </div>
        <button 
          onClick={onOpenGasSettings}
          className="hidden items-center space-x-1.5 px-4 py-2 rounded-xl border border-orange-200 text-orange-700 bg-white/90 hover:bg-orange-50 shadow-sm text-[10px] font-heading font-bold transition duration-200 active:scale-95"
        >
          <Wand2 className="w-3.5 h-3.5 text-orange-500" />
          <span>ตั้งค่า Google Sheets</span>
        </button>
      </header>

      {/* Main Container */}
      <div className="flex-grow flex items-center justify-center p-6 z-10 my-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl border border-orange-100/80 shadow-2xl shadow-orange-950/10 overflow-hidden transition-all duration-300"
        >
          
          {/* Top Banner Accent */}
          <div className="bg-gradient-to-r from-orange-500 via-orange-400 to-amber-500 h-2 w-full" />
          
          <div className="p-8">
            <div className="text-center mb-8 flex flex-col items-center">
              {isLogin && (
                <img src={logo} alt="ปภ" className="w-12 h-12 mb-3 object-contain" referrerPolicy="no-referrer" />
              )}
              <h2 className="font-heading text-xl font-black text-orange-950 tracking-tight">
                {isLogin ? (
                  <>
                    ลงชื่อเข้าใช้ระบบ<br/>
                    <span className="text-sm font-semibold text-orange-700">งานป้องกันและบรรเทาสาธารณภัย</span>
                  </>
                ) : 'สมัครสมาชิกใหม่'}
              </h2>
            </div>

            {isLogin ? (
              // LOGIN FORM
              <form onSubmit={handleLoginSubmit} className="space-y-5" id="login-form">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-2 font-heading">
                    E-MAIL
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder=""
                      className="w-full pl-10 pr-4 py-3 bg-white/60 focus:bg-white/90 backdrop-blur-xs rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-xs transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider font-heading">
                      PASSWORD
                    </label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder=""
                      maxLength={6}
                      className="w-full pl-10 pr-10 py-3 bg-white/60 focus:bg-white/90 backdrop-blur-xs rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-xs transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-orange-500 transition focus:outline-none"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 text-white font-heading font-bold rounded-xl shadow-lg shadow-orange-500/20 flex items-center justify-center space-x-2 transition"
                >
                  <span>{loading ? 'กำลังเข้าระบบ...' : 'เข้าสู่ระบบ'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              // REGISTER FORM
              <form onSubmit={handleRegisterSubmit} className="space-y-4" id="register-form">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5 font-heading">
                    E-MAIL *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder=""
                      className="w-full pl-10 pr-4 py-2.5 bg-white/60 focus:bg-white/90 backdrop-blur-xs rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-xs transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5 font-heading">
                    PASSWORD *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder=""
                      maxLength={6}
                      className="w-full pl-10 pr-10 py-2.5 bg-white/60 focus:bg-white/90 backdrop-blur-xs rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-xs transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-orange-500 transition focus:outline-none"
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="w-1/3">
                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5 font-heading">
                      คำนำหน้า
                    </label>
                    <div className="relative">
                      <select
                        className="w-full px-2 py-2.5 bg-white/60 focus:bg-white/90 backdrop-blur-xs rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-xs transition-all"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                             setRegName(val + regName.replace(/^(นาย|นางสาว|นาง)/, ''));
                          }
                        }}
                      >
                        <option value="">- เลือก -</option>
                        <option value="นาย">นาย</option>
                        <option value="นาง">นาง</option>
                        <option value="นางสาว">นางสาว</option>
                      </select>
                    </div>
                  </div>
                  <div className="w-2/3">
                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5 font-heading">
                      ชื่อ - นามสกุล *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={regName.replace(/^(นาย|นางสาว|นาง)/, '')}
                        onChange={(e) => {
                          const prefixMatch = regName.match(/^(นาย|นางสาว|นาง)/);
                          const prefix = prefixMatch ? prefixMatch[0] : '';
                          setRegName(prefix + e.target.value);
                        }}
                        placeholder=""
                        className="w-full pl-10 pr-4 py-2.5 bg-white/60 focus:bg-white/90 backdrop-blur-xs rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-xs transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5 font-heading">
                      เบอร์โทรศัพท์ *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        value={regTel}
                        onChange={(e) => setRegTel(e.target.value)}
                        placeholder=""
                        maxLength={10}
                        className="w-full pl-10 pr-4 py-2.5 bg-white/60 focus:bg-white/90 backdrop-blur-xs rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-xs transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5 font-heading">
                      ตำแหน่งงาน *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={regPosition}
                        onChange={(e) => setRegPosition(e.target.value)}
                        placeholder=""
                        className="w-full pl-10 pr-4 py-2.5 bg-white/60 focus:bg-white/90 backdrop-blur-xs rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-xs transition-all"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-heading font-bold rounded-xl shadow-md flex items-center justify-center space-x-2 transition mt-2"
                >
                  <span>{loading ? 'กำลังสร้างบัญชี...' : 'สมัครสมาชิกพนักงาน'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Switch Mode Toggle */}
            <div className="mt-6 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 transition font-heading focus:outline-none"
              >
                {isLogin ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
              </button>
            </div>

          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-[10px] font-bold text-gray-400 border-t border-orange-50/50 bg-white/30 backdrop-blur-sm">
        งานป้องกันและบรรเทาสาธารณภัย อบต.ม่อนจอง © 2026. พัฒนาระบบโดย Oam snr
      </footer>

      {/* Custom Elegance Toast Popup */}
      {toast && (
        <div 
          className={`fixed bottom-6 right-6 max-w-sm p-4 rounded-xl shadow-lg flex items-start space-x-3 border z-[99999] animate-slide-in-up transition-all ${
            toast.type === 'success' 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-900' 
              : toast.type === 'error'
              ? 'bg-rose-50 border-rose-100 text-rose-900'
              : 'bg-orange-50 border-orange-100 text-orange-900'
          }`}
          id="toast-popup"
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />}
          {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />}
          
          <div className="text-[10px]">
            <span className="font-bold block font-heading mb-0.5">
              {toast.type === 'success' ? 'ดำเนินการสำเร็จ' : toast.type === 'error' ? 'แจ้งเตือนข้อผิดพลาด' : 'ข้อมูลระบบ'}
            </span>
            <p className="font-sans leading-relaxed text-gray-600">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Center Modal Alert for Login and Registration */}
      {modalAlert && modalAlert.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-orange-950/40 backdrop-blur-md animate-fade-in" id="modal-alert-overlay">
          <div className="bg-white rounded-3xl border-2 border-orange-200 shadow-2xl p-6 sm:p-8 max-w-sm w-full mx-auto flex flex-col items-center text-center transform scale-100 transition-all duration-300">
            {/* Colorful Glow Effect for Icons */}
            <div className={`p-4 rounded-full mb-4 ${
              modalAlert.type === 'success' 
                ? 'bg-emerald-50 text-emerald-600 ring-4 ring-emerald-100/50' 
                : 'bg-rose-50 text-rose-600 ring-4 ring-rose-100/50'
            }`}>
              {modalAlert.type === 'success' ? (
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              ) : (
                <AlertTriangle className="w-10 h-10 stroke-[2.5]" />
              )}
            </div>

            <h3 className={`font-heading text-lg font-bold mb-2 ${
              modalAlert.type === 'success' ? 'text-emerald-950' : 'text-rose-950'
            }`}>
              {modalAlert.title}
            </h3>
            
            <p className="text-xs text-gray-600 leading-relaxed font-sans mb-6">
              {modalAlert.message}
            </p>

            <button
              onClick={() => {
                const handler = modalAlert.onClose;
                setModalAlert(null);
                if (handler) handler();
              }}
              className={`w-full py-3 px-6 font-heading font-bold rounded-xl transition duration-200 outline-none ${
                modalAlert.type === 'success'
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                  : 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20'
              }`}
            >
              ตกลง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
