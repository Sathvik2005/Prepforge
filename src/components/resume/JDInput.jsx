import { useState } from 'react';
import { Link as LinkIcon, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';
import apiClient from '../../config/axios';

/**
 * Job Description Input Component
 * Allows manual entry or auto-fill from job posting URL
 */

export default function JDInput({ value, onChange, disabled = false }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [urlError, setUrlError] = useState(null);

  const validateUrl = (urlString) => {
    try {
      const urlObj = new URL(urlString);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleAutoFill = async () => {
    setUrlError(null);
    
    if (!url.trim()) {
      setUrlError('Please enter a URL');
      showError('Please enter a URL');
      return;
    }

    if (!validateUrl(url)) {
      setUrlError('Please enter a valid URL (must start with http:// or https://)');
      showError('Invalid URL format');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/resume-genome/auto-fill-jd', { url });
      const jobDescription = response.data.data;
      
      if (jobDescription && jobDescription.trim()) {
        onChange(jobDescription);
        showSuccess('Job description extracted successfully');
        setUrl(''); // Clear URL input after successful extraction
      } else {
        showError('Could not extract job description from URL');
        setUrlError('Failed to extract job description');
      }
    } catch (error) {
      console.error('Auto-fill error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to extract job description';
      showError(errorMessage);
      setUrlError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUrlKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleAutoFill();
    }
  };

  const handleTextChange = (e) => {
    onChange(e.target.value);
    setUrlError(null);
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-200">
        Job Description (Optional)
      </label>

      {/* URL Auto-Fill Section */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setUrlError(null);
              }}
              onKeyPress={handleUrlKeyPress}
              placeholder="Paste job posting URL to auto-fill"
              className={`w-full px-3 py-2 bg-white/10 border rounded-lg focus:ring-2 focus:ring-royal-500 focus:border-transparent text-white placeholder-gray-400 ${
                urlError ? 'border-red-400' : 'border-white/20'
              }`}
              disabled={disabled || loading}
              aria-label="Job posting URL"
              aria-describedby={urlError ? 'url-error' : 'url-help'}
            />
            <p id="url-help" className="mt-1 text-xs text-gray-400">
              Supports LinkedIn, Indeed, and other job boards
            </p>
          </div>
          <button
            type="button"
            onClick={handleAutoFill}
            disabled={disabled || loading || !url.trim()}
            className="px-4 py-2 bg-gradient-to-r from-royal-600 to-purple-600 text-white rounded-lg hover:from-royal-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            aria-label="Extract job description from URL"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Loading...</span>
              </>
            ) : (
              <>
                <LinkIcon className="w-4 h-4" aria-hidden="true" />
                <span>Auto-Fill</span>
              </>
            )}
          </button>
        </div>

        {urlError && (
          <div className="flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg" role="alert" id="url-error">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-red-300">{urlError}</p>
          </div>
        )}
      </div>

      {/* Manual Text Area */}
      <div className="relative">
        <textarea
          value={value}
          onChange={handleTextChange}
          placeholder="Or paste/type the job description here..."
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-royal-500 focus:border-transparent resize-y min-h-[150px] text-white placeholder-gray-400"
          disabled={disabled}
          aria-label="Job description text"
          aria-describedby="jd-help"
        />
        <p id="jd-help" className="mt-1 text-xs text-gray-400">
          Providing a job description enables tailored analysis, cover letter, and interview questions
        </p>
        
        {value && value.trim() && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-xs text-green-300">
            <CheckCircle className="w-3 h-3" aria-hidden="true" />
            <span>{value.trim().split(/\s+/).length} words</span>
          </div>
        )}
      </div>
    </div>
  );
}
