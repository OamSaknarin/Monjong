import re

with open('src/components/Volunteers.tsx', 'r') as f:
    content = f.read()

# Replace "ชื่อ-สกุล" field with firstName and lastName
old_name_field = """              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">ชื่อ-สกุล</label>
                <input
                  type="text"
                  value={editingVolunteer.name || ''}
                  onChange={e => setEditingVolunteer({...editingVolunteer, name: e.target.value})}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>"""

new_name_fields = """              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">ชื่อ</label>
                <input
                  type="text"
                  value={editingVolunteer.firstName || ''}
                  onChange={e => setEditingVolunteer({...editingVolunteer, firstName: e.target.value, name: `${e.target.value} ${editingVolunteer.lastName || ''}`.trim()})}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">นามสกุล</label>
                <input
                  type="text"
                  value={editingVolunteer.lastName || ''}
                  onChange={e => setEditingVolunteer({...editingVolunteer, lastName: e.target.value, name: `${editingVolunteer.firstName || ''} ${e.target.value}`.trim()})}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>"""

content = content.replace(old_name_field, new_name_fields)

# Let's find where "เบอร์โทรศัพท์" is and insert the new fields after it.
old_tel_field = """              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">เบอร์โทรศัพท์</label>
                <input
                  type="text"
                  value={editingVolunteer.tel || ''}
                  onChange={e => setEditingVolunteer({...editingVolunteer, tel: e.target.value})}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>"""

new_fields = old_tel_field + """
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">วัน/เดือน/ปี เกิด</label>
                <input
                  type="date"
                  value={editingVolunteer.birthDate || ''}
                  onChange={e => setEditingVolunteer({...editingVolunteer, birthDate: e.target.value})}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">อายุ (ปี)</label>
                <input
                  type="number"
                  value={editingVolunteer.age || ''}
                  onChange={e => setEditingVolunteer({...editingVolunteer, age: e.target.value})}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">สัญชาติ</label>
                <input
                  type="text"
                  value={editingVolunteer.nationality || ''}
                  onChange={e => setEditingVolunteer({...editingVolunteer, nationality: e.target.value})}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">เชื้อชาติ</label>
                <input
                  type="text"
                  value={editingVolunteer.race || ''}
                  onChange={e => setEditingVolunteer({...editingVolunteer, race: e.target.value})}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">กรุ๊ปเลือด</label>
                <select
                  value={editingVolunteer.bloodGroup || ''}
                  onChange={e => setEditingVolunteer({...editingVolunteer, bloodGroup: e.target.value})}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white"
                >
                  <option value="">เลือกกรุ๊ปเลือด</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="O">O</option>
                  <option value="AB">AB</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">โรคประจำตัว</label>
                <input
                  type="text"
                  value={editingVolunteer.disease || ''}
                  onChange={e => setEditingVolunteer({...editingVolunteer, disease: e.target.value})}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="ถ้าไม่มีให้เว้นว่าง"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">ประกอบอาชีพ</label>
                <input
                  type="text"
                  value={editingVolunteer.occupation || ''}
                  onChange={e => setEditingVolunteer({...editingVolunteer, occupation: e.target.value})}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">รายได้ต่อเดือน</label>
                <input
                  type="text"
                  value={editingVolunteer.income || ''}
                  onChange={e => setEditingVolunteer({...editingVolunteer, income: e.target.value})}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>"""

content = content.replace(old_tel_field, new_fields)

# Find address and replace it with address + nativeAddress + specialAbility + license
old_address_field = """              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1.5">ที่อยู่</label>
                <textarea
                  value={editingVolunteer.address || ''}
                  onChange={e => setEditingVolunteer({...editingVolunteer, address: e.target.value})}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  rows={2}
                />
              </div>"""

new_address_fields = """              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1.5">ที่อยู่ปัจจุบัน</label>
                <textarea
                  value={editingVolunteer.address || ''}
                  onChange={e => setEditingVolunteer({...editingVolunteer, address: e.target.value})}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  rows={2}
                />
              </div>
              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-bold text-gray-700">ภูมิลำเนาเดิม</label>
                  <button 
                    onClick={() => setEditingVolunteer({...editingVolunteer, nativeAddress: editingVolunteer.address})}
                    className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded"
                  >
                    เหมือนกันกับที่อยู่ปัจจุบัน
                  </button>
                </div>
                <textarea
                  value={editingVolunteer.nativeAddress || ''}
                  onChange={e => setEditingVolunteer({...editingVolunteer, nativeAddress: e.target.value})}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  rows={2}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1.5">ความสามารถพิเศษ</label>
                <input
                  type="text"
                  value={editingVolunteer.specialAbility || ''}
                  onChange={e => setEditingVolunteer({...editingVolunteer, specialAbility: e.target.value})}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              
              <div className="md:col-span-2 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <label className="block text-sm font-bold text-gray-700 mb-3">ใบอนุญาตขับขี่</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <select
                      value={editingVolunteer.license?.type || ''}
                      onChange={e => {
                        const newType = e.target.value;
                        setEditingVolunteer({
                          ...editingVolunteer, 
                          license: { ...(editingVolunteer.license || {}), type: newType, no: '', issueDate: '', expiryDate: '', issuedBy: '', otherType: '' } as any
                        });
                      }}
                      className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white"
                    >
                      <option value="">ไม่มี</option>
                      <option value="รถจักรยานยนต์">ใบขับขี่รถจักรยานยนต์</option>
                      <option value="รถยนต์">ใบขับขี่รถยนต์</option>
                      <option value="อื่นๆ">อื่นๆ</option>
                    </select>
                  </div>
                  {editingVolunteer.license?.type === 'อื่นๆ' && (
                    <div>
                      <input
                        type="text"
                        placeholder="ระบุ..."
                        value={editingVolunteer.license?.otherType || ''}
                        onChange={e => setEditingVolunteer({
                          ...editingVolunteer, 
                          license: { ...editingVolunteer.license, otherType: e.target.value } as any
                        })}
                        className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  )}
                </div>
                
                {editingVolunteer.license?.type && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">ฉบับที่</label>
                      <input
                        type="text"
                        value={editingVolunteer.license?.no || ''}
                        onChange={e => setEditingVolunteer({
                          ...editingVolunteer, 
                          license: { ...editingVolunteer.license, no: e.target.value } as any
                        })}
                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">วันอนุญาต</label>
                      <input
                        type="date"
                        value={editingVolunteer.license?.issueDate || ''}
                        onChange={e => setEditingVolunteer({
                          ...editingVolunteer, 
                          license: { ...editingVolunteer.license, issueDate: e.target.value } as any
                        })}
                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">วันหมดอายุ</label>
                      <input
                        type="date"
                        value={editingVolunteer.license?.expiryDate || ''}
                        onChange={e => setEditingVolunteer({
                          ...editingVolunteer, 
                          license: { ...editingVolunteer.license, expiryDate: e.target.value } as any
                        })}
                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">สถานที่ออก</label>
                      <input
                        type="text"
                        value={editingVolunteer.license?.issuedBy || ''}
                        onChange={e => setEditingVolunteer({
                          ...editingVolunteer, 
                          license: { ...editingVolunteer.license, issuedBy: e.target.value } as any
                        })}
                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>"""

content = content.replace(old_address_field, new_address_fields)

with open('src/components/Volunteers.tsx', 'w') as f:
    f.write(content)
