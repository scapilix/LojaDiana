# Diretiva: Estratégia de Trading

## Objetivo
Gerar sinais de compra/venda precisos para criptomoedas usando indicadores técnicos e IA neural em tempo real.

## Pipeline de Análise

```
Binance WebSocket → Candle fechado → Indicadores → ML Predictor → Sinal final
```

## Indicadores e Pesos

| Indicador     | Condição de Compra     | Condição de Venda      | Peso Máx |
|---------------|------------------------|------------------------|----------|
| RSI           | < 25 (extremo)         | > 75 (extremo)         | 3        |
| MACD Histog.  | positivo               | negativo               | 2        |
| Bollinger BB  | abaixo da banda inf.   | acima da banda sup.    | 3        |
| EMA Trend     | EMA20 > EMA50 (+0.3%)  | EMA50 > EMA20 (+0.3%)  | 2        |
| Estocástico   | K < 20 e D < 20        | K > 80 e D > 80        | 2        |
| Volume Ratio  | confirmação (>1.5x)    | confirmação (>1.5x)    | 1        |
| ML Neural     | prevê ALTA (>65%)      | prevê QUEDA (>65%)     | 3        |

**Total máximo**: 16 pontos

## Cálculo do Sinal

```
net_score = (compra - venda) / total

BUY  → net_score > +0.15  (confiança = 50 + net*50)
SELL → net_score < -0.15  (confiança = 50 + |net|*50)
HOLD → -0.15 ≤ net ≤ +0.15
```

## Gerenciamento de Risco

- Tamanho por operação: 10% do portfólio (configurável via `TRADE_SIZE_PCT`)
- Paper trading por padrão — real trading exige `REAL_TRADING=true` + API keys
- Auto-trade desativado por padrão — ativar apenas com estratégia testada
- Confiança mínima para auto-trade: 70% (configurável via `MIN_CONFIDENCE`)

## Real Trading (ordens reais na Binance)

- Requer `BINANCE_API_KEY` + `BINANCE_SECRET` no `.env` com permissão apenas de
  **Spot & Margin Trading** (nunca ativar "Withdrawals")
- `REAL_TRADING=true` habilita o motor; `BINANCE_TESTNET=true` usa a testnet da
  Binance (dinheiro fictício) para validar antes de ir a produção
- O dashboard tem um seletor **PAPER / REAL** no topo — trocar para REAL exige
  confirmação explícita, e cada compra/venda em modo REAL pede confirmação extra
- **Auto-trade nunca executa ordens reais** — só opera em paper trading, mesmo com
  `REAL_TRADING=true`. Ordens reais só saem por clique manual do utilizador
- Ordem mínima: ~$10 USDT (mínimo da Binance para a maioria dos pares USDT).
  Se `saldo_livre * TRADE_SIZE_PCT < $10`, a compra é recusada
- Se as chaves forem inválidas ou sem permissão, o real trading fica desativado
  automaticamente no arranque (log de erro, sem crash)

## Símbolos Recomendados

Para scalping (1 minuto):
1. **BTCUSDT** — maior liquidez, spreads mínimos
2. **ETHUSDT** — alta liquidez, boa volatilidade
3. **BNBUSDT** — bom volume, tendências claras
4. **SOLUSDT** — volátil, oportunidades frequentes
5. **ADAUSDT** — movimentos mais suaves

## Aprendizados e Edge Cases

- Evitar trades durante anúncios importantes (alto volume anômalo)
- RSI pode permanecer sobrecomprado por longos períodos em bull market
- MACD tem lag — confirmar sempre com outros indicadores
- Volume alto aumenta confiabilidade do sinal
- O modelo ML melhora significativamente após 500+ amostras
