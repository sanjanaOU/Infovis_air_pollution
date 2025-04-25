import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { useLocation, useNavigate } from "react-router-dom";

const ZoomableChartPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { file, fileName } = location.state || {}; 
  const containerRef = useRef(null);

  const columns = [
    "CO(GT)", "PT08.S1(CO)", "NMHC(GT)", "C6H6(GT)", "PT08.S2(NMHC)",
    "NOx(GT)", "PT08.S3(NOx)", "NO2(GT)", "PT08.S4(NO2)", "PT08.S5(O3)",
    "T", "RH", "AH"
  ];

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

        const parsedData = data.map((d, index) => {
          const date = d3.timeParse("%m/%d/%Y")(d.Date);
          if (!date) {
            console.warn(`⚠️ Row ${index}: Invalid date: ${d.Date}`);
            return null;
          }

          const rowData = { 
            date,
            dayOfWeek: d3.timeFormat("%A")(date),
            monthYear: d3.timeFormat("%B %Y")(date)
          };
          columns.forEach(key => {
            const value = d[key]?.trim();
            if (!value || value === "") {
              console.log(`ℹ️ Row ${index}: Junk value (empty) for ${key}`);
              rowData[key] = 0;
            } else if (/^-?\d+(\.\d+)?$/.test(value)) {
              const numValue = parseFloat(value);
              rowData[key] = (numValue >= -500 && numValue <= 50000) ? Math.max(0, numValue) : 0;
              if (numValue < -500 || numValue > 50000) {
                console.warn(`⚠️ Row ${index}: Skipping out-of-range value for ${key}: ${numValue}`);
              }
            } else {
              console.warn(`⚠️ Row ${index}: Skipping non-numeric value for ${key}: ${value}`);
              rowData[key] = 0;
            }
          });

          return rowData;
        }).filter(d => d !== null);

        if (parsedData.length === 0) {
          console.error("No valid data to display.");
          return;
        }

        const width = 928;
        const height = 300;
        const marginTop = 40;
        const marginRight = 20;
        const marginBottom = 60;
        const marginLeft = 40;

        const container = d3.select(containerRef.current);
        container.selectAll("*").remove();

        columns.forEach((column, index) => {
          const svg = container.append("svg")
            .attr("width", width)
            .attr("height", height)
            .style("max-width", "100%")
            .style("height", "auto")
            .style("margin-bottom", "20px")
            .style("background", "rgba(255, 255, 255, 0.6)")
            .style("backdrop-filter", "blur(8px)")
            .style("-webkit-backdrop-filter", "blur(8px)")
            .style("border-radius", "16px")
            .style("box-shadow", "0 4px 16px rgba(0, 0, 0, 0.1)");


          svg.append("text")
            .attr("x", width / 2)
            .attr("y", marginTop / 2)
            .attr("text-anchor", "middle")
            .attr("font-size", "16px")
            .attr("font-weight", "bold")
            .text(column)
            .style("fill", "#222"); 

          const x = d3.scaleUtc()
            .domain(d3.extent(parsedData, d => d.date))
            .range([marginLeft, width - marginRight]);

          const yMin = d3.min(parsedData, d => d[column]);
          const yMax = d3.max(parsedData, d => d[column]);
          const y = d3.scaleLinear()
            .domain([Math.min(0, yMin), yMax]).nice()
            .range([height - marginBottom, marginTop]);

          const area = (data, x) => d3.area()
            .curve(d3.curveStepAfter)
            .x(d => x(d.date))
            .y0(y(0))
            .y1(d => y(d[column]))
            (data);

          const zoom = d3.zoom()
            .scaleExtent([1, 32])
            .extent([[marginLeft, 0], [width - marginRight, height]])
            .translateExtent([[marginLeft, -Infinity], [width - marginRight, Infinity]])
            .on("zoom", zoomed);

          const clipId = `clip-${column}-${Math.random().toString(36).substr(2, 9)}`;
          svg.append("clipPath")
            .attr("id", clipId)
            .append("rect")
            .attr("x", marginLeft)
            .attr("y", marginTop)
            .attr("width", width - marginLeft - marginRight)
            .attr("height", height - marginTop - marginBottom);

          const path = svg.append("path")
            .attr("clip-path", `url(#${clipId})`)
            .attr("fill", colorScale(column))
            .attr("d", area(parsedData, x));

          const gx = svg.append("g")
            .attr("transform", `translate(0,${height - marginBottom})`);

          const monthYearLabels = svg.append("g")
            .attr("transform", `translate(0,${height - marginBottom + 35})`)
            .attr("font-size", "10px")
            .attr("text-anchor", "middle");

          svg.append("g")
            .attr("transform", `translate(${marginLeft},0)`)
            .call(d3.axisLeft(y).ticks(null, "s"))
            .call(g => g.select(".domain").remove())
            .call(g => g.select(".tick:last-of-type text").clone()
              .attr("x", 3)
              .attr("text-anchor", "start")
              .attr("font-weight", "bold")
              .text(column));

            svg.selectAll("g.tick text")
              .style("fill", "#333");  // 👈 Y-axis label fix
            

          function updateXAxis(xScale) {
            const domainWidth = xScale.domain()[1] - xScale.domain()[0];
            const days = domainWidth / (1000 * 60 * 60 * 24);
            let tickFormat;
            let tickValues;

            if (days > 365) {
              tickFormat = d3.timeFormat("%Y");
              tickValues = d3.timeYear.every(1).range(xScale.domain()[0], xScale.domain()[1]);
            } else if (days > 30) {
              tickFormat = d3.timeFormat("%b %Y");
              tickValues = d3.timeMonth.every(1).range(xScale.domain()[0], xScale.domain()[1]);
            } else {
              // Show all days with day of week when zoomed in to a week or less
              tickFormat = d3.timeFormat("%A %m/%d/%Y"); // Day of week + full date
              tickValues = d3.timeDay.every(1).range(xScale.domain()[0], xScale.domain()[1]);
            }

            // Adjust tick count to prevent overlap
            const tickPixelWidth = (width - marginLeft - marginRight) / tickValues.length;
            const minPixelWidth = 100; // Increased for longer labels (day + date)
            if (tickPixelWidth < minPixelWidth && days <= 30) {
              const newTickCount = Math.max(1, Math.floor((width - marginLeft - marginRight) / minPixelWidth));
              const step = Math.ceil(tickValues.length / newTickCount);
              tickValues = tickValues.filter((d, i) => i % step === 0);
            }

            gx.call(d3.axisBottom(xScale)
              .tickValues(tickValues)
              .tickFormat(tickFormat))
              .selectAll(".tick text")
              .attr("transform", "rotate(-45)")
              .attr("text-anchor", "end")
              .attr("dx", "-0.8em")
              .attr("dy", "0.15em")
              .style("fill", "#333");

            // Update month-year labels
            monthYearLabels.selectAll("text").remove();
            if (days <= 365) {
              monthYearLabels.selectAll("text")
                .data(tickValues)
                .enter()
                .append("text")
                .attr("x", d => xScale(d))
                .attr("y", 0)
                .text(d => d3.timeFormat("%B %Y")(d))
                .attr("fill", "darkgray");
            }
          }

          function zoomed(event) {
            const xz = event.transform.rescaleX(x);
            path.attr("d", area(parsedData, xz));
            updateXAxis(xz);
          }

          svg.call(zoom)
            .transition()
            .duration(750)
            .call(zoom.scaleTo, 4, [x(new Date("2004-03-10")), 0]);

          // Initial call to set up x-axis
          updateXAxis(x);
        });

      } catch (error) {
        alert("Error processing CSV file.");
        console.error("CSV Parsing Error:", error);
        navigate("/");
      }
    };
    reader.readAsText(file);
  }, [file, navigate]);

  const handleHomeClick = () => {
    navigate("/");
  };

  return (
    <div className="p-5 bg-gray-100 min-h-screen">
       <div style={{ marginTop: '1500px', padding: '2rem' }}>
      <h1 className="text-2xl font-bold text-blue-700 mb-4 text-center">
       Zoomable Area Charts
      </h1>
      <div ref={containerRef}></div>
      </div>
    </div>
    
  );
};

export default ZoomableChartPage;