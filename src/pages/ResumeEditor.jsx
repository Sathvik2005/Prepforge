import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Sparkles, Download, FileText, TrendingUp, Eye } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const ResumeEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiEnhancing, setAiEnhancing] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [atsResults, setAtsResults] = useState(null);
  const [showOptimization, setShowOptimization] = useState(false);

  useEffect(() => {
    fetchResume();
  }, [id]);

  const fetchResume = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/resumes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResume(response.data.resume);
    } catch (error) {
      console.error('Fetch resume error:', error);
      toast.error('Failed to load resume');
      navigate('/resume-builder');
    } finally {
      setLoading(false);
    }
  };

  const saveResume = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/resumes/${id}`,
        resume,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success('Resume saved!');
    } catch (error) {
      console.error('Save resume error:', error);
      toast.error('Failed to save resume');
    } finally {
      setSaving(false);
    }
  };

  const enhanceBulletPoint = async (bulletPoint, index, section, sectionIndex) => {
    try {
      setAiEnhancing(true);
      const token = localStorage.getItem('token');
      
      const context = section === 'experience' ? {
        position: resume.experience[sectionIndex]?.position,
        company: resume.experience[sectionIndex]?.company,
      } : {};

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/resumes/ai/enhance-bullet`,
        { bulletPoint, context },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.aiGenerated) {
        const newResume = { ...resume };
        newResume[section][sectionIndex].bulletPoints[index] = response.data.enhanced;
        setResume(newResume);
        toast.success('✨ Bullet point enhanced!');
      } else {
        toast('AI enhancement not available');
      }
    } catch (error) {
      console.error('Enhance error:', error);
      toast.error('Failed to enhance bullet point');
    } finally {
      setAiEnhancing(false);
    }
  };

  const generateSummary = async () => {
    try {
      setAiEnhancing(true);
      const token = localStorage.getItem('token');
      
      const profile = {
        name: resume.personalInfo.fullName,
        position: resume.experience[0]?.position,
        yearsExperience: resume.experience.length > 0 ? Math.max(...resume.experience.map(e => 
          (new Date(e.endDate || new Date()) - new Date(e.startDate)) / (1000 * 60 * 60 * 24 * 365)
        )).toFixed(0) : '0',
        skills: resume.skills.technical,
      };

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/resumes/ai/generate-summary`,
        { profile },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.aiGenerated) {
        setResume({ ...resume, summary: response.data.summary });
        toast.success('✨ Summary generated!');
      } else {
        toast('AI generation not available');
      }
    } catch (error) {
      console.error('Generate summary error:', error);
      toast.error('Failed to generate summary');
    } finally {
      setAiEnhancing(false);
    }
  };

  const optimizeForJob = async () => {
    if (!jobDescription.trim()) {
      toast.error('Please enter a job description');
      return;
    }

    try {
      setAiEnhancing(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/resumes/${id}/optimize`,
        { jobDescription },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setAtsResults(response.data);
      setShowOptimization(true);
      toast.success('Resume optimized for job!');
    } catch (error) {
      console.error('Optimize error:', error);
      toast.error('Failed to optimize resume');
    } finally {
      setAiEnhancing(false);
    }
  };

  const updateField = (path, value) => {
    const newResume = { ...resume };
    const keys = path.split('.');
    let current = newResume;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (current[keys[i]] === undefined) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setResume(newResume);
  };

  const addExperience = () => {
    setResume({
      ...resume,
      experience: [
        ...resume.experience,
        {
          company: '',
          position: '',
          startDate: new Date(),
          isCurrent: false,
          bulletPoints: [''],
        },
      ],
    });
  };

  const addProject = () => {
    setResume({
      ...resume,
      projects: [
        ...resume.projects,
        {
          name: '',
          description: '',
          technologies: [],
          bulletPoints: [''],
        },
      ],
    });
  };

  if (loading || !resume) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/resume-builder')}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft size={24} />
            </button>
            <input
              type="text"
              value={resume.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="text-2xl font-bold bg-transparent border-none outline-none"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowOptimization(!showOptimization)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded"
            >
              <TrendingUp size={18} />
              ATS Optimize
            </button>
            <button
              onClick={saveResume}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded">
              <Download size={18} />
              Export PDF
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Editor */}
        <div className="flex-1 p-8 overflow-y-auto">
          {/* Personal Info */}
          <section className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Personal Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Full Name"
                value={resume.personalInfo.fullName}
                onChange={(e) => updateField('personalInfo.fullName', e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-2"
              />
              <input
                type="email"
                placeholder="Email"
                value={resume.personalInfo.email}
                onChange={(e) => updateField('personalInfo.email', e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-2"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={resume.personalInfo.phone || ''}
                onChange={(e) => updateField('personalInfo.phone', e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-2"
              />
              <input
                type="text"
                placeholder="Location"
                value={resume.personalInfo.location || ''}
                onChange={(e) => updateField('personalInfo.location', e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded px-3 py-2"
              />
            </div>
          </section>

          {/* Summary */}
          <section className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Professional Summary</h2>
              <button
                onClick={generateSummary}
                disabled={aiEnhancing}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-sm disabled:opacity-50"
              >
                <Sparkles size={16} />
                AI Generate
              </button>
            </div>
            <textarea
              placeholder="A brief summary of your professional background..."
              value={resume.summary || ''}
              onChange={(e) => updateField('summary', e.target.value)}
              rows={4}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
            />
          </section>

          {/* Experience */}
          <section className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Work Experience</h2>
              <button
                onClick={addExperience}
                className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
              >
                + Add
              </button>
            </div>
            
            {resume.experience.map((exp, idx) => (
              <div key={idx} className="mb-6 pb-6 border-b border-gray-700 last:border-0">
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <input
                    type="text"
                    placeholder="Company"
                    value={exp.company}
                    onChange={(e) => updateField(`experience.${idx}.company`, e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="Position"
                    value={exp.position}
                    onChange={(e) => updateField(`experience.${idx}.position`, e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded px-3 py-2"
                  />
                </div>
                
                <div className="space-y-2">
                  {exp.bulletPoints?.map((bullet, bIdx) => (
                    <div key={bIdx} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Achievement or responsibility"
                        value={bullet}
                        onChange={(e) => {
                          const newBullets = [...exp.bulletPoints];
                          newBullets[bIdx] = e.target.value;
                          updateField(`experience.${idx}.bulletPoints`, newBullets);
                        }}
                        className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2"
                      />
                      <button
                        onClick={() => enhanceBulletPoint(bullet, bIdx, 'experience', idx)}
                        disabled={aiEnhancing}
                        className="bg-purple-600 hover:bg-purple-700 p-2 rounded disabled:opacity-50"
                        title="AI Enhance"
                      >
                        <Sparkles size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {/* Projects */}
          <section className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Projects</h2>
              <button
                onClick={addProject}
                className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
              >
                + Add
              </button>
            </div>
            
            {resume.projects.map((proj, idx) => (
              <div key={idx} className="mb-4 pb-4 border-b border-gray-700 last:border-0">
                <input
                  type="text"
                  placeholder="Project Name"
                  value={proj.name}
                  onChange={(e) => updateField(`projects.${idx}.name`, e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mb-2"
                />
                <textarea
                  placeholder="Project description"
                  value={proj.description || ''}
                  onChange={(e) => updateField(`projects.${idx}.description`, e.target.value)}
                  rows={2}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                />
              </div>
            ))}
          </section>
        </div>

        {/* Optimization Sidebar */}
        {showOptimization && (
          <div className="w-96 bg-gray-800 border-l border-gray-700 p-6 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">ATS Optimization</h2>
            
            <textarea
              placeholder="Paste job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={6}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mb-4"
            />
            
            <button
              onClick={optimizeForJob}
              disabled={aiEnhancing}
              className="w-full bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded mb-6 disabled:opacity-50"
            >
              {aiEnhancing ? 'Analyzing...' : 'Analyze Match'}
            </button>

            {atsResults && (
              <div className="space-y-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Overall ATS Score</div>
                  <div className="text-3xl font-bold text-white mb-2">
                    {atsResults.atsScore.overall}%
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        atsResults.atsScore.overall >= 80 ? 'bg-green-500' :
                        atsResults.atsScore.overall >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${atsResults.atsScore.overall}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Matched Keywords ({atsResults.matchedKeywords?.length || 0})</h3>
                  <div className="flex flex-wrap gap-2">
                    {atsResults.matchedKeywords?.slice(0, 10).map((kw, idx) => (
                      <span key={idx} className="bg-green-600 text-white px-2 py-1 rounded text-xs">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Missing Keywords ({atsResults.missingKeywords?.length || 0})</h3>
                  <div className="flex flex-wrap gap-2">
                    {atsResults.missingKeywords?.slice(0, 10).map((kw, idx) => (
                      <span key={idx} className="bg-red-600 text-white px-2 py-1 rounded text-xs">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                {atsResults.suggestions?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">AI Suggestions</h3>
                    <ul className="space-y-2">
                      {atsResults.suggestions.map((sugg, idx) => (
                        <li key={idx} className="text-sm text-gray-300 flex gap-2">
                          <span className="text-purple-400">•</span>
                          <span>{sugg.suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeEditor;
