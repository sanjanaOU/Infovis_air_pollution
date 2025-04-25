// IMPORTS
import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import * as d3 from 'd3';

// POLLUTANTS
const pollutantKeys = ["CO(GT)", "C6H6(GT)", "NMHC(GT)", "NO2(GT)", "PT08.S5(O3)", "NOx(GT)"];
const pollutantNames = ["CO", "C6H6", "NMHC", "NO2", "PT08.S5(O3)", "NOx"];
const monthNameMap = {
  "01": "January", "02": "February", "03": "March", "04": "April",
  "05": "May", "06": "June", "07": "July", "08": "August",
  "09": "September", "10": "October", "11": "November", "12": "December"
};

const pollutantBreakpoints = {
  CO: [{ index: [0, 50], range: [0.0, 4.4] }, { index: [51, 100], range: [4.5, 9.4] }, { index: [101, 150], range: [9.5, 12.4] }, { index: [151, 200], range: [12.5, 15.4] }, { index: [201, 300], range: [15.5, 30.4] }, { index: [301, 500], range: [30.5, 50.4] }],
  NO2: [{ index: [0, 50], range: [0, 53] }, { index: [51, 100], range: [54, 100] }, { index: [101, 150], range: [101, 360] }, { index: [151, 200], range: [361, 649] }, { index: [201, 300], range: [650, 1249] }, { index: [301, 500], range: [1250, 2049] }],
  NOx: [{ index: [0, 50], range: [0, 60] }, { index: [51, 100], range: [61, 120] }, { index: [101, 150], range: [121, 180] }, { index: [151, 200], range: [181, 240] }, { index: [201, 300], range: [241, 300] }, { index: [301, 500], range: [301, 500] }],
  C6H6: [{ index: [0, 50], range: [0.0, 5.0] }, { index: [51, 100], range: [5.1, 10.0] }, { index: [101, 150], range: [10.1, 15.0] }, { index: [151, 200], range: [15.1, 20.0] }, { index: [201, 300], range: [20.1, 25.0] }, { index: [301, 500], range: [25.1, 40.0] }],
  NMHC: [{ index: [0, 50], range: [0.0, 100] }, { index: [51, 100], range: [101, 200] }, { index: [101, 150], range: [201, 300] }, { index: [151, 200], range: [301, 400] }, { index: [201, 300], range: [401, 600] }, { index: [301, 500], range: [601, 800] }],
  "PT08.S5(O3)": [{ index: [0, 50], range: [0, 500] }, { index: [51, 100], range: [501, 700] }, { index: [101, 150], range: [701, 900] }, { index: [151, 200], range: [901, 1100] }, { index: [201, 300], range: [1101, 1300] }, { index: [301, 500], range: [1301, 1600] }]
};

// GAUGE DRAW FUNCTION
const drawGauge = (el, aqi) => {
  const svg = d3.select(el);
  svg.selectAll('*').remove();
  const width = 160, height = 150, radius = 70;
  const centerX = width / 2, centerY = radius + 10;
  const scale = d3.scaleLinear().domain([0, 500]).range([-Math.PI / 2, Math.PI / 2]);

  const zones = [
    { limit: 50, color: '#00e400' }, { limit: 100, color: '#ffff00' },
    { limit: 150, color: '#ff7e00' }, { limit: 200, color: '#ff0000' },
    { limit: 300, color: '#8f3f97' }, { limit: 500, color: '#7e0023' }
  ];

  let cum = 0;
  const g = svg.append('g').attr('transform', `translate(${centerX},${centerY})`);
  g.selectAll('path')
    .data(zones.map(z => { const d = { startAngle: scale(cum), endAngle: scale(z.limit), color: z.color }; cum = z.limit; return d; }))
    .enter().append('path')
    .attr('d', d3.arc().innerRadius(radius - 15).outerRadius(radius).startAngle(d => d.startAngle).endAngle(d => d.endAngle))
    .attr('fill', d => d.color);

  g.selectAll("text.tick")
    .data([0, 50, 100, 150, 200, 300, 500])
    .enter().append("text")
    .attr("x", d => (radius + 5) * Math.cos(scale(d) - Math.PI / 2))
    .attr("y", d => (radius + 5) * Math.sin(scale(d) - Math.PI / 2))
    .attr("text-anchor", "middle").attr("font-size", "10px").attr("font-weight", "bold").text(d => d);

  g.append("line")
    .attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", -radius + 20)
    .attr("stroke", "black").attr("stroke-width", 3)
    .attr("transform", `rotate(0)`)
    .transition().duration(1000)
    .attr("transform", `rotate(${scale(Math.min(500, aqi)) * 180 / Math.PI})`);

  g.append("circle").attr("r", 5).attr("fill", "black");

  svg.append("text")
    .attr("x", centerX).attr("y", height - 5)
    .attr("text-anchor", "middle").attr("font-size", "14px")
    .attr("font-weight", "bold").text(`AQI: ${aqi}`);
};

