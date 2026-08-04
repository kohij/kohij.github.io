"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  createChart,
  HistogramSeries,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type UTCTimestamp,
} from "lightweight-charts";

export type ChartCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type ChartInstrument = {
  symbol: string;
  name: string;
  candles: ChartCandle[];
};

type Period = "1H" | "3H" | "1D";

const won = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});
const compact = new Intl.NumberFormat("ko-KR", { notation: "compact", maximumFractionDigits: 1 });

function periodLimit(period: Period) {
  if (period === "1H") return 60;
  if (period === "3H") return 180;
  return 240;
}

export default function StockChart({ item }: { item: ChartInstrument }) {
  const [period, setPeriod] = useState<Period>("1D");
  const [remote, setRemote] = useState<{ symbol: string; candles: ChartCandle[] } | null>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const candles = remote?.symbol === item.symbol && remote.candles.length ? remote.candles : item.candles;
  const loading = remote?.symbol !== item.symbol;
  const visibleCandles = useMemo(() => candles.slice(-periodLimit(period)), [candles, period]);
  const latest = visibleCandles.at(-1);
  const hasData = visibleCandles.length > 0;

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/market/candles?symbol=${encodeURIComponent(item.symbol)}`, {
      cache: "no-store",
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json() as { candles?: ChartCandle[] };
      if (!controller.signal.aborted) {
        setRemote({ symbol: item.symbol, candles: Array.isArray(payload.candles) ? payload.candles : [] });
      }
    }).catch(() => {
      if (!controller.signal.aborted) setRemote({ symbol: item.symbol, candles: [] });
    });
    return () => controller.abort();
  }, [item.symbol]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const chart = createChart(mount, {
      width: mount.clientWidth,
      height: mount.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: "#151518" },
        textColor: "#8b8b96",
        attributionLogo: true,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.045)" },
        horzLines: { color: "rgba(255,255,255,0.045)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(255,255,255,0.28)", labelBackgroundColor: "#313139" },
        horzLine: { color: "rgba(255,255,255,0.28)", labelBackgroundColor: "#313139" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.1)",
        scaleMargins: { top: 0.08, bottom: 0.28 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.1)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 4,
        barSpacing: 7,
        minBarSpacing: 2,
      },
      localization: {
        locale: "ko-KR",
        priceFormatter: (price: number) => won.format(price),
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#f04452",
      downColor: "#3182f6",
      wickUpColor: "#f04452",
      wickDownColor: "#3182f6",
      borderVisible: false,
      priceFormat: { type: "price", precision: 0, minMove: 1 },
      lastValueVisible: true,
      priceLineVisible: true,
    });
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
      lastValueVisible: false,
      priceLineVisible: false,
    });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.76, bottom: 0 } });

    const onCrosshair = (param: MouseEventParams) => {
      const tooltip = tooltipRef.current;
      if (!tooltip || !param.point || param.time === undefined) {
        if (tooltip) tooltip.hidden = true;
        return;
      }
      const data = param.seriesData.get(candleSeries);
      if (!data || !("open" in data)) {
        tooltip.hidden = true;
        return;
      }
      tooltip.hidden = false;
      tooltip.textContent = `시 ${won.format(data.open)}  고 ${won.format(data.high)}\n저 ${won.format(data.low)}  종 ${won.format(data.close)}`;
      const left = Math.min(Math.max(param.point.x + 14, 8), Math.max(8, mount.clientWidth - 230));
      const top = Math.min(Math.max(param.point.y - 18, 8), Math.max(8, mount.clientHeight - 64));
      tooltip.style.transform = `translate(${left}px, ${top}px)`;
    };
    chart.subscribeCrosshairMove(onCrosshair);

    const resize = new ResizeObserver(([entry]) => {
      chart.resize(Math.floor(entry.contentRect.width), Math.floor(entry.contentRect.height));
    });
    resize.observe(mount);

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    return () => {
      resize.disconnect();
      chart.unsubscribeCrosshairMove(onCrosshair);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [item.symbol, hasData]);

  useEffect(() => {
    const candles: CandlestickData<UTCTimestamp>[] = visibleCandles.map((candle) => ({
      time: candle.time as UTCTimestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));
    const volumes: HistogramData<UTCTimestamp>[] = visibleCandles.map((candle) => ({
      time: candle.time as UTCTimestamp,
      value: candle.volume,
      color: candle.close >= candle.open ? "rgba(240,68,82,0.38)" : "rgba(49,130,246,0.38)",
    }));
    candleSeriesRef.current?.setData(candles);
    volumeSeriesRef.current?.setData(volumes);
    if (candles.length) chartRef.current?.timeScale().fitContent();
  }, [visibleCandles]);

  return (
    <div className="stock-chart">
      <div className="chart-toolbar">
        <div className="chart-periods" aria-label="차트 기간">
          {(["1H", "3H", "1D"] as Period[]).map((value) => (
            <button key={value} type="button" className={period === value ? "active" : ""}
              aria-pressed={period === value} onClick={() => setPeriod(value)}>
              {value === "1H" ? "1시간" : value === "3H" ? "3시간" : "1일"}
            </button>
          ))}
        </div>
        <span>1분봉 · 거래량</span>
      </div>

      {latest ? <>
        <dl className="chart-ohlc" id={`chart-summary-${item.symbol}`}>
          <div><dt>시가</dt><dd>{won.format(latest.open)}</dd></div>
          <div><dt>고가</dt><dd>{won.format(latest.high)}</dd></div>
          <div><dt>저가</dt><dd>{won.format(latest.low)}</dd></div>
          <div><dt>종가</dt><dd>{won.format(latest.close)}</dd></div>
          <div><dt>거래량</dt><dd>{compact.format(latest.volume)}</dd></div>
        </dl>
        <div className="chart-stage" role="img" aria-label={`${item.name} 1분봉 캔들 및 거래량 차트`}
          aria-describedby={`chart-summary-${item.symbol}`}>
          <div className="chart-canvas" ref={mountRef} />
          <div className="chart-tooltip" ref={tooltipRef} hidden />
        </div>
        <a className="chart-attribution" href="https://www.tradingview.com/" target="_blank" rel="noreferrer">Charts by TradingView</a>
      </> : <div className="chart-empty"><strong>{loading ? "1분봉 불러오는 중" : "차트 데이터 없음"}</strong><span>{loading ? "실제 시세를 확인하고 있습니다." : "잠시 후 다시 확인해 주세요."}</span></div>}
    </div>
  );
}
