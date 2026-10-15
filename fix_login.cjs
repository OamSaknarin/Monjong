const fs = require('fs');
const file = 'src/components/LoginRegister.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      ชื่อ - นามสกุล *
                    </label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                      placeholder="เช่น สมชาย ใจดี"
                    />
                  </div>`;

const newContent = `                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      คำนำหน้า และ ชื่อ - นามสกุล *
                    </label>
                    <div className="flex gap-2">
                      <select
                        className="w-1/3 px-2 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                             setRegName(val + regName.replace(/^(นาย|นางสาว|นาง)/, ''));
                          }
                        }}
                      >
                        <option value="">- เลือก -</option>
                        <option value="นาย">นาย</option>
                        <option value="นาง">นาง</option>
                        <option value="นางสาว">นางสาว</option>
                      </select>
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="w-2/3 px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                        placeholder="ชื่อ - นามสกุล"
                      />
                    </div>
                  </div>`;

if (content.includes(target)) {
  fs.writeFileSync(file, content.replace(target, newContent));
  console.log('Replaced successfully');
} else {
  console.log('Target content not found!');
}