// MAIN COMPONENT
const AQIPage = () => {
  const location = useLocation();
  const file = location?.state?.file;
  const [rawData, setRawData] = useState([]);
  const [aqiValues, setAqiValues] = useState({});
  const [avgAQI, setAvgAQI] = useState(null);
  const [years, setYears] = useState([]);
  const [months, setMonths] = useState([]);
  const [days, setDays] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const gaugeRefs = useRef({});
  const avgGaugeRef = useRef(null);

  const computeAQI = (pollutant, C) => {
    const bps = pollutantBreakpoints[pollutant] || [];
    for (let bp of bps) {
      const [I_low, I_high] = bp.index;
      const [C_low, C_high] = bp.range;
      if (C >= C_low && C <= C_high) {
        return Math.round(((I_high - I_low) / (C_high - C_low)) * (C - C_low) + I_low);
      }
    }
    return 500;
  };

  useEffect(() => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const data = d3.csvParse(text);
      const parsed = data.map(row => {
        const [m, d, y] = row.Date.split("/");
        return { ...row, _year: y, _month: m.padStart(2, '0'), _day: d.padStart(2, '0') };
      });
      setRawData(parsed);
      setYears([...new Set(parsed.map(r => r._year))].sort());
    };
    reader.readAsText(file);
  }, [file]);

  useEffect(() => {
    if (!selectedYear || !rawData.length) return;
    const filtered = rawData.filter(r => r._year === selectedYear);
    setMonths([...new Set(filtered.map(r => r._month))].sort());
    setSelectedMonth(""); setSelectedDay(""); setDays([]);
  }, [selectedYear, rawData]);

  useEffect(() => {
    if (!selectedYear || !selectedMonth || !rawData.length) return;
    const filtered = rawData.filter(r => r._year === selectedYear && r._month === selectedMonth);
    setDays([...new Set(filtered.map(r => r._day))].sort());
    setSelectedDay("");
  }, [selectedMonth, selectedYear, rawData]);

  useEffect(() => {
    if (!rawData.length) return;

    if (!selectedYear && !selectedMonth && !selectedDay) {
      const zeroMap = {};
      pollutantNames.forEach(name => { zeroMap[name] = 0; });
      setAqiValues(zeroMap);
      setAvgAQI(0);
      return;
    }

    let filtered = rawData;
    if (selectedYear) filtered = filtered.filter(r => r._year === selectedYear);
    if (selectedMonth) filtered = filtered.filter(r => r._month === selectedMonth);
    if (selectedDay) filtered = filtered.filter(r => r._day === selectedDay);

    const aqiMap = {};
    const aqiAll = [];
    pollutantKeys.forEach((key, idx) => {
      const values = filtered.map(r => parseFloat(r[key])).filter(v => !isNaN(v));
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const aqi = computeAQI(pollutantNames[idx], mean);
      aqiMap[pollutantNames[idx]] = aqi;
      aqiAll.push(aqi);
    });
    setAqiValues(aqiMap);
    setAvgAQI(Math.round(aqiAll.reduce((a, b) => a + b, 0) / aqiAll.length));
  }, [rawData, selectedYear, selectedMonth, selectedDay]);

  useEffect(() => {
    pollutantNames.forEach(name => {
      const ref = gaugeRefs.current[name];
      if (ref) drawGauge(ref, aqiValues[name] || 0);
    });
    if (avgGaugeRef.current && avgAQI !== null) {
      drawGauge(avgGaugeRef.current, avgAQI);
    }
  }, [aqiValues, avgAQI]);

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>Air Quality Index (AQI) for Pollutants</h2>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Dropdown label="Year" value={selectedYear} options={years.map(y => ({ key: y, label: y }))} onChange={setSelectedYear} />
          <Dropdown label="Month" value={selectedMonth} options={months.map(m => ({ key: m, label: monthNameMap[m] || m }))} onChange={setSelectedMonth} disabled={!selectedYear} />
          <Dropdown label="Day" value={selectedDay} options={days.map(d => ({ key: d, label: d }))} onChange={setSelectedDay} disabled={!selectedMonth} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
        <div style={{
          ...cardStyle,
          width: '250px',
          height: '250px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px'
        }}>
          <h4 style={{ fontSize: '1.2rem', margin: 0 }}>Average AQI</h4>
          <svg ref={avgGaugeRef} width="170" height="150" />
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
        {pollutantNames.map(name => (
          <div key={name} style={cardStyle}>
            <h4>{name}</h4>
            <svg ref={el => gaugeRefs.current[name] = el} width="180" height="150" />
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center',
        flexWrap: 'wrap', gap: '10px'
      }}>
        {[
          { color: '#00e400', label: 'Good (0–50)' },
          { color: '#ffff00', label: 'Moderate (51–100)' },
          { color: '#ff7e00', label: 'Unhealthy (101–150)' },
          { color: '#ff0000', label: 'Unhealthy (151–200)' },
          { color: '#8f3f97', label: 'Very Unhealthy (201–300)' },
          { color: '#7e0023', label: 'Hazardous (301–500)' },
        ].map((z, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '25px', height: '15px', backgroundColor: z.color, borderRadius: '3px' }}></div>
            <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{z.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// REUSABLE DROPDOWN
const Dropdown = ({ label, value, onChange, options, disabled }) => (
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <label style={{ fontWeight: 'bold' }}>{label}:</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      style={{
        padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid #ccc',
        background: disabled ? '#f5f5f5' : 'linear-gradient(to right, #e0f7fa, #b2ebf2)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontSize: '1rem', color: '#333'
      }}
    >
      <option value="">--Select--</option>
      {options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
    </select>
  </div>
);

// GAUGE CARD STYLE
const cardStyle = {
  border: '1px solid #ccc',
  padding: '15px',
  width: '200px',
  borderRadius: '10px',
  backgroundColor: '#f4f4f4',
  boxShadow: '2px 2px 10px rgba(0,0,0,0.1)',
  textAlign: 'center'
};

export default AQIPage;
