import re

with open('src/components/Volunteers.tsx', 'r') as f:
    content = f.read()

# Change license block color
content = content.replace(
    '<div className="md:col-span-2 bg-gray-50/50 p-4 rounded-xl border border-gray-100">\n                <label className="block text-sm font-bold text-gray-700 mb-3">ใบอนุญาตขับขี่</label>',
    '<div className="md:col-span-2 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50">\n                <label className="block text-sm font-bold text-indigo-800 mb-3">ใบอนุญาตขับขี่</label>'
)

# Family block color
content = content.replace(
    '<div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100">',
    '<div className="bg-purple-50/50 p-5 rounded-2xl border border-purple-100/50">',
    1 # Only first one for family, the next one is for photo album
)

content = content.replace(
    '<h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">',
    '<h3 className="font-bold text-lg text-purple-800 flex items-center gap-2">',
    1
)

with open('src/components/Volunteers.tsx', 'w') as f:
    f.write(content)
