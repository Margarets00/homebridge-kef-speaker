import type { API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service } from 'homebridge';
import * as cron from 'node-cron';

import { KefSpeakerAccessory } from './platformAccessory.js';
import { PLATFORM_NAME, PLUGIN_NAME, SPEAKER_MODELS, type SpeakerConfig, type PlatformConfig as KefPlatformConfig } from './settings.js';
import { KefConnector } from './kefConnector.js';

/**
 * KEF LSX II Platform
 * This class is the main constructor for the KEF speaker plugin
 */
export class KefLsxIIPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // Track restored cached accessories
  public readonly accessories: Map<string, PlatformAccessory> = new Map();
  public readonly discoveredCacheUUIDs: string[] = [];

  // Track speaker accessories
  private readonly speakerAccessories: Map<string, KefSpeakerAccessory> = new Map();

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig & KefPlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.log.debug('Finished initializing platform:', this.config.name);

    // Validate configuration
    if (!this.config.speakers || !Array.isArray(this.config.speakers)) {
      this.log.error('No speakers configured. Please add speakers in the plugin settings.');
      return;
    }

    // When this event is fired it means Homebridge has restored all cached accessories from disk
    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');
      this.discoverDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    
    // Add the restored accessory to the accessories cache
    this.accessories.set(accessory.UUID, accessory);
    this.discoveredCacheUUIDs.push(accessory.UUID);
  }

  /**
   * Discover and register speaker devices
   */
  async discoverDevices() {
    for (const speakerConfig of this.config.speakers) {
      await this.setupSpeaker(speakerConfig);
    }

    // Remove any accessories that are no longer configured
    for (const [uuid, accessory] of this.accessories) {
      if (!this.discoveredCacheUUIDs.includes(uuid)) {
        this.log.info('Removing existing accessory from cache:', accessory.displayName);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.accessories.delete(uuid);
      }
    }
  }

  /**
   * Setup individual speaker
   */
  private async setupSpeaker(speakerConfig: SpeakerConfig) {
    // Validate speaker configuration
    if (!speakerConfig.name || !speakerConfig.ip || !speakerConfig.model) {
      this.log.error('Invalid speaker configuration. Name, IP, and model are required.');
      return;
    }

    // Validate speaker model
    if (!SPEAKER_MODELS[speakerConfig.model]) {
      this.log.error(`Unsupported speaker model: ${speakerConfig.model}`);
      return;
    }

    // Generate UUID for this speaker
    const uuid = this.api.hap.uuid.generate(speakerConfig.ip);

    // Check if accessory already exists
    let accessory = this.accessories.get(uuid);

    if (accessory) {
      // Update existing accessory
      this.log.info('Restoring existing accessory from cache:', accessory.displayName);
      
      // Update context with new config
      accessory.context.speaker = speakerConfig;
      
      // Update accessory information
      accessory.getService(this.Service.AccessoryInformation)!
        .setCharacteristic(this.Characteristic.Manufacturer, 'KEF')
        .setCharacteristic(this.Characteristic.Model, SPEAKER_MODELS[speakerConfig.model].name)
        .setCharacteristic(this.Characteristic.Name, speakerConfig.name);
    } else {
      // Create new accessory
      this.log.info('Adding new accessory:', speakerConfig.name);
      
      accessory = new this.api.platformAccessory(speakerConfig.name, uuid);
      
      // Set accessory context
      accessory.context.speaker = speakerConfig;
      
      // Set accessory information
      accessory.getService(this.Service.AccessoryInformation)!
        .setCharacteristic(this.Characteristic.Manufacturer, 'KEF')
        .setCharacteristic(this.Characteristic.Model, SPEAKER_MODELS[speakerConfig.model].name)
        .setCharacteristic(this.Characteristic.SerialNumber, speakerConfig.ip);

      // Register the accessory
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      this.accessories.set(uuid, accessory);
    }

    // Create speaker accessory handler
    const speakerAccessory = new KefSpeakerAccessory(this, accessory);
    this.speakerAccessories.set(uuid, speakerAccessory);

    // Test connection
    try {
      const connector = new KefConnector(speakerConfig.ip, this.log);
      await connector.getStatus();
      this.log.info(`Successfully connected to speaker: ${speakerConfig.name} (${speakerConfig.ip})`);
    } catch (error) {
      this.log.error(`Failed to connect to speaker: ${speakerConfig.name} (${speakerConfig.ip})`, error);
    }

    // Setup night mode cron job if enabled
    if (speakerConfig.nightMode?.enabled) {
      this.setupNightMode(speakerConfig, speakerAccessory);
    }

    // Mark as discovered
    this.discoveredCacheUUIDs.push(uuid);
  }

  /**
   * Setup night mode scheduling
   */
  private setupNightMode(speakerConfig: SpeakerConfig, speakerAccessory: KefSpeakerAccessory) {
    const nightMode = speakerConfig.nightMode!;
    
    // Parse schedule times
    const [startHour, startMinute] = nightMode.schedule.start.split(':').map(Number);
    const [endHour, endMinute] = nightMode.schedule.end.split(':').map(Number);
    
    // Start night mode cron job
    cron.schedule(`${startMinute} ${startHour} * * *`, () => {
      this.log.info(`Activating night mode for ${speakerConfig.name}`);
      speakerAccessory.activateNightMode();
    }, {
      scheduled: true,
      timezone: 'America/New_York', // You might want to make this configurable
    });

    // End night mode cron job
    cron.schedule(`${endMinute} ${endHour} * * *`, () => {
      this.log.info(`Deactivating night mode for ${speakerConfig.name}`);
      speakerAccessory.deactivateNightMode();
    }, {
      scheduled: true,
      timezone: 'America/New_York', // You might want to make this configurable
    });

    this.log.info(`Night mode scheduled for ${speakerConfig.name}: ${nightMode.schedule.start} - ${nightMode.schedule.end}`);
  }

  /**
   * Get speaker accessory by UUID
   */
  getSpeakerAccessory(uuid: string): KefSpeakerAccessory | undefined {
    return this.speakerAccessories.get(uuid);
  }

  /**
   * Get all speaker accessories
   */
  getAllSpeakerAccessories(): KefSpeakerAccessory[] {
    return Array.from(this.speakerAccessories.values());
  }
}
