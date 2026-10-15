import re

with open('src/components/Volunteers.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '<h3 className="font-bold text-lg text-gray-800">ข้อมูลครอบครัว</h3>',
    '<h3 className="font-bold text-lg text-purple-800">ข้อมูลครอบครัว</h3>'
)

with open('src/components/Volunteers.tsx', 'w') as f:
    f.write(content)
