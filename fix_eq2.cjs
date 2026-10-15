const fs = require('fs');
let content = fs.readFileSync('src/components/EquipmentBorrow.tsx', 'utf8');

const borrowFormHtml = `
              {editingBorrowId ? (
                  <div className="p-4 bg-orange-100 rounded-xl border border-orange-200 flex flex-col sm:flex-row items-center gap-3">
                    <div className="p-2 bg-orange-500 text-white rounded-full"><Package className="w-4 h-4"/></div>
                    <div>
                      <div className="font-bold text-orange-900">แก้ไขเฉพาะข้อมูลผู้ยืม-ผู้อนุมัติ</div>
                      <div className="text-[10px] text-orange-700">รายการพัสดุที่ยืมไปแล้วไม่สามารถแก้ไขได้ผ่านหน้านี้ หากต้องการแก้ไขรายการพัสดุ กรุณายกเลิกใบยืมนี้และทำรายการใหม่</div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar p-2 border border-gray-100 rounded-xl bg-white">
                    {equipment.filter(e => getStockInfo(e).available > 0).map(eq => {
                      const isSelected = bItemIds.includes(eq.id);
                      return (
                        <div key={eq.id} className={\`p-3 rounded-xl border transition-all \${isSelected ? 'bg-sky-50 border-sky-200' : 'bg-white border-gray-100 hover:border-sky-100'}\`}>
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setBItemIds([...bItemIds, eq.id]);
                                  setBItemQuantities({...bItemQuantities, [eq.id]: 1});
                                } else {
                                  setBItemIds(bItemIds.filter(id => id !== eq.id));
                                  const newQ = {...bItemQuantities};
                                  delete newQ[eq.id];
                                  setBItemQuantities(newQ);
                                }
                              }}
                              className="w-5 h-5 rounded text-sky-600 focus:ring-sky-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-gray-900 text-sm">{eq.name}</div>
                              <div className="text-[11px] text-gray-500 font-mono">{eq.code} • ว่าง: <span className="font-bold text-emerald-600">{getStockInfo(eq).available}</span></div>
                            </div>
                            {isSelected && (
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-gray-600 font-bold">จำนวน:</label>
                                <input 
                                  type="number"
                                  min="1"
                                  max={getStockInfo(eq).available}
                                  value={bItemQuantities[eq.id] || 1}
                                  onChange={(e) => {
                                    const val = Math.max(1, Math.min(getStockInfo(eq).available, parseInt(e.target.value) || 1));
                                    setBItemQuantities({...bItemQuantities, [eq.id]: val});
                                  }}
                                  className="w-16 p-1.5 border border-sky-200 rounded-lg text-center font-bold text-sky-900 focus:ring-2 focus:ring-sky-500/30 outline-none"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
`;

// Now let's replace the block from `{editingBorrowId ? (` to the end of the `) : (` block that we inserted in fix_eq.cjs.
const startStr = '{editingBorrowId ? (';
const endStr = ')}';
const startIdx = content.indexOf(startStr);

// Find the corresponding closing `)}` of the condition.
// Since there's nested `}`, let's find the string `<div className="space-y-3">` and replace up to the `)}` right before `</div>`
const regex = /{editingBorrowId \? \([\s\S]*? \)\s*:\s*\([\s\S]*?\}\)\}\s*<\/div>\s*\)\}/;

content = content.replace(regex, borrowFormHtml.trim());

fs.writeFileSync('src/components/EquipmentBorrow.tsx', content);
