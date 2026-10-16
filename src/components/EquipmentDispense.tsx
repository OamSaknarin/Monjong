import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Equipment, BorrowRecord, DispenseRecord } from '../types';
import { getThaiTodayStr, getThaiNow } from '../utils/dateUtils';
import { exportToExcel } from '../utils/export';
import { fetchDispensesFromGas, saveDispensesToGas, getGasUrl } from '../utils/gasClient';
import DispenseSlipPdfModal from './DispenseSlipPdfModal';
import EquipmentPdfModal from './EquipmentPdfModal';
import { 
  Package, Search, FileDown, Plus, Trash2, Edit3, Check, 
  X, AlertTriangle, Eye, RefreshCw, Layers, MapPin, Tag, ArrowRight, UserCheck, Calendar, FileText, Printer,
  ClipboardList, CheckCircle2, User, Building, Phone, Send, Info, Database, CloudUpload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EquipmentDispenseProps {
  equipment: Equipment[];
  dispenses: DispenseRecord[];
  borrows?: BorrowRecord[];
  onSaveEquipment: (updated: Equipment[]) => void;
  onSaveDispenses: (updated: DispenseRecord[]) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  showConfirm: (title: string, message: string, type: 'save' | 'edit' | 'delete' | 'default') => Promise<boolean>;
  onNavigateToBorrow?: () => void;
  hideHeader?: boolean;
  autoOpenNew?: boolean;
  preselectedItemId?: string;
  onModalClosed?: () => void;
  onRefreshData?: () => Promise<void> | void;
}

type SubTab = 'dispense-records' | 'inventory-status' | 'search-export';

export default function EquipmentDispense({
  equipment,
  dispenses = [],
  borrows = [],
  onSaveEquipment,
  onSaveDispenses,
  showToast,
  showConfirm,
  onNavigateToBorrow,
  hideHeader = false,
  autoOpenNew = false,
  preselectedItemId,
  onModalClosed,
  onRefreshData
}: EquipmentDispenseProps) {
  const [activeTab, setActiveTab] = useState<SubTab>('dispense-records');
  const [isReportPdfModalOpen, setIsReportPdfModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // คำนวณจำนวนอุปกรณ์ที่ถูกเบิกจ่ายไปแล้ว (เฉพาะสถานะ 'เบิกจ่ายแล้ว' หรือ 'รออนุมัติ')
  const dispensedQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    dispenses.forEach(d => {
      if (d.status !== 'ยกเลิก') {
        const q = Number(d.qty) || 1;
        map.set(d.itemId, (map.get(d.itemId) || 0) + q);
      }
    });
    return map;
  }, [dispenses]);

  // ฟังก์ชันคำนวณ ยอดทั้งหมด, ถูกเบิกจ่ายแล้ว, และยอดคงเหลือพร้อมเบิก
  const getStockInfo = React.useCallback((item: Equipment, excludeDispenseRecordId?: string | null) => {
    let available = Number(item.qty) || 0;
    const dispensed = dispensedQtyMap.get(item.id) || 0;
    if (excludeDispenseRecordId) {
      const activeRecord = dispenses.find(d => d.id === excludeDispenseRecordId);
      if (activeRecord && activeRecord.status !== 'ยกเลิก') {
        const groupRecords = activeRecord.groupId 
          ? dispenses.filter(d => d.groupId === activeRecord.groupId && d.status !== 'ยกเลิก')
          : dispenses.filter(d => d.recipientName === activeRecord.recipientName && d.dispenseDate === activeRecord.dispenseDate && d.status !== 'ยกเลิก');
        const match = groupRecords.find(r => r.itemId === item.id);
        if (match) {
          available += (Number(match.qty) || 1);
        }
      }
    }
    const total = Number(item.qty) || 0;
    return { total, dispensed, available };
  }, [dispensedQtyMap, dispenses]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');

  // --- DISPENSE FORM MODAL STATE ---
  const [isDispenseModalOpen, setIsDispenseModalOpen] = useState(false);
  const [editingDispenseId, setEditingDispenseId] = useState<string | null>(null);
  const [selectedPdfRecord, setSelectedPdfRecord] = useState<DispenseRecord | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Form Inputs
  const [dDate, setDDate] = useState(getThaiTodayStr());
  const [dItemIds, setDItemIds] = useState<string[]>([]);
  const [dItemQuantities, setDItemQuantities] = useState<Record<string, number | string>>({});
  const [dItemUnits, setDItemUnits] = useState<Record<string, string>>({});
  const [dSearchQuery, setDSearchQuery] = useState('');
  const [dRecipientName, setDRecipientName] = useState('');
  const [dRecipientPosition, setDRecipientPosition] = useState('');
  const [dRecipientTel, setDRecipientTel] = useState('');
  const [dDepartment, setDDepartment] = useState('องค์การบริหารส่วนตำบลม่อนจอง');
  const [dPurpose, setDPurpose] = useState('');
  const [dCertifier, setDCertifier] = useState('นายไพรศาล  คำใจ');
  const [dCertifierPosition, setDCertifierPosition] = useState('ผู้ช่วยนักจัดการงานทั่วไป');
  const [dHeadOfOfficeName, setDHeadOfOfficeName] = useState('นายเจริญ  ปันตา');
  const [dHeadOfOfficePosition, setDHeadOfOfficePosition] = useState('เจ้าพนักงานสาธารณสุขชำนาญงาน รักษาราชการแทนหัวหน้าสำนักปลัด');
  const [dPaladName, setDPaladName] = useState('นายภาคิม จิรจตุรพรกุล');
  const [dPaladPosition, setDPaladPosition] = useState('ปลัดองค์การบริหารส่วนตำบลม่อนจอง');
  const [dMayorName, setDMayorName] = useState('นายธันวา  พะแฮ');
  const [dMayorPosition, setDMayorPosition] = useState('นายกองค์การบริหารส่วนตำบลม่อนจอง');
  const [dStatus, setDStatus] = useState<'เบิกจ่ายแล้ว' | 'รออนุมัติ' | 'ยกเลิก'>('เบิกจ่ายแล้ว');
  const [dNote, setDNote] = useState('');

  // --- OPEN MODAL HANDLERS ---
  const handleCloseModal = () => {
    setIsDispenseModalOpen(false);
    onModalClosed?.();
  };

  React.useEffect(() => {
    if (autoOpenNew) {
      handleOpenNewDispense(preselectedItemId);
    }
  }, [autoOpenNew, preselectedItemId]);

  const handleOpenNewDispense = (preselectedItemId?: string) => {
    setEditingDispenseId(null);
    setDDate(getThaiTodayStr());
    if (preselectedItemId) {
      setDItemIds([preselectedItemId]);
      setDItemQuantities({ [preselectedItemId]: 1 });
      const eq = equipment.find(e => e.id === preselectedItemId);
      setDItemUnits({ [preselectedItemId]: 'ชิ้น' });
    } else {
      setDItemIds([]);
      setDItemQuantities({});
      setDItemUnits({});
    }
    setDSearchQuery('');
    setDRecipientName('');
    setDRecipientPosition('');
    setDRecipientTel('');
    setDDepartment('องค์การบริหารส่วนตำบลม่อนจอง');
    setDPurpose('');
    setDCertifier('นายไพรศาล  คำใจ');
    setDCertifierPosition('ผู้ช่วยนักจัดการงานทั่วไป');
    setDHeadOfOfficeName('นายเจริญ  ปันตา');
    setDHeadOfOfficePosition('เจ้าพนักงานสาธารณสุขชำนาญงาน รักษาราชการแทนหัวหน้าสำนักปลัด');
    setDPaladName('นายภาคิม จิรจตุรพรกุล');
    setDPaladPosition('ปลัดองค์การบริหารส่วนตำบลม่อนจอง');
    setDMayorName('นายธันวา  พะแฮ');
    setDMayorPosition('นายกองค์การบริหารส่วนตำบลม่อนจอง');
    setDStatus('เบิกจ่ายแล้ว');
    setDNote('');
    setIsDispenseModalOpen(true);
  };

  const handleOpenEditDispense = (record: DispenseRecord) => {
    setDSearchQuery('');
    setEditingDispenseId(record.id);
    setDDate(record.dispenseDate || getThaiTodayStr());
    
    // Find all items in this group / slip
    const group = record.groupId 
      ? dispenses.filter(d => d.groupId === record.groupId)
      : dispenses.filter(d => d.recipientName === record.recipientName && d.dispenseDate === record.dispenseDate);
    
    const targetGroup = group.length > 0 ? group : [record];
    const itemIds = targetGroup.map(g => g.itemId);
    const qtys: Record<string, number | string> = {};
    const units: Record<string, string> = {};
    
    targetGroup.forEach(g => {
      qtys[g.itemId] = g.qty || 1;
      units[g.itemId] = g.unit || 'ชิ้น';
    });

    setDItemIds(itemIds);
    setDItemQuantities(qtys);
    setDItemUnits(units);
    setDRecipientName(record.recipientName || '');
    setDRecipientPosition(record.recipientPosition || '');
    setDRecipientTel(record.recipientTel || '');
    setDDepartment(record.department || 'องค์การบริหารส่วนตำบลม่อนจอง');
    setDPurpose(record.purpose || '');
    setDCertifier(record.certifier || 'นายไพรศาล  คำใจ');
    setDCertifierPosition(record.certifierPosition || 'ผู้ช่วยนักจัดการงานทั่วไป');
    setDHeadOfOfficeName(record.headOfOfficeName || 'นายเจริญ  ปันตา');
    setDHeadOfOfficePosition(record.headOfOfficePosition || 'เจ้าพนักงานสาธารณสุขชำนาญงาน รักษาราชการแทนหัวหน้าสำนักปลัด');
    setDPaladName(record.paladName || 'นายภาคิม จิรจตุรพรกุล');
    setDPaladPosition(record.paladPosition || 'ปลัดองค์การบริหารส่วนตำบลม่อนจอง');
    setDMayorName(record.mayorName || 'นายธันวา  พะแฮ');
    setDMayorPosition(record.mayorPosition || 'นายกองค์การบริหารส่วนตำบลม่อนจอง');
    setDStatus(record.status || 'เบิกจ่ายแล้ว');
    setDNote(record.note || '');
    setIsDispenseModalOpen(true);
  };

  // --- SAVE DISPENSE SUBMIT ---
  const handleSaveDispenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dRecipientName.trim()) {
      showToast('กรุณากรอกชื่อ-นามสกุล ผู้ขอเบิก', 'error');
      return;
    }
    if (dItemIds.length === 0) {
      showToast('กรุณาเลือกพัสดุหรืออุปกรณ์ที่ต้องการเบิกอย่างน้อย 1 รายการ', 'error');
      return;
    }

    // Check stock availability
    for (const itemId of dItemIds) {
      const eq = equipment.find(e => e.id === itemId);
      if (eq) {
        const qtyToDispense = Number(dItemQuantities[itemId]) || 1;
        const stock = getStockInfo(eq, editingDispenseId);
        if (qtyToDispense <= 0) {
          showToast(`กรุณาระบุจำนวนเบิกสำหรับ "${eq.name}" ให้ถูกต้อง`, 'error');
          return;
        }
        if (qtyToDispense > stock.available) {
          showToast(`พัสดุ "${eq.name}" มีจำนวนคงเหลือพร้อมเบิกเพียง ${stock.available} ไม่สามารถเบิก ${qtyToDispense} ได้`, 'error');
          return;
        }
      }
    }

    const groupId = editingDispenseId 
      ? (dispenses.find(d => d.id === editingDispenseId)?.groupId || `DISP-${Date.now().toString(36).toUpperCase()}`)
      : `DISP-${Date.now().toString(36).toUpperCase()}`;

    if (editingDispenseId) {
      // Confirm edit
      const confirmed = await showConfirm(
        'ยืนยันการแก้ไขข้อมูลการเบิกพัสดุ',
        `คุณต้องการบันทึกการแก้ไขใบเบิกพัสดุของ "${dRecipientName.trim()}" ใช่หรือไม่?`,
        'edit'
      );
      if (!confirmed) return;

      // Find original group IDs to remove/replace
      const activeRecord = dispenses.find(d => d.id === editingDispenseId);
      const originalGroup = activeRecord?.groupId 
        ? dispenses.filter(d => d.groupId === activeRecord.groupId)
        : dispenses.filter(d => d.recipientName === activeRecord?.recipientName && d.dispenseDate === activeRecord?.dispenseDate);
      const originalIds = originalGroup.map(g => g.id);

      // Create updated records for new selection
      const newRecords: DispenseRecord[] = dItemIds.map((itemId, idx) => {
        const eq = equipment.find(e => e.id === itemId);
        const existingRecord = originalGroup.find(g => g.itemId === itemId);
        return {
          id: existingRecord?.id || `disp-${Date.now()}-${idx}`,
          groupId,
          dispenseDate: dDate,
          itemId,
          itemName: eq?.name || 'พัสดุไม่ระบุชื่อ',
          itemCode: eq?.code || '',
          itemType: eq?.type || '',
          recipientName: dRecipientName.trim(),
          recipientPosition: dRecipientPosition.trim(),
          recipientTel: dRecipientTel.trim(),
          department: dDepartment.trim(),
          purpose: dPurpose.trim(),
          certifier: dCertifier.trim(),
          certifierPosition: dCertifierPosition.trim(),
          qty: Number(dItemQuantities[itemId]) || 1,
          unit: dItemUnits[itemId] || 'ชิ้น',
          status: dStatus,
          note: dNote.trim(),
          headOfOfficeName: dHeadOfOfficeName.trim(),
          headOfOfficePosition: dHeadOfOfficePosition.trim(),
          paladName: dPaladName.trim(),
          paladPosition: dPaladPosition.trim(),
          mayorName: dMayorName.trim(),
          mayorPosition: dMayorPosition.trim()
        };
      });

      const getEffectiveQty = (r: DispenseRecord) => (r.status === 'ยกเลิก' ? 0 : (Number(r.qty) || 1));

      // Calculate stock adjustments for equipment
      const updatedEquipment = equipment.map(eq => {
        const oldDispensed = originalGroup
          .filter(r => r.itemId === eq.id)
          .reduce((sum, r) => sum + getEffectiveQty(r), 0);

        const newDispensed = newRecords
          .filter(r => r.itemId === eq.id)
          .reduce((sum, r) => sum + getEffectiveQty(r), 0);

        const diff = oldDispensed - newDispensed; // positive: restore to stock, negative: deduct from stock
        if (diff !== 0) {
          const currentQty = Number(eq.qty) || 0;
          return { ...eq, qty: Math.max(0, currentQty + diff) };
        }
        return eq;
      });

      const updated = dispenses.filter(d => !originalIds.includes(d.id)).concat(newRecords);
      onSaveDispenses(updated);
      onSaveEquipment(updatedEquipment);
      saveDispensesToGas(updated).catch(e => console.warn('Background dispense sheet sync:', e));
      showToast('บันทึกการแก้ไขรายการเบิกพัสดุและซิงก์ลง Google Sheet แล้ว', 'success');
      handleCloseModal();
    } else {
      // Create new dispense records
      const newRecords: DispenseRecord[] = dItemIds.map((itemId, idx) => {
        const eq = equipment.find(e => e.id === itemId);
        return {
          id: `disp-${Date.now()}-${idx}`,
          groupId,
          dispenseDate: dDate,
          itemId,
          itemName: eq?.name || 'พัสดุไม่ระบุชื่อ',
          itemCode: eq?.code || '',
          itemType: eq?.type || '',
          recipientName: dRecipientName.trim(),
          recipientPosition: dRecipientPosition.trim(),
          recipientTel: dRecipientTel.trim(),
          department: dDepartment.trim(),
          purpose: dPurpose.trim(),
          certifier: dCertifier.trim(),
          certifierPosition: dCertifierPosition.trim(),
          qty: Number(dItemQuantities[itemId]) || 1,
          unit: dItemUnits[itemId] || 'ชิ้น',
          status: dStatus,
          note: dNote.trim(),
          headOfOfficeName: dHeadOfOfficeName.trim(),
          headOfOfficePosition: dHeadOfOfficePosition.trim(),
          paladName: dPaladName.trim(),
          paladPosition: dPaladPosition.trim(),
          mayorName: dMayorName.trim(),
          mayorPosition: dMayorPosition.trim()
        };
      });

      const getEffectiveQty = (r: DispenseRecord) => (r.status === 'ยกเลิก' ? 0 : (Number(r.qty) || 1));

      // Deduct stock from equipment inventory
      const updatedEquipment = equipment.map(eq => {
        const deductQty = newRecords
          .filter(r => r.itemId === eq.id)
          .reduce((sum, r) => sum + getEffectiveQty(r), 0);

        if (deductQty > 0) {
          const currentQty = Number(eq.qty) || 0;
          return { ...eq, qty: Math.max(0, currentQty - deductQty) };
        }
        return eq;
      });

      const updated = [...newRecords, ...dispenses];
      onSaveDispenses(updated);
      onSaveEquipment(updatedEquipment);
      saveDispensesToGas(updated).catch(e => console.warn('Background dispense sheet sync:', e));
      showToast('บันทึกรายการเบิกพัสดุและบันทึกลง Google Sheet สำเร็จแล้ว', 'success');
      handleCloseModal();
      
      // Prompt open PDF slip
      if (newRecords.length > 0) {
        setSelectedPdfRecord(newRecords[0]);
        setIsPdfModalOpen(true);
      }
    }
  };

  // --- DELETE DISPENSE HANDLER ---
  const handleDeleteDispense = async (record: DispenseRecord) => {
    const group = record.groupId 
      ? dispenses.filter(d => d.groupId === record.groupId)
      : dispenses.filter(d => d.recipientName === record.recipientName && d.dispenseDate === record.dispenseDate);
    const targetGroup = group.length > 0 ? group : [record];
    const targetIds = targetGroup.map(g => g.id);

    const confirmed = await showConfirm(
      'ยืนยันการลบรายการเบิกพัสดุ',
      `คุณต้องการลบรายการเบิกพัสดุของ "${record.recipientName}" ทั้งหมด ${targetGroup.length} รายการ ใช่หรือไม่? (การลบจะคืนยอดสต็อกพัสดุ)`,
      'delete'
    );
    if (!confirmed) return;

    const getEffectiveQty = (r: DispenseRecord) => (r.status === 'ยกเลิก' ? 0 : (Number(r.qty) || 1));

    // Restore stock to equipment inventory
    const updatedEquipment = equipment.map(eq => {
      const restoreQty = targetGroup
        .filter(r => r.itemId === eq.id)
        .reduce((sum, r) => sum + getEffectiveQty(r), 0);

      if (restoreQty > 0) {
        const currentQty = Number(eq.qty) || 0;
        return { ...eq, qty: currentQty + restoreQty };
      }
      return eq;
    });

    const updated = dispenses.filter(d => !targetIds.includes(d.id));
    onSaveDispenses(updated);
    onSaveEquipment(updatedEquipment);
    saveDispensesToGas(updated).catch(e => console.warn('Background dispense sheet sync:', e));
    showToast('ลบรายการเบิกและซิงก์ Google Sheet แล้ว', 'success');
  };

  // Grouped Dispense Slips for Display
  const groupedSlips = useMemo(() => {
    const map = new Map<string, DispenseRecord[]>();
    dispenses.forEach(d => {
      const key = d.groupId || `${d.recipientName}_${d.dispenseDate}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(d);
    });

    const slips: { key: string; mainRecord: DispenseRecord; items: DispenseRecord[]; totalQty: number }[] = [];
    map.forEach((items, key) => {
      const totalQty = items.reduce((sum, i) => sum + (Number(i.qty) || 1), 0);
      slips.push({
        key,
        mainRecord: items[0],
        items,
        totalQty
      });
    });

    return slips.sort((a, b) => {
      const dateCompare = (b.mainRecord.dispenseDate || '').localeCompare(a.mainRecord.dispenseDate || '');
      if (dateCompare !== 0) return dateCompare;
      // If dates are the same, sort by ID / groupId descending so newer group/ID is at the top
      const keyA = a.mainRecord.groupId || a.mainRecord.id;
      const keyB = b.mainRecord.groupId || b.mainRecord.id;
      return keyB.localeCompare(keyA);
    });
  }, [dispenses]);

  // Filtered Slips
  const filteredSlips = useMemo(() => {
    return groupedSlips.filter(slip => {
      const m = slip.mainRecord;
      const q = searchQuery.toLowerCase().trim();

      // Search text filter
      const matchesSearch = !q || (
        (m.recipientName || '').toLowerCase().includes(q) ||
        (m.recipientPosition || '').toLowerCase().includes(q) ||
        (m.recipientTel || '').includes(q) ||
        (m.department || '').toLowerCase().includes(q) ||
        (m.purpose || '').toLowerCase().includes(q) ||
        slip.items.some(i => (i.itemName || '').toLowerCase().includes(q) || (i.itemCode || '').toLowerCase().includes(q))
      );

      // Department filter
      const matchesDept = filterDepartment === 'all' || m.department === filterDepartment;

      // Month filter
      const matchesMonth = filterMonth === 'all' || (m.dispenseDate && m.dispenseDate.startsWith(filterMonth));

      // Date range filter
      let matchesDateRange = true;
      if (dateRangeStart && m.dispenseDate && m.dispenseDate < dateRangeStart) matchesDateRange = false;
      if (dateRangeEnd && m.dispenseDate && m.dispenseDate > dateRangeEnd) matchesDateRange = false;

      return matchesSearch && matchesDept && matchesMonth && matchesDateRange;
    });
  }, [groupedSlips, searchQuery, filterDepartment, filterMonth, dateRangeStart, dateRangeEnd]);

  // Summary statistics
  const stats = useMemo(() => {
    const totalSlips = groupedSlips.length;
    const totalItemsDispensed = dispenses.filter(d => d.status !== 'ยกเลิก').reduce((sum, d) => sum + (Number(d.qty) || 1), 0);
    const thisMonthPrefix = getThaiTodayStr().substring(0, 7);
    const thisMonthSlips = groupedSlips.filter(s => s.mainRecord.dispenseDate?.startsWith(thisMonthPrefix)).length;
    const totalAvailableStock = equipment.reduce((sum, eq) => sum + getStockInfo(eq).available, 0);

    return {
      totalSlips,
      totalItemsDispensed,
      thisMonthSlips,
      totalAvailableStock
    };
  }, [groupedSlips, dispenses, equipment, getStockInfo]);

  // Excel Export
  const handleExportExcel = () => {
    const data = dispenses.map((d, index) => {
      const eq = equipment.find(e => e.id === d.itemId);
      return {
        'ลำดับ': index + 1,
        'เลขที่ใบเบิก': d.groupId || `DISP-${d.id.slice(-6).toUpperCase()}`,
        'วันที่เบิก': d.dispenseDate,
        'รายการพัสดุ/อุปกรณ์': d.itemName,
        'หมายเลขครุภัณฑ์': d.itemCode || eq?.code || '-',
        'ประเภท': d.itemType || eq?.type || '-',
        'จำนวนที่เบิก': d.qty || 1,
        'หน่วยนับ': d.unit || 'ชิ้น',
        'ผู้ขอเบิก': d.recipientName,
        'ตำแหน่ง': d.recipientPosition || '-',
        'เบอร์โทรศัพท์': d.recipientTel || '-',
        'สังกัด/ส่วนงาน': d.department || '-',
        'วัตถุประสงค์/ภารกิจ': d.purpose || '-',
        'ผู้อนุมัติ/ผู้จ่ายของ': d.certifier || '-',
        'สถานะ': d.status || 'เบิกจ่ายแล้ว',
        'หมายเหตุ': d.note || '-'
      };
    });

    exportToExcel(data, `รายงานการเบิกพัสดุอุปกรณ์_${getThaiTodayStr()}`);
    showToast('ส่งออกไฟล์ Excel เรียบร้อยแล้ว', 'info');
  };

  // ดึงข้อมูลการเบิกพัสดุจาก Google Sheets สดๆ
  const handleRefreshSheet = async () => {
    setIsRefreshing(true);
    try {
      if (onRefreshData) {
        await onRefreshData();
      } else {
        const fresh = await fetchDispensesFromGas();
        onSaveDispenses(fresh);
      }
      showToast('ดึงข้อมูลการเบิกพัสดุจาก Google Sheets เรียบร้อยแล้ว', 'success');
    } catch (err: any) {
      console.error('Failed to refresh dispenses from Sheet:', err);
      showToast('ไม่สามารถดึงข้อมูลจาก Google Sheets ได้: ' + (err?.message || err), 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  // บันทึกและซิงก์ข้อมูลการเบิกพัสดุอุปกรณ์ทั้งหมดไปยัง Google Sheets ทันที
  const handleSyncToSheet = async () => {
    setIsSyncing(true);
    try {
      const res = await saveDispensesToGas(dispenses);
      if (res.success) {
        showToast('ซิงก์ประวัติการเบิกอุปกรณ์ลง Google Sheet สำเร็จเรียบร้อยแล้ว', 'info');
      } else {
        showToast('ไม่สามารถซิงก์ข้อมูลลง Google Sheet ได้: ' + (res.error || 'ข้อผิดพลาดไม่ทราบสาเหตุ'), 'error');
      }
    } catch (err: any) {
      console.error('Failed to sync dispenses to Sheet:', err);
      showToast('เกิดข้อผิดพลาดในการซิงก์ข้อมูลลง Google Sheet: ' + (err?.message || err), 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans" id="equipment-dispense-panel">
      {/* Top Banner Header with Chibi Style (Only when not embedded in subtab) */}
      {!hideHeader && (
        <>
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-amber-500/15 relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 opacity-15 pointer-events-none flex items-center pr-6">
              <ClipboardList className="w-64 h-64 text-white" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-heading font-bold border border-white/20">
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>ระบบเบิกพัสดุ ครุภัณฑ์ และวัสดุอุปกรณ์</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-tight drop-shadow-sm">
                  ระบบบันทึกและจัดการการเบิกพัสดุ-อุปกรณ์
                </h1>
                <p className="text-amber-100 text-xs sm:text-sm max-w-xl font-medium">
                  บันทึกการขอเบิกพัสดุ-วัสดุ อนุมัติการจ่ายของ และซิงก์ข้อมูลลง Google Sheets อัตโนมัติ
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {onNavigateToBorrow && (
                  <button
                    type="button"
                    onClick={onNavigateToBorrow}
                    className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white text-xs font-heading font-bold rounded-2xl border border-white/30 backdrop-blur-md transition flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Layers className="w-4 h-4" />
                    <span>ไประบบยืม-คืน</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenNewDispense()}
                  className="px-5 py-3 bg-white text-amber-700 hover:bg-amber-50 active:scale-95 text-xs sm:text-sm font-heading font-black rounded-2xl shadow-lg transition flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-5 h-5" />
                  <span>ทำรายการขอเบิกพัสดุ</span>
                </button>
              </div>
            </div>

            {/* 4 Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-white/20">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15">
                <span className="text-[11px] text-amber-100 block font-medium">รวมใบเบิกทั้งหมด</span>
                <span className="text-xl sm:text-2xl font-black font-heading mt-0.5 block">{stats.totalSlips} <span className="text-xs font-normal opacity-80">ใบ</span></span>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15">
                <span className="text-[11px] text-amber-100 block font-medium">จำนวนชิ้นที่เบิกจ่ายสะสม</span>
                <span className="text-xl sm:text-2xl font-black font-heading mt-0.5 block text-amber-200">{stats.totalItemsDispensed} <span className="text-xs font-normal opacity-80">ชิ้น</span></span>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15">
                <span className="text-[11px] text-amber-100 block font-medium">ใบเบิกประจำเดือนนี้</span>
                <span className="text-xl sm:text-2xl font-black font-heading mt-0.5 block">{stats.thisMonthSlips} <span className="text-xs font-normal opacity-80">รายการ</span></span>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15">
                <span className="text-[11px] text-amber-100 block font-medium">ยอดพัสดุคงเหลือพร้อมเบิก</span>
                <span className="text-xl sm:text-2xl font-black font-heading mt-0.5 block text-white">{stats.totalAvailableStock} <span className="text-xs font-normal opacity-80">หน่วย</span></span>
              </div>
            </div>
          </div>

          {/* Sub-Tabs Switcher */}
          {!isDispenseModalOpen && (
            <div className="bg-white p-1.5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('dispense-records')}
                className={`px-4 py-2.5 rounded-xl font-heading font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'dispense-records'
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                    : 'text-gray-600 hover:text-amber-700 hover:bg-amber-50/50'
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                <span>รายการขอเบิกพัสดุ ({groupedSlips.length} ใบ)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('inventory-status')}
                className={`px-4 py-2.5 rounded-xl font-heading font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'inventory-status'
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                    : 'text-gray-600 hover:text-amber-700 hover:bg-amber-50/50'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>สถานะสต็อกคงคลังพร้อมเบิก ({equipment.length} ชนิด)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('search-export')}
                className={`px-4 py-2.5 rounded-xl font-heading font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'search-export'
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                    : 'text-gray-600 hover:text-amber-700 hover:bg-amber-50/50'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>ค้นหาและส่งออกรายงาน Excel</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* MAIN BODY: INLINE DISPENSE FORM OR TAB CONTENT */}
      {!isDispenseModalOpen ? (
        <>
          {/* TAB 1: DISPENSE RECORDS */}
          {activeTab === 'dispense-records' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อผู้ขอเบิก, ตำแหน่ง, แผนก, พัสดุ, หมายเลข..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:border-amber-500 outline-none text-gray-800"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRefreshSheet}
                disabled={isRefreshing}
                className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-heading font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                title="ดึงข้อมูลล่าสุดจากชีต การเบิกพัสดุอุปกรณ์ บน Google Sheets"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'กำลังดึง...' : 'ดึงข้อมูลจาก Sheet'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-heading font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <FileDown className="w-4 h-4" />
                <span>ส่งออก Excel</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenNewDispense()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-heading font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มรายการเบิก</span>
              </button>
            </div>
          </div>

          {/* Dispense Slips Cards Grid */}
          {filteredSlips.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200/90 p-10 sm:p-14 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-100 text-amber-600 mx-auto flex items-center justify-center shadow-inner">
                <ClipboardList className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="font-heading font-black text-gray-900 text-lg">
                  {searchQuery ? 'ไม่พบรายการที่ตรงกับคำค้นหา' : 'ยังไม่มีข้อมูลการเบิกพัสดุใน Google Sheets'}
                </h3>
                <p className="text-gray-500 text-xs sm:text-sm font-medium leading-relaxed">
                  {searchQuery 
                    ? 'ไม่พบข้อมูลที่ตรงกับคำค้นหา กรุณาลองค้นหาด้วยคำอื่นหรือล้างคำค้นหา' 
                    : 'ระบบเชื่อมต่อกับชีต "การเบิกพัสดุอุปกรณ์" โดยตรง (ไม่มีข้อมูลตัวอย่าง) เมื่อท่านบันทึกการขอเบิก ข้อมูลจะถูกบันทึกลงใน Google Sheet ทันที และสามารถดึงมาแสดงผลได้ตลอดเวลา'}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleOpenNewDispense()}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-heading font-bold rounded-xl shadow-md transition inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>ทำรายการขอเบิกพัสดุ</span>
                </button>

                <button
                  type="button"
                  onClick={handleRefreshSheet}
                  disabled={isRefreshing}
                  className="px-4 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 active:scale-95 text-xs font-heading font-bold rounded-xl transition inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูลจาก Google Sheets'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSlips.map(slip => {
                const m = slip.mainRecord;
                return (
                  <div
                    key={slip.key}
                    className="bg-white rounded-2xl border border-gray-200/90 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-sm shrink-0">
                            <ClipboardList className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-heading font-black text-gray-900 text-sm">{m.recipientName}</h4>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                {m.status || 'เบิกจ่ายแล้ว'}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              {m.recipientPosition || 'ผู้ขอเบิก'} • {m.department || 'งานป้องกันฯ'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] text-gray-400 font-mono block">
                            {m.groupId || `DISP-${m.id.slice(-6).toUpperCase()}`}
                          </span>
                          <span className="text-xs font-bold text-gray-700 block mt-0.5">
                            {m.dispenseDate}
                          </span>
                        </div>
                      </div>

                      {/* Items Breakdown */}
                      <div className="mt-3.5 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-gray-500">
                          <span>รายการพัสดุที่ขอเบิก ({slip.items.length} รายการ)</span>
                          <span className="font-bold text-amber-800">รวม {slip.totalQty} หน่วย</span>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100 space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                          {slip.items.map((item, idx) => (
                            <div key={item.id || idx} className="flex items-center justify-between text-xs text-gray-800">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-4 text-center text-gray-400 text-[10px]">{idx + 1}.</span>
                                <span className="font-medium truncate">{item.itemName}</span>
                                {item.itemCode && (
                                  <span className="text-[10px] text-gray-400 font-mono">({item.itemCode})</span>
                                )}
                              </div>
                              <span className="font-bold text-amber-900 text-xs shrink-0 ml-2">
                                {item.qty} {item.unit || 'ชิ้น'}
                              </span>
                            </div>
                          ))}
                        </div>

                        {m.purpose && (
                          <p className="text-[11px] text-gray-600 line-clamp-1 mt-2">
                            <span className="text-gray-400">วัตถุประสงค์:</span> {m.purpose}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 gap-2">
                      <div className="text-[10px] text-gray-400 truncate">
                        {m.certifier ? `ผู้อนุมัติ: ${m.certifier}` : 'รอลงนาม'}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPdfRecord(m);
                            setIsPdfModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-heading font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                          title="ดูใบเบิกพัสดุ A4"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>ใบเบิก A4</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditDispense(m)}
                          className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="แก้ไขรายการ"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteDispense(m)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="ลบรายการ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INVENTORY & STOCK STATUS */}
      {activeTab === 'inventory-status' && (
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
            <div>
              <h3 className="font-heading font-bold text-gray-900 text-sm sm:text-base">
                สถานะพัสดุ ครุภัณฑ์ และวัสดุคงคลัง
              </h3>
              <p className="text-gray-500 text-xs">
                ตรวจสอบจำนวนคงคลัง ยอดที่ถูกเบิกจ่าย และจำนวนคงเหลือพร้อมให้เบิกได้ทันที
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenNewDispense()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-heading font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>ทำรายการเบิก</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs text-left">
              <thead>
                <tr className="bg-gray-100/80 text-gray-700 font-bold border-b border-gray-200">
                  <th className="px-4 py-3 w-12 text-center">ลำดับ</th>
                  <th className="px-4 py-3">รายการพัสดุ / ครุภัณฑ์</th>
                  <th className="px-4 py-3">หมายเลข/รหัส</th>
                  <th className="px-4 py-3">ประเภท</th>
                  <th className="px-4 py-3 text-center">ยอดสต็อกทั้งหมด</th>
                  <th className="px-4 py-3 text-center">ถูกเบิกจ่ายแล้ว</th>
                  <th className="px-4 py-3 text-center">คงเหลือพร้อมเบิก</th>
                  <th className="px-4 py-3">สถานที่เก็บ</th>
                  <th className="px-4 py-3 text-center w-28">การกระทำ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {equipment.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-400">
                      ยังไม่มีรายการพัสดุครุภัณฑ์ในระบบ
                    </td>
                  </tr>
                ) : (
                  equipment.map((eq, idx) => {
                    const stock = getStockInfo(eq);
                    const isOutOfStock = stock.available <= 0;

                    return (
                      <tr key={eq.id} className="hover:bg-amber-50/30 transition">
                        <td className="px-4 py-3 text-center font-medium text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3 font-bold text-gray-900">{eq.name}</td>
                        <td className="px-4 py-3 font-mono text-gray-600">{eq.code || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-medium">
                            {eq.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-gray-700">{stock.total}</td>
                        <td className="px-4 py-3 text-center font-bold text-amber-700">{stock.dispensed}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                            isOutOfStock 
                              ? 'bg-rose-100 text-rose-700' 
                              : stock.available <= 2 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {stock.available}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{eq.location || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            disabled={isOutOfStock}
                            onClick={() => handleOpenNewDispense(eq.id)}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:pointer-events-none text-white font-bold rounded-lg text-xs transition cursor-pointer"
                          >
                            {isOutOfStock ? 'หมด' : 'เบิกชิ้นนี้'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SEARCH & EXPORT */}
      {activeTab === 'search-export' && (
        <div className="bg-white rounded-2xl border border-gray-200/90 p-6 space-y-6 shadow-xs">
          <div>
            <h3 className="font-heading font-black text-gray-900 text-base flex items-center gap-2">
              <Search className="w-5 h-5 text-amber-600" />
              <span>ค้นหาและส่งออกรายงานการเบิกพัสดุอุปกรณ์</span>
            </h3>
            <p className="text-gray-500 text-xs mt-1">
              กรองข้อมูลตามช่วงวันที่ แผนก หรือคำค้นหา เพื่อส่งออกเป็นไฟล์ Excel
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200">
            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">ตั้งแต่วันที่</label>
              <input
                type="date"
                value={dateRangeStart}
                onChange={(e) => setDateRangeStart(e.target.value)}
                className="w-full p-2 bg-white border border-gray-300 rounded-xl text-xs outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">ถึงวันที่</label>
              <input
                type="date"
                value={dateRangeEnd}
                onChange={(e) => setDateRangeEnd(e.target.value)}
                className="w-full p-2 bg-white border border-gray-300 rounded-xl text-xs outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">แผนก/ฝ่าย</label>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full p-2 bg-white border border-gray-300 rounded-xl text-xs outline-none font-medium"
              >
                <option value="all">ทุกแผนก/ส่วนงาน</option>
                <option value="องค์การบริหารส่วนตำบลม่อนจอง">องค์การบริหารส่วนตำบลม่อนจอง</option>
                <option value="งานป้องกันและบรรเทาสาธารณภัย">งานป้องกันและบรรเทาสาธารณภัย</option>
                <option value="สำนักปลัด">สำนักปลัด</option>
                <option value="กองช่าง">กองช่าง</option>
                <option value="กองคลัง">กองคลัง</option>
                <option value="กองสาธารณสุข">กองสาธารณสุข</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setDateRangeStart('');
                  setDateRangeEnd('');
                  setFilterDepartment('all');
                  setSearchQuery('');
                }}
                className="w-full p-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                ล้างตัวกรอง
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <span className="text-xs text-gray-500">
              พบข้อมูลตรงตามเงื่อนไข <strong className="text-amber-800 font-bold">{filteredSlips.length}</strong> ใบเบิก ({dispenses.length} รายการพัสดุ)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-heading font-bold transition flex items-center gap-2 cursor-pointer shadow-md"
              >
                <FileDown className="w-4 h-4" />
                <span>ดาวน์โหลดรายงาน Excel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  ) : (
    /* INLINE DISPENSE FORM (EXACTLY LIKE BORROW FORM) */
    <div id="inline-dispense-form-card" className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6 animate-in fade-in duration-200 z-10 relative mb-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {editingDispenseId ? 'แก้ไขข้อมูลการเบิกพัสดุ-อุปกรณ์' : 'ทำรายการเบิกพัสดุ ครุภัณฑ์ และวัสดุอุปกรณ์'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">กรอกรายละเอียดเพื่อบันทึกการขอเบิกพัสดุ-อุปกรณ์เข้าสู่ระบบ</p>
          </div>
        </div>

            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 font-semibold text-gray-600 transition-colors cursor-pointer text-sm flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              <span>ปิดฟอร์ม</span>
            </button>
          </div>

          <form onSubmit={handleSaveDispenseSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  วันที่ทำรายการขอเบิก <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={dDate}
                  onChange={(e) => setDDate(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none bg-white font-medium text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">สถานะการเบิกจ่าย</label>
                <select
                  value={dStatus}
                  onChange={(e) => setDStatus(e.target.value as any)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none bg-white font-medium text-gray-800"
                >
                  <option value="เบิกจ่ายแล้ว">เบิกจ่ายแล้ว (จ่ายของทันที)</option>
                  <option value="รออนุมัติ">รออนุมัติ</option>
                  <option value="ยกเลิก">ยกเลิกรายการ</option>
                </select>
              </div>
            </div>

            {/* 1. เลือกพัสดุครุภัณฑ์ที่ต้องการเบิก */}
            <div className="bg-gray-50 p-5 md:p-6 rounded-2xl border border-gray-200 space-y-4">
              <div className="border-b border-gray-200 pb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-600" />
                  <span>1. {editingDispenseId ? 'แก้ไขรายการพัสดุครุภัณฑ์ที่เบิก' : 'เลือกพัสดุครุภัณฑ์และวัสดุที่ต้องการเบิก'}</span>
                </h3>
                <span className="text-xs text-amber-800 font-medium">
                  เลือกแล้ว {dItemIds.length} รายการ
                </span>
              </div>

              {/* ช่องค้นหาพัสดุครุภัณฑ์ */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, รหัส, หรือประเภทพัสดุครุภัณฑ์..."
                  value={dSearchQuery}
                  onChange={(e) => setDSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none font-medium placeholder:text-gray-400 transition-all"
                />
                {dSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setDSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                    title="ล้างคำค้นหา"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar p-2 border border-gray-100 rounded-xl bg-white">
                {(() => {
                  const items = equipment
                    .filter(e => getStockInfo(e, editingDispenseId).available > 0 || dItemIds.includes(e.id))
                    .filter(e => {
                      if (!dSearchQuery.trim()) return true;
                      const q = dSearchQuery.toLowerCase().trim();
                      return (
                        e.name.toLowerCase().includes(q) ||
                        (e.code && e.code.toLowerCase().includes(q)) ||
                        (e.type && e.type.toLowerCase().includes(q)) ||
                        (e.location && e.location.toLowerCase().includes(q))
                      );
                    });

                  if (items.length === 0) {
                    return (
                      <div className="py-8 text-center text-sm text-gray-500 font-medium">
                        ไม่พบพัสดุครุภัณฑ์ที่ตรงกับคำค้นหา "{dSearchQuery}"
                      </div>
                    );
                  }

                  return items.map(eq => {
                    const isSelected = dItemIds.includes(eq.id);
                    const stock = getStockInfo(eq, editingDispenseId);
                    return (
                      <div
                        key={eq.id}
                        className={`p-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-300/50'
                            : 'bg-white border-gray-100 hover:border-amber-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setDItemIds([...dItemIds, eq.id]);
                                setDItemQuantities({
                                  ...dItemQuantities,
                                  [eq.id]: dItemQuantities[eq.id] || 1
                                });
                                setDItemUnits({
                                  ...dItemUnits,
                                  [eq.id]: dItemUnits[eq.id] || 'ชิ้น'
                                });
                              } else {
                                setDItemIds(dItemIds.filter(id => id !== eq.id));
                                const newQ = { ...dItemQuantities };
                                delete newQ[eq.id];
                                setDItemQuantities(newQ);
                              }
                            }}
                            className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => {
                              if (isSelected) {
                                setDItemIds(dItemIds.filter(id => id !== eq.id));
                                const newQ = { ...dItemQuantities };
                                delete newQ[eq.id];
                                setDItemQuantities(newQ);
                              } else {
                                setDItemIds([...dItemIds, eq.id]);
                                setDItemQuantities({
                                  ...dItemQuantities,
                                  [eq.id]: dItemQuantities[eq.id] || 1
                                });
                                setDItemUnits({
                                  ...dItemUnits,
                                  [eq.id]: dItemUnits[eq.id] || 'ชิ้น'
                                });
                              }
                            }}
                          >
                            <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                              <span>{eq.name}</span>
                              {isSelected && (
                                <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded-full font-normal">
                                  เลือกแล้ว
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono">
                              {eq.code || 'ไม่มีรหัส'} • ว่างพร้อมเบิก: <span className="font-bold text-emerald-600">{stock.available}</span> (ทั้งหมด {stock.total})
                            </div>
                          </div>

                          {isSelected && (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-amber-300 shadow-xs">
                                <label className="text-xs text-gray-700 font-bold mr-0.5">จำนวน:</label>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const current = Number(dItemQuantities[eq.id]) || 1;
                                    const next = Math.max(1, current - 1);
                                    setDItemQuantities({ ...dItemQuantities, [eq.id]: next });
                                  }}
                                  className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 active:scale-90 text-gray-700 font-bold flex items-center justify-center transition cursor-pointer select-none text-base border border-gray-200"
                                  title="ลดจำนวน"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={dItemQuantities[eq.id] !== undefined ? dItemQuantities[eq.id] : 1}
                                  onFocus={(e) => e.target.select()}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    if (raw === '') {
                                      setDItemQuantities({ ...dItemQuantities, [eq.id]: '' });
                                      return;
                                    }
                                    const val = parseInt(raw, 10);
                                    if (!isNaN(val)) {
                                      setDItemQuantities({ ...dItemQuantities, [eq.id]: Math.max(1, val) });
                                    }
                                  }}
                                  onBlur={() => {
                                    const current = Number(dItemQuantities[eq.id]);
                                    if (!current || current < 1) {
                                      setDItemQuantities({ ...dItemQuantities, [eq.id]: 1 });
                                    }
                                  }}
                                  className="w-16 p-1 border border-amber-300 rounded-lg text-center font-bold text-amber-950 focus:ring-2 focus:ring-amber-500/40 outline-none text-sm bg-white"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const current = Number(dItemQuantities[eq.id]) || 1;
                                    setDItemQuantities({ ...dItemQuantities, [eq.id]: current + 1 });
                                  }}
                                  className="w-7 h-7 rounded-lg bg-amber-100 hover:bg-amber-200 active:scale-90 text-amber-800 font-bold flex items-center justify-center transition cursor-pointer select-none text-base border border-amber-200"
                                  title="เพิ่มจำนวน"
                                >
                                  +
                                </button>
                                <input
                                  type="text"
                                  placeholder="หน่วย"
                                  value={dItemUnits[eq.id] || 'ชิ้น'}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => setDItemUnits({ ...dItemUnits, [eq.id]: e.target.value })}
                                  className="w-14 p-1 text-center text-xs font-medium border border-gray-200 rounded-lg outline-none focus:border-amber-400 bg-white"
                                />
                              </div>
                              {Number(dItemQuantities[eq.id]) > stock.available && (
                                <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg whitespace-nowrap">
                                  เกินสต็อกระบบ ({stock.available} ชิ้น)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* 2. ข้อมูลผู้ขอเบิก และผู้อนุมัติ */}
            <div className="bg-gray-50 p-5 md:p-6 rounded-2xl border border-gray-200 space-y-4">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2 border-b border-gray-200 pb-3">
                <User className="w-5 h-5 text-amber-600" />
                <span>2. ข้อมูลผู้ขอเบิก และผู้อนุมัติทั้ง ๔ ท่าน</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    ชื่อ - นามสกุล ผู้ขอเบิก <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={dRecipientName}
                    onChange={(e) => setDRecipientName(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none bg-white font-medium text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    ตำแหน่งผู้ขอเบิก <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={dRecipientPosition}
                    onChange={(e) => setDRecipientPosition(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none bg-white font-medium text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    เบอร์โทรศัพท์ผู้ขอเบิก <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={dRecipientTel}
                    onChange={(e) => setDRecipientTel(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none bg-white font-medium text-gray-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    สังกัด / ส่วนงาน <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={dDepartment}
                    onChange={(e) => setDDepartment(e.target.value)}
                    placeholder="องค์การบริหารส่วนตำบลม่อนจอง"
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none bg-white font-medium text-gray-800"
                  />
                </div>
              </div>

              {/* 4 Approver Grid inside Form */}
              <div className="border-t border-gray-200/80 pt-4 mt-2 space-y-4">
                <span className="text-xs font-black text-amber-800 tracking-wider block uppercase">✍️ รายชื่อผู้รับผิดชอบและผู้อนุมัติประทับในเอกสาร</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ๑. หน.สำนักปลัด */}
                  <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-2">
                    <span className="font-bold text-xs text-gray-700 block">๑. หน.สำนักปลัด</span>
                    <input
                      type="text"
                      value={dHeadOfOfficeName}
                      onChange={(e) => setDHeadOfOfficeName(e.target.value)}
                      placeholder="ชื่อ-นามสกุล หน.สำนักปลัด"
                      className="w-full p-2 border border-gray-200 rounded-lg text-xs outline-none bg-gray-50 focus:bg-white text-gray-800"
                    />
                    <input
                      type="text"
                      value={dHeadOfOfficePosition}
                      onChange={(e) => setDHeadOfOfficePosition(e.target.value)}
                      placeholder="ตำแหน่ง หน.สำนักปลัด"
                      className="w-full p-2 border border-gray-200 rounded-lg text-xs outline-none bg-gray-50 focus:bg-white text-gray-600"
                    />
                  </div>

                  {/* ๒. ปลัด อบต. */}
                  <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-2">
                    <span className="font-bold text-xs text-gray-700 block">๒. ปลัด อบต.</span>
                    <input
                      type="text"
                      value={dPaladName}
                      onChange={(e) => setDPaladName(e.target.value)}
                      placeholder="ชื่อ-นามสกุล ปลัด อบต."
                      className="w-full p-2 border border-gray-200 rounded-lg text-xs outline-none bg-gray-50 focus:bg-white text-gray-800"
                    />
                    <input
                      type="text"
                      value={dPaladPosition}
                      onChange={(e) => setDPaladPosition(e.target.value)}
                      placeholder="ตำแหน่ง ปลัด อบต."
                      className="w-full p-2 border border-gray-200 rounded-lg text-xs outline-none bg-gray-50 focus:bg-white text-gray-600"
                    />
                  </div>

                  {/* ๓. นายก อบต. */}
                  <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-2">
                    <span className="font-bold text-xs text-gray-700 block">๓. นายก อบต.</span>
                    <input
                      type="text"
                      value={dMayorName}
                      onChange={(e) => setDMayorName(e.target.value)}
                      placeholder="ชื่อ-นามสกุล นายก อบต."
                      className="w-full p-2 border border-gray-200 rounded-lg text-xs outline-none bg-gray-50 focus:bg-white text-gray-800"
                    />
                    <input
                      type="text"
                      value={dMayorPosition}
                      onChange={(e) => setDMayorPosition(e.target.value)}
                      placeholder="ตำแหน่ง นายก อบต."
                      className="w-full p-2 border border-gray-200 rounded-lg text-xs outline-none bg-gray-50 focus:bg-white text-gray-600"
                    />
                  </div>

                  {/* ๔. ผู้จ่ายพัสดุ */}
                  <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-2">
                    <span className="font-bold text-xs text-gray-700 block">๔. ผู้จ่ายพัสดุ <span className="text-red-500">*</span></span>
                    <input
                      type="text"
                      required
                      value={dCertifier}
                      onChange={(e) => setDCertifier(e.target.value)}
                      placeholder="ชื่อ-นามสกุล ผู้จ่ายพัสดุ"
                      className="w-full p-2 border border-gray-200 rounded-lg text-xs outline-none bg-gray-50 focus:bg-white text-gray-800"
                    />
                    <input
                      type="text"
                      required
                      value={dCertifierPosition}
                      onChange={(e) => setDCertifierPosition(e.target.value)}
                      placeholder="ตำแหน่งผู้จ่ายพัสดุ"
                      className="w-full p-2 border border-gray-200 rounded-lg text-xs outline-none bg-gray-50 focus:bg-white text-gray-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                วัตถุประสงค์การเบิก / ภารกิจ / หมายเหตุเพิ่มเติม
              </label>
              <textarea
                value={dPurpose}
                onChange={(e) => setDPurpose(e.target.value)}
                rows={2}
                className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none bg-white font-medium text-gray-800"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-5 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 font-semibold text-gray-600 transition-colors cursor-pointer text-sm"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 flex items-center justify-center gap-2 font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer text-sm"
              >
                {editingDispenseId ? 'บันทึกการแก้ไข' : 'อนุมัติการเบิก'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PDF SLIP MODAL */}
      {isPdfModalOpen && selectedPdfRecord && (
        <DispenseSlipPdfModal
          record={selectedPdfRecord}
          allRecords={dispenses}
          equipment={equipment}
          onClose={() => setIsPdfModalOpen(false)}
          showToast={showToast}
        />
      )}

      {/* PDF OVERALL REPORT MODAL */}
      {isReportPdfModalOpen && (
        <EquipmentPdfModal
          equipment={equipment}
          allEquipment={equipment}
          borrows={borrows}
          dispenses={dispenses}
          initialMode="dispenses"
          onClose={() => setIsReportPdfModalOpen(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
}
