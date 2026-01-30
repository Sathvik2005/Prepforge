import { useState, useEffect } from 'react';
import { Plus, FileText, Trash2, Copy, Star, Download, Zap, TrendingUp } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const ResumeBuilder = () => {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/resumes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResumes(response.data.resumes);
    } catch (error) {
      console.error('Fetch resumes error:', error);
      toast.error('Failed to load resumes');
    } finally {
      setLoading(false);
    }
  };

  const createNewResume = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/resumes`,
        {
          title: 'My Resume',
          personalInfo: {
            fullName: user.name || '',
            email: user.email || '',
          },
          templateId: 'modern',
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      toast.success('Resume created!');
      navigate(`/resume-editor/${response.data.resume._id}`);
    } catch (error) {
      console.error('Create resume error:', error);
      toast.error('Failed to create resume');
    }
  };

  const deleteResume = async (id) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/resumes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      toast.success('Resume deleted');
      fetchResumes();
    } catch (error) {
      console.error('Delete resume error:', error);
      toast.error('Failed to delete resume');
    }
  };

  const duplicateResume = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/resumes/${id}/duplicate`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      toast.success('Resume duplicated');
      fetchResumes();
    } catch (error) {
      console.error('Duplicate resume error:', error);
      toast.error('Failed to duplicate resume');
    }
  };

  const setPrimary = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/resumes/${id}/set-primary`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      toast.success('Primary resume updated');
      fetchResumes();
    } catch (error) {
      console.error('Set primary error:', error);
      toast.error('Failed to update primary resume');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">AI Resume Builder</h1>
          <p className="text-gray-400 mt-1">Create ATS-optimized resumes powered by GPT-4</p>
        </div>
        <button
          onClick={createNewResume}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          <Plus size={20} />
          New Resume
        </button>
      </div>

      {/* Features Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="text-yellow-400" size={24} />
          AI-Powered Features
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
          <div className="flex items-start gap-3">
            <div className="bg-blue-700 rounded-lg p-2">
              <FileText size={20} />
            </div>
            <div>
              <h4 className="font-semibold">Smart Enhancement</h4>
              <p className="text-sm text-blue-200">AI-powered bullet points with metrics</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-purple-700 rounded-lg p-2">
              <TrendingUp size={20} />
            </div>
            <div>
              <h4 className="font-semibold">ATS Optimization</h4>
              <p className="text-sm text-purple-200">Keyword matching & scoring</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-indigo-700 rounded-lg p-2">
              <Download size={20} />
            </div>
            <div>
              <h4 className="font-semibold">Multiple Templates</h4>
              <p className="text-sm text-indigo-200">Professional designs & PDF export</p>
            </div>
          </div>
        </div>
      </div>

      {/* Resume List */}
      {resumes.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-12 text-center">
          <FileText size={64} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No resumes yet</h3>
          <p className="text-gray-400 mb-6">Create your first AI-powered resume to get started</p>
          <button
            onClick={createNewResume}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2"
          >
            <Plus size={20} />
            Create Resume
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resumes.map((resume) => (
            <div
              key={resume._id}
              className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors cursor-pointer relative group"
              onClick={() => navigate(`/resume-editor/${resume._id}`)}
            >
              {/* Primary Badge */}
              {resume.isPrimary && (
                <div className="absolute top-4 right-4">
                  <div className="bg-yellow-500 text-gray-900 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                    <Star size={12} />
                    Primary
                  </div>
                </div>
              )}

              {/* Icon */}
              <div className="bg-blue-600 rounded-lg p-4 w-16 h-16 flex items-center justify-center mb-4">
                <FileText size={32} className="text-white" />
              </div>

              {/* Title */}
              <h3 className="text-xl font-semibold text-white mb-2">{resume.title}</h3>
              
              {/* Template */}
              <div className="text-sm text-gray-400 mb-4">
                <span className="capitalize">{resume.templateId}</span> Template
              </div>

              {/* ATS Score */}
              {resume.atsScore?.overall > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-400">ATS Score</span>
                    <span className={`font-semibold ${
                      resume.atsScore.overall >= 80 ? 'text-green-400' :
                      resume.atsScore.overall >= 60 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {resume.atsScore.overall}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        resume.atsScore.overall >= 80 ? 'bg-green-500' :
                        resume.atsScore.overall >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${resume.atsScore.overall}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="bg-gray-700 rounded p-2">
                  <div className="text-lg font-bold text-white">{resume.experience?.length || 0}</div>
                  <div className="text-xs text-gray-400">Experience</div>
                </div>
                <div className="bg-gray-700 rounded p-2">
                  <div className="text-lg font-bold text-white">{resume.projects?.length || 0}</div>
                  <div className="text-xs text-gray-400">Projects</div>
                </div>
                <div className="bg-gray-700 rounded p-2">
                  <div className="text-lg font-bold text-white">{resume.education?.length || 0}</div>
                  <div className="text-xs text-gray-400">Education</div>
                </div>
              </div>

              {/* Last Updated */}
              <div className="text-xs text-gray-500 mb-4">
                Updated {new Date(resume.updatedAt).toLocaleDateString()}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {!resume.isPrimary && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPrimary(resume._id);
                    }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm flex items-center justify-center gap-1"
                  >
                    <Star size={14} />
                    Set Primary
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateResume(resume._id);
                  }}
                  className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded"
                  title="Duplicate"
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteResume(resume._id);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white p-2 rounded"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResumeBuilder;
