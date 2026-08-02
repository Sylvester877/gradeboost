# Click-through script for the NSIS assisted installer wizard (E2E update test).
# Finds the "GradeBoost Setup" window and clicks Next / Install / Finish via UI Automation.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/click-installer-wizard.ps1

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$deadline = (Get-Date).AddMinutes(5)
$done = $false

function Get-SetupWindow {
  $root = [System.Windows.Automation.AutomationElement]::RootElement
  $cond = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::NameProperty,
    "GradeBoost Setup"
  )
  $win = $root.FindFirst([System.Windows.Automation.TreeScope]::Children, $cond)
  if ($win) { return $win }
  # Fallback: search by partial title
  $all = $root.FindAll([System.Windows.Automation.TreeScope]::Children,
    [System.Windows.Automation.Condition]::TrueCondition)
  foreach ($el in $all) {
    $name = $el.Current.Name
    if ($name -like "*GradeBoost*Setup*" -and $el.Current.ControlType -eq [System.Windows.Automation.ControlType]::Window) {
      return $el
    }
  }
  return $null
}

function Invoke-ButtonByName($win, $names) {
  $cond = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Button
  )
  $buttons = $win.FindAll([System.Windows.Automation.TreeScope]::Descendants, $cond)
  foreach ($b in $buttons) {
    $btnName = $b.Current.Name
    foreach ($n in $names) {
      if ($btnName -like $n) {
        try {
          $invoke = $b.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
          $invoke.Invoke()
          return $btnName
        } catch {
          # fall through
        }
      }
    }
  }
  return $null
}

while ((Get-Date) -lt $deadline -and -not $done) {
  $win = Get-SetupWindow
  if ($win) {
    # Priority order for assisted-installer pages:
    # Welcome -> "Next >" ; Install location -> "Next >" ; Ready -> "Install" ; Completing -> "Finish"
    $clickedName = Invoke-ButtonByName $win @("*Next*", "*Install*", "*Finish*", "*I Agree*", "*OK*", "*Close*")
    if ($clickedName) {
      Write-Output ("[{0}] clicked: {1}" -f (Get-Date -Format HH:mm:ss), $clickedName)
    } else {
      Write-Output ("[{0}] window found but no clickable button" -f (Get-Date -Format HH:mm:ss))
    }
    # Check if the installer process is still alive
    $setup = Get-Process | Where-Object { $_.ProcessName -like "GradeBoost-Setup*" }
    if (-not $setup) {
      Write-Output "Installer process finished."
      $done = $true
    }
  } else {
    Write-Output ("[{0}] waiting for GradeBoost Setup window..." -f (Get-Date -Format HH:mm:ss))
  }
  Start-Sleep -Seconds 3
}

if ($done) { Write-Output "WIZARD_CLICKER_DONE" } else { Write-Output "WIZARD_CLICKER_TIMEOUT" }
