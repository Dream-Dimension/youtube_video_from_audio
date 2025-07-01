import pygame
from pydub import AudioSegment
import time
import threading
import cv2
import numpy as np
import os

# === CONFIG ===
AUDIO_PATH = "voice.m4a" 
WINDOW_SIZE = (400, 400)
FRAME_DURATION_MS = 100  # how often to update mouth
IMAGE_PATHS = {
    "closed": "mouth_closed.png",
    "open": "mouth_open.png",
    "tongue": "mouth_tongue.png"
}
OUTPUT_VIDEO_PATH = "output.mp4"

# === CONVERT AUDIO TO WAV (if necessary) ===
def convert_audio(audio_path):
    if audio_path.endswith(".m4a"):
        wav_path = audio_path.replace(".m4a", ".wav")
        if not os.path.exists(wav_path):
            from pydub import AudioSegment
            audio = AudioSegment.from_file(audio_path, format="m4a")
            audio.export(wav_path, format="wav")
        return wav_path
    return audio_path

WAV_PATH = convert_audio(AUDIO_PATH)

# === INIT AUDIO SEGMENT ===
audio = AudioSegment.from_wav(WAV_PATH)
frame_count = len(audio) // FRAME_DURATION_MS

# === INIT PYGAME (for image loading) ===
pygame.init()

# === LOAD MOUTH IMAGES ===
images = {key: pygame.image.load(path) for key, path in IMAGE_PATHS.items()}

# === ANALYZE VOLUME FRAMES ===
mouth_frames = []
for i in range(frame_count):
    frame = audio[i*FRAME_DURATION_MS : (i+1)*FRAME_DURATION_MS]
    volume = frame.rms  # root mean square loudness
    if volume < 500:
        mouth_frames.append("closed")
    elif volume < 1500:
        mouth_frames.append("open")
    else:
        mouth_frames.append("tongue")

# === SETUP VIDEO WRITER ===
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
video_writer = cv2.VideoWriter(OUTPUT_VIDEO_PATH, fourcc, 1000 / FRAME_DURATION_MS, WINDOW_SIZE)

# === ANIMATION LOOP (generating video frames) ===
for mouth_state in mouth_frames:
    # Create a blank frame
    frame = np.full((WINDOW_SIZE[1], WINDOW_SIZE[0], 3), (255, 255, 255), dtype=np.uint8)

    # Convert pygame surface to numpy array
    img_surface = images[mouth_state]
    img_array = pygame.surfarray.pixels3d(img_surface)
    img_array = img_array.swapaxes(0, 1) # Convert from (width, height, channels) to (height, width, channels)
    
    # Correct color format from RGB to BGR for OpenCV
    img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

    # Blit the image onto the frame
    frame[100:100+img_array.shape[0], 100:100+img_array.shape[1]] = img_array

    video_writer.write(frame)

video_writer.release()

# === COMBINE AUDIO AND VIDEO ===
# Use ffmpeg to combine the generated video with the original audio
os.system(f"ffmpeg -i {OUTPUT_VIDEO_PATH} -i {WAV_PATH} -c:v copy -c:a aac -strict experimental final_video.mp4")

pygame.quit()

print(f"Video saved to final_video.mp4")