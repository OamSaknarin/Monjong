import { TaskItem, Equipment, BorrowRecord, DispenseRecord, OfficialDoc, ExpenseRecord, RelatedLink, Employee, User, LocationItem, CloudFile, Volunteer, VolunteerFinance } from '../types';

const GAS_URL_KEY = 'orange_office_gas_url';
const LOCAL_USERS_KEY = 'orange_office_local_users';
const LOCAL_DATA_KEY = 'orange_office_local_data';

export const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbw6xdKuka9zGSy6gIdk0uSZ9CmGUQBXUzQTZWQsShhB6mdTOk-4UPzC_KW1-KcPqjBGzg/exec';
export const DEFAULT_SPREADSHEET_ID = '1M42M6H3nTJ0Cvb7uL3Ku76Ub97PAKMKjxnDLyCA4kbw';

// ฟังก์ชันล้างค่าและฟอร์แมตวันที่ให้เป็น YYYY-MM-DD เสมอ
export const normalizeDateString = (val: any): string => {
  if (!val) return '';
  if (typeof val === 'string') {
    // รองรับ Date(YYYY,M,D) หรือ new Date(YYYY,M,D) จาก GViz
    const gvizMatch = val.match(/^(?:new\s+)?Date\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,.*)?\)/i);
    if (gvizMatch) {
      const year = gvizMatch[1];
      const month = String(parseInt(gvizMatch[2]) + 1).padStart(2, '0'); // GViz month is 0-indexed
      const day = String(parseInt(gvizMatch[3])).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    if (val.startsWith('/Date(')) {
      const timestamp = parseInt(val.replace('/Date(', '').replace(')/', ''));
      if (!isNaN(timestamp)) {
        const dateObj = new Date(timestamp);
        const year = dateObj.getFullYear();
        const month = ("0" + (dateObj.getMonth() + 1)).slice(-2);
        const day = ("0" + dateObj.getDate()).slice(-2);
        return `${year}-${month}-${day}`;
      }
    }
    // หากเป็นรูปแบบ ISO String ที่มี T และ Z (เช่น จาก Google Apps Script) ควรแปลงเป็น Date ก่อนเพื่อให้อิงตาม Local Timezone
    if (val.includes('T') && val.includes('Z')) {
      const dateObj = new Date(val);
      if (!isNaN(dateObj.getTime())) {
        const year = dateObj.getFullYear();
        const month = ("0" + (dateObj.getMonth() + 1)).slice(-2);
        const day = ("0" + dateObj.getDate()).slice(-2);
        return `${year}-${month}-${day}`;
      }
    }

    // ดึงค่า YYYY-MM-DD จาก string เช่น "2026-06-26" 
    const match = val.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      const day = match[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    // พยายาม parse เป็นออบเจกต์ Date
    try {
      const dateObj = new Date(val);
      if (!isNaN(dateObj.getTime())) {
        const year = dateObj.getFullYear();
        const month = ("0" + (dateObj.getMonth() + 1)).slice(-2);
        const day = ("0" + dateObj.getDate()).slice(-2);
        return `${year}-${month}-${day}`;
      }
    } catch {
      // ignore
    }
  }
  return String(val);
};

// ดึงและตั้งค่า URL สำหรับ Google Apps Script
export const getGasUrl = (): string => {
  const localUrl = localStorage.getItem(GAS_URL_KEY);
  if (localUrl) {
    const trimmed = localUrl.trim();
    // ถ้าผู้ใช้เคยเซฟ URL ค่าเริ่มต้นรุ่นเก่าไว้ ให้ปรับเปลี่ยนมาใช้ URL ค่าเริ่มต้นรุ่นใหม่โดยอัตโนมัติ
    if (
      trimmed === 'https://script.google.com/macros/s/AKfycbwnb-cWno6Umu5LHAv0UUmKph4OwpHKudhAl7aFkQKS4Hzqa9H_ZUTx5dDS3k7DWcYWNg/exec' ||
      trimmed === 'https://script.google.com/macros/s/AKfycbyEekErNVgdGyl44XJ2QoGEMMkmDW8eKnX5dXUXsl83fUgFq5lFp51qkJ6ZfP4G-LdyCQ/exec' ||
      trimmed === 'https://script.google.com/macros/s/AKfycbz-N8D9chy1yZTxehibR0yAIbc6Dbizf_DmfHdq7pT4yIobe6PGX_BAn6igN6IMrcRRwQ/exec' ||
      trimmed === 'https://script.google.com/macros/s/AKfycbzhSXl3SmGRFamek7QycwZwFZOiutQPOlgiGaOs_OlOcmmcYcUa3I6N--aSYzf1TD2JBw/exec' ||
      trimmed === 'https://script.google.com/macros/s/AKfycbzTtfmjczO0hufiGxVcacxBpfIpZV2OVt7WAwU__OrJcVfvcUxPpeuTzVHyArZsHxnyMA/exec' ||
      trimmed === 'https://script.google.com/macros/s/AKfycbzbo78J3WjbNHNIdxWkAvm6J2eR-5OSbnhaC7V06SdqfcBgHOtO9Mc0ZAt38HrsdZWBAg/exec'
    ) {
      localStorage.setItem(GAS_URL_KEY, DEFAULT_GAS_URL);
      return DEFAULT_GAS_URL;
    }
    return trimmed;
  }
  
  // ใช้รูปแบบตรงตัวเพื่อให้ Vite ทำการแทนที่ตัวแปรสภาพแวดล้อมตอน Build บนเซิร์ฟเวอร์ได้ถูกต้อง
  const envUrl = import.meta.env.VITE_GAS_URL;
  if (envUrl) return envUrl.trim();
  
  return DEFAULT_GAS_URL;
};

// ตรวจสอบว่าผู้ใช้ตั้งค่า URL Google Sheets ส่วนตัวไว้แล้วหรือยัง
export const isCustomGasUrlSet = (): boolean => {
  const localUrl = localStorage.getItem(GAS_URL_KEY);
  if (localUrl) return true;
  
  const envUrl = import.meta.env.VITE_GAS_URL;
  if (envUrl) return true;
  
  return false;
};

// ตรวจสอบว่าเป็น URL ของ Google Sheets หรือไม่
export const isGoogleSheetsUrl = (url: string): boolean => {
  return /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i.test(url);
};

// ดึง ID ของ Spreadsheet จาก URL
export const extractSpreadsheetId = (url: string): string | null => {
  const match = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i);
  return match ? match[1] : null;
};

