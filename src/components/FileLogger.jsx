import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Papa from 'papaparse';

const FileLogger = () => {
  const location = useLocation();
  const { file, fileName } = location.state || {};

  useEffect(() => {
    if (fileName) {
      console.log('📂 File Name:', fileName);
    } else {
      console.log('⚠️ No file name found.');
    }

    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log('📊 Parsed File Records:', results.data);
        },
        error: (err) => {
          console.error('❌ Error parsing file:', err);
        },
      });
    } else {
      console.log('⚠️ No file provided.');
    }
  }, [file, fileName]);

  return null; // No UI output
};

export default FileLogger;
