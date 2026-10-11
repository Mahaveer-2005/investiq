"""
InvestIQ — Real ML Training Pipeline
Models trained:
1. BiasClassifier     — RandomForest (multi-label)
2. RiskProfiler       — GradientBoosting classifier
3. DecisionScorer     — RandomForest Regressor
4. AnomalyDetector    — IsolationForest (unsupervised)
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, RandomForestRegressor, IsolationForest
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.multioutput import MultiOutputClassifier
from sklearn.metrics import classification_report, mean_squared_error, r2_score
import joblib
import os
import json

MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

# ════════════════════════════════════════════════════════════════════════════
# SYNTHETIC TRAINING DATA GENERATION
# Simulates 5000 realistic investor behavioral profiles
# ════════════════════════════════════════════════════════════════════════════

def generate_training_data(n_samples=5000):
    np.random.seed(42)
    data = []

    for _ in range(n_samples):
        # Base investor type
        investor_type = np.random.choice(
            ['panic_prone', 'loss_averse', 'overconfident', 'herd_follower',
             'disciplined', 'overtrade', 'balanced'],
            p=[0.15, 0.20, 0.12, 0.13, 0.20, 0.10, 0.10]
        )

        # ── Feature generation based on investor type ──────────────────────
        if investor_type == 'panic_prone':
            panic_score          = np.random.uniform(0.5, 1.0)
            loss_aversion_score  = np.random.uniform(0.3, 0.7)
            overconfidence_score = np.random.uniform(0.0, 0.3)
            herd_score           = np.random.uniform(0.1, 0.4)
            recency_bias_score   = np.random.uniform(0.4, 0.9)
            disposition_score    = np.random.uniform(0.3, 0.6)
            trades_per_day       = np.random.uniform(0.5, 3.0)
            avg_holding_days     = np.random.uniform(0.5, 5.0)
            win_rate             = np.random.uniform(0.2, 0.45)
            unique_symbols       = np.random.randint(2, 8)
            total_trades         = np.random.randint(5, 40)
            large_trade_ratio    = np.random.uniform(0.0, 0.3)

        elif investor_type == 'loss_averse':
            panic_score          = np.random.uniform(0.1, 0.4)
            loss_aversion_score  = np.random.uniform(0.5, 1.0)
            overconfidence_score = np.random.uniform(0.0, 0.3)
            herd_score           = np.random.uniform(0.1, 0.3)
            recency_bias_score   = np.random.uniform(0.1, 0.4)
            disposition_score    = np.random.uniform(0.6, 1.0)
            trades_per_day       = np.random.uniform(0.1, 1.0)
            avg_holding_days     = np.random.uniform(30, 120)
            win_rate             = np.random.uniform(0.3, 0.5)
            unique_symbols       = np.random.randint(3, 10)
            total_trades         = np.random.randint(5, 25)
            large_trade_ratio    = np.random.uniform(0.0, 0.2)

        elif investor_type == 'overconfident':
            panic_score          = np.random.uniform(0.0, 0.2)
            loss_aversion_score  = np.random.uniform(0.0, 0.3)
            overconfidence_score = np.random.uniform(0.6, 1.0)
            herd_score           = np.random.uniform(0.0, 0.3)
            recency_bias_score   = np.random.uniform(0.2, 0.6)
            disposition_score    = np.random.uniform(0.3, 0.6)
            trades_per_day       = np.random.uniform(1.0, 5.0)
            avg_holding_days     = np.random.uniform(2, 20)
            win_rate             = np.random.uniform(0.25, 0.55)
            unique_symbols       = np.random.randint(1, 4)
            total_trades         = np.random.randint(10, 60)
            large_trade_ratio    = np.random.uniform(0.4, 1.0)

        elif investor_type == 'herd_follower':
            panic_score          = np.random.uniform(0.2, 0.5)
            loss_aversion_score  = np.random.uniform(0.2, 0.5)
            overconfidence_score = np.random.uniform(0.1, 0.4)
            herd_score           = np.random.uniform(0.5, 1.0)
            recency_bias_score   = np.random.uniform(0.5, 1.0)
            disposition_score    = np.random.uniform(0.4, 0.7)
            trades_per_day       = np.random.uniform(0.5, 3.0)
            avg_holding_days     = np.random.uniform(1, 15)
            win_rate             = np.random.uniform(0.25, 0.45)
            unique_symbols       = np.random.randint(2, 6)
            total_trades         = np.random.randint(10, 50)
            large_trade_ratio    = np.random.uniform(0.1, 0.4)

        elif investor_type == 'disciplined':
            panic_score          = np.random.uniform(0.0, 0.2)
            loss_aversion_score  = np.random.uniform(0.0, 0.25)
            overconfidence_score = np.random.uniform(0.0, 0.25)
            herd_score           = np.random.uniform(0.0, 0.2)
            recency_bias_score   = np.random.uniform(0.0, 0.2)
            disposition_score    = np.random.uniform(0.2, 0.5)
            trades_per_day       = np.random.uniform(0.1, 0.8)
            avg_holding_days     = np.random.uniform(14, 90)
            win_rate             = np.random.uniform(0.55, 0.85)
            unique_symbols       = np.random.randint(5, 15)
            total_trades         = np.random.randint(10, 50)
            large_trade_ratio    = np.random.uniform(0.0, 0.2)

        elif investor_type == 'overtrade':
            panic_score          = np.random.uniform(0.2, 0.5)
            loss_aversion_score  = np.random.uniform(0.1, 0.4)
            overconfidence_score = np.random.uniform(0.3, 0.7)
            herd_score           = np.random.uniform(0.2, 0.6)
            recency_bias_score   = np.random.uniform(0.4, 0.8)
            disposition_score    = np.random.uniform(0.3, 0.6)
            trades_per_day       = np.random.uniform(3.0, 10.0)
            avg_holding_days     = np.random.uniform(0.2, 3.0)
            win_rate             = np.random.uniform(0.2, 0.45)
            unique_symbols       = np.random.randint(3, 12)
            total_trades         = np.random.randint(30, 200)
            large_trade_ratio    = np.random.uniform(0.1, 0.5)

        else:  # balanced
            panic_score          = np.random.uniform(0.1, 0.35)
            loss_aversion_score  = np.random.uniform(0.1, 0.35)
            overconfidence_score = np.random.uniform(0.1, 0.35)
            herd_score           = np.random.uniform(0.1, 0.35)
            recency_bias_score   = np.random.uniform(0.1, 0.35)
            disposition_score    = np.random.uniform(0.2, 0.55)
            trades_per_day       = np.random.uniform(0.3, 1.5)
            avg_holding_days     = np.random.uniform(7, 45)
            win_rate             = np.random.uniform(0.45, 0.65)
            unique_symbols       = np.random.randint(4, 12)
            total_trades         = np.random.randint(8, 40)
            large_trade_ratio    = np.random.uniform(0.0, 0.3)

        # Add noise
        noise = lambda x, s=0.05: float(np.clip(x + np.random.normal(0, s), 0, 1))

        # ── Labels ────────────────────────────────────────────────────────
        # Multi-label bias detection
        has_panic       = int(panic_score > 0.35)
        has_loss_av     = int(loss_aversion_score > 0.35)
        has_overconf    = int(overconfidence_score > 0.40)
        has_herd        = int(herd_score > 0.40)
        has_recency     = int(recency_bias_score > 0.50)
        has_overtrade   = int(trades_per_day > 2.0)
        has_disposition = int(disposition_score > 0.65)

        # Risk profile
        if trades_per_day > 3 or avg_holding_days < 3:
            risk_profile = 'aggressive'
        elif panic_score > 0.5:
            risk_profile = 'conservative'
        elif avg_holding_days > 30 and overconfidence_score < 0.5:
            risk_profile = 'moderate'
        else:
            risk_profile = 'balanced'

        # Decision score (regression target)
        decision_score = max(0, min(100, round(
            100
            - (panic_score * 25)
            - (loss_aversion_score * 20)
            - (overconfidence_score * 15)
            - (herd_score * 15)
            - (recency_bias_score * 10)
            + (win_rate * 20)
            + (min(avg_holding_days, 30) / 30 * 15)
            + np.random.normal(0, 3)  # noise
        )))

        data.append({
            # Features
            'panic_score':          noise(panic_score),
            'loss_aversion_score':  noise(loss_aversion_score),
            'overconfidence_score': noise(overconfidence_score),
            'herd_score':           noise(herd_score),
            'recency_bias_score':   noise(recency_bias_score),
            'disposition_score':    noise(disposition_score),
            'trades_per_day':       float(np.clip(trades_per_day + np.random.normal(0, 0.2), 0, 15)),
            'avg_holding_days':     float(np.clip(avg_holding_days + np.random.normal(0, 2), 0, 365)),
            'win_rate':             noise(win_rate),
            'unique_symbols':       int(unique_symbols),
            'total_trades':         int(total_trades),
            'large_trade_ratio':    noise(large_trade_ratio),
            # Labels
            'has_panic':       has_panic,
            'has_loss_av':     has_loss_av,
            'has_overconf':    has_overconf,
            'has_herd':        has_herd,
            'has_recency':     has_recency,
            'has_overtrade':   has_overtrade,
            'has_disposition': has_disposition,
            'risk_profile':    risk_profile,
            'decision_score':  decision_score,
        })

    return pd.DataFrame(data)


FEATURE_COLS = [
    'panic_score', 'loss_aversion_score', 'overconfidence_score',
    'herd_score', 'recency_bias_score', 'disposition_score',
    'trades_per_day', 'avg_holding_days', 'win_rate',
    'unique_symbols', 'total_trades', 'large_trade_ratio',
]

BIAS_COLS = [
    'has_panic', 'has_loss_av', 'has_overconf',
    'has_herd', 'has_recency', 'has_overtrade', 'has_disposition'
]

BIAS_NAMES = [
    'PANIC_SELLING', 'LOSS_AVERSION', 'OVERCONFIDENCE',
    'HERD_BEHAVIOR', 'RECENCY_BIAS', 'OVERTRADING', 'DISPOSITION_EFFECT'
]


def train_all():
    print("🔄 Generating training data (5000 samples)...")
    df = generate_training_data(5000)
    print(f"✅ Data generated: {df.shape}")

    X = df[FEATURE_COLS].values
    y_biases      = df[BIAS_COLS].values
    y_risk        = df['risk_profile'].values
    y_score       = df['decision_score'].values

    # ── Scaler ─────────────────────────────────────────────────────────────
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # ── Label encoder for risk profile ────────────────────────────────────
    le = LabelEncoder()
    y_risk_enc = le.fit_transform(y_risk)

    # ── Train / Test Split ─────────────────────────────────────────────────
    X_tr, X_te, yb_tr, yb_te = train_test_split(X_scaled, y_biases,      test_size=0.2, random_state=42)
    _,    _,    yr_tr, yr_te = train_test_split(X_scaled, y_risk_enc,     test_size=0.2, random_state=42)
    _,    _,    ys_tr, ys_te = train_test_split(X_scaled, y_score,        test_size=0.2, random_state=42)

    # ════════════════════════════════════════════════════════════════════════
    # MODEL 1: Multi-Label Bias Classifier (RandomForest)
    # ════════════════════════════════════════════════════════════════════════
    print("\n🤖 Training Bias Classifier (RandomForest MultiOutput)...")
    bias_clf = MultiOutputClassifier(
        RandomForestClassifier(
            n_estimators=200,
            max_depth=12,
            min_samples_split=5,
            min_samples_leaf=2,
            class_weight='balanced',
            random_state=42,
            n_jobs=-1
        )
    )
    bias_clf.fit(X_tr, yb_tr)
    yb_pred = bias_clf.predict(X_te)
    print("Bias Classifier Report:")
    for i, name in enumerate(BIAS_NAMES):
        from sklearn.metrics import f1_score
        f1 = f1_score(yb_te[:, i], yb_pred[:, i], zero_division=0)
        print(f"  {name}: F1={f1:.3f}")

    # ════════════════════════════════════════════════════════════════════════
    # MODEL 2: Risk Profile Classifier (GradientBoosting)
    # ════════════════════════════════════════════════════════════════════════
    print("\n🤖 Training Risk Profile Classifier (GradientBoosting)...")
    risk_clf = GradientBoostingClassifier(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=5,
        min_samples_split=10,
        subsample=0.8,
        random_state=42
    )
    risk_clf.fit(X_tr, yr_tr)
    yr_pred = risk_clf.predict(X_te)
    cv_scores = cross_val_score(risk_clf, X_scaled, y_risk_enc, cv=5, scoring='accuracy')
    print(f"Risk Classifier Accuracy: {(yr_pred == yr_te).mean():.3f}")
    print(f"Cross-val Accuracy: {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")

    # ════════════════════════════════════════════════════════════════════════
    # MODEL 3: Decision Score Regressor (RandomForest)
    # ════════════════════════════════════════════════════════════════════════
    print("\n🤖 Training Decision Score Regressor (RandomForest)...")
    score_reg = RandomForestRegressor(
        n_estimators=200,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    score_reg.fit(X_tr, ys_tr)
    ys_pred = score_reg.predict(X_te)
    rmse = np.sqrt(mean_squared_error(ys_te, ys_pred))
    r2   = r2_score(ys_te, ys_pred)
    print(f"Score Regressor RMSE: {rmse:.3f} | R²: {r2:.3f}")

    # ════════════════════════════════════════════════════════════════════════
    # MODEL 4: Anomaly Detector (IsolationForest — unsupervised)
    # Detects unusual trading patterns not seen in training data
    # ════════════════════════════════════════════════════════════════════════
    print("\n🤖 Training Anomaly Detector (IsolationForest)...")
    anomaly_det = IsolationForest(
        n_estimators=200,
        contamination=0.1,
        random_state=42,
        n_jobs=-1
    )
    anomaly_det.fit(X_scaled)
    anomaly_scores = anomaly_det.score_samples(X_te)
    print(f"Anomaly Detection Score range: [{anomaly_scores.min():.3f}, {anomaly_scores.max():.3f}]")

    # ── Feature Importance ─────────────────────────────────────────────────
    importance_score = dict(zip(FEATURE_COLS, score_reg.feature_importances_))
    importance_risk  = dict(zip(FEATURE_COLS, risk_clf.feature_importances_))
    print("\n📊 Top Feature Importances (Decision Score):")
    for k, v in sorted(importance_score.items(), key=lambda x: -x[1])[:5]:
        print(f"  {k}: {v:.3f}")

    # ── Save models ────────────────────────────────────────────────────────
    print("\n💾 Saving models...")
    joblib.dump(bias_clf,    os.path.join(MODEL_DIR, 'bias_classifier.pkl'))
    joblib.dump(risk_clf,    os.path.join(MODEL_DIR, 'risk_classifier.pkl'))
    joblib.dump(score_reg,   os.path.join(MODEL_DIR, 'score_regressor.pkl'))
    joblib.dump(anomaly_det, os.path.join(MODEL_DIR, 'anomaly_detector.pkl'))
    joblib.dump(scaler,      os.path.join(MODEL_DIR, 'scaler.pkl'))
    joblib.dump(le,          os.path.join(MODEL_DIR, 'label_encoder.pkl'))

    # Save metadata
    metadata = {
        'feature_cols':  FEATURE_COLS,
        'bias_names':    BIAS_NAMES,
        'risk_classes':  list(le.classes_),
        'model_version': '1.0.0',
        'trained_on':    5000,
        'metrics': {
            'bias_classifier_avg_f1': float(np.mean([
                __import__('sklearn.metrics', fromlist=['f1_score']).f1_score(
                    yb_te[:, i], yb_pred[:, i], zero_division=0
                ) for i in range(len(BIAS_NAMES))
            ])),
            'risk_classifier_accuracy': float((yr_pred == yr_te).mean()),
            'score_regressor_rmse':     float(rmse),
            'score_regressor_r2':       float(r2),
        }
    }
    with open(os.path.join(MODEL_DIR, 'metadata.json'), 'w') as f:
        json.dump(metadata, f, indent=2)

    print("\n✅ All models saved to backend/ml/models/")
    print(f"   bias_classifier.pkl")
    print(f"   risk_classifier.pkl")
    print(f"   score_regressor.pkl")
    print(f"   anomaly_detector.pkl")
    print(f"   scaler.pkl")
    print(f"   label_encoder.pkl")
    print(f"   metadata.json")
    return metadata


if __name__ == '__main__':
    metadata = train_all()
    print("\n🎉 Training complete!")
    print(json.dumps(metadata['metrics'], indent=2))