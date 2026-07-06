import asyncio
import json
import aiohttp
import websockets
from collections import deque
from dataclasses import dataclass
from typing import Dict, List, Callable
import logging

logger = logging.getLogger(__name__)


@dataclass
class Candle:
    symbol: str
    open_time: int
    open: float
    high: float
    low: float
    close: float
    volume: float
    close_time: int
    is_closed: bool


class DataFeed:
    BINANCE_WS = "wss://stream.binance.com:9443/stream?streams={streams}"
    BINANCE_REST = "https://api.binance.com/api/v3/klines"

    def __init__(self, symbols: List[str], interval: str = '1m'):
        self.symbols = [s.upper() for s in symbols]
        self.interval = interval
        self.candles: Dict[str, deque] = {s: deque(maxlen=200) for s in self.symbols}
        self._candle_close_cbs: List[Callable] = []
        self._tick_cbs: List[Callable] = []
        self._running = False

    def on_candle_close(self, cb: Callable):
        self._candle_close_cbs.append(cb)

    def on_tick(self, cb: Callable):
        self._tick_cbs.append(cb)

    async def _fetch_historical(self):
        async with aiohttp.ClientSession() as session:
            for symbol in self.symbols:
                try:
                    params = {'symbol': symbol, 'interval': self.interval, 'limit': 200}
                    async with session.get(self.BINANCE_REST, params=params) as r:
                        data = await r.json()
                        for k in data[:-1]:
                            self.candles[symbol].append(Candle(
                                symbol=symbol,
                                open_time=int(k[0]),
                                open=float(k[1]),
                                high=float(k[2]),
                                low=float(k[3]),
                                close=float(k[4]),
                                volume=float(k[5]),
                                close_time=int(k[6]),
                                is_closed=True,
                            ))
                    logger.info(f"Loaded {len(self.candles[symbol])} candles for {symbol}")
                except Exception as e:
                    logger.error(f"Historical fetch error {symbol}: {e}")

    async def _handle_message(self, raw: str):
        data = json.loads(raw)
        stream_data = data.get('data', data)

        if stream_data.get('e') != 'kline':
            return

        k = stream_data['k']
        symbol = stream_data['s']
        candle = Candle(
            symbol=symbol,
            open_time=int(k['t']),
            open=float(k['o']),
            high=float(k['h']),
            low=float(k['l']),
            close=float(k['c']),
            volume=float(k['v']),
            close_time=int(k['T']),
            is_closed=bool(k['x']),
        )

        buf = self.candles[symbol]
        if buf and not buf[-1].is_closed:
            buf[-1] = candle
        else:
            buf.append(candle)

        for cb in self._tick_cbs:
            asyncio.create_task(cb(candle))

        if candle.is_closed:
            snap = list(buf)
            for cb in self._candle_close_cbs:
                asyncio.create_task(cb(candle, snap))

    async def _connect(self):
        streams = '/'.join(f"{s.lower()}@kline_{self.interval}" for s in self.symbols)
        url = self.BINANCE_WS.format(streams=streams)
        while self._running:
            try:
                async with websockets.connect(url, ping_interval=20) as ws:
                    logger.info(f"Binance WebSocket connected ({len(self.symbols)} streams)")
                    while self._running:
                        msg = await asyncio.wait_for(ws.recv(), timeout=30)
                        await self._handle_message(msg)
            except Exception as e:
                logger.warning(f"WebSocket error: {e}. Reconnecting in 3s...")
                await asyncio.sleep(3)

    async def start(self):
        self._running = True
        await self._fetch_historical()
        await self._connect()

    def stop(self):
        self._running = False
