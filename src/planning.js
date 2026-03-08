const config = require('./config');

const PRIORITY_ORDER = {
  'Highest': 1,
  'High': 2,
  'Medium': 3,
  'Low': 4,
  'Lowest': 5,
};

function sortByPriority(tasks) {
  return tasks.sort((a, b) => {
    const priorityA = a.fields.priority?.name || 'Medium';
    const priorityB = b.fields.priority?.name || 'Medium';

    const orderA = PRIORITY_ORDER[priorityA] || 3;
    const orderB = PRIORITY_ORDER[priorityB] || 3;

    return orderA - orderB;
  });
}

function getStoryPoints(task) {
  const storyPointFields = [
    'customfield_10016',
    'customfield_10026',
    'customfield_10004',
  ];

  for (const field of storyPointFields) {
    if (task.fields[field] && typeof task.fields[field] === 'number') {
      return task.fields[field];
    }
  }

  return null;
}

function parseEstimate(estimate) {
  if (!estimate) return config.planning.defaultTaskHours;

  let hours = 0;
  const days = estimate.match(/(\d+)d/);
  const hoursMatch = estimate.match(/(\d+)h/);
  const minutes = estimate.match(/(\d+)m/);

  if (days) hours += parseInt(days[1]) * 8;
  if (hoursMatch) hours += parseInt(hoursMatch[1]);
  if (minutes) hours += Math.ceil(parseInt(minutes[1]) / 60);

  return hours || config.planning.defaultTaskHours;
}

function calculateWeeklyPlan(tasks) {
  const planningType = (config.planning.type || 'weekly').toLowerCase();
  const planningWeeks = Math.max(1, config.planning.weeks || 1);
  const planningDays = Math.max(1, config.planning.days || 1);
  const hoursPerUnit = planningType === 'daily' ? config.planning.dailyHours : config.planning.weeklyHours;
  const planningCount = planningType === 'daily' ? planningDays : planningWeeks;
  const planningMembers = Math.max(1, config.planning.members || 1);
  const defaultHours = config.planning.defaultTaskHours;
  const totalAvailableHours = hoursPerUnit * planningCount * planningMembers;
  let remainingHours = totalAvailableHours;

  const plannedTasks = [];
  const overflowTasks = [];
  const isBugMode = process.env.BUG_MODE === 'true';

  for (const task of tasks) {
    const issueType = task.fields.issuetype?.name || 'Unknown';
    const isTaskOrStory = ['Task', 'Story'].includes(issueType);
    
    let estimatedHours = defaultHours;

    // Bug mode: Không tính giờ cho bất kỳ task nào
    if (isBugMode) {
      estimatedHours = 0;
    }
    // Chỉ tính giờ cho Subtasks và Bugs (normal mode)
    else if (!isTaskOrStory) {
      const storyPoints = getStoryPoints(task);
      if (storyPoints) {
        estimatedHours = storyPoints;
      } else if (task.fields.timeestimate) {
        estimatedHours = Math.ceil(task.fields.timeestimate / 3600);
      } else if (task.fields.timetracking?.originalEstimate) {
        const estimate = task.fields.timetracking.originalEstimate;
        estimatedHours = parseEstimate(estimate);
      }
    } else {
      // Tasks & Stories không tính giờ
      estimatedHours = 0;
    }

    const taskInfo = {
      key: task.key,
      summary: task.fields.summary,
      priority: task.fields.priority?.name || 'Medium',
      status: task.fields.status?.name || 'Unknown',
      project: task.fields.project?.key || '',
      issueType: issueType,
      estimatedHours: estimatedHours,
      url: `${config.jira.host}/browse/${task.key}`,
    };

    // Bug mode: Tất cả bugs đều vào planned (không tính giờ, không overflow)
    if (isBugMode) {
      plannedTasks.push(taskInfo);
    }
    // Tasks & Stories luôn được thêm vào planned (không tính giờ)
    else if (isTaskOrStory) {
      plannedTasks.push(taskInfo);
    } 
    // Subtasks và Bugs: tính giờ như bình thường
    else {
      if (remainingHours >= estimatedHours) {
        plannedTasks.push(taskInfo);
        remainingHours -= estimatedHours;
      } else if (remainingHours > 0) {
        taskInfo.estimatedHours = remainingHours;
        taskInfo.partial = true;
        plannedTasks.push(taskInfo);
        remainingHours = 0;
        overflowTasks.push({ ...taskInfo, estimatedHours: estimatedHours - taskInfo.estimatedHours });
      } else {
        overflowTasks.push(taskInfo);
      }
    }
  }

  return {
    plannedTasks,
    overflowTasks,
    utilizedHours: totalAvailableHours - remainingHours,
    totalAvailableHours,
    planningWeeks,
    planningDays,
    planningType,
    planningCount,
    hoursPerUnit,
    planningMembers,
  };
}

module.exports = { sortByPriority, getStoryPoints, parseEstimate, calculateWeeklyPlan, PRIORITY_ORDER };
