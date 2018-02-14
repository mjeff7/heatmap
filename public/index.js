'use strict';

const SOURCE_DATA_URL = 'https://raw.githubusercontent.com/FreeCodeCamp/ProjectReferenceData/master/global-temperature.json';

d3.json(SOURCE_DATA_URL, result => buildPlotWithData(result));

function normalizeResult(result) {
  const base = result.baseTemperature;
  
  return result.monthlyVariance.map(d => ({
    month: d.month,
    year: d.year,
    temperature: base + d.variance
  }));
}

function fillRange(low, high) {
  let result = [];
  for(let i = low; i <= high; i++)
    result.push(i);
  
  return result;
}

function monthFormatter(monthIndex) {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthIndex - 1];
}

function buildPlotWithData(result) {
  const config = {
    svgSize: {width: 800, height: 500},
    margin: {top: 80, left: 90, bottom: 70, right: 20},
    plotSize: {},
    formatters: {month: monthFormatter, year: null},
    xData: 'year',
    yData: 'month',
    zData: 'temperature',
    axisLabels: {month: 'Month', year: 'Year'},
    axisFilters: {year: d => d % 20 === 0, month: () => true},
    title: 'Temperatures by month'
  };
  
  config.plotSize.width = config.svgSize.width - config.margin.left - config.margin.right;
  config.plotSize.height = config.svgSize.height - config.margin.top - config.margin.bottom;
  
  const data = normalizeResult(result);
  
  const plotSVG = d3.select('#plotTarget').attr('width', config.svgSize.width).attr('height', config.svgSize.height),
        plotElement = plotSVG.insert('g').attr('transform', `translate(${config.margin.left}, ${config.margin.top})`),
        rectangleGroup = plotElement.insert('g').attr('shape-rendering', 'crispEdges'),
        xView = d => d[config.xData],
        yView = d => d[config.yData],
        zView = d => d[config.zData],
        xScale = d3.scale.ordinal().rangeBands([0, config.plotSize.width]),
        yScale = d3.scale.ordinal().rangeBands([0, config.plotSize.height]),
        //zScale = d3.scale.linear().range(['blue', 'red']),
        zScale = d3_scale.scalePlasma(),
        x = d => xScale(xView(d)),
        y = d => yScale(yView(d)),
        z = d => zScale(zView(d)),
        xAxisG = plotElement.insert('g').attr('transform', `translate(0, ${config.plotSize.height})`),
        yAxisG = plotElement.insert('g'),
        xAxisF = d3.svg.axis().orient('bottom').scale(xScale).tickFormat(config.formatters[config.xData])
                                                             .tickSize(6, 1),
        yAxisF = d3.svg.axis().orient('left').scale(yScale).tickFormat(config.formatters[config.yData])
                                                           .tickSize(6, 1),
        tip = {
          div: d3.select('body').insert('div').attr('class', 'tooltip'),
          show: d => {
            const fieldRect = rectangleGroup[0][0].getBoundingClientRect(),
                  top = document.body.scrollTop + fieldRect.top + y(d) + yScale.rangeBand(),
                  center = document.body.scrollLeft + fieldRect.left + x(d) + xScale.rangeBand();
            tip.div.html(`${d.year} ${config.formatters.month(d.month)}:<br>${d.temperature.toFixed(1)}°`);
            if(tip.div.style('opacity') == 0)
              tip.div.style('top', top + 'px')
                     .style('left', center + 'px');
            tip.div.transition().duration(50)
                   .style('top', top + 'px')
                   .style('left', center + 'px')
                   .style('opacity', '0.8');
          },
          hide: e => tip.div.transition().duration(500).style('opacity', '0')
        };
  
  
  plotSVG.insert('text').attr('class', 'plotTitle').attr('text-anchor', 'middle')
         .attr('x', config.svgSize.width / 2)
         .attr('y', config.margin.top / 2).attr('dy', '0.35em')
         .text(config.title);
  xAxisG.insert('text')
        .attr('text-anchor', 'middle')
        .attr('y', '3em').attr('dy', '0.35em')
        .attr('x', config.plotSize.width / 2)
        .text(config.axisLabels[config.xData]);
  yAxisG.insert('text').attr('transform', 'rotate(-90)')
        .attr('text-anchor', 'middle')
        .attr('y', '-4em').attr('dy', '0.35em')
        .attr('x', -config.plotSize.height / 2)
        .text(config.axisLabels[config.yData]);
  
  
  
  xScale.domain(fillRange(...d3.extent(data, xView)));
  yScale.domain(fillRange(...d3.extent(data, yView)));
  zScale.domain(d3.extent(data, zView));
  
  xAxisF.tickValues(data.map(xView).filter(config.axisFilters[config.xData]));
  yAxisF.tickValues(data.map(yView).filter(config.axisFilters[config.yData]));
  xAxisG.call(xAxisF);
  yAxisG.call(yAxisF);
  
  const boundData = rectangleGroup.selectAll('rect').data(data);
  
  boundData.enter().insert('rect');
  
  boundData.attr('x', x)
           .attr('y', y)
           .attr('width', xScale.rangeBand())
           .attr('height', yScale.rangeBand())
           .attr('fill', z)
           .on('mouseover', tip.show)
           .on('mouseout', tip.hide);
}