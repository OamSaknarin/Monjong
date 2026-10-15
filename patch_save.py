import re

with open('src/components/Volunteers.tsx', 'r') as f:
    content = f.read()

old_save = """    const saveVolunteer = () => {
      const currentList = volunteers || [];
      const isNew = !currentList.some(v => v.id === editingVolunteer.id);
      const newVols = isNew 
        ? [...currentList, editingVolunteer]
        : currentList.map(v => v.id === editingVolunteer.id ? editingVolunteer : v);
      
      onSaveVolunteers(newVols);
      showToast('บันทึกข้อมูลเรียบร้อย', 'success');
      setIsEditing(false);
      setEditingVolunteer(null);
    };"""

new_save = """    const saveVolunteer = () => {
      // Validation for required fields
      const requiredFields = [
        { field: editingVolunteer.code, name: 'รหัสประจำตัว อปพร.' },
        { field: editingVolunteer.firstName, name: 'ชื่อ' },
        { field: editingVolunteer.lastName, name: 'นามสกุล' },
        { field: editingVolunteer.idCard, name: 'เลขบัตรประชาชน' },
        { field: editingVolunteer.birthDate, name: 'วัน/เดือน/ปี เกิด' },
        { field: editingVolunteer.age, name: 'อายุ' },
        { field: editingVolunteer.nationality, name: 'สัญชาติ' },
        { field: editingVolunteer.race, name: 'เชื้อชาติ' },
        { field: editingVolunteer.bloodGroup, name: 'กรุ๊ปเลือด' },
        { field: editingVolunteer.disease, name: 'โรคประจำตัว' },
        { field: editingVolunteer.occupation, name: 'ประกอบอาชีพ' },
        { field: editingVolunteer.income, name: 'รายได้ต่อเดือน' },
        { field: editingVolunteer.tel, name: 'เบอร์โทรศัพท์' },
        { field: editingVolunteer.addressHouseNo, name: 'บ้านเลขที่ (ที่อยู่ปัจจุบัน)' },
        { field: editingVolunteer.addressSubdistrict, name: 'ตำบล (ที่อยู่ปัจจุบัน)' },
        { field: editingVolunteer.addressDistrict, name: 'อำเภอ (ที่อยู่ปัจจุบัน)' },
        { field: editingVolunteer.addressProvince, name: 'จังหวัด (ที่อยู่ปัจจุบัน)' },
        { field: editingVolunteer.addressZipcode, name: 'รหัสไปรษณีย์ (ที่อยู่ปัจจุบัน)' },
        { field: editingVolunteer.nativeHouseNo, name: 'บ้านเลขที่ (ภูมิลำเนาเดิม)' },
        { field: editingVolunteer.nativeSubdistrict, name: 'ตำบล (ภูมิลำเนาเดิม)' },
        { field: editingVolunteer.nativeDistrict, name: 'อำเภอ (ภูมิลำเนาเดิม)' },
        { field: editingVolunteer.nativeProvince, name: 'จังหวัด (ภูมิลำเนาเดิม)' },
        { field: editingVolunteer.nativeZipcode, name: 'รหัสไปรษณีย์ (ภูมิลำเนาเดิม)' },
        { field: editingVolunteer.specialAbility, name: 'ความสามารถพิเศษ' }
      ];

      const missing = requiredFields.find(f => !f.field);
      if (missing) {
        alert(`กรุณากรอกข้อมูลให้ครบถ้วน: ขาดช่อง "${missing.name}"`);
        setProfileSection('personal'); // jump to the personal tab
        return;
      }
      
      // Update the composite address fields
      const updatedVolunteer = {
        ...editingVolunteer,
        address: `${editingVolunteer.addressHouseNo} ต.${editingVolunteer.addressSubdistrict} อ.${editingVolunteer.addressDistrict} จ.${editingVolunteer.addressProvince} ${editingVolunteer.addressZipcode}`,
        nativeAddress: `${editingVolunteer.nativeHouseNo} ต.${editingVolunteer.nativeSubdistrict} อ.${editingVolunteer.nativeDistrict} จ.${editingVolunteer.nativeProvince} ${editingVolunteer.nativeZipcode}`
      };

      const currentList = volunteers || [];
      const isNew = !currentList.some(v => v.id === updatedVolunteer.id);
      const newVols = isNew 
        ? [...currentList, updatedVolunteer]
        : currentList.map(v => v.id === updatedVolunteer.id ? updatedVolunteer : v);
      
      onSaveVolunteers(newVols);
      showToast('บันทึกข้อมูลเรียบร้อย', 'success');
      setIsEditing(false);
      setEditingVolunteer(null);
    };"""

if old_save in content:
    content = content.replace(old_save, new_save)
else:
    print("WARNING: saveVolunteer not found")

with open('src/components/Volunteers.tsx', 'w') as f:
    f.write(content)
