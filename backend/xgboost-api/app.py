from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import joblib
import pandas as pd
import os

app = FastAPI(title="HemaSight XGBoost Screening API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = "model/xgboost_model.pkl"
model = joblib.load(MODEL_PATH) if os.path.exists(MODEL_PATH) else None

CLASS_NAMES = {0: "ALL", 1: "AML", 2: "CLL", 3: "CML", 4: "Healthy"}
CLASS_DESCRIPTIONS = {
    0: "Acute Lymphoblastic Leukemia",
    1: "Acute Myeloid Leukemia",
    2: "Chronic Lymphocytic Leukemia",
    3: "Chronic Myeloid Leukemia",
    4: "Healthy (Normal Cells)",
}


class BloodTestData(BaseModel):
    # Required core
    wbc: float
    rbc: float
    hemoglobin: float
    platelets: float
    blast_percentage: float

    # Optional extended
    total_count: Optional[float] = None
    sgot: Optional[float] = None
    sgpt: Optional[float] = None
    creatinine: Optional[float] = None
    potassium: Optional[float] = None
    chimerism: Optional[float] = None
    gvhd: Optional[str] = None
    rdw: Optional[float] = None
    neutrophils: Optional[float] = None
    lymphocytes: Optional[float] = None
    monocytes: Optional[float] = None
    eosinophils: Optional[float] = None
    basophils: Optional[float] = None


def rule_based_class(d: dict) -> int:
    blast = d.get("blast_percentage", 0)
    wbc = d.get("wbc", 7)
    plt = d.get("platelets", 250)

    if blast < 5 and wbc < 11 and plt > 150:
        return 4
    if blast >= 20:
        return 1 if wbc > 20 else 0
    if wbc > 15:
        return 3 if plt < 200 else 2
    return 1


def extended_flags(d: dict) -> dict:
    """Extra clinical flags based on new parameters."""
    flags = {}

    # Liver function
    sgot = d.get("sgot")
    sgpt = d.get("sgpt")
    if sgot and sgot > 40:
        flags["liver"] = "Elevated SGOT (AST) — possible hepatic GVHD or drug toxicity"
    elif sgpt and sgpt > 45:
        flags["liver"] = "Elevated SGPT (ALT) — monitor liver function"

    # Kidney
    creat = d.get("creatinine")
    if creat and creat > 1.3:
        flags["kidney"] = "Elevated creatinine — renal function concern"

    # Electrolytes
    k = d.get("potassium")
    if k and (k > 5.5 or k < 3.0):
        flags["electrolyte"] = f"Abnormal potassium ({k}) — cardiac monitoring recommended"

    # GVHD
    gvhd = d.get("gvhd")
    if gvhd and gvhd.lower() not in ("none", "", "no"):
        flags["gvhd"] = f"GVHD detected: {gvhd}"

    # Chimerism
    chim = d.get("chimerism")
    if chim is not None and chim < 95:
        flags["chimerism"] = f"Low donor chimerism ({chim}%) — relapse risk elevated"

    # Blasts
    if d.get("blast_percentage", 0) > 5:
        flags["blast"] = "Peripheral blasts elevated — urgent hematology review"

    return flags


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "HemaSight XGBoost Screening",
        "model_loaded": model is not None,
    }


@app.post("/predict")
def predict(data: BloodTestData):
    if model is None:
        raise HTTPException(503, "Model not loaded")

    try:
        # Core prediction with original 5 features
        core = {
            "wbc": data.wbc,
            "rbc": data.rbc,
            "hemoglobin": data.hemoglobin,
            "platelets": data.platelets,
            "blast_percentage": data.blast_percentage,
        }
        df = pd.DataFrame([core])
        risk_prob = float(model.predict_proba(df)[0][1])
        risk_flag = risk_prob > 0.5
        predicted_class = rule_based_class(data.dict()) if risk_flag else 4

        # Extended clinical flags
        flags = extended_flags(data.dict())

        return {
            "risk_score": round(risk_prob, 4),
            "risk_flag": risk_flag,
            "predicted_class": predicted_class,
            "predicted_class_name": CLASS_NAMES[predicted_class],
            "predicted_class_full": CLASS_DESCRIPTIONS[predicted_class],
            "extended_flags": flags,
            "interpretation": (
                f"⚠️ High risk of {CLASS_DESCRIPTIONS[predicted_class]} detected. Please consult a hematologist."
                if risk_flag
                else "✅ No significant abnormality detected. Blood values are in normal range."
            ),
            "recommendation": "cgan_visualization" if risk_flag else "routine_monitoring",
        }
    except Exception as e:
        raise HTTPException(500, str(e))