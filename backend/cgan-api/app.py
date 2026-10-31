from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
import torch
import io
import base64
import numpy as np
import os
import glob

from model.cgan import Generator, LATENT_DIM, NUM_CLASSES
from microscopic_generator import generate_microscopic_image

app = FastAPI(title="HemaSight cGAN API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DEVICE = torch.device("cpu")
CLASS_NAMES = {0: "ALL", 1: "AML", 2: "CLL", 3: "CML", 4: "Healthy"}

# ---------- Load cGAN Generator Only (NO ResNet) ----------
G = Generator().to(DEVICE)
if os.path.exists("model/generator.pth"):
    G.load_state_dict(torch.load("model/generator.pth", map_location=DEVICE))
    G.eval()
    LOADED = True
else:
    LOADED = False

# ---------- Lightweight Dataset Index ----------
DATASET_INDEX = {i: [] for i in range(NUM_CLASSES)}
DATASET_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset_images")

def load_dataset_index():
    folder_map = {0: "all", 1: "aml", 2: "cll", 3: "cml", 4: "healthy"}
    
    if not os.path.exists(DATASET_DIR):
        print(f"Dataset directory '{DATASET_DIR}' not found")
        return

    for class_id, folder in folder_map.items():
        folder_path = os.path.join(DATASET_DIR, folder)
        if not os.path.exists(folder_path):
            continue

        image_files = glob.glob(os.path.join(folder_path, "*.*"))
        image_files = [f for f in image_files if f.lower().endswith((".png", ".jpg", ".jpeg"))]

        # Just store the file paths. We don't extract features yet.
        DATASET_INDEX[class_id] = image_files[:1] # 1 image per class
        print(f"✅ Registered {len(DATASET_INDEX[class_id])} reference for {CLASS_NAMES[class_id]}")

# ---------- Helpers ----------
def tensor_to_base64(tensor):
    arr = ((tensor.squeeze().permute(1, 2, 0).cpu().numpy() + 1) / 2 * 255).astype(np.uint8)
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()

def pil_to_base64(img):
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()

def image_to_base64(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()

def compute_color_similarity(img1, img2):
    """Ultra-lightweight comparison using only numpy and PIL"""
    img1 = img1.resize((64, 64))
    img2 = img2.resize((64, 64))
    
    arr1 = np.array(img1).astype(np.float32)
    arr2 = np.array(img2).astype(np.float32)
    
    # Calculate Mean Absolute Error
    mae = float(np.mean(np.abs(arr1 - arr2))) / 255.0
    similarity = float(np.clip(1 - mae, 0, 1))
    return similarity

# ---------- Request Models ----------
class CBCData(BaseModel):
    wbc: float = 7.0
    rbc: float = 5.0
    hgb: float = 14.0
    plt: float = 250.0
    anc: float = 4.0
    blasts: float = 0.0
    rdw: float = 13.5

class GenerationRequest(BaseModel):
    class_id: int
    cbc: CBCData | None = None
    magnification: str = "100x"
    show_annotations: bool = True

# ---------- Endpoints ----------
@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "HemaSight cGAN Visualizer",
        "model_loaded": LOADED,
        "dataset_index": {CLASS_NAMES[k]: len(v) for k, v in DATASET_INDEX.items()},
    }

@app.get("/force-load")
def force_load():
    print("🔄 Force loading dataset references...")
    load_dataset_index()
    return {
        "message": "Loading complete", 
        "dataset_index": {CLASS_NAMES[k]: len(v) for k, v in DATASET_INDEX.items()}
    }

@app.post("/generate")
def generate(req: GenerationRequest):
    if not LOADED:
        raise HTTPException(503, "cGAN model not loaded")

    cbc_dict = req.cbc.dict() if req.cbc else {
        "wbc": 7.0, "rbc": 5.0, "hgb": 14.0,
        "plt": 250.0, "anc": 4.0, "blasts": 0.0, "rdw": 13.5,
    }

    # Generate Image
    cond = torch.zeros(1, NUM_CLASSES)
    cond[0, req.class_id] = 1.0
    noise = torch.randn(1, LATENT_DIM)
    with torch.no_grad():
        gen_img = G(noise, cond)
    cgan_b64 = tensor_to_base64(gen_img)

    # Render Giemsa
    cell_type = "normal" if req.class_id == 4 else "leukemic"
    try:
        rendered_img = generate_microscopic_image(
            cbc=cbc_dict,
            cell_type=cell_type,
            magnification=req.magnification,
            show_annotations=req.show_annotations,
        )
        rendered_b64 = pil_to_base64(rendered_img)
    except Exception as e:
        print(f"Renderer error: {e}")
        rendered_b64 = None

    # Compare Image (LIGHTWEIGHT)
    matched_path = None
    sim_score = 0.0
    
    if DATASET_INDEX[req.class_id]:
        ref_path = DATASET_INDEX[req.class_id][0]
        try:
            # Reconstruct generated image
            gen_arr = ((gen_img.squeeze().permute(1, 2, 0).cpu().numpy() + 1) / 2 * 255).astype(np.uint8)
            gen_pil = Image.fromarray(gen_arr)
            ref_pil = Image.open(ref_path).convert("RGB")
            
            sim_score = compute_color_similarity(gen_pil, ref_pil)
            matched_path = ref_path
        except Exception as e:
            print(f"Match error: {e}")

    result = {
        "class_id": req.class_id,
        "class_name": CLASS_NAMES[req.class_id],
        "image_base64": cgan_b64,
        "generated_image_base64": cgan_b64,
        "rendered_image_base64": rendered_b64,
    }

    if matched_path:
        result["matched_dataset_image_base64"] = image_to_base64(matched_path)
        result["matched_dataset_filename"] = os.path.basename(matched_path)
        result["similarity_score"] = sim_score
    else:
        result["similarity_score"] = 0.0

    return result

@app.post("/render")
def render_cbc(req: CBCData):
    cbc_dict = req.dict()
    is_leukemic = cbc_dict["blasts"] > 1.0 or cbc_dict["wbc"] > 12.0
    img = generate_microscopic_image(
        cbc=cbc_dict,
        cell_type="leukemic" if is_leukemic else "normal",
        magnification="1000x" if is_leukemic else "100x",
        show_annotations=is_leukemic,
    )
    return {"rendered_image_base64": pil_to_base64(img)}