import re

with open('src/components/Volunteers.tsx', 'r') as f:
    content = f.read()

old_val = """      // Check family fields
      if (editingVolunteer.family && editingVolunteer.family.length > 0) {
        const incompleteFamily = editingVolunteer.family.some(f => !f.name || !f.age || !f.job);
        if (incompleteFamily) {
          alert('กรุณากรอกข้อมูลครอบครัวให้ครบถ้วน (ชื่อ, อายุ, อาชีพ)');
          setProfileSection('personal'); 
          return;
        }
      }"""

new_val = """      // Check family fields
      if (editingVolunteer.family && editingVolunteer.family.length > 0) {
        const incompleteFamily = editingVolunteer.family.some(f => !f.name || !f.age || !f.job);
        if (incompleteFamily) {
          alert('กรุณากรอกข้อมูลครอบครัวให้ครบถ้วน (ชื่อ, อายุ, อาชีพ)');
          setProfileSection('personal'); 
          return;
        }
      }

      // Check license fields
      if (editingVolunteer.license?.type) {
        if (editingVolunteer.license.type === 'อื่นๆ' && !editingVolunteer.license.otherType) {
          alert('กรุณาระบุประเภทใบอนุญาตขับขี่');
          setProfileSection('personal');
          return;
        }
        if (!editingVolunteer.license.no || !editingVolunteer.license.issueDate || !editingVolunteer.license.expiryDate || !editingVolunteer.license.issuedBy) {
          alert('กรุณากรอกข้อมูลใบอนุญาตขับขี่ให้ครบถ้วน');
          setProfileSection('personal');
          return;
        }
      }"""

content = content.replace(old_val, new_val)

with open('src/components/Volunteers.tsx', 'w') as f:
    f.write(content)
