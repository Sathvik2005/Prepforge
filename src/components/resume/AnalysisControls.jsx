import { useState } from 'react';
import { Info, Sliders } from 'lucide-react';

/**
 * Analysis Controls Component
 * Provides sliders for temperature and max tokens with tooltips
 */

const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 1000;

export default function AnalysisControls({ 
  temperature = DEFAULT_TEMPERATURE, 
  maxTokens = DEFAULT_MAX_TOKENS,
  onTemperatureChange,
  onMaxTokensChange,
  disabled = false 
}) {
  const [showTemperatureTooltip, setShowTemperatureTooltip] = useState(false);
  const [showTokensTooltip, setShowTokensTooltip] = useState(false);

  const handleTemperatureChange = (e) => {
    const value = parseFloat(e.target.value);
    if (onTemperatureChange) {
      onTemperatureChange(value);
    }
  };

  const handleMaxTokensChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (onMaxTokensChange) {
      onMaxTokensChange(value);
    }
  };

  const getTemperatureDescription = (temp) => {
    if (temp <= 0.3) return 'Very focused and deterministic';
    if (temp <= 0.5) return 'Focused with some variation';
    if (temp <= 0.7) return 'Balanced creativity and focus';
    if (temp <= 0.9) return 'Creative and varied';
    return 'Very creative and unpredictable';
  };

  const getTokensDescription = (tokens) => {
    if (tokens <= 500) return 'Short responses';
    if (tokens <= 1500) return 'Medium-length responses';
    if (tokens <= 2500) return 'Detailed responses';
    return 'Very detailed responses';
  };

  return (
    <div className="space-y-6 p-4 bg-white/5 rounded-lg border border-white/20 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Sliders className="w-5 h-5 text-gray-300" aria-hidden="true" />
        <h3 className="text-lg font-semibold text-white">Generation Settings</h3>
      </div>

      {/* Temperature Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="temperature-slider" className="text-sm font-medium text-gray-200 flex items-center gap-2">
            Temperature: {temperature.toFixed(2)}
            <button
              type="button"
              onMouseEnter={() => setShowTemperatureTooltip(true)}
              onMouseLeave={() => setShowTemperatureTooltip(false)}
              onFocus={() => setShowTemperatureTooltip(true)}
              onBlur={() => setShowTemperatureTooltip(false)}
              className="text-gray-400 hover:text-gray-200"
              aria-label="Temperature information"
            >
              <Info className="w-4 h-4" aria-hidden="true" />
            </button>
          </label>
          <span className="text-xs text-gray-400">{getTemperatureDescription(temperature)}</span>
        </div>

        <input
          id="temperature-slider"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={temperature}
          onChange={handleTemperatureChange}
          disabled={disabled}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed accent-royal-500"
          aria-valuemin={0}
          aria-valuemax={1}
          aria-valuenow={temperature}
          aria-describedby="temperature-help"
        />

        {showTemperatureTooltip && (
          <div className="p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg border border-white/10" id="temperature-help" role="tooltip">
            <p className="font-semibold mb-1">Temperature Controls Creativity</p>
            <p>Lower values (0.0-0.3): More focused and deterministic outputs</p>
            <p>Medium values (0.4-0.7): Balanced between creativity and consistency</p>
            <p>Higher values (0.8-1.0): More creative and varied outputs</p>
          </div>
        )}

        <div className="flex justify-between text-xs text-gray-400">
          <span>Focused</span>
          <span>Creative</span>
        </div>
      </div>

      {/* Max Tokens Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="tokens-slider" className="text-sm font-medium text-gray-200 flex items-center gap-2">
            Max Tokens: {maxTokens.toLocaleString()}
            <button
              type="button"
              onMouseEnter={() => setShowTokensTooltip(true)}
              onMouseLeave={() => setShowTokensTooltip(false)}
              onFocus={() => setShowTokensTooltip(true)}
              onBlur={() => setShowTokensTooltip(false)}
              className="text-gray-400 hover:text-gray-200"
              aria-label="Max tokens information"
            >
              <Info className="w-4 h-4" aria-hidden="true" />
            </button>
          </label>
          <span className="text-xs text-gray-400">{getTokensDescription(maxTokens)}</span>
        </div>

        <input
          id="tokens-slider"
          type="range"
          min="100"
          max="4000"
          step="100"
          value={maxTokens}
          onChange={handleMaxTokensChange}
          disabled={disabled}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed accent-royal-500"
          aria-valuemin={100}
          aria-valuemax={4000}
          aria-valuenow={maxTokens}
          aria-describedby="tokens-help"
        />

        {showTokensTooltip && (
          <div className="p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg border border-white/10" id="tokens-help" role="tooltip">
            <p className="font-semibold mb-1">Max Tokens Controls Response Length</p>
            <p>Lower values (100-500): Shorter, more concise responses</p>
            <p>Medium values (500-2000): Balanced detail and brevity</p>
            <p>Higher values (2000-4000): Longer, more comprehensive responses</p>
            <p className="mt-2 text-gray-300">Note: ~4 characters = 1 token (approximate)</p>
          </div>
        )}

        <div className="flex justify-between text-xs text-gray-400">
          <span>Brief</span>
          <span>Detailed</span>
        </div>
      </div>

      {/* Reset Button */}
      <button
        type="button"
        onClick={() => {
          if (onTemperatureChange) onTemperatureChange(DEFAULT_TEMPERATURE);
          if (onMaxTokensChange) onMaxTokensChange(DEFAULT_MAX_TOKENS);
        }}
        disabled={disabled}
        className="w-full px-4 py-2 text-sm text-gray-200 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Reset to Defaults
      </button>
    </div>
  );
}
