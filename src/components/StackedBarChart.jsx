import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import "./Charts.css";

const StackedBarChart = ({ data }) => {
  const chartRef = useRef();
  const [selectedMonth, setSelectedMonth] = useState("");

  useEffect(() => {
    if (!data.length) return;

    // Extract unique months from the dataset
    const monthYearFormat = (date) => new Date(date).toLocaleString("default", { month: "short", year: "numeric" });
    const uniqueMonths = [...new Set(data.map(d => monthYearFormat(d.Date)))].sort();

    if (!selectedMonth) setSelectedMonth(uniqueMonths[0]); // Default to the first available month

    const filteredData = data.filter(d => monthYearFormat(d.Date) === selectedMonth);

    const svg = d3.select(chartRef.current);
    svg.selectAll("*").remove();

    const pollutants = ["CO(GT)", "C6H6(GT)", "NMHC(GT)", "NOx(GT)", "NO2(GT)", "PT08.S5(O3)"];
    const colors = d3.scaleOrdinal(d3.schemeCategory10).domain(pollutants);

    const margin = { top: 40, right: 30, bottom: 50, left: 60 };
    const width = 900 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const x = d3.scaleBand().domain(filteredData.map(d => d.Date)).range([0, width]).padding(0.2);
    const y = d3.scaleLinear().domain([0, d3.max(filteredData, d => d3.sum(pollutants, p => +d[p] || 0))]).nice().range([height, 0]);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d => new Date(d).getDate()));
    g.append("g").call(d3.axisLeft(y));

    const stack = d3.stack().keys(pollutants);
    const series = stack(filteredData);

    g.selectAll(".layer")
      .data(series)
      .enter()
      .append("g")
      .attr("fill", d => colors(d.key))
      .selectAll("rect")
      .data(d => d)
      .enter()
      .append("rect")
      .attr("x", d => x(d.data.Date))
      .attr("y", d => y(d[1]))
      .attr("height", d => y(d[0]) - y(d[1]))
      .attr("width", x.bandwidth());

  }, [data, selectedMonth]);

  return (
    <div>
      <label>Select Month: </label>
      <select onChange={e => setSelectedMonth(e.target.value)} value={selectedMonth}>
        {data.length > 0 &&
          [...new Set(data.map(d => new Date(d.Date).toLocaleString("default", { month: "short", year: "numeric" })))].sort().map(month => (
            <option key={month} value={month}>{month}</option>
          ))
        }
      </select>
      <svg ref={chartRef} width={900} height={400}></svg>
    </div>
  );
};

export default StackedBarChart;
