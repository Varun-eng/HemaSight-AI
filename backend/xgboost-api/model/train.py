"""
Train XGBoost model on leukemia blood count dataset.
Run: python train.py
Output: xgboost_model.pkl
"""
# pyright: reportMissingImports=false, reportMissingModuleSource=false
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib

# ---- Load your dataset ----
# Expected CSV columns: wbc, rbc, hemoglobin, platelets, blast_percentage, label
# label: 0 = healthy, 1 = leukemia risk
df = pd.read_csv("blood_count_dataset.csv")

FEATURES = ["wbc", "rbc", "hemoglobin", "platelets", "blast_percentage"]
X = df[FEATURES]
y = df["label"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

model = xgb.XGBClassifier(
    n_estimators=200,
    max_depth=6,
    learning_rate=0.1,
    objective="binary:logistic",
    eval_metric="logloss",
    random_state=42
)

model.fit(X_train, y_train)

preds = model.predict(X_test)
print("Accuracy:", accuracy_score(y_test, preds))
print(classification_report(y_test, preds))

joblib.dump(model, "xgboost_model.pkl")
print("Model saved as xgboost_model.pkl")