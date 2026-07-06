import asyncio
import json
import logging
import os
import sys
from typing import Set

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

import config
from execution.data_feed import DataFeed
from execution.indicators import calculate_indicators
from execution.ml_predictor import MLPredictor
from execution.signal_engine import generate_signal, Signal
from execution.trading_engine import PaperTradingEngine

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s: %(message)s',
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Neural Trader")
templates = Jinja2Templates(
    directory=os.path.join(os.path.dirname(__file__), "templates")
)

# Core components
data_feed = DataFeed(config.SYMBOLS, config.TIMEFRAME)
paper = PaperTradingEngine(config.PAPER_BALANCE, config.TRADE_SIZE_PCT)
ml = MLPredictor(config.ML_MODEL_PATH)

# Runtime state
clients: Set[WebSocket] = set()
latest_signals: dict = {}
auto_trade: dict = {'enabled': config.AUTO_TRADE}
prev_indicators: dict = {}


async def broadcast(data: dict):
    if not clients:
        return
    msg = json.dumps(data, default=str)
    dead: Set[WebSocket] = set()
    for ws in list(clients):
        try:
            await ws.send_text(msg)
        except Exception:
            dead.add(ws)
    clients.difference_update(dead)


def signal_to_dict(s: Signal) -> dict:
    ind = s.indicators
    return {
        'symbol': s.symbol,
        'action': s.action,
        'confidence': s.confidence,
        'reasoning': s.reasoning,
        'price': s.price,
        'ml_prediction': s.ml_prediction,
        'ml_confidence': round(s.ml_confidence, 3),
        'indicators': {
            'rsi': round(ind.rsi, 2),
            'macd': round(ind.macd, 6),
            'macd_signal': round(ind.macd_signal, 6),
            'macd_hist': round(ind.macd_hist, 6),
            'bb_upper': round(ind.bb_upper, 4),
            'bb_mid': round(ind.bb_mid, 4),
            'bb_lower': round(ind.bb_lower, 4),
            'bb_position': round(ind.bb_position, 3),
            'ema20': round(ind.ema20, 4),
            'ema50': round(ind.ema50, 4),
            'ema_trend': round(ind.ema_trend, 4),
            'stoch_k': round(ind.stoch_k, 2),
            'stoch_d': round(ind.stoch_d, 2),
            'volume_ratio': round(ind.volume_ratio, 2),
            'atr': round(ind.atr, 6),
        },
    }


async def on_candle_close(candle, history):
    symbol = candle.symbol
    ind = calculate_indicators(history)
    if not ind:
        return

    prev = prev_indicators.get(symbol)
    if prev:
        went_up = candle.close > prev.close
        ml.learn(prev, went_up)

    ml_pred, ml_conf = ml.predict(ind)
    signal = generate_signal(symbol, ind, ml_pred, ml_conf)
    latest_signals[symbol] = signal
    prev_indicators[symbol] = ind

    paper.update_positions(symbol, candle.close)

    if auto_trade['enabled'] and signal.confidence >= config.MIN_CONFIDENCE:
        if signal.action == 'BUY' and symbol not in paper.positions:
            paper.buy(symbol, candle.close)
        elif signal.action == 'SELL' and symbol in paper.positions:
            paper.sell(symbol, candle.close)

    await broadcast({
        'type': 'signal_update',
        **signal_to_dict(signal),
        'portfolio': paper.get_stats(),
        'auto_trade': auto_trade['enabled'],
        'ml_samples': ml.predictions_made,
    })


async def on_tick(candle):
    paper.update_positions(candle.symbol, candle.close)
    await broadcast({
        'type': 'tick',
        'symbol': candle.symbol,
        'price': candle.close,
        'open': candle.open,
        'high': candle.high,
        'low': candle.low,
        'volume': candle.volume,
        'time': candle.open_time // 1000,
    })


@app.on_event("startup")
async def startup():
    data_feed.on_candle_close(on_candle_close)
    data_feed.on_tick(on_tick)
    asyncio.create_task(data_feed.start())
    logger.info("Neural Trader ready")


@app.on_event("shutdown")
async def shutdown():
    data_feed.stop()
    ml.save()


@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "symbols": config.SYMBOLS,
    })


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.add(websocket)

    await websocket.send_text(json.dumps({
        'type': 'init',
        'symbols': config.SYMBOLS,
        'signals': {k: signal_to_dict(v) for k, v in latest_signals.items()},
        'portfolio': paper.get_stats(),
        'auto_trade': auto_trade['enabled'],
        'ml_samples': ml.predictions_made,
    }, default=str))

    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            action = msg.get('action', '')
            symbol = msg.get('symbol', '').upper()

            if action == 'buy' and symbol:
                sig = latest_signals.get(symbol)
                curr_price = sig.price if sig else 0
                if curr_price:
                    paper.buy(symbol, curr_price)
                    await broadcast({'type': 'portfolio', 'portfolio': paper.get_stats()})

            elif action == 'sell' and symbol:
                sig = latest_signals.get(symbol)
                curr_price = sig.price if sig else 0
                if curr_price:
                    paper.sell(symbol, curr_price)
                    await broadcast({'type': 'portfolio', 'portfolio': paper.get_stats()})

            elif action == 'toggle_auto':
                auto_trade['enabled'] = not auto_trade['enabled']
                await broadcast({'type': 'auto_trade', 'enabled': auto_trade['enabled']})

    except WebSocketDisconnect:
        clients.discard(websocket)


@app.get("/api/candles/{symbol}")
async def get_candles(symbol: str):
    sym = symbol.upper()
    candles = [c for c in data_feed.candles.get(sym, []) if c.is_closed]
    return [{
        'time': c.open_time // 1000,
        'open': c.open, 'high': c.high,
        'low': c.low, 'close': c.close,
        'volume': c.volume,
    } for c in candles]


@app.get("/api/signals")
async def get_signals():
    return {k: signal_to_dict(v) for k, v in latest_signals.items()}


@app.get("/api/portfolio")
async def get_portfolio():
    return paper.get_stats()


@app.get("/api/trades")
async def get_trades():
    return paper.get_stats()['recent_trades']
