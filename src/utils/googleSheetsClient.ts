import { TaskItem, OfficialDoc, DispenseRecord, BorrowRecord, Equipment } from '../types';
import { getAccessToken } from './auth';
import { normalizeDateString } from './gasClient';
import { DEFAULT_SPREADSHEET_ID } from './gasClient';

export const updateDocsToSheet = async (docs: OfficialDoc[]) => {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Authentication required');
  }

  const spreadsheetId = DEFAULT_SPREADSHEET_ID;
  const sheetName = 'หนังสือราชการ';

  // Clear current data (keep header)
  const controller1 = new AbortController();
  const timeoutId1 = setTimeout(() => controller1.abort(), 6000);
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:P?valueInputOption=RAW`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller1.signal,
    });
  } finally {
    clearTimeout(timeoutId1);
  }

  // Prepare new data
  // Columns: ["ID", "DocNo", "Subject", "Date", "Agency", "DocType", "ReceiveNo", "ShelfNo", "Note", "PetitionStatus", "SurveyDate", "NoHelpReason", "HelpDetail", "FileUrl", "FileId", "FileName"]
  const values = docs.map(d => [
    d.id || '',
    d.docNo || '',
    d.subject || '',
    d.date || '',
    d.agency || '',
    d.docType || '',
    d.receiveNo || '',
    d.shelfNo || '',
    d.note || '',
    d.petitionStatus || '',
    d.surveyDate || '',
    d.noHelpReason || '',
    d.helpDetail || '',
    d.fileUrl || '',
    d.fileId || '',
    d.fileName || ''
  ]);

  // Update
  const controller2 = new AbortController();
  const timeoutId2 = setTimeout(() => controller2.abort(), 6000);
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:P?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values }),
      signal: controller2.signal,
    });
  } finally {
    clearTimeout(timeoutId2);
  }
};

export const fetchDocsFromSheet = async (): Promise<OfficialDoc[]> => {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Authentication required');
  }

  const spreadsheetId = DEFAULT_SPREADSHEET_ID;
  const sheetName = 'หนังสือราชการ';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  let response: Response;
  try {
    response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:P`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
  
  if (!response.ok) {
     throw new Error('Failed to fetch docs from sheets');
  }
  
  const data = await response.json();
  const values = data.values || [];
  
  return values.map((row: any[]) => ({
    id: row[0],
    docNo: row[1] || '',
    subject: row[2] || '',
    date: normalizeDateString(row[3]),
    agency: row[4] || '',
    docType: row[5] || 'หนังสือรับ',
    receiveNo: row[6] || undefined,
    shelfNo: row[7] || '',
    note: row[8] || '',
    petitionStatus: row[9] || undefined,
    surveyDate: row[10] ? normalizeDateString(row[10]) : undefined,
    noHelpReason: row[11] || undefined,
    helpDetail: row[12] || undefined,
    fileUrl: row[13] || undefined,
    fileId: row[14] || undefined,
    fileName: row[15] || undefined
  }));
};

export const updateTasksToSheet = async (tasks: TaskItem[]) => {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Authentication required');
  }

  const spreadsheetId = DEFAULT_SPREADSHEET_ID;
  const sheetName = 'ตารางงาน';

  // Clear current data (keep header)
  const controller1 = new AbortController();
  const timeoutId1 = setTimeout(() => controller1.abort(), 6000);
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A2:F?valueInputOption=RAW`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller1.signal,
    });
  } finally {
    clearTimeout(timeoutId1);
  }

  // Prepare new data
  const values = tasks.map(t => [t.id, t.date, t.task, t.status, t.type, t.originalDate || t.date]);

  // Update
  const controller2 = new AbortController();
  const timeoutId2 = setTimeout(() => controller2.abort(), 6000);
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A2:F?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values }),
      signal: controller2.signal,
    });
  } finally {
    clearTimeout(timeoutId2);
  }
};

export const fetchTasksFromSheet = async (): Promise<TaskItem[]> => {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Authentication required');
  }

  const spreadsheetId = DEFAULT_SPREADSHEET_ID;
  const sheetName = 'ตารางงาน';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  let response: Response;
  try {
    response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A2:F`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
  
  if (!response.ok) {
     throw new Error('Failed to fetch from sheets');
  }
  
  const data = await response.json();
  const values = data.values || [];
  
  return values.map((row: any[]) => ({
    id: row[0],
    date: normalizeDateString(row[1]),
    task: row[2],
    status: row[3],
    type: row[4],
    originalDate: normalizeDateString(row[5] || row[1])
  }));
};

