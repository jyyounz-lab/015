# 影片剪輯 APP

這是一個可以放到 GitHub Pages 執行的瀏覽器版影片剪輯 APP。

## 功能

- 上傳單支或多支影片
- 播放、暫停、後退、快轉
- 顯示時間軸
- 設定剪輯起點與終點
- 裁切片段
- 合併影片
- 影片淡入淡出轉場
- 加入文字字幕
- 匯入 `.srt` / `.json` 字幕檔
- 下載 `.srt` / `.json` 字幕檔
- 加入簡單浮水印
- 移除本 APP 加上的浮水印
- 對授權影片右下角浮水印做遮罩
- 預覽剪輯結果
- 匯出並下載影片

## 本機執行

```bash
npm install
npm run dev
```

## 建置

```bash
npm run build
```

## 本機 AI 字幕工作流

可以先用本機 Whisper 或其他語音辨識工具產生 `.srt` 字幕檔，再到 APP 的 `字幕` 區點 `匯入 SRT / JSON`。

匯入後可以在 APP 內手動修正錯字、調整秒數、字型、字色、底色與字體大小。

APP 也支援下載目前字幕：

- `下載 SRT`：方便給其他剪輯軟體使用。
- `下載 JSON`：保留 APP 內的字型、顏色與大小設定。

本專案已附一個本機字幕工具：

```text
local_subtitle_tool/
```

基本使用流程：

```powershell
cd local_subtitle_tool
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
.\run_generate_subtitles.ps1 -InputPath "C:\影片\demo.mp4"
```

工具會輸出：

```text
demo.srt
demo.app-subtitles.json
```

再回到網頁 APP 匯入即可。

## 部署到 GitHub Pages

1. 將此專案推到 GitHub repository。
2. 到 repository 的 `Settings`。
3. 進入 `Pages`。
4. `Build and deployment` 選擇 `GitHub Actions`。
5. 推送到 `main` 分支後，GitHub 會自動執行 `.github/workflows/deploy.yml`。

## 匯出格式

目前第一版使用瀏覽器原生 `MediaRecorder`，輸出格式為 `.webm`。
若需要 `.mp4`，下一版可加入 `ffmpeg.wasm` 或後端轉檔服務。

## 授權與浮水印說明

本專案支援移除自己在 APP 裡加上的浮水印，或對使用者有權處理的影片做遮罩。
請用於自己擁有或已取得授權的影片素材。
