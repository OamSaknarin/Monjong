export interface User {
  email: string;
  name: string;
  tel: string;
  position: string;
  photoUrl?: string;
  password?: string;
}

export interface TaskItem {
  id: string;
  date: string; // YYYY-MM-DD
  originalDate?: string; // เก็บวันที่เดิมของงานก่อนจะถูกเลื่อนอัตโนมัติ
  task: string;
  status: 'ยังไม่ได้ทำ' | 'กำลังดำเนินการ' | 'ทำแล้ว';
  type: 'ภารกิจทั่วไป' | 'นัดหมาย/ประชุม' | 'เร่งด่วน' | 'งานลงพื้นที่' | 'เอกสาร/รายงาน' | 'ลงพื้นที่สำรวจ';
}

export interface Equipment {
  id: string;
  name: string; // รายการ
  code: string; // หมายเลขครุภัณฑ์
  type: string; // ประเภท
  status: 'ปกติ' | 'ชำรุด' | 'เสีย' | 'จำหน่าย';
  location: string; // สถานที่เก็บ
  note: string; // หมายเหตุ
  qty: number; // จำนวนคงคลัง
}

export interface BorrowRecord {
  id: string;
  groupId?: string; // ID กลุ่มสำหรับรายการยืมในสลิปเดียวกัน
  borrowDate: string; // วันที่ยืม
  itemId: string; // ลิงก์ไปยัง ID ของอุปกรณ์
  itemName: string; // ชื่ออุปกรณ์ (แสดงผล/แคช)
  borrowerName: string; // ชื่อ-นามสกุล
  borrowerPosition: string; // ตำแหน่ง
  borrowerTel: string; // เบอร์โทรศัพท์
  certifier: string; // เจ้าหน้าที่รับรอง
  certifierPosition?: string; // ตำแหน่งผู้รับรอง
  returnDate: string; // กำหนดวันคืน
  returnedDate?: string; // วันที่คืนจริง (ถ้าคืนแล้ว)
  note: string; // หมายเหตุ
  qty?: number; // จำนวนที่ยืม (ถ้าไม่ระบุถือเป็น 1)

  // ๔ ส่วนอนุมัติและเจ้าหน้าที่ส่งมอบ-รับคืนเพิ่มเติม
  headOfOfficeComment?: string; // ความเห็นหัวหน้าสำนักปลัด
  headOfOfficeName?: string; // ชื่อหัวหน้าสำนักปลัด
  headOfOfficePosition?: string; // ตำแหน่งหัวหน้าสำนักปลัด
  mayorOrder?: string; // คำสั่ง/การอนุมัติ (นายก)
  mayorName?: string; // ชื่อนายก อบต.
  mayorPosition?: string; // ตำแหน่งนายก อบต.
  handoverOfficerName?: string; // เจ้าหน้าที่ส่งมอบพัสดุ
  handoverOfficerPosition?: string; // ตำแหน่งเจ้าหน้าที่ส่งมอบพัสดุ
  receivingOfficerName?: string; // เจ้าหน้าที่รับคืนพัสดุ
  receivingOfficerPosition?: string; // ตำแหน่งเจ้าหน้าที่รับคืนพัสดุ
}

export interface DispenseRecord {
  id: string;
  groupId?: string; // ID กลุ่มสำหรับรายการเบิกพร้อมกันในใบเบิกเดียวกัน
  dispenseDate: string; // วันที่เบิก (YYYY-MM-DD)
  itemId: string; // ลิงก์ไปยัง ID ของอุปกรณ์/พัสดุ
  itemName: string; // ชื่ออุปกรณ์/พัสดุ
  itemCode?: string; // รหัส/หมายเลขครุภัณฑ์
  itemType?: string; // ประเภทพัสดุ
  recipientName: string; // ชื่อ-นามสกุล ผู้ขอเบิก/ผู้รับของ
  recipientPosition: string; // ตำแหน่งผู้ขอเบิก
  recipientTel: string; // เบอร์โทรศัพท์
  department?: string; // แผนก/ฝ่าย/ส่วนงานที่นำไปใช้
  purpose: string; // วัตถุประสงค์การเบิก/ภารกิจ/โครงการ
  certifier: string; // ผู้อนุมัติ/ผู้จ่ายพัสดุ
  certifierPosition?: string; // ตำแหน่งผู้อนุมัติ
  qty: number; // จำนวนที่เบิก
  unit?: string; // หน่วยนับ (เช่น ชิ้น, อัน, กล่อง, ชุด, ลิตร, ม้วน)
  status: 'เบิกจ่ายแล้ว' | 'รออนุมัติ' | 'ยกเลิก';
  note: string; // หมายเหตุ
  
