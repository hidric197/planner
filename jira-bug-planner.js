#!/usr/bin/env node

// Bug planner: Lấy TẤT CẢ Production Bug và Development Bug
// List all bugs, chia theo status, sort theo priority
// KHÔNG giới hạn thời gian, KHÔNG loại trừ status
JIRA_JQL='project = "CCR" AND status NOT IN (Cancelled, Done) AND type IN ("Development Bug", "Production Bug") AND labels IN (C-CMS, C-report) and "team[team]" = 96c2b102-d1ee-4a81-b556-32fa4a76d592 ORDER BY priority DESC';

process.env.JIRA_JQL = JIRA_JQL;
process.env.JIRA_ISSUE_TYPES = 'Production Bug, Development Bug';

// Bug mode: List tất cả bugs, không tính giờ, không giới hạn
process.env.BUG_MODE = 'true';

if (!process.env.PLANNING_TYPE) {
  process.env.PLANNING_TYPE = 'weekly';
}

if (!process.env.PLANNING_WEEKS) {
  process.env.PLANNING_WEEKS = '1';
}

const { main } = require('./src/main');

if (require.main === module) {
  main();
}

module.exports = require('./src/main');
