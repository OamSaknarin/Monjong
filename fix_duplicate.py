with open('src/components/Expenses.tsx', 'r') as f:
    content = f.read()

target = "<span>{editingExpenseId ? 'บันทึกแก้ไขรายการ 💾' : 'บันทึกข้อมูลและปรับงบ 💾'}</span>"
idx = content.find(target)
if idx != -1:
    idx2 = content.find(")}", idx)
    clean = content[:idx2+2]
    with open('src/components/Expenses.tsx', 'w') as f:
        f.write(clean)
        f.write("\n    </div>\n  );\n}\n")
    print("Fixed with size:", len(clean))
else:
    print("Not found")