  // ๔ ผู้ลงนามเพิ่มเติม
  headOfOfficeName?: string;
  headOfOfficePosition?: string;
  paladName?: string;
  paladPosition?: string;
  mayorName?: string;
  mayorPosition?: string;
}

export interface OfficialDoc {
  id: string;
  docNo: string; // เลขที่
  subject: string; // เรื่อง
  date: string; // ลงวันที่ (YYYY-MM-DD)
  agency: string; // จากหน่วยงาน
  docType: 'หนังสือรับ' | 'หนังสือส่ง' | 'ประกาศ' | 'คำสั่ง' | 'แบบคำร้อง';
  receiveNo?: string; // เลขที่รับ (เพิ่มเข้ามากรณีเป็น หนังสือรับ)
  shelfNo: string; // แฟ้มเก็บเลขที่
  note: string; // หมายเหตุ
  petitionStatus?: 'รอสำรวจ' | 'ช่วยเหลือได้' | 'ช่วยเหลือไม่ได้'; // สถานะคำร้อง
  surveyDate?: string; // วันที่ออกสำรวจ (สำหรับ รอสำรวจ)
  noHelpReason?: string; // เหตุผลช่วยเหลือไม่ได้
  helpDetail?: string; // รายละเอียดการช่วยเหลือ (สำหรับ ช่วยเหลือได้)
  fileUrl?: string; // ลิงก์ไฟล์ใน Google Drive
  fileId?: string; // File ID ใน Google Drive (สำหรับสั่งลบ)
  fileName?: string; // ชื่อไฟล์ต้นฉบับ
}

export interface ExpenseRecord {
  id: string;
  date: string; // วันที่ (YYYY-MM-DD)
  item: string; // รายการ
  amount: number; // จำนวนเงิน
  planName: string; // แผนงาน (replaced category)
  budget: string; // งบ
  project: string; // โครงการ
  purpose: string; // เพื่อจ่ายเป็นค่า
  type: string; // ประเภท
  plannedBudget: number; // งบประมาณที่ตั้งไว้
  details: string; // รายละเอียด
  note: string; // หมายเหตุ
}

export interface RelatedLink {
  id: string;
  name: string; // ชื่อ
  details: string; // รายละเอียด
  url: string; // ที่อยู่เว็บไซต์
}

export interface WorkHistoryItem {
  id: string;
  type: 'education' | 'work';
  period: string; // ปี พ.ศ. หรือช่วงเวลา
  detail: string; // รายละเอียดสถานที่/ตำแหน่ง
}

export interface Employee {
  id: string;
  name: string; // ชื่อ-นามสกุล
  nickname?: string; // ชื่อเล่น
  position: string; // ตำแหน่ง
  birthDate?: string; // วันเดือนปีเกิด (YYYY-MM-DD หรือ DD/MM/YYYY)
  age?: number | string; // อายุ (ปี)
  houseNo: string; // บ้านเลขที่
  subdistrict: string; // ตำบล
  district: string; // อำเภอ
  province: string; // จังหวัด
  zipcode: string; // รหัสไปรษณีย์
  tel: string; // เบอร์โทรศัพท์
  photoUrl: string; // รูปภาพ
  history: WorkHistoryItem[]; // ประวัติการทำงานและการศึกษา
}

export interface LocationItem {
  id: string;
  name: string; // ชื่อสถานที่
  details: string; // รายละเอียด
  lat: number; // ละติจูด
  lng: number; // ลองจิจูด
  type?: 'บ้าน' | 'วัด' | 'โรงเรียน' | 'ร้านค้า' | 'คาเฟ่' | 'สถานที่ราชการ' | 'โรงพยาบาล' | 'สถานีตำรวจ' | 'เอกชน' | 'สถานที่ท่องเที่ยว' | 'ตลาด' | 'สะพาน' | 'แหล่งน้ำ' | 'จุดเสี่ยงภัย' | 'อื่นๆ'; // เพิ่มฟิลด์ type
}

