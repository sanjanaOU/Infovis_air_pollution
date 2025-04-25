import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Papa from 'papaparse';
import Header from './Header';
import MultiLineChart from './MultiLineChart';
import './OverView.css';

const OverviewPage = () => {
  const location = useLocation();
  const { file, fileName } = location.state || {};
  const [csvData, setCsvData] = useState([]);

  useEffect(() => {
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const filtered = results.data.filter(d => d.Date && d.Time); // basic validation
          setCsvData(filtered);
          console.log('📂 File Name:', fileName);
          console.log('📊 Parsed Data:', filtered);
        },
        error: (err) => {
          console.error('❌ Error parsing CSV:', err);
        },
      });
    }
  }, [file, fileName]);

  return (
    <>
      <div className="fixed-header">
        <Header />
      </div>

      <div className="content-below-header">
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Pollutant Trends Overview</h2>
        {csvData.length > 0 ? (
          <MultiLineChart data={csvData} />
        ) : (
          <p style={{ textAlign: 'center', fontStyle: 'italic' }}>No data available to display.</p>
        )}
      </div>
    </>
  );
};

export default OverviewPage;
