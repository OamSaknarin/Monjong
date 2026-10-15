const fs = require('fs');
let file = 'src/components/LoginRegister.tsx';
let content = fs.readFileSync(file, 'utf8');

let target = `                <div>
                  <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5 font-heading">
                    ชื่อ - นามสกุล *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder=""
                      className="w-full pl-10 pr-4 py-2.5 bg-white/60 focus:bg-white/90 backdrop-blur-xs rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-xs transition-all"
                    />
                  </div>
                </div>`;

let newContent = `                <div className="flex gap-2">
                  <div className="w-1/3">
                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5 font-heading">
                      คำนำหน้า
                    </label>
                    <div className="relative">
                      <select
                        className="w-full px-2 py-2.5 bg-white/60 focus:bg-white/90 backdrop-blur-xs rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-xs transition-all"
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
                    </div>
                  </div>
                  <div className="w-2/3">
                    <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1.5 font-heading">
                      ชื่อ - นามสกุล *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={regName.replace(/^(นาย|นางสาว|นาง)/, '')}
                        onChange={(e) => {
                          const prefixMatch = regName.match(/^(นาย|นางสาว|นาง)/);
                          const prefix = prefixMatch ? prefixMatch[0] : '';
                          setRegName(prefix + e.target.value);
                        }}
                        placeholder=""
                        className="w-full pl-10 pr-4 py-2.5 bg-white/60 focus:bg-white/90 backdrop-blur-xs rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-xs transition-all"
                      />
                    </div>
                  </div>
                </div>`;

if (content.includes(target)) {
  fs.writeFileSync(file, content.replace(target, newContent));
  console.log('Replaced LoginRegister.tsx');
}
