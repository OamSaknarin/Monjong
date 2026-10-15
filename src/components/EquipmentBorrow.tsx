import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Equipment, BorrowRecord, DispenseRecord } from '../types';
import { getThaiTodayStr, getThaiNow } from '../utils/dateUtils';
import { exportToExcel } from '../utils/export';
import BorrowSlipPdfModal from './BorrowSlipPdfModal';
import EquipmentPdfModal from './EquipmentPdfModal';
import EquipmentDispense from './EquipmentDispense';
import { 
  Package, HandHelping, Search, FileDown, Plus, Trash2, Edit3, Check, 
  X, AlertTriangle, Eye, RefreshCw, Layers, MapPin, Tag, ArrowRight, UserCheck, Calendar, FileText, Printer,
  ClipboardList
} from 'lucide-react';
import { motion } from 'motion/react';

interface EquipmentBorrowProps {
  equipment: Equipment[];
  borrows: BorrowRecord[];
  dispenses?: DispenseRecord[];
  onSaveEquipment: (updated: Equipment[]) => void;
  onSaveBorrows: (updated: BorrowRecord[]) => void;
  onSaveDispenses?: (updated: DispenseRecord[]) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  showConfirm: (title: string, message: string, type: 'save' | 'edit' | 'delete' | 'default') => Promise<boolean>;
  onRefreshData?: () => Promise<void> | void;
}

type SubTab = 'inventory' | 'borrow-records' | 'dispense-records' | 'search-export';

