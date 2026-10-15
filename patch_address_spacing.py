import re

with open('src/components/Volunteers.tsx', 'r') as f:
    content = f.read()

content = content.replace('md:grid-cols-5 gap-4', 'md:grid-cols-5 gap-5')
content = content.replace('className="w-full p-2 border border-gray-200', 'className="w-full p-2.5 border border-gray-200')

with open('src/components/Volunteers.tsx', 'w') as f:
    f.write(content)
