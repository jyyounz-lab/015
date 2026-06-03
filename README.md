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
