import pandas as pd
import numpy as np

np.random.seed(42)
n_healthy = 500
n_leukemia = 500

# ---- Healthy patients (label = 0) ----
healthy = pd.DataFrame({
    "wbc":              np.random.normal(7, 2, n_healthy).clip(4, 11),
    "rbc":              np.random.normal(5.0, 0.4, n_healthy).clip(4.2, 6.0),
    "hemoglobin":       np.random.normal(14.5, 1.2, n_healthy).clip(12, 17.5),
    "platelets":        np.random.normal(280, 50, n_healthy).clip(150, 450),
    "blast_percentage": np.random.uniform(0, 3, n_healthy),
    "label":            0
})

# ---- Leukemia patients (label = 1) ----
leukemia = pd.DataFrame({
    "wbc":              np.random.normal(35, 15, n_leukemia).clip(10, 100),
    "rbc":              np.random.normal(3.2, 0.7, n_leukemia).clip(1.5, 4.5),
    "hemoglobin":       np.random.normal(9.5, 1.8, n_leukemia).clip(5, 12),
    "platelets":        np.random.normal(90, 40, n_leukemia).clip(10, 180),
    "blast_percentage": np.random.uniform(25, 90, n_leukemia),
    "label":            1
})

# ---- Combine and shuffle ----
df = pd.concat([healthy, leukemia]).sample(frac=1, random_state=42).reset_index(drop=True)

# Round for realism
df["wbc"] = df["wbc"].round(2)
df["rbc"] = df["rbc"].round(2)
df["hemoglobin"] = df["hemoglobin"].round(2)
df["platelets"] = df["platelets"].round(0).astype(int)
df["blast_percentage"] = df["blast_percentage"].round(2)

# Save to model/ folder
df.to_csv("model/blood_count_dataset.csv", index=False)
print(f"Created blood_count_dataset.csv with {len(df)} rows")
print(f"Healthy: {(df['label'] == 0).sum()}, Leukemia: {(df['label'] == 1).sum()}")
print(df.head())
