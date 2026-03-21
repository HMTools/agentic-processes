# Cursor Plugins Guide

> **Source:** https://cursor.com/docs/plugins  
> **Captured:** March 8, 2026  
> **Sections:** Full page capture

---

## Table of Contents

1. [Overview](#overview)
2. [What Plugins Contain](#what-plugins-contain)
3. [The Marketplace](#the-marketplace)
4. [Team Marketplaces](#team-marketplaces)
   - [Required vs Optional Plugins](#required-vs-optional-plugins)
   - [How Distribution Groups Work with SCIM](#how-distribution-groups-work-with-scim)
5. [Add a Team Marketplace](#add-a-team-marketplace)
6. [Where Developers Find Team Marketplaces](#where-developers-find-team-marketplaces)
7. [Installing Plugins](#installing-plugins)
   - [MCP Apps Deeplinks](#mcp-apps-deeplinks)
8. [Managing Installed Plugins](#managing-installed-plugins)
   - [MCP Servers](#mcp-servers)
   - [Rules and Skills](#rules-and-skills)
9. [Creating Plugins](#creating-plugins)
10. [FAQ](#faq)

---

## Overview

Plugins package rules, skills, agents, commands, MCP servers, and hooks into distributable bundles. They work in the Cursor IDE. Browse community-built plugins or build your own to share with other developers.

> **Note:** Cursor CLI does not support plugins yet. Only MCP servers from plugins are supported in Cloud Agents.

---

## What Plugins Contain

A plugin can bundle any combination of these components:

| Component       | Description                                                |
| :-------------- | :--------------------------------------------------------- |
| **Rules**       | Persistent AI guidance and coding standards (`.mdc` files) |
| **Skills**      | Specialized agent capabilities for complex tasks           |
| **Agents**      | Custom agent configurations and prompts                    |
| **Commands**    | Agent-executable command files                             |
| **MCP Servers** | Model Context Protocol integrations                        |
| **Hooks**       | Automation scripts triggered by events                     |

---

## The Marketplace

The [Cursor Marketplace](https://cursor.com/marketplace) is where you discover and install plugins. Plugins are distributed as Git repositories and submitted through the Cursor team. Every plugin is [manually reviewed](https://cursor.com/help/security-and-privacy/marketplace-security) before it's listed. Browse available plugins at [cursor.com/marketplace](https://cursor.com/marketplace) or search by keyword in the marketplace panel.

---

## Team Marketplaces

Team marketplaces are available on Teams and Enterprise plans.

- **Teams plan:** up to 1 team marketplace
- **Enterprise plan:** unlimited team marketplaces

On eligible accounts, the **Team Marketplaces** section appears below **Plugins** in dashboard settings. If you do not see it yet, rollout may still be in progress for your account.

On Enterprise plans, only admins can add team marketplaces from **Dashboard → Settings → Plugins**.

### Required vs Optional Plugins

When you assign a plugin to a distribution group, you can set it as required or optional:

- **Required:** After you click **Save**, the plugin is installed automatically for everyone in that distribution group.
- **Optional:** The plugin is available to everyone in that distribution group, and each developer can choose whether to install it.

### How Distribution Groups Work with SCIM

Distribution groups can be controlled with [SCIM](https://cursor.com/docs/account/teams/scim)-synced directory groups. If your organization uses SCIM, manage group membership in your identity provider, and Cursor will sync those group updates.

---

## Add a Team Marketplace

Use this flow to import a GitHub repository as a team marketplace:

1. Go to **Dashboard → Settings → Plugins**.
2. In **Team Marketplaces**, click **Import**.
3. Paste the GitHub repository URL and continue.
4. Review the parsed plugins. Optionally set Team Access groups, then continue.
5. Set the marketplace name and description, then save.

**Example repository to try:**

- [fieldsphere/cursor-team-marketplace-template](https://github.com/fieldsphere/cursor-team-marketplace-template)

---

## Where Developers Find Team Marketplaces

Developers can find team marketplaces in the marketplace panel in Cursor.

1. Open the marketplace panel in Cursor.
2. Look for plugins from your team marketplace.
3. Install optional plugins directly from that panel.
4. Required plugins are installed automatically when admins save the required setting for your distribution group.

---

## Installing Plugins

Install plugins from the marketplace. Plugins can be scoped to a project or installed at the user level.

### MCP Apps Deeplinks

Share MCP server configurations using install links:

```text
cursor://anysphere.cursor-deeplink/mcp/install?name=$NAME&config=$BASE64_ENCODED_CONFIG
```

See [MCP install links](https://cursor.com/docs/mcp/install-links) for details on generating these links.

---

## Managing Installed Plugins

### MCP Servers

Toggle MCP servers on or off from Cursor Settings:

1. Open Settings (`Ctrl+Shift+J` / `Cmd+Shift+J`)
2. Go to **Features** > **Model Context Protocol**
3. Click the toggle next to any server

Disabled servers won't load or appear in chat.

### Rules and Skills

Manage rules and skills from the Rules section of Cursor Settings. Toggle individual rules between **Always**, **Agent Decides**, and **Manual** modes. Skills appear in the **Agent Decides** section and can be invoked manually with `/skill-name` in chat.

---

## Creating Plugins

A plugin is a directory with a `.cursor-plugin/plugin.json` manifest and your components (rules, skills, agents, commands, hooks, or MCP servers). Start from the [plugin template repository](https://github.com/cursor/plugin-template) or create one from scratch:

### Directory Structure

```text
my-plugin/
├── .cursor-plugin/
│   └── plugin.json
├── rules/
│   └── coding-standards.mdc
├── skills/
│   └── code-reviewer/
│       └── SKILL.md
└── .mcp.json
```

### Minimal Manifest

The manifest only requires a `name` field. Components are discovered automatically from their default directories, or you can specify custom paths in the manifest.

```json
{
  "name": "my-plugin",
  "description": "Custom development tools",
  "version": "1.0.0",
  "author": { "name": "Your Name" }
}
```

### Publishing

When your plugin is ready, submit it for review at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish). For multi-plugin repositories, add a marketplace manifest at `.cursor-plugin/marketplace.json`.

See the [Plugins reference](https://cursor.com/docs/reference/plugins) for the full manifest schema, component formats, and submission checklist.

---

## FAQ

### Are marketplace plugins reviewed for security?

Yes. Every plugin is manually reviewed before it's listed. All plugins must be open source, and we review each update before publishing. See [Marketplace security](https://cursor.com/help/security-and-privacy/marketplace-security) for details on vetting, update reviews, and how to report issues.

### How do I create a plugin?

Create a directory with a `.cursor-plugin/plugin.json` manifest file, add your rules, skills, agents, commands, or other components, and submit it to the Cursor team. See the [Plugins reference](https://cursor.com/docs/reference/plugins) for the full guide.

---

*This summary was automatically generated from https://cursor.com/docs/plugins*
