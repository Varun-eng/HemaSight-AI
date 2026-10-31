from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
import torch
import torchvision.transforms as transforms
import torchvision.models as models
import io
import base64
import numpy as np
import os
import glob
import pickle
import threading

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

# ---------- Load cGAN Generator ----------
G = Generator().to(DEVICE)
if os.path.exists("model/generator.pth"):
    G.load_state_dict(torch.load("model/generator.pth", map_location=DEVICE))
    G.eval()
    LOADED = True
else:
    LOADED = False

# ---------- ResNet18 for feature extraction ----------
resnet = models.resnet18(weights=models.ResNet18_Weights.DEFAULT).to(DEVICE)
resnet.fc = torch.nn.Identity()
resnet.eval()

feat_transform = transforms.Compose([
    transforms.Resize((128, 128)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

# ---------- Dataset Index & Caching ----------
DATASET_INDEX = {i: [] for i in range(NUM_CLASSES)}
DATASET_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset_images")
CACHE_DIR = "cache"

def load_dataset_index():
    os.makedirs(CACHE_DIR, exist_ok=True)
    folder_map = {0: "all", 1: "aml", 2: "cll", 3: "cml", 4: "healthy"}
    
    if not os.path.exists(DATASET_DIR):
        print(f"Dataset directory '{DATASET_DIR}' not found - comparison will be skipped")
        return

    for class_id, folder in folder_map.items():
        cache_file = os.path.join(CACHE_DIR, f"class_{class_id}.pkl")
        
        # --- 1. TRY TO LOAD FROM CACHE ---
        if os.path.exists(cache_file):
            print(f"⚡ Loading {CLASS_NAMES[class_id]} from cache (Instant)...")
            with open(cache_file, 'rb') as f:
                DATASET_INDEX[class_id] = pickle.load(f)
            continue
            
        # --- 2. BUILD CACHE IF NOT EXISTS ---
        print(f"⏳ First run for {CLASS_NAMES[class_id]}. Extracting features...")
        folder_path = os.path.join(DATASET_DIR, folder)
        if not os.path.exists(folder_path):
            print(f"   Folder missing: {folder_path}")
            continue

        image_files = glob.glob(os.path.join(folder_path, "*.*"))
        image_files = [f for f in image_files if f.lower().endswith((".png", ".jpg", ".jpeg"))]

        class_data = []
        # Process max 10 images to ensure rapid startup
        for img_path in image_files[:1]: 
            try:
                img = Image.open(img_path).convert("RGB")
                tensor = feat_transform(img).unsqueeze(0).to(DEVICE)
                with torch.no_grad():
                    feat = resnet(tensor).squeeze().cpu().numpy()
                class_data.append((img_path, feat))
            except Exception:
                continue

        DATASET_INDEX[class_id] = class_data
        
        # Save to cache for next time
        with open(cache_file, 'wb') as f:
            pickle.dump(class_data, f)
            
        print(f"✅ Loaded and Cached {len(class_data)} images for {CLASS_NAMES[class_id]}")


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


def compute_similarity_metrics(gen_tensor, ref_path):
    ref_img = Image.open(ref_path).convert("RGB").resize((128, 128))
    gen_arr = ((gen_tensor.squeeze().permute(1, 2, 0).cpu().numpy() + 1) / 2).clip(0, 1)
    gen_img = Image.fromarray((gen_arr * 255).astype(np.uint8))

    gen_t = feat_transform(gen_img).unsqueeze(0).to(DEVICE)
    ref_t = feat_transform(ref_img).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        gen_feat = resnet(gen_t).squeeze().cpu().numpy()
        ref_feat = resnet(ref_t).squeeze().cpu().numpy()

    feature_sim = float(
        np.dot(gen_feat, ref_feat)
        / (np.linalg.norm(gen_feat) * np.linalg.norm(ref_feat) + 1e-8)
    )
    feature_sim = (feature_sim + 1) / 2

    gen_np = np.array(gen_img).astype(np.float32)
    ref_np = np.array(ref_img).astype(np.float32)

    hist_sims = []
    for ch in range(3):
        h1, _ = np.histogram(gen_np[:, :, ch], bins=32, range=(0, 255), density=True)
        h2, _ = np.histogram(ref_np[:, :, ch], bins=32, range=(0, 255), density=True)
        corr = np.corrcoef(h1, h2)[0, 1]
        if np.isnan(corr):
            corr = 0.0
        hist_sims.append(corr)
    color_sim = float(np.clip(np.mean(hist_sims), 0, 1))

    try:
        from skimage.metrics import structural_similarity as ssim
        gen_gray = np.array(gen_img.convert("L"))
        ref_gray = np.array(ref_img.convert("L"))
        ssim_val = ssim(gen_gray, ref_gray, data_range=255)
        struct_sim = float(np.clip((ssim_val + 1) / 2, 0, 1))
    except Exception:
        struct_sim = 0.0

    mae = float(np.mean(np.abs(gen_np - ref_np))) / 255.0
    pixel_sim = float(np.clip(1 - mae, 0, 1))

    overall = (
        0.40 * feature_sim +
        0.25 * color_sim +
        0.20 * struct_sim +
        0.15 * pixel_sim
    )
    overall = float(np.clip(overall, 0, 1))

    return {
        "feature_similarity": round(feature_sim * 100, 2),
        "color_similarity":   round(color_sim * 100, 2),
        "structural_similarity": round(struct_sim * 100, 2),
        "pixel_similarity":   round(pixel_sim * 100, 2),
        "overall_similarity": round(overall * 100, 2),
    }


def find_closest_dataset_image(generated_tensor, class_id):
    if not DATASET_INDEX[class_id]:
        return None, None

    arr = ((generated_tensor.squeeze().permute(1, 2, 0).cpu().numpy() + 1) / 2).clip(0, 1)
    img = Image.fromarray((arr * 255).astype(np.uint8))
    tensor = feat_transform(img).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        gen_feat = resnet(tensor).squeeze().cpu().numpy()

    best_score = -1.0
    best_path = None
    for path, feat in DATASET_INDEX[class_id]:
        cos = float(np.dot(gen_feat, feat) / (np.linalg.norm(gen_feat) * np.linalg.norm(feat) + 1e-8))
        if cos > best_score:
            best_score = cos
            best_path = path

    if not best_path:
        return None, None

    metrics = compute_similarity_metrics(generated_tensor, best_path)
    return best_path, metrics


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
    print("🔄 Force loading dataset (Synchronous)...")
    load_dataset_index()
    return {
        "message": "Loading complete", 
        "dataset_index": {CLASS_NAMES[k]: len(v) for k, v in DATASET_INDEX.items()}
    }

@app.post("/generate")
def generate(req: GenerationRequest):
    if not LOADED:
        raise HTTPException(503, "cGAN model not loaded")
    if not (0 <= req.class_id < NUM_CLASSES):
        raise HTTPException(400, "Invalid class_id")

    cbc_dict = req.cbc.dict() if req.cbc else {
        "wbc": 7.0, "rbc": 5.0, "hgb": 14.0,
        "plt": 250.0, "anc": 4.0, "blasts": 0.0, "rdw": 13.5,
    }

    cond = torch.zeros(1, NUM_CLASSES)
    cond[0, req.class_id] = 1.0
    noise = torch.randn(1, LATENT_DIM)
    with torch.no_grad():
        gen_img = G(noise, cond)
    cgan_b64 = tensor_to_base64(gen_img)

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

    dataset_path, metrics = find_closest_dataset_image(gen_img, req.class_id)

    result = {
        "class_id": req.class_id,
        "class_name": CLASS_NAMES[req.class_id],
        "image_base64": cgan_b64,
        "generated_image_base64": cgan_b64,
        "rendered_image_base64": rendered_b64,
    }

    if dataset_path and metrics:
        result["matched_dataset_image_base64"] = image_to_base64(dataset_path)
        result["matched_dataset_filename"] = os.path.basename(dataset_path)
        result["similarity"] = metrics
        result["similarity_score"] = metrics["overall_similarity"] / 100
    else:
        result["similarity"] = None
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


@app.post("/compare")
async def compare(file: UploadFile = File(...)):
    contents = await file.read()
    img = Image.open(io.BytesIO(contents)).convert("RGB")
    img_tensor = feat_transform(img).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        query_feat = resnet(img_tensor).squeeze().cpu().numpy()

    best_score = -1.0
    best_path = None
    best_class = None

    for class_id, entries in DATASET_INDEX.items():
        for path, feat in entries:
            cos = np.dot(query_feat, feat) / (
                np.linalg.norm(query_feat) * np.linalg.norm(feat) + 1e-8
            )
            if cos > best_score:
                best_score = cos
                best_path = path
                best_class = class_id

    if not best_path:
        return {"similarity_score": 0.0, "message": "No dataset images available"}

    return {
        "similarity_score": round(float(best_score), 4),
        "matched_class": CLASS_NAMES[best_class],
        "matched_filename": os.path.basename(best_path),
        "matched_image_base64": image_to_base64(best_path),
    }