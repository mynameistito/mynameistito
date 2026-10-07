import { useEffect, useSyncExternalStore } from "react";

type Theme = "dark" | "light";
const settingsEvent = "site-settings-change";

const subscribeToSettings = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(settingsEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(settingsEvent, onChange);
  };
};

const getTheme = (): Theme =>
  window.localStorage.getItem("theme") === "light" ? "light" : "dark";
const getSound = () => window.localStorage.getItem("sound") === "on";
const getServerTheme = (): Theme => "dark";
const getServerSound = () => false;
let audioContext: AudioContext | undefined;

const updateSetting = (key: string, value: string) => {
  window.localStorage.setItem(key, value);
  window.dispatchEvent(new Event(settingsEvent));
};

const playClickSound = () => {
  audioContext ??= new AudioContext();
  const oscillator = audioContext.createOscillator();
  const volume = audioContext.createGain();
  oscillator.frequency.value = 680;
  volume.gain.setValueAtTime(0.025, audioContext.currentTime);
  volume.gain.exponentialRampToValueAtTime(
    0.001,
    audioContext.currentTime + 0.04
  );
  oscillator.connect(volume);
  volume.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.04);
};

/** Small persistent appearance and sound controls shared by site pages.
 * @returns The site preference controls.
 */
export const SiteControls = () => {
  const theme = useSyncExternalStore(
    subscribeToSettings,
    getTheme,
    getServerTheme
  );
  const soundOn = useSyncExternalStore(
    subscribeToSettings,
    getSound,
    getServerSound
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!soundOn) {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest("a, button")
      ) {
        playClickSound();
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [soundOn]);

  return (
    <div className="flex items-center gap-1">
      <button
        aria-label="Toggle click sounds"
        className="grid size-[30px] place-items-center rounded-control border border-line bg-surface text-xs text-muted transition-colors hover:text-text"
        onClick={() => updateSetting("sound", soundOn ? "off" : "on")}
        type="button"
      >
        ♪
      </button>
      <button
        aria-label="Toggle color theme"
        className="grid size-[30px] place-items-center rounded-control border border-line bg-surface text-xs text-muted transition-colors hover:text-text"
        onClick={() =>
          updateSetting("theme", theme === "dark" ? "light" : "dark")
        }
        type="button"
      >
        ◐
      </button>
    </div>
  );
};
