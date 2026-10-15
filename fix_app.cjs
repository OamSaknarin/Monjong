const fs = require('fs');
let file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'const isCloudSaved = await saveAllCollections(statePayload);\n      if (getGasUrl()) {\n        if (!isCloudSaved) {\n          showToast(\'เซฟข้อมูลสำเร็จในเบราว์เซอร์แล้ว แต่ไม่สามารถซิงก์คลาวด์ Sheets ได้ กรุณาเช็กสิทธิ์ GAS\', \'error\');\n        }\n      }',
  'const result = await saveAllCollections(statePayload);\n      if (getGasUrl()) {\n        if (!result.success) {\n          showToast(`ไม่สามารถซิงก์คลาวด์ได้: ${result.error || \'เซิร์ฟเวอร์ตอบสนองผิดพลาด\'}`, \'error\');\n        }\n      }'
);

fs.writeFileSync(file, content);
console.log('Fixed App.tsx');
