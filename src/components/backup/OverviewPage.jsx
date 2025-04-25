import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import Papa from 'papaparse';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Header from './Header';
import './OverView.css';

const OverviewPage = () => {
  const location = useLocation();
  const { file, fileName } = location.state || {};
  const [csvData, setCsvData] = useState([]);
  const [pollutantTrendData, setPollutantTrendData] = useState([]);
  const [pollutantVsTempData, setPollutantVsTempData] = useState([]);
  const [selectedDate] = useState('09/01/2004');
  const [years, setYears] = useState([]);
  const [months, setMonths] = useState([]);
  const [days, setDays] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [xAxisLabel, setXAxisLabel] = useState('Date');
  const [isLoading, setIsLoading] = useState(false);

  // Pollutant colors
  const pollutantColors = {
    'CO(GT)': '#e74c3c',
    'C6H6(GT)': '#8e44ad',
    'NMHC(GT)': '#f39c12',
    'NO2(GT)': '#27ae60',
    'PT08.S5(O3)': '#2980b9',
    'NOx(GT)': '#d35400',
  };

  // Pollutant units
  const pollutantUnits = {
    'CO(GT)': 'mg/m³',
    'C6H6(GT)': 'µg/m³',
    'NMHC(GT)': 'µg/m³',
    'NO2(GT)': 'µg/m³',
    'PT08.S5(O3)': 'units',
    'NOx(GT)': 'ppb',
  };

  // Month map
  const monthMap = {
    '01': 'January',
    '02': 'February',
    '03': 'March',
    '04': 'April',
    '05': 'May',
    '06': 'June',
    '07': 'July',
    '08': 'August',
    '09': 'September',
    '10': 'October',
    '11': 'November',
    '12': 'December',
  };

  // Utility: Clean negative values
  const sanitizeData = useCallback((data) => {
    return data.map((row) => {
      const cleaned = { ...row };
      ['CO(GT)', 'C6H6(GT)', 'NMHC(GT)', 'NO2(GT)', 'PT08.S5(O3)', 'NOx(GT)', 'AH', 'T'].forEach((key) => {
        const value = parseFloat(cleaned[key]);
        if (!isNaN(value) && value < 0) {
          cleaned[key] = '0';
        }
      });
      return cleaned;
    });
  }, []);

  // Parse CSV and extract years, months, days
  useEffect(() => {
    if (!file) return;
    setIsLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().replace(/^"|"$/g, ''),
      transform: (value) => value.trim().replace(/^"|"$/g, ''),
      complete: ({ data }) => {
        const cleaned = sanitizeData(data);
        setCsvData(cleaned);

        const dateMap = new Map();
        cleaned.forEach((row) => {
          const [month, day, year] = row['Date']?.split('/') || [];
          if (year && month && day) {
            dateMap.set(`${year}-${month}-${day}`, true);
          }
        });

        const parsed = Array.from(dateMap.keys()).map((key) => {
          const [year, month, day] = key.split('-');
          return { year, month: month.padStart(2, '0'), day: day.padStart(2, '0') };
        });

        const allYears = [...new Set(parsed.map((r) => r.year))].sort();
        setYears(allYears);

        const uniqueMonths = [...new Set(parsed.map((r) => r.month))].sort();
        setMonths(uniqueMonths.map((m) => ({ key: m, label: monthMap[m] })));

        const uniqueDays = [...new Set(parsed.map((r) => r.day))].sort();
        setDays(uniqueDays);

        setIsLoading(false);
      },
      error: (error) => {
        console.error('PapaParse error:', error);
        setIsLoading(false);
      },
    });
  }, [file, sanitizeData]);

  // Combined data processing for both charts
  const processChartData = useMemo(() => {
    if (csvData.length === 0) {
      return { pollutantTrendData: [], pollutantVsTempData: [], xAxisLabel: 'Date', tempDomain: [0, 50], yTicks: [0, 100, 200, 300, 400, 500] };
    }

    let filtered = csvData;
    let newXAxisLabel = 'Date';

    // Apply filters
    if (selectedYear) {
      filtered = filtered.filter((row) => row['Date'].split('/')[2] === selectedYear);
      newXAxisLabel = 'Month';
    }
    if (selectedMonth) {
      filtered = filtered.filter((row) => row['Date'].split('/')[0].padStart(2, '0') === selectedMonth);
      newXAxisLabel = 'Day';
    }
    if (selectedDay) {
      filtered = filtered.filter((row) => row['Date'].split('/')[1].padStart(2, '0') === selectedDay);
      newXAxisLabel = 'Hour';
    }

    // Pollutant Trend Data
    let pollutantTrendData = [];
    if (selectedDay) {
      // Hourly averages
      const hourMap = new Map();
      filtered.forEach((row) => {
        const hour = row['Time']?.split(':')[0];
        if (!hour) return;
        const key = parseInt(hour);
        const existing = hourMap.get(key) || { count: 0, values: {} };
        Object.keys(pollutantColors).forEach((pollutant) => {
          existing.values[pollutant] = (existing.values[pollutant] || 0) + (parseFloat(row[pollutant]) || 0);
        });
        existing.count += 1;
        hourMap.set(key, existing);
      });

      pollutantTrendData = Array.from({ length: 24 }, (_, i) => {
        const hourData = hourMap.get(i) || { count: 1, values: {} };
        const result = { label: `${i.toString().padStart(2, '0')}:00` };
        Object.keys(pollutantColors).forEach((pollutant) => {
          result[pollutant] = (hourData.values[pollutant] || 0) / hourData.count;
        });
        return result;
      });
    } else if (selectedMonth) {
      // Daily averages
      const grouped = filtered.reduce((acc, row) => {
        const [, day] = row['Date'].split('/');
        const date = day.padStart(2, '0');
        acc[date] = acc[date] || { count: 0, values: {} };
        Object.keys(pollutantColors).forEach((pollutant) => {
          acc[date].values[pollutant] = (acc[date].values[pollutant] || 0) + (parseFloat(row[pollutant]) || 0);
        });
        acc[date].count += 1;
        return acc;
      }, {});

      pollutantTrendData = Object.keys(grouped)
        .map((day) => ({
          label: parseInt(day).toString(),
          ...Object.fromEntries(
            Object.keys(pollutantColors).map((pollutant) => [
              pollutant,
              grouped[day].values[pollutant] / grouped[day].count,
            ])
          ),
        }))
        .sort((a, b) => parseInt(a.label) - parseInt(b.label));
    } else if (selectedYear) {
      // Monthly averages
      const grouped = filtered.reduce((acc, row) => {
        const [month] = row['Date'].split('/');
        const monthKey = month.padStart(2, '0');
        acc[monthKey] = acc[monthKey] || { count: 0, values: {} };
        Object.keys(pollutantColors).forEach((pollutant) => {
          acc[monthKey].values[pollutant] = (acc[monthKey].values[pollutant] || 0) + (parseFloat(row[pollutant]) || 0);
        });
        acc[monthKey].count += 1;
        return acc;
      }, {});

      pollutantTrendData = Object.keys(grouped)
        .map((month) => ({
          label: monthMap[month],
          ...Object.fromEntries(
            Object.keys(pollutantColors).map((pollutant) => [
              pollutant,
              grouped[month].values[pollutant] / grouped[month].count,
            ])
          ),
        }))
        .sort((a, b) =>
          Object.keys(monthMap).findIndex((k) => monthMap[k] === a.label) -
          Object.keys(monthMap).findIndex((k) => monthMap[k] === b.label)
        );
    } else {
      // Daily averages
      const grouped = filtered.reduce((acc, row) => {
        const date = row['Date'];
        if (!date) return acc;
        acc[date] = acc[date] || { count: 0, values: {} };
        Object.keys(pollutantColors).forEach((pollutant) => {
          acc[date].values[pollutant] = (acc[date].values[pollutant] || 0) + (parseFloat(row[pollutant]) || 0);
        });
        acc[date].count += 1;
        return acc;
      }, {});

      pollutantTrendData = Object.keys(grouped)
        .map((date) => ({
          label: date,
          ...Object.fromEntries(
            Object.keys(pollutantColors).map((pollutant) => [
              pollutant,
              grouped[date].values[pollutant] / grouped[date].count,
            ])
          ),
        }))
        .sort((a, b) => new Date(a.label) - new Date(b.label));
    }

    // Pollutant vs Temperature Data
    const sampleSize = 1000;
    const tempMap = new Map();
    filtered
      .map((row) => ({
        T: Math.round(parseFloat(row['T']) || 0), // Round to nearest integer
        ...Object.fromEntries(
          Object.keys(pollutantColors).map((pollutant) => [
            pollutant,
            parseFloat(row[pollutant]) || 0,
          ])
        ),
      }))
      .filter((point) => point.T !== 0 && Object.values(point).some((val, idx) => idx > 0 && val !== 0))
      .slice(0, sampleSize)
      .forEach((row) => {
        const temp = row.T;
        const existing = tempMap.get(temp) || { count: 0, values: {} };
        Object.keys(pollutantColors).forEach((pollutant) => {
          existing.values[pollutant] = (existing.values[pollutant] || 0) + row[pollutant];
        });
        existing.count += 1;
        tempMap.set(temp, existing);
      });

    const pollutantVsTempData = Array.from(tempMap.entries())
      .map(([temp, data]) => ({
        T: temp,
        ...Object.fromEntries(
          Object.keys(pollutantColors).map((pollutant) => [
            pollutant,
            data.values[pollutant] / data.count,
          ])
        ),
      }))
      .sort((a, b) => a.T - b.T);

    // Calculate temperature range for X-axis
    const tempValues = pollutantVsTempData.map((d) => d.T).filter((t) => t !== 0);
    const minTemp = tempValues.length ? Math.floor(Math.min(...tempValues)) : 0;
    const maxTemp = tempValues.length ? Math.ceil(Math.max(...tempValues)) : 50;
    const tempDomain = [minTemp, maxTemp];

    // Calculate pollutant range for Y-axis ticks
    const pollutantValues = pollutantTrendData
      .flatMap((d) => Object.keys(pollutantColors).map((p) => d[p]))
      .filter((v) => v !== undefined && !isNaN(v));
    const maxPollutant = pollutantValues.length ? Math.max(...pollutantValues) : 1000;
    const yTicks = Array.from(
      { length: Math.ceil(maxPollutant / 100) + 1 },
      (_, i) => i * 100
    );

    return { pollutantTrendData, pollutantVsTempData, xAxisLabel, tempDomain, yTicks };
  }, [csvData, selectedYear, selectedMonth, selectedDay]);

  // Update chart data
  useEffect(() => {
    const { pollutantTrendData, pollutantVsTempData, xAxisLabel, tempDomain, yTicks } = processChartData;
    setPollutantTrendData(pollutantTrendData);
    setPollutantVsTempData(pollutantVsTempData);
    setXAxisLabel(xAxisLabel);
  }, [processChartData]);

  // Log fileName
  useEffect(() => {
    console.log(fileName ? `Uploaded file name: ${fileName}` : 'No file name provided, defaulting to AirQualityUCI.csv');
  }, [fileName]);

  // Handle file upload
  const handleFileUpload = useCallback(({ file, data }) => {
    setCsvData(sanitizeData(data));
  }, [sanitizeData]);

  // Debounced filter handlers
  const handleYearChange = useCallback((e) => {
    setSelectedYear(e.target.value);
    setSelectedMonth('');
    setSelectedDay('');
  }, []);

  const handleMonthChange = useCallback((e) => {
    setSelectedMonth(e.target.value);
    setSelectedDay('');
  }, []);

  const handleDayChange = useCallback((e) => {
    setSelectedDay(e.target.value);
  }, []);

  return (
    <div className="overview-page">
      {/* Fixed Header */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 1000 }}>
        <Header
          onFileUpload={handleFileUpload}
          selectedDate={selectedDate}
          onDateChange={() => {}}
          uploadedFile={file}
        />
      </div>

      {/* Main Content */}
      <div style={{ marginTop: '120px', padding: '2rem' }}>
        {isLoading || csvData.length === 0 ? (
          <div className="loading">Loading data...</div>
        ) : (
          <>
            <h1>Air Quality Overview</h1>
            <div className="dropdown-row">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: '#2d3748' }}>Year:</label>
                <select
                  value={selectedYear}
                  onChange={handleYearChange}
                  className="dropdown-select"
                >
                  <option value="">All Years</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: '#2d3748' }}>Month:</label>
                <select
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  disabled={!selectedYear}
                  className="dropdown-select"
                >
                  <option value="">All Months</option>
                  {months.map((m) => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: '#2d3748' }}>Day:</label>
                <select
                  value={selectedDay}
                  onChange={handleDayChange}
                  disabled={!selectedMonth}
                  className="dropdown-select"
                >
                  <option value="">All Days</option>
                  {days.map((d) => (
                    <option key={d} value={d}>{parseInt(d)}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* Chart Container */}
            <div className="chart-container">
              {/* Pollutant Trend Chart */}
              <div className="chart-card">
                <h2>Pollutant Trend</h2>
                {pollutantTrendData.length === 0 ? (
                  <div className="no-data">No data available for the selected filters.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart
                      data={pollutantTrendData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                      syncId="overview"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="label"
                        label={{ value: xAxisLabel, position: 'insideBottom', offset: -10, fill: '#4a5568' }}
                        tick={{ fill: '#4a5568', fontSize: 12 }}
                        interval={selectedDay ? 0 : 'preserveStartEnd'}
                      />
                      <YAxis
                        label={{ value: 'Concentration', angle: -90, position: 'insideLeft', fill: '#4a5568' }}
                        tick={{ fill: '#4a5568', fontSize: 12 }}
                        ticks={processChartData.yTicks}
                      />
                      <Tooltip
                        contentStyle={{ background: '#2d3748', color: '#fff', borderRadius: '8px' }}
                        formatter={(value, name) => [value.toFixed(2), name]}
                      />
                      <Legend verticalAlign="top" height={36} />
                      {Object.keys(pollutantColors).map((pollutant) => (
                        <Line
                          key={pollutant}
                          type="monotone"
                          dataKey={pollutant}
                          name={`${pollutant} (${pollutantUnits[pollutant]})`}
                          stroke={pollutantColors[pollutant]}
                          strokeWidth={3}
                          dot={false}
                          activeDot={{ r: 8 }}
                          animationDuration={500}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Pollutants vs Temperature Line Chart */}
              <div className="chart-card">
                <h2>Pollutants vs Temperature</h2>
                {pollutantVsTempData.length === 0 ? (
                  <div className="no-data">No data available for the selected filters.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart
                      data={pollutantVsTempData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                      syncId="overview"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="T"
                        name="Temperature"
                        unit="°C"
                        label={{ value: 'Temperature (°C)', position: 'insideBottom', offset: -10, fill: '#4a5568' }}
                        tick={{ fill: '#4a5568', fontSize: 12 }}
                        domain={processChartData.tempDomain}
                        tickCount={10}
                        tickFormatter={(value) => Math.round(value).toString()}
                      />
                      <YAxis
                        label={{ value: 'Concentration', angle: -90, position: 'insideLeft', fill: '#4a5568' }}
                        tick={{ fill: '#4a5568', fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{ background: '#2d3748', color: '#fff', borderRadius: '8px' }}
                        formatter={(value, name) => [value.toFixed(2), `${name} (${pollutantUnits[name]})`]}
                      />
                      <Legend verticalAlign="top" height={36} />
                      {Object.keys(pollutantColors).map((pollutant) => (
                        <Line
                          key={pollutant}
                          type="monotone"
                          dataKey={pollutant}
                          name={`${pollutant} (${pollutantUnits[pollutant]})`}
                          stroke={pollutantColors[pollutant]}
                          strokeWidth={3}
                          dot={false}
                          activeDot={{ r: 8 }}
                          animationDuration={500}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OverviewPage;