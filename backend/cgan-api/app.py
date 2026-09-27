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

CLASS_NAMES = {
    0: "ALL",
    1: "AML",
    2: "CLL",
    3: "CML",
    4: "Healthy",
}

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

# ---------- Dataset Index ----------
DATASET_INDEX = {i: [] for i in range(NUM_CLASSES)}
DATASET_DIR = "dataset_images"


def load_dataset_index():
    folder_map = {0: "all", 1: "aml", 2: "cll", 3: "cml", 4: "healthy"}
    if not os.path.exists(DATASET_DIR):
        print(f"Dataset directory '{DATASET_DIR}' not found - comparison will be skipped")
        return

    for class_id, folder in folder_map.items():
        folder_path = os.path.join(DATASET_DIR, folder)
        if not os.path.exists(folder_path):
            print(f"Folder missing: {folder_path}")
            continue

        image_files = glob.glob(os.path.join(folder_path, "*.*"))
        image_files = [f for f in image_files if f.lower().endswith((".png", ".jpg", ".jpeg"))]

        for img_path in image_files[:2000]:
            try:
                img = Image.open(img_path).convert("RGB")
                tensor = feat_transform(img).unsqueeze(0).to(DEVICE)
                with torch.no_grad():
                    feat = resnet(tensor).squeeze().cpu().numpy()
                DATASET_INDEX[class_id].append((img_path, feat))
            except Exception:
                continue

        print(f"Loaded {len(DATASET_INDEX[class_id])} images for class {CLASS_NAMES[class_id]}")


load_dataset_index()


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


def find_closest_dataset_image(generated_tensor, class_id):
    if not DATASET_INDEX[class_id]:
        return None, 0.0

    arr = ((generated_tensor.squeeze().permute(1, 2, 0).cpu().numpy() + 1) / 2).clip(0, 1)
    img = Image.fromarray((arr * 255).astype(np.uint8))
    tensor = feat_transform(img).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        gen_feat = resnet(tensor).squeeze().cpu().numpy()

    best_score = -1.0
    best_path = None
    for path, feat in DATASET_INDEX[class_id]:
        cos = np.dot(gen_feat, feat) / (np.linalg.norm(gen_feat) * np.linalg.norm(feat) + 1e-8)
        if cos > best_score:
            best_score = cos
            best_path = path

    return best_path, float(best_score)


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

    # 1. cGAN image
    cond = torch.zeros(1, NUM_CLASSES)
    cond[0, req.class_id] = 1.0
    noise = torch.randn(1, LATENT_DIM)
    with torch.no_grad():
        gen_img = G(noise, cond)
    cgan_b64 = tensor_to_base64(gen_img)

    # 2. Wright-Giemsa render
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

    # 3. Dataset match
    dataset_path, similarity = find_closest_dataset_image(gen_img, req.class_id)

    result = {
        "class_id": req.class_id,
        "class_name": CLASS_NAMES[req.class_id],
        "image_base64": cgan_b64,
        "generated_image_base64": cgan_b64,
        "rendered_image_base64": rendered_b64,
        "similarity_score": round(similarity, 4),
    }

    if dataset_path:
        result["matched_dataset_image_base64"] = image_to_base64(dataset_path)
        result["matched_dataset_filename"] = os.path.basename(dataset_path)

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