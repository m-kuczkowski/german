#!/usr/bin/env python3
"""Generate resumable Thorsten speech clips and package them as WebM/Opus sprites."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import wave
from collections import defaultdict
from pathlib import Path

from piper import PiperVoice


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--model", required=True, type=Path)
    parser.add_argument("--config", required=True, type=Path)
    parser.add_argument("--ffmpeg", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--shards", type=int, default=64)
    parser.add_argument("--bitrate", default="28k")
    parser.add_argument("--gap-ms", type=int, default=180)
    parser.add_argument("--initial-gap-ms", type=int, default=220)
    parser.add_argument("--force", action="store_true")
    return parser.parse_args()


def shard_for(card_id: str, shard_count: int) -> int:
    digest = hashlib.sha256(card_id.encode("utf-8")).digest()
    return int.from_bytes(digest[:4], "big") % shard_count


def valid_wav(path: Path) -> bool:
    if not path.exists() or path.stat().st_size < 128:
        return False
    try:
        with wave.open(str(path), "rb") as audio:
            return audio.getnframes() > 0 and audio.getnchannels() == 1
    except (wave.Error, EOFError):
        return False


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

    print(f"Wczytywanie modelu Thorsten; do wygenerowania: {len(pending)}.", flush=True)
    voice = PiperVoice.load(str(args.model), config_path=str(args.config))
    for index, item in enumerate(pending, start=1):
        target = wav_dir / f"{item['id']}.wav"
        temporary = target.with_suffix(".wav.tmp")
        with wave.open(str(temporary), "wb") as wav_file:
            voice.synthesize_wav(item["text"], wav_file)
        temporary.replace(target)
        if index == 1 or index % 50 == 0 or index == len(pending):
            print(f"WAV: {index}/{len(pending)}", flush=True)
    return wav_dir


def write_sprite_wav(
    items: list[dict],
    wav_dir: Path,
    target: Path,
    gap_ms: int,
    initial_gap_ms: int,
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
                if (
                    clip.getframerate() != sample_rate
                    or clip.getnchannels() != channels
                    or clip.getsampwidth() != sample_width
                ):
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


def encode_sprite(wav_path: Path, webm_path: Path, args: argparse.Namespace) -> None:
    command = [
        str(args.ffmpeg),
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        str(wav_path),
        "-map_metadata",
        "-1",
        "-ac",
        "1",
        "-c:a",
        "libopus",
        "-b:a",
        args.bitrate,
        "-vbr",
        "on",
        "-compression_level",
        "10",
        "-application",
        "voip",
        str(webm_path),
    ]
    subprocess.run(command, check=True)


def validate_webm(path: Path, ffmpeg: Path) -> None:
    result = subprocess.run(
        [
            str(ffmpeg),
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(path),
            "-f",
            "null",
            "-",
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Niepoprawny WebM {path}: {result.stderr.strip()}")


def package(source: list[dict], wav_dir: Path, args: argparse.Namespace) -> Path:
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
        wav_path = work_dir / f"thorsten-{shard:02d}.wav"
        webm_path = sprites_dir / f"thorsten-{shard:02d}.webm"
        clips = write_sprite_wav(
            items, wav_dir, wav_path, args.gap_ms, args.initial_gap_ms
        )
        encode_sprite(wav_path, webm_path, args)
        validate_webm(webm_path, args.ffmpeg)
        for card_id, timing in clips.items():
            manifest_clips[card_id] = {"shard": shard, **timing}
        shard_meta.append(
            {
                "id": shard,
                "file": webm_path.name,
                "bytes": webm_path.stat().st_size,
                "cards": len(items),
            }
        )
        print(f"Opus: {index}/{len(groups)} paczek", flush=True)

    manifest = {
        "version": 1,
        "voice": "de_DE-thorsten-high",
        "codec": "opus",
        "container": "webm",
        "mimeType": 'audio/webm; codecs="opus"',
        "cardCount": len(source),
        "shardCount": len(groups),
        "shards": shard_meta,
        "clips": manifest_clips,
    }
    manifest_path = args.output / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    return manifest_path


def main() -> None:
    args = parse_args()
    if args.shards < 1 or args.shards > 256:
        raise ValueError("--shards musi mieścić się w zakresie 1–256.")
    for required in (args.source, args.model, args.config, args.ffmpeg):
        if not required.exists():
            raise FileNotFoundError(required)

    source = json.loads(args.source.read_text(encoding="utf-8"))
    ids = [item["id"] for item in source]
    if len(ids) != len(set(ids)):
        raise ValueError("Źródło zawiera powtórzone identyfikatory kart.")
    if not source:
        raise ValueError("Źródło nagrań jest puste.")

    args.output.mkdir(parents=True, exist_ok=True)
    wav_dir = synthesize(source, args)
    manifest_path = package(source, wav_dir, args)
    total_bytes = sum(path.stat().st_size for path in (args.output / "sprites").glob("*.webm"))
    print(
        json.dumps(
            {
                "status": "ok",
                "cards": len(source),
                "shards": len(list((args.output / "sprites").glob("*.webm"))),
                "opusBytes": total_bytes,
                "manifest": str(manifest_path),
            },
            ensure_ascii=False,
        ),
        flush=True,
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Błąd: {error}", file=sys.stderr, flush=True)
        raise
