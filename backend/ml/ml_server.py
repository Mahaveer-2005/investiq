import os
import json
import joblib
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ── Load models ────────────────────────────────────────────────────────────
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')

bias_classifier  = None
risk_classifier  = None
score_regressor  = None
scaler           = None
label_encoder    = None
models_loaded    = False

def load_models():
    global bias_classifier, risk_classifier, score_regressor, scaler, label_encoder, models_loaded
    try:
        print('🔄 Loading ML models...')
        # NOTE: train_model.py saves these with joblib.dump() (the standard
        # way to persist scikit-learn models), so they must be loaded with
        # joblib.load() too — plain pickle.load() fails on them with
        # "invalid load key" because joblib wraps numpy arrays differently.
        bias_classifier  = joblib.load(os.path.join(MODEL_DIR, 'bias_classifier.pkl'))
        risk_classifier  = joblib.load(os.path.join(MODEL_DIR, 'risk_classifier.pkl'))
        score_regressor  = joblib.load(os.path.join(MODEL_DIR, 'score_regressor.pkl'))
        scaler           = joblib.load(os.path.join(MODEL_DIR, 'scaler.pkl'))
        label_encoder    = joblib.load(os.path.join(MODEL_DIR, 'label_encoder.pkl'))
        models_loaded = True
        print('✅ All ML models loaded successfully')
    except Exception as e:
        print(f'⚠️  Could not load models: {e}')
        print('   Running in fallback mode (rule-based scoring only)')
        models_loaded = False

load_models()

# ── Bias info map ──────────────────────────────────────────────────────────
# IMPORTANT: bias_classifier is a MultiOutputClassifier (see train_model.py)
# trained on 7 independent binary columns (BIAS_COLS) — its .predict() call
# returns a (n_samples, 7) matrix of 0/1 flags, ONE PER BIAS, not a single
# 0-7 class id. The previous version of this file assumed a single-label
# classifier and tried to do int(label) on a whole row array, which is
# exactly what caused "only length-1 arrays can be converted to Python
# scalars" on every single request. Keys here MUST match BIAS_COLS' order
# in train_model.py exactly.
BIAS_COLS = ['PANIC_SELLING', 'LOSS_AVERSION', 'OVERCONFIDENCE',
             'HERD_BEHAVIOR', 'RECENCY_BIAS', 'OVERTRADING', 'DISPOSITION_EFFECT']

BIAS_INFO = {
    'PANIC_SELLING':      {'name': 'Panic Selling',      'severity': 'high',   'icon': '😱',
        'description': 'You tend to sell positions very quickly due to fear during market dips.',
        'suggestion':  'Set stop-losses in advance. Have a written trading plan before entering.'},
    'LOSS_AVERSION':       {'name': 'Loss Aversion',      'severity': 'high',   'icon': '😰',
        'description': 'You hold losing positions too long hoping they recover.',
        'suggestion':  'Use trailing stop-losses. Define max loss % before entering a trade.'},
    'OVERCONFIDENCE':      {'name': 'Overconfidence',     'severity': 'medium', 'icon': '😎',
        'description': 'Very high win rate may indicate overconfidence.',
        'suggestion':  'Track your predictions vs outcomes. Diversify to avoid concentration risk.'},
    'HERD_BEHAVIOR':       {'name': 'Herd Behavior',      'severity': 'medium', 'icon': '🐑',
        'description': 'You tend to make multiple trades in clusters, following market trends.',
        'suggestion':  'Research before trading. Avoid trading based on news/social media alone.'},
    'RECENCY_BIAS':        {'name': 'Recency Bias',       'severity': 'medium', 'icon': '📰',
        'description': 'Recent trades are disproportionately clustered, reacting to recent events.',
        'suggestion':  'Review your trading history monthly. Avoid decisions based only on recent performance.'},
    'OVERTRADING':         {'name': 'Overtrading',        'severity': 'medium', 'icon': '🔄',
        'description': 'High trading frequency increases costs and reduces returns.',
        'suggestion':  'Set a maximum number of trades per week. Focus on quality over quantity.'},
    'DISPOSITION_EFFECT':  {'name': 'Disposition Effect', 'severity': 'medium', 'icon': '📉',
        'description': 'You sell winning stocks quickly and hold losing stocks too long.',
        'suggestion':  'Let winners run using trailing stops. Cut losses early with predefined stop-losses.'},
    # Rule-based-only bias (not one of the 7 ML-trained columns, but detected
    # directly from portfolio concentration data)
    'CONCENTRATION_RISK':  {'name': 'Concentration Risk', 'severity': 'high',   'icon': '🎯',
        'description': 'Your portfolio is heavily concentrated in very few positions, increasing risk significantly.',
        'suggestion':  'Diversify across at least 8-12 stocks in different sectors. No single stock should exceed 20% of your portfolio.'},
}