// ฟังก์ชัน fetch พร้อมตัวควบคุมการหมดเวลากันค้าง (Timeout Protection)
export const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 60000): Promise<Response> => {
  let finalUrl = url;
  let finalOptions = { ...options };

  // If calling Google Apps Script Web App (not Google Sheets direct API), proxy it to bypass CORS / iframe sandbox limitations
  if (url.includes('script.google.com/macros/s/') && options.method === 'POST' && options.body) {
    try {
      const parsedBody = JSON.parse(options.body as string);
      if (parsedBody && typeof parsedBody === 'object' && 'action' in parsedBody) {
        finalUrl = '/api/gas';
        finalOptions.headers = {
          ...options.headers,
          'Content-Type': 'application/json;charset=utf-8'
        };
        finalOptions.body = JSON.stringify({
          url: url,
          action: parsedBody.action,
          payload: parsedBody.payload || {}
        });
      }
    } catch (e) {
      console.warn('Could not parse body for GAS proxy routing:', e);
    }
  }

  const controller = new AbortController();
  const timeoutError = new Error(`การเชื่อมต่อหมดเวลา (Timeout ${Math.round(timeoutMs / 1000)} วินาที)`);
  const id = setTimeout(() => {
    try {
      controller.abort(timeoutError);
    } catch {
      controller.abort();
    }
  }, timeoutMs);

  try {
    const response = await fetch(finalUrl, {
      ...finalOptions,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error?.name === 'AbortError' || error?.message?.toLowerCase().includes('aborted') || controller.signal.aborted) {
      throw new Error(`การเชื่อมต่อหมดเวลา (${Math.round(timeoutMs / 1000)} วินาที): เซิร์ฟเวอร์ประมวลผลนานเกินไป`);
    }
    throw error;
  }
};

// ฟังก์ชันช่วยวิเคราะห์ response และแปลงเป็น JSON หากไม่ใช่ JSON หรือหากได้ HTML แปะกลับคืนมา จะโยน error สื่อสารบอกสาเหตุและวิธีแก้ไขปัญหาได้ถูกต้อง
export const handleResponseJson = async (response: Response): Promise<any> => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (err: any) {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      try {
        const potentialJson = text.substring(jsonStart, jsonEnd + 1);
        return JSON.parse(potentialJson);
      } catch (innerErr) {
        // Continue to HTML analysis
      }
    }
    if (text.includes('Sign in') || text.includes('Google Accounts') || text.includes('ServiceLogin') || text.includes('accounts.google.com')) {
      throw new Error(
        'Google Apps Script ส่งกลับเป็นหน้าล็อกอินหรือแจ้งเตือนความปลอดภัย!\n\n' +
        '💡 สาเหตุที่เป็นไปได้หลักและวิธีแก้ไข:\n' +
        '1. สิทธิ์การเข้าถึงยังไม่ถูกเปิดเผย: กรุณาตั้งสิทธิ์เข้าใช้งานให้ "ทุกคน (Anyone)" เข้าใช้งานได้ในการเผยแพร่\n' +
        '   → วิธีแก้ไข: ใน Apps Script เลือกปุ่ม "การทำให้ใช้งานได้ (Deploy)" > "จัดการการทำให้ใช้งานได้ (Manage deployments)" จากนั้นแก้ไขฟิลด์ "ผู้ที่มีสิทธิ์เข้าถึง (Who has access)" ให้เลือก "ทุกคน (Anyone)" และเลือก "เรียกใช้ในฐานะ (Execute as)" เป็น "ฉัน (Me)" เสมอ\n' +
        '2. คุณป้อนลิงก์ผิด: ตรวจสอบให้แน่ใจว่าได้ใช้ลิงก์ที่ลงท้ายด้วย "/exec" (Web App URL) ไม่ใช่ลิงก์สำหรับแก้ไขโค้ดของสคริปต์'
      );
    }
    throw new Error('ไม่สามารถแปลงผลลัพธ์เป็น JSON ได้เนื่องจากสคริปต์มีปัญหา: ' + err.message);
  }
};

export const setGasUrl = (url: string): void => {
  if (url) {
    localStorage.setItem(GAS_URL_KEY, url.trim());
  } else {
    localStorage.removeItem(GAS_URL_KEY);
  }
};

