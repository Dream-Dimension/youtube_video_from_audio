# Mouth Animation Video Generator

A Node.js application that analyzes audio files and generates animated videos with mouth movements synchronized to the audio. The system uses volume detection to determine appropriate mouth states (closed, open, tongue) and creates a video with corresponding mouth images.

## Features

- 🎵 Audio volume analysis with ffmpeg
- 🎨 Dynamic mouth state selection based on audio levels
- 🎬 Video generation with synchronized audio
- 📊 Real-time progress tracking with detailed logging
- 🖼️ Support for custom mouth images

## Prerequisites

- **Node.js** (v14 or higher)
- **FFmpeg** - Required for audio/video processing
  - On Ubuntu/Debian: `sudo apt install ffmpeg`
  - On macOS: `brew install ffmpeg`
  - On Windows: Download from [FFmpeg website](https://ffmpeg.org/download.html)

## Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Quick Start

1. Place your audio file in the project directory and name it according to `AUDIO_PATH` in `index.js` (default: `longvoice.m4a`)
2. Ensure mouth images are present:
   - `mouth_closed.png` - Closed mouth state
   - `mouth_open.png` - Open mouth state  
   - `mouth_tongue.png` - Tongue/wide open state
3. Run the generator:
   ```bash
   node index.js
   ```

### Output

The script generates `final_video.mp4` with:
- Synchronized mouth animations based on audio volume
- Original audio track
- 10 fps frame rate (configurable)

## Configuration

Edit the configuration section in `index.js`:

```javascript
const AUDIO_PATH = 'longvoice.m4a';        // Your audio file
const FRAME_RATE = 10;                     // Frames per second
const OUTPUT_VIDEO = 'output.mp4';         // Temporary video file
const FINAL_VIDEO = 'final_video.mp4';     // Final output file
```

### Volume Thresholds

Mouth states are determined by audio volume levels:
- **Volume > -30dB**: `tongue` state (loudest)
- **Volume > -40dB**: `open` state (medium)
- **Volume ≤ -40dB**: `closed` state (quiet/silent)

Adjust these thresholds in the `main()` function as needed.

## File Structure

```
mouth_moving/
├── index.js              # Main application
├── package.json          # Dependencies
├── README.md             # This file
├── .gitignore            # Git ignore rules
├── mouth_closed.png      # Closed mouth image
├── mouth_open.png        # Open mouth image
├── mouth_tongue.png      # Tongue/wide mouth image
├── longvoice.m4a         # Your audio file
└── final_video.mp4       # Generated output
```

## Image Requirements

Mouth images should be:
- **Dimensions**: 512x1024 pixels (or consistent aspect ratio)
- **Format**: PNG with transparent or white background
- **Content**: Clear mouth shapes for different states

## Logging

The application uses detailed logging with progress indicators:
- **Info level**: Shows major steps and progress
- **Debug level**: Detailed frame-by-frame information
- **Error level**: Problem diagnosis

To change log level, modify in `index.js`:
```javascript
log.setLevel('debug');  // Options: trace, debug, info, warn, error
```

## Troubleshooting

### Common Issues

1. **"Cannot find ffprobe" error**
   - Install FFmpeg on your system
   - Ensure `ffmpeg` and `ffprobe` are in your PATH

2. **"invalid ELF header" canvas error**
   - Run `npm rebuild canvas` to recompile for your platform

3. **Audio file not found**
   - Check the `AUDIO_PATH` matches your audio file name
   - Ensure the audio file is in the project directory

4. **Images not displaying correctly**
   - Verify image dimensions match canvas size (512x1024)
   - Check image file paths in `MOUTH_IMAGES` configuration

### Supported Audio Formats

- M4A, MP3, WAV, AAC, OGG
- Any format supported by FFmpeg

### Performance Notes

- Processing time depends on audio length and frame rate
- 10 fps provides good balance of quality and performance
- Higher frame rates increase processing time significantly

## Dependencies

- **fluent-ffmpeg**: Audio/video processing
- **canvas**: Image manipulation and frame generation
- **loglevel**: Enhanced logging with progress tracking

## License

ISC License - See package.json for details.