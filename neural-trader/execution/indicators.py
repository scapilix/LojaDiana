import numpy as np
import pandas as pd
from dataclasses import dataclass
from typing import Optional


@dataclass
class IndicatorValues:
    close: float
    volume: float
    rsi: float
    macd: float
    macd_signal: float
    macd_hist: float
    bb_upper: float
    bb_mid: float
    bb_lower: float
    bb_position: float
    ema20: float
    ema50: float
    ema_trend: float
    atr: float
    stoch_k: float
    stoch_d: float
    volume_ratio: float
    price_change_5: float


def calculate_indicators(candles) -> Optional[IndicatorValues]:
    if len(candles) < 60:
        return None

    df = pd.DataFrame([{
        'open': c.open, 'high': c.high, 'low': c.low,
        'close': c.close, 'volume': c.volume,
    } for c in candles], dtype=float)

    c = df['close']
    h = df['high']
    lo = df['low']
    v = df['volume']

    # RSI
    delta = c.diff()
    gain = delta.clip(lower=0).rolling(14).mean()
    loss = (-delta.clip(upper=0)).rolling(14).mean()
    rs = gain / loss.replace(0, np.nan)
    rsi = (100 - 100 / (1 + rs)).iloc[-1]

    # MACD
    ema12 = c.ewm(span=12, adjust=False).mean()
    ema26 = c.ewm(span=26, adjust=False).mean()
    macd_line = ema12 - ema26
    sig_line = macd_line.ewm(span=9, adjust=False).mean()
    macd_hist = macd_line - sig_line

    # Bollinger Bands
    bb_mid = c.rolling(20).mean()
    bb_std = c.rolling(20).std()
    bb_u = bb_mid + 2 * bb_std
    bb_l = bb_mid - 2 * bb_std

    curr = float(c.iloc[-1])
    bu = float(bb_u.iloc[-1])
    bm = float(bb_mid.iloc[-1])
    bl = float(bb_l.iloc[-1])
    bb_range = bu - bl
    bb_pos = (curr - bl) / bb_range if bb_range > 0 else 0.5

    # EMAs
    ema20 = float(c.ewm(span=20, adjust=False).mean().iloc[-1])
    ema50 = float(c.ewm(span=50, adjust=False).mean().iloc[-1])
    ema_trend = (ema20 / ema50 - 1) * 100 if ema50 > 0 else 0.0

    # ATR
    hl = h - lo
    hc = (h - c.shift()).abs()
    lc = (lo - c.shift()).abs()
    tr = pd.concat([hl, hc, lc], axis=1).max(axis=1)
    atr = tr.rolling(14).mean().iloc[-1]

    # Stochastic
    lo14 = lo.rolling(14).min()
    hi14 = h.rolling(14).max()
    stk = 100 * (c - lo14) / (hi14 - lo14).replace(0, np.nan)
    std = stk.rolling(3).mean()

    # Volume ratio
    vol_avg = v.rolling(20).mean().iloc[-1]
    vol_ratio = float(v.iloc[-1] / vol_avg) if vol_avg > 0 else 1.0

    # Price change 5 candles
    pc5 = float((c.iloc[-1] / c.iloc[-6] - 1) * 100) if len(c) >= 6 else 0.0

    def safe(val, default=0.0):
        f = float(val)
        return default if (np.isnan(f) or np.isinf(f)) else f

    return IndicatorValues(
        close=curr,
        volume=float(v.iloc[-1]),
        rsi=safe(rsi, 50.0),
        macd=safe(macd_line.iloc[-1]),
        macd_signal=safe(sig_line.iloc[-1]),
        macd_hist=safe(macd_hist.iloc[-1]),
        bb_upper=bu, bb_mid=bm, bb_lower=bl,
        bb_position=safe(bb_pos, 0.5),
        ema20=ema20, ema50=ema50,
        ema_trend=safe(ema_trend),
        atr=safe(atr),
        stoch_k=safe(stk.iloc[-1], 50.0),
        stoch_d=safe(std.iloc[-1], 50.0),
        volume_ratio=safe(vol_ratio, 1.0),
        price_change_5=safe(pc5),
    )
