/**
 * This is the name of the platform that users will use to register the plugin in the Homebridge config.json
 */
export const PLATFORM_NAME = 'KefLsxII';

/**
 * This must match the name of your plugin as defined the package.json `name` property
 */
export const PLUGIN_NAME = 'homebridge-kef-lsx-ii';

/**
 * KEF Speaker models and their supported sources
 */
export const SPEAKER_MODELS = {
  LS50W2: {
    name: 'KEF LS50 Wireless II',
    sources: ['wifi', 'bluetooth', 'tv', 'optical', 'coaxial', 'analog'],
  },
  LSX2: {
    name: 'KEF LSX II',
    sources: ['wifi', 'bluetooth', 'tv', 'optical', 'analog', 'usb'],
  },
  LS60: {
    name: 'KEF LS60',
    sources: ['wifi', 'bluetooth', 'tv', 'optical', 'coaxial', 'analog'],
  },
} as const;

/**
 * Source display names for HomeKit
 */
export const SOURCE_NAMES = {
  wifi: 'WiFi',
  bluetooth: 'Bluetooth',
  tv: 'TV',
  optical: 'Optical',
  coaxial: 'Coaxial',
  analog: 'Analog',
  usb: 'USB',
} as const;

/**
 * Configuration interfaces
 */
export interface SpeakerConfig {
  name: string;
  ip: string;
  model: keyof typeof SPEAKER_MODELS;
  restorePowerState?: boolean;
  volumeLimit?: {
    min: number;
    max: number;
  };
  nightMode?: {
    enabled: boolean;
    maxVolume: number;
    schedule: {
      start: string;
      end: string;
    };
  };
  polling?: {
    enabled: boolean;
    interval: number;
    includeSongStatus: boolean;
    updateDisplayName: boolean;
  };
}

export interface PlatformConfig {
  name: string;
  speakers: SpeakerConfig[];
}
