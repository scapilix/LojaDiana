import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


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


class PaperTradingEngine:
    def __init__(self, initial_balance: float = 10000.0, trade_size_pct: float = 0.10):
        self.balance = initial_balance
        self.initial_balance = initial_balance
        self.trade_size_pct = trade_size_pct
        self.positions: Dict[str, Position] = {}
        self.trades: List[Trade] = []

    def buy(self, symbol: str, price: float) -> Optional[Position]:
        if symbol in self.positions or price <= 0:
            return None
        amount = self.balance * self.trade_size_pct
        if amount < 5:
            return None
        size = amount / price
        self.balance -= amount
        pos = Position(
            symbol=symbol, side='BUY', size=size,
            entry_price=price, current_price=price,
            opened_at=datetime.utcnow().isoformat(),
        )
        self.positions[symbol] = pos
        logger.info(f"PAPER BUY  {symbol}: {size:.6f} @ ${price:.4f}  (${amount:.2f})")
        return pos

    def sell(self, symbol: str, price: float) -> Optional[Trade]:
        pos = self.positions.pop(symbol, None)
        if not pos or price <= 0:
            return None
        exit_val = pos.size * price
        entry_val = pos.size * pos.entry_price
        pnl = exit_val - entry_val
        pnl_pct = (pnl / entry_val) * 100
        self.balance += exit_val
        trade = Trade(
            symbol=symbol, side='SELL', size=pos.size,
            entry_price=pos.entry_price, exit_price=price,
            pnl=pnl, pnl_pct=pnl_pct,
            opened_at=pos.opened_at,
            closed_at=datetime.utcnow().isoformat(),
        )
        self.trades.append(trade)
        sign = '+' if pnl >= 0 else ''
        logger.info(f"PAPER SELL {symbol}: P&L {sign}${pnl:.2f} ({sign}{pnl_pct:.2f}%)")
        return trade

    def update_positions(self, symbol: str, price: float):
        pos = self.positions.get(symbol)
        if pos and price > 0:
            pos.current_price = price
            entry_val = pos.size * pos.entry_price
            pos.pnl = pos.size * price - entry_val
            pos.pnl_pct = (pos.pnl / entry_val) * 100

    @property
    def total_value(self) -> float:
        return self.balance + sum(p.size * p.current_price for p in self.positions.values())

    @property
    def total_pnl(self) -> float:
        return self.total_value - self.initial_balance

    @property
    def total_pnl_pct(self) -> float:
        return (self.total_pnl / self.initial_balance) * 100

    def get_stats(self) -> dict:
        winning = [t for t in self.trades if t.pnl > 0]
        return {
            'balance': round(self.balance, 2),
            'total_value': round(self.total_value, 2),
            'total_pnl': round(self.total_pnl, 2),
            'total_pnl_pct': round(self.total_pnl_pct, 2),
            'initial_balance': self.initial_balance,
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
