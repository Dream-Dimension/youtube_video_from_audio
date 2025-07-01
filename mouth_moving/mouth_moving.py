import pygame
from pydub import AudioSegment
import time
import threading

# === CONFIG ===
MP3_PATH = "voice.m4a"
WINDOW_SIZE = (400, 400)
FRAME_DURATION_MS = 100  # how often to update mouth
IMAGE_PATHS = {
    "closed": "mouth_closed.png",
    "open": "mouth_open.png",
    "tongue": "mouth_tongue.png"
}

# === INIT AUDIO SEGMENT ===
audio = AudioSegment.from_mp3(MP3_PATH)
frame_count = len(audio) // FRAME_DURATION_MS

# === INIT PYGAME ===
pygame.init()
screen = pygame.display.set_mode(WINDOW_SIZE)
pygame.display.set_caption("Talking Head")

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

# === PLAYBACK AUDIO SEPARATELY ===
def play_audio():
    from pydub.playback import play
    play(audio)

audio_thread = threading.Thread(target=play_audio)
audio_thread.start()

# === ANIMATION LOOP ===
clock = pygame.time.Clock()
running = True
frame_idx = 0

while running and frame_idx < len(mouth_frames):
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    mouth_state = mouth_frames[frame_idx]
    screen.fill((255, 255, 255))  # white background
    img = images[mouth_state]
    screen.blit(img, (100, 100))
    pygame.display.flip()

    frame_idx += 1
    clock.tick(1000 // FRAME_DURATION_MS)

pygame.quit()
