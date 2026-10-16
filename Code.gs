/**
 * Google Apps Script (Code.gs)
 * ระบบจัดการ งานป้องกันและบรรเทาสาธารณภัย อบต.ม่อนจอง - ฐานข้อมูล Google Sheets & Google Drive
 * 
 * วิธีใช้งานและเปิดสิทธิ์ Google Drive:
 * 1. เปิด Google Sheet ที่ใช้เป็นฐานข้อมูล
 * 2. คลิก เมนู "ส่วนขยาย" (Extensions) > "Apps Script"
 * 3. ลบโค้ดเดิมออกทั้งหมด แล้ววางโค้ดนี้ลงไป
 * 4. คลิกปุ่ม "บันทึก" 💾 (รูปแผ่นดิสก์)
 * 5. ⭐ สำคัญที่สุดสำหรับ Google Drive & ถังขยะ:
 *    - ที่แถบเครื่องมือด้านบน เลือกฟังก์ชัน "authorizeGoogleDrive"
 *    - คลิกปุ่ม "เรียกใช้" (Run ▶️) 1 ครั้ง
 *    - จะมีหน้าต่าง "จำเป็นต้องมีการให้สิทธิ์" (Authorization Required) เด้งขึ้นมา
 *    - กด "ตรวจสอบสิทธิ์" (Review Permissions) > เลือกบัญชี Google ของท่าน
 *    - กด "ขั้นสูง" (Advanced) ที่มุมล่างซ้าย > กด "ไปที่ ... (ไม่ปลอดภัย)"
 *    - กด "อนุญาต" (Allow)
 *    (ขั้นตอนนี้ทำเพียงครั้งเดียว เพื่อให้สิทธิ์สคริปต์สามารถบันทึกไฟล์และย้ายไฟล์ลงถังขยะ Google Drive ได้)
 * 6. คลิกปุ่ม "การทำให้ใช้งานได้" (Deploy) > "การทำให้ใช้งานได้ใหม่" (New Deployment) 
 *    (หรือหากมี Deployment อยู่แล้ว ให้เลือก จัดการการทำให้ใช้งานได้ > แก้ไข ✏️ > เลือก "เวอร์ชันใหม่")
 * 7. เลือกประเภทเป็น "เว็บแอป" (Web App)
 *    - ผู้ดูแลสิทธิ์ (Execute as): เลือก บัญชีของฉัน (Me)
 *    - ผู้มีสิทธิ์เข้าถึง (Who has access): เลือก "ทุกคน" (Anyone) (สำคัญมาก!)
 * 8. คลิก "ทำให้ใช้งานได้" (Deploy) แล้วคัดลอก URL เว็บแอปมาใช้งาน
 */

