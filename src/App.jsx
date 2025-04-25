import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Header from "./components/Header";
import PollutantCardss from "./components/PollutantCardss";
import PollutantMetrics from "./components/PollutantMetrics";
import PollutantPageDetail from "./components/PollutantPageDetail";
import OverviewPage from "./components/OverviewPage";
import PollutantComparison from "./components/PollutantComparison";
import VisualizePage from "./components/VisualizePage";
import AQIPage from "./components/AQIPage";
import BarChartPage from "./components/BarChartPage";
import ZoomableChartPage from "./components/ZoomableChartPage";
import StackedAreaChartPage from "./components/StackedAreaChartPage";
import Papa from "papaparse";

import VantaBackground from "./components/VantaBackground"; // ✅ Import Vanta
import "./App.css";

function App() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [selectedDate, setSelectedDate] = useState("2004-09-01");
  const [selectedData, setSelectedData] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!csvData || !Array.isArray(csvData) || csvData.length === 0) return;
    const match = csvData.find((row) => {
      const formattedDate = new Date(row["Date"]).toISOString().split("T")[0];
      return formattedDate === selectedDate;
    });
    setSelectedData(match || null);
  }, [csvData, selectedDate]);

  const handleFileUpload = ({ file, data }) => {
    setUploadedFile(file);
    setCsvData(Array.isArray(data) ? data : []);
  };

  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
  };

  const handlePollutantCardClick = (pollutant, color) => {
    const fileName = uploadedFile ? uploadedFile.name : 'AirQualityUCI.csv';
    navigate("/pollutantPage", {
      state: {
        pollutant,
        csvData,
        selectedDate,
        color,
        file: uploadedFile,
        fileName,
      },
    });
  };

  return (
    <VantaBackground>
    <div className="app">
      

      <Header
        onFileUpload={handleFileUpload}
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
        uploadedFile={uploadedFile}
      />

      <div className="content">
        {location.pathname === "/" && (
          <>
            {uploadedFile ? (
              <PollutantMetrics
                csvData={csvData}
                selectedDate={selectedDate}
                onPollutantCardClick={handlePollutantCardClick}
              />
            ) : (
              <PollutantCardss />
            )}
          </>
        )}

        <Routes>
          <Route path="/" element={<></>} />
          <Route
            path="/pollutantPage"
            element={<PollutantPageDetail uploadedFile={uploadedFile} />}
          />
          <Route path="/overview" element={<OverviewPage uploadedFile={uploadedFile} />} />
          <Route path="/compare" element={<PollutantComparison uploadedFile={uploadedFile} />} />
          <Route path="/visualize" element={<VisualizePage />} />
          <Route path="/aqi" element={<AQIPage />} />
          <Route path="/visualize/barchart" element={<BarChartPage />} />
          <Route path="/visualize/zoomablechart" element={<ZoomableChartPage />} />
          <Route path="/visualize/stackedareachart" element={<StackedAreaChartPage />} />
        </Routes>
      </div>
    </div>
    </VantaBackground>
  );
}

export default App;
