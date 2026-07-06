# 🧠 Neural Trader

**Sistema de trade de criptomoedas com IA em tempo real.**

Sinais BUY/SELL/HOLD com confiança, modelo neural que aprende continuamente, paper trading e real trading em paralelo — tudo num dashboard ao vivo.

---

## Features

- **Dados em tempo real** — Binance WebSocket (tick a tick)
- **10+ indicadores técnicos** — RSI, MACD, Bollinger Bands, EMA, Estocástico, ATR, Volume
- **IA Neural com aprendizado online** — modelo River ML que melhora a cada candle fechado
- **Paper trading** — simula com $10.000 virtual sem risco
- **Real trading** — executa ordens reais via API Binance (opcional)
- **Auto-trade** — executa automaticamente quando confiança ≥ mínimo configurado
- **Dashboard ao vivo** — gráficos TradingView + sinais + portfólio em tempo real

---

## Quick Start

```bash
# 1. Instalar dependências
pip install -r requirements.txt

# 2. Configurar variáveis (API keys opcionais para paper trading)
cp .env.example .env

# 3. Criar pasta temporária para o modelo ML
mkdir -p .tmp

# 4. Iniciar
python main.py

# 5. Abrir no browser
open http://localhost:8000
```

---

## Configuração (.env)

| Variável            | Padrão  | Descrição                                         |
|---------------------|---------|---------------------------------------------------|
| `PAPER_BALANCE`     | 10000   | Saldo inicial do paper trading (USD)              |
| `REAL_TRADING`      | false   | Habilitar trades reais (requer API keys)          |
| `AUTO_TRADE`        | false   | Auto-executar trades baseados nos sinais          |
| `MIN_CONFIDENCE`    | 70      | Confiança mínima (%) para auto-trade              |
| `BINANCE_API_KEY`   | —       | Chave da API Binance (apenas para real trading)   |
| `BINANCE_SECRET`    | —       | Secret da API Binance (apenas para real trading)  |

---

## Arquitetura

```
execution/
  data_feed.py      → WebSocket Binance (dados em tempo real, histórico)
  indicators.py     → RSI, MACD, BB, EMA, Estocástico, ATR, Volume
  ml_predictor.py   → Modelo River (BaggingClassifier, aprendizado online)
  signal_engine.py  → Combina indicadores + ML → sinal BUY/SELL/HOLD + confiança
  trading_engine.py → Paper trading com P&L, posições, histórico

web/
  app.py            → FastAPI + WebSocket broadcast em tempo real
  templates/
    dashboard.html  → Dashboard (TradingView Charts, sinais, portfólio)

directives/         → Documentação da estratégia e do modelo ML
.tmp/               → Modelo ML salvo (gerado automaticamente, não commitar)
```

---

## Como funciona a IA

```
1. Candle fecha  →  indicadores calculados (RSI, MACD, BB...)
2. ML aprende:  (indicadores anteriores) → (direção real do próximo candle)
3. ML prevê:    (indicadores atuais) → P(subir no próximo candle)
4. Sinal final: peso dos indicadores + peso da IA → BUY/SELL/HOLD + confiança%
5. Loop:        quanto mais candles, melhor o modelo
```

---

## ⚠️ Aviso de Risco

Este software é para fins educacionais e de pesquisa.  
Trading de criptomoedas envolve risco substancial de perda de capital.  
**Sempre comece com paper trading antes de usar dinheiro real.**
