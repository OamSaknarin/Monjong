import re

with open('src/components/Volunteers.tsx', 'r') as f:
    content = f.read()

old_fam = """                    <input
                      type="text"
                      placeholder="อายุ"
                      value={fam.age || ''}
                      onChange={e => {
                        const newFam = editingVolunteer.family.map(f => f.id === fam.id ? {...f, age: e.target.value} : f);
                        setEditingVolunteer({...editingVolunteer, family: newFam});
                      }}
                      className="p-2 border border-gray-200 rounded-lg w-full sm:w-24"
                    />
                    <button"""

new_fam = """                    <input
                      type="text"
                      placeholder="อายุ"
                      value={fam.age || ''}
                      onChange={e => {
                        const newFam = editingVolunteer.family.map(f => f.id === fam.id ? {...f, age: e.target.value} : f);
                        setEditingVolunteer({...editingVolunteer, family: newFam});
                      }}
                      className="p-2 border border-gray-200 rounded-lg w-full sm:w-24"
                    />
                    <input
                      type="text"
                      placeholder="อาชีพ"
                      value={fam.job || ''}
                      onChange={e => {
                        const newFam = editingVolunteer.family.map(f => f.id === fam.id ? {...f, job: e.target.value} : f);
                        setEditingVolunteer({...editingVolunteer, family: newFam});
                      }}
                      className="p-2 border border-gray-200 rounded-lg w-full sm:w-48"
                    />
                    <button"""

if old_fam in content:
    content = content.replace(old_fam, new_fam)
else:
    print("WARNING: family field not found")

with open('src/components/Volunteers.tsx', 'w') as f:
    f.write(content)