export const updateDispensesToSheet = async (dispenses: DispenseRecord[]) => {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Authentication required');
  }

  const spreadsheetId = DEFAULT_SPREADSHEET_ID;
  const sheetName = 'การเบิกพัสดุอุปกรณ์';

  // Clear current data (keep header)
  const controller1 = new AbortController();
  const timeoutId1 = setTimeout(() => controller1.abort(), 6000);
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:X?valueInputOption=RAW`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller1.signal,
    });
  } finally {
    clearTimeout(timeoutId1);
  }

  // Prepare new data
  // Columns: ["ID", "GroupID", "DispenseDate", "ItemId", "ItemName", "ItemCode", "ItemType", "RecipientName", "RecipientPosition", "RecipientTel", "Department", "Purpose", "Certifier", "CertifierPosition", "Qty", "Unit", "Status", "Note", "HeadOfOfficeName", "HeadOfOfficePosition", "PaladName", "PaladPosition", "MayorName", "MayorPosition"]
  const values = dispenses.map(d => [
    d.id || '',
    d.groupId || '',
    d.dispenseDate || '',
    d.itemId || '',
    d.itemName || '',
    d.itemCode || '',
    d.itemType || '',
    d.recipientName || '',
    d.recipientPosition || '',
    d.recipientTel || '',
    d.department || '',
    d.purpose || '',
    d.certifier || '',
    d.certifierPosition || '',
    d.qty || 1,
    d.unit || 'ชิ้น',
    d.status || 'เบิกจ่ายแล้ว',
    d.note || '',
    d.headOfOfficeName || '',
    d.headOfOfficePosition || '',
    d.paladName || '',
    d.paladPosition || '',
    d.mayorName || '',
    d.mayorPosition || ''
  ]);

  // Update
  const controller2 = new AbortController();
  const timeoutId2 = setTimeout(() => controller2.abort(), 6000);
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:X?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values }),
      signal: controller2.signal,
    });
  } finally {
    clearTimeout(timeoutId2);
  }
};

export const fetchDispensesFromSheet = async (): Promise<DispenseRecord[]> => {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Authentication required');
  }

  const spreadsheetId = DEFAULT_SPREADSHEET_ID;
  const sheetName = 'การเบิกพัสดุอุปกรณ์';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  let response: Response;
  try {
    response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:X`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
  
  if (!response.ok) {
     throw new Error('Failed to fetch dispenses from sheets');
  }
  
  const data = await response.json();
  const values = data.values || [];
  
  return values.map((row: any[]) => ({
    id: row[0],
    groupId: row[1] || '',
    dispenseDate: normalizeDateString(row[2]),
    itemId: row[3] || '',
    itemName: row[4] || '',
    itemCode: row[5] || '',
    itemType: row[6] || '',
    recipientName: row[7] || '',
    recipientPosition: row[8] || '',
    recipientTel: row[9] || '',
    department: row[10] || '',
    purpose: row[11] || '',
    certifier: row[12] || '',
    certifierPosition: row[13] || '',
    qty: Number(row[14]) || 1,
    unit: row[15] || 'ชิ้น',
    status: (row[16] || 'เบิกจ่ายแล้ว') as any,
    note: row[17] || '',
    headOfOfficeName: row[18] || '',
    headOfOfficePosition: row[19] || '',
    paladName: row[20] || '',
    paladPosition: row[21] || '',
    mayorName: row[22] || '',
    mayorPosition: row[23] || ''
  }));
};

