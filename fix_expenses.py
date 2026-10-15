import re

with open('src/components/Expenses.tsx', 'r') as f:
    content = f.read()

match = re.search(r'<span>\{editingExpenseId \?', content)
if match:
    idx = content.find('document.body', match.end())
    idx2 = content.find(')}', idx)
    clean_content = content[:idx2+2]
    with open('src/components/Expenses.tsx', 'w') as f:
        f.write(clean_content)
        f.write("\n    </div>\n  );\n}\n")
    print("Fixed successfully")
else:
    print("Pattern not found")