function doGet(e) {
  // รองรับการดึงข้อมูลผ่าน GET เพื่อความยืดหยุ่นสูงสุดหากมีการเรียกหรือรีไดเรกต์มาเป็น GET
  if (e && e.parameter && (e.parameter.action === "fetchData" || e.parameter.action === "getAllData")) {
    try {
      bootstrapSheets();
      var data = getAllData();
      return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  return HtmlService.createHtmlOutput("<div style='font-family:sans-serif;text-align:center;padding:40px;'><h1 style='color:#ea580c;'>องค์การบริหารส่วนตำบลม่อนจอง</h1><p style='color:#374151;'>ระบบฐานข้อมูล Google Sheets & Google Drive API พร้อมใช้งาน 100%</p><p style='color:#10b981;font-weight:bold;'>Status: Ready (POST & GET)</p></div>");
}

function doOptions(e) {
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    // ตรวจสอบและสร้างชีตทั้งหมดถ้ายังไม่มี
    bootstrapSheets();
    
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action;
    var payload = requestData.payload;
    
    var response = { success: false, error: "Invalid action" };
    
    switch (action) {
      case "register":
        response = registerUser(payload);
        break;
      case "login":
        response = loginUser(payload);
        break;
      case "updateProfile":
        response = updateProfile(payload);
        break;
      case "fetchData":
        response = getAllData();
        break;
      case "saveData":
        response = saveAllData(payload);
        break;
      case "appendDispense":
        response = appendDispense(payload);
        break;
      case "saveSingleCollection":
        response = saveSingleCollection(payload);
        break;
      case "uploadFile":
        response = uploadFileToDrive(payload);
        break;
      case "deleteFile":
        response = deleteFileFromDrive(payload);
        break;
      case "testDrive":
        response = testDriveAccess();
        break;
      default:
        response = { success: false, error: "Action not supported: " + action };
    }
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    var errResponse = { success: false, error: error.toString() };
    return ContentService.createTextOutput(JSON.stringify(errResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ฟังก์ชันสร้างชีตเริ่มต้น
function bootstrapSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var sheets = {
    "Login": ["Email", "Password", "Name", "Tel", "Position", "PhotoUrl"],
    "ตารางงาน": ["ID", "Date", "Task", "Status", "Type"],
    "คลังอุปกรณ์": ["ID", "Name", "Code", "Type", "Status", "Location", "Note", "Qty"],
    "ยืมคืนอุปกรณ์": ["ID", "BorrowDate", "ItemId", "ItemName", "BorrowerName", "BorrowerPosition", "BorrowerTel", "Certifier", "CertifierPosition", "ReturnDate", "ReturnedDate", "Note"],
    "การเบิกพัสดุอุปกรณ์": ["ID", "GroupID", "DispenseDate", "ItemId", "ItemName", "ItemCode", "ItemType", "RecipientName", "RecipientPosition", "RecipientTel", "Department", "Purpose", "Certifier", "CertifierPosition", "Qty", "Unit", "Status", "Note", "HeadOfOfficeName", "HeadOfOfficePosition", "PaladName", "PaladPosition", "MayorName", "MayorPosition"],
    "หนังสือราชการ": ["ID", "DocNo", "Subject", "Date", "Agency", "DocType", "ReceiveNo", "ShelfNo", "Note", "PetitionStatus", "SurveyDate", "NoHelpReason", "HelpDetail", "FileUrl", "FileId", "FileName"],
    "ค่าใช้จ่าย": ["ID", "Date", "Item", "Amount", "Category", "BudgetPool", "Project", "Purpose", "Type", "PlannedBudget", "Details", "Note"],
    "เว็บไซต์เกี่ยวข้อง": ["ID", "Name", "Details", "URL"],
    "ข้อมูลพนักงาน": ["ID", "Name", "Nickname", "Position", "BirthDate", "Age", "HouseNo", "Subdistrict", "District", "Province", "Zipcode", "Tel", "PhotoUrl", "History"],
    "สถานที่ตำบลม่อนจอง": ["ID", "Name", "Details", "Lat", "Long", "Type"],
    "คลาวด์ไฟล์": ["ID", "FileName", "FileType", "FileSize", "UploadDate", "ExpiryDate", "DataUrl", "Uploader"],
    "ฐานข้อมูลอปพร": ["ID", "Code", "Name", "IdCard", "BirthDate", "Age", "BloodGroup", "Address", "Tel", "Position", "Status", "PhotoUrl"],
    "การเงินอปพร": ["ID", "VolunteerId", "VolunteerName", "Date", "Amount", "Type", "Note"]
  };
  
  for (var sheetName in sheets) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(sheets[sheetName]);
      // ปรับแต่งความสวยงามของหัวตารางเล็กน้อย
      var headerRange = sheet.getRange(1, 1, 1, sheets[sheetName].length);
      headerRange.setBackground("#FFF2E6");
      headerRange.setFontColor("#C2410C");
      headerRange.setFontWeight("bold");
    }
  }
  
  // เพิ่มข้อมูลผู้ดูแลระบบตั้งต้น (แอดมิน) เข้าไปในชีต Login หากยังไม่มีข้อมูล เพื่อพร้อมล็อกอินใช้งานทันที
  var loginSheet = ss.getSheetByName("Login");
  if (loginSheet && loginSheet.getLastRow() <= 1) {
    loginSheet.appendRow(["admin@gmail.com", "12345a", "ผู้ดูแลระบบ ออเรนจ์", "0987654321", "นักสารสนเทศอาวุโส"]);
  }
}

// สมัครสมาชิก
function registerUser(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Login");
  var data = sheet.getDataRange().getValues();
  
  var email = payload.email.toLowerCase().trim();
  
  // ตรวจสอบความยาวรหัสผ่านและความถูกต้องของอักขระ
  var password = payload.password;
  if (password.length !== 6 || !/^[A-Za-z0-9]+$/.test(password)) {
    return { success: false, error: "รหัสผ่านต้องมี 6 หลัก เป็นภาษาอังกฤษและตัวเลขเท่านั้น" };
  }
  
  // ตรวจสอบ Email ซ้ำ
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString().toLowerCase().trim() === email) {
      return { success: false, error: "อีเมลนี้ได้รับการลงทะเบียนแล้ว" };
    }
  }
  
  sheet.appendRow([
    email,
    password,
    payload.name,
    payload.tel,
    payload.position,
    payload.photoUrl || ""
  ]);
  
  return { success: true, message: "สมัครสมาชิกสำเร็จ" };
}

