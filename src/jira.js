const axios = require('axios');
const config = require('./config');

/**
 * Build JQL query from config
 */
function buildJQLQuery() {
  let jqlParts = [];

  if (config.jira.project) {
    const projects = config.jira.project.split(',').map(p => p.trim()).filter(p => p);
    if (projects.length === 1) {
      jqlParts.push(`project = ${projects[0]}`);
    } else if (projects.length > 1) {
      jqlParts.push(`project in (${projects.join(', ')})`);
    }
  }

  if (config.jira.jql) {
    jqlParts.push(config.jira.jql);
  } else {
    jqlParts.push('assignee = currentUser()');
    jqlParts.push('resolution = Unresolved');
  }

  const finalJQL = jqlParts.join(' AND ');
  console.log(`🔍 JQL Query: ${finalJQL}`);
  return finalJQL;
}

function addJqlFilter(baseJql, filter) {
  const orderByMatch = baseJql.match(/\s+ORDER\s+BY\s+.+$/i);
  const orderBy = orderByMatch ? orderByMatch[0] : '';
  const coreJql = orderBy ? baseJql.slice(0, -orderBy.length) : baseJql;
  const trimmedCore = coreJql.trim();
  const trimmedFilter = filter.trim();
  const combined = trimmedCore ? `(${trimmedCore}) AND ${trimmedFilter}` : trimmedFilter;
  return `${combined}${orderBy}`;
}

async function fetchJiraIssues(jql, fields, label = 'tasks') {
  try {
    console.log(`📥 Fetching ${label} from Jira...`);

    const auth = Buffer.from(`${config.jira.email}:${config.jira.apiToken}`).toString('base64');

    const response = await axios({
      method: 'POST',
      url: `${config.jira.host}/rest/api/3/search/jql`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      data: {
        jql: jql,
        maxResults: 100,
        fields: fields,
      },
    });

    console.log(`✅ Fetched ${response.data.issues.length} ${label} from Jira`);
    return response.data.issues;
  } catch (error) {
    console.error('❌ Error fetching tasks from Jira:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Fetch task list from Jira (legacy)
 */
async function getJiraTasks() {
  const jql = buildJQLQuery();
  return fetchJiraIssues(
    jql,
    ['summary', 'status', 'priority', 'assignee', 'timetracking', 'issuetype', 'timeestimate', 'project', 'customfield_10016', 'customfield_10026'],
    'tasks'
  );
}

/**
 * Fetch Story list from Jira
 */
async function getJiraStories() {
  const baseJql = buildJQLQuery();
  const storyJql = addJqlFilter(baseJql, `issuetype IN (${config.jira.issueTypes})`);
  return fetchJiraIssues(
    storyJql,
    ['summary', 'status', 'priority', 'assignee', 'issuetype', 'project'],
    'stories'
  );
}

/**
 * Fetch Sub-task list from Jira by story keys
 */
async function getJiraSubtasks(parentKeys) {
  if (!parentKeys || parentKeys.length === 0) return [];

  const fields = ['summary', 'status', 'priority', 'assignee', 'timetracking', 'issuetype', 'timeestimate', 'project', 'parent', 'customfield_10016', 'customfield_10026'];
  const chunks = [];
  const chunkSize = 50;

  for (let i = 0; i < parentKeys.length; i += chunkSize) {
    chunks.push(parentKeys.slice(i, i + chunkSize));
  }

  let allSubtasks = [];
  for (const chunk of chunks) {
    const jql = `parent in (${chunk.join(', ')}) AND issuetype IN (Subtask, Sub-task) AND status NOT IN (Cancelled, Done, "Under Review", "UNDER REVIEW", "READY FOR TESTING", TESTING, Testing)`;
    const subtasks = await fetchJiraIssues(jql, fields, 'subtasks');
    allSubtasks = allSubtasks.concat(subtasks);
  }

  return allSubtasks;
}

/**
 * Fetch issues for planning with special handling for Bug types
 */
async function getPlannableTasks() {
  const baseJql = buildJQLQuery();
  const fields = ['summary', 'status', 'priority', 'assignee', 'timetracking', 'issuetype', 'timeestimate', 'project', 'parent', 'customfield_10016', 'customfield_10026'];

  const issues = await fetchJiraIssues(baseJql, fields, 'issues');
  if (issues.length === 0) {
    return { tasks: [], storyKeys: [], directIssues: [], subtaskCount: 0 };
  }

  const storyTypes = new Set(['Story', 'Task']);
  const bugTypes = new Set(['Bug', 'Development Bug', 'Production Bug']);

  const storyKeys = [];
  const storyIssues = [];
  const directIssues = [];
  const parentMap = {}; // Map parent key to parent issue for priority inheritance

  for (const issue of issues) {
    const issueType = issue.fields.issuetype?.name || '';

    if (storyTypes.has(issueType)) {
      storyKeys.push(issue.key);
      storyIssues.push(issue);
      // Store parent info for subtasks to inherit priority
      parentMap[issue.key] = issue;
    } else if (bugTypes.has(issueType) || issueType.toLowerCase().includes('bug')) {
      directIssues.push(issue);
    } else {
      // Other types (if any)
      directIssues.push(issue);
    }
  }

  const subtasks = await getJiraSubtasks(storyKeys);
  
  // Inherit priority from parent for subtasks
  for (const subtask of subtasks) {
    const parentKey = subtask.fields.parent?.key;
    if (parentKey && parentMap[parentKey]) {
      const parentPriority = parentMap[parentKey].fields.priority;
      if (parentPriority) {
        // Override subtask priority with parent priority
        subtask.fields.priority = parentPriority;
        // Add parent info for reference
        subtask.parentPriority = parentPriority.name;
      }
    }
  }
  
  // Combine Story/Task + Bugs + Subtasks
  const allTasks = storyIssues.concat(directIssues).concat(subtasks);
  
  return {
    tasks: allTasks,
    storyKeys,
    directIssues,
    subtaskCount: subtasks.length,
  };
}

module.exports = { buildJQLQuery, addJqlFilter, getJiraTasks, getJiraStories, getJiraSubtasks, getPlannableTasks };
