const fs = require('fs');

let code = fs.readFileSync('src/components/RainDailyEWS.tsx', 'utf8');

// Replace "ความชื้น" with "ความชื้นสัมพัทธ์"
code = code.replace(/ความชื้น:/g, 'ความชื้นสัมพัทธ์:');
code = code.replace(/ความชื้นเฉลี่ย/g, 'ความชื้นสัมพัทธ์เฉลี่ย');
code = code.replace(/<CloudOff className="w-3 h-3 text-sky-500" \/> ความชื้น/g, '<CloudOff className="w-3 h-3 text-sky-500" /> ความชื้นสัมพัทธ์');

// Replace ความจุ in export list
code = code.replace(/ความจุสูงสุด: \{maxWaterPercent\.toFixed\(1\)\}%/g, 'ความจุตลิ่งสูงสุด: {maxWaterPercent.toFixed(1)}%');
code = code.replace(/ความจุ \{st\.percentStorage\.toFixed\(1\)\}% \| ต่ำกว่าตลิ่ง/g, 'ต่ำกว่าตลิ่ง');

// Replace ความจุ in grid list
code = code.replace(
  /<Database className="w-3 h-3 text-blue-500" \/> ความจุ<\/span>\s*<span className="font-bold text-blue-700 ml-2 whitespace-nowrap">\{Number\(st\.percentStorage\)\.toFixed\(2\)\}%<\/span>/g,
  `<Database className="w-3 h-3 text-blue-500" /> {st.waterLevel > st.bankLevel ? 'ล้นตลิ่ง' : 'ต่ำกว่าตลิ่ง'}</span>
  <span className="font-bold text-blue-700 ml-2 whitespace-nowrap">{Math.abs(st.bankLevel - st.waterLevel).toFixed(2)} ม.</span>`
);

// Apply design rules to export layout
// It's the `exportLayout = (` block from ~1396 to ~1592
// Make it square, bright orange, explicit borders.
// We replace `rounded-[...]`, `rounded-full`, etc. with nothing or `rounded-none`.
// Since we have the whole string, I will regex replace only inside the export block.

const exportStart = code.indexOf('exportLayout = (');
const exportEnd = code.indexOf('  return (', exportStart);

if (exportStart > -1 && exportEnd > -1) {
  let exportCode = code.substring(exportStart, exportEnd);
  
  // Make borders square
  exportCode = exportCode.replace(/rounded-\[.*?\]/g, 'rounded-none');
  exportCode = exportCode.replace(/rounded-full/g, 'rounded-none');
  exportCode = exportCode.replace(/rounded-3xl/g, 'rounded-none');
  exportCode = exportCode.replace(/rounded-2xl/g, 'rounded-none');
  exportCode = exportCode.replace(/rounded-xl/g, 'rounded-none');
  exportCode = exportCode.replace(/rounded-lg/g, 'rounded-none');
  exportCode = exportCode.replace(/rounded-md/g, 'rounded-none');
  exportCode = exportCode.replace(/rounded-sm/g, 'rounded-none');
  exportCode = exportCode.replace(/rounded/g, 'rounded-none');
  
  // Background brightness / orange tone
  // The outer container already has: className="w-[1200px] h-[1200px] p-10 bg-orange-50 text-orange-950 flex flex-col justify-between overflow-hidden relative border-[10px] border-orange-500"
  
  // The user requested: "สรุปประกาศเตือนภัย ให้ดึงแบบบรรยายสรุป จากหน้าเว็บไปแสดง"
  // Let's find the warning text in exportCode
  exportCode = exportCode.replace(
    /\{stormName\}\s*<\/h4>\s*<p className="text-xs font-mono opacity-80 mt-1">\{announcementNo\}<\/p>[\s\S]*?\{watchAreas\}<\/p>/,
    `ประกาศล่าสุด</h4>\n                <p className="text-sm font-medium mt-2 leading-relaxed whitespace-pre-line">{latestWarning?.summary || 'ไม่มีประกาศแจ้งเตือนในขณะนี้'}</p>`
  );
  
  code = code.substring(0, exportStart) + exportCode + code.substring(exportEnd);
}

// Remove fake humidity generation!
code = code.replace(/let humidity = 62 \+ \(rainVal \* 0\.45\);/g, 'let humidity = 62 + (rainVal * 0.45); // Fake humidity deleted in mapping');
// Wait, to actually not use the fake humidity, we just modify `parseJsonData` and `parseXmlData` to not set `humidity` if it's fake.
// Or we just delete the `humidity` assignment.
code = code.replace(/humidity = Math\.max\(35, Math\.min\(100, humidity - \(variation \* 2\.5\)\)\);/g, 'humidity = undefined;');
code = code.replace(/humidity:\s*76\.2,/g, 'humidity: undefined,');

fs.writeFileSync('src/components/RainDailyEWS.tsx', code);
