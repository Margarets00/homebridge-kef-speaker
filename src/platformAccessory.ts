import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import type { KefLsxIIPlatform } from './platform.js';
import { KefConnector, type SpeakerStatus, type SpeakerChange } from './kefConnector.js';
import { SPEAKER_MODELS, SOURCE_NAMES, type SpeakerConfig } from './settings.js';

/**
 * KEF Speaker Accessory
 * Implements HomeKit Television Service for complete speaker control
 */
export class KefSpeakerAccessory {
  private service: Service;
  private speakerService: Service;
  private inputSources: Service[] = [];
  private connector: KefConnector;
  private speakerConfig: SpeakerConfig;
  
  // Current speaker state
  private currentStatus: SpeakerStatus = {
    power: 'standby',
    source: 'wifi',
    volume: 0,
    muted: false,
    isPlaying: false,
  };
  
  // Night mode state
  private nightModeActive = false;
  private previousVolume = 50;
  
  // Polling
  private pollingInterval?: NodeJS.Timeout;
  private pollingActive = false;

  constructor(
    private readonly platform: KefLsxIIPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.speakerConfig = accessory.context.speaker;
    this.connector = new KefConnector(this.speakerConfig.ip, this.platform.log);

    // Set up Television service
    this.service = this.accessory.getService(this.platform.Service.Television) ||
      this.accessory.addService(this.platform.Service.Television);

    this.service.setCharacteristic(this.platform.Characteristic.ConfiguredName, this.speakerConfig.name);
    this.service.setCharacteristic(this.platform.Characteristic.SleepDiscoveryMode, 
      this.platform.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);

    // Set up Television Speaker service
    this.speakerService = this.accessory.getService(this.platform.Service.TelevisionSpeaker) ||
      this.accessory.addService(this.platform.Service.TelevisionSpeaker);

    this.speakerService.setCharacteristic(this.platform.Characteristic.Active, 
      this.platform.Characteristic.Active.ACTIVE);
    this.speakerService.setCharacteristic(this.platform.Characteristic.VolumeControlType, 
      this.platform.Characteristic.VolumeControlType.ABSOLUTE);

    // Set up input sources
    this.setupInputSources();

    // Set up event handlers
    this.setupEventHandlers();

    // Initialize speaker state
    this.initializeSpeaker();

    // Start polling if enabled
    if (this.speakerConfig.polling?.enabled) {
      this.startPolling();
    }
  }

  /**
   * Setup input sources based on speaker model
   */
  private setupInputSources() {
    const supportedSources = SPEAKER_MODELS[this.speakerConfig.model].sources;
    
    // Remove existing input sources
    this.inputSources.forEach(source => {
      this.accessory.removeService(source);
    });
    this.inputSources = [];

    // Create input sources
    supportedSources.forEach((source, index) => {
      const inputSource = this.accessory.addService(this.platform.Service.InputSource, source, source);
      
      inputSource.setCharacteristic(this.platform.Characteristic.Identifier, index);
      inputSource.setCharacteristic(this.platform.Characteristic.ConfiguredName, SOURCE_NAMES[source]);
      inputSource.setCharacteristic(this.platform.Characteristic.IsConfigured, 
        this.platform.Characteristic.IsConfigured.CONFIGURED);
      inputSource.setCharacteristic(this.platform.Characteristic.InputSourceType, 
        this.getInputSourceType(source));
      
      this.service.addLinkedService(inputSource);
      this.inputSources.push(inputSource);
    });
  }

