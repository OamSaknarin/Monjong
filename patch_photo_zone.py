import re

with open('src/components/Volunteers.tsx', 'r') as f:
    content = f.read()

old_photo = """              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1.5">รูปโปรไฟล์ (อัพโหลดไฟล์ หรือ ใส่ลิงก์)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={editingVolunteer.photoUrl || ''}
                    onChange={e => setEditingVolunteer({...editingVolunteer, photoUrl: e.target.value})}
                    className="flex-1 p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    placeholder="https://... หรืออัพโหลดไฟล์"
                  />
                  <label className="cursor-pointer px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium whitespace-nowrap">
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
              </div>"""

new_photo = """              <div className="md:col-span-2 bg-pink-50/50 p-5 rounded-2xl border border-pink-100/50">
                <label className="block text-sm font-bold text-pink-800 mb-3">รูปโปรไฟล์ (อัพโหลดไฟล์ หรือ ใส่ลิงก์)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={editingVolunteer.photoUrl || ''}
                    onChange={e => setEditingVolunteer({...editingVolunteer, photoUrl: e.target.value})}
                    className="flex-1 p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                    placeholder="https://... หรืออัพโหลดไฟล์"
                  />
                  <label className="cursor-pointer px-4 py-2 bg-pink-100 text-pink-700 rounded-xl hover:bg-pink-200 font-medium whitespace-nowrap transition-colors">
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
              </div>"""

content = content.replace(old_photo, new_photo)

with open('src/components/Volunteers.tsx', 'w') as f:
    f.write(content)
