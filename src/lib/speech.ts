import {
  PIPER_AUDIO_BASE_URL,
  PIPER_AUDIO_MIME_TYPE,
  PIPER_AUDIO_SPRITE_PREFIX,
  piperAudioClips,
} from "../data/piperAudioManifest";
import {
  PIPER_SENTENCE_AUDIO_BASE_URL,
  PIPER_SENTENCE_AUDIO_MIME_TYPE,
  PIPER_SENTENCE_AUDIO_SPRITE_PREFIX,
  piperSentenceAudioClips,
} from "../data/piperSentenceAudioManifest";

type AudioClip = readonly [number, number, number];

interface AudioLibrary {
  baseUrl: string;
  mimeType: string;
  spritePrefix: string;
  clips: Record<string, AudioClip>;
}

const wordAudioLibrary: AudioLibrary = {
  baseUrl: PIPER_AUDIO_BASE_URL,
  mimeType: PIPER_AUDIO_MIME_TYPE,
  spritePrefix: PIPER_AUDIO_SPRITE_PREFIX,
  clips: piperAudioClips,
};

const sentenceAudioLibrary: AudioLibrary = {
  baseUrl: PIPER_SENTENCE_AUDIO_BASE_URL,
  mimeType: PIPER_SENTENCE_AUDIO_MIME_TYPE,
  spritePrefix: PIPER_SENTENCE_AUDIO_SPRITE_PREFIX,
  clips: piperSentenceAudioClips,
};

const audioCache = new Map<string, HTMLAudioElement>();
let activeAudio: HTMLAudioElement | null = null;
let activeTimeout: number | null = null;
let activeCleanup: (() => void) | null = null;
let playbackGeneration = 0;
let lifecycleListenersBound = false;
let mediaSessionConfigured = false;

function mediaSession(): MediaSession | null {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return null;
  return navigator.mediaSession;
}

function clearMediaSession(): void {
  const session = mediaSession();
  if (!session) return;
  try {
    session.playbackState = "none";
    session.metadata = null;
  } catch {
    // Media Session is only an enhancement; audio cleanup still protects the clip boundary.
  }
}

function configureMediaSession(): void {
  const session = mediaSession();
  if (!session || mediaSessionConfigured) return;
  mediaSessionConfigured = true;

  const safelySetHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler) => {
    try {
      session.setActionHandler(action, handler);
    } catch {
      // Safari may expose Media Session without supporting every action.
    }
  };

  safelySetHandler("play", () => {
    if (!activeAudio) {
      clearMediaSession();
      return;
    }
    void activeAudio.play().catch(() => stopCurrentAudio());
  });
  safelySetHandler("pause", () => activeAudio?.pause());
  safelySetHandler("seekbackward", () => undefined);
  safelySetHandler("seekforward", () => undefined);
  safelySetHandler("seekto", () => undefined);
  safelySetHandler("previoustrack", () => undefined);
  safelySetHandler("nexttrack", () => undefined);
}

function bindLifecycleListeners(): void {
  if (
    lifecycleListenersBound ||
    typeof document === "undefined" ||
    typeof window === "undefined"
  ) return;
  lifecycleListenersBound = true;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopCurrentAudio();
  });
  window.addEventListener("pagehide", () => stopCurrentAudio());
}

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

function supportsPiperAudio(library: AudioLibrary): boolean {
  if (!library.baseUrl || typeof Audio === "undefined") return false;
  const probe = document.createElement("audio");
  return Boolean(probe.canPlayType(library.mimeType));
}

function cacheKey(library: AudioLibrary, shard: number): string {
  return `${library.baseUrl}:${library.spritePrefix}:${shard}`;
}

function shardUrl(library: AudioLibrary, shard: number): string {
  return `${library.baseUrl}/${library.spritePrefix}-${String(shard).padStart(2, "0")}.webm`;
}

