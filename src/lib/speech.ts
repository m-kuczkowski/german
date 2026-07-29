import {
  PIPER_AUDIO_BASE_URL,
  PIPER_AUDIO_MIME_TYPE,
  PIPER_AUDIO_SPRITE_PREFIX,
  piperAudioClips,
} from "../data/piperAudioManifest";

const audioCache = new Map<number, HTMLAudioElement>();
let activeAudio: HTMLAudioElement | null = null;
let activeTimeout: number | null = null;
let playbackGeneration = 0;

function speakWithSystemVoice(text: string): boolean {
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    return false;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "de-DE";
  utterance.rate = 0.9;
  const voice = window.speechSynthesis
    .getVoices()
    .find((candidate) => candidate.lang.toLowerCase().startsWith("de"));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
  return true;
}

function supportsPiperAudio(): boolean {
  if (!PIPER_AUDIO_BASE_URL || typeof Audio === "undefined") return false;
  const probe = document.createElement("audio");
  return Boolean(probe.canPlayType(PIPER_AUDIO_MIME_TYPE));
}

function shardUrl(shard: number): string {
  return `${PIPER_AUDIO_BASE_URL}/${PIPER_AUDIO_SPRITE_PREFIX}-${String(shard).padStart(2, "0")}.webm`;
}

function getAudio(shard: number): HTMLAudioElement {
  const cached = audioCache.get(shard);
  if (cached) return cached;

  const audio = new Audio(shardUrl(shard));
  audio.preload = "metadata";
  audioCache.set(shard, audio);
  if (audioCache.size > 8) {
    const removable = [...audioCache.entries()].find(
      ([cachedShard, candidate]) => cachedShard !== shard && candidate !== activeAudio,
    );
    if (removable) {
      const [oldest, removed] = removable;
      removed?.pause();
      removed?.removeAttribute("src");
      removed?.load();
      audioCache.delete(oldest);
    }
  }
  return audio;
}

function stopCurrentAudio() {
  playbackGeneration += 1;
  if (activeTimeout !== null) {
    window.clearTimeout(activeTimeout);
    activeTimeout = null;
  }
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
}

export function preloadGermanAudio(cardId: string): void {
  const clip = piperAudioClips[cardId];
  if (!clip || !supportsPiperAudio()) return;
  getAudio(clip[0]).load();
}

export function speakGerman(cardId: string, text: string): boolean {
  const clip = piperAudioClips[cardId];
  if (!clip || !supportsPiperAudio()) return speakWithSystemVoice(text);

  stopCurrentAudio();
  window.speechSynthesis?.cancel();
  const generation = playbackGeneration;
  const [shard, start, duration] = clip;
  const audio = getAudio(shard);
  activeAudio = audio;

  const fallback = () => {
    if (generation !== playbackGeneration) return;
    stopCurrentAudio();
    speakWithSystemVoice(text);
  };

  const playSegment = () => {
    if (generation !== playbackGeneration) return;
    try {
      audio.currentTime = start;
      const playback = audio.play();
      playback
        .then(() => {
          if (generation !== playbackGeneration) return;
          activeTimeout = window.setTimeout(() => {
            if (generation !== playbackGeneration) return;
            audio.pause();
            activeAudio = null;
            activeTimeout = null;
          }, Math.ceil((duration + 0.12) * 1000));
        })
        .catch(fallback);
    } catch {
      fallback();
    }
  };

  if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
    playSegment();
  } else {
    audio.addEventListener("loadedmetadata", playSegment, { once: true });
    audio.addEventListener("error", fallback, { once: true });
    audio.load();
  }
  return true;
}
