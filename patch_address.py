import re

with open('src/components/Volunteers.tsx', 'r') as f:
    content = f.read()

old_addr = """              <div className="md:col-span-2">
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
              </div>"""

new_addr = """              <div className="md:col-span-2 bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50">
                <label className="block text-sm font-bold text-blue-800 mb-3">ที่อยู่ปัจจุบัน</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">บ้านเลขที่</label>
                    <input type="text" value={editingVolunteer.addressHouseNo || ''} onChange={e => setEditingVolunteer({...editingVolunteer, addressHouseNo: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ตำบล</label>
                    <input type="text" value={editingVolunteer.addressSubdistrict || ''} onChange={e => setEditingVolunteer({...editingVolunteer, addressSubdistrict: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">อำเภอ</label>
                    <input type="text" value={editingVolunteer.addressDistrict || ''} onChange={e => setEditingVolunteer({...editingVolunteer, addressDistrict: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">จังหวัด</label>
                    <input type="text" value={editingVolunteer.addressProvince || ''} onChange={e => setEditingVolunteer({...editingVolunteer, addressProvince: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">รหัสไปรษณีย์</label>
                    <input type="text" value={editingVolunteer.addressZipcode || ''} onChange={e => setEditingVolunteer({...editingVolunteer, addressZipcode: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100/50">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-bold text-emerald-800">ภูมิลำเนาเดิม</label>
                  <button 
                    onClick={() => setEditingVolunteer({
                      ...editingVolunteer, 
                      nativeHouseNo: editingVolunteer.addressHouseNo,
                      nativeSubdistrict: editingVolunteer.addressSubdistrict,
                      nativeDistrict: editingVolunteer.addressDistrict,
                      nativeProvince: editingVolunteer.addressProvince,
                      nativeZipcode: editingVolunteer.addressZipcode
                    })}
                    className="text-xs text-emerald-700 hover:text-emerald-900 bg-emerald-100/50 hover:bg-emerald-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
                  >
                    เหมือนกันกับที่อยู่ปัจจุบัน
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">บ้านเลขที่</label>
                    <input type="text" value={editingVolunteer.nativeHouseNo || ''} onChange={e => setEditingVolunteer({...editingVolunteer, nativeHouseNo: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ตำบล</label>
                    <input type="text" value={editingVolunteer.nativeSubdistrict || ''} onChange={e => setEditingVolunteer({...editingVolunteer, nativeSubdistrict: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">อำเภอ</label>
                    <input type="text" value={editingVolunteer.nativeDistrict || ''} onChange={e => setEditingVolunteer({...editingVolunteer, nativeDistrict: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">จังหวัด</label>
                    <input type="text" value={editingVolunteer.nativeProvince || ''} onChange={e => setEditingVolunteer({...editingVolunteer, nativeProvince: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">รหัสไปรษณีย์</label>
                    <input type="text" value={editingVolunteer.nativeZipcode || ''} onChange={e => setEditingVolunteer({...editingVolunteer, nativeZipcode: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                  </div>
                </div>
              </div>"""

if old_addr in content:
    content = content.replace(old_addr, new_addr)
else:
    print("WARNING: address field not found")

with open('src/components/Volunteers.tsx', 'w') as f:
    f.write(content)
