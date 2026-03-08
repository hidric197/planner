require('dotenv').config();

const config = {
  jira: {
    host: process.env.JIRA_HOST,
    email: process.env.JIRA_EMAIL,
    apiToken: process.env.JIRA_API_TOKEN,
    project: process.env.JIRA_PROJECT || '',
    jql: process.env.JIRA_JQL || '',
    issueTypes: (process.env.JIRA_ISSUE_TYPES || 'Story, Task')
  },
  discord: {
    webhookUrl: process.env.DISCORD_WEBHOOK_URL,
  },
  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL,
    token: process.env.SLACK_TOKEN,
    channels: (process.env.SLACK_CHANNELS || '')
      .split(',')
      .map(channel => channel.trim())
      .filter(Boolean),
  },
  planning: {
    type: (process.env.PLANNING_TYPE || 'weekly').toLowerCase(),
    weeklyHours: parseInt(process.env.WEEKLY_HOURS) || 40,
    dailyHours: parseInt(process.env.DAILY_HOURS) || 8,
    defaultTaskHours: parseInt(process.env.DEFAULT_TASK_HOURS) || 4,
    weeks: parseInt(process.env.PLANNING_WEEKS) || 1,
    days: parseInt(process.env.PLANNING_DAYS) || 1,
    members: parseInt(process.env.PLANNING_MEMBERS) || 1,
  },
};

module.exports = config;
