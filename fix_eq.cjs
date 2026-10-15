const fs = require('fs');
let content = fs.readFileSync('src/components/EquipmentBorrow.tsx', 'utf8');

const eqFormHtml = `
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
              {editingBorrowId ? (
                  <div className="p-4 bg-orange-100 rounded-xl border border-orange-200 flex flex-col sm:flex-row items-center gap-3">
                    <div className="p-2 bg-orange-500 text-white rounded-full"><Package className="w-4 h-4"/></div>
                    <div>
                      <div className="font-bold text-orange-900">แก้ไขเฉพาะข้อมูลผู้ยืม-ผู้อนุมัติ</div>
                      <div className="text-[10px] text-orange-700">รายการพัสดุที่ยืมไปแล้วไม่สามารถแก้ไขได้ผ่านหน้านี้ หากต้องการแก้ไขรายการพัสดุ กรุณายกเลิกใบยืมนี้และทำรายการใหม่</div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <select 
                        value={bSelectedEqId}
                        onChange={(e) => setBSelectedEqId(e.target.value)}
                        className="flex-1 p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none bg-white text-sm"
                      >
                        <option value="">-- เลือกพัสดุครุภัณฑ์ --</option>
                        {equipment.filter(e => getStockInfo(e).available > 0).map(eq => (
                          <option key={eq.id} value={eq.id}>{eq.code} - {eq.name} (ว่าง: {getStockInfo(eq).available})</option>
                        ))}
                      </select>
                      <input 
                        type="number"
                        min="1"
                        value={bSelectedQty}
                        onChange={(e) => setBSelectedQty(e.target.value)}
                        className="w-20 p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none bg-white text-sm text-center"
                        placeholder="จำนวน"
                      />
                      <button 
                        type="button"
                        onClick={handleAddBorrowItem}
                        className="px-4 py-2 bg-sky-100 text-sky-700 rounded-xl font-bold hover:bg-sky-200 transition"
                      >
                        เพิ่ม
                      </button>
                    </div>
                    {bItems.length > 0 && (
                      <div className="space-y-2 mt-3 bg-white p-3 rounded-xl border border-gray-200">
                        <div className="text-xs font-bold text-gray-500 mb-2">รายการที่เลือก:</div>
                        {bItems.map(item => {
                          const eq = equipment.find(e => e.id === item.eqId);
                          return (
                            <div key={item.eqId} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                              <div className="text-sm">
                                <span className="font-bold text-gray-800">{eq?.name}</span>
                                <span className="text-gray-500 text-xs ml-2">({item.qty} ชิ้น)</span>
                              </div>
                              <button 
                                type="button" 
                                onClick={() => handleRemoveBorrowItem(item.eqId)}
                                className="text-red-500 hover:bg-red-50 p-1.5 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
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
      ) : (
        <>
`;

const findTabStart = "{activeTab === 'inventory' && (";
content = content.replace(findTabStart, eqFormHtml + '\n' + findTabStart);

// Close the Fragment at the end
content = content.replace(/<\/div>\n  \);\n}/, '    </>\n      )}\n    </div>\n  );\n}');

fs.writeFileSync('src/components/EquipmentBorrow.tsx', content);
