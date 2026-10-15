const fs = require('fs');
let file = 'src/components/Volunteers.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '                <div>\n                  <label className="block text-sm font-bold text-gray-700 mb-1.5">ไซต์รองเท้า</label>\n                  <input type="text" value={editingVolunteer.shoeSize || \'\'} onChange={e => setEditingVolunteer({...editingVolunteer, shoeSize: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all bg-white" />\n                </div>\n              </div>\n\n            {/* 2. ที่อยู่ปัจจุบัน',
  '                <div>\n                  <label className="block text-sm font-bold text-gray-700 mb-1.5">ไซต์รองเท้า</label>\n                  <input type="text" value={editingVolunteer.shoeSize || \'\'} onChange={e => setEditingVolunteer({...editingVolunteer, shoeSize: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all bg-white" />\n                </div>\n              </div>\n            </div>\n\n            {/* 2. ที่อยู่ปัจจุบัน'
);

fs.writeFileSync(file, content);
console.log('Fixed syntax error');