export interface CloudFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadDate: string; // ISO String
  expiryDate: string; // ISO String
  dataUrl: string; // For simulation, storing small files as data URLs or mock links
  uploader: string; // User name
}

export interface VolunteerFamily {
  id: string;
  relation: 'บิดา' | 'มารดา' | 'ภรรยา' | 'สามี' | 'บุตร' | 'อื่นๆ';
  name: string;
  age?: number | string;
  job?: string;
}

export interface VolunteerEducationItem {
  id: string;
  year: string; // ปีการศึกษา
  degree: string; // วุฒิการศึกษา
  institution: string; // สถานศึกษา
  gpa: string; // เกรดเฉลี่ย
}

export interface VolunteerWorkItem {
  id: string;
  startYear: string; // ปี พ.ศ. ที่เริ่ม
  endYear: string; // ปี พ.ศ. ที่สิ้นสุด
  workplace: string; // สถานที่
  position: string; // ตำแหน่ง
  salary: string; // เงินเดือน
}

export interface VolunteerHonorItem {
  id: string;
  year: string; // ปี พ.ศ.
  detail: string; // รางวัล หรือ เกียรติบัตร
  fileUrl?: string; // อัพโหลดไฟล์
  fileName?: string;
}

export interface VolunteerGalleryFile {
  id: string;
  url: string;
  name: string;
  type: string;
}

export interface VolunteerLicense {
  type: string; // 'รถจักรยานยนต์' | 'รถยนต์' | 'อื่นๆ' | ''
  otherType?: string; // ระบุ...
  no?: string; // ฉบับที่
  issueDate?: string; // วันอนุญาต
  expiryDate?: string; // วันหมดอายุ
  issuedBy?: string; // สถานที่ออก
}

export interface Volunteer {
  id: string;
  code: string; // รหัสประจำตัว อปพร.
  name: string; // ชื่อ-สกุล (For display/compatibility)
  prefix?: string; // คำนำหน้า
  firstName?: string; // ชื่อ
  lastName?: string; // นามสกุล
  idCard: string; // เลขบัตรประชาชน
  birthDate?: string; // วันเกิด YYYY-MM-DD
  age?: string; // อายุ
  nationality?: string; // สัญชาติ
  race?: string; // เชื้อชาติ
  bloodGroup: string; // กรุ๊ปเลือด
  weight?: string; // น้ำหนัก
  height?: string; // ส่วนสูง
  chest?: string; // รอบอก
  shoulder?: string; // ไหล่
  waist?: string; // เอว
  thigh?: string; // ต้นขา
  shirtSize?: string; // ไซต์เสื้อ
  pantsSize?: string; // ไซต์กางเกง
  shoeSize?: string; // ไซต์รองเท้า
  disease?: string; // โรคประจำตัว
  occupation?: string; // ประกอบอาชีพ
  income?: string; // รายได้ต่อเดือน
  address: string; // ที่อยู่ปัจจุบัน (Full string for backward compat)
  addressHouseNo?: string;
  addressSubdistrict?: string;
  addressDistrict?: string;
  addressProvince?: string;
  addressZipcode?: string;
  nativeAddress?: string; // ภูมิลำเนาเดิม
  nativeHouseNo?: string;
  nativeSubdistrict?: string;
  nativeDistrict?: string;
  nativeProvince?: string;
  nativeZipcode?: string;
  specialAbility?: string; // ความสามารถพิเศษ (legacy)
  specialAbilities?: {id: string, detail: string}[]; // ความสามารถพิเศษแบบเป็นข้อๆ
  license?: VolunteerLicense; // ใบอนุญาติขับขี่
  tel: string;
  mobile?: string;
  photoUrl: string; // รูปถ่าย
  family: VolunteerFamily[];
  education: VolunteerEducationItem[];
  workHistory: VolunteerWorkItem[];
  honors: VolunteerHonorItem[];
  galleryFiles: VolunteerGalleryFile[]; 
}

export interface VolunteerFinance {
  id: string;
  volunteerId: string;
  date: string;
  type: 'ค่าป่วยการ' | 'ค่าตอบแทน' | 'ค่าเดินทาง' | 'อื่นๆ';
  amount: number;
  description: string;
}
