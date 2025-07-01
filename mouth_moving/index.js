const ffmpeg = require('fluent-ffmpeg');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const log = require('loglevel');

// Set log level (trace, debug, info, warn, error)
log.setLevel('info');

// --- CONFIGURATION ---
const AUDIO_PATH = 'shortvoice.m4a';
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
log.info('🎬 Starting mouth animation video generator');
log.info(`📁 Using audio file: ${AUDIO_PATH}`);
log.info(`🖼️  Using mouth images: ${Object.keys(MOUTH_IMAGES).join(', ')}`);
log.info(`⚙️  Frame rate: ${FRAME_RATE} fps`);

if (!fs.existsSync(TEMP_DIR)) {
    log.info(`📂 Creating temporary directory: ${TEMP_DIR}`);
    fs.mkdirSync(TEMP_DIR);
} else {
    log.info(`📂 Using existing temporary directory: ${TEMP_DIR}`);
}

// --- FUNCTIONS ---

/**
 * Get audio volume at a specific time.
 * This is a simplified approach. For more accuracy, you might need a more
 * sophisticated audio processing library.
 */
function getVolume(audioPath, time, callback) {
    log.debug(`🔊 Analyzing audio volume at ${time.toFixed(2)}s`);
    ffmpeg(audioPath)
        .setStartTime(time)
        .setDuration(1 / FRAME_RATE)
        .audioFilters('volumedetect')
        .format('null')
        .output('/dev/null')
        .on('stderr', (stderrLine) => {
            const volumeMatch = stderrLine.match(/mean_volume: ([-.0-9]+) dB/);
            if (volumeMatch) {
                const volume = parseFloat(volumeMatch[1]);
                log.debug(`📊 Volume at ${time.toFixed(2)}s: ${volume}dB`);
                callback(null, volume);
            }
        })
        .on('error', (err) => {
            log.error(`❌ Error getting volume at ${time.toFixed(2)}s:`, err.message);
            callback(err);
        })
        .run();
}

/**
 * Create a single frame with the appropriate mouth image.
 */
async function createFrame(mouthState, frameNumber) {
    log.debug(`🎨 Creating frame ${frameNumber} with mouth state: ${mouthState}`);
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
    log.debug(`✅ Frame ${frameNumber} saved: ${framePath}`);
    return framePath;
}

// --- MAIN LOGIC ---

async function main() {
    log.info('🎵 Analyzing audio file...');

    const audioDuration = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(AUDIO_PATH, (err, metadata) => {
            if (err) {
                log.error(`❌ Error reading audio file: ${err.message}`);
                return reject(err);
            }
            resolve(metadata.format.duration);
        });
    });

    log.info(`⏱️  Audio duration: ${audioDuration.toFixed(2)} seconds`);
    const frameCount = Math.floor(audioDuration * FRAME_RATE);
    log.info(`🎞️  Total frames to generate: ${frameCount}`);
    
    const framePromises = [];
    let processedFrames = 0;

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

                    log.debug(`👄 Frame ${i}: ${mouthState} (volume: ${volume}dB)`);
                    createFrame(mouthState, i).then(() => {
                        processedFrames++;
                        if (processedFrames % 10 === 0 || processedFrames === frameCount) {
                            const progress = ((processedFrames / frameCount) * 100).toFixed(1);
                            log.info(`📈 Progress: ${processedFrames}/${frameCount} frames (${progress}%)`);
                        }
                        resolve();
                    }).catch(reject);
                });
            })
        );
    }

    await Promise.all(framePromises);
    log.info('✅ All frames generated successfully!');

    log.info('🎥 Creating video from frames...');

    await new Promise((resolve, reject) => {
        ffmpeg(path.join(TEMP_DIR, 'frame-%05d.png'))
            .inputFPS(FRAME_RATE)
            .videoCodec('libx264')
            .outputOptions('-pix_fmt', 'yuv420p')
            .output(OUTPUT_VIDEO)
            .on('progress', (progress) => {
                if (progress.percent) {
                    log.info(`🎬 Video encoding progress: ${progress.percent.toFixed(1)}%`);
                }
            })
            .on('end', () => {
                log.info(`✅ Video created: ${OUTPUT_VIDEO}`);
                resolve();
            })
            .on('error', (err) => {
                log.error(`❌ Error creating video: ${err.message}`);
                reject(err);
            })
            .run();
    });

    log.info('🔗 Combining video and audio...');

    await new Promise((resolve, reject) => {
        ffmpeg(OUTPUT_VIDEO)
            .input(AUDIO_PATH)
            .outputOptions(['-c:v', 'copy', '-c:a', 'aac'])
            .output(FINAL_VIDEO)
            .on('progress', (progress) => {
                if (progress.percent) {
                    log.info(`🎵 Audio/video sync progress: ${progress.percent.toFixed(1)}%`);
                }
            })
            .on('end', () => {
                log.info(`✅ Final video created: ${FINAL_VIDEO}`);
                resolve();
            })
            .on('error', (err) => {
                log.error(`❌ Error combining audio/video: ${err.message}`);
                reject(err);
            })
            .run();
    });

    log.info('🧹 Cleaning up temporary files...');
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    fs.unlinkSync(OUTPUT_VIDEO);
    log.info(`🗑️  Removed temporary files: ${TEMP_DIR}, ${OUTPUT_VIDEO}`);

    log.info('🎉 Video generation complete!');
    log.info(`📹 Final video saved to: ${FINAL_VIDEO}`);
    log.info(`📊 Video stats: ${frameCount} frames, ${audioDuration.toFixed(2)}s duration, ${FRAME_RATE} fps`);
}

main().catch((error) => {
    log.error('💥 Fatal error:', error.message);
    process.exit(1);
});
