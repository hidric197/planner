function getWeekOfYear(date = new Date()) {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - startOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
}

function truncateText(text, maxLength = 1024) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 20) + '\n\n*...truncated*';
}

function chunkTasks(tasks, maxLength = 800) {
  const chunks = [];
  let currentChunk = [];
  let currentLength = 0;

  for (const task of tasks) {
    const taskLength = task.summary.length + task.key.length + 100;

    if (currentLength + taskLength > maxLength && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [task];
      currentLength = taskLength;
    } else {
      currentChunk.push(task);
      currentLength += taskLength;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function groupTasksByTypeAndStatus(tasks) {
  const taskStories = tasks.filter(t => {
    const type = t.issueType || '';
    return ['Task', 'Story'].includes(type);
  });
  
  const bugs = tasks.filter(t => {
    const type = t.issueType || '';
    return type.toLowerCase().includes('bug');
  });
  
  const subtasks = tasks.filter(t => {
    const type = t.issueType || '';
    return type === 'Subtask' || type === 'Sub-task';
  });

  const groupByStatus = (items) => {
    const grouped = {};
    items.forEach(item => {
      if (!grouped[item.status]) {
        grouped[item.status] = [];
      }
      grouped[item.status].push(item);
    });
    return grouped;
  };

  return {
    taskStories: {
      total: taskStories.length,
      byStatus: groupByStatus(taskStories),
    },
    subtasks: {
      total: subtasks.length,
      byStatus: groupByStatus(subtasks),
    },
    bugs: {
      total: bugs.length,
      byStatus: groupByStatus(bugs),
    },
  };
}

module.exports = { getWeekOfYear, truncateText, chunkTasks, groupTasksByTypeAndStatus };