// ดึงบัญชีผู้ใช้ปัจจุบันที่ล็อกอิน
export const getLoggedUser = (): User | null => {
  const userStr = localStorage.getItem('orange_office_current_user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
};

export const setLoggedUser = (user: User | null): void => {
  if (user) {
    localStorage.setItem('orange_office_current_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('orange_office_current_user');
  }
};

// ข้อมูลเริ่มต้นเป็นอาเรย์ว่างเปล่าเพื่อให้แสดงเฉพาะข้อมูลจริงจาก Google Sheets เท่านั้น
const initialDefaultData = {
  tasks: [] as TaskItem[],
  equipment: [] as Equipment[],
  borrows: [] as BorrowRecord[],
  dispenses: [] as DispenseRecord[],
  docs: [] as OfficialDoc[],
  expenses: [] as ExpenseRecord[],
  links: [] as RelatedLink[],
  employees: [] as Employee[],
  locations: [] as LocationItem[],
  cloudFiles: [] as CloudFile[],
  volunteers: [] as Volunteer[],
  volunteerFinances: [] as VolunteerFinance[]
};

// ฟังก์ชันล้างและฟอร์แมตข้อมูลให้อ่านง่าย ป้องกันเลขอีมี่ เบอร์โทร และบ้านเลขที่เพี้ยน
export const normalizeCollections = (data: any): typeof initialDefaultData => {
  if (!data) return data;
  
  const result = { ...data };

  // ล้างค่าข้อมูลที่ไม่มี ID หรือมี ID เป็นคำว่า "ID" (จากแถวหัวตาราง) ป้องกันเกิด key ซ้ำใน React
  const cleanCollection = <T extends { id?: any }>(arr: T[] | any): T[] => {
    if (!Array.isArray(arr)) return [];
    return arr.filter((item: any) => {
      if (!item || typeof item !== 'object') return false;
      const rawId = item.id;
      if (rawId === undefined || rawId === null) return false;
      const idStr = String(rawId).trim();
      if (idStr === '' || idStr.toUpperCase() === 'ID' || idStr.toLowerCase() === 'undefined' || idStr.toLowerCase() === 'null') {
        return false;
      }
      return true;
    });
  };

  if (result.tasks) result.tasks = cleanCollection(result.tasks);
  if (result.equipment) result.equipment = cleanCollection(result.equipment);
  if (result.borrows) result.borrows = cleanCollection(result.borrows);
  if (result.dispenses) result.dispenses = cleanCollection(result.dispenses);
  if (result.docs) result.docs = cleanCollection(result.docs);
  if (result.expenses) result.expenses = cleanCollection(result.expenses);
  if (result.links) result.links = cleanCollection(result.links);
  if (result.employees) result.employees = cleanCollection(result.employees);
  if (result.locations) result.locations = cleanCollection(result.locations);
  if (result.cloudFiles) result.cloudFiles = cleanCollection(result.cloudFiles);
  if (result.volunteers) result.volunteers = cleanCollection(result.volunteers);
  if (result.volunteerFinances) result.volunteerFinances = cleanCollection(result.volunteerFinances);

  // 1. จัดการข้อมูลพนักงาน (employees)
  if (Array.isArray(result.employees)) {
    result.employees = result.employees.map((emp: any) => {
      // จัดการเบอร์โทรพนักงาน
      let tel = emp.tel ? String(emp.tel).trim() : '';
      if (/^\d+$/.test(tel)) {
        if (tel.length === 9 || tel.length === 8) {
          tel = '0' + tel;
        }
      }
      
      // จัดการบ้านเลขที่
      let houseNo = emp.houseNo ? String(emp.houseNo).trim() : '';
      
      // หากพบว่าถูกแปลงเป็นรูปแบบวันที่ YYYY-MM-DD (เช่น "2026-03-12" หรือ "2026/03/12")
      const dateMatch = houseNo.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (dateMatch) {
        const yearVal = parseInt(dateMatch[1]);
        if (yearVal >= 2000 && yearVal <= 2600) {
          const day = parseInt(dateMatch[3]);
          const month = parseInt(dateMatch[2]);
          houseNo = `${day}/${month}`;
        }
      } else {
        // เช็ครูปแบบ GViz Date เช่น "Date(2026,2,12)"
        const gvizMatch = houseNo.match(/^(?:new\s+)?Date\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,.*)?\)/i);
        if (gvizMatch) {
          const day = parseInt(gvizMatch[3]);
          const month = parseInt(gvizMatch[2]) + 1; // 0-indexed month
          houseNo = `${day}/${month}`;
        }
      }
      
      return {
        ...emp,
        tel,
        houseNo
      };
    });
  }

  // 2. จัดการข้อมูลยืมคืนอุปกรณ์ (borrows -> borrowerTel)
  if (Array.isArray(result.borrows)) {
    result.borrows = result.borrows.map((b: any) => {
      let borrowerTel = b.borrowerTel ? String(b.borrowerTel).trim() : '';
      if (/^\d+$/.test(borrowerTel)) {
        if (borrowerTel.length === 9 || borrowerTel.length === 8) {
          borrowerTel = '0' + borrowerTel;
        }
      }
      return {
        ...b,
        borrowerTel
      };
    });
  }

  // 3. จัดการข้อมูลเบิกอุปกรณ์ (dispenses -> recipientTel)
  if (Array.isArray(result.dispenses)) {
    result.dispenses = result.dispenses.map((d: any) => {
      let recipientTel = d.recipientTel ? String(d.recipientTel).trim() : '';
      if (/^\d+$/.test(recipientTel)) {
        if (recipientTel.length === 9 || recipientTel.length === 8) {
          recipientTel = '0' + recipientTel;
        }
      }
      return {
        ...d,
        recipientTel,
        dispenseDate: normalizeDateString(d.dispenseDate)
      };
    });
  }

  return result;
};

// ดึงข้อมูลแคชสำรองในเบราว์เซอร์
export const getCachedData = (): typeof initialDefaultData => {
  const stored = localStorage.getItem(LOCAL_DATA_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // ตรวจสอบและล้างข้อมูลจำลองเก่าในแคชของบราวเซอร์โดยอัตโนมัติ
      const hasMockData = (parsed.tasks && parsed.tasks.some((t: any) => t.id === 'task-1')) || 
                          (parsed.equipment && parsed.equipment.some((e: any) => e.id === 'eq-1')) ||
                          (parsed.employees && parsed.employees.some((emp: any) => emp.id === 'emp-1'));
      if (hasMockData) {
        localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(initialDefaultData));
        return initialDefaultData;
      }
      return normalizeCollections({ ...initialDefaultData, ...parsed });
    } catch {
      return initialDefaultData;
    }
  } else {
    localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(initialDefaultData));
    return initialDefaultData;
  }
};

const clientMapHeaderToKey = (header: string): string => {
  const mapping: Record<string, string> = {
    "ID": "id",
    "Date": "date",
    "Task": "task",
    "Status": "status",
    "Type": "type",
    "Name": "name",
    "Code": "code",
    "Location": "location",
    "Note": "note",
    "Qty": "qty",
    "BorrowDate": "borrowDate",
    "ItemId": "itemId",
    "ItemName": "itemName",
    "BorrowerName": "borrowerName",
    "BorrowerPosition": "borrowerPosition",
    "BorrowerTel": "borrowerTel",
    "Certifier": "certifier",
    "CertifierPosition": "certifierPosition",
    "ReturnDate": "returnDate",
    "ReturnedDate": "returnedDate",
    "DispenseDate": "dispenseDate",
    "GroupID": "groupId",
    "GroupId": "groupId",
    "ItemCode": "itemCode",
    "ItemType": "itemType",
    "RecipientName": "recipientName",
    "RecipientPosition": "recipientPosition",
    "RecipientTel": "recipientTel",
    "Department": "department",
    "Unit": "unit",
    "HeadOfOfficeComment": "headOfOfficeComment",
    "HeadOfOfficeName": "headOfOfficeName",
    "HeadOfOfficePosition": "headOfOfficePosition",
    "MayorOrder": "mayorOrder",
    "MayorName": "mayorName",
    "MayorPosition": "mayorPosition",
    "HandoverOfficerName": "handoverOfficerName",
    "HandoverOfficerPosition": "handoverOfficerPosition",
    "ReceivingOfficerName": "receivingOfficerName",
    "ReceivingOfficerPosition": "receivingOfficerPosition",
    "PaladName": "paladName",
    "PaladPosition": "paladPosition",
    "DocNo": "docNo",
    "Subject": "subject",
    "Agency": "agency",
    "DocType": "docType",
    "ReceiveNo": "receiveNo",
    "ShelfNo": "shelfNo",
    "PetitionStatus": "petitionStatus",
    "SurveyDate": "surveyDate",
    "NoHelpReason": "noHelpReason",
    "HelpDetail": "helpDetail",
    "Item": "item",
    "Amount": "amount",
    "Category": "planName",
    "BudgetPool": "budget",
    "Project": "project",
    "Purpose": "purpose",
    "PlannedBudget": "plannedBudget",
    "Details": "details",
    "URL": "url",
    "Position": "position",
    "Nickname": "nickname",
    "ชื่อเล่น": "nickname",
    "BirthDate": "birthDate",
    "Birthdate": "birthDate",
    "วันเกิด": "birthDate",
    "วันเดือนปีเกิด": "birthDate",
    "Age": "age",
    "HouseNo": "houseNo",
    "Subdistrict": "subdistrict",
    "District": "district",
    "Province": "province",
    "Zipcode": "zipcode",
    "Tel": "tel",
    "PhotoUrl": "photoUrl",
    "History": "history",
    "Lat": "lat",
    "Long": "lng",
    "FileName": "fileName",
    "FileType": "fileType",
    "FileSize": "fileSize",
    "FileUrl": "fileUrl",
    "FileID": "fileId",
    "FileId": "fileId",
    "UploadDate": "uploadDate",
    "ExpiryDate": "expiryDate",
    "DataUrl": "dataUrl",
    "Uploader": "uploader",
    "IdCard": "idCard",
    "BloodGroup": "bloodGroup",
    "Address": "address",
    "VolunteerId": "volunteerId",
    "VolunteerName": "volunteerName"
  };
  return mapping[header] || header.toLowerCase();
};

