import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ExpenseRecord } from '../types';
import { getThaiTodayStr } from '../utils/dateUtils';
import { Coins, Search, Plus, Trash2, Edit3, X, DollarSign, Wallet, TrendingUp, Calendar, AlertTriangle, Download, Eye, Printer } from 'lucide-react';
import { exportToExcel } from '../utils/export';
import ExpensesPdfModal from './ExpensesPdfModal';
import { motion } from 'motion/react';

interface ExpensesProps {
  expenses: ExpenseRecord[];
  onSaveExpenses: (updated: ExpenseRecord[]) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  showConfirm: (title: string, message: string, type: 'save' | 'edit' | 'delete' | 'default') => Promise<boolean>;
}

export default function Expenses({ expenses, onSaveExpenses, showToast, showConfirm }: ExpensesProps) {
  // Filters and Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [viewingExpense, setViewingExpense] = useState<ExpenseRecord | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Form Inputs
  const [date, setDate] = useState(getThaiTodayStr());
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState<string>(''); // Changed to string for input
  const [planSelect, setPlanSelect] = useState('สำนักปลัด');
  const [customPlanName, setCustomPlanName] = useState('');
  const [budget, setBudget] = useState(''); 
  const [project, setProject] = useState(''); 
  const [purpose, setPurpose] = useState(''); 
  const [plannedBudget, setPlannedBudget] = useState<string>(''); 
  const [details, setDetails] = useState('');
  const [note, setNote] = useState('');

  const PRESET_PLANS = [
    'สำนักปลัด',
    'งานป้องกันและบรรเทาสาธารณภัย',
    'งานจราจร',
    'งานบริหารงานทั่วไป'
  ];

  // Details and Note auto-resize ref and effect
  const detailsRef = useRef<HTMLTextAreaElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    if (detailsRef.current) {
      detailsRef.current.style.height = 'auto';
      detailsRef.current.style.height = `${detailsRef.current.scrollHeight}px`;
    }
    if (noteRef.current) {
      noteRef.current.style.height = 'auto';
      noteRef.current.style.height = `${noteRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
    const timer = setTimeout(adjustHeight, 100);
    return () => clearTimeout(timer);
  }, [details, note, isModalOpen]);

  const planOptions = [
    'สำนักปลัด',
    'งานป้องกันและบรรเทาสาธารณภัย',
    'งานบริหารงานทั่วไป',
    'งานจราจร',
    'อื่นๆ'
  ];

  const handleExport = () => {
    const data = expenses.map(e => ({
      'วันที่': e.date,
      'รายการ': e.item,
      'แผนงาน': e.planName,
      'งบ': e.budget,
      'โครงการ': e.project,
      'เพื่อจ่ายเป็นค่า': e.purpose,
      'ยอดเงิน': e.amount,
      'งบประมาณแผน': e.plannedBudget
    }));
    exportToExcel(data, 'บันทึกงบประมาณและค่าใช้จ่าย', 'รายการค่าใช้จ่าย');
    showToast('ส่งออกไฟล์ Excel เรียบร้อย', 'success');
  };

  // เปิด Modal สำหรับเพิ่ม
  const handleOpenAddExpense = () => {
    setEditingExpenseId(null);
    setDate(getThaiTodayStr());
    setItem('');
    setAmount('');
    setPlanSelect('สำนักปลัด');
    setCustomPlanName('');
    setBudget('');
    setProject('');
    setPurpose('');
    setPlannedBudget('');
    setDetails('');
    setNote('');
    setIsModalOpen(true);
  };

  // เปิด Modal สำหรับแก้ไข
  const handleOpenEditExpense = (record: ExpenseRecord) => {
    setEditingExpenseId(record.id);
    setDate(record.date || getThaiTodayStr());
    setItem(record.item || '');
    setAmount(record.amount !== undefined && record.amount !== null ? String(record.amount) : '');
    const currentPlan = record.planName || 'สำนักปลัด';
    if (PRESET_PLANS.includes(currentPlan)) {
      setPlanSelect(currentPlan);
      setCustomPlanName('');
    } else {
      setPlanSelect('อื่นๆ');
      setCustomPlanName(currentPlan);
    }
    setBudget(record.budget || '');
    setProject(record.project || '');
    setPurpose(record.purpose || '');
    setPlannedBudget(record.plannedBudget !== undefined && record.plannedBudget !== null ? String(record.plannedBudget) : '');
    setDetails(record.details || '');
    setNote(record.note || '');
    setIsModalOpen(true);
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalPlanName = (planSelect === 'อื่นๆ' ? customPlanName : planSelect || '').trim();
    const trimmedItem = (item || '').trim();
    if (!trimmedItem || Number(amount) <= 0 || !finalPlanName) {
      showToast('กรุณากรอกรายการ จำนวนเงิน และแผนงานให้ครบถ้วน', 'error');
      return;
    }

    const record: ExpenseRecord = {
      id: editingExpenseId || 'exp-' + Date.now(),
      date: date || getThaiTodayStr(),
      item: trimmedItem,
      amount: Number(amount),
      planName: finalPlanName,
      budget: budget || '',
      project: project || '',
      purpose: purpose || '',
      type: 'รายจ่ายประจำ', // Defaulting since field is removed
      plannedBudget: Number(plannedBudget || 0),
      details: (details || '').trim(),
      note: (note || '').trim()
    };

    if (editingExpenseId) {
      const confirmed = await showConfirm(
        'ยืนยันการแก้ไขบันทึกค่าใช้จ่าย',
        `คุณต้องการบันทึกการแก้ไขข้อมูลค่าใช้จ่าย "${trimmedItem}" ใช่หรือไม่?`,
        'edit'
      );
      if (!confirmed) return;

      const updated = expenses.map(e => e.id === editingExpenseId ? record : e);
      onSaveExpenses(updated);
      showToast('แก้ไขบันทึกค่าใช้จ่ายและงบประมาณเรียบร้อย', 'success');
    } else {
      const confirmed = await showConfirm(
        'ยืนยันการบันทึกค่าใช้จ่ายใหม่',
        `คุณต้องการบันทึกค่าใช้จ่าย "${trimmedItem}" จำนวน ${Number(amount).toLocaleString()} บาท ใช่หรือไม่?`,
        'save'
      );
      if (!confirmed) return;

      onSaveExpenses([...expenses, record]);
      showToast('บันทึกค่าใช้จ่ายรายหน่วยงานสำเร็จ', 'success');
    }
    setIsModalOpen(false);
  };

  const handleDeleteExpense = async (id: string) => {
    const expenseToDelete = expenses.find(e => e.id === id);
    const label = expenseToDelete ? expenseToDelete.item : 'รายการนี้';

    const confirmed = await showConfirm(
      'ยืนยันการลบบันทึกค่าใช้จ่าย',
      `คุณต้องการลบบันทึกค่าใช้จ่าย "${label}" ออกจากสารบบงบประมาณใช่หรือไม่?`,
      'delete'
    );
    if (confirmed) {
      const filtered = expenses.filter(e => e.id !== id);
      onSaveExpenses(filtered);
      showToast('ลบประวัติค่าใช้จ่ายสำเร็จ', 'success');
    }
  };

  // กรองข้อมูลค่าใช้จ่าย
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const item = exp.item || '';
      const planName = exp.planName || '';
      const budget = exp.budget || '';
      const project = exp.project || '';
      const purpose = exp.purpose || '';
      const details = exp.details || '';
      const note = exp.note || '';

      const matchesSearch = item.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            planName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            budget.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            project.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            details.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            note.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPlanName = filterCategory === 'all' || exp.planName === filterCategory;
      return matchesSearch && matchesPlanName;
    });
  }, [expenses, searchQuery, filterCategory]);

  // สรุปยอดเงินรวม
  // ดึงหมวดหมู่ทั้งหมดในระบบมาสกัดตัวเลือกกรอง
  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(expenses.map(e => e.planName)));
  }, [expenses]);

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-emerald-200 p-4 sm:p-6 md:p-8 shadow-xl relative overflow-hidden flex-grow flex flex-col w-full max-w-full min-w-0" id="expenses-panel">
      {/* Top Gradient Glow Accent Bar */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 to-teal-600" />
      
      {isModalOpen ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6 animate-in fade-in duration-200 z-10 relative">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingExpenseId ? 'แก้ไขรายการใช้จ่าย' : 'เพิ่มรายการเบิกจ่ายงบประมาณ'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">กรอกข้อมูลการใช้จ่ายเพื่อบันทึกลงในระบบบัญชี</p>
              </div>
            </div>
            
          </div>

          <form onSubmit={handleExpenseSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 font-heading font-semibold">วันที่จ่าย <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full p-2.5 bg-white/60 focus:bg-white/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 font-heading font-semibold">รายการ <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={item}
                      onChange={(e) => setItem(e.target.value)}
                      className="w-full p-2.5 bg-white/60 focus:bg-white/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 font-heading font-semibold">ยอดเงินจ่ายจริง (บาท) <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full p-2.5 bg-white/60 focus:bg-white/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 font-mono transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 font-heading font-semibold">งบประมาณตั้งไว้ (บาท)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={plannedBudget}
                      onChange={(e) => setPlannedBudget(e.target.value)}
                      className="w-full p-2.5 bg-white/60 focus:bg-white/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 font-mono transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 font-heading font-semibold">แผนงาน <span className="text-red-500">*</span></label>
                    <select
                      value={planSelect}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPlanSelect(val);
                        if (val !== 'อื่นๆ') {
                          setCustomPlanName('');
                        }
                      }}
                      className="w-full p-2.5 bg-white/60 focus:bg-white/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all cursor-pointer font-sans"
                    >
                      <option value="สำนักปลัด">สำนักปลัด</option>
                      <option value="งานป้องกันและบรรเทาสาธารณภัย">งานป้องกันและบรรเทาสาธารณภัย</option>
                      <option value="งานจราจร">งานจราจร</option>
                      <option value="งานบริหารงานทั่วไป">งานบริหารงานทั่วไป</option>
                      <option value="อื่นๆ">อื่นๆ</option>
                    </select>
                  </div>
                  {planSelect === 'อื่นๆ' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 font-heading font-semibold">ระบุแผนงานอื่นๆ <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required={planSelect === 'อื่นๆ'}
                        value={customPlanName}
                        onChange={(e) => setCustomPlanName(e.target.value)}
                        placeholder="กรอกชื่อแผนงาน..."
                        className="w-full p-2.5 bg-white/60 focus:bg-white/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all font-sans"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 font-heading font-semibold">โครงการ</label>
                  <input
                    type="text"
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    className="w-full p-2.5 bg-white/60 focus:bg-white/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 font-heading font-semibold">หมวดรายจ่าย (งบ)</label>
                    <input
                      type="text"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full p-2.5 bg-white/60 focus:bg-white/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 font-heading font-semibold">เพื่อจ่ายเป็นค่า</label>
                    <input
                      type="text"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="w-full p-2.5 bg-white/60 focus:bg-white/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 font-heading font-semibold">รายละเอียด</label>
                  <textarea
                    ref={detailsRef}
                    value={details}
                    onChange={(e) => {
                      setDetails(e.target.value);
                      adjustHeight();
                    }}
                    rows={2}
                    className="w-full p-2.5 bg-white/60 focus:bg-white/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all resize-none overflow-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 font-heading font-semibold">หมายเหตุ</label>
                  <textarea
                    ref={noteRef}
                    value={note}
                    onChange={(e) => {
                      setNote(e.target.value);
                      adjustHeight();
                    }}
                    rows={2}
                    className="w-full p-2.5 bg-white/60 focus:bg-white/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all resize-none overflow-hidden"
                  />
                </div>
              </div>

              
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 font-semibold text-gray-600 transition-colors cursor-pointer text-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleExpenseSubmit}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-2 font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer text-sm"
              >
                {editingExpenseId ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
{/* Background visual graphics */}
      <div className="absolute -top-10 -right-10 w-80 h-80 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-gradient-to-tr from-teal-500/10 to-emerald-400/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-emerald-100 pb-6 mb-6 relative z-10">
        <div className="flex items-center space-x-4">
          <div className="p-4 bg-gradient-to-tr from-emerald-500 to-teal-600 text-white rounded-2xl shadow-lg shadow-emerald-500/30">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading text-xl sm:text-2xl font-black text-emerald-950 tracking-tight">บัญชีรายจ่าย</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 font-medium">บันทึกและตรวจสอบการใช้งบประมาณ</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl border-2 border-emerald-300 bg-emerald-50/80 hover:bg-emerald-100/90 text-emerald-800 text-xs sm:text-sm font-heading font-extrabold transition-all duration-200 shadow-sm active:scale-95 cursor-pointer"
            title="พิมพ์หรือส่งออกรายงาน PDF"
          >
            <Printer className="w-4 h-4 text-emerald-700" />
            <span>พิมพ์ / รายงาน PDF</span>
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl border-2 border-emerald-200 text-emerald-800 hover:text-white hover:bg-emerald-500 hover:border-emerald-500 text-xs sm:text-sm font-heading font-extrabold transition-all duration-200 shadow-sm active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>excel</span>
          </button>
        </div>
      </div>

      {/* Searching & Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6 bg-orange-50/20 p-4 rounded-xl border border-orange-100">
        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหา"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 transition"
          />
        </div>

        <div className="md:col-span-3">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 font-heading font-medium"
          >
            <option value="all">📂 ทุกหมวดหมู่ค่าใช้จ่าย</option>
            {uniqueCategories.map((cat, idx) => (
              <option key={`cat-${cat}-${idx}`} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <button
            onClick={handleOpenAddExpense}
            className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-heading text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>บันทึกจ่ายใหม่</span>
          </button>
        </div>
      </div>

      {/* Desktop Table View of Expenses */}
      <div className="overflow-x-auto border border-orange-50 rounded-xl w-full max-w-full min-w-0 custom-scrollbar">
        <table className="w-full text-left border-collapse text-xs min-w-[700px]">
          <thead>
            <tr className="bg-orange-50/50 border-b border-orange-100 text-orange-950 font-heading">
              <th className="p-3 font-semibold">วันที่จ่าย</th>
              <th className="p-3 font-semibold">แผนงาน & งบ</th>
              <th className="p-3 font-semibold">รายการใช้จ่าย / รายละเอียด</th>
              <th className="p-3 font-semibold text-right">ยอดเงินจ่ายจริง</th>
              <th className="p-3 font-semibold">สถานะเทียบงบประมาณตั้งไว้</th>
              <th className="p-3 font-semibold text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-orange-50 font-sans">
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-gray-400 font-heading">ไม่พบข้อมูลรายจ่ายในสารบบ</td>
              </tr>
            ) : (
              filteredExpenses.map((exp, idx) => {
                const percentUsed = Math.min(100, Math.round((exp.amount / exp.plannedBudget) * 100));
                const isOver = exp.amount > exp.plannedBudget;
                
                return (
                  <tr key={`exp-${exp.id}-${idx}`} className="hover:bg-orange-50/10 transition-colors">
                    <td className="p-3 text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-mono">{exp.date}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[9px] block w-max font-medium font-heading mb-1">
                        {exp.planName}
                      </span>
                      <span className="text-[10px] text-orange-700 font-bold block">{exp.budget}</span>
                      <span className="text-[10px] text-gray-600 block">{exp.project}</span>
                    </td>
                    <td 
                      className="p-3 max-w-xs cursor-pointer hover:bg-orange-50 group"
                      onClick={() => setViewingExpense(exp)}
                      title="คลิกเพื่อดูรายละเอียด"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-gray-900 text-xs group-hover:text-orange-600 transition-colors">{exp.item}</div>
                          {exp.details && <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{exp.details}</p>}
                          {exp.note && <div className="text-[9px] text-gray-400 italic mt-0.5">Note: {exp.note}</div>}
                        </div>
                        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye className="w-4 h-4 text-orange-400" />
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-right font-bold font-mono text-xs text-rose-600">
                      {exp.amount.toLocaleString()} ฿
                    </td>
                    <td className="p-3">
                      <div className="space-y-1.5 w-40">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-gray-400">แผน: {exp.plannedBudget.toLocaleString()} ฿</span>
                          <span className={`font-mono font-bold ${isOver ? 'text-rose-600' : 'text-gray-700'}`}>
                            {percentUsed}%
                          </span>
                        </div>
                        {/* Visual progress bar */}
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              isOver ? 'bg-rose-500' : percentUsed >= 90 ? 'bg-amber-500' : 'bg-orange-500'
                            }`}
                            style={{ width: `${percentUsed}%` }}
                          />
                        </div>
                        {isOver && (
                          <span className="text-[9px] text-rose-600 font-bold flex items-center gap-0.5 leading-none">
                            <AlertTriangle className="w-3 h-3 text-rose-500" /> งบใช้เกินเพดาน!
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => handleOpenEditExpense(exp)}
                          className="p-1.5 rounded text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition"
                          title="แก้ไขบันทึก"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="ลบออก"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* --- ADD/EDIT EXPENSE MODAL --- */}
      

      {/* --- VIEW DETAIL MODAL --- */}
      {viewingExpense && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" id="expense-view-modal">
          <div className="bg-orange-50/95 backdrop-blur-sm rounded-[2.5rem] border-4 border-white shadow-[0_25px_50px_-12px_rgba(234,88,12,0.25)] max-w-2xl w-full flex flex-col max-h-[90vh] animate-slide-up relative overflow-hidden font-sans text-gray-800">
            {/* Top Banner Accent */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 z-10" />

            {/* Header */}
            <div className="bg-gradient-to-br from-orange-500 to-amber-500 text-white p-5 sm:p-6 relative flex items-center gap-4 border-b-4 border-white/50 shrink-0">
              <button 
                type="button"
                onClick={() => setViewingExpense(null)} 
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all hover:rotate-90 active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/50 shadow-md bg-white shrink-0 flex items-center justify-center text-xl">
                🔎
              </div>
              <div>
                <h3 className="font-heading font-black text-sm sm:text-base tracking-wide drop-shadow-sm">
                  รายละเอียดการเบิกจ่าย
                </h3>
                <p className="text-orange-50 text-[10px] sm:text-xs mt-0.5 font-medium">รายการใช้จ่าย / รายละเอียดฉบับเต็ม</p>
              </div>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
              <div className="bg-white rounded-2xl p-5 border-2 border-orange-100 shadow-sm space-y-4">
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 font-heading">รายการใช้จ่าย</div>
                  <div className="font-bold text-gray-900 text-base">{viewingExpense.item}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 font-heading">แผนงาน</div>
                    <div className="font-medium text-gray-700 text-sm">{viewingExpense.planName}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 font-heading">วันที่จ่าย</div>
                    <div className="font-medium text-gray-700 text-sm font-mono">{viewingExpense.date}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 font-heading">หมวดรายจ่าย (งบ)</div>
                    <div className="font-medium text-gray-700 text-sm">{viewingExpense.budget}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 font-heading">ประเภท</div>
                    <div className="font-medium text-gray-700 text-sm">{viewingExpense.type || "-"}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 font-heading">โครงการ/งาน</div>
                    <div className="font-medium text-gray-700 text-sm">{viewingExpense.project || "-"}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 font-heading">เพื่อจ่ายเป็นค่า</div>
                    <div className="font-medium text-gray-700 text-sm">{viewingExpense.purpose || "-"}</div>
                  </div>
                </div>
              </div>

              {(viewingExpense.details || viewingExpense.note) && (
                <div className="bg-orange-50/50 rounded-2xl p-5 border-2 border-orange-100/50 shadow-sm space-y-4">
                  {viewingExpense.details && (
                    <div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 font-heading">รายละเอียดเพิ่มเติม</div>
                      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{viewingExpense.details}</div>
                    </div>
                  )}
                  {viewingExpense.note && (
                    <div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 font-heading">หมายเหตุ</div>
                      <div className="text-sm text-gray-500 italic bg-white/50 p-3 rounded-xl border border-orange-100/30 whitespace-pre-wrap">{viewingExpense.note}</div>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-rose-50 rounded-2xl p-5 border-2 border-rose-100 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black text-rose-400 uppercase tracking-wider mb-1 font-heading">ยอดเงินจ่ายจริง</div>
                  <div className="text-[10px] text-rose-500/80">เทียบงบตั้งไว้: {viewingExpense.plannedBudget.toLocaleString()} ฿</div>
                </div>
                <div className="font-heading font-black text-2xl text-rose-600">
                  {viewingExpense.amount.toLocaleString()} ฿
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6 bg-white border-t-2 border-orange-100 shrink-0">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button" 
                onClick={() => setViewingExpense(null)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black font-heading shadow-[0_4px_0_0_#ea580c] active:translate-y-[2px] active:shadow-[0_2px_0_0_#ea580c] transition-all"
              >
                ปิดหน้าต่าง ✖
              </motion.button>
            </div>
          </div>
        </div>,
        document.body
      )}
        </>
      )}

      {/* Expenses PDF Report Modal */}
      {isPdfModalOpen && (
        <ExpensesPdfModal
          expenses={filteredExpenses}
          allExpenses={expenses}
          currentFilterPlan={filterCategory}
          searchQuery={searchQuery}
          onClose={() => setIsPdfModalOpen(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
}
