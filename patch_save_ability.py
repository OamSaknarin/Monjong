import re

with open('src/components/Volunteers.tsx', 'r') as f:
    content = f.read()

# Fix the required validation logic for special abilities
old_req = "{ field: editingVolunteer.specialAbility, name: 'ความสามารถพิเศษ' }"
new_req = "{ field: (editingVolunteer.specialAbilities && editingVolunteer.specialAbilities.length > 0 && editingVolunteer.specialAbilities.some(a => a.detail.trim() !== '')) ? 'yes' : '', name: 'ความสามารถพิเศษ' }"

content = content.replace(old_req, new_req)

with open('src/components/Volunteers.tsx', 'w') as f:
    f.write(content)
