# Homebridge KEF LSX II

<p align="center">
<img src="https://github.com/homebridge/branding/raw/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">
</p>

<span align="center">

# Homebridge KEF LSX II Plugin

</span>

A Homebridge plugin for controlling KEF wireless speakers (LS50 Wireless II, LSX II, LS60) through HomeKit.

## Features

- **Full HomeKit Integration**: Control your KEF speakers with Siri, HomeKit automations, and the Home app
- **Television Service**: Uses HomeKit's Television service for complete control including power, volume, source selection, and playback
- **Voice Control**: "Hey Siri, turn on Living Room Speaker", "Hey Siri, set Living Room Speaker to Bluetooth"
- **Multiple Speaker Support**: Configure multiple speakers in different rooms
- **Real-time Monitoring**: Optional polling for real-time status updates
- **Night Mode**: Automatic volume limiting during specified hours
- **Volume Limits**: Set minimum and maximum volume levels
- **Source Selection**: Switch between WiFi, Bluetooth, TV, Optical, Coaxial, Analog, and USB (model dependent)
- **Playback Control**: Play, pause, next track, previous track via HomeKit remote
- **Current Song Display**: Optionally display current playing song as speaker name

## Supported Models

- **KEF LS50 Wireless II**: WiFi, Bluetooth, TV, Optical, Coaxial, Analog
- **KEF LSX II**: WiFi, Bluetooth, TV, Optical, Analog, USB  
- **KEF LS60**: WiFi, Bluetooth, TV, Optical, Coaxial, Analog

## Installation

1. Install Homebridge (if not already installed)
2. Install this plugin via the Homebridge UI or manually:
   ```bash
   npm install -g homebridge-kef-lsx-ii
   ```

## Configuration

Configure the plugin through the Homebridge UI or manually edit your `config.json`:

```json
{
  "platforms": [
    {
      "platform": "KefLsxII",
      "name": "KEF Speakers",
      "speakers": [
        {
          "name": "Living Room Speaker",
          "ip": "192.168.1.100",
          "model": "LS50W2",
          "restorePowerState": false,
          "volumeLimit": {
            "min": 0,
            "max": 80
          },
          "nightMode": {
            "enabled": true,
            "maxVolume": 30,
            "schedule": {
              "start": "22:00",
              "end": "07:00"
            }
          },
          "polling": {
            "enabled": true,
            "interval": 5000,
            "includeSongStatus": true,
            "updateDisplayName": false
          }
        }
      ]
    }
  ]
}
```

### Configuration Options

#### Speaker Settings
- `name`: Display name for the speaker in HomeKit
- `ip`: IP address of your KEF speaker
- `model`: Speaker model (`LS50W2`, `LSX2`, or `LS60`)
- `restorePowerState`: Restore power state when Homebridge starts (optional)

#### Volume Limits
- `volumeLimit.min`: Minimum volume level (0-100)
- `volumeLimit.max`: Maximum volume level (0-100)

#### Night Mode
- `nightMode.enabled`: Enable automatic night mode
- `nightMode.maxVolume`: Maximum volume during night hours
- `nightMode.schedule.start`: Night mode start time (HH:MM)
- `nightMode.schedule.end`: Night mode end time (HH:MM)

#### Real-time Monitoring
- `polling.enabled`: Enable real-time status updates
- `polling.interval`: Polling interval in milliseconds (1000-60000)
- `polling.includeSongStatus`: Include song progress in polling
- `polling.updateDisplayName`: Update speaker name with current song

## Finding Your Speaker's IP Address

1. Open the KEF Connect app
2. Tap the gear icon (bottom right)
3. Select your speaker name
4. Tap the "i" icon next to your speaker in "My Speakers"
5. Find the IP address under "IP address"

## HomeKit Usage

### Voice Commands
- "Hey Siri, turn on Living Room Speaker"
- "Hey Siri, set Living Room Speaker to Bluetooth"
- "Hey Siri, set Living Room Speaker volume to 50"
- "Hey Siri, pause Living Room Speaker"
- "Hey Siri, play Living Room Speaker"
- "Hey Siri, next track on Living Room Speaker"

### Home App
- **Power**: Use the power button to turn speaker on/off
- **Volume**: Use the volume slider
- **Source**: Select from available input sources
- **Playback**: Use remote control for play/pause/next/previous

### Automations
Create automations to:
- Turn on speakers when you arrive home
- Set specific volume levels at certain times
- Switch to specific sources based on triggers
- Integrate with other HomeKit devices

## Development

### Setup
```bash
git clone https://github.com/USERNAME/homebridge-kef-lsx-ii.git
cd homebridge-kef-lsx-ii
npm install
```

### Build
```bash
npm run build
```

### Development Mode
```bash
npm run watch
```

### Lint
```bash
npm run lint
```

## Technical Details

This plugin is based on the [pykefcontrol](https://github.com/N0ciple/pykefcontrol) Python library and implements the KEF speaker's HTTP API for control.

The plugin uses HomeKit's Television service to provide:
- Power control via `Active` characteristic
- Volume control via `Volume` characteristic  
- Source selection via `ActiveIdentifier` and `InputSource` services
- Playback control via `RemoteKey` characteristic
- Mute control via `Mute` characteristic

## Troubleshooting

### Speaker Not Found
- Ensure your speaker and Homebridge are on the same network
- Verify the IP address is correct
- Check that the speaker is powered on and connected to WiFi

### Connection Issues
- Restart the speaker by unplugging for 10 seconds
- Check firewall settings
- Ensure the KEF Connect app can connect to the speaker

### Volume/Source Issues
- Verify the speaker model configuration matches your actual speaker
- Check that the requested source is supported by your speaker model
- Ensure volume limits are configured correctly

## Credits

- Based on [pykefcontrol](https://github.com/N0ciple/pykefcontrol) by Robin Dupont
- Built with [Homebridge](https://homebridge.io/)
- KEF API reverse engineering by the community

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Changelog

### 1.0.0
- Initial release
- Support for LS50 Wireless II, LSX II, and LS60
- Full HomeKit Television service implementation
- Real-time polling support
- Night mode with scheduling
- Volume limiting
- Multi-speaker support
