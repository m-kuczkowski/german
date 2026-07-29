#!/usr/bin/env python3
"""Generate learner-paced German Kokoro speech clips and package WebM/Opus sprites."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import wave
from collections import defaultdict
from pathlib import Path

import numpy as np
from kokoro_onnx import Kokoro


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--model", required=True, type=Path)
    parser.add_argument("--voices", required=True, type=Path)
    parser.add_argument("--ffmpeg", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--shards", type=int, default=64)
    parser.add_argument("--bitrate", default="40k")
    parser.add_argument("--speed", type=float, default=0.9)
    parser.add_argument("--prefix-ms", type=int, default=110)
    parser.add_argument("--suffix-ms", type=int, default=150)
    parser.add_argument("--gap-ms", type=int, default=100)
    parser.add_argument("--initial-gap-ms", type=int, default=220)
    parser.add_argument("--force", action="store_true")
    return parser.parse_args()


def ffmpeg_path(args: argparse.Namespace) -> Path:
    if args.ffmpeg:
        return args.ffmpeg
    try:
        import imageio_ffmpeg
    except ImportError as error:
        raise RuntimeError("Podaj --ffmpeg lub zainstaluj imageio-ffmpeg.") from error
    return Path(imageio_ffmpeg.get_ffmpeg_exe())


def shard_for(card_id: str, shard_count: int) -> int:
    digest = hashlib.sha256(card_id.encode("utf-8")).digest()
    return int.from_bytes(digest[:4], "big") % shard_count


def valid_wav(path: Path) -> bool:
    if not path.exists() or path.stat().st_size < 128:
        return False
    try:
        with wave.open(str(path), "rb") as audio:
            return (
                audio.getnframes() > 0
                and audio.getnchannels() == 1
                and audio.getsampwidth() == 2
                and audio.getframerate() == 24000
            )
    except (wave.Error, EOFError):
        return False


def write_wav(path: Path, samples: np.ndarray, sample_rate: int, args: argparse.Namespace) -> None:
    prefix = np.zeros(round(sample_rate * args.prefix_ms / 1000), dtype=np.float32)
    suffix = np.zeros(round(sample_rate * args.suffix_ms / 1000), dtype=np.float32)
    padded = np.concatenate((prefix, np.asarray(samples, dtype=np.float32), suffix))
    pcm = (np.clip(padded, -0.95, 0.95) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm.tobytes())


def synthesize(source: list[dict], args: argparse.Namespace) -> Path:
    wav_dir = args.output / "wav"
    wav_dir.mkdir(parents=True, exist_ok=True)
    pending = [
        item
        for item in source
        if args.force or not valid_wav(wav_dir / f"{item['id']}.wav")
    ]
    if not pending:
        print(f"WAV: wszystkie {len(source)} nagrania są już gotowe.", flush=True)
        return wav_dir

    print(f"Wczytywanie Kokoro Martin; do wygenerowania: {len(pending)}.", flush=True)
    voice = Kokoro(str(args.model), str(args.voices))
    for index, item in enumerate(pending, start=1):
        target = wav_dir / f"{item['id']}.wav"
        temporary = target.with_suffix(".wav.tmp")
        samples, sample_rate = voice.create(
            text=f"{item['text'].rstrip('.!?') }.",
            voice="martin",
            speed=args.speed,
            lang="de",
            trim=True,
        )
        if sample_rate != 24000 or len(samples) == 0:
            raise RuntimeError(f"Niepoprawne audio Kokoro dla {item['id']}")
        write_wav(temporary, samples, sample_rate, args)
        temporary.replace(target)
        if index == 1 or index % 50 == 0 or index == len(pending):
            print(f"WAV: {index}/{len(pending)}", flush=True)
    return wav_dir


def write_sprite_wav(
    items: list[dict], wav_dir: Path, target: Path, gap_ms: int, initial_gap_ms: int
) -> dict[str, dict]:
    first_path = wav_dir / f"{items[0]['id']}.wav"
    with wave.open(str(first_path), "rb") as first:
        params = first.getparams()
        sample_rate = first.getframerate()
        channels = first.getnchannels()
        sample_width = first.getsampwidth()

    silence_frame = b"\x00" * channels * sample_width
    gap_frames = round(sample_rate * gap_ms / 1000)
    initial_gap_frames = round(sample_rate * initial_gap_ms / 1000)
    cursor = initial_gap_frames
    clips: dict[str, dict] = {}

    with wave.open(str(target), "wb") as output:
        output.setparams(params)
        output.writeframes(silence_frame * initial_gap_frames)
        for item in items:
            source_path = wav_dir / f"{item['id']}.wav"
            with wave.open(str(source_path), "rb") as clip:
                if clip.getparams()[:3] != params[:3]:
                    raise RuntimeError(f"Niezgodny format WAV: {source_path}")
                frames = clip.getnframes()
                output.writeframes(clip.readframes(frames))
            clips[item["id"]] = {
                "start": round(cursor / sample_rate, 3),
                "duration": round(frames / sample_rate, 3),
            }
            output.writeframes(silence_frame * gap_frames)
            cursor += frames + gap_frames
    return clips


def encode_sprite(wav_path: Path, webm_path: Path, ffmpeg: Path, bitrate: str) -> None:
    subprocess.run(
        [
            str(ffmpeg), "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav_path),
            "-map_metadata", "-1", "-ac", "1", "-c:a", "libopus", "-b:a", bitrate,
            "-vbr", "on", "-compression_level", "10", "-application", "voip", str(webm_path),
        ],
        check=True,
    )


def validate_webm(path: Path, ffmpeg: Path) -> None:
    result = subprocess.run(
        [str(ffmpeg), "-hide_banner", "-loglevel", "error", "-i", str(path), "-f", "null", "-"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Niepoprawny WebM {path}: {result.stderr.strip()}")


def package(source: list[dict], wav_dir: Path, args: argparse.Namespace, ffmpeg: Path) -> Path:
    sprites_dir = args.output / "sprites"
    work_dir = args.output / "sprite-wav"
    sprites_dir.mkdir(parents=True, exist_ok=True)
    work_dir.mkdir(parents=True, exist_ok=True)
    groups: dict[int, list[dict]] = defaultdict(list)
    for item in source:
        groups[shard_for(item["id"], args.shards)].append(item)

    manifest_clips: dict[str, dict] = {}
    shard_meta = []
    for index, shard in enumerate(sorted(groups), start=1):
        items = groups[shard]
        wav_path = work_dir / f"kokoro-martin-{shard:02d}.wav"
        webm_path = sprites_dir / f"kokoro-martin-{shard:02d}.webm"
        clips = write_sprite_wav(items, wav_dir, wav_path, args.gap_ms, args.initial_gap_ms)
        encode_sprite(wav_path, webm_path, ffmpeg, args.bitrate)
        validate_webm(webm_path, ffmpeg)
        for card_id, timing in clips.items():
            manifest_clips[card_id] = {"shard": shard, **timing}
        shard_meta.append({"id": shard, "file": webm_path.name, "bytes": webm_path.stat().st_size, "cards": len(items)})
        print(f"Opus: {index}/{len(groups)} paczek", flush=True)

    manifest = {
        "version": 2,
        "voice": "kokoro-de-martin",
        "speed": args.speed,
        "spritePrefix": "kokoro-martin",
        "prefixMs": args.prefix_ms,
        "suffixMs": args.suffix_ms,
        "codec": "opus",
        "container": "webm",
        "mimeType": 'audio/webm; codecs="opus"',
        "cardCount": len(source),
        "shardCount": len(groups),
        "shards": shard_meta,
        "clips": manifest_clips,
    }
    manifest_path = args.output / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    return manifest_path


def main() -> None:
    args = parse_args()
    if args.shards < 1 or args.shards > 256:
        raise ValueError("--shards musi mieścić się w zakresie 1–256.")
    for required in (args.source, args.model, args.voices):
        if not required.exists():
            raise FileNotFoundError(required)
    ffmpeg = ffmpeg_path(args)
    if not ffmpeg.exists():
        raise FileNotFoundError(ffmpeg)
    source = json.loads(args.source.read_text(encoding="utf-8"))
    ids = [item["id"] for item in source]
    if len(ids) != len(set(ids)):
        raise ValueError("Źródło zawiera powtórzone identyfikatory kart.")
    if not source:
        raise ValueError("Źródło nagrań jest puste.")
    args.output.mkdir(parents=True, exist_ok=True)
    wav_dir = synthesize(source, args)
    manifest_path = package(source, wav_dir, args, ffmpeg)
    total_bytes = sum(path.stat().st_size for path in (args.output / "sprites").glob("*.webm"))
    print(json.dumps({"status": "ok", "cards": len(source), "shards": len(list((args.output / "sprites").glob("*.webm"))), "opusBytes": total_bytes, "manifest": str(manifest_path)}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Błąd: {error}", file=sys.stderr, flush=True)
        raise
