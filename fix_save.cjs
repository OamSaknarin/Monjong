const fs = require('fs');
let file = 'src/utils/gasClient.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'export const saveAllCollections = async (data: typeof initialDefaultData): Promise<boolean> => {',
  'export const saveAllCollections = async (data: typeof initialDefaultData): Promise<{success: boolean, error?: string}> => {'
);

content = content.replace(
  '    if (isGoogleSheetsUrl(gasUrl)) {\n      return true; \n    }',
  '    if (isGoogleSheetsUrl(gasUrl)) {\n      return { success: true }; \n    }'
);

content = content.replace(
  '      const resData = await handleResponseJson(response);\n      return resData.success;\n    } catch (err: any) {\n      console.error(\'Failed to save to Google Apps Script:\', err?.message || err);\n      return false; // ยังคงเซฟใน Local สำเร็จ แต่คลาวด์พัง\n    }',
  '      const resData = await handleResponseJson(response);\n      return { success: resData.success, error: resData.error };\n    } catch (err: any) {\n      console.error(\'Failed to save to Google Apps Script:\', err?.message || err);\n      return { success: false, error: err?.message || String(err) }; // ยังคงเซฟใน Local สำเร็จ แต่คลาวด์พัง\n    }'
);

content = content.replace(
  '  return true; // สำเร็จทาง Local\n};',
  '  return { success: true }; // สำเร็จทาง Local\n};'
);

fs.writeFileSync(file, content);
console.log('Fixed gasClient.ts');
