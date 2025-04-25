import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import "./charts.css"; // Custom styles

const MultiLineChart = ({ data }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef();
  const rightChartRef = useRef();
  const [containerWidth, setContainerWidth] = useState(1000);
  const [brushedData, setBrushedData] = useState([]);
  const [selectedRange, setSelectedRange] = useState([null, null]);
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedMonth, setSelectedMonth] = useState("All");
  const [selectedDay, setSelectedDay] = useState("All");
  const [yearOptions, setYearOptions] = useState([]);
  const [monthOptions, setMonthOptions] = useState([]);
  const [dayOptions, setDayOptions] = useState([]);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (!entries || !entries.length) return;
      const { width } = entries[0].contentRect;
      setContainerWidth(width);
    });
    if (chartContainerRef.current) {
      observer.observe(chartContainerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!data.length) return;

    // Enrich data and replace negative values with zero
    const pollutants = ["CO(GT)", "C6H6(GT)", "NMHC(GT)", "NOx(GT)", "NO2(GT)", "PT08.S5(O3)"];
    const enrichedData = data.map(entry => {
      const [month, day, year] = entry.Date.split("/").map(Number);
      const cleanedEntry = { ...entry, year, month, day };
      pollutants.forEach(p => {
        cleanedEntry[p] = Math.max(0, parseFloat(entry[p]) || 0);
      });
      cleanedEntry["T"] = Math.max(0, parseFloat(entry["T"]) || 0);
      cleanedEntry["AH"] = Math.max(0, parseFloat(entry["AH"]) || 0);
      return cleanedEntry;
    });

    // Populate dropdown options
    const years = [...new Set(enrichedData.map(d => d.year))].sort();
    const months = [...new Set(enrichedData.map(d => d.month))].sort((a, b) => a - b);
    const days = [...new Set(enrichedData.map(d => d.day))].sort((a, b) => a - b);
    setYearOptions(["All", ...years]);
    setMonthOptions(["All", ...months]);
    setDayOptions(["All", ...days]);

    // Filter data based on dropdown selections
    const filteredData = enrichedData.filter(d => {
      return (
        (selectedYear === "All" || d.year === parseInt(selectedYear)) &&
        (selectedMonth === "All" || d.month === parseInt(selectedMonth)) &&
        (selectedDay === "All" || d.day === parseInt(selectedDay))
      );
    });

    // Left Chart: Pollutants Over Time
    const colors = d3.scaleOrdinal(d3.schemeCategory10).domain(pollutants);

    const dailyAvgData = {};
    filteredData.forEach(entry => {
      const date = entry.Date;
      if (!dailyAvgData[date]) {
        dailyAvgData[date] = { 
          Date: new Date(date), 
          count: 0, 
          year: entry.year, 
          month: entry.month, 
          day: entry.day 
        };
        pollutants.forEach(p => dailyAvgData[date][p] = 0);
      }
      pollutants.forEach(p => {
        dailyAvgData[date][p] += entry[p];
      });
      dailyAvgData[date].count++;
    });

    const parsedData = Object.values(dailyAvgData).map(d => {
      const avg = { 
        Date: d.Date, 
        year: d.year, 
        month: d.month, 
        day: d.day 
      };
      pollutants.forEach(p => {
        avg[p] = d.count > 0 ? d[p] / d.count : 0;
      });
      return avg;
    }).sort((a, b) => a.Date - b.Date); // Sort by date to ensure chronological order

    const margin = { top: 40, right: 30, bottom: 80, left: 60 }; // Increased bottom margin for rotated labels
    const width = containerWidth / 2 - margin.left - margin.right - 20;
    const height = 400;

    const svg = d3.select(chartRef.current);
    svg.selectAll("*").remove();

    const g = svg
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
      .domain(parsedData.length ? d3.extent(parsedData, d => d.Date) : [new Date(), new Date()])
      .range([0, width])
      .nice(); // Ensure full date range is covered

    const y = d3.scaleLinear()
      .domain([0, parsedData.length ? d3.max(parsedData, d => d3.max(pollutants, p => d[p])) : 1])
      .nice()
      .range([height - margin.top - margin.bottom, 0]);

    g.append("g")
      .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
      .call(
        d3.axisBottom(x)
          .ticks(d3.timeMonth.every(1)) // Show monthly ticks
          .tickFormat(d3.timeFormat("%b %Y")) // Format as "Month Year"
      )
      .attr("class", "axis")
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-0.8em")
      .attr("dy", "0.15em")
      .attr("transform", "rotate(-45)"); // Rotate labels to prevent overlap

    g.append("g")
      .call(d3.axisLeft(y))
      .attr("class", "axis");

    const line = d3.line()
      .x(d => x(d.Date))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    pollutants.forEach((pollutant) => {
      const lineData = parsedData.map(d => ({ Date: d.Date, value: d[pollutant] }));
      g.append("path")
        .datum(lineData)
        .attr("fill", "none")
        .attr("stroke", colors(pollutant))
        .attr("stroke-width", 1.5)
        .attr("d", line);
    });

    const brush = d3.brush()
      .extent([[0, 0], [width, height - margin.top - margin.bottom]])
      .on("end", (event) => {
        if (!event.selection) {
          setBrushedData([]);
          setSelectedRange([null, null]);
          return;
        }

        const [[x0], [x1]] = event.selection;
        const xStart = x.invert(x0), xEnd = x.invert(x1);

        const activePollutants = new Set();
        const filtered = parsedData.filter(d => {
          const withinX = d.Date >= xStart && d.Date <= xEnd;
          if (!withinX) return false;
          let active = false;
          for (const p of pollutants) {
            if (d[p] >= 0 && !isNaN(d[p])) {
              activePollutants.add(p);
              active = true;
            }
          }
          return active;
        });

        setBrushedData({ rows: filtered, columns: [...activePollutants] });
        setSelectedRange([xStart, xEnd]);
      });

    g.append("g")
      .call(brush)
      .selectAll(".selection")
      .attr("stroke", "#333")
      .attr("fill", "#00bcd4")
      .attr("fill-opacity", 0.2);

  }, [data, containerWidth, selectedYear, selectedMonth, selectedDay]);

  useEffect(() => {
    if (!data.length || !rightChartRef.current) return;

    const margin = { top: 40, right: 30, bottom: 50, left: 60 };
    const width = containerWidth / 2 - margin.left - margin.right - 20;
    const height = 400;

    const svg = d3.select(rightChartRef.current);
    svg.selectAll("*").remove();

    const g = svg
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Enrich and filter data
    const enrichedData = data.map(entry => {
      const [month, day, year] = entry.Date.split("/").map(Number);
      return {
        ...entry,
        year,
        month,
        day,
        T: Math.max(0, parseFloat(entry["T"]) || 0),
        AH: Math.max(0, parseFloat(entry["AH"]) || 0),
      };
    });

    const filteredData = enrichedData.filter(d => {
      return (
        (selectedYear === "All" || d.year === parseInt(selectedYear)) &&
        (selectedMonth === "All" || d.month === parseInt(selectedMonth)) &&
        (selectedDay === "All" || d.day === parseInt(selectedDay))
      );
    });

    const daily = {};
    filteredData.forEach(entry => {
      const date = new Date(entry.Date);
      if (!daily[+date]) {
        daily[+date] = { 
          Date: date, 
          T: 0, 
          AH: 0, 
          count: 0, 
          year: entry.year, 
          month: entry.month, 
          day: entry.day 
        };
      }
      daily[+date].T += entry.T;
      daily[+date].AH += entry.AH;
      daily[+date].count++;
    });

    const avgData = Object.values(daily).map(d => ({
      Date: d.Date,
      T: d.count > 0 ? d.T / d.count : 0,
      AH: d.count > 0 ? d.AH / d.count : 0,
      year: d.year,
      month: d.month,
      day: d.day,
    }));

    const x = d3.scaleLinear()
      .domain(avgData.length ? d3.extent(avgData, d => d.T) : [0, 1])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain(avgData.length ? [0, d3.max(avgData, d => d.AH)] : [0, 1])
      .nice()
      .range([height - margin.top - margin.bottom, 0]);

    g.append("g")
      .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(x).tickFormat(d3.format(".2f")))
      .attr("class", "axis");

    g.append("g")
      .call(d3.axisLeft(y))
      .attr("class", "axis");

    const line = d3.line()
      .x(d => x(d.T))
      .y(d => y(d.AH))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(avgData)
      .attr("fill", "none")
      .attr("stroke", "tomato")
      .attr("stroke-width", 2)
      .attr("d", line);

    g.selectAll(".dot")
      .data(avgData)
      .enter()
      .append("circle")
      .attr("cx", d => x(d.T))
      .attr("cy", d => y(d.AH))
      .attr("r", 2)
      .attr("fill", "darkred");

  }, [data, containerWidth, selectedYear, selectedMonth, selectedDay]);

  return (
    <div ref={chartContainerRef} style={{ width: "100%", display: "flex", gap: "20px" }}>
      {/* Left Chart */}
      <div style={{ flex: 1 }}>
        <h3 style={{ textAlign: "center" }}>Pollutant Trends Overview</h3>
        <div className="dropdown-container">
          <select
            className="dropdown"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <select
            className="dropdown"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {monthOptions.map((month) => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
          <select
            className="dropdown"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
          >
            {dayOptions.map((day) => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </div>
        <svg ref={chartRef} style={{ width: "100%", height: "480px" }}></svg>

        <div className="table-container">
          <h4>
            {selectedRange[0] &&
              (`From ${selectedRange[0].toLocaleDateString()} to ${selectedRange[1].toLocaleDateString()}`)}
          </h4>
          {brushedData.rows && (
            <table className="styled-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Year</th>
                  <th>Month</th>
                  <th>Day</th>
                  {brushedData.columns.map((p) => (
                    <th key={p}>{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {brushedData.rows.length === 0 ? (
                  <tr>
                    <td colSpan={brushedData.columns.length + 4}>
                      No data selected. Brush to view values.
                    </td>
                  </tr>
                ) : (
                  brushedData.rows.map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.Date.toLocaleDateString()}</td>
                      <td>{row.year}</td>
                      <td>{row.month}</td>
                      <td>{row.day}</td>
                      {brushedData.columns.map((p) => (
                        <td key={p}>{row[p].toFixed(2)}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right Chart: Temperature vs Humidity */}
      <div style={{ flex: 1 }}>
        <h3>Temperature vs Humidity</h3>
        <svg ref={rightChartRef} style={{ width: "100%", height: "450px" }}></svg>
      </div>
    </div>
  );
};

export default MultiLineChart;