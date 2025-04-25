import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import * as d3 from "d3";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Brush,
} from "recharts";
import "./PollutantPageDetail.css";

const PollutantPageDetail = ({ uploadedFile }) => {
  const location = useLocation();
  const { pollutant, color, csvData, file, fileName } = location.state || {};

  const [records, setRecords] = useState([]);
  const [pollutantTrend, setPollutantTrend] = useState([]);
  const [tempHumidityData, setTempHumidityData] = useState([]);
  const [years, setYears] = useState([]);
  const [months, setMonths] = useState([]);
  const [days, setDays] = useState([]);
  const [selectedYear, setSelectedYear] = useState("2004");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [weekendData, setWeekendData] = useState([]);
  const [weekdayData, setWeekdayData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Month names mapping
  const monthNames = {
    "01": "January",
    "02": "February",
    "03": "March",
    "04": "April",
    "05": "May",
    "06": "June",
    "07": "July",
    "08": "August",
    "09": "September",
    "10": "October",
    "11": "November",
    "12": "December",
  };

  useEffect(() => {
    const fileNameToUse = fileName || (uploadedFile ? uploadedFile.name : "AirQualityUCI.csv");

    const fetchData = async () => {
      try {
        const text = await fetch(`/${fileNameToUse}`).then((res) => res.text());
        const parsed = d3.csvParse(text).map((row) => {
          const updated = { ...row };
          Object.keys(updated).forEach((key) => {
            const value = parseFloat(updated[key]);
            if (!isNaN(value) && value < 0) {
              updated[key] = "0";
            }
          });
          return updated;
        });
        const processed = processData(parsed);
        setRecords(processed);
        extractFilterValues(processed);
      } catch (err) {
        console.error("Error loading CSV:", err);
      }
    };

    if (!csvData || csvData.length === 0) {
      fetchData();
    } else {
      const processed = processData(csvData);
      setRecords(processed);
      extractFilterValues(processed);
    }
  }, [csvData, pollutant]);

  const processData = (data) => {
    return data
      .map((row) => {
        const [month, day, year] = row.Date?.split("/") || [];
        if (!day || !month || !year) return null;
        // Calculate day of week (0 = Sunday, 6 = Saturday)
        const date = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        return {
          ...row,
          _year: year,
          _month: month.padStart(2, "0"),
          _day: day.padStart(2, "0"),
          _hour: row.Time?.split(":")[0],
          _dateTime: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")} ${row.Time}`,
          _isWeekend: isWeekend,
          value: parseFloat(row[pollutant]) || 0,
          T: parseFloat(row["T"]) || 0,
          AH: parseFloat(row["AH"]) || 0,
        };
      })
      .filter((row) => row && !isNaN(row.value));
  };

  const extractFilterValues = (data) => {
    const years = [...new Set(data.map((r) => r._year))].sort();
    setYears(years);

    // Get unique months for the selected year
    const months = [
      ...new Set(data.filter((r) => r._year === selectedYear).map((r) => r._month)),
    ].sort();
    setMonths(months);

    // Get unique days for the selected year and month
    const days = [
      ...new Set(
        data
          .filter((r) => r._year === selectedYear && (!selectedMonth || r._month === selectedMonth))
          .map((r) => r._day)
      ),
    ].sort();
    setDays(days);
  };

  useEffect(() => {
    let filtered = records.filter((r) => r._year === selectedYear);
    if (selectedMonth) filtered = filtered.filter((r) => r._month === selectedMonth);
    if (selectedDay) filtered = filtered.filter((r) => r._day === selectedDay);

    if (filtered.length === 0) {
      setPollutantTrend([]);
      setTempHumidityData([]);
      setFilteredData([]);
      setWeekendData([]);
      setWeekdayData([]);
      return;
    }

    const trend = filtered.map((r) => ({ dateTime: r._dateTime, value: r.value }));
    const tempHum = filtered.map((r) => ({ T: r.T, AH: r.AH }));

    // Calculate weekend and weekday data
    const weekendRecords = filtered.filter((r) => r._isWeekend);
    const weekdayRecords = filtered.filter((r) => !r._isWeekend);

    const weekendAvg = weekendRecords.reduce((acc, r) => acc + r.value, 0) / (weekendRecords.length || 1);
    const weekdayAvg = weekdayRecords.reduce((acc, r) => acc + r.value, 0) / (weekdayRecords.length || 1);

    setWeekendData([{ name: "Weekends", value: weekendAvg }]);
    setWeekdayData([{ name: "Weekdays", value: weekdayAvg }]);

    setPollutantTrend(trend);
    setTempHumidityData(tempHum);
    setFilteredData(filtered);

    // Update available months and days when year changes
    extractFilterValues(records);
  }, [selectedYear, selectedMonth, selectedDay, records]);

  const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  return (
    <div className="pollutant-container" style={{ paddingTop: "120px" }}>
      <h2 className="title">{pollutant} Trend & Temperature vs Humidity</h2>

      <div className="dropdown-row">
        <select
          value={selectedYear}
          onChange={(e) => {
            setSelectedYear(e.target.value);
            setSelectedMonth("");
            setSelectedDay("");
          }}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={selectedMonth}
          onChange={(e) => {
            setSelectedMonth(e.target.value);
            setSelectedDay("");
          }}
        >
          <option value="">All Months</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {monthNames[m]}
            </option>
          ))}
        </select>
        <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)}>
          <option value="">All Days</option>
          {days.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {pollutantTrend.length === 0 ? (
        <div className="no-data">No data is available for the selected date range.</div>
      ) : (
        <div className="chart-section">
          <div className="chart-box">
            <h3>Pollutant Over Time</h3>
            <ResponsiveContainer width="100%" height={650}>
  <LineChart
    data={pollutantTrend}
    onClick={(data) => {
      if (data && data.activePayload && data.activePayload.length > 0) {
        const payload = data.activePayload[0].payload;
        const clickedIndex = pollutantTrend.findIndex((d) => d.dateTime === payload.dateTime);

        if (clickedIndex !== -1) {
          const prev = filteredData[clickedIndex - 1];
          const current = filteredData[clickedIndex];
          const next = filteredData[clickedIndex + 1];

          console.log("Clicked label (X):", data.activeLabel);
          console.log("Clicked dateTime:", payload.dateTime);
          console.log("Previous:", prev?.Date, prev?.Time);
          console.log("Current:", current?.Date, current?.Time);
          console.log("Next:", next?.Date, next?.Time);

          const selectedTemps = [];

          if (prev) selectedTemps.push({ T: prev.T, AH: prev.AH });
          if (current) selectedTemps.push({ T: current.T, AH: current.AH });
          if (next) selectedTemps.push({ T: next.T, AH: next.AH });

          setTempHumidityData(selectedTemps);
        }
      }
    }}
  >
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis
      dataKey="dateTime"
      tick={{ fontSize: 10 }}
      angle={-40}
      textAnchor="end"
      height={70}
    />
    <YAxis />
    <Tooltip />
    <Line
      type="monotone"
      dataKey="value"
      stroke={color}
      strokeWidth={3}
      dot={{ r: 3 }}
      activeDot={{ r: 6 }}
    />
  </LineChart>
</ResponsiveContainer>


          </div>

          <div className="chart-box">
            <h3>Temperature vs Humidity</h3>
            <ResponsiveContainer width="100%" height={650}>
              <LineChart data={tempHumidityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="T"
                  label={{ value: "Temperature (°C)", position: "insideBottom", offset: -3 }}
                />
                <YAxis label={{ value: "AH", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Line type="monotone" dataKey="AH" stroke={color} strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {pollutantTrend.length > 0 && (
        <div className="chart-section">
          <div className="chart-box">
            <h3>Average {pollutant} on Weekends</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={weekendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill={color} name={pollutant} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-box">
            <h3>Average {pollutant} on Weekdays</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={weekdayData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill={color} name={pollutant} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="data-table-section">
        <h3>Filtered Records</h3>
        <table className="styled-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>{pollutant}</th>
              <th>T</th>
              <th>AH</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan="5" className="no-data">
                  No records available.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.Date}</td>
                  <td>{row.Time}</td>
                  <td>{row[pollutant]}</td>
                  <td>{row.T}</td>
                  <td>{row.AH}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {filteredData.length > rowsPerPage && (
          <div className="pagination">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PollutantPageDetail;