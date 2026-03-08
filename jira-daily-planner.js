#!/usr/bin/env node

// Daily planner: Lấy Story/Task để tìm subtasks + lấy Bugs trực tiếp
// 1. Lấy Story/Task (có sprint, team) để tìm parent keys → lấy subtasks của chúng
// 2. Lấy Production Bug, Development Bug trực tiếp (có sprint, team)
// 3. Kết quả cuối chỉ giữ lại Subtasks và Bugs, loại bỏ Story/Task
JIRA_JQL = 'project = "CCR" AND status NOT IN (Cancelled, Done, "UNDER REVIEW", "READY FOR TESTING", Testing) AND type IN (Story, Task, "Production Bug", "Development Bug") AND sprint = 170 AND labels IN (C-CMS, C-report) AND "team[team]" = 96c2b102-d1ee-4a81-b556-32fa4a76d592 ORDER BY priority DESC';

process.env.JIRA_JQL = JIRA_JQL;
process.env.JIRA_ISSUE_TYPES = 'Story, Task, Production Bug, Development Bug';

// Flag để chỉ giữ lại Subtasks và Bugs trong kết quả
process.env.DAILY_MODE = 'true';

process.env.DEFAULT_TASK_HOURS = 3;

if (!process.env.PLANNING_TYPE) {
  process.env.PLANNING_TYPE = 'daily';
}

if (!process.env.PLANNING_DAYS) {
  process.env.PLANNING_DAYS = '1';
}

const { main } = require('./src/main');

if (require.main === module) {
  main();
}

module.exports = require('./src/main');
