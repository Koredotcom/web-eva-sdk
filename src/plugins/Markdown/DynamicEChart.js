import * as echarts from 'echarts';

export function buildEChartOptions(spec = {}) {
  const type = spec.type || 'line';
  const title = spec.title;
  const data = Array.isArray(spec.data) ? spec.data : [];
  const xKey = spec.xKey;
  const yKey = spec.yKey;
  const series = Array.isArray(spec.series) ? spec.series : [];
  const seriesKey = spec.seriesKey;

  const xData = xKey ? [...new Set(data.map(item => item?.[xKey]))] : [];

  let seriesData = [];

  const colors = ['#2970FF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

  if (Array.isArray(series) && series.length > 0) {
    seriesData = series.map((s, idx) => ({
      name: s.name,
      type: type === 'area' ? 'line' : type,
      data: xData.map(x => {
        const point = data.find(d => d?.[xKey] === x);
        return point && s.key in point ? point[s.key] : 0;
      }),
      areaStyle: type === 'area' ? { opacity: 0.1 } : undefined,
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      itemStyle: {
        color: colors[idx % colors.length]
      },
      lineStyle: {
        width: 3
      }
    }));
  } else if (seriesKey) {
    const groupedData = data.reduce((acc, item) => {
      const key = item?.[seriesKey];
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    seriesData = Object.entries(groupedData).map(([name, group], idx) => ({
      name,
      type: type === 'area' ? 'line' : type,
      data: xData.map(x => {
        const found = group.find(i => i?.[xKey] === x);
        return found && yKey in found ? found[yKey] : 0;
      }),
      areaStyle: type === 'area' ? { opacity: 0.1 } : undefined,
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      itemStyle: {
        color: colors[idx % colors.length]
      },
      lineStyle: {
        width: 3
      }
    }));
  }

  const hasTitle = !!title;
  const legendShow = type === 'pie' ? true : (Array.isArray(seriesData) && seriesData.length > 1);
  const legend = legendShow ? {
    top: hasTitle ? 40 : 10,
    left: 'center',
    data: seriesData.map(s => s.name),
    icon: 'circle',
    textStyle: { color: '#71717A', fontSize: 12 }
  } : undefined;
  const gridTop = type === 'pie' ? undefined : (hasTitle && legendShow ? 90 : (hasTitle || legendShow ? 70 : 40));

  return {
    color: colors,
    title: title ? {
      text: title,
      top: 10,
      left: 0,
      textStyle: {
        color: '#18181B',
        fontSize: 16,
        fontWeight: 600,
        fontFamily: 'Inter'
      }
    } : undefined,
    tooltip: {
      trigger: type === 'pie' ? 'item' : 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#E4E4E7',
      textStyle: { color: '#18181B' },
      extraCssText: 'box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border-radius: 8px;'
    },
    legend,
    xAxis:
      type === 'pie'
        ? undefined
        : {
          type: 'category',
          data: xData,
          boundaryGap: type === 'bar',
          axisLine: { lineStyle: { color: '#E4E4E7' } },
          axisLabel: { color: '#71717A', fontSize: 11, margin: 12 }
        },
    yAxis:
      type === 'pie'
        ? undefined
        : {
          type: 'value',
          splitLine: { lineStyle: { type: 'dashed', color: '#F4F4F5' } },
          axisLabel: { color: '#71717A', fontSize: 11 }
        },
    grid: type === 'pie' ? undefined : {
      top: gridTop,
      left: 10,
      right: 10,
      bottom: 20,
      containLabel: true
    },
    series:
      type === 'pie'
        ? [
          {
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: true,
            itemStyle: {
              borderRadius: 8,
              borderColor: '#fff',
              borderWidth: 2
            },
            label: { show: false, position: 'center' },
            emphasis: {
              label: { show: true, fontSize: 16, fontWeight: 'bold' }
            },
            data: data.map(item => ({
              name: xKey ? item?.[xKey] : '',
              value: yKey ? item?.[yKey] : 0,
            })),
          },
        ]
        : seriesData,
  };
}

export function renderEChart(container, option, theme = 'light') {
  if (!container) return null;
  try {
    if (container.__echartsInstance) {
      container.__echartsInstance.dispose();
      container.__echartsInstance = null;
    }
  } catch (_) { }

  const instance = echarts.init(container, theme);
  instance.setOption(option || {});
  container.__echartsInstance = instance;
  return instance;
}

export default { buildEChartOptions, renderEChart };