// เข้าสู่ระบบ
function loginUser(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Login");
  var data = sheet.getDataRange().getValues();
  
  var email = payload.email.toLowerCase().trim();
  var password = payload.password;
  
  for (var i = 1; i < data.length; i++) {
    var dbEmail = data[i][0].toString().toLowerCase().trim();
    var dbPassword = data[i][1].toString();
    
    if (dbEmail === email && dbPassword === password) {
      return {
        success: true,
        user: {
          email: dbEmail,
          name: data[i][2],
          tel: data[i][3],
          position: data[i][4],
          photoUrl: data[i][5] ? data[i][5].toString() : ""
        }
      };
    }
  }
  
  return { success: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
}

// อัปเดตข้อมูลส่วนตัวของพนักงาน (ผู้ใช้)
function updateProfile(payload) {
  console.log('Received payload:', JSON.stringify(payload));
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Login");
  var data = sheet.getDataRange().getValues();
  
  var email = payload.email.toLowerCase().trim();
  
  for (var i = 1; i < data.length; i++) {
    var dbEmail = data[i][0].toString().toLowerCase().trim();
    if (dbEmail === email) {
      // DEBUG LOG
      console.log('Updating profile for:', email, 'New password:', payload.password);
      if (payload.password) {
        sheet.getRange(i + 1, 2).setValue(payload.password);
      }
      sheet.getRange(i + 1, 3).setValue(payload.name);
      sheet.getRange(i + 1, 4).setValue(payload.tel);
      sheet.getRange(i + 1, 5).setValue(payload.position);
      sheet.getRange(i + 1, 6).setValue(payload.photoUrl || "");
      
      return {
        success: true,
        user: {
          email: dbEmail,
          name: payload.name,
          tel: payload.tel,
          position: payload.position,
          photoUrl: payload.photoUrl || "",
          password: payload.password || data[i][1].toString()
        }
      };
    }
  }
  
  return { success: false, error: "ไม่พบผู้ใช้ในระบบ" };
}

// ดึงข้อมูลทั้งหมดจากชีตเพื่อโหลดไปยังหน้าเว็บ
function getAllData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dataResult = {};
  
  var sheetsMapping = {
    "ตารางงาน": "tasks",
    "คลังอุปกรณ์": "equipment",
    "ยืมคืนอุปกรณ์": "borrows",
    "การเบิกพัสดุอุปกรณ์": "dispenses",
    "หนังสือราชการ": "docs",
    "ค่าใช้จ่าย": "expenses",
    "เว็บไซต์เกี่ยวข้อง": "links",
    "ข้อมูลพนักงาน": "employees",
    "สถานที่ตำบลม่อนจอง": "locations",
    "คลาวด์ไฟล์": "cloudFiles",
    "ฐานข้อมูลอปพร": "volunteers",
    "การเงินอปพร": "volunteerFinances"
  };
  
  for (var sheetName in sheetsMapping) {
    var payloadKey = sheetsMapping[sheetName];
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      dataResult[payloadKey] = [];
      continue;
    }
    
    var values = sheet.getDataRange().getValues();
    if (values.length <= 1) {
      dataResult[payloadKey] = [];
      continue;
    }
    
    var headers = values[0];
    var list = [];
    
    for (var i = 1; i < values.length; i++) {
      var item = {};
      for (var j = 0; j < headers.length; j++) {
        var key = headers[j];
        var val = values[i][j];
        
        // แปลงฟิลด์เฉพาะ
        if (key === "Age" || key === "Qty" || key === "Amount" || key === "PlannedBudget" || key === "Lat" || key === "Long") {
          val = Number(val) || 0;
        } else if (key === "History") {
          try {
            val = JSON.parse(val);
          } catch(e) {
            val = [];
          }
        } else if (val instanceof Date) {
          // จัดการแปลงวันที่เป็น string YYYY-MM-DD
          var year = val.getFullYear();
          var month = ("0" + (val.getMonth() + 1)).slice(-2);
          var day = ("0" + val.getDate()).slice(-2);
          val = year + "-" + month + "-" + day;
        }
        
        // แมปชื่อหัวตารางเป็น CamelCase
        var mappedKey = mapHeaderToKey(key);
        item[mappedKey] = val;
      }
      list.push(item);
    }
    dataResult[payloadKey] = list;
  }
  
  return { success: true, data: dataResult };
}

