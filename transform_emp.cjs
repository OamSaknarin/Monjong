const fs = require('fs');

let content = fs.readFileSync('src/components/EmployeeInfo.tsx', 'utf8');

const modalStart = content.indexOf('{isProfileModalOpen && createPortal(');
const modalEndStr = 'document.body\n      )}';
const modalEnd = content.indexOf(modalEndStr, modalStart) + modalEndStr.length;

const modalString = content.substring(modalStart, modalEnd);

content = content.replace(modalString, '');

const formContentStart = modalString.indexOf('<form');
const formContentEnd = modalString.lastIndexOf('</form>') + 7;

let formHtml = modalString.substring(formContentStart, formContentEnd);

formHtml = `
      {isProfileModalOpen ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6 animate-in fade-in duration-200 z-10 relative">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl border border-orange-100">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingProfileId ? 'แก้ไขประวัติบุคลากร' : 'เพิ่มบุคลากรใหม่'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">กรอกข้อมูลส่วนตัว ประวัติการศึกษาและการทำงาน</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="flex-1 sm:flex-none px-5 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 font-semibold text-gray-600 transition-colors cursor-pointer text-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleProfileSubmit}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 flex items-center justify-center gap-2 font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer text-sm"
              >
                {editingProfileId ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
              </button>
            </div>
          </div>

          ${formHtml.replace(/<form[^>]*>/, '<form onSubmit={handleProfileSubmit} className="space-y-6">')
                   .replace(/<div className="flex space-x-3 pt-2">[\s\S]*?<\/div>\s*<\/form>/, `
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="px-5 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 font-semibold text-gray-600 transition-colors cursor-pointer text-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleProfileSubmit}
                className="px-6 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 flex items-center justify-center gap-2 font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer text-sm"
              >
                {editingProfileId ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
              </button>
            </div>
          </form>`)}
        </div>
      ) : (
        <>
`;

const replaceIndex = content.indexOf('{/* Background visual graphics */}');
content = content.substring(0, replaceIndex) + formHtml + content.substring(replaceIndex);

// Find the last </div> before the end of return and close the Fragment
content = content.replace(/<\/div>\n  \);\n}/, '    </>\n      )}\n    </div>\n  );\n}');

fs.writeFileSync('src/components/EmployeeInfo.tsx', content);

