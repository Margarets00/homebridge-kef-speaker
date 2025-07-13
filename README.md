# Homebridge KEF Speaker Plugin

A Homebridge plugin for KEF wireless speakers (LS50 Wireless II, LSX II, LS60) that provides complete HomeKit integration with real-time status monitoring.

## Features

- **Full HomeKit Integration**: Power control, source selection, volume adjustment, playback control
- **Real-time Status Monitoring**: 30-second interval status checking with change detection
- **Current Song Display**: Shows currently playing music in device name (configurable)
- **Siri Voice Control**: Complete voice command support
- **Multiple Speaker Support**: Configure multiple KEF speakers
- **Night Mode**: Automatic volume limiting during specified hours
- **Source Management**: WiFi, Bluetooth, TV, Optical, Coaxial, Analog, USB (model-dependent)

## Supported Models

- KEF LS50 Wireless II
- KEF LSX II  
- KEF LS60

## Installation

```bash
npm install -g homebridge-kef-speaker
```

## Configuration

Add the following to your Homebridge config.json:

```json
{
  "platform": "KefLsxII",
  "name": "KEF Speakers",
  "speakers": [
    {
      "name": "Living Room KEF",
      "ip": "192.168.1.100",
      "model": "LS50W2",
      "showCurrentSong": true,
      "restorePowerState": false,
      "polling": {
        "enabled": true,
        "interval": 30000
      }
    }
  ]
}
```

## Siri Voice Commands

### Basic Commands
```
"Hey Siri, turn on Living Room KEF"
"Hey Siri, turn off Living Room KEF"
"Hey Siri, set Living Room KEF volume to 50"
"Hey Siri, switch Living Room KEF to Bluetooth"
```

### Troubleshooting Siri Commands

If Siri voice commands don't work:

1. **Check Device Name**: Use simple, clear names like "Speaker" or "Living Room"
2. **Verify HomeKit Setup**: Ensure device is in correct room and "Use with Siri" is enabled
3. **Try Alternative Commands**:
   ```
   "Hey Siri, set Speaker volume to 50"
   "Hey Siri, turn up the volume on Speaker"
   "Hey Siri, make Speaker louder"
   ```

4. **Use Shortcuts App**: Create custom shortcuts for volume control:
   - Open Shortcuts app
   - Create new shortcut
   - Add "Control Home" action
   - Select your KEF speaker
   - Choose "Set Volume" action
   - Set trigger phrase: "KEF Volume 50"

### Creating Volume Shortcuts

1. **Open Shortcuts App**
2. **Tap "+" to create new shortcut**
3. **Add "Control Home" action**
4. **Select your KEF speaker**
5. **Choose "Set Volume" and set value**
6. **Record phrase**: "KEF Volume [number]"
7. **Save and test**: "Hey Siri, KEF Volume 50"

## Features

### Current Song Display
- Shows "Artist - Title" in device name when playing
- Updates every 30 seconds
- Configurable via `showCurrentSong` option

### Volume Control
- Available in Eve app and other HomeKit apps
- Siri voice commands (may require shortcuts)
- Range: 0-100 with 1-step precision

### Source Selection
- Automatically configured based on speaker model
- Visible in Home app as input sources
- Siri commands: "Switch KEF to Bluetooth"

## Troubleshooting

### Volume Control Issues
- **Home App**: Limited TV service UI - use Eve app
- **Siri Commands**: May require custom shortcuts
- **Control Center**: Available during music playback

### Connection Issues
- Verify speaker IP address
- Check network connectivity
- Restart Homebridge if needed

## Development

```bash
git clone https://github.com/Margarets00/homebridge-kef-speaker.git
cd homebridge-kef-speaker
npm install
npm run build
```

## License

MIT License - see LICENSE file for details.

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
