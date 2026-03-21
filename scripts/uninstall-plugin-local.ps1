<#
.SYNOPSIS
    Uninstalls the agentic-processes plugin from local Cursor testing.

.DESCRIPTION
    Removes plugin files from ~/.cursor/plugins/ and deregisters the plugin from
    ~/.claude/ configuration files.

.NOTES
    After running, restart Cursor to complete the uninstall.
#>

$ErrorActionPreference = "Stop"

$PluginName = "agentic-processes"
$PluginId = "$PluginName@local"
$Target = "$env:USERPROFILE\.cursor\plugins\$PluginName"
$ClaudePluginsFile = "$env:USERPROFILE\.claude\plugins\installed_plugins.json"
$ClaudeSettingsFile = "$env:USERPROFILE\.claude\settings.json"

Write-Host "Uninstalling $PluginName from local testing..." -ForegroundColor Cyan

# 1. Remove plugin directory
Write-Host "Removing plugin files from $Target..."

if (Test-Path $Target) {
    Remove-Item -Recurse -Force $Target
    Write-Host "  Plugin directory removed" -ForegroundColor Gray
} else {
    Write-Host "  Plugin directory not found (already removed)" -ForegroundColor Yellow
}

# 2. Remove from installed_plugins.json
Write-Host "Removing plugin from $ClaudePluginsFile..."

if (Test-Path $ClaudePluginsFile) {
    try {
        $pluginsData = Get-Content $ClaudePluginsFile -Raw | ConvertFrom-Json
        $pluginsHash = @{}
        if ($pluginsData.plugins) {
            $pluginsData.plugins.PSObject.Properties | ForEach-Object {
                if ($_.Name -ne $PluginId) {
                    $pluginsHash[$_.Name] = $_.Value
                }
            }
        }
        $result = @{ plugins = $pluginsHash }
        $result | ConvertTo-Json -Depth 10 | Set-Content $ClaudePluginsFile -Encoding UTF8
        Write-Host "  Plugin registration removed" -ForegroundColor Gray
    } catch {
        Write-Host "  Warning: Could not parse $ClaudePluginsFile - $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "  File not found (nothing to remove)" -ForegroundColor Yellow
}

# 3. Remove from settings.json enabledPlugins
Write-Host "Removing plugin from $ClaudeSettingsFile..."

if (Test-Path $ClaudeSettingsFile) {
    try {
        $settingsData = Get-Content $ClaudeSettingsFile -Raw | ConvertFrom-Json
        $settingsHash = @{}
        $settingsData.PSObject.Properties | ForEach-Object {
            if ($_.Name -eq "enabledPlugins") {
                $enabledHash = @{}
                $_.Value.PSObject.Properties | ForEach-Object {
                    if ($_.Name -ne $PluginId) {
                        $enabledHash[$_.Name] = $_.Value
                    }
                }
                $settingsHash["enabledPlugins"] = $enabledHash
            } else {
                $settingsHash[$_.Name] = $_.Value
            }
        }
        $settingsHash | ConvertTo-Json -Depth 10 | Set-Content $ClaudeSettingsFile -Encoding UTF8
        Write-Host "  Plugin disabled" -ForegroundColor Gray
    } catch {
        Write-Host "  Warning: Could not parse $ClaudeSettingsFile - $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "  File not found (nothing to remove)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Done! Restart Cursor to complete the uninstall." -ForegroundColor Green