export default function EquipmentBorrow({ 
  equipment, 
  borrows, 
  dispenses = [],
  onSaveEquipment, 
  onSaveBorrows, 
  onSaveDispenses,
  showToast,
  showConfirm,
  onRefreshData
}: EquipmentBorrowProps) {
  const [activeTab, setActiveTab] = useState<SubTab>('inventory');
  const [dispenseAutoOpen, setDispenseAutoOpen] = useState(false);
  const [dispensePreselectedItemId, setDispensePreselectedItemId] = useState<string | undefined>(undefined);

  // คำนวณจำนวนอุปกรณ์ที่ถูกยืมอยู่ขณะนี้ (รายการยืมที่ยังไม่ส่งคืน !returnedDate)
  const borrowedQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    borrows.forEach(b => {
      if (!b.returnedDate) {
        const q = Number(b.qty) || 1;
        map.set(b.itemId, (map.get(b.itemId) || 0) + q);
      }
    });
    return map;
  }, [borrows]);

  // คำนวณจำนวนอุปกรณ์ที่ถูกเบิกจ่ายไปแล้ว (เฉพาะสถานะที่ไม่ใช่ 'ยกเลิก')
  const dispensedQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    (dispenses || []).forEach(d => {
      if (d.status !== 'ยกเลิก') {
        const q = Number(d.qty) || 1;
        map.set(d.itemId, (map.get(d.itemId) || 0) + q);
      }
    });
    return map;
  }, [dispenses]);

  // ฟังก์ชันคำนวณ ยอดทั้งหมด, ถูกยืมอยู่, เบิกจ่ายแล้ว, และคงเหลือพร้อมใช้งาน
  const getStockInfo = React.useCallback((item: Equipment, excludeBorrowRecordId?: string | null) => {
    const total = Number(item.qty) || 0;
    const dispensed = dispensedQtyMap.get(item.id) || 0;
    let borrowed = borrowedQtyMap.get(item.id) || 0;
    if (excludeBorrowRecordId) {
      const activeRecord = borrows.find(b => b.id === excludeBorrowRecordId);
      if (activeRecord) {
        const groupRecords = activeRecord.groupId 
          ? borrows.filter(b => b.groupId === activeRecord.groupId && !b.returnedDate)
          : borrows.filter(b => b.borrowerName === activeRecord.borrowerName && b.borrowDate === activeRecord.borrowDate && !b.returnedDate);
        const match = groupRecords.find(r => r.itemId === item.id);
        if (match) {
          borrowed = Math.max(0, borrowed - (Number(match.qty) || 1));
        }
      }
    }
    const available = Math.max(0, total - borrowed - dispensed);
    return { total, borrowed, dispensed, available };
  }, [borrowedQtyMap, dispensedQtyMap, borrows]);

  // Search & Filter state for Part 3
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // --- PART 1: EQUIPMENT INVENTORY STATE ---
  const [isEqModalOpen, setIsEqModalOpen] = useState(false);
  const [editingEqId, setEditingEqId] = useState<string | null>(null);
  
  // Equipment Form Inputs
  const [eqName, setEqName] = useState('');
  const [eqCode, setEqCode] = useState('');
  const [eqType, setEqType] = useState('');
  const [eqStatus, setEqStatus] = useState<'ปกติ' | 'ชำรุด' | 'เสีย' | 'จำหน่าย'>('ปกติ');
  const [eqLocation, setEqLocation] = useState('');
  const [eqNote, setEqNote] = useState('');
  const [eqQty, setEqQty] = useState<string>('');

  // --- PART 2: BORROW/RETURN STATE ---
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [editingBorrowId, setEditingBorrowId] = useState<string | null>(null);
  const [selectedPdfRecord, setSelectedPdfRecord] = useState<BorrowRecord | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Borrow Form Inputs
  const [bDate, setBDate] = useState(getThaiTodayStr());
  const [bItemIds, setBItemIds] = useState<string[]>([]);
  const [bItemQuantities, setBItemQuantities] = useState<Record<string, number | string>>({});
  const [bSearchQuery, setBSearchQuery] = useState('');
  const [bName, setBName] = useState('');
  const [bPosition, setBPosition] = useState('');
  const [bTel, setBTel] = useState('');
  const [bCertifier, setBCertifier] = useState('นายไพรศาล  คำใจ');
  const [bCertifierPosition, setBCertifierPosition] = useState('ผู้ช่วยนักจัดการงานทั่วไป');
  
  // ๔ ส่วนระบุเพิ่มเติมสำหรับการยืมคืน (แก้ไขชื่อและตำแหน่งได้)
  const [bHeadOfOfficeComment, setBHeadOfOfficeComment] = useState('เห็นควรพิจารณาอนุมัติ');
  const [bHeadOfOfficeName, setBHeadOfOfficeName] = useState('นายเจริญ  ปันตา');
  const [bHeadOfOfficePosition, setBHeadOfOfficePosition] = useState('เจ้าพนักงานสาธารณสุขชำนาญงาน รักษาราชการแทนหัวหน้าสำนักปลัด');
  const [bMayorOrder, setBMayorOrder] = useState('อนุมัติ');
  const [bMayorName, setBMayorName] = useState('นายธันวา  พะแฮ');
  const [bMayorPosition, setBMayorPosition] = useState('นายกองค์การบริหารส่วนตำบลม่อนจอง');
  const [bHandoverOfficerName, setBHandoverOfficerName] = useState('นายไพรศาล  คำใจ');
  const [bHandoverOfficerPosition, setBHandoverOfficerPosition] = useState('ผู้ช่วยนักจัดการงานทั่วไป');
  const [bReceivingOfficerName, setBReceivingOfficerName] = useState('นายไพรศาล  คำใจ');
  const [bReceivingOfficerPosition, setBReceivingOfficerPosition] = useState('ผู้ช่วยนักจัดการงานทั่วไป');

  const [bReturnDate, setBReturnDate] = useState(() => {
    const thaiToday = getThaiNow();
    return new Date(thaiToday.getTime() + 432000000).toISOString().split('T')[0];
  }); // อีก 5 วันคืน
  const [bNote, setBNote] = useState('');

  // --- PART 1: EQUIPMENT ACTIONS ---
  const handleOpenAddEq = () => {
    setEditingEqId(null);
    setEqName('');
    setEqCode('');
    setEqType('');
    setEqStatus('ปกติ');
    setEqLocation('');
    setEqNote('');
    setEqQty('');
    setIsEqModalOpen(true);
  };

  const handleOpenEditEq = (item: Equipment) => {
    setEditingEqId(item.id);
    setEqName(item.name);
    setEqCode(item.code);
    setEqType(item.type);
    setEqStatus(item.status);
    setEqLocation(item.location);
    setEqNote(item.note);
    setEqQty(String(item.qty));
    setIsEqModalOpen(true);
  };

  const handleSaveEquipmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eqName.trim() || !eqType.trim()) {
      showToast('กรุณากรอกข้อมูลหลักให้ครบถ้วน', 'error');
      return;
    }

    if (editingEqId) {
      // Edit
      const confirmed = await showConfirm(
        'ยืนยันการแก้ไขข้อมูลครุภัณฑ์',
        `คุณต้องการบันทึกการแก้ไขข้อมูลครุภัณฑ์ "${eqName.trim()}" ใช่หรือไม่?`,
        'edit'
      );
      if (!confirmed) return;

      const updated = equipment.map(item => {
        if (item.id === editingEqId) {
          return {
            ...item,
            name: eqName.trim(),
            code: eqCode.trim(),
            type: eqType.trim(),
            status: eqStatus,
            location: eqLocation.trim(),
            note: eqNote.trim(),
            qty: Number(eqQty) || 0
          };
        }
        return item;
      });
      onSaveEquipment(updated);
      showToast('แก้ไขข้อมูลครุภัณฑ์เรียบร้อย', 'success');
    } else {
      // Add
      const confirmed = await showConfirm(
        'ยืนยันการเพิ่มครุภัณฑ์ใหม่',
        `คุณต้องการบันทึกครุภัณฑ์ "${eqName.trim()}" เข้าคลังระบบใช่หรือไม่?`,
        'save'
      );
      if (!confirmed) return;

      const newItem: Equipment = {
        id: 'eq-' + Date.now(),
        name: eqName.trim(),
        code: eqCode.trim(),
        type: eqType.trim(),
        status: eqStatus,
        location: eqLocation.trim(),
        note: eqNote.trim(),
        qty: Number(eqQty) || 0
      };
      onSaveEquipment([...equipment, newItem]);
      showToast('เพิ่มครุภัณฑ์ใหม่เรียบร้อย', 'success');
    }
    setIsEqModalOpen(false);
  };

  const handleDeleteEquipment = async (id: string) => {
    // ป้องกันการลบหากครุภัณฑ์นั้นถูกยืมอยู่และยังไม่คืน
    const isCurrentlyBorrowed = borrows.some(b => b.itemId === id && !b.returnedDate);
    if (isCurrentlyBorrowed) {
      showToast('ไม่สามารถลบได้ เนื่องจากมีรายการยืมค้างอยู่', 'error');
      return;
    }

    const eqItem = equipment.find(item => item.id === id);
    const eqLabel = eqItem ? eqItem.name : 'ครุภัณฑ์นี้';

    const confirmed = await showConfirm(
      'ยืนยันการลบ',
      `ต้องการลบ "${eqLabel}" ใช่หรือไม่?`,
      'delete'
    );
    if (confirmed) {
      const filtered = equipment.filter(item => item.id !== id);
      onSaveEquipment(filtered);
      showToast('ลบรายการครุภัณฑ์สำเร็จ', 'success');
    }
  };

  // --- PART 2: BORROW / RETURN ACTIONS ---
  const handleOpenBorrow = (preselectedItemId?: string) => {
    const availableItems = equipment.filter(e => {
      const { available } = getStockInfo(e);
      return available > 0 && e.status === 'ปกติ';
    });
    if (availableItems.length === 0) {
      showToast('ไม่มีครุภัณฑ์ปกติในคลังที่พร้อมให้ยืมในขณะนี้ (สินค้าหมดหรือถูกยืมครบแล้ว)', 'error');
      return;
    }
    setEditingBorrowId(null);
    setBDate(getThaiTodayStr());
    if (preselectedItemId) {
      setBItemIds([preselectedItemId]);
      setBItemQuantities({ [preselectedItemId]: 1 });
    } else {
      setBItemIds([]);
      setBItemQuantities({});
    }
    setBName('');
    setBPosition('');
    setBTel('');
    setBCertifier('นายไพรศาล  คำใจ');
    setBCertifierPosition('ผู้ช่วยนักจัดการงานทั่วไป');
    setBHeadOfOfficeComment('เห็นควรพิจารณาอนุมัติ');
    setBHeadOfOfficeName('นายเจริญ  ปันตา');
    setBHeadOfOfficePosition('เจ้าพนักงานสาธารณสุขชำนาญงาน รักษาราชการแทนหัวหน้าสำนักปลัด');
    setBMayorOrder('อนุมัติ');
    setBMayorName('นายธันวา  พะแฮ');
    setBMayorPosition('นายกองค์การบริหารส่วนตำบลม่อนจอง');
    setBHandoverOfficerName('นายไพรศาล  คำใจ');
    setBHandoverOfficerPosition('ผู้ช่วยนักจัดการงานทั่วไป');
    setBReceivingOfficerName('นายไพรศาล  คำใจ');
    setBReceivingOfficerPosition('ผู้ช่วยนักจัดการงานทั่วไป');
    setBReturnDate(() => {
      const thaiToday = getThaiNow();
      return new Date(thaiToday.getTime() + 432000000).toISOString().split('T')[0];
    });
    setBNote('');
    setBSearchQuery('');
    setIsBorrowModalOpen(true);
  };

  const handleStartNewDispense = () => {
    setDispensePreselectedItemId(undefined);
    setDispenseAutoOpen(true);
    setActiveTab('dispense-records');
  };

  const handleStartDispenseItem = (itemId: string) => {
    setDispensePreselectedItemId(itemId);
    setDispenseAutoOpen(true);
    setActiveTab('dispense-records');
  };

  const handleStartBorrowItem = (itemId: string) => {
    handleOpenBorrow(itemId);
  };

  const handleOpenEditBorrow = (record: BorrowRecord) => {
    setBSearchQuery('');
    setEditingBorrowId(record.id);
    setBDate(record.borrowDate);
    
    // โหลดทุกรายการพัสดุที่อยู่ในใบยืมเดียวกัน (ตาม groupId หรือผู้ยืม/วันเดียวกัน)
    const groupRecords = record.groupId 
      ? borrows.filter(b => b.groupId === record.groupId)
      : borrows.filter(b => b.borrowerName === record.borrowerName && b.borrowDate === record.borrowDate && !b.returnedDate);
    const targetRecords = groupRecords.length > 0 ? groupRecords : [record];

    setBItemIds(targetRecords.map(r => r.itemId));
    const initialQuantities: Record<string, number> = {};
    targetRecords.forEach(r => {
      initialQuantities[r.itemId] = r.qty || 1;
    });
    setBItemQuantities(initialQuantities);
    setBName(record.borrowerName);
    setBPosition(record.borrowerPosition);
    setBTel(record.borrowerTel);
    setBCertifier(record.certifier || 'นายไพรศาล  คำใจ');
    setBCertifierPosition(record.certifierPosition || 'ผู้ช่วยนักจัดการงานทั่วไป');
    setBHeadOfOfficeComment(record.headOfOfficeComment || 'เห็นควรพิจารณาอนุมัติ');
    setBHeadOfOfficeName(record.headOfOfficeName || 'นายเจริญ  ปันตา');
    setBHeadOfOfficePosition(record.headOfOfficePosition || 'เจ้าพนักงานสาธารณสุขชำนาญงาน รักษาราชการแทนหัวหน้าสำนักปลัด');
    setBMayorOrder(record.mayorOrder || 'อนุมัติ');
    setBMayorName(record.mayorName || 'นายธันวา  พะแฮ');
    setBMayorPosition(record.mayorPosition || 'นายกองค์การบริหารส่วนตำบลม่อนจอง');
    setBHandoverOfficerName(record.handoverOfficerName || 'นายไพรศาล  คำใจ');
    setBHandoverOfficerPosition(record.handoverOfficerPosition || 'ผู้ช่วยนักจัดการงานทั่วไป');
    setBReceivingOfficerName(record.receivingOfficerName || 'นายไพรศาล  คำใจ');
    setBReceivingOfficerPosition(record.receivingOfficerPosition || 'ผู้ช่วยนักจัดการงานทั่วไป');
    setBReturnDate(record.returnDate);
    setBNote(record.note);
    setIsBorrowModalOpen(true);
  };

  const handleBorrowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bItemIds.length === 0 || !bName.trim() || !bPosition.trim() || !bTel.trim() || !bCertifier.trim()) {
      showToast('กรุณากรอกข้อมูลผู้ยืมและการรับรอง และเลือกครุภัณฑ์ให้ครบถ้วน', 'error');
      return;
    }

    if (editingBorrowId) {
      // แก้ไขสลิปยืม
      const activeRecord = borrows.find(r => r.id === editingBorrowId);
      if (!activeRecord) {
        showToast('ไม่พบข้อมูลรายการยืมที่ต้องการแก้ไข', 'error');
        return;
      }

      const selectedEqItems = equipment.filter(item => bItemIds.includes(item.id));
      if (selectedEqItems.length === 0) {
        showToast('กรุณาเลือกพัสดุครุภัณฑ์อย่างน้อย 1 รายการ', 'error');
        return;
      }

      const totalItemsCount = selectedEqItems.reduce((acc, item) => acc + (Number(bItemQuantities[item.id]) || 1), 0);

      const confirmed = await showConfirm(
        'ยืนยันการแก้ไขใบยืมครุภัณฑ์',
        `คุณต้องการบันทึกการแก้ไขรายละเอียดใบยืมของคุณ ${bName.trim()} จำนวน ${selectedEqItems.length} รายการ (รวม ${totalItemsCount} ชิ้น) ใช่หรือไม่?`,
        'edit'
      );
      if (!confirmed) return;

      const overStockItems = selectedEqItems.filter(item => {
        const req = Number(bItemQuantities[item.id]) || 1;
        const { available } = getStockInfo(item, editingBorrowId);
        return available < req;
      });

      if (overStockItems.length > 0) {
        const confirmOver = await showConfirm(
          'มีรายการที่เกินยอดคงคลังพร้อมยืม',
          `รายการต่อไปนี้ระบุจำนวนมากกว่ายอดคงคลังพร้อมยืมในระบบ:\n${overStockItems.map(u => `• ${u.name} (ระบุ ${Number(bItemQuantities[u.id]) || 1} ชิ้น / ในระบบว่าง ${getStockInfo(u, editingBorrowId).available} ชิ้น)`).join('\n')}\nคุณต้องการยืนยันบันทึกจำนวนนี้หรือไม่?`,
          'save'
        );
        if (!confirmOver) return;
      }

      const groupId = activeRecord.groupId || ('group-' + activeRecord.id);

      // Existing records in this group
      const existingGroupRecords = activeRecord.groupId 
        ? borrows.filter(b => b.groupId === activeRecord.groupId)
        : borrows.filter(b => b.borrowerName === activeRecord.borrowerName && b.borrowDate === activeRecord.borrowDate);
      const existingGroupIds = new Set(existingGroupRecords.map(r => r.id));

      const now = Date.now();
      const updatedGroupRecords: BorrowRecord[] = selectedEqItems.map((item, idx) => {
        const qtyToBorrow = Math.max(1, Number(bItemQuantities[item.id]) || 1);
        const existingMatch = existingGroupRecords.find(r => r.itemId === item.id);
        if (existingMatch) {
          return {
            ...existingMatch,
            groupId,
            borrowDate: bDate,
            itemId: item.id,
            itemName: item.name,
            borrowerName: bName.trim(),
            borrowerPosition: bPosition.trim(),
            borrowerTel: bTel.trim(),
            certifier: bCertifier.trim(),
            certifierPosition: bCertifierPosition.trim(),
            returnDate: bReturnDate,
            note: bNote.trim(),
            qty: qtyToBorrow,
            headOfOfficeComment: bHeadOfOfficeComment.trim(),
            headOfOfficeName: bHeadOfOfficeName.trim(),
            headOfOfficePosition: bHeadOfOfficePosition.trim(),
            mayorOrder: bMayorOrder.trim(),
            mayorName: bMayorName.trim(),
            mayorPosition: bMayorPosition.trim(),
            handoverOfficerName: bHandoverOfficerName.trim(),
            handoverOfficerPosition: bHandoverOfficerPosition.trim(),
            receivingOfficerName: bReceivingOfficerName.trim(),
            receivingOfficerPosition: bReceivingOfficerPosition.trim()
          };
        } else {
          return {
            id: 'br-' + (now + idx),
            groupId,
            borrowDate: bDate,
            itemId: item.id,
            itemName: item.name,
            borrowerName: bName.trim(),
            borrowerPosition: bPosition.trim(),
            borrowerTel: bTel.trim(),
            certifier: bCertifier.trim(),
            certifierPosition: bCertifierPosition.trim(),
            returnDate: bReturnDate,
            note: bNote.trim(),
            qty: qtyToBorrow,
            headOfOfficeComment: bHeadOfOfficeComment.trim(),
            headOfOfficeName: bHeadOfOfficeName.trim(),
            headOfOfficePosition: bHeadOfOfficePosition.trim(),
            mayorOrder: bMayorOrder.trim(),
            mayorName: bMayorName.trim(),
            mayorPosition: bMayorPosition.trim(),
            handoverOfficerName: bHandoverOfficerName.trim(),
            handoverOfficerPosition: bHandoverOfficerPosition.trim(),
            receivingOfficerName: bReceivingOfficerName.trim(),
            receivingOfficerPosition: bReceivingOfficerPosition.trim()
          };
        }
      });

      const otherRecords = borrows.filter(r => !existingGroupIds.has(r.id));
      const updated = [...otherRecords, ...updatedGroupRecords];

      onSaveBorrows(updated);
      showToast(`ปรับปรุงรายละเอียดใบยืมอุปกรณ์เรียบร้อย (${selectedEqItems.length} รายการ)`, 'success');
      setIsBorrowModalOpen(false);
    } else {
      // ทำการสร้าง records ใหม่หลายรายการ
      const selectedEqItems = equipment.filter(item => bItemIds.includes(item.id));
      if (selectedEqItems.length === 0) {
        showToast('ไม่พบข้อมูลครุภัณฑ์ที่เลือก', 'error');
        return;
      }

      const invalidQtyItems = selectedEqItems.filter(item => {
        const requestedQty = Number(bItemQuantities[item.id]) || 1;
        const { available } = getStockInfo(item);
        return available < requestedQty || item.status !== 'ปกติ';
      });

      if (invalidQtyItems.length > 0) {
        const confirmOver = await showConfirm(
          'มีรายการที่เกินยอดคงคลังพร้อมยืม',
          `มีบางรายการที่จำนวนระบุมากกว่ายอดคงเหลือในระบบ หรือสถานะไม่ปกติ:\n${invalidQtyItems.map(u => `• ${u.name} (ระบุ ${Number(bItemQuantities[u.id]) || 1} ชิ้น / ในระบบว่าง ${getStockInfo(u).available} ชิ้น)`).join('\n')}\nคุณต้องการยืนยันทำรายการยืมหรือไม่?`,
          'save'
        );
        if (!confirmOver) return;
      }

      const totalItemsCount = selectedEqItems.reduce((acc, item) => acc + (Number(bItemQuantities[item.id]) || 1), 0);

      const confirmed = await showConfirm(
        'ยืนยันการบันทึกการยืมพัสดุ',
        `คุณต้องการทำรายการยืมครุภัณฑ์จำนวน ${selectedEqItems.length} รายการ (รวม ${totalItemsCount} ชิ้น) ให้กับคุณ ${bName.trim()} ใช่หรือไม่? ยอดคงคลังจะถูกหักตามจำนวนที่ยืม`,
        'save'
      );
      if (!confirmed) return;

      const now = Date.now();
      const groupId = 'group-' + now;
      const newBorrows: BorrowRecord[] = selectedEqItems.map((item, idx) => {
        const qtyToBorrow = Math.max(1, Number(bItemQuantities[item.id]) || 1);
        return {
          id: 'br-' + (now + idx),
          groupId,
          borrowDate: bDate,
          itemId: item.id,
          itemName: item.name,
          borrowerName: bName.trim(),
          borrowerPosition: bPosition.trim(),
          borrowerTel: bTel.trim(),
          certifier: bCertifier.trim(),
          certifierPosition: bCertifierPosition.trim(),
          returnDate: bReturnDate,
          note: bNote.trim(),
          qty: qtyToBorrow,
          headOfOfficeComment: bHeadOfOfficeComment.trim(),
          headOfOfficeName: bHeadOfOfficeName.trim(),
          headOfOfficePosition: bHeadOfOfficePosition.trim(),
          mayorOrder: bMayorOrder.trim(),
          mayorName: bMayorName.trim(),
          mayorPosition: bMayorPosition.trim(),
          handoverOfficerName: bHandoverOfficerName.trim(),
          handoverOfficerPosition: bHandoverOfficerPosition.trim(),
          receivingOfficerName: bReceivingOfficerName.trim(),
          receivingOfficerPosition: bReceivingOfficerPosition.trim()
        };
      });

      onSaveBorrows([...borrows, ...newBorrows]);

      showToast(`บันทึกการยืมครุภัณฑ์จำนวน ${selectedEqItems.length} รายการ (${totalItemsCount} ชิ้น) เรียบร้อย`, 'success');
      setIsBorrowModalOpen(false);
      if (newBorrows.length > 0) {
        setSelectedPdfRecord(newBorrows[0]);
      }
    }
  };

  // รับคืนของกลับเข้าคลัง
  const handleReturnEquipment = async (record: BorrowRecord) => {
    const returnQty = record.qty || 1;
    const confirmed = await showConfirm(
      'ยืนยันการรับคืนครุภัณฑ์',
      `ยืนยันการรับคืนครุภัณฑ์ "${record.itemName}" (จำนวน ${returnQty} ชิ้น) จากคุณ ${record.borrowerName} ใช่หรือไม่? ยอดคงคลังจะคืนกลับเข้าคลังอัตโนมัติ`,
      'save'
    );
    if (confirmed) {
      const todayStr = getThaiTodayStr();
      
      // อัปเดตสถานะการคืนใน record
      const updatedBorrows = borrows.map(item => {
        if (item.id === record.id) {
          return { ...item, returnedDate: todayStr };
        }
        return item;
      });

      onSaveBorrows(updatedBorrows);
      showToast(`รับคืนครุภัณฑ์และเพิ่มยอดคงคลังกลับเข้าคลัง (+${returnQty}) สำเร็จ`, 'success');
    }
  };

  // รับคืนพัสดุยกกลุ่มใน 1 สลิป
  const handleReturnGroupEquipment = async (groupRecords: BorrowRecord[]) => {
    const unreturned = groupRecords.filter(r => !r.returnedDate);
    if (unreturned.length === 0) return;

    const totalQty = unreturned.reduce((sum, r) => sum + (r.qty || 1), 0);
    const borrowerName = groupRecords[0].borrowerName;

    const confirmed = await showConfirm(
      'ยืนยันการรับคืนครุภัณฑ์ทั้งหมด',
      `คุณต้องการรับคืนครุภัณฑ์ทั้งหมด ${unreturned.length} รายการ (รวม ${totalQty} ชิ้น) จากคุณ ${borrowerName} ใช่หรือไม่? ยอดคงคลังจะบวกเพิ่มตามจำนวนที่รับคืน`,
      'save'
    );
    if (!confirmed) return;

    const todayStr = getThaiTodayStr();
    const unreturnedIds = new Set(unreturned.map(r => r.id));

    const updatedBorrows = borrows.map(item => {
      if (unreturnedIds.has(item.id)) {
        return { ...item, returnedDate: todayStr };
      }
      return item;
    });

    onSaveBorrows(updatedBorrows);
    showToast(`รับคืนครุภัณฑ์ ${unreturned.length} รายการ (${totalQty} ชิ้น) เรียบร้อยแล้ว`, 'success');
  };

  // จัดกลุ่มรายการยืมตามสลิป/เรื่องยืมเดียวกัน
  const groupedBorrows = React.useMemo(() => {
    const map = new Map<string, {
      groupKey: string;
      borrowerName: string;
      borrowerPosition: string;
      borrowerTel: string;
      certifier: string;
      borrowDate: string;
      returnDate: string;
      note: string;
      records: BorrowRecord[];
    }>();

    borrows.forEach(record => {
      const key = record.groupId || `${record.borrowerName.trim()}_${record.borrowDate}_${record.returnDate}_${record.certifier.trim()}`;
      if (!map.has(key)) {
        map.set(key, {
          groupKey: key,
          borrowerName: record.borrowerName,
          borrowerPosition: record.borrowerPosition,
          borrowerTel: record.borrowerTel,
          certifier: record.certifier,
          borrowDate: record.borrowDate,
          returnDate: record.returnDate,
          note: record.note,
          records: [record]
        });
      } else {
        map.get(key)!.records.push(record);
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const dateCompare = (b.borrowDate || '').localeCompare(a.borrowDate || '');
      if (dateCompare !== 0) return dateCompare;
      return (b.groupKey || '').localeCompare(a.groupKey || '');
    });
  }, [borrows]);

  const handleDeleteBorrow = async (id: string) => {
    const record = borrows.find(b => b.id === id);
    if (!record) return;

    // ถ้ายังไม่คืน และลบประวัติ จะต้องคืนของเข้าคลังให้เสร็จก่อน หรือลบตรงๆ โดยแจ้งเตือนความเสี่ยง
    const confirmMessage = record.returnedDate 
      ? 'ต้องการลบประวัติการยืม-คืนที่เสร็จสิ้นแล้วรายการนี้ใช่หรือไม่?'
      : 'คำเตือน: บันทึกยืมนี้ "ยังไม่ส่งคืนอุปกรณ์" หากลบรายการนี้ ข้อมูลจำนวนคงคลังจะไม่ได้รับการอัปเดตกลับคืน ยืนยันที่จะลบประวัติหรือไม่?';

    const confirmed = await showConfirm(
      'ยืนยันการลบบันทึกประวัติ',
      confirmMessage,
      'delete'
    );
    if (confirmed) {
      const filtered = borrows.filter(item => item.id !== id);
      onSaveBorrows(filtered);
      showToast('ลบรายการบันทึกยืม-คืนเรียบร้อย', 'success');
    }
  };

  // --- PART 3: ADVANCED SEARCH, FILTER & EXPORT ---
  const filteredEquipment = useMemo(() => {
    return equipment.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || item.type === filterType;
      const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [equipment, searchQuery, filterType, filterStatus]);

  // ดึงประเภทอุปกรณ์ที่มีทั้งหมดมาทำตัวเลือกกรอง
  const uniqueTypes = useMemo(() => {
    const types = equipment.map(item => item.type);
    return Array.from(new Set(types));
  }, [equipment]);

  // ฟังก์ชันส่งออกเป็นไฟล์ Excel
  const handleExportExcel = () => {
    if (filteredEquipment.length === 0) {
      showToast('ไม่มีข้อมูลสำหรับส่งออก', 'error');
      return;
    }

    const data = filteredEquipment.map((item, idx) => {
      const { total, borrowed, dispensed, available } = getStockInfo(item);
      return {
        'ลำดับ': idx + 1,
        'รายการครุภัณฑ์': item.name,
        'หมายเลขครุภัณฑ์': item.code,
        'ประเภท': item.type,
        'สถานะ': item.status,
        'สถานที่จัดเก็บ': item.location,
        'จำนวนทั้งหมด': total,
        'ถูกยืมอยู่': borrowed,
        'เบิกจ่ายแล้ว': dispensed,
        'คงเหลือพร้อมใช้งาน': available,
        'หมายเหตุ': item.note || '-'
      };
    });
    
    exportToExcel(data, 'รายงานครุภัณฑ์สำนักงาน', 'รายการอุปกรณ์');
    showToast('ส่งออกไฟล์ Excel เรียบร้อย', 'success');
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-sky-200 p-4 sm:p-6 md:p-8 shadow-xl relative overflow-hidden flex-grow flex flex-col w-full max-w-full min-w-0" id="equipment-borrow-panel">
      {/* Top Gradient Glow Accent Bar */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-sky-500 to-blue-600" />
      {/* Background visual graphics */}
      <div className="absolute -top-10 -right-10 w-80 h-80 bg-gradient-to-br from-sky-500/10 to-blue-500/5 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-gradient-to-tr from-blue-500/10 to-sky-400/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-sky-100 pb-6 mb-6 relative z-10">
        <div className="flex items-center space-x-4">
          <div className="p-4 bg-gradient-to-tr from-sky-500 to-blue-600 text-white rounded-2xl shadow-lg shadow-sky-500/30">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading text-xl sm:text-2xl font-black text-sky-950 tracking-tight">ระบบยืม-คืน & เบิกพัสดุครุภัณฑ์</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 font-medium">จัดการระบบคงคลัง การยืม-คืน และการเบิกพัสดุอุปกรณ์ครบวงจร</p>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex flex-wrap sm:flex-nowrap overflow-x-auto pb-1 border-b border-sky-100 mb-6 gap-2 relative z-10 w-full max-w-full min-w-0 custom-scrollbar" id="equipment-tabs">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2.5 font-heading font-black text-xs rounded-t-2xl border-t border-x transition-all duration-200 flex items-center gap-2 cursor-pointer ${
            activeTab === 'inventory'
              ? 'bg-sky-50 text-sky-700 border-sky-100 border-b-2 border-b-sky-500 shadow-sm'
              : 'border-transparent text-gray-500 hover:text-sky-600 hover:bg-sky-50/50'
          }`}
        >
          <Package className="w-4 h-4 text-sky-500" />
          <span>คลังพัสดุ ({equipment.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('borrow-records')}
          className={`px-4 py-2.5 font-heading font-black text-xs rounded-t-2xl border-t border-x transition-all duration-200 flex items-center gap-2 cursor-pointer ${
            activeTab === 'borrow-records'
              ? 'bg-sky-50 text-sky-700 border-sky-100 border-b-2 border-b-sky-500 shadow-sm'
              : 'border-transparent text-gray-500 hover:text-sky-600 hover:bg-sky-50/50'
          }`}
        >
          <HandHelping className="w-4 h-4 text-sky-600" />
          <span>ประวัติการยืม-คืน ({borrows.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('dispense-records')}
          className={`px-4 py-2.5 font-heading font-black text-xs rounded-t-2xl border-t border-x transition-all duration-200 flex items-center gap-2 cursor-pointer ${
            activeTab === 'dispense-records'
              ? 'bg-amber-50 text-amber-800 border-amber-200 border-b-2 border-b-amber-500 shadow-sm'
              : 'border-transparent text-gray-500 hover:text-amber-700 hover:bg-amber-50/50'
          }`}
        >
          <ClipboardList className="w-4 h-4 text-amber-600" />
          <span>ประวัติการเบิกอุปกรณ์ ({dispenses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('search-export')}
          className={`px-4 py-2.5 font-heading font-black text-xs rounded-t-2xl border-t border-x transition-all duration-200 flex items-center gap-2 cursor-pointer ${
            activeTab === 'search-export'
              ? 'bg-sky-50 text-sky-700 border-sky-100 border-b-2 border-b-sky-500 shadow-sm'
              : 'border-transparent text-gray-500 hover:text-sky-600 hover:bg-sky-50/50'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>ค้นหาและรายงาน</span>
        </button>
      </div>

      {/* --- CONTENT AREA --- */}

      {/* TAB 1: INVENTORY & DASHBOARD */}
      
      {isEqModalOpen ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6 animate-in fade-in duration-200 z-10 relative mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl border border-sky-100">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingEqId ? 'แก้ไขข้อมูลพัสดุครุภัณฑ์' : 'ขึ้นทะเบียนพัสดุครุภัณฑ์ใหม่'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">กรอกรายละเอียดเพื่อบันทึกข้อมูลพัสดุครุภัณฑ์เข้าสู่ระบบ</p>
              </div>
            </div>
            
          </div>
          <form onSubmit={handleSaveEquipmentSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">ชื่อครุภัณฑ์ / รายการพัสดุ <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={eqName}
                  onChange={(e) => setEqName(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none bg-white font-medium text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">รหัส/หมายเลขครุภัณฑ์ (ถ้ามี)</label>
                <input
                  type="text"
                  value={eqCode}
                  onChange={(e) => setEqCode(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none bg-white font-medium text-gray-800"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">หมวดหมู่ <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={eqType}
                  onChange={(e) => setEqType(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none bg-white font-medium text-gray-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">สถานะพัสดุ</label>
                  <select
                    value={eqStatus}
                    onChange={(e) => setEqStatus(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none bg-white font-medium text-gray-800"
                  >
                    <option value="ปกติ">ปกติ (ใช้งานได้)</option>
                    <option value="ชำรุด">ชำรุด</option>
                    <option value="เสีย">เสีย</option>
                    <option value="จำหน่าย">จำหน่าย/ตัดสต็อก</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">จำนวน <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={eqQty}
                    onChange={(e) => setEqQty(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none bg-white font-medium text-gray-800"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">สถานที่จัดเก็บ <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={eqLocation}
                onChange={(e) => setEqLocation(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none bg-white font-medium text-gray-800"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">รายละเอียดเพิ่มเติม</label>
              <textarea
                value={eqNote}
                onChange={(e) => setEqNote(e.target.value)}
                rows={2}
                className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none bg-white font-medium text-gray-800"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsEqModalOpen(false)}
                className="px-5 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 font-semibold text-gray-600 transition-colors cursor-pointer text-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveEquipmentSubmit}
                className="px-6 py-2.5 bg-sky-600 text-white rounded-xl hover:bg-sky-700 flex items-center justify-center gap-2 font-bold shadow-md shadow-sky-500/20 transition-all cursor-pointer text-sm"
              >
                {editingEqId ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
              </button>
            </div>
          </form>
        </div>
      ) : isBorrowModalOpen ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6 animate-in fade-in duration-200 z-10 relative mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl border border-sky-100">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingBorrowId ? 'แก้ไขข้อมูลการยืม-คืน' : 'ทำรายการยืมพัสดุครุภัณฑ์'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">กรอกรายละเอียดเพื่อบันทึกการเบิก-ยืมพัสดุครุภัณฑ์</p>
              </div>
            </div>
            
          </div>
          <form onSubmit={handleBorrowSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">วันที่ทำรายการ <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={bDate}
                  onChange={(e) => setBDate(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none bg-white font-medium text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">กำหนดส่งคืน (โดยประมาณ)</label>
                <input
                  type="date"
                  value={bReturnDate}
                  onChange={(e) => setBReturnDate(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none bg-white font-medium text-gray-800"
                />
              </div>
            </div>

            <div className="bg-gray-50 p-5 md:p-6 rounded-2xl border border-gray-200 space-y-4">
              <div className="border-b border-gray-200 pb-3">
                <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <Package className="w-5 h-5 text-sky-600" />
                  <span>1. {editingBorrowId ? 'แก้ไขรายการพัสดุครุภัณฑ์ที่ยืม' : 'เลือกพัสดุครุภัณฑ์ที่ต้องการยืม'}</span>
                </h3>
              </div>

              {/* ช่องค้นหาพัสดุครุภัณฑ์ */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, รหัส, หรือประเภทพัสดุครุภัณฑ์..."
                  value={bSearchQuery}
                  onChange={(e) => setBSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none font-medium placeholder:text-gray-400 transition-all"
                />
                {bSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setBSearchQuery('')}
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
                    .filter(e => getStockInfo(e, editingBorrowId).available > 0 || bItemIds.includes(e.id))
                    .filter(e => {
                      if (!bSearchQuery.trim()) return true;
                      const q = bSearchQuery.toLowerCase().trim();
                      return (
                        e.name.toLowerCase().includes(q) ||
                        e.code.toLowerCase().includes(q) ||
                        (e.type && e.type.toLowerCase().includes(q)) ||
                        (e.location && e.location.toLowerCase().includes(q))
                      );
                    });

                  if (items.length === 0) {
                    return (
                      <div className="py-8 text-center text-sm text-gray-500 font-medium">
                        ไม่พบพัสดุครุภัณฑ์ที่ตรงกับคำค้นหา "{bSearchQuery}"
                      </div>
                    );
                  }

                  return items.map(eq => {
                    const isSelected = bItemIds.includes(eq.id);
                    const stock = getStockInfo(eq, editingBorrowId);
                  return (
                    <div 
                      key={eq.id} 
                      className={`p-3 rounded-xl border transition-all ${
                        isSelected 
                          ? 'bg-sky-50 border-sky-300 ring-1 ring-sky-300/50' 
                          : 'bg-white border-gray-100 hover:border-sky-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBItemIds([...bItemIds, eq.id]);
                              setBItemQuantities({
                                ...bItemQuantities,
                                [eq.id]: bItemQuantities[eq.id] || 1
                              });
                            } else {
                              setBItemIds(bItemIds.filter(id => id !== eq.id));
                              const newQ = {...bItemQuantities};
                              delete newQ[eq.id];
                              setBItemQuantities(newQ);
                            }
                          }}
                          className="w-5 h-5 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => {
                            if (isSelected) {
                              setBItemIds(bItemIds.filter(id => id !== eq.id));
                              const newQ = {...bItemQuantities};
                              delete newQ[eq.id];
                              setBItemQuantities(newQ);
                            } else {
                              setBItemIds([...bItemIds, eq.id]);
                              setBItemQuantities({
                                ...bItemQuantities,
                                [eq.id]: bItemQuantities[eq.id] || 1
                              });
                            }
                          }}
                        >
                          <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            <span>{eq.name}</span>
                            {isSelected && (
                              <span className="text-[10px] bg-sky-600 text-white px-2 py-0.5 rounded-full font-normal">
                                เลือกแล้ว
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 font-mono">
                            {eq.code} • ว่างพร้อมยืม: <span className="font-bold text-emerald-600">{stock.available}</span> (ทั้งหมด {stock.total})
                          </div>
                        </div>
                        {isSelected && (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-sky-300 shadow-xs">
                              <label className="text-xs text-gray-700 font-bold mr-0.5">จำนวน:</label>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const current = Number(bItemQuantities[eq.id]) || 1;
                                  const next = Math.max(1, current - 1);
                                  setBItemQuantities({ ...bItemQuantities, [eq.id]: next });
                                }}
                                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 active:scale-90 text-gray-700 font-bold flex items-center justify-center transition cursor-pointer select-none text-base border border-gray-200"
                                title="ลดจำนวน"
                              >
                                -
                              </button>
                              <input 
                                type="number"
                                min="1"
                                value={bItemQuantities[eq.id] !== undefined ? bItemQuantities[eq.id] : 1}
                                onFocus={(e) => e.target.select()}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  if (raw === '') {
                                    setBItemQuantities({ ...bItemQuantities, [eq.id]: '' });
                                    return;
                                  }
                                  const val = parseInt(raw, 10);
                                  if (!isNaN(val)) {
                                    setBItemQuantities({ ...bItemQuantities, [eq.id]: Math.max(1, val) });
                                  }
                                }}
                                onBlur={() => {
                                  const current = Number(bItemQuantities[eq.id]);
                                  if (!current || current < 1) {
                                    setBItemQuantities({ ...bItemQuantities, [eq.id]: 1 });
                                  }
                                }}
                                className="w-16 p-1 border border-sky-300 rounded-lg text-center font-bold text-sky-950 focus:ring-2 focus:ring-sky-500/40 outline-none text-sm bg-white"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const current = Number(bItemQuantities[eq.id]) || 1;
                                  setBItemQuantities({ ...bItemQuantities, [eq.id]: current + 1 });
                                }}
                                className="w-7 h-7 rounded-lg bg-sky-100 hover:bg-sky-200 active:scale-90 text-sky-800 font-bold flex items-center justify-center transition cursor-pointer select-none text-base border border-sky-200"
                                title="เพิ่มจำนวน"
                              >
                                +
                              </button>
                              <span className="text-xs text-gray-500 font-medium ml-0.5">ชิ้น</span>
                            </div>
                            {Number(bItemQuantities[eq.id]) > stock.available && (
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

            <div className="bg-gray-50 p-5 md:p-6 rounded-2xl border border-gray-200 space-y-4">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2 border-b border-gray-200 pb-3">
                2. ข้อมูลผู้ยืม และผู้อนุมัติ
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">ชื่อ - นามสกุล ผู้ยืม <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={bName}
                    onChange={(e) => setBName(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none bg-white font-medium text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">หน่วยงาน <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={bPosition}
                    onChange={(e) => setBPosition(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none bg-white font-medium text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">เบอร์โทรศัพท์ผู้ยืม <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={bTel}
                    onChange={(e) => setBTel(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none bg-white font-medium text-gray-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">เจ้าหน้าที่ผู้อนุมัติ <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={bCertifier}
                    onChange={(e) => setBCertifier(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none bg-white font-medium text-gray-800"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">ตำแหน่งผู้รับรองสิทธิ์</label>
                  <input
                    type="text"
                    value={bCertifierPosition}
                    onChange={(e) => setBCertifierPosition(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none bg-white font-medium text-gray-800"
                  />
                </div>
              </div>
            </div>

            {/* 3. การพิจารณาอนุมัติ และเจ้าหน้าที่ส่งมอบ-รับคืน (แก้ไขชื่อและตำแหน่งได้) */}
            <div className="bg-amber-50/40 p-5 md:p-6 rounded-2xl border border-amber-200/80 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 pb-3">
                <h3 className="text-base font-bold text-amber-950 flex items-center gap-2">
                  <span>3. ข้อมูลการอนุมัติ และเจ้าหน้าที่ส่งมอบ-รับคืน</span>
                  <span className="text-[11px] font-normal text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full border border-amber-300">
                    แก้ไขชื่อ-ตำแหน่งได้
                  </span>
                </h3>
                <span className="text-xs text-amber-900 font-medium">บันทึกข้อมูลลง Google Sheets และแสดงในใบยืม-คืน</span>
              </div>

              <div className="space-y-4">
                {/* 1. ความเห็นหัวหน้าสำนักปลัด */}
                <div className="bg-white p-3.5 rounded-xl border border-amber-200/60 space-y-2.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-gray-800">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">๑</span>
                    <span>ความเห็นหัวหน้าสำนักปลัด</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-1">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">ความเห็น / ข้อเสนอแนะ</label>
                      <input
                        type="text"
                        value={bHeadOfOfficeComment}
                        onChange={(e) => setBHeadOfOfficeComment(e.target.value)}
                        placeholder="เห็นควรพิจารณาอนุมัติ"
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:ring-2 focus:ring-amber-500/20 outline-none"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">ชื่อ-นามสกุล หัวหน้าสำนักปลัด</label>
                      <input
                        type="text"
                        value={bHeadOfOfficeName}
                        onChange={(e) => setBHeadOfOfficeName(e.target.value)}
                        placeholder="นายเจริญ  ปันตา"
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:ring-2 focus:ring-amber-500/20 outline-none"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">ตำแหน่ง</label>
                      <input
                        type="text"
                        value={bHeadOfOfficePosition}
                        onChange={(e) => setBHeadOfOfficePosition(e.target.value)}
                        placeholder="เจ้าพนักงานสาธารณสุขชำนาญงาน รักษาราชการแทนหัวหน้าสำนักปลัด"
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:ring-2 focus:ring-amber-500/20 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. คำสั่ง / การอนุมัติ (นายก) */}
                <div className="bg-white p-3.5 rounded-xl border border-amber-200/60 space-y-2.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-gray-800">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">๒</span>
                    <span>คำสั่ง / การอนุมัติ (นายก อบต.)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-1">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">คำสั่ง / ผลการพิจารณา</label>
                      <select
                        value={bMayorOrder}
                        onChange={(e) => setBMayorOrder(e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:ring-2 focus:ring-amber-500/20 outline-none bg-white cursor-pointer"
                      >
                        <option value="อนุมัติ">อนุมัติ</option>
                        <option value="ไม่อนุมัติ">ไม่อนุมัติ</option>
                        <option value="อนุมัติโดยมีเงื่อนไข">อนุมัติโดยมีเงื่อนไข</option>
                      </select>
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">ชื่อ-นามสกุล นายก อบต.</label>
                      <input
                        type="text"
                        value={bMayorName}
                        onChange={(e) => setBMayorName(e.target.value)}
                        placeholder="นายธันวา  พะแฮ"
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:ring-2 focus:ring-amber-500/20 outline-none"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">ตำแหน่ง</label>
                      <input
                        type="text"
                        value={bMayorPosition}
                        onChange={(e) => setBMayorPosition(e.target.value)}
                        placeholder="นายกองค์การบริหารส่วนตำบลม่อนจอง"
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:ring-2 focus:ring-amber-500/20 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 3 & 4. เจ้าหน้าที่ส่งมอบและรับคืนพัสดุ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* 3. เจ้าหน้าที่ส่งมอบพัสดุ */}
                  <div className="bg-white p-3.5 rounded-xl border border-amber-200/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-gray-800">
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">๓</span>
                        <span>เจ้าหน้าที่ส่งมอบพัสดุ</span>
                      </div>
                      <span className="text-[10px] text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full font-medium">คนเดียวกับผู้รับคืน</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">ชื่อ-นามสกุล เจ้าหน้าที่ส่งมอบ</label>
                        <input
                          type="text"
                          value={bHandoverOfficerName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBHandoverOfficerName(val);
                            setBReceivingOfficerName(val);
                          }}
                          placeholder="นายไพรศาล  คำใจ"
                          className="w-full p-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:ring-2 focus:ring-amber-500/20 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">ตำแหน่ง</label>
                        <input
                          type="text"
                          value={bHandoverOfficerPosition}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBHandoverOfficerPosition(val);
                            setBReceivingOfficerPosition(val);
                          }}
                          placeholder="ผู้ช่วยนักจัดการงานทั่วไป"
                          className="w-full p-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:ring-2 focus:ring-amber-500/20 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. เจ้าหน้าที่รับคืนพัสดุ */}
                  <div className="bg-white p-3.5 rounded-xl border border-amber-200/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-gray-800">
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">๔</span>
                        <span>เจ้าหน้าที่รับคืนพัสดุ</span>
                      </div>
                      <span className="text-[10px] text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full font-medium">คนเดียวกับผู้ส่งมอบ</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">ชื่อ-นามสกุล เจ้าหน้าที่รับคืน</label>
                        <input
                          type="text"
                          value={bReceivingOfficerName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBReceivingOfficerName(val);
                            setBHandoverOfficerName(val);
                          }}
                          placeholder="นายไพรศาล  คำใจ"
                          className="w-full p-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:ring-2 focus:ring-amber-500/20 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">ตำแหน่ง</label>
                        <input
                          type="text"
                          value={bReceivingOfficerPosition}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBReceivingOfficerPosition(val);
                            setBHandoverOfficerPosition(val);
                          }}
                          placeholder="ผู้ช่วยนักจัดการงานทั่วไป"
                          className="w-full p-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:ring-2 focus:ring-amber-500/20 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">วัตถุประสงค์ / หมายเหตุเพิ่มเติม</label>
              <textarea
                value={bNote}
                onChange={(e) => setBNote(e.target.value)}
                rows={2}
                className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none bg-white font-medium text-gray-800"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsBorrowModalOpen(false)}
                className="px-5 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 font-semibold text-gray-600 transition-colors cursor-pointer text-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleBorrowSubmit}
                className="px-6 py-2.5 bg-sky-600 text-white rounded-xl hover:bg-sky-700 flex items-center justify-center gap-2 font-bold shadow-md shadow-sky-500/20 transition-all cursor-pointer text-sm"
              >
                {editingBorrowId ? 'บันทึกการแก้ไข' : 'อนุมัติการยืม'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>

{activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Bento Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="p-4 rounded-xl bg-orange-50/40 border border-orange-100/50">
              <span className="text-[10px] font-bold text-orange-700 block mb-1">พัสดุขึ้นทะเบียนทั้งหมด</span>
              <span className="text-2xl font-bold font-heading text-orange-950">
                {equipment.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)}
              </span>
              <span className="text-[10px] text-gray-400 block mt-1">ชิ้น ({equipment.length} ชนิด)</span>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-100/50">
              <span className="text-[10px] font-bold text-emerald-700 block mb-1">คงเหลือพร้อมใช้งาน</span>
              <span className="text-2xl font-bold font-heading text-emerald-950">
                {equipment.filter(e => e.status === 'ปกติ').reduce((sum, item) => sum + getStockInfo(item).available, 0)}
              </span>
              <span className="text-[10px] text-gray-400 block mt-1">ชิ้น</span>
            </div>
            <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-100/50">
              <span className="text-[10px] font-bold text-amber-700 block mb-1">กำลังถูกยืมใช้งาน</span>
              <span className="text-2xl font-bold font-heading text-amber-950">
                {borrows.filter(b => !b.returnedDate).reduce((sum, b) => sum + (b.qty || 1), 0)}
              </span>
              <span className="text-[10px] text-gray-400 block mt-1">ชิ้น</span>
            </div>
            <div 
              className="p-4 rounded-xl bg-purple-50/50 border border-purple-200/80 shadow-xs cursor-pointer hover:bg-purple-100/60 transition group"
              onClick={handleStartNewDispense}
              title="คลิกเพื่อไปที่ประวัติการเบิก หรือทำเรื่องเบิกพัสดุ"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-700 block mb-1">เบิกจ่ายแล้ว</span>
                <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-semibold group-hover:bg-purple-200 transition">
                  การเบิก
                </span>
              </div>
              <span className="text-2xl font-bold font-heading text-purple-950">
                {(dispenses || []).filter(d => d.status !== 'ยกเลิก').reduce((sum, d) => sum + (Number(d.qty) || 1), 0)}
              </span>
              <span className="text-[10px] text-gray-400 block mt-1">ชิ้น ({(dispenses || []).filter(d => d.status !== 'ยกเลิก').length} รายการ)</span>
            </div>
            <div className="p-4 rounded-xl bg-rose-50/40 border border-rose-100/50">
              <span className="text-[10px] font-bold text-rose-700 block mb-1">ชำรุด/รอจำหน่าย</span>
              <span className="text-2xl font-bold font-heading text-rose-950">
                {equipment.filter(e => e.status !== 'ปกติ').length}
              </span>
              <span className="text-[10px] text-gray-400 block mt-1">รายการ</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-heading font-bold text-orange-950 text-sm">รายการจัดทำและคงคลังอุปกรณ์</h3>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleStartNewDispense}
                className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-heading text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                id="btn-add-dispense"
                title="ทำรายการเบิกพัสดุครุภัณฑ์"
              >
                <ClipboardList className="w-4 h-4" />
                <span>เพิ่มการเบิกพัสดุ</span>
              </button>
              <button
                onClick={() => handleOpenBorrow()}
                className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-heading text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                id="btn-add-borrow"
                title="ทำเรื่องยืมครุภัณฑ์"
              >
                <HandHelping className="w-4 h-4" />
                <span>ทำเรื่องยืมครุภัณฑ์</span>
              </button>
              <button
                onClick={handleOpenAddEq}
                className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-heading text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>ขึ้นทะเบียนอุปกรณ์</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-orange-50 rounded-xl w-full max-w-full min-w-0 custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs min-w-[700px]">
              <thead>
                <tr className="bg-orange-50/50 border-b border-orange-100 text-orange-900 font-heading">
                  <th className="p-3 font-semibold">รายการครุภัณฑ์</th>
                  <th className="p-3 font-semibold">รหัสครุภัณฑ์</th>
                  <th className="p-3 font-semibold">หมวดหมู่</th>
                  <th className="p-3 font-semibold text-center">สถานะ</th>
                  <th className="p-3 font-semibold">สถานที่จัดเก็บ</th>
                  <th className="p-3 font-semibold text-center">จำนวนทั้งหมด</th>
                  <th className="p-3 font-semibold text-center">ถูกยืมอยู่</th>
                  <th className="p-3 font-semibold text-center text-purple-900 bg-purple-50/70 border-x border-purple-100">เบิกจ่ายแล้ว</th>
                  <th className="p-3 font-semibold text-center">คงเหลือพร้อมใช้งาน</th>
                  <th className="p-3 font-semibold text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-50 font-sans">
                {equipment.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-gray-400">ไม่พบข้อมูลอุปกรณ์ขึ้นทะเบียนในคลัง</td>
                  </tr>
                ) : (
                  equipment.map(item => {
                    const { total, borrowed, dispensed, available } = getStockInfo(item);
                    return (
                      <tr key={item.id} className="hover:bg-orange-50/20 transition-colors">
                        <td className="p-3">
                          <div className="font-semibold text-gray-900 text-xs">{item.name}</div>
                          {item.note && <div className="text-[10px] text-gray-400 italic">{item.note}</div>}
                        </td>
                        <td className="p-3 font-mono font-medium text-orange-800">{item.code}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-heading text-[10px]">
                            {item.type}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-heading font-medium ${
                            item.status === 'ปกติ' ? 'bg-emerald-100 text-emerald-800' :
                            item.status === 'ชำรุด' ? 'bg-amber-100 text-amber-800' :
                            item.status === 'เสีย' ? 'bg-rose-100 text-rose-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <span>{item.location}</span>
                        </td>
                        <td className="p-3 text-center font-bold font-mono text-xs text-gray-700">
                          {total} ชิ้น
                        </td>
                        <td className="p-3 text-center font-bold font-mono text-xs">
                          {borrowed > 0 ? (
                            <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              {borrowed} ชิ้น
                            </span>
                          ) : (
                            <span className="text-gray-400 font-normal">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center font-bold font-mono text-xs bg-purple-50/20 border-x border-purple-100/40">
                          {dispensed > 0 ? (
                            <span className="text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              {dispensed} ชิ้น
                            </span>
                          ) : (
                            <span className="text-gray-400 font-normal">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center font-bold font-mono text-xs">
                          <span className={`px-2 py-0.5 rounded-full ${
                            available === 0 ? 'bg-rose-100 text-rose-700 font-extrabold' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {available} ชิ้น
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => handleStartDispenseItem(item.id)}
                              className="px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                              title="เบิกพัสดุรายการนี้"
                            >
                              <ClipboardList className="w-3.5 h-3.5 text-purple-600" />
                              <span>เบิก</span>
                            </button>
                            <button
                              onClick={() => handleStartBorrowItem(item.id)}
                              className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                              title="ยืมพัสดุรายการนี้"
                            >
                              <HandHelping className="w-3.5 h-3.5 text-amber-600" />
                              <span>ยืม</span>
                            </button>
                            <button
                              onClick={() => handleOpenEditEq(item)}
                              className="p-1.5 rounded text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition cursor-pointer"
                              title="แก้ไข"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteEquipment(item.id)}
                              className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                              title="ลบ"
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
        </div>
      )}

      {/* TAB 2: BORROW / RETURN LOG */}
      {activeTab === 'borrow-records' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-heading font-bold text-orange-950 text-sm">
              ประวัติการทำรายการ ยืม - คืน อุปกรณ์ ({groupedBorrows.length} เรื่องยืม / รวม {borrows.length} รายการ)
            </h3>
            <button
              onClick={handleOpenBorrow}
              className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-heading text-xs font-semibold flex items-center gap-1.5 transition"
              id="btn-borrow-add"
            >
              <HandHelping className="w-4 h-4" />
              <span>ทำเรื่องยืมครุภัณฑ์</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groupedBorrows.length === 0 ? (
              <div className="col-span-2 p-12 text-center text-gray-400 bg-gray-50/50 rounded-xl border border-dashed">
                ยังไม่มีข้อมูลการยืมครุภัณฑ์
              </div>
            ) : (
              groupedBorrows.map(group => {
                const totalItemsCount = group.records.reduce((sum, r) => sum + (r.qty || 1), 0);
                const returnedRecords = group.records.filter(r => !!r.returnedDate);
                const unreturnedRecords = group.records.filter(r => !r.returnedDate);
                const isAllReturned = unreturnedRecords.length === 0;
                const isPartiallyReturned = returnedRecords.length > 0 && unreturnedRecords.length > 0;
                
                const thaiToday = getThaiNow();
                const isOverdue = !isAllReturned && new Date(group.returnDate) < thaiToday;
                
                const repRecord = group.records[0];
                const displayId = repRecord.groupId 
                  ? repRecord.groupId.replace('group-', 'GR-').slice(-6).toUpperCase()
                  : repRecord.id.slice(-5);

                return (
                  <div 
                    key={group.groupKey} 
                    className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between transition-all hover:shadow-lg ${
                      isAllReturned 
                        ? 'bg-emerald-50/20 border-emerald-200/80' 
                        : isOverdue 
                        ? 'bg-rose-50/30 border-rose-200 shadow-sm' 
                        : isPartiallyReturned
                        ? 'bg-sky-50/20 border-sky-200'
                        : 'bg-white border-orange-200/80 shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Top status bar */}
                      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-heading font-bold flex items-center gap-1 ${
                          isAllReturned ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          isOverdue ? 'bg-rose-100 text-rose-800 font-extrabold border border-rose-200 animate-pulse' : 
                          isPartiallyReturned ? 'bg-sky-100 text-sky-800 border border-sky-200' :
                          'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {isAllReturned ? '✓ ส่งคืนครบแล้ว' : 
                           isOverdue ? '⚠️ เกินกำหนดส่งคืน' : 
                           isPartiallyReturned ? `⏱ คืนแล้ว ${returnedRecords.length}/${group.records.length} ชนิด` :
                           '⏱ กำลังยืมใช้งาน'}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono font-semibold">
                          เอกสาร: #{displayId}
                        </span>
                      </div>

                      {/* Borrower Details */}
                      <div className="space-y-1 text-xs text-gray-700 font-sans mb-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-gray-400">ผู้ยืม:</span>
                          <span className="font-bold text-gray-900 text-sm">{group.borrowerName}</span>
                          <span className="text-gray-300">|</span>
                          <span className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                            {group.borrowerPosition}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-gray-500 pt-0.5">
                          <div>
                            <span className="text-gray-400">ติดต่อ: </span>
                            <a href={`tel:${group.borrowerTel}`} className="text-orange-600 font-semibold font-mono hover:underline">
                              {group.borrowerTel}
                            </a>
                          </div>
                          <div>
                            <span className="text-gray-400">ผู้รับรอง: </span>
                            <span className="text-gray-700 font-medium">{group.certifier}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-2 p-2 rounded-xl bg-orange-50/50 border border-orange-100/60 text-[11px]">
                          <div>
                            <span className="text-gray-400 block text-[10px]">วันที่เริ่มยืม:</span>
                            <span className="font-mono text-gray-800 font-bold">{group.borrowDate}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px]">กำหนดวันส่งคืน:</span>
                            <span className={`font-mono font-bold ${isOverdue ? 'text-rose-600' : 'text-orange-950'}`}>
                              {group.returnDate}
                            </span>
                          </div>
                        </div>

                        {group.note && (
                          <div className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100 italic">
                            <span className="font-bold not-italic text-gray-500">หมายเหตุ: </span>{group.note}
                          </div>
                        )}
                      </div>

                      {/* Borrowed Equipment Items List */}
                      <div className="mt-3 bg-white/80 border border-orange-200/70 rounded-xl p-3 space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-orange-950 border-b border-orange-100 pb-1.5">
                          <span className="flex items-center gap-1">
                            <Package className="w-3.5 h-3.5 text-orange-600" />
                            <span>รายการอุปกรณ์ที่ยืม ({group.records.length} ชนิด)</span>
                          </span>
                          <span className="text-[11px] font-mono bg-orange-100 text-orange-900 px-2 py-0.5 rounded-full font-bold">
                            รวม {totalItemsCount} ชิ้น
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-0.5">
                          {group.records.map((itemRecord) => {
                            const isItemReturned = !!itemRecord.returnedDate;
                            const eqDetail = equipment.find(e => e.id === itemRecord.itemId);

                            return (
                              <div
                                key={itemRecord.id}
                                className={`p-2 rounded-lg border flex items-center justify-between gap-2 text-xs transition-colors ${
                                  isItemReturned 
                                    ? 'bg-emerald-50/40 border-emerald-100 text-gray-600' 
                                    : 'bg-orange-50/20 border-orange-100 text-gray-900'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-gray-900 truncate">{itemRecord.itemName}</div>
                                  <div className="text-[10px] text-gray-400 font-mono">
                                    {eqDetail?.code ? `รหัส: ${eqDetail.code}` : ''}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="font-mono font-bold bg-orange-100 text-orange-900 px-2 py-0.5 rounded text-[11px]">
                                    {itemRecord.qty || 1} ชิ้น
                                  </span>

                                  {isItemReturned ? (
                                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded flex items-center gap-0.5">
                                      ✓ คืนแล้ว
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleReturnEquipment(itemRecord)}
                                      className="text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-2 py-1 rounded transition active:scale-95 flex items-center gap-1 shadow-2xs"
                                      title="รับคืนพัสดุชิ้นนี้"
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>รับคืน</span>
                                    </button>
                                  )}

                                  <button
                                    onClick={() => handleOpenEditBorrow(itemRecord)}
                                    className="p-1 text-gray-400 hover:text-orange-600 rounded hover:bg-orange-50 transition"
                                    title="แก้ไข"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteBorrow(itemRecord.id)}
                                    className="p-1 text-gray-400 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                                    title="ลบ"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Footer buttons */}
                    <div className="flex justify-between items-center gap-2 mt-4 pt-3 border-t border-orange-100/60 flex-wrap">
                      <button
                        onClick={() => setSelectedPdfRecord(repRecord)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-950 text-xs font-heading font-bold transition active:scale-95 shadow-2xs"
                        title="พิมพ์หรือดาวน์โหลดใบยืมพัสดุและใบส่งมอบ (PDF 2 หน้า)"
                      >
                        <FileText className="w-3.5 h-3.5 text-orange-600" />
                        <span>ใบยืม & ใบส่งมอบ PDF</span>
                      </button>

                      {unreturnedRecords.length > 0 && (
                        <button
                          onClick={() => handleReturnGroupEquipment(group.records)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-heading font-bold transition active:scale-95 shadow-md ml-auto"
                        >
                          <Check className="w-4 h-4" />
                          <span>รับคืนทั้งหมด ({unreturnedRecords.length} ชนิด)</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DISPENSE RECORDS */}
      {activeTab === 'dispense-records' && (
        <EquipmentDispense
          equipment={equipment}
          dispenses={dispenses}
          onSaveEquipment={onSaveEquipment}
          onSaveDispenses={onSaveDispenses || (() => {})}
          showToast={showToast}
          showConfirm={showConfirm}
          hideHeader={true}
          autoOpenNew={dispenseAutoOpen}
          preselectedItemId={dispensePreselectedItemId}
          onRefreshData={onRefreshData}
          onModalClosed={() => {
            setDispenseAutoOpen(false);
            setDispensePreselectedItemId(undefined);
          }}
        />
      )}

      {/* TAB 4: FILTER SEARCH & EXPORT */}
      {activeTab === 'search-export' && (
        <div className="space-y-6">
          <div className="bg-orange-50/20 border border-orange-100 p-4 rounded-xl space-y-3">
            <h4 className="font-heading font-bold text-orange-950 text-xs">กรองข้อมูลและค้นหาสำหรับส่งออกรายงาน</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหา"
                  className="w-full pl-9 pr-4 py-2.5 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 transition-all"
                />
              </div>

              <div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full p-2.5 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 font-heading transition-all"
                >
                  <option value="all">📁 ทุกหมวดหมู่ประเภท</option>
                  {uniqueTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full p-2.5 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 font-heading transition-all"
                >
                  <option value="all">⚡ ทุกสถานะสภาพ</option>
                  <option value="ปกติ">🟢 ปกติ</option>
                  <option value="ชำรุด">🟡 ชำรุด</option>
                  <option value="เสีย">🔴 เสีย</option>
                  <option value="จำหน่าย">⚫ จำหน่าย</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">
              พบข้อมูลที่ตรงกับตัวกรอง <span className="font-bold text-orange-600">{filteredEquipment.length}</span> รายการ
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="px-3.5 py-1.5 rounded-lg border border-orange-200 hover:bg-orange-50 text-orange-800 text-xs font-heading font-semibold flex items-center gap-1.5 transition cursor-pointer"
                id="btn-export-excel"
              >
                <FileDown className="w-4 h-4 text-orange-500" />
                <span>excel</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-orange-50 rounded-xl w-full max-w-full min-w-0 custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs min-w-[700px]">
              <thead>
                <tr className="bg-orange-50/30 border-b border-orange-100 text-orange-950 font-heading">
                  <th className="p-3">รหัสพัสดุ</th>
                  <th className="p-3">รายการ</th>
                  <th className="p-3">ประเภท</th>
                  <th className="p-3 text-center">สถานะ</th>
                  <th className="p-3">สถานที่เก็บ</th>
                  <th className="p-3 text-center">จำนวนทั้งหมด</th>
                  <th className="p-3 text-center">ถูกยืมอยู่</th>
                  <th className="p-3 text-center text-purple-900 bg-purple-50/40">เบิกจ่ายแล้ว</th>
                  <th className="p-3 text-center">คงเหลือพร้อมใช้งาน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-50 font-sans">
                {filteredEquipment.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-400">ไม่พบครุภัณฑ์ตามเงื่อนไขที่เลือกค้นหา</td>
                  </tr>
                ) : (
                  filteredEquipment.map(item => {
                    const { total, borrowed, dispensed, available } = getStockInfo(item);
                    return (
                      <tr key={item.id} className="hover:bg-orange-50/20 transition-colors">
                        <td className="p-3 font-mono font-medium text-orange-700">{item.code}</td>
                        <td className="p-3 font-bold text-gray-900">{item.name}</td>
                        <td className="p-3 text-gray-600">{item.type}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-heading ${
                            item.status === 'ปกติ' ? 'bg-emerald-100 text-emerald-800' :
                            item.status === 'ชำรุด' ? 'bg-amber-100 text-amber-800' :
                            item.status === 'เสีย' ? 'bg-rose-100 text-rose-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600">{item.location}</td>
                        <td className="p-3 text-center font-bold text-gray-700 font-mono">{total} ชิ้น</td>
                        <td className="p-3 text-center font-bold text-amber-600 font-mono">{borrowed > 0 ? `${borrowed} ชิ้น` : '-'}</td>
                        <td className="p-3 text-center font-bold text-purple-700 font-mono bg-purple-50/20">{dispensed > 0 ? `${dispensed} ชิ้น` : '-'}</td>
                        <td className="p-3 text-center font-bold text-emerald-700 font-mono">{available} ชิ้น</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODAL 1: ADD/EDIT EQUIPMENT INVENTORY --- */}
      

      {/* --- MODAL 2: ADD/EDIT BORROW TRANSACTION --- */}
      

      {/* PDF Borrow Slip Modal */}
      {selectedPdfRecord && (
        <BorrowSlipPdfModal
          record={selectedPdfRecord}
          allRecords={borrows}
          equipment={equipment}
          onClose={() => setSelectedPdfRecord(null)}
          showToast={showToast}
        />
      )}

      {/* Equipment Inventory & Borrowing PDF Modal */}
      {isPdfModalOpen && (
        <EquipmentPdfModal
          equipment={filteredEquipment}
          allEquipment={equipment}
          borrows={borrows}
          dispenses={dispenses}
          getStockInfo={getStockInfo}
          onClose={() => setIsPdfModalOpen(false)}
          showToast={showToast}
        />
      )}

        </>
      )}
    </div>
  );
}
