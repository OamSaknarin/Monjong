import re

with open('src/types.ts', 'r') as f:
    content = f.read()

old_addr = """  address: string; // ที่อยู่ปัจจุบัน
  nativeAddress?: string; // ภูมิลำเนาเดิม"""

new_addr = """  address: string; // ที่อยู่ปัจจุบัน (Full string for backward compat)
  addressHouseNo?: string;
  addressSubdistrict?: string;
  addressDistrict?: string;
  addressProvince?: string;
  addressZipcode?: string;
  nativeAddress?: string; // ภูมิลำเนาเดิม
  nativeHouseNo?: string;
  nativeSubdistrict?: string;
  nativeDistrict?: string;
  nativeProvince?: string;
  nativeZipcode?: string;"""

content = content.replace(old_addr, new_addr)

with open('src/types.ts', 'w') as f:
    f.write(content)
