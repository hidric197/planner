# 📅 Jira Weekly Planner

NodeJS script to automatically fetch tasks from Jira, sort by priority, allocate 40h/week, and send reports to Discord webhook.

## ✨ Features

- 📥 **Fetch tasks from Jira** using custom JQL queries
- 🎯 **Sort by priority** (Highest → High → Medium → Low → Lowest)
- ⏱️ **Calculate time allocation** based on 40h/week (customizable)
- 📊 **Display utilization rate** and backlog tasks
- 🎨 **Beautiful Discord embeds** with colors and emojis
- 💬 **Slack notifications** with channel selection
- 🔧 **Support time estimates** from Jira or use default values
- 📈 **Story Points support** for time estimation

## 📦 Installation

### 1. Clone or download project

```bash
cd /path/to/project
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configuration

Create `.env` file from template:

```bash
cp .env.example .env
```

Edit `.env` file with your information:

```env
# Jira Configuration
JIRA_HOST=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-jira-api-token

# Jira Project/Space - leave empty to fetch all projects
# Can be 1 project: PROJ
# Or multiple projects (comma-separated): PROJ1,PROJ2,PROJ3
JIRA_PROJECT=

# Jira Query - JQL to filter tasks (optional)
# Note: JIRA_PROJECT will be automatically added to JQL query
JIRA_JQL=assignee = currentUser() AND resolution = Unresolved

# Discord Configuration
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-url

# Slack Configuration (Choose one method)
# Method 1: Use Slack API with Bot Token (recommended)
SLACK_TOKEN=xoxb-your-bot-token
SLACK_CHANNELS=#general,#dev

# Method 2: Use Slack Webhook (legacy)
# SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url
# SLACK_CHANNELS=

# Weekly Planning Configuration
PLANNING_TYPE=weekly
WEEKLY_HOURS=40
DAILY_HOURS=8
DEFAULT_TASK_HOURS=4
PLANNING_WEEKS=1
PLANNING_DAYS=1
PLANNING_MEMBERS=1
```

## 🔑 Getting API Tokens

### Jira API Token

1. Visit: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **Create API token**
3. Name your token (e.g., "Weekly Planner")
4. Copy token and paste into `.env` file

### Discord Webhook URL

1. Go to your Discord Server
2. Select channel → **Edit Channel** → **Integrations** → **Webhooks**
3. Click **New Webhook** or copy URL from existing webhook
4. Paste URL into `.env` file

### Slack Configuration

**Method 1: Slack Bot Token (Recommended)**

1. Go to: https://api.slack.com/apps
2. Click **Create New App** → **From scratch**
3. Name your app (e.g., "Jira Planner") and select your workspace
4. Go to **OAuth & Permissions**
5. Add **Bot Token Scopes**:
   - `chat:write` - Send messages as bot
   - `chat:write.public` - Send to public channels without joining
6. Click **Install to Workspace** at the top
7. Copy the **Bot User OAuth Token** (starts with `xoxb-`)
8. Paste into `.env` as `SLACK_TOKEN=xoxb-...`
9. Set `SLACK_CHANNELS` with channels to post to (e.g., `#general,#dev`)

**Method 2: Slack Webhook (Legacy)**

1. Go to: https://api.slack.com/messaging/webhooks
2. Create an **Incoming Webhook**
3. Choose a default channel
4. Copy the webhook URL and paste into `.env` as `SLACK_WEBHOOK_URL`

**Note:** Using Bot Token allows posting to multiple channels and better control.

## 🚀 Usage

### Run script

```bash
npm start
```

Or:

```bash
node jira-weekly-planner.js
```

### Test mode (without sending to Discord)

```bash
npm test
```

Or:

```bash
node jira-weekly-planner.js --dry-run
```

## 🎯 Filter by Project/Space

### Fetch tasks from 1 specific project

```bash
JIRA_PROJECT=PROJ
JIRA_JQL=assignee = currentUser() AND resolution = Unresolved
```

### Fetch tasks from multiple projects

```bash
JIRA_PROJECT=PROJ1,PROJ2,PROJ3
JIRA_JQL=assignee = currentUser() AND resolution = Unresolved
```

### Fetch tasks from all projects

```bash
JIRA_PROJECT=
JIRA_JQL=assignee = currentUser() AND resolution = Unresolved
```

## 📝 Customize JQL Query

You can customize `JIRA_JQL` in `.env` file to filter tasks as needed:

```bash
# Fetch your unresolved tasks (default)
JIRA_JQL=assignee = currentUser() AND resolution = Unresolved

# Fetch tasks from current sprint
JIRA_JQL=sprint in openSprints() AND assignee = currentUser()

# Fetch high priority tasks
JIRA_JQL=priority in (Highest, High) AND status != Done

# Fetch all unresolved tasks (no assignee filter)
JIRA_JQL=resolution = Unresolved

# Leave empty to use default filter
JIRA_JQL=
```

