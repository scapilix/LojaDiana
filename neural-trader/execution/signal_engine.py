from dataclasses import dataclass
from typing import List
from execution.indicators import IndicatorValues


@dataclass
class Signal:
    symbol: str
    action: str
    confidence: int
    reasoning: List[str]
    price: float
    ml_prediction: str
    ml_confidence: float
    indicators: IndicatorValues


def generate_signal(
    symbol: str,
    ind: IndicatorValues,
    ml_pred: str,
    ml_conf: float,
) -> Signal:
    buy = 0
    sell = 0
    total = 0
    reasons: List[str] = []

    # RSI (max weight 3)
    if ind.rsi < 25:
        buy += 3
        reasons.append(f"RSI extremamente sobrevendido ({ind.rsi:.1f})")
    elif ind.rsi < 35:
        buy += 2
        reasons.append(f"RSI sobrevendido ({ind.rsi:.1f})")
    elif ind.rsi < 45:
        buy += 1
    elif ind.rsi > 75:
        sell += 3
        reasons.append(f"RSI extremamente sobrecomprado ({ind.rsi:.1f})")
    elif ind.rsi > 65:
        sell += 2
        reasons.append(f"RSI sobrecomprado ({ind.rsi:.1f})")
    elif ind.rsi > 55:
        sell += 1
    total += 3

    # MACD histogram (max weight 2)
    if ind.macd_hist > 0:
        buy += 2
        if ind.macd > 0:
            reasons.append("MACD positivo acima da linha de sinal")
    else:
        sell += 2
        if ind.macd < 0:
            reasons.append("MACD negativo abaixo da linha de sinal")
    total += 2

    # Bollinger Bands (max weight 3)
    if ind.bb_position < 0.05:
        buy += 3
        reasons.append("Preço abaixo da banda inferior de Bollinger")
    elif ind.bb_position < 0.25:
        buy += 1
    elif ind.bb_position > 0.95:
        sell += 3
        reasons.append("Preço acima da banda superior de Bollinger")
    elif ind.bb_position > 0.75:
        sell += 1
    total += 3

    # EMA trend (max weight 2)
    if ind.ema_trend > 0.3:
        buy += 2
        reasons.append(f"Tendência altista: EMA20 acima da EMA50 por {ind.ema_trend:.2f}%")
    elif ind.ema_trend < -0.3:
        sell += 2
        reasons.append(f"Tendência baixista: EMA50 acima da EMA20 por {abs(ind.ema_trend):.2f}%")
    total += 2

    # Stochastic (max weight 2)
    if ind.stoch_k < 20 and ind.stoch_d < 20:
        buy += 2
        reasons.append(f"Estocástico sobrevendido (K={ind.stoch_k:.1f}, D={ind.stoch_d:.1f})")
    elif ind.stoch_k > 80 and ind.stoch_d > 80:
        sell += 2
        reasons.append(f"Estocástico sobrecomprado (K={ind.stoch_k:.1f}, D={ind.stoch_d:.1f})")
    total += 2

    # Volume confirmation (max weight 1)
    if ind.volume_ratio > 1.5:
        reasons.append(f"Volume elevado confirma movimento ({ind.volume_ratio:.1f}x da média)")
        buy += 1 if buy > sell else 0
        sell += 1 if sell > buy else 0
    total += 1

    # ML prediction (max weight 3)
    ml_w = 3
    if ml_pred == 'UP':
        contrib = int(ml_w * ml_conf)
        buy += contrib
        if ml_conf > 0.65:
            reasons.append(f"IA Neural prevê ALTA com {ml_conf*100:.0f}% de confiança")
    elif ml_pred == 'DOWN':
        contrib = int(ml_w * ml_conf)
        sell += contrib
        if ml_conf > 0.65:
            reasons.append(f"IA Neural prevê QUEDA com {ml_conf*100:.0f}% de confiança")
    total += ml_w

    net = (buy - sell) / max(total, 1)

    if net > 0.15:
        action = 'BUY'
        confidence = min(99, int(50 + net * 50))
    elif net < -0.15:
        action = 'SELL'
        confidence = min(99, int(50 + abs(net) * 50))
    else:
        action = 'HOLD'
        confidence = max(1, int(50 - abs(net) * 100))

    return Signal(
        symbol=symbol,
        action=action,
        confidence=confidence,
        reasoning=reasons,
        price=ind.close,
        ml_prediction=ml_pred,
        ml_confidence=ml_conf,
        indicators=ind,
    )
