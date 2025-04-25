import React from "react";
import "./PollutantMetrics.css";

const pollutantColors = {
 "CO(GT)": "#8dd3c7", // Red
  "C6H6(GT)": "#b15928", // Purple
  "NMHC(GT)": "#bebada", // Yellow
  "NO2(GT)": "#fb8072", // Green
  "PT08.S5(O3)": "#80b1d3", // Blue
  "NOx(GT)": "#fdb462" // Orange
};

const pollutantIcons = {
  "CO(GT)": "/icons/pollutant.jpg",
  "C6H6(GT)": "/icons/pollutant.jpg",
  "NMHC(GT)": "/icons/pollutant.jpg",
  "NO2(GT)": "/icons/pollutant.jpg",
  "PT08.S5(O3)": "/icons/pollutant.jpg",
  "NOx(GT)": "/icons/pollutant.jpg",
};

const PollutantMetrics = ({ csvData, onPollutantCardClick, uploadedFile, file, fileName }) => {
  if (!csvData || csvData.length === 0) {
    return (
      <div className="pollutant-metrics-background">
        <div style={{ padding: "1rem", color: "white" }}>
          No CSV data loaded. {uploadedFile ? `File: ${uploadedFile.name}` : "No file uploaded."}
        </div>
      </div>
    );
  }

  const pollutantSums = {};
  const pollutantCounts = {};

  Object.keys(pollutantColors).forEach((key) => {
    pollutantSums[key] = 0;
    pollutantCounts[key] = 0;
  });

  csvData.forEach((row) => {
    Object.keys(pollutantColors).forEach((pollutant) => {
      const val = parseFloat(row[pollutant]);
      if (!isNaN(val) && val >= 0) {
        pollutantSums[pollutant] += val;
        pollutantCounts[pollutant] += 1;
      }
    });
  });

  const pollutantAverages = {};
  Object.keys(pollutantColors).forEach((pollutant) => {
    const sum = pollutantSums[pollutant];
    const count = pollutantCounts[pollutant];
    pollutantAverages[pollutant] = count > 0 ? (sum / count).toFixed(2) : "0.00";
  });

  return (
    <div className="pollutant-metrics-background">
      <div className="pollutant-metrics-container">
        <h3>
          Pollutant Metrics {uploadedFile ? `for ${uploadedFile.name}` : "(Default Dataset)"}
        </h3>
        <div className="metrics-grid">
          {Object.keys(pollutantColors).map((pollutant) => {
            const color = pollutantColors[pollutant];
            const avgValue = pollutantAverages[pollutant];
            const iconSrc = pollutantIcons[pollutant];

            return (
              <div
                key={pollutant}
                className="metric-card"
                style={{ backgroundColor: color }}
                onClick={() => onPollutantCardClick(pollutant, color, csvData, file, fileName)}
              >
                <strong>{pollutant.replace("(GT)", "")}</strong>
                {iconSrc && <img src={iconSrc} alt={pollutant} className="pollutant-icon" />}
                <p style={{color: "#000000"}} >
                  {avgValue} {pollutant.includes("O3") ? "µg/m³" : "mg/m³"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PollutantMetrics;
