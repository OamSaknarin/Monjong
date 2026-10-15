const fs = require('fs');
let file = 'src/components/Volunteers.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add measurements to the form view (below section 1 or inside section 1)
const measurementFormHtml = `
            </div>

            {/* 1.5 สัดส่วนร่างกาย (สีชมพู Pink) */}
            <div className="bg-pink-50/40 p-5 md:p-6 rounded-2xl border border-pink-200/60 shadow-xs">
              <h3 className="font-bold text-lg text-pink-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600"><User className="w-4 h-4" /></span>
                สัดส่วนร่างกาย
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">น้ำหนัก (กก.)</label>
                  <input type="text" value={editingVolunteer.weight || ''} onChange={e => setEditingVolunteer({...editingVolunteer, weight: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">ส่วนสูง (ซม.)</label>
                  <input type="text" value={editingVolunteer.height || ''} onChange={e => setEditingVolunteer({...editingVolunteer, height: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">รอบอก (นิ้ว)</label>
                  <input type="text" value={editingVolunteer.chest || ''} onChange={e => setEditingVolunteer({...editingVolunteer, chest: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">ไหล่ (นิ้ว)</label>
                  <input type="text" value={editingVolunteer.shoulder || ''} onChange={e => setEditingVolunteer({...editingVolunteer, shoulder: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">เอว (นิ้ว)</label>
                  <input type="text" value={editingVolunteer.waist || ''} onChange={e => setEditingVolunteer({...editingVolunteer, waist: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">ต้นขา (นิ้ว)</label>
                  <input type="text" value={editingVolunteer.thigh || ''} onChange={e => setEditingVolunteer({...editingVolunteer, thigh: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">ไซต์เสื้อ</label>
                  <input type="text" value={editingVolunteer.shirtSize || ''} onChange={e => setEditingVolunteer({...editingVolunteer, shirtSize: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">ไซต์กางเกง</label>
                  <input type="text" value={editingVolunteer.pantsSize || ''} onChange={e => setEditingVolunteer({...editingVolunteer, pantsSize: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">ไซต์รองเท้า</label>
                  <input type="text" value={editingVolunteer.shoeSize || ''} onChange={e => setEditingVolunteer({...editingVolunteer, shoeSize: e.target.value})} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all bg-white" />
                </div>
              </div>
`;

if (!content.includes('1.5 สัดส่วนร่างกาย')) {
  content = content.replace(
    '              </div>\n            </div>\n\n            {/* 2. ที่อยู่ปัจจุบัน',
    measurementFormHtml + '\n            {/* 2. ที่อยู่ปัจจุบัน'
  );
}

const measurementViewHtml = `
            {/* Section 1.5: สัดส่วนร่างกาย */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-pink-900 border-l-4 border-pink-500 pl-3 py-0.5 bg-pink-50/50 rounded-r-lg">
                สัดส่วนร่างกาย
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 bg-white p-4 rounded-2xl border border-gray-200 text-sm">
                <div><span className="text-gray-500 text-xs block">น้ำหนัก</span><span className="font-semibold text-gray-800">{viewingVolunteer.weight ? \`\${viewingVolunteer.weight} กก.\` : '-'}</span></div>
                <div><span className="text-gray-500 text-xs block">ส่วนสูง</span><span className="font-semibold text-gray-800">{viewingVolunteer.height ? \`\${viewingVolunteer.height} ซม.\` : '-'}</span></div>
                <div><span className="text-gray-500 text-xs block">รอบอก</span><span className="font-semibold text-gray-800">{viewingVolunteer.chest ? \`\${viewingVolunteer.chest} นิ้ว\` : '-'}</span></div>
                <div><span className="text-gray-500 text-xs block">ไหล่</span><span className="font-semibold text-gray-800">{viewingVolunteer.shoulder ? \`\${viewingVolunteer.shoulder} นิ้ว\` : '-'}</span></div>
                <div><span className="text-gray-500 text-xs block">เอว</span><span className="font-semibold text-gray-800">{viewingVolunteer.waist ? \`\${viewingVolunteer.waist} นิ้ว\` : '-'}</span></div>
                <div><span className="text-gray-500 text-xs block">ต้นขา</span><span className="font-semibold text-gray-800">{viewingVolunteer.thigh ? \`\${viewingVolunteer.thigh} นิ้ว\` : '-'}</span></div>
                <div><span className="text-gray-500 text-xs block">ไซต์เสื้อ</span><span className="font-semibold text-gray-800">{viewingVolunteer.shirtSize || '-'}</span></div>
                <div><span className="text-gray-500 text-xs block">ไซต์กางเกง</span><span className="font-semibold text-gray-800">{viewingVolunteer.pantsSize || '-'}</span></div>
                <div><span className="text-gray-500 text-xs block">ไซต์รองเท้า</span><span className="font-semibold text-gray-800">{viewingVolunteer.shoeSize || '-'}</span></div>
              </div>
            </div>
`;

if (!content.includes('Section 1.5: สัดส่วนร่างกาย')) {
  content = content.replace(
    '            {/* Section 2: ที่อยู่และการติดต่อ */}',
    measurementViewHtml + '\n            {/* Section 2: ที่อยู่และการติดต่อ */}'
  );
}

fs.writeFileSync(file, content);
console.log('Fixed Volunteers.tsx');
