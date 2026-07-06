import os
from dotenv import load_dotenv

load_dotenv()

SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT']
TIMEFRAME = '1m'
PAPER_BALANCE = float(os.getenv('PAPER_BALANCE', '10000'))
BINANCE_API_KEY = os.getenv('BINANCE_API_KEY', '')
BINANCE_SECRET = os.getenv('BINANCE_SECRET', '')
REAL_TRADING = os.getenv('REAL_TRADING', 'false').lower() == 'true'
AUTO_TRADE = os.getenv('AUTO_TRADE', 'false').lower() == 'true'
MIN_CONFIDENCE = int(os.getenv('MIN_CONFIDENCE', '70'))
TRADE_SIZE_PCT = 0.10
ML_MODEL_PATH = '.tmp/ml_model.pkl'
