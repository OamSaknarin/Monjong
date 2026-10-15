import re

with open('src/components/Volunteers.tsx', 'r') as f:
    content = f.read()

old_start = """        {/* 1. Personal */}
        {profileSection === 'personal' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">"""

new_start = """        {/* 1. Personal */}
        {profileSection === 'personal' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-amber-50/30 p-5 rounded-2xl border border-amber-100/50">
              <label className="block text-sm font-bold text-amber-800 mb-4">ข้อมูลส่วนตัวเบื้องต้น</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">"""

content = content.replace(old_start, new_start)

# We need to close the `</div>` for this new block.
# Let's find the address section and insert a `</div>` before it.
old_addr = """              <div className="md:col-span-2 bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50">"""
new_addr = """              </div>\n              <div className="md:col-span-2 bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50">"""

content = content.replace(old_addr, new_addr)

with open('src/components/Volunteers.tsx', 'w') as f:
    f.write(content)
