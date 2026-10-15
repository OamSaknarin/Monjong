with open('src/components/Expenses.tsx', 'r') as f:
    content = f.read()

idx = content.find('nt-bold text-gray-700')
if idx != -1:
    clean = content[:idx]
    with open('src/components/Expenses.tsx', 'w') as f:
        f.write(clean)
    print("Fixed tail end")
