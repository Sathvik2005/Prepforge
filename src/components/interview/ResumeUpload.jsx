import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

/**
 * Resume Upload Component
 * Handles drag-drop upload, parsing, and ATS score display
 */

export default function ResumeUpload({ userId, onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [parsedResume, setParsedResume] = useState(null);
  const [atsScore, setAtsScore] = useState(null);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) {
      toast.error('Please upload a PDF or DOC/DOCX file');
      return;
    }

    const file = acceptedFiles[0];
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('userId', userId);

      const response = await axios.post('/api/interview-prep/upload-resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        setParsedResume(response.data.resume);
        setAtsScore(response.data.resume.atsScore);
        toast.success('Resume parsed successfully!');
        
        if (onUploadComplete) {
          onUploadComplete(response.data.resume);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.error || 'Failed to upload resume');
    } finally {
      setUploading(false);
    }
  }, [userId, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <p className="text-gray-600">Parsing resume...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-12 h-12 text-gray-400" />
            <div>
              <p className="text-lg font-medium text-gray-700">
                {isDragActive ? 'Drop your resume here' : 'Upload your resume'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Drag & drop or click to browse (PDF, DOC, DOCX)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ATS Score Display */}
      {atsScore && (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">ATS Score Analysis</h3>
            <div className="flex items-center gap-2">
              <div className={`text-3xl font-bold ${
                atsScore.totalScore >= 80 ? 'text-green-600' :
                atsScore.totalScore >= 60 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {atsScore.totalScore}
              </div>
              <span className="text-gray-500">/100</span>
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-700">Score Breakdown</h4>
            
            {Object.entries(atsScore.componentScores).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').replace('Score', '')}
                  </span>
                  <span className="font-medium">{value}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      value >= 80 ? 'bg-green-500' :
                      value >= 60 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Strengths */}
          {atsScore.scoreExplanation?.strengths?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold text-gray-700">Strengths</h4>
              </div>
              <ul className="list-disc list-inside space-y-1">
                {atsScore.scoreExplanation.strengths.map((strength, idx) => (
                  <li key={idx} className="text-sm text-gray-600">{strength}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {atsScore.scoreExplanation?.weaknesses?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <h4 className="font-semibold text-gray-700">Areas to Improve</h4>
              </div>
              <ul className="list-disc list-inside space-y-1">
                {atsScore.scoreExplanation.weaknesses.map((weakness, idx) => (
                  <li key={idx} className="text-sm text-gray-600">{weakness}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          {atsScore.scoreExplanation?.suggestions?.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Recommendations</h4>
              <ul className="list-disc list-inside space-y-1">
                {atsScore.scoreExplanation.suggestions.map((suggestion, idx) => (
                  <li key={idx} className="text-sm text-blue-800">{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Formula Explanation */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <details className="cursor-pointer">
              <summary className="text-sm font-medium text-gray-700">
                How is the ATS score calculated?
              </summary>
              <div className="mt-3 text-sm text-gray-600 space-y-2">
                <p>The ATS (Applicant Tracking System) score is calculated using a transparent weighted formula:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>Skills (30%):</strong> Total technical skills / 20 × 100</li>
                  <li><strong>Experience (25%):</strong> Years of experience / 5 × 100</li>
                  <li><strong>Education (20%):</strong> 100 if degree present, 60 if education listed, 0 otherwise</li>
                  <li><strong>Structure (15%):</strong> Presence of standard resume sections</li>
                  <li><strong>Keywords (10%):</strong> Word count optimization (300-800 words ideal)</li>
                </ul>
                <p className="mt-2 text-xs italic">
                  Total Score = (Skills × 0.30) + (Experience × 0.25) + (Education × 0.20) + (Structure × 0.15) + (Keywords × 0.10)
                </p>
              </div>
            </details>
          </div>
        </div>
      )}

      {/* Parsed Data Preview */}
      {parsedResume && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Extracted Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {/* Contact */}
            {parsedResume.parsedData?.contact && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Contact</h4>
                <p className="text-gray-600">{parsedResume.parsedData.contact.name}</p>
                <p className="text-gray-600">{parsedResume.parsedData.contact.email}</p>
                <p className="text-gray-600">{parsedResume.parsedData.contact.phone}</p>
              </div>
            )}

            {/* Skills */}
            {parsedResume.parsedData?.skills && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.values(parsedResume.parsedData.skills)
                    .flat()
                    .slice(0, 10)
                    .map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                      >
                        {skill}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
