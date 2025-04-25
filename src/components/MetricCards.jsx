import React from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";
import "./metricscards.css"


// Register chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const pollutantColors = {
  "CO(GT)": "#8dd3c7", // Red
  "C6H6(GT)": "#b15928", // Purple
  "NMHC(GT)": "#bebada", // Yellow
  "NO2(GT)": "#fb8072", // Green
  "PT08.S5(O3)": "#80b1d3", // Blue
  "NOx(GT)": "#fdb462" // Orange
};

const MetricCards = ({ selectedData, calculatePollutantStats }) => {
  // Define pollutants
  const pollutants = ["CO(GT)", "C6H6(GT)", "NMHC(GT)", "NO2(GT)", "PT08.S5(O3)", "NOx(GT)"];

  return (
    <div className="metrics-row">
      {pollutants.map((pollutant) => {
        const { mean, median } = calculatePollutantStats(pollutant);

        // Prepare the data for the chart
        const data = {
          labels: ["Mean", "Median"],
          datasets: [
            {
              label: pollutant.replace("(GT)", ""),
              data: [mean, median],
              fill: false,
              borderColor: pollutantColors[pollutant] || "#742774", // Use the custom color for each pollutant
              backgroundColor: pollutantColors[pollutant] || "#742774", // Set background to pollutant color
              tension: 0.4, // Make the line smoother
              borderWidth: 2, // Set border width for better visibility
            },
          ],
        };

        return (
          <div
            key={pollutant}
            className="metric-card"
            style={{
              backgroundColor: "#d3d3d3", // Gray background for outer card
            }}
          >
            <strong>{pollutant.replace("(GT)", "")}</strong>
            <Line data={data} />
            <p>
              Mean: {mean.toFixed(2)} µg/m³ | Median: {median.toFixed(2)} µg/m³
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default MetricCards;