**Note:** `JIRA_PROJECT` will be automatically added to the beginning of JQL query, you don't need to add `project = ...` in `JIRA_JQL`.

## ⚙️ Configuration Options

| Parameter            | Default     | Description                                     |
| -------------------- | ----------- | ----------------------------------------------- |
| `WEEKLY_HOURS`       | 40          | Total working hours per week                    |
| `DAILY_HOURS`        | 8           | Total working hours per day                     |
| `DEFAULT_TASK_HOURS` | 4           | Default hours for tasks without estimate        |
| `PLANNING_WEEKS`     | 1           | Number of weeks to schedule                     |
| `PLANNING_DAYS`      | 1           | Number of days to schedule (daily)              |
| `PLANNING_TYPE`      | weekly      | Planning mode: weekly or daily                  |
| `PLANNING_MEMBERS`   | 1           | Number of members (multiplies hours)            |
| `SLACK_TOKEN`        | _(empty)_   | Slack Bot User OAuth Token (recommended)        |
| `SLACK_WEBHOOK_URL`  | _(empty)_   | Slack Incoming Webhook URL (legacy)             |
| `SLACK_CHANNELS`     | _(empty)_   | Comma-separated Slack channels (required for token) |
| `JIRA_PROJECT`       | _(empty)_   | Project key(s) to filter, comma-separated       |
| `JIRA_JQL`           | _(dynamic)_ | Custom JQL query (if empty uses default filter) |

### 📋 Real-world Configuration Examples

#### Case 1: Your tasks in 1 project

```bash
JIRA_PROJECT=BACKEND
JIRA_JQL=assignee = currentUser() AND resolution = Unresolved
```

#### Case 2: Team tasks in multiple projects

```bash
JIRA_PROJECT=BACKEND,FRONTEND,MOBILE
JIRA_JQL=assignee in (user1, user2, user3) AND resolution = Unresolved
```

#### Case 3: Current sprint tasks of project

```bash
JIRA_PROJECT=BACKEND
JIRA_JQL=sprint in openSprints() AND assignee = currentUser()
```

#### Case 4: All your high priority tasks (all projects)

```bash
JIRA_PROJECT=
JIRA_JQL=assignee = currentUser() AND priority in (Highest, High) AND resolution = Unresolved
```

## 📊 Output Example

Script will send message to Discord with format:

```
📅 Jira Weekly Planner
Weekly Work Plan - Week 10 - Monday, March 9, 2026

⏰ Time Overview
📊 40h / 40h (100%)
🗓️ Planning: 1 week(s) × 40h
✅ Planned: 8 tasks
⏳ Backlog: 2 tasks

📝 Tasks for this week
1. 🔴 [PROJ-123](link) - Fix critical bug
   ⏱️ 8h

2. 🟠 [PROJ-124](link) - Implement new feature
   ⏱️ 6h

...
```

## 🤖 Automation

### Run weekly with cron

Add to crontab to run every Monday at 9 AM:

```bash
crontab -e
```

Add line:

```bash
0 9 * * 1 cd /path/to/jira-weekly-planner && /usr/local/bin/node jira-weekly-planner.js
```

### Run with GitHub Actions

Create file `.github/workflows/weekly-planner.yml`:

```yaml
name: Jira Weekly Planner

on:
  schedule:
    - cron: "0 9 * * 1" # Run every Monday at 9 AM
  workflow_dispatch: # Allow manual trigger

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm install
      - run: npm start
        env:
          JIRA_HOST: ${{ secrets.JIRA_HOST }}
          JIRA_EMAIL: ${{ secrets.JIRA_EMAIL }}
          JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
          JIRA_JQL: ${{ secrets.JIRA_JQL }}
          DISCORD_WEBHOOK_URL: ${{ secrets.DISCORD_WEBHOOK_URL }}
          WEEKLY_HOURS: 40
          DEFAULT_TASK_HOURS: 4
```

## 🛠️ Troubleshooting

### Jira authentication error

```
❌ Error fetching tasks from Jira: Unauthorized
```

**Solution:**

- Check if `JIRA_EMAIL` and `JIRA_API_TOKEN` are correct
- Ensure API token is still valid
- Check if `JIRA_HOST` has correct format (including https://)

### Discord sending error

```
❌ Error sending to Discord: Invalid Webhook Token
```

**Solution:**

- Check if `DISCORD_WEBHOOK_URL` is correct
- Ensure webhook hasn't been deleted in Discord

### No tasks found

```
ℹ️  No tasks to plan
```

**Solution:**

- Check if JQL query returns results
- Try accessing Jira web and run JQL query manually to verify

## 📄 License

ISC

## 🤝 Contributing

All contributions are welcome! Please create an issue or pull request.

---

Made with ❤️ for better productivity
