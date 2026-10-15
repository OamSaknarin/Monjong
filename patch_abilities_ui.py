import re

with open('src/components/Volunteers.tsx', 'r') as f:
    content = f.read()

old_ability = """              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1.5">ความสามารถพิเศษ</label>
                <input
                  type="text"
                  value={editingVolunteer.specialAbility || ''}
                  onChange={e => setEditingVolunteer({...editingVolunteer, specialAbility: e.target.value})}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>"""

new_ability = """              <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-100/50">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-bold text-orange-800">ความสามารถพิเศษ</label>
                  <button
                    onClick={() => setEditingVolunteer({
                      ...editingVolunteer,
                      specialAbilities: [...(editingVolunteer.specialAbilities || []), { id: generateId(), detail: '' }]
                    })}
                    className="text-orange-600 bg-orange-100/50 hover:bg-orange-200 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> เพิ่มความสามารถ
                  </button>
                </div>
                
                <div className="space-y-3">
                  {(!editingVolunteer.specialAbilities || editingVolunteer.specialAbilities.length === 0) ? (
                    <p className="text-gray-400 text-sm text-center py-2">ยังไม่ได้ระบุความสามารถพิเศษ</p>
                  ) : editingVolunteer.specialAbilities.map(ability => (
                    <div key={ability.id} className="flex gap-2 items-center bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                      <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold shrink-0">
                        {editingVolunteer.specialAbilities!.findIndex(a => a.id === ability.id) + 1}
                      </div>
                      <input
                        type="text"
                        placeholder="ระบุความสามารถพิเศษ..."
                        value={ability.detail || ''}
                        onChange={e => {
                          const newAbilities = editingVolunteer.specialAbilities!.map(a => a.id === ability.id ? {...a, detail: e.target.value} : a);
                          setEditingVolunteer({...editingVolunteer, specialAbilities: newAbilities});
                        }}
                        className="p-2 border-transparent bg-transparent rounded-lg flex-1 w-full focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                      />
                      <button
                        onClick={() => {
                          const newAbilities = editingVolunteer.specialAbilities!.filter(a => a.id !== ability.id);
                          setEditingVolunteer({...editingVolunteer, specialAbilities: newAbilities});
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>"""

if old_ability in content:
    content = content.replace(old_ability, new_ability)
else:
    print("Not found old_ability")

with open('src/components/Volunteers.tsx', 'w') as f:
    f.write(content)
