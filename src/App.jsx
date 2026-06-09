import { useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Download,
  FastForward,
  Film,
  FolderOpen,
  Pause,
  Play,
  Plus,
  Copy,
  RotateCcw,
  Scissors,
  ShieldOff,
  Trash2,
  Type,
  Upload
} from "lucide-react";

const id = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const seconds = (value) => Number(value) || 0;
const colorInputValue = (value, fallback = "#000000") =>
  typeof value === "string" && value.startsWith("#") ? value.slice(0, 7) : fallback;
const fontOptions = [
  { label: "微軟正黑體", value: '"Microsoft JhengHei", Arial, sans-serif' },
  { label: "黑體", value: '"Noto Sans TC", Arial, sans-serif' },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Courier", value: '"Courier New", monospace' }
];
const defaultSubtitleStyle = {
  fontFamily: fontOptions[0].value,
  color: "#000000",
  backgroundColor: "transparent",
  fontSize: 42
};
const exportResolutions = {
  original: { label: "原檔案解析度（第一段影片）", width: null, height: null, videoBitsPerSecond: null },
  "720p": { label: "720P", width: 1280, height: 720, videoBitsPerSecond: 4500000 },
  "1080p": { label: "1080P", width: 1920, height: 1080, videoBitsPerSecond: 8000000 }
};
const exportFormats = {
  mp4: {
    label: "MP4",
    extension: "mp4",
    mimeTypes: ["video/mp4;codecs=h264,aac", "video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4"]
  },
  webm: {
    label: "WebM",
    extension: "webm",
    mimeTypes: ["video/webm;codecs=vp8,opus", "video/webm"]
  }
};
const localSubtitleToolPath = "C:\\Users\\林毅韋\\Documents\\New project\\local_subtitle_tool";
const whisperModels = ["tiny", "base", "small", "medium", "large-v3"];
const subtitleLanguages = [
  { label: "中文", value: "zh" },
  { label: "英文", value: "en" },
  { label: "日文", value: "ja" },
  { label: "自動偵測", value: "" }
];

function timeLabel(value) {
  const safe = Math.max(0, seconds(value));
  const min = Math.floor(safe / 60);
  const sec = Math.floor(safe % 60);
  return `${min}:${String(sec).padStart(2, "0")}`;
}

function srtTimeToSeconds(value) {
  const match = String(value || "").trim().match(/(\d+):(\d+):(\d+)(?:[,.](\d+))?/);
  if (!match) return 0;
  const [, hours, minutes, secs, millis = "0"] = match;
  return (
    Number(hours) * 3600 +
    Number(minutes) * 60 +
    Number(secs) +
    Number(millis.padEnd(3, "0").slice(0, 3)) / 1000
  );
}

function secondsToSrtTime(value) {
  const totalMs = Math.max(0, Math.round(seconds(value) * 1000));
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const millis = totalMs % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}

function normalizeSubtitle(item, index = 0) {
  return {
    id: id(),
    text: String(item?.text || item?.content || `字幕 ${index + 1}`),
    start: seconds(item?.start ?? item?.startTime ?? item?.from),
    end: Math.max(seconds(item?.end ?? item?.endTime ?? item?.to), seconds(item?.start ?? item?.startTime ?? item?.from) + 0.1),
    fontFamily: item?.fontFamily || defaultSubtitleStyle.fontFamily,
    color: item?.color || defaultSubtitleStyle.color,
    backgroundColor: item?.backgroundColor || defaultSubtitleStyle.backgroundColor,
    fontSize: seconds(item?.fontSize) || defaultSubtitleStyle.fontSize
  };
}

function parseSrt(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .split(/\n{2,}/)
    .map((block, index) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      const timeLineIndex = lines.findIndex((line) => line.includes("-->"));
      if (timeLineIndex < 0) return null;
      const [startRaw, endRaw] = lines[timeLineIndex].split("-->").map((part) => part.trim());
      const subtitleText = lines.slice(timeLineIndex + 1).join("\n").trim();
      if (!subtitleText) return null;
      return normalizeSubtitle(
        {
          text: subtitleText,
          start: srtTimeToSeconds(startRaw),
          end: srtTimeToSeconds(endRaw)
        },
        index
      );
    })
    .filter(Boolean);
}

function parseSubtitleJson(text) {
  const data = JSON.parse(text);
  const rows = Array.isArray(data) ? data : data.subtitles;
  if (!Array.isArray(rows)) {
    throw new Error("JSON 需要是字幕陣列，或包含 subtitles 陣列。");
  }
  return rows.map(normalizeSubtitle);
}

function subtitlesToSrt(rows) {
  return rows
    .map((subtitle, index) => {
      const text = String(subtitle.text || "").replace(/\r/g, "").trim();
      return `${index + 1}\n${secondsToSrtTime(subtitle.start)} --> ${secondsToSrtTime(subtitle.end)}\n${text}`;
    })
    .join("\n\n");
}

