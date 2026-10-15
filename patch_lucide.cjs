const fs = require('fs');
let content = fs.readFileSync('src/components/TaskSchedule.tsx', 'utf8');
content = content.replace(
  /import \{ (.*) \} from 'lucide-react';/,
  "import { $1, Printer } from 'lucide-react';"
);
fs.writeFileSync('src/components/TaskSchedule.tsx', content);
