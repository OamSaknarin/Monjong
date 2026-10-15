const fs = require('fs');

let content = fs.readFileSync('src/components/EquipmentBorrow.tsx', 'utf8');

// We need to replace the createPortal with inline forms, and insert them before the activeTab ternary.
const eqModalStart = content.indexOf('{isEqModalOpen && createPortal(');
const eqModalEndStr = 'document.body\n      )}';
const eqModalEnd = content.indexOf(eqModalEndStr, eqModalStart) + eqModalEndStr.length;

const eqModalString = content.substring(eqModalStart, eqModalEnd);

const borrowModalStart = content.indexOf('{isBorrowModalOpen && createPortal(');
const borrowModalEnd = content.indexOf(eqModalEndStr, borrowModalStart) + eqModalEndStr.length;

const borrowModalString = content.substring(borrowModalStart, borrowModalEnd);

// Remove the portals from the bottom
content = content.replace(eqModalString, '');
content = content.replace(borrowModalString, '');
content = content.replace('{/* --- ADD / EDIT EQ MODAL --- */}', '');
content = content.replace('{/* --- ADD / EDIT BORROW MODAL --- */}', '');

// Extract the form contents out of the portals
// For eq:
const eqFormContentStart = eqModalString.indexOf('<form');
const eqFormContentEnd = eqModalString.lastIndexOf('</form>') + 7;

let eqFormHtml = eqModalString.substring(eqFormContentStart, eqFormContentEnd);

// Wrap it with the new style
eqFormHtml = `
      {isEqModalOpen ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6 animate-in fade-in duration-200 z-10 relative">
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
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsEqModalOpen(false)}
                className="flex-1 sm:flex-none px-5 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 font-semibold text-gray-600 transition-colors cursor-pointer text-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveEquipmentSubmit}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-sky-600 text-white rounded-xl hover:bg-sky-700 flex items-center justify-center gap-2 font-bold shadow-md shadow-sky-500/20 transition-all cursor-pointer text-sm"
              >
                {editingEqId ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
              </button>
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
`;

// For borrow:
const borrowFormContentStart = borrowModalString.indexOf('<div className="bg-orange-50 border border-orange-200');
const borrowFormContentStartAlternate = borrowModalString.indexOf('<div className="border border-orange-200 bg-orange-50');

const borrowItemSelectionHtml = borrowModalString.substring(
    borrowModalString.indexOf('{editingBorrowId ? ('), 
    borrowModalString.indexOf(')}', borrowModalString.lastIndexOf('</div>\n                      );\n                    })}\n                  </div>\n                )')) + 2
);


let borrowFormHtml = `
      ) : isBorrowModalOpen ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6 animate-in fade-in duration-200 z-10 relative">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl border border-sky-100">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingBorrowId ? 'แก้ไขข้อมูลการยืม-คืน' : 'ทำรายการยืมพัสดุครุภัณฑ์'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">กรอกรายละเอียดเพื่อบันทึกการเบิก-ยืมพัสดุครุภัณฑ์</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsBorrowModalOpen(false)}
                className="flex-1 sm:flex-none px-5 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 font-semibold text-gray-600 transition-colors cursor-pointer text-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleBorrowSubmit}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-sky-600 text-white rounded-xl hover:bg-sky-700 flex items-center justify-center gap-2 font-bold shadow-md shadow-sky-500/20 transition-all cursor-pointer text-sm"
              >
                {editingBorrowId ? 'บันทึกการแก้ไข' : 'อนุมัติการยืม'}
              </button>
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
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2 border-b border-gray-200 pb-3">
                1. เลือกพัสดุครุภัณฑ์ที่ต้องการยืม
              </h3>
              ${borrowItemSelectionHtml}
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
      ) : `;

const findTabStart = '{activeTab === \'inventory\' ? (';
content = content.replace(findTabStart, eqFormHtml + '\n' + borrowFormHtml + '\n      activeTab === \'inventory\' ? (');

fs.writeFileSync('src/components/EquipmentBorrow.tsx', content);

