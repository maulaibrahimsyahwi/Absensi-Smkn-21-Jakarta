' Script Peluncur Hening (100% Tanpa Jendela Terminal / PowerShell)
Set objFSO = CreateObject("Scripting.FileSystemObject")
strCurrentDir = objFSO.GetParentFolderName(WScript.ScriptFullName)
strPsScript = objFSO.BuildPath(strCurrentDir, "run.ps1")

Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & strPsScript & """", 0, False
Set WshShell = Nothing
Set objFSO = Nothing
