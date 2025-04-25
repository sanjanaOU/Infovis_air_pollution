import React from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import './Header.css';

const Header = ({ onFileUpload, selectedDate, onDateChange, uploadedFile }) => {
  const navigate = useNavigate();

  const handleUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const updatedData = (results.data || []).map((row) => {
            const updatedRow = { ...row };
            Object.keys(updatedRow).forEach((key) => {
              const value = parseFloat(updatedRow[key]);
              if (!isNaN(value) && value < 0) {
                updatedRow[key] = "0";
              }
            });
            return updatedRow;
          });
          if (typeof onFileUpload === 'function') {
            onFileUpload({ file, data: updatedData });
          } else {
            console.error("onFileUpload is not a function");
          }
        },
        error: (error) => {
          console.error("Papa.parse error:", error);
          if (typeof onFileUpload === 'function') {
            onFileUpload({ file, data: [] });
          }
        },
      });
    } else {
      if (typeof onFileUpload === 'function') {
        onFileUpload({ file: null, data: [] });
      }
    }
  };

  const handleButtonClick = (id) => {
    const fileName = uploadedFile ? uploadedFile.name : 'AirQualityUCI.csv';
  
    if (!uploadedFile) {
      const filePath = `/${fileName}`;
      fetch(filePath)
        .then((res) => {
          if (!res.ok) throw new Error('File not found in public folder');
          return res.text();
        })
        .then((csvText) => {
          Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              const updatedData = (results.data || []).map((row) => {
                const updatedRow = { ...row };
                Object.keys(updatedRow).forEach((key) => {
                  const value = parseFloat(updatedRow[key]);
                  if (!isNaN(value) && value < 0) {
                    updatedRow[key] = "0";
                  }
                });
                return updatedRow;
              });
  
              const file = new File([csvText], fileName, { type: 'text/csv' });
  
              if (typeof onFileUpload === 'function') {
                onFileUpload({ file, data: updatedData });
              } else {
                console.error("onFileUpload is not a function");
              }
  
              // Navigate after processing
              navigateToPage(id, file, fileName);
            },
            error: (error) => {
              console.error("Papa.parse error:", error);
              if (typeof onFileUpload === 'function') {
                onFileUpload({ file: null, data: [] });
              }
            },
          });
        })
        .catch((error) => {
          console.error("Fetch error:", error);
          if (typeof onFileUpload === 'function') {
            onFileUpload({ file: null, data: [] });
          }
        });
    } else {
      navigateToPage(id, uploadedFile, fileName);
    }
  };

  const navigateToPage = (id, file, fileName) => {
    const state = { file, fileName };
    switch (id) {
      case 1:
        navigate('/overview', { state });
        break;
      case 2:
        navigate('/compare', { state });
        break;
      case 3:
        navigate('/visualize', { state });
        break;
      case 4:
        navigate('/aqi', { state });
        break;
      default:
        navigate("/", { state });
    }
  };
  
  

  return (
    <header className="header">
      <div className="header-title">
        <img src="/logo.jpeg" alt="Logo" className="logo-icon" />
        <h1>Air Quality Explorer</h1>
      </div>

      <div className="header-controls">
        <div className="file-upload-container">
          <input
            type="file"
            accept=".csv"
            onChange={handleUpload}
            className="file-upload"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="file-upload-label">
            {uploadedFile ? `Uploaded: ${uploadedFile.name}` : "Choose CSV File"}
          </label>
        </div>
        <div className="header-buttons">
          <button
            className="action-button"
            onClick={() => handleButtonClick(1)}
            disabled={!uploadedFile}
          >
            Overview
          </button>
          <button
            className="action-button"
            onClick={() => handleButtonClick(2)}
            disabled={!uploadedFile}
          >
            Comparison
          </button>
          <button
            className="action-button"
            onClick={() => handleButtonClick(3)}
            disabled={!uploadedFile}
          >
            Visualize
          </button>
          <button
            className="action-button"
            onClick={() => handleButtonClick(4)}
            disabled={!uploadedFile}
          >
            AQI
          </button>
          <button
            className="action-button"
            onClick={() => handleButtonClick(5)}
          >
            Home
          </button>
        </div>
      </div>
    </header>
  );
};


export default Header;