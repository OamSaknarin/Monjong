import re

with open('src/components/Volunteers.tsx', 'r') as f:
    content = f.read()

# Locate from `{profileSection === 'personal' && (` to `{/* 2. Education */}`
start_marker = "{profileSection === 'personal' && ("
end_marker = "{/* 2. Education */}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print(f"Error finding markers: start={start_idx}, end={end_idx}")
    exit(1)

new_personal_block = """{profileSection === 'personal' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            {/* 1. ข้อมูลส่วนตัวเบื้องต้น (สีส้มอ่อน Amber) */}
            <div className="bg-amber-50/40 p-5 md:p-6 rounded-2xl border border-amber-200/60 shadow-xs">
              <label className="block text-base font-bold text-amber-900 mb-4">1. ข้อมูลส่วนตัวเบื้องต้น</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">รหัสประจำตัว อปพร.</label>
                  <input
                    type="text"
                    value={editingVolunteer.code || ''}
                    onChange={e => setEditingVolunteer({...editingVolunteer, code: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">ชื่อ</label>
                  <input
                    type="text"
                    value={editingVolunteer.firstName || ''}
                    onChange={e => setEditingVolunteer({...editingVolunteer, firstName: e.target.value, name: `${e.target.value} ${editingVolunteer.lastName || ''}`.trim()})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">นามสกุล</label>
                  <input
                    type="text"
                    value={editingVolunteer.lastName || ''}
                    onChange={e => setEditingVolunteer({...editingVolunteer, lastName: e.target.value, name: `${editingVolunteer.firstName || ''} ${e.target.value}`.trim()})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">เลขบัตรประชาชน</label>
                  <input
                    type="text"
                    value={editingVolunteer.idCard || ''}
                    onChange={e => setEditingVolunteer({...editingVolunteer, idCard: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    value={editingVolunteer.tel || ''}
                    onChange={e => setEditingVolunteer({...editingVolunteer, tel: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">วัน/เดือน/ปี เกิด</label>
                  <input
                    type="date"
                    value={editingVolunteer.birthDate || ''}
                    onChange={e => setEditingVolunteer({...editingVolunteer, birthDate: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">อายุ (ปี)</label>
                  <input
                    type="number"
                    value={editingVolunteer.age || ''}
                    onChange={e => setEditingVolunteer({...editingVolunteer, age: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">สัญชาติ</label>
                  <input
                    type="text"
                    value={editingVolunteer.nationality || ''}
                    onChange={e => setEditingVolunteer({...editingVolunteer, nationality: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">เชื้อชาติ</label>
                  <input
                    type="text"
                    value={editingVolunteer.race || ''}
                    onChange={e => setEditingVolunteer({...editingVolunteer, race: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">กรุ๊ปเลือด</label>
                  <select
                    value={editingVolunteer.bloodGroup || ''}
                    onChange={e => setEditingVolunteer({...editingVolunteer, bloodGroup: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
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
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                    placeholder="ถ้าไม่มีให้เว้นว่าง"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">ประกอบอาชีพ</label>
                  <input
                    type="text"
                    value={editingVolunteer.occupation || ''}
                    onChange={e => setEditingVolunteer({...editingVolunteer, occupation: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">รายได้ต่อเดือน</label>
                  <input
                    type="text"
                    value={editingVolunteer.income || ''}
                    onChange={e => setEditingVolunteer({...editingVolunteer, income: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  />
                </div>
              </div>
            </div>

            {/* 2. ที่อยู่ปัจจุบัน (สีฟ้า Blue) */}
            <div className="bg-blue-50/40 p-5 md:p-6 rounded-2xl border border-blue-200/60 shadow-xs">
              <label className="block text-base font-bold text-blue-900 mb-4">2. ที่อยู่ปัจจุบัน</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-5">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">บ้านเลขที่</label>
                  <input type="text" value={editingVolunteer.addressHouseNo || ''} onChange={e => setEditingVolunteer({...editingVolunteer, addressHouseNo: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ตำบล</label>
                  <input type="text" value={editingVolunteer.addressSubdistrict || ''} onChange={e => setEditingVolunteer({...editingVolunteer, addressSubdistrict: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">อำเภอ</label>
                  <input type="text" value={editingVolunteer.addressDistrict || ''} onChange={e => setEditingVolunteer({...editingVolunteer, addressDistrict: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">จังหวัด</label>
                  <input type="text" value={editingVolunteer.addressProvince || ''} onChange={e => setEditingVolunteer({...editingVolunteer, addressProvince: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">รหัสไปรษณีย์</label>
                  <input type="text" value={editingVolunteer.addressZipcode || ''} onChange={e => setEditingVolunteer({...editingVolunteer, addressZipcode: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none bg-white" />
                </div>
              </div>
            </div>

            {/* 3. ภูมิลำเนาเดิม (สีเขียว Emerald) */}
            <div className="bg-emerald-50/40 p-5 md:p-6 rounded-2xl border border-emerald-200/60 shadow-xs">
              <div className="flex justify-between items-center mb-4">
                <label className="block text-base font-bold text-emerald-900">3. ภูมิลำเนาเดิม</label>
                <button 
                  onClick={() => setEditingVolunteer({
                    ...editingVolunteer, 
                    nativeHouseNo: editingVolunteer.addressHouseNo,
                    nativeSubdistrict: editingVolunteer.addressSubdistrict,
                    nativeDistrict: editingVolunteer.addressDistrict,
                    nativeProvince: editingVolunteer.addressProvince,
                    nativeZipcode: editingVolunteer.addressZipcode
                  })}
                  className="text-xs text-emerald-700 hover:text-emerald-900 bg-emerald-100/70 hover:bg-emerald-200/80 px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  เหมือนกันกับที่อยู่ปัจจุบัน
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-5">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">บ้านเลขที่</label>
                  <input type="text" value={editingVolunteer.nativeHouseNo || ''} onChange={e => setEditingVolunteer({...editingVolunteer, nativeHouseNo: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ตำบล</label>
                  <input type="text" value={editingVolunteer.nativeSubdistrict || ''} onChange={e => setEditingVolunteer({...editingVolunteer, nativeSubdistrict: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">อำเภอ</label>
                  <input type="text" value={editingVolunteer.nativeDistrict || ''} onChange={e => setEditingVolunteer({...editingVolunteer, nativeDistrict: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">จังหวัด</label>
                  <input type="text" value={editingVolunteer.nativeProvince || ''} onChange={e => setEditingVolunteer({...editingVolunteer, nativeProvince: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">รหัสไปรษณีย์</label>
                  <input type="text" value={editingVolunteer.nativeZipcode || ''} onChange={e => setEditingVolunteer({...editingVolunteer, nativeZipcode: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 outline-none bg-white" />
                </div>
              </div>
            </div>

            {/* 4. ความสามารถพิเศษ (สีส้ม Orange) */}
            <div className="bg-orange-50/40 p-5 md:p-6 rounded-2xl border border-orange-200/60 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-base font-bold text-orange-900">4. ความสามารถพิเศษ</label>
                <button
                  onClick={() => setEditingVolunteer({
                    ...editingVolunteer,
                    specialAbilities: [...(editingVolunteer.specialAbilities || []), { id: generateId(), detail: '' }]
                  })}
                  className="text-orange-700 bg-orange-100/70 hover:bg-orange-200 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-4 h-4" /> เพิ่มความสามารถ
                </button>
              </div>
              
              <div className="space-y-3">
                {(!editingVolunteer.specialAbilities || editingVolunteer.specialAbilities.length === 0) ? (
                  <p className="text-gray-400 text-sm text-center py-2">ยังไม่ได้ระบุความสามารถพิเศษ</p>
                ) : editingVolunteer.specialAbilities.map(ability => (
                  <div key={ability.id} className="flex gap-2 items-center bg-white p-2.5 rounded-xl border border-orange-100/80 shadow-xs">
                    <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold shrink-0">
                      {editingVolunteer.specialAbilities!.findIndex(a => a.id === ability.id) + 1}
                    </div>
                    <input
                      type="text"
                      placeholder="ระบุความสามารถพิเศษ..."
                      value={ability.detail || ''}
                      onChange={e => {
                        const newAbilities = editingVolunteer.specialAbilities!.map(a => a.id === ability.id ? {...a, detail: e.target.value} : a);
                        setEditingVolunteer({...editingVolunteer, specialAbilities: newAbilities});
                      }}
                      className="p-2 border-transparent bg-transparent rounded-lg flex-1 w-full focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                    />
                    <button
                      onClick={() => {
                        const newAbilities = editingVolunteer.specialAbilities!.filter(a => a.id !== ability.id);
                        setEditingVolunteer({...editingVolunteer, specialAbilities: newAbilities});
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 5. ใบอนุญาตขับขี่ (สีม่วงคราม Indigo) */}
            <div className="bg-indigo-50/40 p-5 md:p-6 rounded-2xl border border-indigo-200/60 shadow-xs">
              <label className="block text-base font-bold text-indigo-900 mb-4">5. ใบอนุญาตขับขี่</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-white"
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
                      className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-white"
                    />
                  </div>
                )}
              </div>
              
              {editingVolunteer.license?.type && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 mt-5">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ฉบับที่</label>
                    <input
                      type="text"
                      value={editingVolunteer.license?.no || ''}
                      onChange={e => setEditingVolunteer({
                        ...editingVolunteer, 
                        license: { ...editingVolunteer.license, no: e.target.value } as any
                      })}
                      className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white"
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
                      className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white"
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
                      className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white"
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
                      className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 6. รูปโปรไฟล์ (สีชมพู Pink) */}
            <div className="bg-pink-50/40 p-5 md:p-6 rounded-2xl border border-pink-200/60 shadow-xs">
              <label className="block text-base font-bold text-pink-900 mb-3">6. รูปโปรไฟล์ (อัพโหลดไฟล์ หรือ ใส่ลิงก์)</label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={editingVolunteer.photoUrl || ''}
                  onChange={e => setEditingVolunteer({...editingVolunteer, photoUrl: e.target.value})}
                  className="flex-1 p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all bg-white"
                  placeholder="https://... หรืออัพโหลดไฟล์"
                />
                <label className="cursor-pointer px-4 py-2.5 bg-pink-100 text-pink-700 hover:bg-pink-200 rounded-xl font-medium whitespace-nowrap transition-colors">
                  อัพโหลดรูป
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => handleFileUpload(e, (dataUrl) => {
                      setEditingVolunteer({...editingVolunteer, photoUrl: dataUrl});
                    })}
                  />
                </label>
              </div>
            </div>

            {/* 7. ข้อมูลครอบครัว (สีม่วง Purple) */}
            <div className="bg-purple-50/40 p-5 md:p-6 rounded-2xl border border-purple-200/60 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base text-purple-900">7. ข้อมูลครอบครัว</h3>
                <button
                  onClick={() => setEditingVolunteer({
                    ...editingVolunteer,
                    family: [...(editingVolunteer.family || []), { id: generateId(), relation: 'อื่นๆ', name: '' }]
                  })}
                  className="text-purple-700 bg-purple-100/70 hover:bg-purple-200 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-4 h-4" /> เพิ่มครอบครัว
                </button>
              </div>
              
              <div className="space-y-3">
                {(!editingVolunteer.family || editingVolunteer.family.length === 0) ? (
                  <p className="text-gray-400 text-sm text-center py-4">ยังไม่มีข้อมูลครอบครัว</p>
                ) : editingVolunteer.family.map(fam => (
                  <div key={fam.id} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-white p-2.5 rounded-xl border border-purple-100/80 shadow-xs">
                    <select
                      value={fam.relation || 'อื่นๆ'}
                      onChange={e => {
                        const newFam = editingVolunteer.family.map(f => f.id === fam.id ? {...f, relation: e.target.value as any} : f);
                        setEditingVolunteer({...editingVolunteer, family: newFam});
                      }}
                      className="p-2 border border-gray-200 rounded-lg bg-gray-50 w-full sm:w-auto"
                    >
                      <option value="บิดา">บิดา</option>
                      <option value="มารดา">มารดา</option>
                      <option value="ภรรยา">ภรรยา</option>
                      <option value="สามี">สามี</option>
                      <option value="บุตร">บุตร</option>
                      <option value="อื่นๆ">อื่นๆ</option>
                    </select>
                    <input
                      type="text"
                      placeholder="ชื่อ-สกุล"
                      value={fam.name || ''}
                      onChange={e => {
                        const newFam = editingVolunteer.family.map(f => f.id === fam.id ? {...f, name: e.target.value} : f);
                        setEditingVolunteer({...editingVolunteer, family: newFam});
                      }}
                      className="p-2 border border-gray-200 rounded-lg flex-1 w-full"
                    />
                    <input
                      type="text"
                      placeholder="อายุ"
                      value={fam.age || ''}
                      onChange={e => {
                        const newFam = editingVolunteer.family.map(f => f.id === fam.id ? {...f, age: e.target.value} : f);
                        setEditingVolunteer({...editingVolunteer, family: newFam});
                      }}
                      className="p-2 border border-gray-200 rounded-lg w-full sm:w-24"
                    />
                    <input
                      type="text"
                      placeholder="อาชีพ"
                      value={fam.job || ''}
                      onChange={e => {
                        const newFam = editingVolunteer.family.map(f => f.id === fam.id ? {...f, job: e.target.value} : f);
                        setEditingVolunteer({...editingVolunteer, family: newFam});
                      }}
                      className="p-2 border border-gray-200 rounded-lg w-full sm:w-48"
                    />
                    <button
                      onClick={() => {
                        const newFam = editingVolunteer.family.filter(f => f.id !== fam.id);
                        setEditingVolunteer({...editingVolunteer, family: newFam});
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg w-full sm:w-auto flex justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 8. อัลบั้มรูปภาพ (สีเทาฟ้า Slate) */}
            <div className="bg-slate-50/70 p-5 md:p-6 rounded-2xl border border-slate-200/60 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-blue-500" />
                  8. อัลบั้มรูปภาพ
                </h3>
                <label className="cursor-pointer text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors">
                  <Plus className="w-4 h-4" /> อัพโหลดไฟล์
                  <input 
                    type="file" 
                    accept="image/*,.pdf,.doc,.docx"
                    multiple
                    className="hidden" 
                    onChange={(e) => {
                      const files = e.target.files;
                      if (!files) return;
                      const newFiles = Array.from(files) as File[];
                      newFiles.forEach((file: File) => {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const dataUrl = event.target?.result as string;
                          setEditingVolunteer(prev => ({...prev!, galleryFiles: [...(prev!.galleryFiles || []), { id: generateId(), url: dataUrl, name: file.name, type: file.type.startsWith('image/') ? 'image' : 'file' }]}));
                        };
                        reader.readAsDataURL(file);
                      });
                    }}
                  />
                </label>
              </div>
              <p className="text-sm text-gray-500 mb-4">รองรับรูปภาพและเอกสาร</p>
              
              <div className="space-y-3">
                {(!editingVolunteer.galleryFiles || editingVolunteer.galleryFiles.length === 0) ? (
                  <p className="text-gray-400 text-sm text-center py-4">ยังไม่มีรูปภาพ</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {editingVolunteer.galleryFiles.map((gf) => (
                      <div key={gf.id} className="relative group rounded-xl border border-gray-200 overflow-hidden bg-white aspect-square flex flex-col items-center justify-center shadow-xs">
                        {gf.type === 'image' ? (
                          <img src={gf.url} alt={gf.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-4 text-center">
                            <FileText className="w-8 h-8 text-blue-500 mb-2" />
                            <span className="text-xs text-gray-600 truncate w-full px-2">{gf.name}</span>
                          </div>
                        )}
                        <button
                          onClick={() => {
                            const newUrls = editingVolunteer.galleryFiles.filter(f => f.id !== gf.id);
                            setEditingVolunteer({...editingVolunteer, galleryFiles: newUrls});
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}"""

content = content[:start_idx] + new_personal_block + "\n\n        " + content[end_idx:]

with open('src/components/Volunteers.tsx', 'w') as f:
    f.write(content)

print("Replacement successful!")
