import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

// Audio context singleton for web
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (Platform.OS !== "web") return null;
  
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn("Web Audio API not supported");
      return null;
    }
  }
  return audioContext;
}

interface Tone {
  frequency: number;
  duration: number;
  delay: number;
}

interface SoundSpec {
  tones: Tone[];
  waveform: OscillatorType;
  volume: number;
  haptic: Haptics.NotificationFeedbackType | Haptics.ImpactFeedbackStyle;
}

const SOUND_SPECS: Record<string, SoundSpec> = {
  success: {
    tones: [
      { frequency: 880, duration: 100, delay: 0 },    // A5
      { frequency: 1320, duration: 150, delay: 100 }, // E6
    ],
    waveform: "sine",
    volume: 0.3,
    haptic: Haptics.NotificationFeedbackType.Success,
  },
  error: {
    tones: [
      { frequency: 440, duration: 150, delay: 0 },    // A4
      { frequency: 220, duration: 200, delay: 150 },  // A3
    ],
    waveform: "square",
    volume: 0.25,
    haptic: Haptics.NotificationFeedbackType.Error,
  },
  duplicate: {
    tones: [
      { frequency: 660, duration: 80, delay: 0 },     // E5
      { frequency: 660, duration: 80, delay: 150 },   // E5
    ],
    waveform: "sine",
    volume: 0.25,
    haptic: Haptics.NotificationFeedbackType.Warning,
  },
  jatra: {
    tones: [
      { frequency: 523, duration: 100, delay: 0 },    // C5
      { frequency: 659, duration: 100, delay: 100 },  // E5
      { frequency: 784, duration: 100, delay: 200 },  // G5
      { frequency: 1047, duration: 200, delay: 300 }, // C6
    ],
    waveform: "sine",
    volume: 0.35,
    haptic: Haptics.NotificationFeedbackType.Success,
  },
};

async function playTones(spec: SoundSpec): Promise<void> {
  const ctx = getAudioContext();
  
  if (ctx && Platform.OS === "web") {
    // Resume audio context if suspended (browser autoplay policy)
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    
    const now = ctx.currentTime;
    
    for (const tone of spec.tones) {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.type = spec.waveform;
      oscillator.frequency.setValueAtTime(tone.frequency, now);
      
      gainNode.gain.setValueAtTime(0, now + tone.delay / 1000);
      gainNode.gain.linearRampToValueAtTime(spec.volume, now + tone.delay / 1000 + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, now + (tone.delay + tone.duration) / 1000);
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.start(now + tone.delay / 1000);
      oscillator.stop(now + (tone.delay + tone.duration + 50) / 1000);
    }
  }
}

async function triggerHaptic(spec: SoundSpec): Promise<void> {
  if (Platform.OS === "web") return;
  
  try {
    if (spec.haptic === Haptics.NotificationFeedbackType.Success ||
        spec.haptic === Haptics.NotificationFeedbackType.Error ||
        spec.haptic === Haptics.NotificationFeedbackType.Warning) {
      await Haptics.notificationAsync(spec.haptic as Haptics.NotificationFeedbackType);
    } else {
      await Haptics.impactAsync(spec.haptic as Haptics.ImpactFeedbackStyle);
    }
  } catch (e) {
    // Haptics not available
  }
}

export async function playSuccessSound(): Promise<void> {
  const spec = SOUND_SPECS.success;
  await Promise.all([playTones(spec), triggerHaptic(spec)]);
}

export async function playErrorSound(): Promise<void> {
  const spec = SOUND_SPECS.error;
  await Promise.all([playTones(spec), triggerHaptic(spec)]);
}

export async function playDuplicateSound(): Promise<void> {
  const spec = SOUND_SPECS.duplicate;
  await Promise.all([playTones(spec), triggerHaptic(spec)]);
}

export async function playJatraSound(): Promise<void> {
  const spec = SOUND_SPECS.jatra;
  await Promise.all([playTones(spec), triggerHaptic(spec)]);
}

// Settings for audio
let audioEnabled = true;

export function setAudioEnabled(enabled: boolean): void {
  audioEnabled = enabled;
}

export function isAudioEnabled(): boolean {
  return audioEnabled;
}

// Wrapper functions that respect audio settings
export async function playScanFeedback(
  type: "success" | "error" | "duplicate" | "jatra"
): Promise<void> {
  if (!audioEnabled) {
    // Still trigger haptic even if audio is disabled
    const spec = SOUND_SPECS[type];
    await triggerHaptic(spec);
    return;
  }
  
  switch (type) {
    case "success":
      await playSuccessSound();
      break;
    case "error":
      await playErrorSound();
      break;
    case "duplicate":
      await playDuplicateSound();
      break;
    case "jatra":
      await playJatraSound();
      break;
  }
}
