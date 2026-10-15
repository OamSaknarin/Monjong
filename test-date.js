const todayStr = '2026-08-10';
const tasks = [
  { id: '1', date: '2026-08-09', originalDate: '2026-08-09', status: 'ยังไม่ได้ทำ' }
];

let hasChanges = false;
const updatedTasks = tasks.map(task => {
  const origDate = task.originalDate || task.date;
  if (task.status !== 'ทำแล้ว' && origDate < todayStr) {
    if (task.date !== todayStr || task.originalDate !== origDate) {
      hasChanges = true;
      return { ...task, date: todayStr, originalDate: origDate };
    }
  } else {
    if (task.date !== origDate || task.originalDate !== origDate) {
      hasChanges = true;
      return { ...task, date: origDate, originalDate: origDate };
    }
  }
  return task;
});

console.log(updatedTasks);