// อัปเดตข้อมูลทั้งหมดจากหน้าเว็บกลับไปที่ชีต
function saveAllData(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var tableMapping = {
    "tasks": { name: "ตารางงาน", headers: ["ID", "Date", "Task", "Status", "Type"] },
    "equipment": { name: "คลังอุปกรณ์", headers: ["ID", "Name", "Code", "Type", "Status", "Location", "Note", "Qty"] },
    "borrows": { name: "ยืมคืนอุปกรณ์", headers: ["ID", "BorrowDate", "ItemId", "ItemName", "BorrowerName", "BorrowerPosition", "BorrowerTel", "Certifier", "CertifierPosition", "ReturnDate", "ReturnedDate", "Note"] },
    "dispenses": { name: "การเบิกพัสดุอุปกรณ์", headers: ["ID", "GroupID", "DispenseDate", "ItemId", "ItemName", "ItemCode", "ItemType", "RecipientName", "RecipientPosition", "RecipientTel", "Department", "Purpose", "Certifier", "CertifierPosition", "Qty", "Unit", "Status", "Note", "HeadOfOfficeName", "HeadOfOfficePosition", "PaladName", "PaladPosition", "MayorName", "MayorPosition"] },
    "docs": { name: "หนังสือราชการ", headers: ["ID", "DocNo", "Subject", "Date", "Agency", "DocType", "ReceiveNo", "ShelfNo", "Note", "PetitionStatus", "SurveyDate", "NoHelpReason", "HelpDetail", "FileUrl", "FileId", "FileName"] },
    "expenses": { name: "ค่าใช้จ่าย", headers: ["ID", "Date", "Item", "Amount", "Category", "BudgetPool", "Project", "Purpose", "Type", "PlannedBudget", "Details", "Note"] },
    "links": { name: "เว็บไซต์เกี่ยวข้อง", headers: ["ID", "Name", "Details", "URL"] },
    "employees": { name: "ข้อมูลพนักงาน", headers: ["ID", "Name", "Nickname", "Position", "BirthDate", "Age", "HouseNo", "Subdistrict", "District", "Province", "Zipcode", "Tel", "PhotoUrl", "History"] },
    "locations": { name: "สถานที่ตำบลม่อนจอง", headers: ["ID", "Name", "Details", "Lat", "Long", "Type"] },
    "cloudFiles": { name: "คลาวด์ไฟล์", headers: ["ID", "FileName", "FileType", "FileSize", "UploadDate", "ExpiryDate", "DataUrl", "Uploader"] },
    "volunteers": { name: "ฐานข้อมูลอปพร", headers: ["ID", "Code", "Name", "IdCard", "BirthDate", "Age", "BloodGroup", "Address", "Tel", "Position", "Status", "PhotoUrl"] },
    "volunteerFinances": { name: "การเงินอปพร", headers: ["ID", "VolunteerId", "VolunteerName", "Date", "Amount", "Type", "Note"] }
  };
  
  for (var payloadKey in payload) {
    var mapInfo = tableMapping[payloadKey];
    if (!mapInfo) continue;
    
    var sheet = ss.getSheetByName(mapInfo.name);
    if (!sheet) {
      sheet = ss.insertSheet(mapInfo.name);
    }
    
    sheet.clearContents();
    
    var allRows = [mapInfo.headers];
    var items = payload[payloadKey];
    if (items && items.length > 0) {
      var rows = items.map(function(item) {
        return mapInfo.headers.map(function(header) {
          var key = mapHeaderToKey(header);
          var val = item[key];
          
          if (header === "History") {
            return JSON.stringify(val || []);
          }
          if (val === undefined || val === null) {
            return "";
          }
          if (header === "HouseNo" || header === "Tel" || header === "Zipcode" || header === "BorrowerTel" || header === "RecipientTel" || header === "ItemCode" || header === "Code" || header === "BirthDate") {
            var valStr = String(val).trim();
            if (valStr && valStr.charAt(0) !== "'") {
              return "'" + valStr;
            }
          }
          return val;
        });
      });
      allRows = allRows.concat(rows);
    }
    
    sheet.getRange(1, 1, allRows.length, mapInfo.headers.length).setValues(allRows);
    
    // ตั้งค่าความสวยงามหัวตารางอีกครั้ง
    var headerRange = sheet.getRange(1, 1, 1, mapInfo.headers.length);
    headerRange.setBackground("#FFF2E6");
    headerRange.setFontColor("#C2410C");
    headerRange.setFontWeight("bold");
  }
  
  return { success: true, message: "บันทึกข้อมูลเรียบร้อยแล้ว" };
}

