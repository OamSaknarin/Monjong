import re

with open('src/components/Expenses.tsx', 'r') as f:
    content = f.read()

# The sed command inserted this block before every "    </div>"
# The block starts with "      {/* --- VIEW DETAIL MODAL --- */}"
# and ends with "        document.body\n      )}"

pattern = re.compile(r'\s*\{\/\* --- VIEW DETAIL MODAL --- \*\/\}.*?document\.body\s*\)\}', re.DOTALL)

clean_content = re.sub(pattern, '', content)

with open('src/components/Expenses.tsx', 'w') as f:
    f.write(clean_content)

print(f"Cleaned content. Original length: {len(content)}, New length: {len(clean_content)}")