function subtitlesToJson(rows) {
  return JSON.stringify(
    {
      version: 1,
      subtitles: rows.map(({ text, start, end, fontFamily, color, backgroundColor, fontSize }) => ({
        text,
        start: seconds(start),
        end: seconds(end),
        fontFamily,
        color,
        backgroundColor,
        fontSize: seconds(fontSize) || defaultSubtitleStyle.fontSize
      }))
    },
    null,
    2
  );
}

function downloadTextFile(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function quotePowerShell(value) {
  const safeValue = String(value).replace(/`/g, "``").replace(/"/g, '`"');
  return `"${safeValue}"`;
}

function buildLocalSubtitleCommand({ inputPath, outputDir, model, language }) {
  const trimmedInput = inputPath.trim();
  if (!trimmedInput) return "";
  const parts = [
    `cd ${quotePowerShell(localSubtitleToolPath)}`,
    `powershell -ExecutionPolicy Bypass -File .\\run_generate_subtitles.ps1 -InputPath ${quotePowerShell(trimmedInput)}`
  ];
  if (outputDir.trim()) parts[1] += ` -OutputDir ${quotePowerShell(outputDir.trim())}`;
  if (model) parts[1] += ` -Model ${model}`;
  if (language) parts[1] += ` -Language ${language}`;
  return parts.join("; ");
}

function looksLikeMediaPath(path) {
  return /\.(mp4|mov|m4v|mkv|webm|avi|mp3|wav|m4a|aac|flac)$/i.test(path.trim());
}

function appendFileNameToPath(path, fileName) {
  const trimmedPath = path.trim().replace(/^"|"$/g, "");
  if (!trimmedPath || !fileName || looksLikeMediaPath(trimmedPath)) return trimmedPath;
  const separator = trimmedPath.includes("/") && !trimmedPath.includes("\\") ? "/" : "\\";
  return `${trimmedPath.replace(/[\\/]+$/g, "")}${separator}${fileName}`;
}

function parentDirectoryFromPath(path) {
  const trimmedPath = path.trim().replace(/^"|"$/g, "");
  const index = Math.max(trimmedPath.lastIndexOf("\\"), trimmedPath.lastIndexOf("/"));
  if (index <= 0) return "";
  return trimmedPath.slice(0, index);
}

function findSupportedRecorderFormat(preferredFormat) {
  const requested = exportFormats[preferredFormat] || exportFormats.mp4;
  const fallbackOrder = requested === exportFormats.webm ? [requested, exportFormats.mp4] : [requested, exportFormats.webm];

  for (const format of fallbackOrder) {
    const mimeType = format.mimeTypes.find((type) => MediaRecorder.isTypeSupported(type));
    if (mimeType) return { ...format, mimeType };
  }

  throw new Error("瀏覽器不支援可用的影片匯出格式。");
}

function resolveExportResolution(selectedResolution, clip) {
  if (selectedResolution === "original") {
    const width = Math.max(1, Math.round(clip?.width || exportResolutions["720p"].width));
    const height = Math.max(1, Math.round(clip?.height || exportResolutions["720p"].height));
    return {
      label: `原檔 ${width}x${height}`,
      width,
      height,
      videoBitsPerSecond: clamp(Math.round(width * height * 4), 4500000, 16000000)
    };
  }

  return exportResolutions[selectedResolution] || exportResolutions["720p"];
}

function waitForVideoReady(video) {
  return new Promise((resolve, reject) => {
    if (video.readyState >= 2 && video.videoWidth > 0) {
      resolve();
      return;
    }

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("影片載入逾時，請換較短影片或重新上傳後再試。"));
    }, 20000);

    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("error", onError);
    };

    const onReady = () => {
      if (video.videoWidth > 0) {
        cleanup();
        resolve();
      }
    };

    const onError = () => {
      cleanup();
      reject(new Error("影片讀取失敗，請確認檔案格式可由瀏覽器播放。"));
    };

    video.addEventListener("loadeddata", onReady);
    video.addEventListener("canplay", onReady);
    video.addEventListener("error", onError);
  });
}

function nextAnimationFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function loadClip(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = url;
    video.onloadedmetadata = () => {
      resolve({
        id: id(),
        file,
        url,
        name: file.name,
        duration: video.duration || 0,
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
        start: 0,
        end: video.duration || 0
      });
    };
  });
}

