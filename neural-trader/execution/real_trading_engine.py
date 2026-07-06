import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional

import ccxt

logger = logging.getLogger(__name__)

MIN_NOTIONAL_USD = 10.0  # Binance minimum order size is ~$10 for most USDT pairs


@dataclass
class Position:
    symbol: str
    side: str
    size: float
    entry_price: float
    current_price: float
    opened_at: str
    pnl: float = 0.0
    pnl_pct: float = 0.0


@dataclass
class Trade:
    symbol: str
    side: str
    size: float
    entry_price: float
    exit_price: float
    pnl: float
    pnl_pct: float
    opened_at: str
    closed_at: str


def to_ccxt_symbol(symbol: str) -> str:
    """BTCUSDT -> BTC/USDT"""
    if symbol.endswith('USDT'):
        return f"{symbol[:-4]}/USDT"
    return symbol


class RealTradingEngine:
    """Executes real market orders on Binance via ccxt. Real money, real risk."""

    def __init__(self, api_key: str, api_secret: str, trade_size_pct: float = 0.10,
                 testnet: bool = False):
        self.exchange = ccxt.binance({
            'apiKey': api_key,
            'secret': api_secret,
            'enableRateLimit': True,
        })
        if testnet:
            self.exchange.set_sandbox_mode(True)
        self.trade_size_pct = trade_size_pct
        self.positions: Dict[str, Position] = {}
        self.trades: List[Trade] = []
        self._initial_value: Optional[float] = None

    def verify_connection(self):
        """Raises if the API keys are invalid or lack permissions. Call once at startup."""
        self.exchange.fetch_balance()

    def _usdt_free(self) -> float:
        bal = self.exchange.fetch_balance()
        return float(bal.get('free', {}).get('USDT', 0.0) or 0.0)

    def buy(self, symbol: str, price: float) -> Optional[Position]:
        if symbol in self.positions or price <= 0:
            return None
        market = to_ccxt_symbol(symbol)
        try:
            usdt = self._usdt_free()
            amount_usd = usdt * self.trade_size_pct
            if amount_usd < MIN_NOTIONAL_USD:
                logger.warning(
                    f"REAL BUY skipped {symbol}: valor calculado ${amount_usd:.2f} "
                    f"abaixo do mínimo ${MIN_NOTIONAL_USD}"
                )
                return None
            qty = float(self.exchange.amount_to_precision(market, amount_usd / price))
            order = self.exchange.create_market_buy_order(market, qty)
            fill_price = float(order.get('average') or order.get('price') or price)
            fill_qty = float(order.get('filled') or qty)
            pos = Position(
                symbol=symbol, side='BUY', size=fill_qty,
                entry_price=fill_price, current_price=fill_price,
                opened_at=datetime.utcnow().isoformat(),
            )
            self.positions[symbol] = pos
            logger.info(f"REAL BUY  {symbol}: {fill_qty:.6f} @ ${fill_price:.4f}")
            return pos
        except Exception as e:
            logger.error(f"REAL BUY failed {symbol}: {e}")
            return None

    def sell(self, symbol: str, price: float) -> Optional[Trade]:
        pos = self.positions.get(symbol)
        if not pos or price <= 0:
            return None
        market = to_ccxt_symbol(symbol)
        try:
            qty = float(self.exchange.amount_to_precision(market, pos.size))
            order = self.exchange.create_market_sell_order(market, qty)
            fill_price = float(order.get('average') or order.get('price') or price)
            fill_qty = float(order.get('filled') or qty)
            exit_val = fill_qty * fill_price
            entry_val = pos.size * pos.entry_price
            pnl = exit_val - entry_val
            pnl_pct = (pnl / entry_val) * 100 if entry_val else 0.0
            trade = Trade(
                symbol=symbol, side='SELL', size=pos.size,
                entry_price=pos.entry_price, exit_price=fill_price,
                pnl=pnl, pnl_pct=pnl_pct,
                opened_at=pos.opened_at,
                closed_at=datetime.utcnow().isoformat(),
            )
            self.trades.append(trade)
            self.positions.pop(symbol, None)
            sign = '+' if pnl >= 0 else ''
            logger.info(f"REAL SELL {symbol}: P&L {sign}${pnl:.2f} ({sign}{pnl_pct:.2f}%)")
            return trade
        except Exception as e:
            logger.error(f"REAL SELL failed {symbol}: {e}")
            return None

    def update_positions(self, symbol: str, price: float):
        pos = self.positions.get(symbol)
        if pos and price > 0:
            pos.current_price = price
            entry_val = pos.size * pos.entry_price
            pos.pnl = pos.size * price - entry_val
            pos.pnl_pct = (pos.pnl / entry_val) * 100 if entry_val else 0.0

    def get_stats(self) -> dict:
        try:
            usdt = self._usdt_free()
        except Exception as e:
            logger.error(f"REAL fetch_balance failed: {e}")
            usdt = 0.0
        positions_value = sum(p.size * p.current_price for p in self.positions.values())
        total_value = usdt + positions_value
        if self._initial_value is None:
            self._initial_value = total_value
        total_pnl = total_value - self._initial_value
        total_pnl_pct = (total_pnl / self._initial_value * 100) if self._initial_value else 0.0
        winning = [t for t in self.trades if t.pnl > 0]
        return {
            'balance': round(usdt, 2),
            'total_value': round(total_value, 2),
            'total_pnl': round(total_pnl, 2),
            'total_pnl_pct': round(total_pnl_pct, 2),
            'initial_balance': round(self._initial_value, 2),
            'total_trades': len(self.trades),
            'win_rate': round(len(winning) / len(self.trades) * 100, 1) if self.trades else 0.0,
            'positions': {
                s: {
                    'size': p.size,
                    'entry_price': p.entry_price,
                    'current_price': p.current_price,
                    'pnl': round(p.pnl, 2),
                    'pnl_pct': round(p.pnl_pct, 2),
                    'opened_at': p.opened_at,
                }
                for s, p in self.positions.items()
            },
            'recent_trades': [
                {
                    'symbol': t.symbol,
                    'pnl': round(t.pnl, 2),
                    'pnl_pct': round(t.pnl_pct, 2),
                    'exit_price': t.exit_price,
                    'closed_at': t.closed_at,
                }
                for t in self.trades[-15:]
            ],
        }
