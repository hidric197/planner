const axios = require('axios');
const config = require('./config');
const { getWeekOfYear, groupTasksByTypeAndStatus } = require('./utils');

function formatSlackTaskItem(task, showHours = true) {
  const priorityTag = {
    'Highest': 'Highest',
    'High': 'High',
    'Medium': 'Medium',
    'Low': 'Low',
    'Lowest': 'Lowest',
  }[task.priority] || 'Medium';

  const partialTag = task.partial ? ' *(partial)*' : '';
  const summary = task.summary.length > 70 ? task.summary.substring(0, 67) + '...' : task.summary;
  const hoursInfo = showHours ? ` ⏱️ ${task.estimatedHours}h${partialTag}` : '';
  
  return `[${priorityTag}] <${task.url}|${task.key}> | ${summary}${hoursInfo}`;
}

function createSlackMessages(plannedTasks, overflowTasks, utilizedHours, totalAvailableHours, planningWeeks, planningType, planningCount, hoursPerUnit) {
  const messages = [];
  const effectiveTotalHours = totalAvailableHours || (hoursPerUnit * (planningCount || 1));
  const utilizationPercent = Math.round((utilizedHours / effectiveTotalHours) * 100);
  const planningMembers = Math.max(1, config.planning.members || 1);
  const isBugMode = process.env.BUG_MODE === 'true';

  const now = new Date();
  const weekOfYear = getWeekOfYear(now);
  const endWeekOfYear = planningWeeks > 1 ? weekOfYear + planningWeeks - 1 : weekOfYear;
  const weekLabel = planningType === 'daily'
    ? `Daily Plan - Week ${weekOfYear}`
    : (planningWeeks > 1 ? `Weeks ${weekOfYear}-${endWeekOfYear}` : `Week ${weekOfYear}`);
  const planningUnitLabel = planningType === 'daily' ? 'day' : 'week';
  const currentDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const channels = config.slack.channels.length > 0 ? config.slack.channels : [null];
  const grouped = groupTasksByTypeAndStatus(plannedTasks);

  // Bug mode: Different overview
  const overviewText = isBugMode
    ? `*🐛 All Bugs Report - ${currentDate}*\n` +
      `📊 Total: *${plannedTasks.length} bugs*`
    : `*Weekly Work Plan - ${weekLabel} - ${currentDate}*\n` +
      `📊 *${utilizedHours}h / ${effectiveTotalHours}h* (${utilizationPercent}%)\n` +
      `🗓️ Planning: ${planningCount} ${planningUnitLabel}(s) × ${hoursPerUnit}h × ${planningMembers} member(s)\n` +
      `⏳ Backlog: ${overflowTasks.length} tasks`;

  // Debug: Log issue types
  if (process.env.DEBUG === 'true') {
    const issueTypes = [...new Set(plannedTasks.map(t => t.issueType))];
    console.log('📊 Issue types found:', issueTypes);
    console.log('📊 Grouped counts:', {
      taskStories: grouped.taskStories.total,
      bugs: grouped.bugs.total,
      subtasks: grouped.subtasks.total,
    });
  }

  for (const channel of channels) {
    const blocks = [
      { type: 'section', text: { type: 'mrkdwn', text: overviewText } },
      { type: 'divider' },
    ];

    // Task/Story section (no hours)
    if (grouped.taskStories.total > 0) {
      let taskStoriesText = `*📋 Tasks & Stories* (${grouped.taskStories.total} total)\n\n`;
      
      Object.entries(grouped.taskStories.byStatus).forEach(([status, tasks]) => {
        taskStoriesText += `*${status}* (${tasks.length}):\n`;
        tasks.forEach(task => {
          taskStoriesText += `• ${formatSlackTaskItem(task, false)}\n`;
        });
        taskStoriesText += '\n';
      });

      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: taskStoriesText.trim() }
      });
    }

    // Bug section (with hours)
    if (grouped.bugs.total > 0) {
      let bugsText = `*🐛 Bugs* (${grouped.bugs.total} total)\n\n`;
      
      Object.entries(grouped.bugs.byStatus).forEach(([status, tasks]) => {
        bugsText += `*${status}* (${tasks.length}):\n`;
        tasks.forEach(task => {
          bugsText += `• ${formatSlackTaskItem(task, true)}\n`;
        });
        bugsText += '\n';
      });

      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: bugsText.trim() }
      });
    }

    // Subtask section (with hours)
    if (grouped.subtasks.total > 0) {
      let subtasksText = `*🔧 Subtasks* (${grouped.subtasks.total} total)\n\n`;
      
      Object.entries(grouped.subtasks.byStatus).forEach(([status, tasks]) => {
        subtasksText += `*${status}* (${tasks.length}):\n`;
        tasks.forEach(task => {
          subtasksText += `• ${formatSlackTaskItem(task, true)}\n`;
        });
        subtasksText += '\n';
      });

      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: subtasksText.trim() }
      });
    }

    const message = {
      text: isBugMode ? `All Bugs Report - ${currentDate}` : `Weekly Work Plan - ${weekLabel}`,
      blocks: blocks,
    };

    if (channel) {
      message.channel = channel;
    }

    messages.push(message);
  }

  return messages;
}

