const fs = require('fs');

let content = fs.readFileSync('src/components/RainDailyEWS.tsx', 'utf-8');

// We want to remove the Open-Meteo fallback logic
// Look for "// 2. หากสถานีใดไม่พบในคลังข้อมูลน้ำแห่งชาติ ให้ดึงจาก Open-Meteo เป็นแผนสำรอง (Fallback) เพื่อให้ข้อมูลไม่ว่างเปล่า"
const startStr = "// 2. หากสถานีใดไม่พบในคลังข้อมูลน้ำแห่งชาติ ให้ดึงจาก Open-Meteo เป็นแผนสำรอง (Fallback) เพื่อให้ข้อมูลไม่ว่างเปล่า";
const endStr = "} catch (err) {";

let startIndex = content.indexOf(startStr);
if (startIndex !== -1) {
    let endIndex = content.indexOf(endStr, startIndex);
    if (endIndex !== -1) {
        // Keep the catch block
        let toRemove = content.substring(startIndex, endIndex);
        content = content.replace(toRemove, "");
        fs.writeFileSync('src/components/RainDailyEWS.tsx', content, 'utf-8');
        console.log("Removed Open-Meteo fallback from frontend");
    } else {
        console.log("Could not find end of fallback block");
    }
} else {
    console.log("Could not find fallback block");
}
