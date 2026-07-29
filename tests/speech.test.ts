import { afterEach, describe, expect, it, vi } from "vitest";

describe("odtwarzanie pojedynczego słowa", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("usuwa paczkę audio po klipie, więc ekran blokady nie może wznowić kolejnych słów", async () => {
    vi.useFakeTimers();

    class FakeAudio {
      static instances: FakeAudio[] = [];
      currentTime = 0;
      readyState = 1;
      paused = true;
      playCalls = 0;
      sourceRemoved = false;
      listeners = new Map<string, Set<EventListener>>();

      constructor(public src: string) {
        FakeAudio.instances.push(this);
      }

      play() {
        this.paused = false;
        this.playCalls += 1;
        return Promise.resolve();
      }

      pause() {
        this.paused = true;
      }

      load() {}

      removeAttribute(name: string) {
        if (name === "src") {
          this.src = "";
          this.sourceRemoved = true;
        }
      }

      addEventListener(type: string, listener: EventListener) {
        const listeners = this.listeners.get(type) ?? new Set<EventListener>();
        listeners.add(listener);
        this.listeners.set(type, listeners);
      }

      removeEventListener(type: string, listener: EventListener) {
        this.listeners.get(type)?.delete(listener);
      }
    }

    const mediaHandlers = new Map<string, MediaSessionActionHandler | null>();
    const mediaSession = {
      metadata: null,
      playbackState: "none",
      setActionHandler(action: MediaSessionAction, handler: MediaSessionActionHandler | null) {
        mediaHandlers.set(action, handler);
      },
    };
    const visibilityListeners: EventListener[] = [];

    vi.stubGlobal("Audio", FakeAudio);
    vi.stubGlobal("HTMLMediaElement", { HAVE_METADATA: 1 });
    vi.stubGlobal("navigator", { mediaSession });
    vi.stubGlobal("document", {
      hidden: false,
      createElement: () => ({ canPlayType: () => "probably" }),
      addEventListener: (type: string, listener: EventListener) => {
        if (type === "visibilitychange") visibilityListeners.push(listener);
      },
    });
    vi.stubGlobal("window", {
      setTimeout,
      clearTimeout,
      addEventListener: () => undefined,
      speechSynthesis: { cancel: () => undefined },
    });

    const { speakGerman } = await import("../src/lib/speech");
    expect(speakGerman("nicos-a2-ac90f0f17fca", "Test")).toBe(true);
    await Promise.resolve();

    const audio = FakeAudio.instances[0];
    expect(audio.playCalls).toBe(1);

    await vi.advanceTimersByTimeAsync(4_000);
    expect(audio.paused).toBe(true);
    expect(audio.sourceRemoved).toBe(true);
    expect(mediaSession.playbackState).toBe("none");

    mediaHandlers.get("play")?.({ action: "play" });
    await Promise.resolve();
    expect(audio.playCalls).toBe(1);
  });
});