// บันทึกเฉพาะข้อมูลคอลเลกชันเดียว
function saveSingleCollection(payload) {
  var collectionKey = payload.collectionKey;
  var items = payload.items;
  if (!collectionKey) {
    for (var k in payload) {
      collectionKey = k;
      items = payload[k];
      break;
    }
  }
  var dataPayload = {};
  dataPayload[collectionKey] = items;
  return saveAllData(dataPayload);
}

// เพิ่มรายการเบิกพัสดุอุปกรณ์ต่อท้ายตาราง (Append Dispense)
function appendDispense(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = "การเบิกพัสดุอุปกรณ์";
  var sheet = ss.getSheetByName(sheetName);
  var headers = ["ID", "GroupID", "DispenseDate", "ItemId", "ItemName", "ItemCode", "ItemType", "RecipientName", "RecipientPosition", "RecipientTel", "Department", "Purpose", "Certifier", "CertifierPosition", "Qty", "Unit", "Status", "Note", "HeadOfOfficeName", "HeadOfOfficePosition", "PaladName", "PaladPosition", "MayorName", "MayorPosition"];
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    var hRange = sheet.getRange(1, 1, 1, headers.length);
    hRange.setBackground("#FFF2E6");
    hRange.setFontColor("#C2410C");
    hRange.setFontWeight("bold");
  }

  var items = Array.isArray(payload) ? payload : (payload.items || [payload]);
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var row = headers.map(function(h) {
      var key = mapHeaderToKey(h);
      var val = item[key];
      if (val === undefined || val === null) return "";
      if (h === "RecipientTel" || h === "ItemCode") {
        var str = String(val).trim();
        if (str && str.charAt(0) !== "'") return "'" + str;
      }
      return val;
    });
    sheet.appendRow(row);
  }

  return { success: true, message: "บันทึกรายการเบิกพัสดุอุปกรณ์ลง Google Sheet สำเร็จแล้ว" };
}

/**
 * 🌟 ฟังก์ชันสำหรับกด "เรียกใช้" (Run ▶️) ใน Apps Script เพื่ออนุมัติสิทธิ์ Google Drive ครั้งแรก
 * เลือกฟังก์ชัน authorizeGoogleDrive ในแถบด้านบน แล้วกดปุ่ม "เรียกใช้" (Run)
 */
function authorizeGoogleDrive() {
  try {
    var folderName = "หนังสือราชการ";
    var folders = DriveApp.getFoldersByName(folderName);
    var folder;
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    Logger.log("✅ อนุมัติสิทธิ์ Google Drive สำเร็จ 100%! โฟลเดอร์: " + folder.getName() + " (ID: " + folder.getId() + ")");
    return "✅ อนุมัติสิทธิ์ Google Drive สำเร็จเรียบร้อยแล้ว! โฟลเดอร์: " + folder.getName();
  } catch (err) {
    Logger.log("❌ เกิดข้อผิดพลาด: " + err.toString());
    throw err;
  }
}

// ตรวจสอบสถานะการเชื่อมต่อ Google Drive
function testDriveAccess() {
  try {
    var folderName = "หนังสือราชการ";
    var folders = DriveApp.getFoldersByName(folderName);
    var folder;
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }
    return {
      success: true,
      folderId: folder.getId(),
      folderName: folder.getName(),
      message: "เชื่อมต่อและมีสิทธิ์เข้าถึง Google Drive สมบูรณ์ (พร้อมอัปโหลดและย้ายไฟล์ลงถังขยะ)"
    };
  } catch (err) {
    var errStr = err.toString();
    var isPermError = errStr.indexOf("Access denied") > -1;
    return {
      success: false,
      error: errStr,
      isPermissionError: isPermError,
      hint: isPermError 
        ? "กรุณาเปิด Apps Script แล้วเลือกฟังก์ชัน authorizeGoogleDrive กด 'เรียกใช้' (Run ▶️) 1 ครั้งเพื่ออนุมัติสิทธิ์" 
        : errStr
    };
  }
}