  /**
   * Get HomeKit input source type for KEF source
   */
  private getInputSourceType(source: string): number {
    switch (source) {
      case 'wifi':
        return this.platform.Characteristic.InputSourceType.OTHER;
      case 'bluetooth':
        return this.platform.Characteristic.InputSourceType.OTHER;
      case 'tv':
        return this.platform.Characteristic.InputSourceType.HDMI;
      case 'optical':
        return this.platform.Characteristic.InputSourceType.OTHER;
      case 'coaxial':
        return this.platform.Characteristic.InputSourceType.OTHER;
      case 'analog':
        return this.platform.Characteristic.InputSourceType.COMPOSITE_VIDEO;
      case 'usb':
        return this.platform.Characteristic.InputSourceType.USB;
      default:
        return this.platform.Characteristic.InputSourceType.OTHER;
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers() {
    // Active (Power) control
    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .onGet(this.getActive.bind(this))
      .onSet(this.setActive.bind(this));

    // Active Identifier (Source) control
    this.service.getCharacteristic(this.platform.Characteristic.ActiveIdentifier)
      .onGet(this.getActiveIdentifier.bind(this))
      .onSet(this.setActiveIdentifier.bind(this));

    // Remote Key (Playback control)
    this.service.getCharacteristic(this.platform.Characteristic.RemoteKey)
      .onSet(this.setRemoteKey.bind(this));

    // Volume control
    this.speakerService.getCharacteristic(this.platform.Characteristic.Volume)
      .onGet(this.getVolume.bind(this))
      .onSet(this.setVolume.bind(this));

    // Mute control
    this.speakerService.getCharacteristic(this.platform.Characteristic.Mute)
      .onGet(this.getMute.bind(this))
      .onSet(this.setMute.bind(this));

    // Volume Selector (for remote control)
    this.speakerService.getCharacteristic(this.platform.Characteristic.VolumeSelector)
      .onSet(this.setVolumeSelector.bind(this));
  }

  /**
   * Initialize speaker state
   */
  private async initializeSpeaker() {
    try {
      // Get current speaker status
      this.currentStatus = await this.connector.getCompleteStatus();
      
      // Update HomeKit characteristics
      this.updateHomeKitState();
      
      // Restore power state if configured
      if (this.speakerConfig.restorePowerState && this.currentStatus.power === 'standby') {
        await this.connector.powerOn();
        this.currentStatus.power = 'powerOn';
      }
      
      this.platform.log.info(`Speaker initialized: ${this.speakerConfig.name}`);
    } catch (error) {
      this.platform.log.error(`Failed to initialize speaker ${this.speakerConfig.name}:`, error);
    }
  }

  /**
   * Update HomeKit characteristics based on current status
   */
  private updateHomeKitState() {
    // Update power state
    this.service.updateCharacteristic(this.platform.Characteristic.Active, 
      this.currentStatus.power === 'powerOn' ? 
        this.platform.Characteristic.Active.ACTIVE : 
        this.platform.Characteristic.Active.INACTIVE);

    // Update source
    const supportedSources = SPEAKER_MODELS[this.speakerConfig.model].sources;
    const sourceIndex = supportedSources.indexOf(this.currentStatus.source as any);
    if (sourceIndex >= 0) {
      this.service.updateCharacteristic(this.platform.Characteristic.ActiveIdentifier, sourceIndex);
    }

    // Update volume
    this.speakerService.updateCharacteristic(this.platform.Characteristic.Volume, this.currentStatus.volume);
    
    // Update mute state
    this.speakerService.updateCharacteristic(this.platform.Characteristic.Mute, this.currentStatus.muted);

    // Update display name with current song if enabled
    if (this.speakerConfig.polling?.updateDisplayName && this.currentStatus.songInfo?.title) {
      const songName = this.currentStatus.songInfo.artist ? 
        `${this.currentStatus.songInfo.title} - ${this.currentStatus.songInfo.artist}` : 
        this.currentStatus.songInfo.title;
      this.service.updateCharacteristic(this.platform.Characteristic.ConfiguredName, songName);
    }
  }

  /**
   * Start polling for speaker changes
   */
  private async startPolling() {
    if (this.pollingActive) {
      return;
    }

    try {
      await this.connector.startPolling(this.speakerConfig.polling?.includeSongStatus || false);
      this.pollingActive = true;
      
      this.pollingInterval = setInterval(async () => {
        try {
          const changes = await this.connector.pollSpeaker(this.speakerConfig.polling?.interval || 5000);
          this.handleSpeakerChanges(changes);
        } catch (error) {
          this.platform.log.error(`Polling error for ${this.speakerConfig.name}:`, error);
        }
      }, this.speakerConfig.polling?.interval || 5000);
      
      this.platform.log.info(`Started polling for ${this.speakerConfig.name}`);
    } catch (error) {
      this.platform.log.error(`Failed to start polling for ${this.speakerConfig.name}:`, error);
    }
  }

  /**
   * Stop polling
   */
  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
    this.pollingActive = false;
  }

  /**
   * Handle speaker changes from polling
   */
  private handleSpeakerChanges(changes: SpeakerChange) {
    let updated = false;

    // Update current status
    if (changes.power !== undefined) {
      this.currentStatus.power = changes.power;
      updated = true;
    }
    
    if (changes.source !== undefined) {
      this.currentStatus.source = changes.source;
      updated = true;
    }
    
    if (changes.volume !== undefined) {
      this.currentStatus.volume = changes.volume;
      updated = true;
    }
    
    if (changes.muted !== undefined) {
      this.currentStatus.muted = changes.muted;
      updated = true;
    }
    
    if (changes.isPlaying !== undefined) {
      this.currentStatus.isPlaying = changes.isPlaying;
      updated = true;
    }
    
    if (changes.songInfo !== undefined) {
      this.currentStatus.songInfo = changes.songInfo;
      updated = true;
    }

    // Update HomeKit if there were changes
    if (updated) {
      this.updateHomeKitState();
    }
  }

  /**
   * Get power state
   */
  async getActive(): Promise<CharacteristicValue> {
    try {
      const status = await this.connector.getStatus();
      this.currentStatus.power = status;
      return status === 'powerOn' ? 
        this.platform.Characteristic.Active.ACTIVE : 
        this.platform.Characteristic.Active.INACTIVE;
    } catch (error) {
      this.platform.log.error(`Failed to get power state for ${this.speakerConfig.name}:`, error);
      return this.platform.Characteristic.Active.INACTIVE;
    }
  }

  /**
   * Set power state
   */
  async setActive(value: CharacteristicValue) {
    try {
      if (value === this.platform.Characteristic.Active.ACTIVE) {
        await this.connector.powerOn();
        this.currentStatus.power = 'powerOn';
      } else {
        await this.connector.shutdown();
        this.currentStatus.power = 'standby';
      }
      this.platform.log.info(`Set power ${value ? 'ON' : 'OFF'} for ${this.speakerConfig.name}`);
    } catch (error) {
      this.platform.log.error(`Failed to set power state for ${this.speakerConfig.name}:`, error);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  /**
   * Get active source
   */
  async getActiveIdentifier(): Promise<CharacteristicValue> {
    try {
      const source = await this.connector.getSource();
      this.currentStatus.source = source;
      
      const supportedSources = SPEAKER_MODELS[this.speakerConfig.model].sources;
      const sourceIndex = supportedSources.indexOf(source as any);
      return sourceIndex >= 0 ? sourceIndex : 0;
    } catch (error) {
      this.platform.log.error(`Failed to get source for ${this.speakerConfig.name}:`, error);
      return 0;
    }
  }

  /**
   * Set active source
   */
  async setActiveIdentifier(value: CharacteristicValue) {
    try {
      const supportedSources = SPEAKER_MODELS[this.speakerConfig.model].sources;
      const sourceIndex = value as number;
      
      if (sourceIndex >= 0 && sourceIndex < supportedSources.length) {
        const source = supportedSources[sourceIndex];
        await this.connector.setSource(source);
        this.currentStatus.source = source;
        this.platform.log.info(`Set source to ${SOURCE_NAMES[source]} for ${this.speakerConfig.name}`);
      }
    } catch (error) {
      this.platform.log.error(`Failed to set source for ${this.speakerConfig.name}:`, error);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  /**
   * Handle remote key commands
   */
  async setRemoteKey(value: CharacteristicValue) {
    try {
      switch (value) {
        case this.platform.Characteristic.RemoteKey.PLAY_PAUSE:
          await this.connector.togglePlayPause();
          this.platform.log.info(`Toggle play/pause for ${this.speakerConfig.name}`);
          break;
        case this.platform.Characteristic.RemoteKey.NEXT_TRACK:
          await this.connector.nextTrack();
          this.platform.log.info(`Next track for ${this.speakerConfig.name}`);
          break;
        case this.platform.Characteristic.RemoteKey.PREVIOUS_TRACK:
          await this.connector.previousTrack();
          this.platform.log.info(`Previous track for ${this.speakerConfig.name}`);
          break;
        case this.platform.Characteristic.RemoteKey.ARROW_UP:
        case this.platform.Characteristic.RemoteKey.ARROW_DOWN:
        case this.platform.Characteristic.RemoteKey.ARROW_LEFT:
        case this.platform.Characteristic.RemoteKey.ARROW_RIGHT:
        case this.platform.Characteristic.RemoteKey.SELECT:
        case this.platform.Characteristic.RemoteKey.BACK:
        case this.platform.Characteristic.RemoteKey.EXIT:
        case this.platform.Characteristic.RemoteKey.INFORMATION:
          // These are not supported by KEF speakers
          break;
      }
    } catch (error) {
      this.platform.log.error(`Failed to handle remote key for ${this.speakerConfig.name}:`, error);
    }
  }

  /**
   * Get volume
   */
  async getVolume(): Promise<CharacteristicValue> {
    try {
      const volume = await this.connector.getVolume();
      this.currentStatus.volume = volume;
      return volume;
    } catch (error) {
      this.platform.log.error(`Failed to get volume for ${this.speakerConfig.name}:`, error);
      return 0;
    }
  }

  /**
   * Set volume
   */
  async setVolume(value: CharacteristicValue) {
    try {
      let volume = value as number;
      
      // Apply volume limits
      if (this.speakerConfig.volumeLimit) {
        volume = Math.max(this.speakerConfig.volumeLimit.min, 
          Math.min(this.speakerConfig.volumeLimit.max, volume));
      }
      
      // Apply night mode limits
      if (this.nightModeActive && this.speakerConfig.nightMode) {
        volume = Math.min(this.speakerConfig.nightMode.maxVolume, volume);
      }
      
      await this.connector.setVolume(volume);
      this.currentStatus.volume = volume;
      this.platform.log.info(`Set volume to ${volume} for ${this.speakerConfig.name}`);
    } catch (error) {
      this.platform.log.error(`Failed to set volume for ${this.speakerConfig.name}:`, error);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  /**
   * Get mute state
   */
  async getMute(): Promise<CharacteristicValue> {
    try {
      const volume = await this.connector.getVolume();
      this.currentStatus.muted = volume === 0;
      return this.currentStatus.muted;
    } catch (error) {
      this.platform.log.error(`Failed to get mute state for ${this.speakerConfig.name}:`, error);
      return false;
    }
  }

  /**
   * Set mute state
   */
  async setMute(value: CharacteristicValue) {
    try {
      if (value) {
        // Mute: store current volume and set to 0
        this.previousVolume = this.currentStatus.volume;
        await this.connector.mute();
        this.currentStatus.muted = true;
        this.currentStatus.volume = 0;
      } else {
        // Unmute: restore previous volume
        await this.connector.unmute(this.previousVolume);
        this.currentStatus.muted = false;
        this.currentStatus.volume = this.previousVolume;
      }
      this.platform.log.info(`Set mute ${value ? 'ON' : 'OFF'} for ${this.speakerConfig.name}`);
    } catch (error) {
      this.platform.log.error(`Failed to set mute state for ${this.speakerConfig.name}:`, error);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  /**
   * Handle volume selector (remote volume up/down)
   */
  async setVolumeSelector(value: CharacteristicValue) {
    try {
      const currentVolume = await this.connector.getVolume();
      let newVolume = currentVolume;
      
      if (value === this.platform.Characteristic.VolumeSelector.INCREMENT) {
        newVolume = Math.min(100, currentVolume + 5);
      } else if (value === this.platform.Characteristic.VolumeSelector.DECREMENT) {
        newVolume = Math.max(0, currentVolume - 5);
      }
      
      await this.setVolume(newVolume);
    } catch (error) {
      this.platform.log.error(`Failed to handle volume selector for ${this.speakerConfig.name}:`, error);
    }
  }

  /**
   * Activate night mode
   */
  activateNightMode() {
    this.nightModeActive = true;
    this.platform.log.info(`Night mode activated for ${this.speakerConfig.name}`);
  }

  /**
   * Deactivate night mode
   */
  deactivateNightMode() {
    this.nightModeActive = false;
    this.platform.log.info(`Night mode deactivated for ${this.speakerConfig.name}`);
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopPolling();
  }
}
