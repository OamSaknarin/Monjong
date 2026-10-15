with open('src/components/Expenses.tsx', 'r') as f:
    content = f.read()

# Clean up to the grid
idx = content.rfind('<div className="grid grid-cols-1 gap-3">')
clean = content[:idx]

form_html = """              <div className="grid grid-cols-1 gap-3">
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 font-heading font-semibold">แผนงาน</label>
                    <input
                      type="text"
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      className="w-full p-2.5 bg-white/60 focus:bg-white/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 font-heading font-semibold">ประเภท</label>
                    <input
                      type="text"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full p-2.5 bg-white/60 focus:bg-white/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                    />
                  </div>
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
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={2}
                    className="w-full p-2.5 bg-white/60 focus:bg-white/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 font-heading font-semibold">หมายเหตุ</label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full p-2.5 bg-white/60 focus:bg-white/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-2xl border-2 border-gray-300 text-gray-600 bg-white text-xs font-black font-heading hover:bg-gray-50 active:translate-y-[2px] shadow-sm transition-all animate-none"
                >
                  ยกเลิก ✖
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="flex-[2] py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black font-heading flex items-center justify-center space-x-2 shadow-[0_4px_0_0_#ea580c] active:translate-y-[2px] active:shadow-[0_2px_0_0_#ea580c] transition-all"
                >
                  <span>{editingExpenseId ? 'บันทึกแก้ไขรายการ 💾' : 'บันทึกข้อมูลและปรับงบ 💾'}</span>
                </motion.button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

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
    </div>
  );
}
"""

with open('src/components/Expenses.tsx', 'w') as f:
    f.write(clean)
    f.write(form_html)

print("Form appended and closed.")
