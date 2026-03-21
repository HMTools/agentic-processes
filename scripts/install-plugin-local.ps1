<#
.SYNOPSIS
    Installs the agentic-processes plugin locally for testing in Cursor.

.DESCRIPTION
    Copies plugin files to ~/.cursor/plugins/ and registers the plugin in
    ~/.claude/ configuration files so Cursor recognizes it.

.NOTES
    After running, restart Cursor to load the plugin.
#>

$ErrorActionPreference = "Stop"

$PluginName = "agentic-processes"
$PluginId = "$PluginName@local"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$Target = "$env:USERPROFILE\.cursor\plugins\$PluginName"
$ClaudeDir = "$env:USERPROFILE\.claude"
$ClaudePluginsDir = "$ClaudeDir\plugins"
$ClaudePluginsFile = "$ClaudePluginsDir\installed_plugins.json"
$ClaudeSettingsFile = "$ClaudeDir\settings.json"

Write-Host "Installing $PluginName locally for testing..." -ForegroundColor Cyan

# 1. Copy plugin files
Write-Host "Copying plugin files to $Target..."

if (Test-Path $Target) {
    Remove-Item -Recurse -Force $Target
}
New-Item -ItemType Directory -Path $Target -Force | Out-Null

$DirsToSync = @(".cursor-plugin", "commands", "skills", "agents", "hooks", "scripts")

foreach ($dir in $DirsToSync) {
    $source = Join-Path $RepoRoot $dir
    if (Test-Path $source) {
        $dest = Join-Path $Target $dir
        Copy-Item -Recurse -Force $source $dest
        Write-Host "  Copied $dir" -ForegroundColor Gray
    }
}

# 2. Register in installed_plugins.json (upsert)
Write-Host "Registering plugin in $ClaudePluginsFile..."

if (-not (Test-Path $ClaudePluginsDir)) {
    New-Item -ItemType Directory -Path $ClaudePluginsDir -Force | Out-Null
}

$pluginsData = @{ plugins = @{} }
if (Test-Path $ClaudePluginsFile) {
    try {
        $pluginsData = Get-Content $ClaudePluginsFile -Raw | ConvertFrom-Json -AsHashtable
        if (-not $pluginsData.plugins) {
            $pluginsData.plugins = @{}
        }
    } catch {
        $pluginsData = @{ plugins = @{} }
    }
}

$targetAbsolute = (Resolve-Path $Target).Path
$existingEntries = @()
if ($pluginsData.plugins.ContainsKey($PluginId)) {
    $existingEntries = @($pluginsData.plugins[$PluginId] | Where-Object { $_.scope -ne "user" })
}
$newEntry = @{ scope = "user"; installPath = $targetAbsolute }
$pluginsData.plugins[$PluginId] = @($newEntry) + $existingEntries

$pluginsData | ConvertTo-Json -Depth 10 | Set-Content $ClaudePluginsFile -Encoding UTF8
Write-Host "  Plugin registered" -ForegroundColor Gray

# 3. Enable in settings.json (upsert)
Write-Host "Enabling plugin in $ClaudeSettingsFile..."

if (-not (Test-Path $ClaudeDir)) {
    New-Item -ItemType Directory -Path $ClaudeDir -Force | Out-Null
}

$settingsData = @{}
if (Test-Path $ClaudeSettingsFile) {
    try {
        $settingsData = Get-Content $ClaudeSettingsFile -Raw | ConvertFrom-Json -AsHashtable
    } catch {
        $settingsData = @{}
    }
}

if (-not $settingsData.ContainsKey("enabledPlugins")) {
    $settingsData.enabledPlugins = @{}
}
$settingsData.enabledPlugins[$PluginId] = $true

$settingsData | ConvertTo-Json -Depth 10 | Set-Content $ClaudeSettingsFile -Encoding UTF8
Write-Host "  Plugin enabled" -ForegroundColor Gray

Write-Host ""
Write-Host "Done! Restart Cursor to load the plugin." -ForegroundColor Green
Write-Host "Commands should appear in the command palette after restart." -ForegroundColor Gray
