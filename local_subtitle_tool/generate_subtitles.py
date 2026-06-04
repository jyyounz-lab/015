from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


DEFAULT_STYLE = {
    "fontFamily": '"Microsoft JhengHei", Arial, sans-serif',
    "color": "#000000",
    "backgroundColor": "transparent",
    "fontSize": 42,
}


@dataclass
class Subtitle:
    start: float
    end: float
    text: str


def srt_timestamp(seconds: float) -> str:
    total_ms = max(0, round(seconds * 1000))
    hours = total_ms // 3_600_000
    minutes = (total_ms % 3_600_000) // 60_000
    secs = (total_ms % 60_000) // 1000
    millis = total_ms % 1000
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def split_segment(segment: Subtitle, max_chars: int, max_duration: float) -> list[Subtitle]:
    text = clean_text(segment.text)
    duration = max(0.1, segment.end - segment.start)
    if len(text) <= max_chars and duration <= max_duration:
        return [Subtitle(segment.start, segment.end, text)]

    parts = [part.strip() for part in re.split(r"(?<=[，。！？!?；;,.])", text) if part.strip()]
    if len(parts) <= 1:
        parts = [text[i : i + max_chars] for i in range(0, len(text), max_chars)]

    total_chars = sum(max(1, len(part)) for part in parts)
    rows: list[Subtitle] = []
    cursor = segment.start

    for index, part in enumerate(parts):
        if index == len(parts) - 1:
            end = segment.end
        else:
            ratio = max(1, len(part)) / total_chars
            end = min(segment.end, cursor + duration * ratio)
        rows.append(Subtitle(cursor, max(cursor + 0.1, end), part))
        cursor = rows[-1].end

    return rows


def merge_and_split_segments(
    raw_segments: Iterable[Subtitle], max_chars: int, max_duration: float
) -> list[Subtitle]:
    rows: list[Subtitle] = []
    for segment in raw_segments:
        rows.extend(split_segment(segment, max_chars=max_chars, max_duration=max_duration))
    return rows


def write_srt(path: Path, subtitles: list[Subtitle]) -> None:
    blocks = []
    for index, subtitle in enumerate(subtitles, start=1):
        blocks.append(
            "\n".join(
                [
                    str(index),
                    f"{srt_timestamp(subtitle.start)} --> {srt_timestamp(subtitle.end)}",
                    subtitle.text,
                ]
            )
        )
    path.write_text("\n\n".join(blocks), encoding="utf-8")


def write_app_json(
    path: Path, subtitles: list[Subtitle], source: Path, model: str, language: str | None
) -> None:
    payload = {
        "version": 1,
        "source": str(source),
        "model": model,
        "language": language,
        "subtitles": [
            {
                "text": subtitle.text,
                "start": round(subtitle.start, 3),
                "end": round(subtitle.end, 3),
                **DEFAULT_STYLE,
            }
            for subtitle in subtitles
        ],
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def transcribe(args: argparse.Namespace) -> list[Subtitle]:
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise SystemExit(
            "尚未安裝 faster-whisper，請先執行：python -m pip install -r requirements.txt"
        ) from exc

    print(f"載入模型：{args.model}")
    model = WhisperModel(args.model, device=args.device, compute_type=args.compute_type)

    print(f"開始辨識：{args.input}")
    segments, info = model.transcribe(
        str(args.input),
        language=args.language or None,
        beam_size=args.beam_size,
        vad_filter=True,
    )

    detected = getattr(info, "language", None)
    if detected:
        print(f"偵測語言：{detected}")

    raw = [Subtitle(float(segment.start), float(segment.end), clean_text(segment.text)) for segment in segments]
    return merge_and_split_segments(raw, max_chars=args.max_chars, max_duration=args.max_duration)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="本機 AI 語音辨識字幕產生工具")
    parser.add_argument("--input", required=True, type=Path, help="影片或音訊檔路徑")
    parser.add_argument("--output-dir", type=Path, default=None, help="輸出資料夾，預設為輸入檔所在資料夾")
    parser.add_argument("--model", default="small", help="Whisper 模型，例如 tiny/base/small/medium/large-v3")
    parser.add_argument("--language", default="zh", help="語言代碼，例如 zh/en/ja；留空可自動偵測")
    parser.add_argument("--device", default="auto", help="auto/cpu/cuda")
    parser.add_argument("--compute-type", default="int8", help="int8/float16/float32")
    parser.add_argument("--beam-size", type=int, default=5)
    parser.add_argument("--max-chars", type=int, default=32, help="每段字幕建議最大字數")
    parser.add_argument("--max-duration", type=float, default=6, help="每段字幕建議最長秒數")
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.input = args.input.expanduser().resolve()

    if not args.input.exists():
        raise SystemExit(f"找不到檔案：{args.input}")

    output_dir = (args.output_dir or args.input.parent).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    subtitles = transcribe(args)
    if not subtitles:
        raise SystemExit("沒有產生字幕，請確認影片有可辨識語音。")

    base = args.input.stem
    srt_path = output_dir / f"{base}.srt"
    json_path = output_dir / f"{base}.app-subtitles.json"

    write_srt(srt_path, subtitles)
    write_app_json(json_path, subtitles, source=args.input, model=args.model, language=args.language)

    print(f"完成，共 {len(subtitles)} 段字幕")
    print(f"SRT：{srt_path}")
    print(f"JSON：{json_path}")


if __name__ == "__main__":
    main()
