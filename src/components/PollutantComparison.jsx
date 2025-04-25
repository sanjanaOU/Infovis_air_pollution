import React, { useEffect, useState } from "react";
import * as d3 from "d3";
import { useLocation } from "react-router-dom";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./PollutantComparison.css";

const PollutantComparison = () => {
  const pollutantColors = {
   "CO(GT)": "#8dd3c7", // Red
  "C6H6(GT)": "#b15928", // Purple
  "NMHC(GT)": "#bebada", // Yellow
  "NO2(GT)": "#fb8072", // Green
  "PT08.S5(O3)": "#80b1d3", // Blue
  "NOx(GT)": "#fdb462" // Orange
  };

  const pollutantUnits = {
    "CO(GT)": "mg/m³",
    "C6H6(GT)": "µg/m³",
    "NMHC(GT)": "µg/m³",
    "NO2(GT)": "µg/m³",
    "PT08.S5(O3)": "units",
    "NOx(GT)": "ppb",
  };

  const months = [
    { key: "01", label: "January" },
    { key: "02", label: "February" },
    { key: "03", label: "March" },
    { key: "04", label: "April" },
    { key: "05", label: "May" },
    { key: "06", label: "June" },
    { key: "07", label: "July" },
    { key: "08", label: "August" },
    { key: "09", label: "September" },
    { key: "10", label: "October" },
    { key: "11", label: "November" },
    { key: "12", label: "December" },
  ];

  const years = ["2004", "2005"];

  const getDaysInMonth = (year, month) => {
    if (!year || !month) return [];
    const numDays = new Date(Number(year), Number(month), 0).getDate();
    return Array.from({ length: numDays }, (_, i) => (i + 1).toString().padStart(2, "0"));
  };

  const { state } = useLocation();
  const { file } = state || {};
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(["CO(GT)", "NOx(GT)"]);
  const [yearFilter, setYearFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [dayFilter, setDayFilter] = useState("");

  const pollutants = Object.keys(pollutantColors);

  useEffect(() => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result;
        const parsed = d3.csvParse(text, (d) => {
          const date = d3.timeParse("%d/%m/%Y")(d.Date);
          if (!date) return null;
          return {
            date: date.getTime(),
            year: date.getFullYear().toString(),
            month: (date.getMonth() + 1).toString().padStart(2, "0"),
            day: date.getDate().toString().padStart(2, "0"),
            ...pollutants.reduce((acc, p) => {
              const val = +d[p];
              acc[p] = val >= 0 ? val : null;
              return acc;
            }, {}),
          };
        });

        const cleaned = parsed.filter((d) => d && d.date);
        setData(cleaned);
      } catch (error) {
        console.error("CSV parse error:", error);
      }
    };
    reader.readAsText(file);
  }, [file]);

  const filteredData = data.filter((d) => {
    return (!yearFilter || d.year === yearFilter) &&
           (!monthFilter || d.month === monthFilter) &&
           (!dayFilter || d.day === dayFilter);
  });

  const getStatsData = () => {
    const stats = (key) => {
      const values = filteredData.map((d) => d[key]).filter((v) => v != null);
      return {
        min: d3.min(values) || 0,
        max: d3.max(values) || 0,
        avg: d3.mean(values) || 0,
      };
    };

    const stat1 = stats(selected[0]);
    const stat2 = stats(selected[1]);

    return [
      { name: "Min", [selected[0]]: stat1.min, [selected[1]]: stat2.min },
      { name: "Avg", [selected[0]]: stat1.avg, [selected[1]]: stat2.avg },
      { name: "Max", [selected[0]]: stat1.max, [selected[1]]: stat2.max },
    ];
  };

  const barData = getStatsData();

  return (
    <div className="pollutant-comparison-container">
      {/* Dropdown Filters */}
      <div className="pollutant-select-container">
        <div>
        <label>Pollutant 1: </label>
          <select
            value={selected[0]}
            onChange={(e) => setSelected([e.target.value, selected[1]])}
            className="pollutant-select"
          >
            {pollutants.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
        <label>Pollutant 2: </label>
          <select
            value={selected[1]}
            onChange={(e) => setSelected([selected[0], e.target.value])}
            className="pollutant-select"
          >
            {pollutants.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Year</label>
          <select
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(e.target.value);
              setMonthFilter("");
              setDayFilter("");
            }}
            className="pollutant-select"
          >
            <option value="">All Years</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
        <label>Month</label>
          <select
            value={monthFilter}
            onChange={(e) => {
              setMonthFilter(e.target.value);
              setDayFilter("");
            }}
            disabled={!yearFilter}
            className="pollutant-select"
          >
            <option value="">All Months</option>
            {months.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
        <label>Day</label>
          <select
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value)}
            disabled={!monthFilter}
            className="pollutant-select"
          >
            <option value="">All Days</option>
            {getDaysInMonth(yearFilter, monthFilter).map((d) => (
              <option key={d} value={d}>{parseInt(d)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Charts Section */}
      <div className="pollutant-charts-container">
        {[0, 1].map((i) => (
          <div key={i} className="pollutant-chart-card">
            <h4>{`Pollutant ${i + 1}`}</h4>
            <h5 style={{ fontSize: "1rem", color: "#4a5568", marginTop: "-0.5rem", marginBottom: "1rem", textAlign: "center" }}>
              {selected[i]}
            </h5>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(ts) => d3.timeFormat("%d/%m/%Y")(new Date(ts))}
                />
                <YAxis
                  label={{
                    value: `Concentration (${pollutantUnits[selected[i]]})`,
                    angle: -90,
                    position: "insideLeft",
                    fill: "#4a5568",
                  }}
                />
                <Tooltip
                  formatter={(val) => [val?.toFixed?.(2) ?? val, selected[i]]}
                  labelFormatter={(ts) => d3.timeFormat("%d/%m/%Y")(new Date(ts))}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={selected[i]}
                  stroke={pollutantColors[selected[i]]}
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      {/* Statistical Comparison */}
      <h4 style={{ marginLeft: "1rem" }}>Statistical Comparison</h4>
      <div className="pollutant-charts-container">
        <div className="pollutant-chart-card pollutant-bar-chart">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={selected[0]} fill={pollutantColors[selected[0]]} />
              <Bar dataKey={selected[1]} fill={pollutantColors[selected[1]]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="pollutant-chart-card pollutant-area-chart">
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(ts) => d3.timeFormat("%d/%m/%Y")(new Date(ts))}
              />
              <YAxis />
              <Tooltip
                formatter={(val, name) => [val?.toFixed?.(2) ?? val, name]}
                labelFormatter={(ts) => d3.timeFormat("%d/%m/%Y")(new Date(ts))}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey={selected[0]}
                stackId="1"
                stroke={pollutantColors[selected[0]]}
                fill={pollutantColors[selected[0]]}
              />
              <Area
                type="monotone"
                dataKey={selected[1]}
                stackId="1"
                stroke={pollutantColors[selected[1]]}
                fill={pollutantColors[selected[1]]}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default PollutantComparison;