// จัดการอัปโหลดไฟล์ใน Google Drive
function uploadFileToDrive(payload) {
  try {
    var folder;
    var targetFolderName = payload.folderName || "หนังสือราชการ";
    try {
      // ค้นหาหรือสร้างโฟลเดอร์สำหรับเก็บไฟล์โดยเฉพาะ
      var folders = DriveApp.getFoldersByName(targetFolderName);
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = DriveApp.createFolder(targetFolderName);
        folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      }
    } catch (err) {
      // หากเข้าถึงโฟลเดอร์เฉพาะไม่ได้ ให้ลองใช้ root folder
      folder = DriveApp.getRootFolder();
    }
    
    // ดึง base64 (เอาส่วนหัว data:...;base64, ออกหากมี)
    var base64Data = payload.base64 || "";
    if (base64Data.indexOf(",") > -1) {
      base64Data = base64Data.split(",")[1];
    }
    
    var contentType = payload.fileType || "application/octet-stream";
    var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), contentType, payload.fileName);
    
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return { 
      success: true, 
      fileId: file.getId(), 
      url: file.getUrl(),
      fileName: file.getName(),
      folderName: folder.getName(),
      message: "อัปโหลดไฟล์ลงใน Google Drive โฟลเดอร์ " + folder.getName() + " เรียบร้อยแล้ว"
    };
  } catch (e) {
    var errorStr = e.toString();
    var isPerm = errorStr.indexOf("Access denied") > -1;
    return { 
      success: false, 
      error: errorStr,
      isPermissionError: isPerm,
      hint: isPerm 
        ? "ต้องอนุมัติสิทธิ์ Drive: ใน Apps Script เลือกฟังก์ชัน authorizeGoogleDrive แล้วกด 'เรียกใช้' (Run ▶️)"
        : errorStr
    };
  }
}

// ย้ายไฟล์ไปไว้ในถังขยะ (Trash) ใน Google Drive
function deleteFileFromDrive(payload) {
  try {
    // ลบไฟล์โดยใช้ fileId หรือพยายามแกะ ID จาก URL แล้วสั่งย้ายไปถังขยะ (Trash)
    var fileId = payload.id || payload.fileId;
    // หาก fileId เป็นรหัสชั่วคราวของทางเว็บแอปพลิเคชันฝั่ง React
    if (fileId && (fileId.indexOf("file-") === 0 || fileId.indexOf("doc-") === 0 || fileId.indexOf("local-") === 0 || fileId.indexOf("gas-") === 0)) {
      fileId = null;
    }
    
    // พยายามแกะ ID จาก URL ในรูปแบบต่างๆ
    var urlToSearch = payload.dataUrl || payload.fileUrl || payload.url;
    if (!fileId && urlToSearch) {
      var match = urlToSearch.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || 
                  urlToSearch.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                  urlToSearch.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match) {
        fileId = match[1];
      } else {
        var fallbackMatch = urlToSearch.match(/[\w-]{25,}/);
        if (fallbackMatch) {
          fileId = fallbackMatch[0];
        }
      }
    }
    
    if (fileId) {
      var file = DriveApp.getFileById(fileId);
      var origName = file.getName();
      // ย้ายเอกสารไปไว้ในถังขยะของ Google Drive ตามคำสั่งของผู้ใช้
      file.setTrashed(true);
      return { 
        success: true, 
        message: "ย้ายไฟล์ \"" + origName + "\" ไปไว้ในถังขยะ Google Drive เรียบร้อยแล้ว",
        fileId: fileId,
        fileName: origName
      };
    }
    return { success: false, error: "Missing File ID (ไม่พบรหัสไฟล์ในการดำเนินการย้ายไปถังขยะ)" };
  } catch (e) {
    var errorStr = e.toString();
    var isPerm = errorStr.indexOf("Access denied") > -1;
    return { 
      success: false, 
      error: errorStr,
      isPermissionError: isPerm,
      hint: isPerm 
        ? "ต้องอนุมัติสิทธิ์ Drive: ใน Apps Script เลือกฟังก์ชัน authorizeGoogleDrive แล้วกด 'เรียกใช้' (Run ▶️)"
        : errorStr
    };
  }
}

// แมปชื่อหัวตารางเป็นฟิลด์ JSON key
function mapHeaderToKey(header) {
  var mapping = {
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
    "HeadOfOfficeName": "headOfOfficeName",
    "HeadOfOfficePosition": "headOfOfficePosition",
    "PaladName": "paladName",
    "PaladPosition": "paladPosition",
    "MayorName": "mayorName",
    "MayorPosition": "mayorPosition",
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
    "Uploader": "uploader"
  };
  
  return mapping[header] || header.toLowerCase();
}