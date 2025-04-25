import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useLocation, useNavigate } from "react-router-dom";

const StackedBarChartPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { file, fileName } = location.state || {}; 
  const svgRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const [selectedMonthYear, setSelectedMonthYear] = useState("2004-06"); // Default to June 2004
  const [monthYears, setMonthYears] = useState([]);

  const columns = ["PT08.S1(CO)", "PT08.S2(NMHC)", "PT08.S3(NOx)", "PT08.S4(NO2)", "PT08.S5(O3)"];
  const colorScale = d3.scaleOrdinal()
    .domain(columns)
    .range(d3.schemeCategory10);

  useEffect(() => {
    if (!file) {
      alert("No CSV file selected. Please upload a CSV file first.");
      navigate("/");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const data = d3.csvParse(text);

        if (data.length === 0) {
          alert("Error: The uploaded file is empty or invalid.");
          navigate("/");
          return;
        }

        const parseDate = d3.timeParse("%m/%d/%Y");
        data.forEach(d => {
          d.date = parseDate(d.Date);
          columns.forEach(col => {
            const val = +d[col];
            d[col] = val < 0 ? 0 : val;
          });
        });
        

        const uniqueMonthYears = Array.from(
          d3.group(data, d => d3.timeFormat("%Y-%m")(d.date)).keys()
        ).sort();
        setMonthYears(uniqueMonthYears);

        const byMonth = d3.group(data, d => d3.timeFormat("%Y-%m")(d.date));
        const filteredData = data.filter(
          d => d3.timeFormat("%Y-%m")(d.date) === selectedMonthYear
        );

        // Calculate weeks for the selected month
        const monthStart = d3.timeParse("%Y-%m")(selectedMonthYear);
        const monthEnd = d3.timeMonth.offset(monthStart, 1);
        const weeks = [];
        let currentDate = d3.timeWeek.floor(monthStart);
        
        while (currentDate < monthEnd) {
          weeks.push(new Date(currentDate));
          currentDate = d3.timeWeek.offset(currentDate, 1);
        }

        // Group data by these week starts
        const byWeek = new Map();
        weeks.forEach((weekStart, index) => {
          const weekEnd = d3.timeWeek.offset(weekStart, 1);
          const weekData = filteredData.filter(d => 
            d.date >= weekStart && d.date < weekEnd
          );
          byWeek.set(`Week ${index + 1}`, weekData);
        });

        const byDay = d3.group(filteredData, d => d3.timeFormat("%d")(d.date));
        const byDayOfWeek = d3.group(filteredData, d => d3.timeFormat("%A")(d.date));

        const aggData = [
          aggregateData(byMonth, "Month"),
          aggregateWeekData(byWeek),
          aggregateData(byDay, "Day"),
          aggregateData(byDayOfWeek, "Day of Week")
        ];

        const width = 928;
        const height = 400;
        const marginTop = 20;
        const marginRight = 200;
        const marginBottom = 60;
        const marginLeft = 60;

        const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

        aggData.forEach((dataAgg, index) => {
          const svg = d3.select(svgRefs[index].current)
            .attr("viewBox", [0, 0, width, height])
            .attr("width", width)
            .attr("height", height)
            .attr("style", "max-width: 100%; height: auto;")
            .attr("class", "chart-bg-blur"); // Apply the custom class for blur effect

          svg.selectAll("*").remove();

          const xDomain = index === 3 ? dayOrder : dataAgg.map(d => d.key);
          const x = d3.scaleBand()
            .domain(xDomain)
            .range([marginLeft, width - marginRight])
            .padding(0.1);

          const stack = d3.stack()
            .keys(columns)
            .value((d, key) => d[key] || 0)
            .order(d3.stackOrderNone)
            .offset(d3.stackOffsetNone);

          const stackedData = stack(dataAgg);

          const yMin = d3.min(stackedData, layer => d3.min(layer, d => d[0]));
          const yMax = d3.max(stackedData, layer => d3.max(layer, d => d[1]));
          const y = d3.scaleLinear()
            .domain([Math.min(0, yMin), yMax]).nice()
            .range([height - marginBottom, marginTop]);

          svg.selectAll(".bar")
            .data(stackedData)
            .enter()
            .append("g")
            .attr("fill", d => colorScale(d.key))
            .selectAll("rect")
            .data(d => d)
            .enter()
            .append("rect")
            .attr("x", d => x(d.data.key))
            .attr("y", d => y(d[1]))
            .attr("height", d => y(d[0]) - y(d[1]))
            .attr("width", x.bandwidth());

          svg.append("g")
            .attr("transform", `translate(0,${height - marginBottom})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .attr("text-anchor", "end")
            .attr("dx", "-0.8em")
            .attr("dy", "0.15em")
            .style("fill", "#333");

          svg.append("g")
            .attr("transform", `translate(${marginLeft},0)`)
            .call(d3.axisLeft(y).ticks(null, "s"))
            .call(g => g.select(".domain").remove())
            .selectAll("text")
            .style("fill", "#333");

          const legend = svg.append("g")
            .attr("transform", `translate(${width - marginRight + 20},${marginTop})`);

          legend.selectAll("rect")
            .data(columns)
            .enter()
            .append("rect")
            .attr("x", 0)
            .attr("y", (d, i) => i * 20)
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", d => colorScale(d));

          legend.selectAll("text")
            .data(columns)
            .enter()
            .append("text")
            .attr("x", 20)
            .attr("y", (d, i) => i * 20 + 12)
            .attr("font-size", "12px")
            .style("fill", "#333")
            .text(d => d);
        });

      } catch (error) {
        alert("Error processing CSV file.");
        console.error("CSV Parsing Error:", error);
        navigate("/");
      }
    };
    reader.readAsText(file);
  }, [file, navigate, selectedMonthYear]);

  function aggregateData(groupedData, type) {
    if (type === "Day of Week") {
      const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      const aggMap = new Map();

      dayOrder.forEach(day => {
        aggMap.set(day, { key: day });
        columns.forEach(col => {
          aggMap.get(day)[col] = 0;
        });
      });

      groupedData.forEach((values, day) => {
        const agg = aggMap.get(day);
        columns.forEach(col => {
          agg[col] += d3.sum(values, d => d[col]);
        });
      });

      return dayOrder.map(day => aggMap.get(day));
    } else {
      return Array.from(groupedData, ([key, values]) => {
        const agg = { key };
        columns.forEach(col => {
          agg[col] = d3.sum(values, d => d[col]);
        });
        return agg;
      }).sort((a, b) => a.key.localeCompare(b.key));
    }
  }

  function aggregateWeekData(weekMap) {
    return Array.from(weekMap, ([key, values]) => {
      const agg = { key };
      columns.forEach(col => {
        agg[col] = d3.sum(values, d => d[col]);
      });
      return agg;
    });
  }

  const handleHomeClick = () => {
    navigate("/");
  };

  const handleMonthYearChange = (e) => {
    setSelectedMonthYear(e.target.value);
  };

  return (
    <div style={{ marginTop: '1000px', padding: '2rem' }}>
    <div className="p-5 bg-blue-50 min-h-screen relative">

      <h1 className="text-3xl font-extrabold text-white bg-blue-600 text-center px-4 py-2 inline-block rounded shadow">
        {file?.name? `Stacked Bar Charts for ${file.name}` : "Stacked Bar Charts"}
      </h1>
      
      <div>
        <h2 className="text-xl font-semibold mb-2 text-gray-700">By Months</h2>
        <svg ref={svgRefs[0]} className="chart-bg-blur"></svg>
      </div>

      <div className="mb-6 text-center">
        <label htmlFor="monthYear" className="mr-2 font-semibold text-gray-700">Select Month-Year:</label>
        <select
          id="monthYear"
          value={selectedMonthYear}
          onChange={handleMonthYearChange}
          className="p-2 border rounded"
        >
          {monthYears.map(my => (
            <option key={my} value={my}>
              {d3.timeFormat("%B %Y")(d3.timeParse("%Y-%m")(my))}
            </option>
          ))}
        </select>
      </div>
      
      <div>
        <h2 className="ext-xl font-semibold mb-2 mt-6 text-gray-700">By Weeks of {d3.timeFormat("%B %Y")(d3.timeParse("%Y-%m")(selectedMonthYear))}</h2>
        <svg ref={svgRefs[1]} className="chart-bg-blur"></svg>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2 mt-6">By Days of {d3.timeFormat("%B %Y")(d3.timeParse("%Y-%m")(selectedMonthYear))}</h2>
        <svg ref={svgRefs[2]} className="chart-bg-blur"></svg>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2 mt-6">By Day of Week of {d3.timeFormat("%B %Y")(d3.timeParse("%Y-%m")(selectedMonthYear))}</h2>
        <svg ref={svgRefs[3]} className="chart-bg-blur"></svg>
      </div>
    </div>
    </div>
  );
};

export default StackedBarChartPage;
