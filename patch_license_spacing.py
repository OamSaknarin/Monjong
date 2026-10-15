import re

with open('src/components/Volunteers.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '<div className="md:col-span-2 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50">',
    '<div className="md:col-span-2 bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100/50">'
)
content = content.replace('md:grid-cols-4 gap-4 mt-4', 'md:grid-cols-4 gap-5 mt-5')
content = content.replace('md:grid-cols-2 gap-4', 'md:grid-cols-2 gap-5')

with open('src/components/Volunteers.tsx', 'w') as f:
    f.write(content)
