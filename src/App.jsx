import { useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Download,
  FastForward,
  Film,
  Pause,
  Play,
  Plus,
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

function timeLabel(value) {
  const safe = Math.max(0, seconds(value));
  const min = Math.floor(safe / 60);
  const sec = Math.floor(safe % 60);
  return `${min}:${String(sec).padStart(2, "0")}`;
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
  const fontFamily = subtitle.fontFamily || fontOptions[0].value;
  const fontSize = seconds(subtitle.fontSize) || 42;
  const textColor = subtitle.color || "#ffffff";
  const backgroundColor = subtitle.backgroundColor || "rgba(0,0,0,0.68)";
  ctx.save();
  ctx.font = `700 ${fontSize}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const measure = ctx.measureText(subtitle.text);
  const boxWidth = Math.min(width - 80, measure.width + 72);
  const boxHeight = fontSize + 34;
  const x = (width - boxWidth) / 2;
  const y = height - boxHeight - 58;
  drawRoundRect(ctx, x, y, boxWidth, boxHeight, 12);
  ctx.fillStyle = backgroundColor;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.78)";
  ctx.lineWidth = 5;
  ctx.strokeText(subtitle.text, width / 2, y + boxHeight / 2);
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
      fontFamily: fontOptions[0].value,
      color: "#ffffff",
      backgroundColor: "rgba(0,0,0,0.68)",
      fontSize: 42
    }
  ]);
  const [status, setStatus] = useState("尚未匯出");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [exporting, setExporting] = useState(false);

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
    setStatus("準備匯出...");

    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");
    const stream = canvas.captureStream(30);
    const audioContext = new AudioContext();
    const audioOutput = audioContext.createMediaStreamDestination();
    audioOutput.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };

    const finished = new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        setDownloadUrl(URL.createObjectURL(blob));
        resolve();
      };
    });

    recorder.start(300);
    let timelineTime = 0;

    for (let index = 0; index < clips.length; index += 1) {
      const clip = clips[index];
      const video = document.createElement("video");
      video.preload = "auto";
      video.playsInline = true;
      video.src = clip.url;

      await new Promise((resolve) => {
        video.onloadeddata = resolve;
      });

      try {
        const source = audioContext.createMediaElementSource(video);
        source.connect(audioOutput);
      } catch {
        setStatus("音訊匯出受瀏覽器限制，仍會繼續匯出畫面。");
      }

      await seek(video, clip.start);
      await video.play();

      const segmentDuration = Math.max(0, clip.end - clip.start);
      const startAt = performance.now();
      const timelineStart = timelineTime;

      while ((performance.now() - startAt) / 1000 < segmentDuration) {
        const elapsed = (performance.now() - startAt) / 1000;
        const currentTimeline = timelineStart + elapsed;

        ctx.fillStyle = "#070a10";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const ratio = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
        const w = video.videoWidth * ratio;
        const h = video.videoHeight * ratio;
        ctx.drawImage(video, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);

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

        setStatus(`匯出中 ${timeLabel(currentTimeline)} / ${timeLabel(totalDuration)}`);
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }

      video.pause();
      timelineTime += segmentDuration;
    }

    recorder.stop();
    await finished;
    await audioContext.close();
    setStatus("匯出完成，可以下載影片。");
    setExporting(false);
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
                <label>
                  字型
                  <select
                    value={subtitle.fontFamily || fontOptions[0].value}
                    onChange={(event) =>
                      setSubtitles((rows) =>
                        rows.map((row) => (row.id === subtitle.id ? { ...row, fontFamily: event.target.value } : row))
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
                <button className="deleteSubtitle" onClick={() => setSubtitles((rows) => rows.filter((row) => row.id !== subtitle.id))}>
                  <Trash2 size={15} />
                </button>
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
                    fontFamily: fontOptions[0].value,
                    color: "#ffffff",
                    backgroundColor: "#000000cc",
                    fontSize: 42
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

          <div className="downloadBox">
            <strong>{status}</strong>
            {downloadUrl && (
              <a className="button primary full" href={downloadUrl} download="剪輯完成影片.webm">
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
