import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './VisualizePage.css';

const cards = [
  {
    route: '/visualize/barchart',
    image: '/icons/barchart.png',
    alt: 'Trend',
    title: 'Bar Chart'
  },
  {
    route: '/visualize/zoomablechart',
    image: '/icons/zoomablechart-new.png',
    alt: 'Zoomable Chart',
    title: 'Zoomable Chart'
  },
  {
    route: '/visualize/stackedareachart',
    image: '/icons/stackedareachart.png',
    alt: 'Stacked Area Chart',
    title: 'Stacked Area Chart'
  }
];

const VisualizePage = () => {
  const location = useLocation();
  const { file, fileName } = location.state || {}; // Extract file and fileName from state
  const navigate = useNavigate();

  // State for adjusting the button size
  const [buttonWidth, setButtonWidth] = useState(360);
  const [buttonHeight, setButtonHeight] = useState(460);

  const handleClick = (route) => {
    // Navigate to the new route and pass the file and fileName in the state
    navigate(route, { state: { file, fileName } });
  };

  return (
    <div className="visualize-container">
      <h2 className="visualize-heading">Choose a Visualization</h2>

      <div className="image-button-grid">
        {cards.map((card, index) => (
          <button
            key={index}
            className="image-button-custom"
            onClick={() => handleClick(card.route)}
            aria-label={card.alt}
          >
            <img
              src={card.image}
              alt={card.alt}
              className="button-image"
              style={{
                width: buttonWidth,
                height: buttonHeight
              }}
            />
            <div className="button-title">{card.title}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default VisualizePage;
