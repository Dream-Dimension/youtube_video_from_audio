const ffmpeg = require('fluent-ffmpeg');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const AUDIO_PATH = 'voice.m4a';
const IMAGE_DIR = './';
const MOUTH_IMAGES = {
    closed: path.join(IMAGE_DIR, 'mouth_closed.png'),
    open: path.join(IMAGE_DIR, 'mouth_open.png'),
    tongue: path.join(IMAGE_DIR, 'mouth_tongue.png'),
};
const FRAME_RATE = 10; // Frames per second
const OUTPUT_VIDEO = 'output.mp4';
const FINAL_VIDEO = 'final_video.mp4';
const TEMP_DIR = './temp_frames';

// --- SETUP ---
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR);
}

// --- FUNCTIONS ---

/**
 * Get audio volume at a specific time.
 * This is a simplified approach. For more accuracy, you might need a more
 * sophisticated audio processing library.
 */
function getVolume(audioPath, time, callback) {
    ffmpeg(audioPath)
        .setStartTime(time)
        .setDuration(1 / FRAME_RATE)
        .audioFilters('volumedetect')
        .format('null')
        .output('/dev/null')
        .on('stderr', (stderrLine) => {
            const volumeMatch = stderrLine.match(/mean_volume: ([-.0-9]+) dB/);
            if (volumeMatch) {
                callback(null, parseFloat(volumeMatch[1]));
            }
        })
        .on('error', (err) => {
            callback(err);
        })
        .run();
}

/**
 * Create a single frame with the appropriate mouth image.
 */
async function createFrame(mouthState, frameNumber) {
    const canvas = createCanvas(512, 1024);
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 512, 1024);

    const mouthImage = await loadImage(MOUTH_IMAGES[mouthState]);
    // Draw image at full size since canvas matches image dimensions
    ctx.drawImage(mouthImage, 0, 0);

    const framePath = path.join(TEMP_DIR, `frame-${String(frameNumber).padStart(5, '0')}.png`);
    const out = fs.createWriteStream(framePath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    await new Promise((resolve) => out.on('finish', resolve));
    return framePath;
}

// --- MAIN LOGIC ---

async function main() {
    console.log('Analyzing audio...');

    const audioDuration = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(AUDIO_PATH, (err, metadata) => {
            if (err) return reject(err);
            resolve(metadata.format.duration);
        });
    });

    const frameCount = Math.floor(audioDuration * FRAME_RATE);
    const framePromises = [];

    for (let i = 0; i < frameCount; i++) {
        const time = i / FRAME_RATE;
        framePromises.push(
            new Promise((resolve, reject) => {
                getVolume(AUDIO_PATH, time, (err, volume) => {
                    if (err) return reject(err);

                    let mouthState = 'closed';
                    if (volume > -30) {
                        mouthState = 'tongue';
                    } else if (volume > -40) {
                        mouthState = 'open';
                    }

                    createFrame(mouthState, i).then(resolve).catch(reject);
                });
            })
        );
    }

    await Promise.all(framePromises);

    console.log('Creating video from frames...');

    await new Promise((resolve, reject) => {
        ffmpeg(path.join(TEMP_DIR, 'frame-%05d.png'))
            .inputFPS(FRAME_RATE)
            .videoCodec('libx264')
            .outputOptions('-pix_fmt', 'yuv420p')
            .output(OUTPUT_VIDEO)
            .on('end', resolve)
            .on('error', reject)
            .run();
    });

    console.log('Combining video and audio...');

    await new Promise((resolve, reject) => {
        ffmpeg(OUTPUT_VIDEO)
            .input(AUDIO_PATH)
            .outputOptions(['-c:v', 'copy', '-c:a', 'aac'])
            .output(FINAL_VIDEO)
            .on('end', resolve)
            .on('error', reject)
            .run();
    });

    console.log('Cleaning up temporary files...');
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    fs.unlinkSync(OUTPUT_VIDEO);

    console.log(`\nDone! Final video saved to ${FINAL_VIDEO}`);
}

main().catch(console.error);
