import re

with open('src/types.ts', 'r') as f:
    content = f.read()

content = content.replace(
    'specialAbility?: string; // ความสามารถพิเศษ',
    'specialAbility?: string; // ความสามารถพิเศษ (legacy)\n  specialAbilities?: {id: string, detail: string}[]; // ความสามารถพิเศษแบบเป็นข้อๆ'
)

with open('src/types.ts', 'w') as f:
    f.write(content)