RISK_MAP = {0: 'Conservative', 1: 'Moderate', 2: 'Aggressive'}

def build_features(data):
    return np.array([[
        float(data.get('totalTrades',           0)),
        float(data.get('winRate',               50)),
        float(data.get('avgHoldDays',           30)),
        float(data.get('tradingFrequency',       0)),
        float(data.get('panicSellCount',         0)),
        float(data.get('shortTermTrades',        0)),
        float(data.get('profitFactor',           1)),
        float(data.get('maxPortfolioWeight',     0)),
        float(data.get('herdDays',               0)),
        float(data.get('recencyBiasScore',       0)),
        float(data.get('sellAfterLoss',          0)),
        float(data.get('numHoldings',            0)),
    ]])

def rule_based_score(data):
    """Fallback scoring when models are not loaded."""
    score  = 70
    biases = []

    win_rate      = float(data.get('winRate',           50))
    hold_days     = float(data.get('avgHoldDays',        30))
    freq          = float(data.get('tradingFrequency',    0))
    panic         = float(data.get('panicSellCount',      0))
    concentration = float(data.get('maxPortfolioWeight',  0))
    holdings      = float(data.get('numHoldings',         0))
    recency       = float(data.get('recencyBiasScore',    0))
    herd          = float(data.get('herdDays',             0))

    if win_rate > 55:  score += min((win_rate - 50) * 0.5, 15)
    if hold_days > 7:  score += min(hold_days * 0.2, 10)
    if holdings >= 5:  score += min(holdings, 10)

    if panic > 0:
        biases.append(dict(BIAS_INFO['PANIC_SELLING']))
        score -= 15 if panic > 2 else 8

    if freq > 20:
        biases.append(dict(BIAS_INFO['OVERTRADING']))
        score -= 10

    if recency > 60:
        biases.append(dict(BIAS_INFO['RECENCY_BIAS']))
        score -= 8

    if herd > 2:
        biases.append(dict(BIAS_INFO['HERD_BEHAVIOR']))
        score -= 8

    if concentration > 0.5 and holdings < 4:
        biases.append(dict(BIAS_INFO['CONCENTRATION_RISK']))
        score -= 15

    score = max(10, min(100, round(score)))

    if hold_days > 30 and freq < 5:   risk = 'Conservative'
    elif hold_days < 3 or freq > 20:  risk = 'Aggressive'
    else:                              risk = 'Moderate'

    return score, biases, risk

# ── Routes ─────────────────────────────────────────────────────────────────
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'models': 'loaded' if models_loaded else 'fallback'})

@app.route('/api/analyze', methods=['POST', 'OPTIONS'])
def analyze():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers['Access-Control-Allow-Origin']  = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response, 200

    try:
        data = request.get_json(force=True, silent=True) or {}

        if not models_loaded:
            # Fallback to rule-based
            score, biases, risk = rule_based_score(data)
            return jsonify({
                'score':       score,
                'biases':      biases,
                'riskProfile': risk,
                'source':      'rules',
            })

        features        = build_features(data)
        features_scaled = scaler.transform(features)

        # Score prediction
        raw_score = float(score_regressor.predict(features_scaled)[0])
        score     = max(10, min(100, round(raw_score)))

        # Bias prediction — bias_classifier is a MultiOutputClassifier, so
        # .predict() returns shape (1, 7): one binary flag per bias column,
        # in the exact order of BIAS_COLS. This is NOT a single class id.
        bias_preds_row = np.asarray(bias_classifier.predict(features_scaled))[0]
        biases = []
        for i, flag in enumerate(bias_preds_row):
            if int(flag) == 1:
                col_name = BIAS_COLS[i]
                info = BIAS_INFO.get(col_name)
                if info:
                    biases.append(dict(info))

        # Risk profile
        risk_pred    = risk_classifier.predict(features_scaled)[0]
        risk_profile = RISK_MAP.get(int(risk_pred), 'Moderate')

        return jsonify({
            'score':       score,
            'biases':      biases,
            'riskProfile': risk_profile,
            'source':      'ml',
        })

    except Exception as e:
        print(f'ML analyze error: {e}')
        # Graceful fallback
        try:
            score, biases, risk = rule_based_score(data)
            return jsonify({'score': score, 'biases': biases, 'riskProfile': risk, 'source': 'rules'})
        except:
            return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print('🚀 InvestIQ ML Server starting on port 5001...')
    app.run(host='0.0.0.0', port=5001, debug=False)