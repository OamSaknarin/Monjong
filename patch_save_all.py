import re

with open('src/components/Volunteers.tsx', 'r') as f:
    content = f.read()

old_save = """      const missing = requiredFields.find(f => !f.field);
      if (missing) {
        alert(`กรุณากรอกข้อมูลให้ครบถ้วน: ขาดช่อง "${missing.name}"`);
        setProfileSection('personal'); // jump to the personal tab
        return;
      }"""

new_save = """      // Remove disease from required if we want it optional, or just let them type "-"
      const missing = requiredFields.find(f => !f.field && f.name !== 'โรคประจำตัว');
      if (missing) {
        alert(`กรุณากรอกข้อมูลให้ครบถ้วน: ขาดช่อง "${missing.name}"`);
        setProfileSection('personal'); // jump to the personal tab
        return;
      }

      // Check family fields
      if (editingVolunteer.family && editingVolunteer.family.length > 0) {
        const incompleteFamily = editingVolunteer.family.some(f => !f.name || !f.age || !f.job);
        if (incompleteFamily) {
          alert('กรุณากรอกข้อมูลครอบครัวให้ครบถ้วน (ชื่อ, อายุ, อาชีพ)');
          setProfileSection('personal'); 
          return;
        }
      }"""

content = content.replace(old_save, new_save)

with open('src/components/Volunteers.tsx', 'w') as f:
    f.write(content)
