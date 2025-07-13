import type { Logger } from 'homebridge';

/**
 * KEF Speaker states and interfaces
 */
export interface SpeakerStatus {
  power: 'powerOn' | 'standby';
  source: string;
  volume: number;
  muted: boolean;
  isPlaying: boolean;
  songInfo?: {
    title?: string;
    artist?: string;
    album?: string;
    coverUrl?: string;
  };
  songLength?: number;
  songProgress?: number;
}

export interface SpeakerChange {
  power?: 'powerOn' | 'standby';
  source?: string;
  volume?: number;
  muted?: boolean;
  isPlaying?: boolean;
  songInfo?: {
    title?: string;
    artist?: string;
    album?: string;
    coverUrl?: string;
  };
  songLength?: number;
  songProgress?: number;
}

/**
 * KEF Speaker Connector
 * Based on pykefcontrol Python library
 */
export class KefConnector {
  private readonly baseUrl: string;

  constructor(
    private readonly host: string,
    private readonly log: Logger,
  ) {
    this.baseUrl = `http://${host}/api`;
  }

  /**
   * Power control
   */
  async powerOn(): Promise<void> {
    await this.setStatus('powerOn');
  }

  async shutdown(): Promise<void> {
    await this.setSource('standby');
  }

  /**
   * Volume control
   */
  async getVolume(): Promise<number> {
    const response = await this.apiRequest('getData', {
      path: 'player:volume',
      roles: 'value',
    });
    return response[0]?.i32_ || 0;
  }

  async setVolume(volume: number): Promise<void> {
    await this.apiRequest('setData', {
      path: 'player:volume',
      roles: 'value',
      value: JSON.stringify({ type: 'i32_', i32_: volume }),
    });
  }

  async mute(): Promise<void> {
    await this.setVolume(0);
  }

  async unmute(previousVolume: number): Promise<void> {
    await this.setVolume(previousVolume);
  }

  /**
   * Source control
   */
  async getSource(): Promise<string> {
    const response = await this.apiRequest('getData', {
      path: 'settings:/kef/play/physicalSource',
      roles: 'value',
    });
    return response[0]?.kefPhysicalSource || 'standby';
  }

  async setSource(source: string): Promise<void> {
    await this.apiRequest('setData', {
      path: 'settings:/kef/play/physicalSource',
      roles: 'value',
      value: JSON.stringify({ type: 'kefPhysicalSource', kefPhysicalSource: source }),
    });
  }

  /**
   * Status control
   */
  async getStatus(): Promise<'powerOn' | 'standby'> {
    const response = await this.apiRequest('getData', {
      path: 'settings:/kef/host/speakerStatus',
      roles: 'value',
    });
    return response[0]?.kefSpeakerStatus || 'standby';
  }

  async setStatus(status: 'powerOn' | 'standby'): Promise<void> {
    await this.apiRequest('setData', {
      path: 'settings:/kef/play/physicalSource',
      roles: 'value',
      value: JSON.stringify({ type: 'kefPhysicalSource', kefPhysicalSource: status }),
    });
  }

  /**
   * Playback control
   */
  async togglePlayPause(): Promise<void> {
    await this.trackControl('pause');
  }

  async nextTrack(): Promise<void> {
    await this.trackControl('next');
  }

  async previousTrack(): Promise<void> {
    await this.trackControl('previous');
  }

  private async trackControl(command: string): Promise<void> {
    await this.apiRequest('setData', {
      path: 'player:player/control',
      roles: 'activate',
      value: JSON.stringify({ control: command }),
    });
  }

  /**
   * Media information
   */
  async getPlayerData(): Promise<any> {
    const response = await this.apiRequest('getData', {
      path: 'player:player/data',
      roles: 'value',
    });
    return response[0] || {};
  }

  async getSongInformation(): Promise<{ title?: string; artist?: string; album?: string; coverUrl?: string }> {
    const playerData = await this.getPlayerData();
    
    return {
      title: playerData.trackRoles?.title,
      artist: playerData.trackRoles?.mediaData?.metaData?.artist,
      album: playerData.trackRoles?.mediaData?.metaData?.album,
      coverUrl: playerData.trackRoles?.icon,
    };
  }

