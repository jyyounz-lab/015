# AGENTS.md

你好，我是林先生。這個專案是部署在 GitHub Pages 的瀏覽器版影片剪輯 APP。後續接手請優先依照本文件操作。

## 回覆原則

- 使用繁體中文回覆。
- 開始實作前，先把使用者需求整理成可執行的精準指令，再直接執行。
- 使用者通常希望直接修改、驗證、提交、推送，不只提供說明。
- 回報要簡潔，清楚列出改了什麼、如何驗證、是否已部署。

## 專案資訊

- 專案路徑：`C:\Users\林毅韋\Documents\New project`
- GitHub repo：`https://github.com/jyyounz-lab/015`
- GitHub Pages：`https://jyyounz-lab.github.io/015/`
- 主要前端：React + Vite
- 主要檔案：
  - `src/App.jsx`：APP 主要功能與匯出流程
  - `src/styles.css`：版面與工具列樣式
  - `.github/workflows/deploy.yml`：GitHub Pages 自動部署
  - `local_subtitle_tool/`：本機 AI 字幕產生工具

## 常用指令

```powershell
npm install
npm run dev
npm run build
```

目前這台環境可能找不到 `npm`。若本機無法 build，仍要執行：

```powershell
git diff --check
```

然後推送到 GitHub，讓 GitHub Actions 用 Node 22 執行正式 build。

## 部署流程

推送到 `main` 後會自動部署 GitHub Pages：

```powershell
git add <files>
git commit -m "<message>"
git push origin main
```

部署狀態可用 GitHub API 查詢：

```powershell
$uri='https://api.github.com/repos/jyyounz-lab/015/actions/runs?branch=main&per_page=1'
Invoke-RestMethod -Uri $uri | Select-Object -ExpandProperty workflow_runs | Select-Object -First 1 name,status,conclusion,head_sha,html_url,updated_at
```

網站回應確認：

```powershell
(Invoke-WebRequest -Uri 'https://jyyounz-lab.github.io/015/' -UseBasicParsing).StatusCode
```

## 目前功能重點

- 上傳單支或多支影片
- 播放、暫停、快轉、後退
- 顯示時間軸
- 設定剪輯起點與終點
- 裁切與合併片段
- 淡入淡出轉場
- 匯入與下載 SRT / JSON 字幕
- 本機 AI 字幕助手：在網頁產生可複製的 PowerShell 指令，再用本機工具輸出 SRT / JSON
- 字幕可調字型、字色、底色、大小
- 字幕預設：黑字、透明底
- 加入簡單浮水印
- 遮罩授權影片右下角浮水印
- 預覽剪輯結果
- 匯出並下載影片
- 輸出格式：MP4 / WebM
- 輸出解析度：原檔案解析度、720P、1080P

## 影片匯出注意事項

- 匯出使用瀏覽器原生 `MediaRecorder`。
- MP4 是否可用取決於瀏覽器支援度；若不支援，APP 會自動退回 WebM 並提示。
- 「原檔案解析度」使用合併清單第一段影片的原始寬高。
- 1080P 匯出較吃 CPU，長影片可能需要較久時間。
- 匯出時請讓分頁保持開啟。

## 本機 AI 字幕工具

工具位置：

```text
local_subtitle_tool/
```

常用方式：

```powershell
cd "C:\Users\林毅韋\Documents\New project\local_subtitle_tool"
powershell -ExecutionPolicy Bypass -File .\run_generate_subtitles.ps1 -InputPath "D:\AAAA.MP4"
```

會產生：

- `.srt`
- `.app-subtitles.json`

再回到網頁 APP 的字幕區匯入即可。

## Windows 注意事項

- PowerShell 預設輸出有時會讓 UTF-8 中文看起來像亂碼；讀檔時使用 `-Encoding UTF8`。
- 手動改檔請優先用 `apply_patch`。
- 不要使用 `git reset --hard` 或還原使用者未要求還原的變更。
- `.git` 寫入通常需要提升權限。

## 驗證清單

修改後至少確認：

```powershell
git diff --check
git status --short --branch
```

推送後確認：

- GitHub Actions `Deploy to GitHub Pages` 為 `success`
- `https://jyyounz-lab.github.io/015/` 回應 `200`
- 若使用者說畫面沒更新，請先請他按 `Ctrl + F5`，再檢查線上 HTML 載入的 hashed JS 是否包含新文字。