function seek(video, to) {
  return new Promise((resolve) => {
    const done = () => {
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done);
    video.currentTime = to;
  });
}

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawSubtitle(ctx, subtitle, width, height) {
  if (!subtitle?.text) return;
  const fontFamily = subtitle.fontFamily || defaultSubtitleStyle.fontFamily;
  const fontSize = seconds(subtitle.fontSize) || defaultSubtitleStyle.fontSize;
  const textColor = subtitle.color || defaultSubtitleStyle.color;
  const backgroundColor = subtitle.backgroundColor || defaultSubtitleStyle.backgroundColor;
  const hasBackground = !["transparent", "rgba(0,0,0,0)", "#00000000"].includes(String(backgroundColor).toLowerCase());
  ctx.save();
  ctx.font = `700 ${fontSize}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const measure = ctx.measureText(subtitle.text);
  const boxWidth = Math.min(width - 80, measure.width + 72);
  const boxHeight = fontSize + 34;
  const x = (width - boxWidth) / 2;
  const y = height - boxHeight - 58;
  if (hasBackground) {
    drawRoundRect(ctx, x, y, boxWidth, boxHeight, 12);
    ctx.fillStyle = backgroundColor;
    ctx.fill();
  }
  ctx.fillStyle = textColor;
  ctx.fillText(subtitle.text, width / 2, y + boxHeight / 2);
  ctx.restore();
}

function drawWatermark(ctx, text, width, height) {
  if (!text) return;
  ctx.save();
  ctx.font = "800 30px Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.fillText(text, width - 34, height - 30);
  ctx.restore();
}

function drawCover(ctx, width, height) {
  ctx.save();
  const w = 280;
  const h = 86;
  const x = width - w - 28;
  const y = height - h - 22;
  drawRoundRect(ctx, x, y, w, h, 14);
  ctx.fillStyle = "rgba(22,30,42,0.92)";
  ctx.fill();
  ctx.font = "700 19px Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("授權遮罩區", x + w / 2, y + h / 2);
  ctx.restore();
}

export default function App() {
  const previewRef = useRef(null);
  const [clips, setClips] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [playing, setPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [transition, setTransition] = useState("fade");
  const [watermark, setWatermark] = useState("我的影片");
  const [showWatermark, setShowWatermark] = useState(true);
  const [coverWatermark, setCoverWatermark] = useState(false);
  const [subtitles, setSubtitles] = useState([
    {
      id: id(),
      text: "第一段字幕",
      start: 0,
      end: 3,
      ...defaultSubtitleStyle
    }
  ]);
  const [status, setStatus] = useState("尚未匯出");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadFileName, setDownloadFileName] = useState("剪輯完成影片.mp4");
  const [exportFormat, setExportFormat] = useState("mp4");
  const [exportResolution, setExportResolution] = useState("original");
  const [exporting, setExporting] = useState(false);
  const [exportPercent, setExportPercent] = useState(0);
  const [localSubtitleFileName, setLocalSubtitleFileName] = useState("");
  const [localSubtitleInputPath, setLocalSubtitleInputPath] = useState("");
  const [localSubtitleOutputDir, setLocalSubtitleOutputDir] = useState("");
  const [localSubtitleModel, setLocalSubtitleModel] = useState("small");
  const [localSubtitleLanguage, setLocalSubtitleLanguage] = useState("zh");

  const activeClip = clips.find((clip) => clip.id === activeId) || clips[0];
  const totalDuration = useMemo(
    () => clips.reduce((sum, clip) => sum + Math.max(0, clip.end - clip.start), 0),
    [clips]
  );
  const activeClipOffset = useMemo(() => {
    let offset = 0;
    for (const clip of clips) {
      if (clip.id === activeClip?.id) return offset;
      offset += Math.max(0, clip.end - clip.start);
    }
    return 0;
  }, [activeClip?.id, clips]);

  const activeSubtitle = (time) =>
    subtitles.find((subtitle) => time >= seconds(subtitle.start) && time <= seconds(subtitle.end));
  const timelinePreviewTime = activeClip ? activeClipOffset + Math.max(0, previewTime - activeClip.start) : 0;
  const currentSubtitle = activeSubtitle(timelinePreviewTime);
  const selectedOutput = resolveExportResolution(exportResolution, clips[0]);
  const localSubtitleCommand = useMemo(
    () =>
      buildLocalSubtitleCommand({
        inputPath: localSubtitleInputPath,
        outputDir: localSubtitleOutputDir,
        model: localSubtitleModel,
        language: localSubtitleLanguage
      }),
    [localSubtitleInputPath, localSubtitleOutputDir, localSubtitleModel, localSubtitleLanguage]
  );

  async function handleUpload(event) {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("video/"));
    const nextClips = await Promise.all(files.map(loadClip));
    setClips((current) => [...current, ...nextClips]);
    if (!activeId && nextClips[0]) setActiveId(nextClips[0].id);
    event.target.value = "";
  }

  function updateClip(clipId, patch) {
    let nextActiveTime = null;
    let nextActiveClip = null;
    setClips((current) =>
      current.map((clip) => {
        if (clip.id !== clipId) return clip;
        const next = { ...clip, ...patch };
        next.start = clamp(seconds(next.start), 0, next.duration);
        next.end = clamp(seconds(next.end), next.start + 0.1, next.duration);
        if (clipId === activeClip?.id) {
          nextActiveTime = patch.start !== undefined ? next.start : next.end;
          nextActiveClip = next;
        }
        return next;
      })
    );
    if (nextActiveTime !== null) seekPreview(nextActiveTime, nextActiveClip);
  }

  function removeClip(clipId) {
    setClips((current) => current.filter((clip) => clip.id !== clipId));
    if (activeId === clipId) setActiveId("");
  }

  function selectClip(clipId) {
    const clip = clips.find((item) => item.id === clipId);
    setActiveId(clipId);
    setPlaying(false);
    if (clip) {
      setPreviewTime(clip.start);
      requestAnimationFrame(() => seekPreview(clip.start, clip));
    }
  }

  function moveClip(clipId, direction) {
    setClips((current) => {
      const index = current.findIndex((clip) => clip.id === clipId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function seekPreview(time, clipBounds = activeClip) {
    if (!clipBounds) return;
    const nextTime = clamp(seconds(time), clipBounds.start, clipBounds.end);
    const video = previewRef.current;
    if (video) video.currentTime = nextTime;
    setPreviewTime(nextTime);
  }

  async function handleSubtitleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const ext = file.name.toLowerCase().split(".").pop();
      const imported = ext === "json" ? parseSubtitleJson(text) : parseSrt(text);
      if (!imported.length) {
        throw new Error("沒有讀到有效字幕。");
      }
      setSubtitles(imported);
      setStatus(`已匯入 ${imported.length} 段字幕。`);
    } catch (error) {
      setStatus(`字幕匯入失敗：${error.message || "格式不正確"}`);
    } finally {
      event.target.value = "";
    }
  }

  function handleLocalSubtitleVideoSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setLocalSubtitleFileName(file.name);
    if (localSubtitleInputPath && !looksLikeMediaPath(localSubtitleInputPath)) {
      const nextPath = appendFileNameToPath(localSubtitleInputPath, file.name);
      setLocalSubtitleInputPath(nextPath);
      const parent = parentDirectoryFromPath(nextPath);
      if (parent && !localSubtitleOutputDir) setLocalSubtitleOutputDir(parent);
      setStatus("已把選擇的影片檔名補到路徑後方。");
    } else {
      setStatus("已讀取影片名稱。瀏覽器無法取得完整磁碟路徑，請貼上資料夾路徑後按「補上檔名」。");
    }
    event.target.value = "";
  }

  function updateLocalSubtitleInputPath(value) {
    setLocalSubtitleInputPath(value);
    const parent = looksLikeMediaPath(value) ? parentDirectoryFromPath(value) : "";
    if (parent && !localSubtitleOutputDir) setLocalSubtitleOutputDir(parent);
  }

  function fillSelectedVideoFileName() {
    if (!localSubtitleFileName) {
      setStatus("請先按「選擇本機影片」，讓網頁知道影片檔名。");
      return;
    }
    if (!localSubtitleInputPath.trim()) {
      setStatus("請先貼上影片所在資料夾路徑，再按「補上檔名」。");
      return;
    }
    const nextPath = appendFileNameToPath(localSubtitleInputPath, localSubtitleFileName);
    setLocalSubtitleInputPath(nextPath);
    const parent = parentDirectoryFromPath(nextPath);
    if (parent) setLocalSubtitleOutputDir(parent);
    setStatus("已補上影片檔名，並帶入輸出資料夾。");
  }

  function useVideoParentAsOutputDir() {
    const parent = parentDirectoryFromPath(localSubtitleInputPath);
    if (!parent) {
      setStatus("請先輸入完整影片檔案路徑，再帶入輸出資料夾。");
      return;
    }
    setLocalSubtitleOutputDir(parent);
    setStatus("已使用影片所在資料夾作為輸出資料夾。");
  }

  async function copyLocalSubtitleCommand() {
    if (!localSubtitleCommand) {
      setStatus("請先輸入影片完整檔案路徑，例如 D:\\AAAA.MP4。");
      return;
    }
    try {
      await navigator.clipboard.writeText(localSubtitleCommand);
      setStatus("已複製本機字幕產生指令，請貼到 PowerShell 執行。");
    } catch {
      setStatus("瀏覽器無法自動複製，請手動選取指令內容後複製。");
    }
  }

  function downloadSubtitles(format) {
    if (format === "json") {
      downloadTextFile("字幕備份.json", subtitlesToJson(subtitles), "application/json;charset=utf-8");
      return;
    }
    downloadTextFile("字幕.srt", subtitlesToSrt(subtitles));
  }

  async function togglePlay() {
    const video = previewRef.current;
    if (!video || !activeClip) return;
    if (video.paused) {
      if (video.currentTime < activeClip.start || video.currentTime >= activeClip.end) {
        video.currentTime = activeClip.start;
      }
      await video.play();
      setPlaying(true);
      return;
    }
    video.pause();
    setPlaying(false);
  }

  function jump(amount) {
    const video = previewRef.current;
    if (!video || !activeClip) return;
    seekPreview(video.currentTime + amount);
  }

  function onTimeUpdate() {
    const video = previewRef.current;
    if (!video || !activeClip) return;
    setPreviewTime(video.currentTime);
    if (video.currentTime >= activeClip.end) {
      video.pause();
      video.currentTime = activeClip.end;
      setPreviewTime(activeClip.end);
      setPlaying(false);
    }
  }

  async function exportVideo() {
    if (!clips.length || exporting) return;
    setExporting(true);
    setDownloadUrl("");
    setExportPercent(0);
    setStatus("準備匯出，處理時間會接近影片長度，請先不要關閉分頁。");

    let audioContext = null;
    let recorder = null;

    try {
      const output = resolveExportResolution(exportResolution, clips[0]);
      const recorderFormat = findSupportedRecorderFormat(exportFormat);
      const formatChanged = recorderFormat.extension !== exportFormat;
      setDownloadFileName(`剪輯完成影片-${output.label}.${recorderFormat.extension}`);
      if (formatChanged) setStatus(`此瀏覽器不支援選擇的格式，已改用 ${recorderFormat.label} 匯出。`);

      const canvas = document.createElement("canvas");
      canvas.width = output.width;
      canvas.height = output.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("瀏覽器無法建立匯出畫布。");

      const stream = canvas.captureStream(24);
      audioContext = new AudioContext();
      await audioContext.resume();
      const audioOutput = audioContext.createMediaStreamDestination();
      audioOutput.stream.getAudioTracks().forEach((track) => stream.addTrack(track));

      recorder = new MediaRecorder(stream, {
        mimeType: recorderFormat.mimeType,
        videoBitsPerSecond: output.videoBitsPerSecond
      });
      const chunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };

      const finished = new Promise((resolve, reject) => {
        recorder.onerror = () => reject(new Error("瀏覽器影片錄製失敗，請縮短片段或重新整理後再試。"));
        recorder.onstop = () => {
          if (!chunks.length) {
            reject(new Error("匯出沒有產生影片資料，請重新上傳影片後再試。"));
            return;
          }
          const blob = new Blob(chunks, { type: recorderFormat.mimeType });
          setDownloadUrl(URL.createObjectURL(blob));
          resolve();
        };
      });

      recorder.start(1000);
      let timelineTime = 0;
      let lastStatusAt = 0;

      for (let index = 0; index < clips.length; index += 1) {
        const clip = clips[index];
        const video = document.createElement("video");
        video.preload = "auto";
        video.playsInline = true;
        video.src = clip.url;

        setStatus(`正在載入第 ${index + 1} 段影片...`);
        await waitForVideoReady(video);

        try {
          const source = audioContext.createMediaElementSource(video);
          source.connect(audioOutput);
        } catch {
          setStatus("音訊匯出受瀏覽器限制，仍會繼續匯出畫面。");
        }

        await seek(video, clip.start);
        const playResult = video.play();
        if (playResult) await playResult;

        const segmentDuration = Math.max(0, clip.end - clip.start);
        const startAt = performance.now();
        const timelineStart = timelineTime;

        while ((performance.now() - startAt) / 1000 < segmentDuration) {
          const elapsed = (performance.now() - startAt) / 1000;
          const currentTimeline = timelineStart + elapsed;

          ctx.fillStyle = "#070a10";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          if (video.videoWidth > 0 && video.videoHeight > 0) {
            const ratio = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
            const w = video.videoWidth * ratio;
            const h = video.videoHeight * ratio;
            ctx.drawImage(video, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
          }

          if (transition === "fade") {
            const edge = 0.55;
            const fadeIn = index > 0 ? clamp(1 - elapsed / edge, 0, 1) : 0;
            const fadeOut = index < clips.length - 1 ? clamp((elapsed - (segmentDuration - edge)) / edge, 0, 1) : 0;
            const alpha = Math.max(fadeIn, fadeOut);
            if (alpha > 0) {
              ctx.fillStyle = `rgba(0,0,0,${alpha})`;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
          }

          drawSubtitle(ctx, activeSubtitle(currentTimeline), canvas.width, canvas.height);
          if (coverWatermark) drawCover(ctx, canvas.width, canvas.height);
          if (showWatermark) drawWatermark(ctx, watermark, canvas.width, canvas.height);

          const now = performance.now();
          if (now - lastStatusAt > 350) {
            const percent = totalDuration ? Math.min(99, Math.round((currentTimeline / totalDuration) * 100)) : 0;
            setExportPercent(percent);
            setStatus(
              `匯出中 ${output.label} ${recorderFormat.label} ${timeLabel(currentTimeline)} / ${timeLabel(
                totalDuration
              )}（${percent}%）`
            );
            lastStatusAt = now;
          }

          await nextAnimationFrame();
        }

        video.pause();
        timelineTime += segmentDuration;
      }

      recorder.stop();
      await finished;
      setExportPercent(100);
      setStatus(`匯出完成：${output.label} ${recorderFormat.label}，可以下載影片。`);
    } catch (error) {
      if (recorder?.state === "recording") recorder.stop();
      setStatus(`匯出失敗：${error.message || "瀏覽器處理影片時發生錯誤"}`);
      setExportPercent(0);
    } finally {
      if (audioContext) await audioContext.close().catch(() => {});
      setExporting(false);
    }
  }

  return (
    <main className="app">
      <header className="header">
        <div>
          <span>GitHub Pages Ready</span>
          <h1>影片剪輯 APP</h1>
        </div>
        <div className="headerActions">
          <label className="button light">
            <Upload size={18} />
            上傳影片
            <input type="file" accept="video/*" multiple onChange={handleUpload} />
          </label>
          <button className="button primary" disabled={!clips.length || exporting} onClick={exportVideo}>
            <Download size={18} />
            匯出影片
          </button>
        </div>
      </header>

      <section className="layout">
        <aside className="panel">
          <h2>
            <Film size={18} />
            影片素材
          </h2>
          <div className="clipList">
            {clips.length === 0 && <p className="empty">上傳影片後會出現在這裡，可依清單順序合併。</p>}
            {clips.map((clip, index) => (
              <div
                className={`clip ${activeClip?.id === clip.id ? "active" : ""}`}
                key={clip.id}
              >
                <button className="clipMain" onClick={() => selectClip(clip.id)}>
                  <b>{index + 1}</b>
                </button>
                <button className="clipText" onClick={() => selectClip(clip.id)}>
                  <strong>{clip.name}</strong>
                  <small>
                    {timeLabel(clip.end - clip.start)} / 原始 {timeLabel(clip.duration)}
                  </small>
                </button>
                <div className="clipActions">
                  <button disabled={index === 0} onClick={() => moveClip(clip.id, -1)} title="上移">
                    <ArrowUp size={15} />
                  </button>
                  <button disabled={index === clips.length - 1} onClick={() => moveClip(clip.id, 1)} title="下移">
                    <ArrowDown size={15} />
                  </button>
                  <button onClick={() => removeClip(clip.id)} title="刪除">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {clips.length > 1 && (
            <div className="mergeInfo">
              <strong>合併輸出清單</strong>
              <p>匯出時會依照左側 1 到 {clips.length} 的順序合併影片，可用上下箭頭調整。</p>
            </div>
          )}
        </aside>

        <section className="stage">
          <div className="preview">
            {activeClip ? (
              <>
                <video
                  ref={previewRef}
                  key={activeClip.id}
                  src={activeClip.url}
                  playsInline
                  onLoadedMetadata={(event) => {
                    event.currentTarget.currentTime = activeClip.start;
                    setPreviewTime(activeClip.start);
                  }}
                  onTimeUpdate={onTimeUpdate}
                />
                <div className="overlay">
                  {currentSubtitle?.text && (
                    <div
                      className="subtitle"
                      style={{
                        color: currentSubtitle.color,
                        backgroundColor: currentSubtitle.backgroundColor,
                        fontFamily: currentSubtitle.fontFamily,
                        fontSize: `${Math.max(16, seconds(currentSubtitle.fontSize) || 24)}px`
                      }}
                    >
                      {currentSubtitle.text}
                    </div>
                  )}
                  {coverWatermark && <div className="cover">授權遮罩區</div>}
                  {showWatermark && <div className="watermark">{watermark}</div>}
                </div>
              </>
            ) : (
              <div className="drop">
                <Upload size={44} />
                上傳影片開始剪輯
              </div>
            )}
          </div>

          <div className="transport">
            <button onClick={togglePlay} disabled={!activeClip}>
              {playing ? <Pause size={18} /> : <Play size={18} />}
              {playing ? "暫停" : "播放"}
            </button>
            <button onClick={() => jump(-5)} disabled={!activeClip}>
              <RotateCcw size={18} />
              後退 5 秒
            </button>
            <button onClick={() => jump(5)} disabled={!activeClip}>
              <FastForward size={18} />
              快轉 5 秒
            </button>
          </div>

          <div className="panel timeline">
            <h2>
              <Scissors size={18} />
              時間軸與裁切
            </h2>
            {activeClip ? (
              <>
                <label className="scrubControl">
                  預覽播放位置：{timeLabel(previewTime)}（合併時間 {timeLabel(timelinePreviewTime)}）
                  <input
                    type="range"
                    min={activeClip.start}
                    max={activeClip.end}
                    step="0.1"
                    value={previewTime}
                    onChange={(event) => seekPreview(event.target.value)}
                  />
                </label>
                <div className="rangeLabels">
                  <span>拖曳這條可即時移動影片畫面，方便對字幕時間。</span>
                </div>
                <label className="scrubControl">
                  剪輯起點：{timeLabel(activeClip.start)}
                <input
                  type="range"
                  min="0"
                  max={activeClip.duration}
                  step="0.1"
                  value={activeClip.start}
                  onChange={(event) => updateClip(activeClip.id, { start: event.target.value })}
                />
                </label>
                <label className="scrubControl">
                  剪輯終點：{timeLabel(activeClip.end)}
                <input
                  type="range"
                  min="0"
                  max={activeClip.duration}
                  step="0.1"
                  value={activeClip.end}
                  onChange={(event) => updateClip(activeClip.id, { end: event.target.value })}
                />
                </label>
                <div className="timeFields">
                  <label>
                    起點秒數
                    <input
                      type="number"
                      step="0.1"
                      value={activeClip.start.toFixed(1)}
                      onChange={(event) => updateClip(activeClip.id, { start: event.target.value })}
                    />
                  </label>
                  <label>
                    終點秒數
                    <input
                      type="number"
                      step="0.1"
                      value={activeClip.end.toFixed(1)}
                      onChange={(event) => updateClip(activeClip.id, { end: event.target.value })}
                    />
                  </label>
                  <div>片段 {timeLabel(activeClip.end - activeClip.start)}</div>
                  <div>總長 {timeLabel(totalDuration)}</div>
                </div>
              </>
            ) : (
              <p className="empty">選擇影片後可設定裁切起點與終點。</p>
            )}
          </div>
        </section>

        <aside className="panel tools">
          <h2>編輯工具</h2>
          <label>
            轉場
            <select value={transition} onChange={(event) => setTransition(event.target.value)}>
              <option value="fade">淡入淡出</option>
              <option value="none">直接接續</option>
            </select>
          </label>

          <section>
            <h3>
              <Type size={16} />
              字幕
            </h3>
            <div className="subtitleFileActions">
              <label className="button light fileButton">
                <Upload size={16} />
                匯入 SRT / JSON
                <input type="file" accept=".srt,.json,application/json,text/plain" onChange={handleSubtitleImport} />
              </label>
              <button className="button light" onClick={() => downloadSubtitles("srt")}>
                <Download size={16} />
                下載 SRT
              </button>
              <button className="button light" onClick={() => downloadSubtitles("json")}>
                <Download size={16} />
                下載 JSON
              </button>
            </div>
            {subtitles.map((subtitle) => (
              <div className="subtitleRow" key={subtitle.id}>
                <label className="wide">
                  字幕文字
                  <input
                    value={subtitle.text}
                    onChange={(event) =>
                      setSubtitles((rows) =>
                        rows.map((row) => (row.id === subtitle.id ? { ...row, text: event.target.value } : row))
                      )
                    }
                  />
                </label>
                <div className="subtitleControls">
                  <label>
                    開始
                    <input
                      type="number"
                      step="0.1"
                      value={subtitle.start}
                      onChange={(event) =>
                        setSubtitles((rows) =>
                          rows.map((row) => (row.id === subtitle.id ? { ...row, start: event.target.value } : row))
                        )
                      }
                    />
                  </label>
                  <label>
                    結束
                    <input
                      type="number"
                      step="0.1"
                      value={subtitle.end}
                      onChange={(event) =>
                        setSubtitles((rows) =>
                          rows.map((row) => (row.id === subtitle.id ? { ...row, end: event.target.value } : row))
                        )
                      }
                    />
                  </label>
                  <label className="fontField">
                    字型
                    <select
                      value={subtitle.fontFamily || fontOptions[0].value}
                      onChange={(event) =>
                        setSubtitles((rows) =>
                          rows.map((row) =>
                            row.id === subtitle.id ? { ...row, fontFamily: event.target.value } : row
                          )
                        )
                      }
                    >
                      {fontOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    字色
                    <input
                      type="color"
                      value={colorInputValue(subtitle.color, "#ffffff")}
                      onChange={(event) =>
                        setSubtitles((rows) =>
                          rows.map((row) => (row.id === subtitle.id ? { ...row, color: event.target.value } : row))
                        )
                      }
                    />
                  </label>
                  <label>
                    底色
                    <input
                      type="color"
                      value={colorInputValue(subtitle.backgroundColor, "#000000")}
                      onChange={(event) =>
                        setSubtitles((rows) =>
                          rows.map((row) =>
                            row.id === subtitle.id ? { ...row, backgroundColor: `${event.target.value}cc` } : row
                          )
                        )
                      }
                    />
                  </label>
                  <label>
                    大小
                    <input
                      type="number"
                      min="16"
                      max="72"
                      value={subtitle.fontSize || 42}
                      onChange={(event) =>
                        setSubtitles((rows) =>
                          rows.map((row) => (row.id === subtitle.id ? { ...row, fontSize: event.target.value } : row))
                        )
                      }
                    />
                  </label>
                  <button
                    className="deleteSubtitle"
                    onClick={() => setSubtitles((rows) => rows.filter((row) => row.id !== subtitle.id))}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
            <button
              className="button light full"
              onClick={() =>
                setSubtitles((rows) => [
                  ...rows,
                  {
                    id: id(),
                    text: "新字幕",
                    start: Math.max(0, Number(timelinePreviewTime.toFixed(1))),
                    end: Math.max(0.1, Number((timelinePreviewTime + 3).toFixed(1))),
                    ...defaultSubtitleStyle
                  }
                ])
              }
            >
              <Plus size={16} />
              新增字幕
            </button>
          </section>

          <section>
            <h3>
              <Copy size={16} />
              本機 AI 字幕助手
            </h3>
            <div className="subtitleFileActions">
              <label className="button light fileButton">
                <Upload size={16} />
                選擇本機影片
                <input type="file" accept="video/*,audio/*" onChange={handleLocalSubtitleVideoSelect} />
              </label>
            </div>
            {localSubtitleFileName && <p className="exportHint">已選擇：{localSubtitleFileName}</p>}
            <label>
              影片完整檔案路徑
              <input
                value={localSubtitleInputPath}
                placeholder="例如 C:\Users\林毅韋\Desktop\小熊電煮鍋\新增資料夾\影片檔名.mp4"
                onChange={(event) => updateLocalSubtitleInputPath(event.target.value)}
              />
            </label>
            <button className="button light full" type="button" onClick={fillSelectedVideoFileName}>
              <FolderOpen size={16} />
              用已選影片補上檔名
            </button>
            <label>
              輸出資料夾
              <input
                value={localSubtitleOutputDir}
                placeholder="可留空，預設輸出到影片所在資料夾"
                onChange={(event) => setLocalSubtitleOutputDir(event.target.value)}
              />
            </label>
            <button className="button light full" type="button" onClick={useVideoParentAsOutputDir}>
              <FolderOpen size={16} />
              使用影片所在資料夾
            </button>
            <div className="localSubtitleOptions">
              <label>
                模型
                <select value={localSubtitleModel} onChange={(event) => setLocalSubtitleModel(event.target.value)}>
                  {whisperModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                語言
                <select value={localSubtitleLanguage} onChange={(event) => setLocalSubtitleLanguage(event.target.value)}>
                  {subtitleLanguages.map((language) => (
                    <option key={language.label} value={language.value}>
                      {language.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              PowerShell 指令
              <textarea
                className="localSubtitleCommand"
                readOnly
                value={localSubtitleCommand || "請先輸入影片完整檔案路徑，路徑最後要是 .mp4 / .mov / .m4v 等影片檔。"}
              />
            </label>
            <button className="button light full" disabled={!localSubtitleCommand} onClick={copyLocalSubtitleCommand}>
              <Copy size={16} />
              複製指令
            </button>
            <p className="exportHint">注意：InputPath 要選到影片檔本身，不是資料夾。執行完成後會產生 SRT 與 APP JSON，再用上方「匯入 SRT / JSON」載入。</p>
          </section>

          <section>
            <h3>
              <ShieldOff size={16} />
              浮水印
            </h3>
            <label className="check">
              <input type="checkbox" checked={showWatermark} onChange={(event) => setShowWatermark(event.target.checked)} />
              加入簡單浮水印
            </label>
            <input value={watermark} onChange={(event) => setWatermark(event.target.value)} />
            <label className="check">
              <input type="checkbox" checked={coverWatermark} onChange={(event) => setCoverWatermark(event.target.checked)} />
              遮罩授權影片右下角浮水印
            </label>
          </section>

          <section>
            <h3>
              <Download size={16} />
              輸出設定
            </h3>
            <div className="exportSettings">
              <label>
                格式
                <select value={exportFormat} disabled={exporting} onChange={(event) => setExportFormat(event.target.value)}>
                  {Object.entries(exportFormats).map(([value, option]) => (
                    <option key={value} value={value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                解析度
                <select
                  value={exportResolution}
                  disabled={exporting}
                  onChange={(event) => setExportResolution(event.target.value)}
                >
                  {Object.entries(exportResolutions).map(([value, option]) => (
                    <option key={value} value={value}>
                      {option.width && option.height ? `${option.label} (${option.width}x${option.height})` : option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="exportHint">
              目前輸出：{selectedOutput.label} ({selectedOutput.width}x{selectedOutput.height})
            </p>
          </section>

          <div className="downloadBox">
            <strong>{status}</strong>
            {exporting && (
              <div className="exportProgress" aria-label="匯出進度">
                <div style={{ width: `${exportPercent}%` }} />
              </div>
            )}
            {downloadUrl && (
              <a className="button primary full" href={downloadUrl} download={downloadFileName}>
                <Download size={18} />
                下載影片
              </a>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
