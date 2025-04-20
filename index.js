const ffmpeg = require('fluent-ffmpeg');
const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');
const { glob } = require('glob');

// Ensure output directory exists
const OUTPUT_DIR = 'videos_generated';
fs.ensureDirSync(OUTPUT_DIR);

// Function to get a random image from the images directory
async function getRandomImage() {
    const images = await fs.readdir('images');
    if (images.length === 0) {
        throw new Error('No images found in the images directory');
    }
    const randomImage = images[Math.floor(Math.random() * images.length)];
    return path.join('images', randomImage);
}

// Function to crop image to 720p
async function cropImageTo720p(imagePath) {
    const outputPath = path.join(OUTPUT_DIR, 'temp_image.jpg');
    await sharp(imagePath)
        .resize(1280, 720, {
            fit: 'cover',
            position: 'center'
        })
        .toFile(outputPath);
    return outputPath;
}

// Function to create video from image and audio
async function createVideo(imagePath, audioPath) {
    const outputPath = path.join(
        OUTPUT_DIR,
        `${path.basename(audioPath, path.extname(audioPath))}.mp4`
    );

    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(imagePath)
            .loop()
            .input(audioPath)
            .outputOptions([
                '-c:v libx264',
                '-tune stillimage',
                '-c:a aac',
                '-b:a 192k',
                '-pix_fmt yuv420p',
                '-shortest'
            ])
            .output(outputPath)
            .on('end', () => {
                console.log(`Video created: ${outputPath}`);
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('Error creating video:', err);
                reject(err);
            })
            .run();
    });
}

// Main function to process all audio files
async function processAudioFiles() {
    try {
        // Find all audio files in the recordings directory
        const audioFiles = await glob('recordings/*.{mp3,wav,m4a}');

        if (audioFiles.length === 0) {
            console.log('No audio files found in the recordings directory');
            return;
        }

        // Process each audio file
        for (const audioFile of audioFiles) {
            try {
                console.log(`Processing: ${audioFile}`);
                
                // Get and crop a random image
                const randomImage = await getRandomImage();
                const croppedImage = await cropImageTo720p(randomImage);
                
                // Create video
                await createVideo(croppedImage, audioFile);
                
                // Clean up temporary image
                await fs.remove(croppedImage);
            } catch (err) {
                console.error(`Error processing ${audioFile}:`, err);
            }
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

// Run the application
processAudioFiles(); 