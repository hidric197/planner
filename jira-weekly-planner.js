#!/usr/bin/env node

// Lấy tất cả Story, Task, Bug nhưng loại bỏ các status đã hoàn thành/đang review/testing
JIRA_JQL = 'project = CCR AND labels IN (C-report, C-CMS) AND status NOT IN (Cancelled, Done, "Under Review", "UNDER REVIEW", "READY FOR TESTING", TESTING, Testing) AND type IN (Story, Task, Bug, "Production Bug", "Development Bug") AND sprint = 170 AND "team[team]" = 96c2b102-d1ee-4a81-b556-32fa4a76d592 ORDER BY priority DESC';

process.env.JIRA_JQL = JIRA_JQL;

// Bao gồm cả Bug để lấy đầy đủ
process.env.JIRA_ISSUE_TYPES = 'Story, Task, Bug, Production Bug, Development Bug';

if (!process.env.PLANNING_TYPE) {
  process.env.PLANNING_TYPE = 'weekly';
}

if (!process.env.PLANNING_WEEKS) {
  process.env.PLANNING_WEEKS = '1';
}

if (!process.env.WEEKLY_HOURS) {
  process.env.WEEKLY_HOURS = '30';
}

const { main } = require('./src/main');

if (require.main === module) {
  main();
}

module.exports = require('./src/main');
