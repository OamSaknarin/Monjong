const fs = require('fs');
const file = 'src/components/Volunteers.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">คำนำหน้า และ ชื่อ</label>
                  <div className="flex gap-2">
                    <select
                      value={editingVolunteer.prefix || ''}
                      onChange={e => setEditingVolunteer({...editingVolunteer, prefix: e.target.value, name: \`\${e.target.value}\${editingVolunteer.firstName || ''} \${editingVolunteer.lastName || ''}\`.trim()})}
                      className="w-1/3 p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                    >
                      <option value="">- เลือก -</option>
                      <option value="นาย">นาย</option>
                      <option value="นาง">นาง</option>
                      <option value="นางสาว">นางสาว</option>
                    </select>
                    <input
                      type="text"
                      placeholder="ชื่อ"
                      value={editingVolunteer.firstName || ''}
                      onChange={e => setEditingVolunteer({...editingVolunteer, firstName: e.target.value, name: \`\${editingVolunteer.prefix || ''}\${e.target.value} \${editingVolunteer.lastName || ''}\`.trim()})}
                      className="w-2/3 p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">นามสกุล</label>
                  <input
                    type="text"
                    value={editingVolunteer.lastName || ''}
                    onChange={e => setEditingVolunteer({...editingVolunteer, lastName: e.target.value, name: \`\${editingVolunteer.prefix || ''}\${editingVolunteer.firstName || ''} \${e.target.value}\`.trim()})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">เลขบัตรประชาชน</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={13}
                    value={editingVolunteer.idCard || ''}
                    onChange={e => {
                      const val = e.target.value.replace(/\\D/g, '').slice(0, 13);
                      setEditingVolunteer({...editingVolunteer, idCard: val});
                    }}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  />
                </div>`;

const newContent = `              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">เลขบัตรประชาชน</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={13}
                    value={editingVolunteer.idCard || ''}
                    onChange={e => {
                      const val = e.target.value.replace(/\\D/g, '').slice(0, 13);
                      setEditingVolunteer({...editingVolunteer, idCard: val});
                    }}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">คำนำหน้า และ ชื่อ</label>
                  <div className="flex gap-2">
                    <select
                      value={editingVolunteer.prefix || ''}
                      onChange={e => setEditingVolunteer({...editingVolunteer, prefix: e.target.value, name: \`\${e.target.value}\${editingVolunteer.firstName || ''} \${editingVolunteer.lastName || ''}\`.trim()})}
                      className="w-1/3 p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                    >
                      <option value="">- เลือก -</option>
                      <option value="นาย">นาย</option>
                      <option value="นาง">นาง</option>
                      <option value="นางสาว">นางสาว</option>
                    </select>
                    <input
                      type="text"
                      placeholder="ชื่อ"
                      value={editingVolunteer.firstName || ''}
                      onChange={e => setEditingVolunteer({...editingVolunteer, firstName: e.target.value, name: \`\${editingVolunteer.prefix || ''}\${e.target.value} \${editingVolunteer.lastName || ''}\`.trim()})}
                      className="w-2/3 p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">นามสกุล</label>
                  <input
                    type="text"
                    value={editingVolunteer.lastName || ''}
                    onChange={e => setEditingVolunteer({...editingVolunteer, lastName: e.target.value, name: \`\${editingVolunteer.prefix || ''}\${editingVolunteer.firstName || ''} \${e.target.value}\`.trim()})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all bg-white"
                  />
                </div>`;

if (content.includes(target)) {
  fs.writeFileSync(file, content.replace(target, newContent));
  console.log('Replaced successfully');
} else {
  console.log('Target content not found!');
}