const parseGvizResponse = (responseText: string, headers: string[]): any[] => {
  try {
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) return [];
    
    const jsonStr = responseText.substring(jsonStart, jsonEnd + 1);
    
    const data = JSON.parse(jsonStr);
    
    if (data.status !== 'ok' || !data.table || !data.table.rows) {
      return [];
    }
    
    const rows = data.table.rows;
    const resultList: any[] = [];
    
    rows.forEach((row: any) => {
      if (!row || !row.c) return;
      const item: any = {};
      
      row.c.forEach((cell: any, index: number) => {
        const tableColLabel = data.table.cols && data.table.cols[index] && data.table.cols[index].label;
        const header = (tableColLabel && tableColLabel.trim() !== '') ? tableColLabel.trim() : (headers[index] || '');
        if (!header) return;
        
        const rawVal = cell ? cell.v : null;
        let val = rawVal;
        
        const key = clientMapHeaderToKey(header);
        
        if (header === "Age" || header === "Qty" || header === "Amount" || header === "PlannedBudget" || header === "Lat" || header === "Long" || header === "FileSize") {
          val = Number(val) || 0;
        } else if (header === "History") {
          try {
            val = typeof val === 'string' ? JSON.parse(val) : (val || []);
          } catch {
            val = [];
          }
        } else if (key.toLowerCase().includes('date') || header.toLowerCase().includes('date')) {
          val = normalizeDateString(val);
        } else if (typeof val === 'string' && val.startsWith('/Date(')) {
          val = normalizeDateString(val);
        } else if (typeof val === 'number') {
          // หาก GViz ตีความเป็นตัวเลข (เช่น พิมพ์ 12345 ในช่อง Task) ให้แปลงเป็น string เสมอเพื่อกัน error
          val = cell.f ? String(cell.f) : String(val);
        }
        
        item[key] = val !== null ? val : '';
      });
      
      if (item.id && String(item.id).trim().toUpperCase() !== 'ID') {
        resultList.push(item);
      }
    });
    
    return resultList;
  } catch (e) {
    console.error('Error parsing gviz response:', e);
    return [];
  }
};

