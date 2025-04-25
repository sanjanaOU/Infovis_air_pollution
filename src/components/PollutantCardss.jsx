// src/components/PollutantCardss.jsx
import React from "react";
import "../App.css"; // Make sure this has the CSS or import another CSS file

const pollutantColors = {
  "CO(GT)": "#8dd3c7", // Red
  "C6H6(GT)": "#b15928", // Purple
  "NMHC(GT)": "#bebada", // Yellow
  "NO2(GT)": "#fb8072", // Green
  "PT08.S5(O3)": "#80b1d3", // Blue
  "NOx(GT)": "#fdb462" // Orange
};

const pollutantDescriptions = {
  "CO(GT)": "Carbon Monoxide: Emitted by vehicles and combustion.",
  "C6H6(GT)": "Benzene: A harmful volatile organic compound.",
  "NMHC(GT)": "Non-Methane Hydrocarbons: Emitted by cars, solvents, and industries.",
  "NO2(GT)": "Nitrogen Dioxide: Comes from burning fossil fuels.",
  "PT08.S5(O3)": "Ozone Sensor (S5): Measures ozone and related gases.",
  "NOx(GT)": "Nitrogen Oxides: Includes NO and NO2, major urban pollutants.",
};

const PollutantCardss = () => {
  return (
    <div className="pollutant-full-bg">
      <div style={{ padding: "1rem 2rem" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", marginBottom: "1.5rem" }}>
          <h2 style={{ textAlign: "center", fontWeight: "700", fontSize: "1.6rem", color: "#000000" }}>
            Understanding Pollutant Dangers
          </h2>
          <br></br>
          <br></br>
          <br></br>
          <p style={{ textAlign: "center", color: "#000000", fontSize: "1rem" }}>
            <strong>
              These pollutants are commonly found in urban air and can cause severe health risks including respiratory and cardiovascular issues.
              Long-term exposure may increase the chances of lung diseases and other chronic conditions.
            </strong>
          </p>
        </div>

        <div className="pollutant-card-grid">
          {Object.entries(pollutantDescriptions).map(([key, desc]) => (
            <div
              key={key}
              className="pollutant-card animate-fade-in"
              style={{ backgroundColor: pollutantColors[key] }}
            >
              <h3 >{key.replace("(GT)", "")}</h3>
              <p style={{color: "#000000"}} >{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PollutantCardss;
