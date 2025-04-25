import './PollutantTabs.css';

const pollutants = [
  { name: 'CO(GT)', color: '#8dd3c7' },
  { name: 'PT08.S1(CO)', color: '#8dd3c7' },
  { name: 'NMHC(GT)', color: '#bebada' },
  { name: 'C6H6(GT)', color: '#b15928' },
  { name: 'PT08.S2(NMHC)', color: '#bebada' },
  { name: 'NOx(GT)', color: '#fdb462' },
  { name: 'PT08.S3(NOx)', color: '#fdb462' },
  { name: 'NO2(GT)', color: '#fb8072' },
  { name: 'PT08.S4(NO2)', color: '#fb8072' },
  { name: 'PT08.S5(O3)', color: '#80b1d3' }
];


const PollutantTabs = () => (
  <div className="pollutant-tabs">
    {pollutants.map((p, index) => (
      <div key={index} className="pollutant-tab" style={{ backgroundColor: p.color }}>
        {p.name}
      </div>
    ))}
  </div>
);

export default PollutantTabs;
