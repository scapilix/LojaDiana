import os
import pickle
import logging
from typing import Tuple

from river import compose, preprocessing, linear_model, ensemble

logger = logging.getLogger(__name__)


class MLPredictor:
    def __init__(self, model_path: str = '.tmp/ml_model.pkl'):
        self.model_path = model_path
        self.predictions_made = 0
        self.model = compose.Pipeline(
            preprocessing.StandardScaler(),
            ensemble.BaggingClassifier(
                model=linear_model.LogisticRegression(),
                n_models=7,
                seed=42,
            )
        )
        self._load()

    def _features(self, ind) -> dict:
        price = ind.close if ind.close > 0 else 1.0
        return {
            'rsi_norm': ind.rsi / 100.0,
            'rsi_oversold': 1.0 if ind.rsi < 30 else 0.0,
            'rsi_overbought': 1.0 if ind.rsi > 70 else 0.0,
            'macd_hist_norm': max(-5.0, min(5.0, ind.macd_hist / price * 1000)),
            'macd_positive': 1.0 if ind.macd > 0 else 0.0,
            'bb_position': max(0.0, min(1.0, ind.bb_position)),
            'ema_trend': max(-5.0, min(5.0, ind.ema_trend)),
            'stoch_k_norm': ind.stoch_k / 100.0,
            'stoch_d_norm': ind.stoch_d / 100.0,
            'volume_ratio': min(5.0, ind.volume_ratio),
            'price_change_5': max(-10.0, min(10.0, ind.price_change_5)) / 10.0,
        }

    def predict(self, indicators) -> Tuple[str, float]:
        try:
            feats = self._features(indicators)
            proba = self.model.predict_proba_one(feats)
            if not proba:
                return 'NEUTRAL', 0.5
            prob_up = proba.get(1, 0.5)
            if prob_up >= 0.60:
                return 'UP', round(prob_up, 3)
            elif prob_up <= 0.40:
                return 'DOWN', round(1.0 - prob_up, 3)
            return 'NEUTRAL', round(1.0 - abs(prob_up - 0.5) * 2, 3)
        except Exception as e:
            logger.debug(f"ML predict error: {e}")
            return 'NEUTRAL', 0.5

    def learn(self, indicators, went_up: bool):
        try:
            feats = self._features(indicators)
            self.model.learn_one(feats, int(went_up))
            self.predictions_made += 1
            if self.predictions_made % 50 == 0:
                self.save()
        except Exception as e:
            logger.debug(f"ML learn error: {e}")

    def save(self):
        path = self.model_path
        os.makedirs(os.path.dirname(path) if os.path.dirname(path) else '.', exist_ok=True)
        with open(path, 'wb') as f:
            pickle.dump(self.model, f)
        logger.info(f"ML model saved ({self.predictions_made} samples)")

    def _load(self):
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, 'rb') as f:
                    self.model = pickle.load(f)
                logger.info("ML model loaded from disk")
            except Exception:
                pass