function getAudio(library: AudioLibrary, shard: number): HTMLAudioElement {
  const key = cacheKey(library, shard);
  const cached = audioCache.get(key);
  if (cached) return cached;

  const audio = new Audio(shardUrl(library, shard));
  audio.preload = "auto";
  audioCache.set(key, audio);
  if (audioCache.size > 8) {
    const removable = [...audioCache.entries()].find(
      ([cachedKey, candidate]) => cachedKey !== key && candidate !== activeAudio,
    );
    if (removable) {
      const [oldestKey, removed] = removable;
      removed.pause();
      removed.removeAttribute("src");
      removed.load();
      audioCache.delete(oldestKey);
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
  const cleanup = activeCleanup;
  activeCleanup = null;
  if (cleanup) cleanup();
  else if (activeAudio) activeAudio.pause();
  activeAudio = null;
  clearMediaSession();
}

function preloadAudio(library: AudioLibrary, cardId: string): void {
  const clip = library.clips[cardId];
  if (!clip || !supportsPiperAudio(library)) return;
  getAudio(library, clip[0]).load();
}

export function preloadGermanAudio(cardId: string): void {
  preloadAudio(wordAudioLibrary, cardId);
}

export function preloadGermanSentenceAudio(cardId: string): void {
  preloadAudio(sentenceAudioLibrary, cardId);
}

function speakFromLibrary(library: AudioLibrary, cardId: string, text: string): boolean {
  const clip = library.clips[cardId];
  if (!clip || !supportsPiperAudio(library)) return speakWithSystemVoice(text);

  bindLifecycleListeners();
  configureMediaSession();
  stopCurrentAudio();
  window.speechSynthesis?.cancel();
  const generation = playbackGeneration;
  const [shard, start, duration] = clip;
  const segmentEnd = start + duration + 0.12;
  const audio = getAudio(library, shard);
  const key = cacheKey(library, shard);
  activeAudio = audio;
  let finished = false;
  let startWhenReady: () => void = () => undefined;

  function finishSegment() {
    if (finished) return;
    finished = true;
    if (generation === playbackGeneration) playbackGeneration += 1;
    if (activeTimeout !== null) {
      window.clearTimeout(activeTimeout);
      activeTimeout = null;
    }
    audio.removeEventListener("loadedmetadata", playSegment);
    audio.removeEventListener("error", fallback);
    audio.removeEventListener("canplay", startWhenReady);
    audio.removeEventListener("seeked", startWhenReady);
    audio.removeEventListener("timeupdate", enforceSegmentBoundary);
    audio.removeEventListener("seeking", keepSeekInsideSegment);
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    if (audioCache.get(key) === audio) audioCache.delete(key);
    if (activeAudio === audio) activeAudio = null;
    if (activeCleanup === finishSegment) activeCleanup = null;
    clearMediaSession();
  }

  function enforceSegmentBoundary() {
    if (
      generation !== playbackGeneration ||
      audio.currentTime >= segmentEnd ||
      audio.currentTime < start - 0.15
    ) {
      finishSegment();
    }
  }

  function keepSeekInsideSegment() {
    if (generation !== playbackGeneration) return;
    if (audio.currentTime < start - 0.05 || audio.currentTime > segmentEnd) {
      try {
        audio.currentTime = start;
      } catch {
        finishSegment();
      }
    }
  }

  function fallback() {
    if (generation !== playbackGeneration) return;
    stopCurrentAudio();
    speakWithSystemVoice(text);
  }

  function playSegment() {
    if (generation !== playbackGeneration) return;

    startWhenReady = () => {
      if (generation !== playbackGeneration) return;
      if (audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) return;
      audio.removeEventListener("canplay", startWhenReady);
      audio.removeEventListener("seeked", startWhenReady);
      beginPlayback();
    };

    try {
      audio.addEventListener("canplay", startWhenReady);
      audio.addEventListener("seeked", startWhenReady);
      audio.currentTime = start;
      startWhenReady();
    } catch {
      fallback();
    }
  }

  function beginPlayback() {
    if (generation !== playbackGeneration) return;
    try {
      audio.addEventListener("timeupdate", enforceSegmentBoundary);
      audio.addEventListener("seeking", keepSeekInsideSegment);
      const playback = audio.play();
      playback
        .then(() => {
          if (generation !== playbackGeneration) return;
          const session = mediaSession();
          if (session) {
            try {
              session.playbackState = "playing";
            } catch {
              // Ignore incomplete Media Session implementations.
            }
          }
          activeTimeout = window.setTimeout(() => {
            if (generation !== playbackGeneration) return;
            finishSegment();
          }, Math.ceil((duration + 0.12) * 1000));
        })
        .catch(fallback);
    } catch {
      fallback();
    }
  }

  activeCleanup = finishSegment;
  if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
    playSegment();
  } else {
    audio.addEventListener("loadedmetadata", playSegment, { once: true });
    audio.addEventListener("error", fallback, { once: true });
    audio.load();
  }
  return true;
}

export function speakGerman(cardId: string, text: string): boolean {
  return speakFromLibrary(wordAudioLibrary, cardId, text);
}

export function speakGermanSentence(cardId: string, text: string): boolean {
  return speakFromLibrary(sentenceAudioLibrary, cardId, text);
}
