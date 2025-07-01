from PIL import Image

def split_image(image_path):
    """
    Splits a composite image into three equal parts horizontally.
    """
    try:
        with Image.open(image_path) as img:
            width, height = img.size
            part_width = width // 3
            
            # Crop and save each part
            img.crop((0, 0, part_width, height)).save("mouth_closed.png")
            img.crop((part_width, 0, 2 * part_width, height)).save("mouth_open.png")
            img.crop((2 * part_width, 0, width, height)).save("mouth_tongue.png")
            
        print("Successfully split the image into mouth_closed.png, mouth_open.png, and mouth_tongue.png")

    except FileNotFoundError:
        print(f"Error: The file '{image_path}' was not found.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    split_image("composite_mouth.png")