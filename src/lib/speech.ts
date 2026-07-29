import {
  PIPER_AUDIO_BASE_URL,
  PIPER_AUDIO_MIME_TYPE,
  PIPER_AUDIO_SPRITE_PREFIX,
  piperAudioClips,
} from "../data/piperAudioManifest";

const audioCache = new Map<number, HTMLAudioElement>();
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
  const cleanup = activeCleanup;
  activeCleanup = null;
  if (cleanup) cleanup();
  else if (activeAudio) activeAudio.pause();
  activeAudio = null;
  clearMediaSession();
}

export function preloadGermanAudio(cardId: string): void {
  const clip = piperAudioClips[cardId];
  if (!clip || !supportsPiperAudio()) return;
  getAudio(clip[0]).load();
}

export function speakGerman(cardId: string, text: string): boolean {
  const clip = piperAudioClips[cardId];
  if (!clip || !supportsPiperAudio()) return speakWithSystemVoice(text);

  bindLifecycleListeners();
  configureMediaSession();
  stopCurrentAudio();
  window.speechSynthesis?.cancel();
  const generation = playbackGeneration;
  const [shard, start, duration] = clip;
  const segmentEnd = start + duration + 0.12;
  const audio = getAudio(shard);
  activeAudio = audio;
  let finished = false;

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
    audio.removeEventListener("timeupdate", enforceSegmentBoundary);
    audio.removeEventListener("seeking", keepSeekInsideSegment);
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    if (audioCache.get(shard) === audio) audioCache.delete(shard);
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
    try {
      audio.currentTime = start;
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
