import os
from PIL import Image
import numpy as np

CLASSES = ["all", "aml", "cll", "cml", "healthy"]
COLORS = {
    "all":     (255, 200, 200),
    "aml":     (200, 200, 255),
    "cll":     (200, 255, 200),
    "cml":     (255, 255, 200),
    "healthy": (240, 240, 240),
}

print("Creating synthetic dataset for Render...")
for cls in CLASSES:
    folder = f"dataset_images/{cls}"
    os.makedirs(folder, exist_ok=True)
    base = COLORS[cls]
    for i in range(20):  # 20 images per class
        noise = np.random.randint(-40, 40, (128, 128, 3), dtype=np.int16)
        arr = np.clip(np.array(base, dtype=np.int16) + noise, 0, 255).astype(np.uint8)
        Image.fromarray(arr).save(f"{folder}/synth_{i:03d}.png")
    print(f"✅ Created 20 images in {folder}")
print("Done! The API can now compare against these images.")