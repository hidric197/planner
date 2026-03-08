require('dotenv').config();

const config = require('./config');
const { getPlannableTasks } = require('./jira');
const { sortByPriority, calculateWeeklyPlan, getStoryPoints } = require('./planning');
const { createDiscordMessages, sendToDiscord } = require('./discord');
const { createSlackMessages, sendToSlack } = require('./slack');

async function main() {
  try {
    console.log('🚀 Starting Jira Weekly Planner...\n');

    if (!config.jira.host || !config.jira.email || !config.jira.apiToken) {
      throw new Error('Missing Jira configuration. Please check .env file');
    }

    const hasDiscord = Boolean(config.discord.webhookUrl);
    const hasSlack = Boolean(config.slack.webhookUrl || config.slack.token);

    if (!hasDiscord && !hasSlack) {
      throw new Error('Missing notification destination. Please configure DISCORD_WEBHOOK_URL or SLACK_TOKEN/SLACK_WEBHOOK_URL');
    }

    if (hasSlack && !config.slack.webhookUrl && !config.slack.token) {
      throw new Error('Slack requires either SLACK_TOKEN or SLACK_WEBHOOK_URL');
    }

    if (hasSlack && config.slack.token && config.slack.channels.length === 0) {
      throw new Error('SLACK_CHANNELS is required when using SLACK_TOKEN');
    }

    const { tasks, storyKeys, directIssues, subtaskCount } = await getPlannableTasks();

    if (tasks.length === 0) {
      console.log('ℹ️  No tasks to plan');
      return;
    }

    if (storyKeys.length > 0) {
      console.log(`🔎 Found ${storyKeys.length} story/task parent(s), ${subtaskCount} subtask(s)`);
    }
    if (directIssues.length > 0) {
      console.log(`🧩 Using ${directIssues.length} direct issue(s) (bugs)`);
    }

    // Sort by priority BEFORE filtering (subtasks now have parent priority)
    console.log('🔄 Sorting tasks by priority...');
    const sortedTasks = sortByPriority(tasks);

    // Daily mode: Chỉ giữ lại Subtasks và Bugs (loại bỏ Story/Task)
    // Subtasks đã kế thừa priority từ parent nên sorting đã đúng
    let filteredTasks = sortedTasks;
    if (process.env.DAILY_MODE === 'true') {
      filteredTasks = sortedTasks.filter(task => {
        const issueType = task.fields.issuetype?.name || '';
        const isSubtask = issueType === 'Subtask' || issueType === 'Sub-task';
        const isBug = issueType.toLowerCase().includes('bug');
        return isSubtask || isBug;
      });
      console.log(`📅 Daily mode: Filtered to ${filteredTasks.length} subtasks/bugs (from ${sortedTasks.length} total)`);
      
      // Log priority distribution
      if (process.env.DEBUG === 'true') {
        const priorityCounts = {};
        filteredTasks.forEach(t => {
          const p = t.fields.priority?.name || 'Medium';
          priorityCounts[p] = (priorityCounts[p] || 0) + 1;
        });
        console.log('📊 Priority distribution:', priorityCounts);
      }
    }

    // Bug mode: List tất cả bugs, không tính giờ
    if (process.env.BUG_MODE === 'true') {
      console.log(`🐛 Bug mode: Listing all ${filteredTasks.length} bugs by status (no time limit)`);
      
      // Log status distribution
      const statusCounts = {};
      filteredTasks.forEach(t => {
        const s = t.fields.status?.name || 'Unknown';
        statusCounts[s] = (statusCounts[s] || 0) + 1;
      });
      console.log('📊 Status distribution:', statusCounts);
    }

    console.log('📊 Calculating time allocation...');
    const {
      plannedTasks,
      overflowTasks,
      utilizedHours,
      totalAvailableHours,
      planningWeeks,
      planningDays,
      planningType,
      planningCount,
      hoursPerUnit,
      planningMembers,
    } = calculateWeeklyPlan(filteredTasks);

    console.log(`\n📈 Results:`);
    console.log(`   - Tasks for this week: ${plannedTasks.length}`);
    console.log(`   - Backlog tasks: ${overflowTasks.length}`);
    const planningUnitLabel = planningType === 'daily' ? 'day' : 'week';
    console.log(`   - Planning: ${planningCount} ${planningUnitLabel}(s) × ${hoursPerUnit}h × ${planningMembers} member(s)`);
    console.log(`   - Time utilization: ${utilizedHours}h / ${totalAvailableHours}h\n`);

    const discordMessages = hasDiscord
      ? createDiscordMessages(plannedTasks, overflowTasks, utilizedHours, totalAvailableHours, planningWeeks, planningType, planningCount, hoursPerUnit)
      : [];
    const slackMessages = hasSlack
      ? createSlackMessages(plannedTasks, overflowTasks, utilizedHours, totalAvailableHours, planningWeeks, planningType, planningCount, hoursPerUnit)
      : [];

    if (hasDiscord) {
      console.log(`📨 Created ${discordMessages.length} Discord message(s)`);
    }
    if (hasSlack) {
      console.log(`📨 Created ${slackMessages.length} Slack message(s)`);
    }

    if (process.argv.includes('--dry-run')) {
      console.log('🔍 DRY RUN MODE - Not sending to Discord/Slack');
      if (hasDiscord) {
        console.log(`\nDiscord Messages Preview (${discordMessages.length} message(s)):`);
        discordMessages.forEach((msg, i) => {
          console.log(`\n=== Message ${i + 1}/${discordMessages.length} ===`);
          console.log(JSON.stringify(msg, null, 2));
        });
      }
      if (hasSlack) {
        console.log(`\nSlack Messages Preview (${slackMessages.length} message(s)):`);
        slackMessages.forEach((msg, i) => {
          console.log(`\n=== Message ${i + 1}/${slackMessages.length} ===`);
          console.log(JSON.stringify(msg, null, 2));
        });
      }
      return;
    }

    if (hasDiscord) {
      await sendToDiscord(discordMessages);
    }

    if (hasSlack) {
      await sendToSlack(slackMessages);
    }

    console.log('\n✨ Completed!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

module.exports = {
  main,
  getPlannableTasks,
  sortByPriority,
  calculateWeeklyPlan,
  getStoryPoints,
};