async function sendToSlack(messages) {
  try {
    console.log(`📤 Sending ${messages.length} report(s) to Slack...`);

    if (process.env.DEBUG === 'true') {
      console.log('Debug - Slack Messages:', JSON.stringify(messages, null, 2));
    }

    // Use Slack API with token if available, otherwise fallback to webhook
    if (config.slack.token) {
      const tokenType = config.slack.token.substring(0, 5);
      console.log(`Using Slack API with token (${tokenType.substring(0, 4)}-)...`);
      
      // Check token type and warn if not bot token
      if (!config.slack.token.startsWith('xoxb-')) {
        console.log('⚠️  Warning: Using non-bot token. Bot tokens (xoxb-) are recommended.');
        console.log('   User tokens may have limited functionality. See README for setup instructions.');
      }

      for (let i = 0; i < messages.length; i++) {
        const payload = { ...messages[i] };
        
        // For user tokens, try adding as_user parameter
        if (config.slack.token.startsWith('xoxp-')) {
          payload.as_user = false; // Post as app, not as user
        }

        const response = await axios.post(
          'https://slack.com/api/chat.postMessage',
          payload,
          {
            headers: {
              'Authorization': `Bearer ${config.slack.token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.data.ok) {
          let errorMsg = `Slack API error: ${response.data.error}`;
          
          // Provide helpful error messages
          if (response.data.error === 'not_allowed_token_type') {
            errorMsg += '\n\n💡 This error usually means you need a Bot Token (xoxb-) instead of a User Token (xoxp-).\n';
            errorMsg += '   To fix this:\n';
            errorMsg += '   1. Go to https://api.slack.com/apps\n';
            errorMsg += '   2. Select your app (or create new one)\n';
            errorMsg += '   3. Go to "OAuth & Permissions"\n';
            errorMsg += '   4. Add Bot Token Scopes: chat:write, chat:write.public\n';
            errorMsg += '   5. Install/Reinstall app to workspace\n';
            errorMsg += '   6. Copy "Bot User OAuth Token" (starts with xoxb-)\n';
            errorMsg += '   7. Update SLACK_TOKEN in your .env file\n';
          } else if (response.data.error === 'channel_not_found') {
            errorMsg += `\n💡 Channel "${messages[i].channel}" not found. Make sure:\n`;
            errorMsg += '   - Channel name is correct (include # for public channels)\n';
            errorMsg += '   - Bot has been added to the channel\n';
            errorMsg += '   - Or use chat:write.public scope to post without joining\n';
          } else if (response.data.error === 'missing_scope') {
            errorMsg += '\n💡 Missing required permissions. Add these scopes to your bot:\n';
            errorMsg += '   - chat:write (to send messages)\n';
            errorMsg += '   - chat:write.public (to post to channels without joining)\n';
          }
          
          throw new Error(errorMsg);
        }

        console.log(`✅ Sent Slack message ${i + 1}/${messages.length} to channel: ${messages[i].channel}`);

        if (i < messages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } else if (config.slack.webhookUrl) {
      console.log('Using Slack webhook...');
      
      for (let i = 0; i < messages.length; i++) {
        await axios.post(config.slack.webhookUrl, messages[i]);
        console.log(`✅ Sent Slack message ${i + 1}/${messages.length}`);

        if (i < messages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } else {
      throw new Error('No Slack configuration found. Please set SLACK_TOKEN or SLACK_WEBHOOK_URL');
    }

    console.log('✅ Successfully sent all Slack reports!');
  } catch (error) {
    console.error('❌ Error sending to Slack:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

module.exports = { createSlackMessages, sendToSlack };