export const updateBorrowsToSheet = async (borrows: BorrowRecord[]) => {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Authentication required');
  }

  const spreadsheetId = DEFAULT_SPREADSHEET_ID;
  const sheetName = 'ยืมคืนอุปกรณ์';

  // Clear current data (keep header)
  const controller1 = new AbortController();
  const timeoutId1 = setTimeout(() => controller1.abort(), 6000);
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:W?valueInputOption=RAW`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller1.signal,
    });
  } finally {
    clearTimeout(timeoutId1);
  }

  // Prepare new data
  // Columns: ["ID", "GroupID", "BorrowDate", "ItemId", "ItemName", "Qty", "BorrowerName", "BorrowerPosition", "BorrowerTel", "Certifier", "CertifierPosition", "ReturnDate", "ReturnedDate", "Note", "HeadOfOfficeComment", "HeadOfOfficeName", "HeadOfOfficePosition", "MayorOrder", "MayorName", "MayorPosition", "HandoverOfficerName", "HandoverOfficerPosition", "ReceivingOfficerName", "ReceivingOfficerPosition"]
  const values = borrows.map(b => [
    b.id || '',
    b.groupId || '',
    b.borrowDate || '',
    b.itemId || '',
    b.itemName || '',
    b.qty || 1,
    b.borrowerName || '',
    b.borrowerPosition || '',
    b.borrowerTel || '',
    b.certifier || '',
    b.certifierPosition || '',
    b.returnDate || '',
    b.returnedDate || '',
    b.note || '',
    b.headOfOfficeComment || '',
    b.headOfOfficeName || '',
    b.headOfOfficePosition || '',
    b.mayorOrder || '',
    b.mayorName || '',
    b.mayorPosition || '',
    b.handoverOfficerName || '',
    b.handoverOfficerPosition || '',
    b.receivingOfficerName || '',
    b.receivingOfficerPosition || ''
  ]);

  // Update
  const controller2 = new AbortController();
  const timeoutId2 = setTimeout(() => controller2.abort(), 6000);
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:X?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values }),
      signal: controller2.signal,
    });
  } finally {
    clearTimeout(timeoutId2);
  }
};

export const fetchBorrowsFromSheet = async (): Promise<BorrowRecord[]> => {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Authentication required');
  }

  const spreadsheetId = DEFAULT_SPREADSHEET_ID;
  const sheetName = 'ยืมคืนอุปกรณ์';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  let response: Response;
  try {
    response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:X`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
  
  if (!response.ok) {
     throw new Error('Failed to fetch borrows from sheets');
  }
  
  const data = await response.json();
  const values = data.values || [];
  
  return values.map((row: any[]) => ({
    id: row[0],
    groupId: row[1] || '',
    borrowDate: normalizeDateString(row[2]),
    itemId: row[3] || '',
    itemName: row[4] || '',
    qty: Number(row[5]) || 1,
    borrowerName: row[6] || '',
    borrowerPosition: row[7] || '',
    borrowerTel: row[8] || '',
    certifier: row[9] || '',
    certifierPosition: row[10] || '',
    returnDate: normalizeDateString(row[11]),
    returnedDate: row[12] ? normalizeDateString(row[12]) : undefined,
    note: row[13] || '',
    headOfOfficeComment: row[14] || '',
    headOfOfficeName: row[15] || '',
    headOfOfficePosition: row[16] || '',
    mayorOrder: row[17] || '',
    mayorName: row[18] || '',
    mayorPosition: row[19] || '',
    handoverOfficerName: row[20] || '',
    handoverOfficerPosition: row[21] || '',
    receivingOfficerName: row[22] || '',
    receivingOfficerPosition: row[23] || ''
  }));
};

export const updateEquipmentToSheet = async (equipment: Equipment[]) => {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Authentication required');
  }

  const spreadsheetId = DEFAULT_SPREADSHEET_ID;
  const sheetName = 'คลังอุปกรณ์';

  // Clear current data (keep header)
  const controller1 = new AbortController();
  const timeoutId1 = setTimeout(() => controller1.abort(), 6000);
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:H?valueInputOption=RAW`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller1.signal,
    });
  } finally {
    clearTimeout(timeoutId1);
  }

  // Prepare new data
  const values = equipment.map(e => [
    e.id || '',
    e.name || '',
    e.code || '',
    e.type || '',
    e.status || 'ปกติ',
    e.location || '',
    e.note || '',
    Number(e.qty) || 0
  ]);

  // Update
  const controller2 = new AbortController();
  const timeoutId2 = setTimeout(() => controller2.abort(), 6000);
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:H?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values }),
      signal: controller2.signal,
    });
  } finally {
    clearTimeout(timeoutId2);
  }
};

export const fetchEquipmentFromSheet = async (): Promise<Equipment[]> => {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Authentication required');
  }

  const spreadsheetId = DEFAULT_SPREADSHEET_ID;
  const sheetName = 'คลังอุปกรณ์';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  let response: Response;
  try {
    response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:H`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
  
  if (!response.ok) {
     throw new Error('Failed to fetch equipment from sheets');
  }
  
  const data = await response.json();
  const values = data.values || [];
  
  return values.map((row: any[]) => ({
    id: row[0],
    name: row[1] || '',
    code: row[2] || '',
    type: row[3] || '',
    status: (row[4] || 'ปกติ') as 'ปกติ' | 'ชำรุด' | 'เสีย' | 'จำหน่าย',
    location: row[5] || '',
    note: row[6] || '',
    qty: Number(row[7]) || 0
  }));
};

