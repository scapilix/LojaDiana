# Diretiva: Modelo de Machine Learning

## Objetivo
Prever a direção do próximo candle em tempo real usando aprendizado online contínuo.

## Biblioteca
`river` — biblioteca Python para ML em streaming/tempo real. Atualiza o modelo incrementalmente sem re-treinar do zero.

## Arquitetura

```
Pipeline(
  StandardScaler(),           # normalização online
  BaggingClassifier(
    LogisticRegression(),     # modelo base
    n_models=7,               # ensemble de 7 modelos
    seed=42
  )
)
```

## Features de Entrada (11 features)

| Feature         | Descrição                                    | Range    |
|-----------------|----------------------------------------------|----------|
| rsi_norm        | RSI normalizado 0-1                          | [0, 1]   |
| rsi_oversold    | Flag: RSI < 30                               | {0, 1}   |
| rsi_overbought  | Flag: RSI > 70                               | {0, 1}   |
| macd_hist_norm  | Histograma MACD normalizado pelo preço       | [-5, 5]  |
| macd_positive   | Flag: MACD > 0                               | {0, 1}   |
| bb_position     | Posição do preço dentro das BB (0=inf, 1=sup)| [0, 1]   |
| ema_trend       | % diferença EMA20/EMA50                      | [-5, 5]  |
| stoch_k_norm    | Estocástico K normalizado                    | [0, 1]   |
| stoch_d_norm    | Estocástico D normalizado                    | [0, 1]   |
| volume_ratio    | Volume atual / média 20 períodos             | [0, 5]   |
| price_change_5  | % variação nos últimos 5 candles             | [-1, 1]  |

## Label
- `1` → preço subiu no próximo candle  
- `0` → preço caiu ou ficou igual no próximo candle

## Ciclo de Aprendizado Online

```
Candle N fecha
    ↓
Calcular indicadores(N)
    ↓
Buscar indicadores(N-1) armazenados
    ↓
label = 1 se close(N) > close(N-1) else 0
    ↓
ml.learn(indicadores_N-1, label)   ← atualiza o modelo
    ↓
ml.predict(indicadores_N)          ← previsão para N+1
    ↓
Armazenar indicadores(N) para próxima iteração
```

## Performance Esperada

| Amostras | Acurácia esperada |
|----------|-------------------|
| < 50     | ~50% (aleatório)  |
| 50–200   | 52–55%            |
| 200–500  | 55–60%            |
| > 500    | 58–65%            |

*Nota: 55%+ já é lucrativo para estratégias de scalping com boa gestão de risco.*

## Melhorias Futuras

- Adicionar features de order book (bid/ask spread)
- Testar LSTM (river.compat + torch)
- Adicionar sentiment analysis de notícias
- Ensemble multi-timeframe (1m + 5m + 15m)
