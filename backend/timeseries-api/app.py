from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import pandas as pd
import numpy as np
from scipy import stats

app = FastAPI(title="HemaSight Time-Series Monitoring API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class BloodRecord(BaseModel):
    date: str
    wbc: float
    rbc: float
    hemoglobin: float
    platelets: float
    blast_percentage: float

class SeriesRequest(BaseModel):
    records: List[BloodRecord]

def linear_trend(values):
    x = np.arange(len(values))
    slope, intercept, r, p, _ = stats.linregress(x, values)
    return slope, r, p

@app.get("/")
def root():
    return {"status": "ok", "service": "HemaSight Time-Series"}

@app.post("/analyze")
def analyze(req: SeriesRequest):
    if len(req.records) < 3:
        raise HTTPException(400, "Need at least 3 records")

    df = pd.DataFrame([r.dict() for r in req.records])
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date")

    markers = ["wbc", "rbc", "hemoglobin", "platelets", "blast_percentage"]
    result = {"trends": {}, "anomalies": [], "relapse_risk": 0.0}

    risk_score = 0.0

    for m in markers:
        slope, r, p = linear_trend(df[m].values)
        result["trends"][m] = {
            "slope": round(slope, 4),
            "correlation": round(r, 4),
            "p_value": round(p, 4),
            "direction": "increasing" if slope > 0 else "decreasing"
        }
        # Blast % rising = strong relapse signal
        if m == "blast_percentage" and slope > 0.1:
            risk_score += 0.4 * min(slope, 1.0)
        # WBC spike
        if m == "wbc" and slope > 0.5:
            risk_score += 0.2
        # Hemoglobin dropping
        if m == "hemoglobin" and slope < -0.2:
            risk_score += 0.2

    # Detect outliers (z-score > 2)
    for m in markers:
        z = np.abs(stats.zscore(df[m].values))
        outliers = df.index[z > 2].tolist()
        if outliers:
            result["anomalies"].append({"marker": m, "outlier_indices": outliers})

    result["relapse_risk"] = round(min(risk_score, 1.0), 4)
    result["status"] = (
        "🚨 High relapse risk — consult immediately" if risk_score > 0.6 else
        "⚠️ Monitor closely" if risk_score > 0.3 else
        "✅ Stable — no relapse signals detected"
    )
    return result