const fetchDirectFromSheets = async (spreadsheetId: string): Promise<typeof initialDefaultData> => {
  const sheetsInfo = {
    tasks: { name: "ตารางงาน", headers: ["ID", "Date", "Task", "Status", "Type", "OriginalDate"] },
    equipment: { name: "คลังอุปกรณ์", headers: ["ID", "Name", "Code", "Type", "Status", "Location", "Note", "Qty"] },
    borrows: { name: "ยืมคืนอุปกรณ์", headers: ["ID", "GroupID", "BorrowDate", "ItemId", "ItemName", "Qty", "BorrowerName", "BorrowerPosition", "BorrowerTel", "Certifier", "CertifierPosition", "ReturnDate", "ReturnedDate", "Note", "HeadOfOfficeComment", "HeadOfOfficeName", "HeadOfOfficePosition", "MayorOrder", "MayorName", "MayorPosition", "HandoverOfficerName", "HandoverOfficerPosition", "ReceivingOfficerName", "ReceivingOfficerPosition"] },
    dispenses: { name: "การเบิกพัสดุอุปกรณ์", headers: ["ID", "GroupID", "DispenseDate", "ItemId", "ItemName", "ItemCode", "ItemType", "RecipientName", "RecipientPosition", "RecipientTel", "Department", "Purpose", "Certifier", "CertifierPosition", "Qty", "Unit", "Status", "Note", "HeadOfOfficeName", "HeadOfOfficePosition", "PaladName", "PaladPosition", "MayorName", "MayorPosition"] },
    docs: { name: "หนังสือราชการ", headers: ["ID", "DocNo", "Subject", "Date", "Agency", "DocType", "ReceiveNo", "ShelfNo", "Note", "PetitionStatus", "SurveyDate", "NoHelpReason", "HelpDetail", "FileUrl", "FileId", "FileName"] },
    expenses: { name: "ค่าใช้จ่าย", headers: ["ID", "Date", "Item", "Amount", "Category", "BudgetPool", "Project", "Purpose", "Type", "PlannedBudget", "Details", "Note"] },
    links: { name: "เว็บไซต์เกี่ยวข้อง", headers: ["ID", "Name", "Details", "URL"] },
    employees: { name: "ข้อมูลพนักงาน", headers: ["ID", "Name", "Nickname", "Position", "BirthDate", "Age", "HouseNo", "Subdistrict", "District", "Province", "Zipcode", "Tel", "PhotoUrl", "History"] },
    locations: { name: "สถานที่ตำบลม่อนจอง", headers: ["ID", "Name", "Details", "Lat", "Long", "Type"] },
    cloudFiles: { name: "คลาวด์ไฟล์", headers: ["ID", "FileName", "FileType", "FileSize", "UploadDate", "ExpiryDate", "DataUrl", "Uploader"] },
    volunteers: { name: "ฐานข้อมูลอปพร", headers: ["ID", "Code", "Name", "IdCard", "BirthDate", "Age", "BloodGroup", "Address", "Tel", "Position", "Status", "PhotoUrl"] },
    volunteerFinances: { name: "การเงินอปพร", headers: ["ID", "VolunteerId", "VolunteerName", "Date", "Amount", "Type", "Note"] }
  };

  const results: any = {};

  const fetchPromises = Object.entries(sheetsInfo).map(async ([key, sheetInfo]) => {
    try {
      const targetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetInfo.name)}`;
      const res = await fetchWithTimeout(targetUrl, {}, 6000);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const text = await res.text();
      results[key] = parseGvizResponse(text, sheetInfo.headers);
    } catch (e) {
      console.warn(`Error fetching direct sheet ${sheetInfo.name}:`, e);
      results[key] = [];
    }
  });

  await Promise.all(fetchPromises);
  return results as typeof initialDefaultData;
};

// ฟังก์ชันผสานข้อมูลจาก Server (GAS / Sheets) เข้ากับแคชในเครื่องอย่างปลอดภัย
// ป้องกันข้อมูลในเครื่องที่ผู้ใช้เพิ่งบันทึกไม่ให้ถูกลบทิ้งเมื่อ Server ตอบกลับมาเป็น array ว่าง หรือข้อมูลยังไม่อัปเดต
export const mergeRemoteWithLocal = (
  remoteData: Partial<typeof initialDefaultData>,
  localData: typeof initialDefaultData
): typeof initialDefaultData => {
  const result: any = { ...localData };
  const keys: (keyof typeof initialDefaultData)[] = [
    'tasks', 'equipment', 'borrows', 'dispenses', 'docs',
    'expenses', 'links', 'employees', 'locations', 'cloudFiles',
    'volunteers', 'volunteerFinances'
  ];

  for (const k of keys) {
    const remoteArr = (remoteData as any)[k];
    const localArr = (localData as any)[k] || [];

    if (Array.isArray(remoteArr) && remoteArr.length > 0) {
      const localMap = new Map(localArr.map((item: any) => [String(item.id || item.ID || ''), item]));
      const remoteIds = new Set(remoteArr.map((item: any) => String(item.id || item.ID || '')));
      
      // ผสานข้อมูลแต่ละรายการ: หากในเครื่องมีการแก้ไขรายการนั้น ให้คงค่าฟิลด์ที่แก้ไขในเครื่องไว้เสมอ
      const mergedRemote = remoteArr.map((remoteItem: any) => {
        const id = String(remoteItem.id || remoteItem.ID || '');
        const localItem = localMap.get(id);
        if (localItem) {
          return Object.assign({}, remoteItem, localItem);
        }
        return remoteItem;
      });

      // เก็บไอเทมในเครื่องที่ยังไม่มีใน Server (เพิ่งบันทึกใหม่ หรือยังไม่ได้ซิงก์)
      const localOnly = localArr.filter((item: any) => {
        const id = String(item.id || item.ID || '');
        return id && !remoteIds.has(id);
      });
      result[k] = [...mergedRemote, ...localOnly];
    } else {
      // หากฝั่ง Server ยังไม่มีข้อมูลในตารางนี้ ให้รักษาข้อมูลในเครื่องเดิมไว้เสมอ ห้ามล้างทิ้ง!
      result[k] = localArr;
    }
  }

  return normalizeCollections(result);
};

// ดึงข้อมูลทั้งหมด
export const fetchAllData = async (): Promise<typeof initialDefaultData> => {
  const gasUrl = getGasUrl();
  
  if (gasUrl) {
    // กรณีเป็น URL ลิงก์ Google Sheets โดยตรง ให้ดึงแบบ Direct อัตโนมัติทันที!
    if (isGoogleSheetsUrl(gasUrl)) {
      const spreadsheetId = extractSpreadsheetId(gasUrl);
      if (spreadsheetId) {
        try {
          const directData = await fetchDirectFromSheets(spreadsheetId);
          const cached = getCachedData();
          const mergedData = mergeRemoteWithLocal(directData, cached);
          localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(mergedData));
          return mergedData;
        } catch (err) {
          console.error('Failed to fetch directly from Google Sheet:', err);
          throw err;
        }
      }
    }

    // กรณีเป็น URL Google Apps Script Web App
    try {
      const response = await fetchWithTimeout(gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'fetchData',
          payload: {}
        }),
      }, 90000);
      
      if (!response.ok) {
        throw new Error(`HTTP Status ${response.status}`);
      }
      
      const resData = await handleResponseJson(response);
      if (resData.success && resData.data) {
        // สนับสนุนสองแบบ (คีย์ภาษาไทยจากระบบเดิม และ คีย์ภาษาอังกฤษจากระบบใหม่)
        const rawData = resData.data;
        const normalizedData = {
          tasks: (rawData.tasks || rawData['ตารางงาน'] || []).map((t: any) => ({ ...t, date: normalizeDateString(t.date), originalDate: normalizeDateString(t.originalDate || t.date) })),
          equipment: rawData.equipment || rawData['คลังอุปกรณ์'] || [],
          borrows: (rawData.borrows || rawData['ยืมคืนอุปกรณ์'] || []).map((b: any) => ({
            ...b,
            borrowDate: normalizeDateString(b.borrowDate),
            returnDate: normalizeDateString(b.returnDate),
            returnedDate: normalizeDateString(b.returnedDate)
          })),
          dispenses: (rawData.dispenses || rawData['การเบิกพัสดุอุปกรณ์'] || rawData['เบิกอุปกรณ์'] || []).map((d: any) => ({
            ...d,
            dispenseDate: normalizeDateString(d.dispenseDate)
          })),
          docs: (rawData.docs || rawData['หนังสือราชการ'] || []).map((d: any) => ({ ...d, date: normalizeDateString(d.date) })),
          expenses: (rawData.expenses || rawData['ค่าใช้จ่าย'] || []).map((e: any) => ({ ...e, date: normalizeDateString(e.date) })),
          links: rawData.links || rawData['เว็บไซต์เกี่ยวข้อง'] || [],
          employees: rawData.employees || rawData['ข้อมูลพนักงาน'] || [],
          locations: rawData.locations || rawData['สถานที่ตำบลม่อนจอง'] || [],
          cloudFiles: rawData.cloudFiles || rawData['คลาวด์ไฟล์'] || [],
          volunteers: rawData.volunteers || rawData['ฐานข้อมูลอปพร'] || [],
          volunteerFinances: rawData.volunteerFinances || rawData['การเงินอปพร'] || []
        };
        
        // ตรวจสอบว่าถ้าข้อมูลว่างเปล่า และผู้ใช้ระบุ URL Google Sheet โดยตรง ให้ลองดึงตรงจาก Google Sheet
        const hasTasks = normalizedData.tasks && normalizedData.tasks.length > 0;
        if (!hasTasks && isGoogleSheetsUrl(gasUrl)) {
          const spreadsheetId = extractSpreadsheetId(gasUrl);
          if (spreadsheetId) {
            try {
              console.log('Merging direct Google Sheet data...');
              const directData = await fetchDirectFromSheets(spreadsheetId);
              if (directData.tasks && directData.tasks.length > 0) {
                normalizedData.tasks = directData.tasks;
              }
              if (directData.equipment && directData.equipment.length > 0 && normalizedData.equipment.length === 0) {
                normalizedData.equipment = directData.equipment;
              }
              if (directData.borrows && directData.borrows.length > 0 && normalizedData.borrows.length === 0) {
                normalizedData.borrows = directData.borrows;
              }
              if (directData.dispenses && directData.dispenses.length > 0 && (!normalizedData.dispenses || normalizedData.dispenses.length === 0)) {
                normalizedData.dispenses = directData.dispenses;
              }
              if (directData.docs && directData.docs.length > 0 && normalizedData.docs.length === 0) {
                normalizedData.docs = directData.docs;
              }
              if (directData.expenses && directData.expenses.length > 0 && normalizedData.expenses.length === 0) {
                normalizedData.expenses = directData.expenses;
              }
              if (directData.links && directData.links.length > 0 && normalizedData.links.length === 0) {
                normalizedData.links = directData.links;
              }
              if (directData.employees && directData.employees.length > 0 && normalizedData.employees.length === 0) {
                normalizedData.employees = directData.employees;
              }
              if (directData.locations && directData.locations.length > 0 && normalizedData.locations.length === 0) {
                normalizedData.locations = directData.locations;
              }
              if (directData.cloudFiles && directData.cloudFiles.length > 0 && normalizedData.cloudFiles.length === 0) {
                normalizedData.cloudFiles = directData.cloudFiles;
              }
              if (directData.volunteers && directData.volunteers.length > 0 && normalizedData.volunteers.length === 0) {
                normalizedData.volunteers = directData.volunteers;
              }
              if (directData.volunteerFinances && directData.volunteerFinances.length > 0 && normalizedData.volunteerFinances.length === 0) {
                normalizedData.volunteerFinances = directData.volunteerFinances;
              }
            } catch (fallbackErr) {
              console.error('Failed secondary direct Sheets fetch merge:', fallbackErr);
            }
          }
        }

        // อัปเดตข้อมูล LocalStorage เสมอเพื่อเป็นแคชสำรอง โดยผสานกับข้อมูลเดิมในเครื่องอย่างปลอดภัย
        const cached = getCachedData();
        const mergedData = mergeRemoteWithLocal(normalizedData, cached);
        localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(mergedData));
        return mergedData;
      } else {
        throw new Error(resData?.error || 'เซิร์ฟเวอร์ยังไม่ได้ส่งข้อมูลกลับมา');
      }
    } catch (err: any) {
      console.warn('Failed to fetch from GAS Web App, attempting direct Google Sheet fallback:', err);
      // พยายามดึงข้อมูลตรงจาก Google Sheet อัตโนมัติด้วย DEFAULT_SPREADSHEET_ID หรือ ID จาก URL
      const spreadsheetId = isGoogleSheetsUrl(gasUrl) ? extractSpreadsheetId(gasUrl) : DEFAULT_SPREADSHEET_ID;
      if (spreadsheetId) {
        try {
          const directData = await fetchDirectFromSheets(spreadsheetId);
          const hasData = Object.values(directData).some(arr => arr && arr.length > 0);
          if (hasData) {
            const cached = getCachedData();
            const mergedData = mergeRemoteWithLocal(directData, cached);
            localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(mergedData));
            console.log('Direct Google Sheet fallback sync completed successfully!');
            return mergedData;
          }
        } catch (fallbackErr) {
          console.error('Failed direct Google Sheet fallback:', fallbackErr);
        }
      }
      // หากดึงไม่ได้ทั้งสองทาง ให้คืนข้อมูลแคชเดิมในเครื่อง เพื่อให้แอปทำงานต่อได้ลื่นไหล ไม่พัง
      return normalizeCollections(getCachedData());
    }
  }

  // หากไม่มี GAS URL ให้ดึงจากแคชโดยไม่มีเออเรอร์
  return normalizeCollections(getCachedData());
};

// บันทึกข้อมูลกลับ (ทุก collections)
export const saveAllCollections = async (data: typeof initialDefaultData): Promise<{success: boolean, error?: string}> => {
  const normalized = normalizeCollections(data);
  // บันทึกลง LocalStorage เสมอ
  try {
    localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(normalized));
  } catch (e) {
    console.warn('LocalStorage quota exceeded in saveAllCollections:', e);
  }

  const gasUrl = getGasUrl();
  if (gasUrl) {
    // หากเป็น Google Sheet Link โดยตรง จะบันทึกลง LocalStorage อย่างเดียว และแจ้งเตือนหน้าบ้านว่าต้องใช้สคริปต์ในการบันทึกกลับคลาวด์
    if (isGoogleSheetsUrl(gasUrl)) {
      return { success: true }; 
    }

    try {
      const response = await fetchWithTimeout(gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          action: 'saveData',
          payload: {
            tasks: normalized.tasks,
            equipment: normalized.equipment,
            borrows: normalized.borrows,
            dispenses: normalized.dispenses,
            docs: normalized.docs,
            expenses: normalized.expenses,
            links: normalized.links,
            employees: normalized.employees,
            locations: normalized.locations,
            cloudFiles: normalized.cloudFiles
          }
        })
      }, 120000);
      const resData = await handleResponseJson(response);
      return { success: resData.success, error: resData.error };
    } catch (err: any) {
      console.error('Failed to save to Google Apps Script:', err?.message || err);
      return { success: false, error: err?.message || String(err) }; // ยังคงเซฟใน Local สำเร็จ แต่คลาวด์พัง
    }
  }
  return { success: true }; // สำเร็จทาง Local
};

// บันทึกเฉพาะ collection เดียวไปยัง Google Sheet (รวดเร็วและไม่กระทบตารางอื่น)
export const saveSingleCollection = async (
  collectionKey: string,
  items: any[]
): Promise<{ success: boolean; error?: string }> => {
  const currentCached = getCachedData();
  const updatedCache = {
    ...currentCached,
    [collectionKey]: items
  };
  const normalized = normalizeCollections(updatedCache);
  try {
    localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(normalized));
  } catch (e) {
    console.warn('LocalStorage quota exceeded, clearing old cache or skipping local storage write:', e);
  }

  const gasUrl = getGasUrl();
  if (gasUrl) {
    if (isGoogleSheetsUrl(gasUrl)) {
      return { success: true };
    }

    try {
      const response = await fetchWithTimeout(gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          action: 'saveData',
          payload: {
            [collectionKey]: normalized[collectionKey as keyof typeof initialDefaultData] || items
          }
        })
      }, 60000);
      const resData = await handleResponseJson(response);
      return { success: resData.success, error: resData.error };
    } catch (err: any) {
      console.error(`Failed to save ${collectionKey} to Google Apps Script:`, err?.message || err);
      return { success: false, error: err?.message || String(err) };
    }
  }
};

// ดึงเฉพาะข้อมูลการเบิกพัสดุอุปกรณ์สดๆ จาก Google Sheets
export const fetchDispensesFromGas = async (): Promise<DispenseRecord[]> => {
  const allData = await fetchAllData();
  return allData.dispenses || [];
};

// บันทึกเฉพาะข้อมูลการเบิกพัสดุอุปกรณ์ไปยัง Google Sheets ทันที (พร้อมอัปเดตแคชในเครื่อง)
export const saveDispensesToGas = async (dispenses: DispenseRecord[]): Promise<{ success: boolean; error?: string }> => {
  return await saveSingleCollection('dispenses', dispenses);
};

// จัดการสมัครสมาชิก
export const registerUserClient = async (user: User & { password: string }): Promise<{ success: boolean; error?: string }> => {
  const gasUrl = getGasUrl();
  
  if (gasUrl && !isGoogleSheetsUrl(gasUrl)) {
    try {
      const response = await fetchWithTimeout(gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          action: 'register',
          payload: user
        })
      }, 8000);
      const resData = await handleResponseJson(response);
      return resData;
    } catch (err) {
      return { success: false, error: 'เชื่อมต่อฐานข้อมูล Google Sheets ไม่สำเร็จ: ' + String(err) };
    }
  }

  // จัดการผ่าน Local
  const localUsersStr = localStorage.getItem(LOCAL_USERS_KEY) || '[]';
  let localUsers: (User & { password: string })[] = [];
  try {
    localUsers = JSON.parse(localUsersStr);
  } catch {
    localUsers = [];
  }

  const emailLower = user.email.toLowerCase().trim();
  if (localUsers.some(u => u.email.toLowerCase().trim() === emailLower)) {
    return { success: false, error: 'อีเมลนี้ได้รับการลงทะเบียนแล้วในระบบจำลองจำกัด' };
  }

  // ตรวจสอบความถูกต้องของรหัสผ่าน
  if (user.password.length !== 6 || !/^[A-Za-z0-9]+$/.test(user.password)) {
    return { success: false, error: 'รหัสผ่านต้องมี 6 หลัก เป็นภาษาอังกฤษและตัวเลขเท่านั้น' };
  }

  localUsers.push(user);
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(localUsers));
  return { success: true };
};

// จัดการอัปเดตข้อมูลส่วนตัว (โปรไฟล์)
export const updateUserProfileClient = async (user: User): Promise<{ success: boolean; user?: User; error?: string }> => {
  const gasUrl = getGasUrl();
  
  // บันทึกข้อมูลแบบ Local เสมอเพื่อให้ข้อมูลในเครื่องอัปเดตทันทีและลื่นไหลที่สุด (Offline-first / Instant Feedback)
  const localUsersStr = localStorage.getItem(LOCAL_USERS_KEY) || '[]';
  let localUsers: (User & { password: string })[] = [];
  try {
    localUsers = JSON.parse(localUsersStr);
  } catch {
    localUsers = [];
  }

  const emailLower = user.email.toLowerCase().trim();
  const index = localUsers.findIndex(u => u.email.toLowerCase().trim() === emailLower);
  if (index !== -1) {
    localUsers[index] = {
      ...localUsers[index],
      name: user.name,
      tel: user.tel,
      position: user.position,
      photoUrl: user.photoUrl
    };
    if (user.password) {
      localUsers[index].password = user.password;
    }
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(localUsers));
  }

  setLoggedUser(user);

  // หากเปิดการเชื่อมต่อ Google Sheets Web App ให้ลองอัปเดตไปยังคลาวด์ด้วย
  if (gasUrl && !isGoogleSheetsUrl(gasUrl)) {
    try {
      const response = await fetchWithTimeout(gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          action: 'updateProfile',
          payload: user
        })
      }, 8000);
      const resData = await handleResponseJson(response);
      if (resData.success && resData.user) {
        const mergedUser = {
          ...resData.user,
          password: user.password || resData.user.password
        };
        setLoggedUser(mergedUser);
        return { success: true, user: mergedUser };
      }
      
      // กรณี Google Sheets Web App เก่าอยู่และยังไม่รองรับ action "updateProfile" ให้ถือว่าอัปเดตสำเร็จในเครื่องแล้ว แต่แจ้งเตือนให้เขารู้
      return { 
        success: true, 
        user: user, 
        error: 'บันทึกโปรไฟล์ในเครื่องเรียบร้อยแล้ว แต่ไม่สามารถซิงก์ไป Google Sheets ได้ (กรุณาคัดลอกโค้ด Apps Script ชุดล่าสุดไปวางใหม่)' 
      };
    } catch (err) {
      // กรณีเน็ตเวิร์กเออร์เรอร์ ให้ถือว่าเซฟในเครื่องสำเร็จแล้วเช่นกัน
      return { 
        success: true, 
        user: user, 
        error: 'บันทึกโปรไฟล์ในเครื่องของท่านเรียบร้อยแล้ว แต่ออฟไลน์/ไม่สามารถเชื่อมต่อ Google Sheets ได้ในขณะนี้' 
      };
    }
  }

  return { success: true, user };
};

// จัดการเข้าสู่ระบบ
export const loginUserClient = async (email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> => {
  const gasUrl = getGasUrl();
  const emailLower = email.toLowerCase().trim();

  // ตรวจสอบข้อมูลแอดมินเป็นกรณีพิเศษ เพื่อให้ผู้ใช้สามารถล็อกอินเป็นผู้ดูแลระบบได้เสมอ (เช่น ในตอนที่เพิ่งสร้างชีตใหม่แล้วข้อมูลผู้ใช้ในชีตยังว่างอยู่)
  if (emailLower === 'admin@gmail.com' && password === '12345a') {
    const defaultUser: User = {
      email: 'admin@gmail.com',
      name: 'ผู้ดูแลระบบ ออเรนจ์',
      tel: '0987654321',
      position: 'นักสารสนเทศอาวุโส'
    };
    
    // หากมี gasUrl ตั้งค่าไว้ ให้พยายามส่งข้อมูลล็อกอินไปดักเรียกกระตุ้นฝั่งชีตด้วย
    if (gasUrl && !isGoogleSheetsUrl(gasUrl)) {
      try {
        await fetchWithTimeout(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'login', payload: { email, password } })
        }, 8000);
      } catch (e) {
        console.warn('Silent connect to GAS for admin failed:', e);
      }
    }
    
    setLoggedUser(defaultUser);
    return { success: true, user: defaultUser };
  }

  if (gasUrl && !isGoogleSheetsUrl(gasUrl)) {
    try {
      const response = await fetchWithTimeout(gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          action: 'login',
          payload: { email, password }
        })
      }, 8000);
      const resData = await handleResponseJson(response);
      if (resData.success && resData.user) {
        const loggedUserWithPassword = { ...resData.user, password };
        setLoggedUser(loggedUserWithPassword);
        return { ...resData, user: loggedUserWithPassword };
      }
      console.warn('Google Sheets login failed, attempting local simulation fallback:', resData.error);
    } catch (err) {
      console.warn('Google Sheets connection error during login, falling back to local simulation:', err);
    }
  }

  // จัดการผ่าน Local
  
  const localUsersStr = localStorage.getItem(LOCAL_USERS_KEY) || '[]';
  let localUsers: (User & { password: string })[] = [];
  try {
    localUsers = JSON.parse(localUsersStr);
  } catch {
    localUsers = [];
  }

  const matched = localUsers.find(u => u.email.toLowerCase().trim() === emailLower && u.password === password);
  if (matched) {
    const userResult: User = {
      email: matched.email,
      name: matched.name,
      tel: matched.tel,
      position: matched.position,
      photoUrl: matched.photoUrl,
      password: matched.password
    };
    setLoggedUser(userResult);
    return { success: true, user: userResult };
  }

  return { success: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือระบบจำลองยังไม่มีข้อมูลผู้ใช้นี้' };
};

// ฟังก์ชันอัปโหลดไฟล์ไปยัง Google Drive ผ่าน Google Apps Script Web App
export const uploadFileToGas = async (
  fileName: string,
  fileType: string,
  base64Data: string,
  folderName?: string
): Promise<{ success: boolean; url?: string; fileId?: string; error?: string }> => {
  const gasUrl = getGasUrl();
  if (!gasUrl || isGoogleSheetsUrl(gasUrl)) {
    return { success: false, error: 'ไม่มี URL เว็บแอป Google Apps Script สำหรับการอัปโหลดไฟล์จริง' };
  }

  try {
    const response = await fetchWithTimeout(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: 'uploadFile',
        payload: {
          fileName,
          fileType,
          base64: base64Data,
          folderName
        }
      })
    }, 60000);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const resData = await handleResponseJson(response);
    return resData;
  } catch (err) {
    console.error('Failed to upload file to Google Drive via GAS:', err);
    return { success: false, error: String(err) };
  }
};

// ฟังก์ชันลบหรือย้ายไฟล์ไปไว้ในถังขยะ Google Drive ผ่าน Google Apps Script Web App (แบบละเอียด)
export interface GasDeleteResult {
  success: boolean;
  message?: string;
  error?: string;
  isPermissionError?: boolean;
}

export const deleteFileFromGasDetailed = async (id: string, dataUrl?: string): Promise<GasDeleteResult> => {
  const gasUrl = getGasUrl();
  if (!gasUrl || isGoogleSheetsUrl(gasUrl)) {
    return { success: true, message: 'สำเร็จในโหมดจำลอง' };
  }

  try {
    const response = await fetchWithTimeout(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: 'deleteFile',
        payload: { 
          id, 
          fileId: id,
          dataUrl, 
          fileUrl: dataUrl 
        }
      })
    }, 20000);

    const resData = await handleResponseJson(response);
    const errText = resData.error || '';
    const isPerm = !!resData.isPermissionError || errText.includes('Access denied') || errText.includes('DriveApp');
    return {
      success: !!resData.success,
      message: resData.message,
      error: resData.error,
      isPermissionError: isPerm
    };
  } catch (err: any) {
    console.error('Failed to move file to trash in Google Drive via GAS:', err);
    return { success: false, error: String(err) };
  }
};

// ฟังก์ชันลบหรือย้ายไฟล์ไปไว้ในถังขยะ Google Drive ผ่าน Google Apps Script Web App
export const deleteFileFromGas = async (id: string, dataUrl?: string): Promise<boolean> => {
  const res = await deleteFileFromGasDetailed(id, dataUrl);
  return res.success;
};

// ฟังก์ชันตรวจสอบและทดสอบสิทธิ์การเข้าถึง Google Drive
export const testGasDriveAccess = async (): Promise<{ success: boolean; error?: string; isPermissionError?: boolean; message?: string }> => {
  const gasUrl = getGasUrl();
  if (!gasUrl || isGoogleSheetsUrl(gasUrl)) {
    return { success: false, error: 'ยังไม่ได้ระบุ Web App URL ของ Google Apps Script' };
  }

  try {
    const response = await fetchWithTimeout(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'testDrive' })
    }, 20000);

    const resData = await handleResponseJson(response);
    const errText = resData.error || '';
    const isPerm = !!resData.isPermissionError || errText.includes('Access denied') || errText.includes('DriveApp');
    return {
      success: !!resData.success,
      message: resData.message,
      error: resData.error,
      isPermissionError: isPerm
    };
  } catch (err: any) {
    return { success: false, error: String(err) };
  }
};

// ฟังก์ชันแปลงลิงก์ Google Drive เป็นรูปแบบที่สามารถแสดงผลในแท็ก img ได้โดยตรง
export const getDriveDisplayUrl = (url: string): string => {
  if (!url) return '';
  // ถ้าเป็น base64 หรือไม่ใช่ลิงก์ Google Drive ให้ส่งกลับตามเดิม
  if (!url.includes('drive.google.com') && !url.includes('docs.google.com')) {
    return url;
  }
  
  // พยายามแกะ ID จาก URL ในรูปแบบต่าง ๆ เช่น /file/d/ID/view หรือ ?id=ID
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || 
                url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    // ใช้บริการ lh3.googleusercontent.com/d/ เพื่อบายพาสข้อจำกัดคุกกี้เบราว์เซอร์และแสดงรูปได้เสถียร 100%
    return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }
  
  // แฟล็กสำรองหากหาไม่เจอบนแพทเทิร์นปกติ แต่มีไอดีอยู่ยาวๆ
  const fallbackMatch = url.match(/[\w-]{25,}/);
  if (fallbackMatch) {
    return `https://lh3.googleusercontent.com/d/${fallbackMatch[0]}`;
  }

  return url;
};


