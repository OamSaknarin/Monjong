const fs = require('fs');
const file = 'src/components/EmployeeInfo.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 font-heading font-semibold">คำนำหน้า ชื่อ - นามสกุล <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    placeholder=""
                    className="w-full p-2.5 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                  />
                </div>`;

const newContent = `                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 font-heading font-semibold">คำนำหน้า และ ชื่อ - นามสกุล <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <select
                      className="w-1/3 p-2.5 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                      onChange={(e) => {
                         const val = e.target.value;
                         if (val) {
                            setEmpName(val + empName.replace(/^(นาย|นางสาว|นาง)/, ''));
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
                      value={empName}
                      onChange={(e) => setEmpName(e.target.value)}
                      placeholder="ชื่อ-นามสกุล"
                      className="w-2/3 p-2.5 bg-orange-50/60 focus:bg-orange-50/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                    />
                  </div>
                </div>`;

if (content.includes(target)) {
  fs.writeFileSync(file, content.replace(target, newContent));
  console.log('Replaced successfully');
} else {
  console.log('Target content not found!');
}