  async isPlaying(): Promise<boolean> {
    const playerData = await this.getPlayerData();
    return playerData.state === 'playing';
  }

  async getSongLength(): Promise<number | undefined> {
    const playerData = await this.getPlayerData();
    return playerData.status?.duration;
  }

  async getSongProgress(): Promise<number> {
    const response = await this.apiRequest('getData', {
      path: 'player:player/data/playTime',
      roles: 'value',
    });
    return response[0]?.i64_ || 0;
  }

  /**
   * Speaker information
   */
  async getSpeakerName(): Promise<string> {
    const response = await this.apiRequest('getData', {
      path: 'settings:/deviceName',
      roles: 'value',
    });
    return response[0]?.string_ || 'KEF Speaker';
  }

  async getMacAddress(): Promise<string> {
    const response = await this.apiRequest('getData', {
      path: 'settings:/system/primaryMacAddress',
      roles: 'value',
    });
    return response[0]?.string_ || '';
  }

  async getSpeakerModel(): Promise<string> {
    const response = await this.apiRequest('getData', {
      path: 'settings:/releasetext',
      roles: 'value',
    });
    const releaseText = response[0]?.string_ || '';
    return releaseText.split('_')[0] || 'Unknown';
  }

  async getFirmwareVersion(): Promise<string> {
    const response = await this.apiRequest('getData', {
      path: 'settings:/releasetext',
      roles: 'value',
    });
    const releaseText = response[0]?.string_ || '';
    return releaseText.split('_')[1] || 'Unknown';
  }





  private extractSongInfo(playerData: any): { title?: string; artist?: string; album?: string; coverUrl?: string } {
    return {
      title: playerData.trackRoles?.title,
      artist: playerData.trackRoles?.mediaData?.metaData?.artist,
      album: playerData.trackRoles?.mediaData?.metaData?.album,
      coverUrl: playerData.trackRoles?.icon,
    };
  }

  /**
   * Get complete speaker status for periodic checking
   */
  async getCompleteStatus(): Promise<SpeakerStatus> {
    try {
      const [power, source, volume, muted, isPlaying, songInfo] = await Promise.all([
        this.getStatus(),
        this.getSource(),
        this.getVolume(),
        this.apiRequest('getData', { path: 'settings:/kef/play/mute', roles: 'value' })
          .then(response => response[0]?.bool_ || false),
        this.isPlaying(),
        this.getSongInformation(),
      ]);

      return {
        power,
        source,
        volume,
        muted,
        isPlaying,
        songInfo,
      };
    } catch (error) {
      this.log.error('Error getting complete status:', error);
      throw error;
    }
  }

  /**
   * Check if speaker status has changed since last check
   */
  async checkForChanges(lastStatus: SpeakerStatus): Promise<SpeakerChange> {
    try {
      const currentStatus = await this.getCompleteStatus();
      const changes: SpeakerChange = {};

      // Check for changes
      if (currentStatus.power !== lastStatus.power) {
        changes.power = currentStatus.power;
      }
      if (currentStatus.source !== lastStatus.source) {
        changes.source = currentStatus.source;
      }
      if (currentStatus.volume !== lastStatus.volume) {
        changes.volume = currentStatus.volume;
      }
      if (currentStatus.muted !== lastStatus.muted) {
        changes.muted = currentStatus.muted;
      }
      if (currentStatus.isPlaying !== lastStatus.isPlaying) {
        changes.isPlaying = currentStatus.isPlaying;
      }

      return changes;
    } catch (error) {
      this.log.error('Error checking for changes:', error);
      return {};
    }
  }

  /**
   * API request helper
   */
  private async apiRequest(endpoint: string, params: any, method = 'GET'): Promise<any> {
    const url = `${this.baseUrl}/${endpoint}`;
    
    try {
      let response: Response;
      
      if (method === 'POST') {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        });
      } else {
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
          searchParams.append(key, String(value));
        }
        response = await fetch(`${url}?${searchParams}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.log.error(`API request failed: ${error}`);
      throw error;
    }
  }
} 