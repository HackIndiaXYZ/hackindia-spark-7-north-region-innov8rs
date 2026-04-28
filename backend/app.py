from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import joblib
import pandas as pd

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")

model = joblib.load(os.path.join(MODEL_DIR, "pcod_rf_model_v6.pkl"))
imputer = joblib.load(os.path.join(MODEL_DIR, "pcod_imputer_v6.pkl"))
feature_cols = joblib.load(os.path.join(MODEL_DIR, "model_features_v6.pkl"))
threshold = joblib.load(os.path.join(MODEL_DIR, "model_threshold_v6.pkl"))


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "herHealthAI ML backend is running",
        "features": feature_cols,
        "threshold": threshold
    })


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json

        input_row = pd.DataFrame([data], columns=feature_cols)

        input_imputed = pd.DataFrame(
            imputer.transform(input_row),
            columns=feature_cols
        )

        probability = model.predict_proba(input_imputed)[0][1]
        prediction = 1 if probability >= threshold else 0

        return jsonify({
            "probability": round(float(probability), 4),
            "percentage": round(float(probability * 100), 2),
            "threshold": float(threshold),
            "prediction": int(prediction),
            "label": "High PCOD/PCOS Risk" if prediction == 1 else "Low PCOD/PCOS Risk"
        })

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)