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
  private pollingQueue?: string;
  private lastPolled?: number;

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

  /**
   * Polling for real-time updates
   */
  async startPolling(includeSongStatus = false): Promise<string> {
    const subscriptions = [
      { path: 'settings:/mediaPlayer/playMode', type: 'itemWithValue' },
      { path: 'player:volume', type: 'itemWithValue' },
      { path: 'settings:/mediaPlayer/mute', type: 'itemWithValue' },
      { path: 'settings:/kef/host/speakerStatus', type: 'itemWithValue' },
      { path: 'settings:/kef/play/physicalSource', type: 'itemWithValue' },
      { path: 'player:player/data', type: 'itemWithValue' },
      { path: 'settings:/deviceName', type: 'itemWithValue' },
    ];

    if (includeSongStatus) {
      subscriptions.push({ path: 'player:player/data/playTime', type: 'itemWithValue' });
    }

    const response = await this.apiRequest('event/modifyQueue', {
      subscribe: subscriptions,
      unsubscribe: [],
    }, 'POST');

    this.pollingQueue = String(response).slice(1, -1);
    this.lastPolled = Date.now();
    
    return this.pollingQueue;
  }

  async pollSpeaker(timeout = 10000): Promise<SpeakerChange> {
    if (!this.pollingQueue) {
      throw new Error('Polling not started. Call startPolling() first.');
    }

    const response = await this.apiRequest('event/longPoll', {
      id: this.pollingQueue,
      timeout: timeout / 1000,
    }, 'POST');

    return this.parseEvents(response.events || {});
  }

  private parseEvents(events: any): SpeakerChange {
    const changes: SpeakerChange = {};

    for (const [eventPath, eventData] of Object.entries(events)) {
      switch (eventPath) {
        case 'settings:/kef/play/physicalSource':
          changes.source = (eventData as any).kefPhysicalSource;
          break;
        case 'player:player/data/playTime':
          changes.songProgress = (eventData as any).i64_;
          break;
        case 'player:volume':
          changes.volume = (eventData as any).i32_;
          break;
        case 'player:player/data':
          changes.songInfo = this.extractSongInfo(eventData);
          changes.songLength = (eventData as any).status?.duration;
          changes.isPlaying = (eventData as any).state === 'playing';
          break;
        case 'settings:/kef/host/speakerStatus':
          changes.power = (eventData as any).kefSpeakerStatus;
          break;
        case 'settings:/mediaPlayer/mute':
          changes.muted = (eventData as any).bool_;
          break;
      }
    }

    return changes;
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
   * Get complete speaker status
   */
  async getCompleteStatus(): Promise<SpeakerStatus> {
    const [power, source, volume, playing, songInfo, songLength, songProgress] = await Promise.all([
      this.getStatus(),
      this.getSource(),
      this.getVolume(),
      this.isPlaying(),
      this.getSongInformation(),
      this.getSongLength(),
      this.getSongProgress(),
    ]);

    return {
      power,
      source,
      volume,
      muted: volume === 0,
      isPlaying: playing,
      songInfo,
      songLength,
      songProgress,
    };
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