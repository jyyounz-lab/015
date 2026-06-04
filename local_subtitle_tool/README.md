# 本機 AI 字幕產生工具

這個工具會在本機讀取影片或音訊，使用 Whisper 語音辨識產生：

- `.srt` 字幕檔
- 可匯入影片剪輯 APP 的 `.json` 字幕檔

產生後，到 GitHub Pages APP 的 `字幕` 區點 `匯入 SRT / JSON`，再手動修正錯字、秒數、字型與顏色。

## 安裝

需要 Python 3.9 以上與 FFmpeg。

在 `local_subtitle_tool` 資料夾執行：

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

如果系統沒有 FFmpeg，可先安裝：

```powershell
winget install Gyan.FFmpeg
```

安裝後請重新開 PowerShell。

## 使用方式

```powershell
.\run_generate_subtitles.ps1 -InputPath "C:\影片\demo.mp4"
```

指定模型與語言：

```powershell
.\run_generate_subtitles.ps1 -InputPath "C:\影片\demo.mp4" -Model small -Language zh
```

輸出資料夾：

```powershell
.\run_generate_subtitles.ps1 -InputPath "C:\影片\demo.mp4" -OutputDir "C:\影片\字幕"
```

## 模型建議

- `tiny`：最快，準確度較低
- `base`：快，適合先試
- `small`：建議預設，速度與準確度平衡
- `medium`：較準，但慢
- `large-v3`：最準，電腦負擔較大

第一次執行會下載模型，需要網路；下載後可重複使用。

## 輸出檔

假設輸入是：

```text
demo.mp4
```

會輸出：

```text
demo.srt
demo.app-subtitles.json
```

其中 `demo.app-subtitles.json` 會保留 APP 可用的字型、字色、底色與大小欄位。
