import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Target, Edit3, Mail, MessageSquare, Download, Loader2, AlertCircle, Copy, Check, Sparkles } from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';
import apiClient from '../../config/axios';

/**
 * Results Tabs Component - Resume Analysis
 * Displays analysis results with dark theme and animations
 */

const TABS = [
  { id: 'parsed', label: 'Parsed', icon: FileText, color: 'from-blue-500 to-cyan-500' },
  { id: 'analysis', label: 'Analysis', icon: Target, color: 'from-purple-500 to-pink-500' },
  { id: 'rephrased', label: 'Rephrase', icon: Edit3, color: 'from-green-500 to-emerald-500' },
  { id: 'cover', label: 'Cover Letter', icon: Mail, color: 'from-orange-500 to-red-500' },
  { id: 'interview', label: 'Interview Q&A', icon: MessageSquare, color: 'from-indigo-500 to-purple-500' },
];

/**
 * Format analysis output with proper sections and styling
 */
const formatAnalysisOutput = (analysisText) => {
  if (!analysisText) return null;

  // Split by numbered sections (1., 2., etc.) or **SECTION HEADERS**
  const sectionRegex = /(?:^|\n)(?:(\d+)\.\s*\*\*([^*]+)\*\*|(\*\*[^*]+\*\*))/g;
  const sections = [];
  let lastIndex = 0;
  let match;

  while ((match = sectionRegex.exec(analysisText)) !== null) {
    // Add content before this match if it exists
    if (match.index > lastIndex) {
      const content = analysisText.slice(lastIndex, match.index).trim();
      if (content && sections.length > 0) {
        sections[sections.length - 1].content += '\n' + content;
      } else if (content) {
        sections.push({ title: 'Overview', content, icon: '📋' });
      }
    }

    // Add new section
    const title = match[2] || match[3]?.replace(/\*\*/g, '') || '';
    const icon = getSectionIcon(title);
    sections.push({ title: title.trim(), content: '', icon });
    lastIndex = sectionRegex.lastIndex;
  }

  // Add remaining content
  if (lastIndex < analysisText.length) {
    const remaining = analysisText.slice(lastIndex).trim();
    if (remaining) {
      if (sections.length > 0) {
        sections[sections.length - 1].content = remaining;
      } else {
        return (
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-6 rounded-xl border border-purple-500/30 backdrop-blur-sm">
            <div className="text-gray-200 leading-relaxed space-y-3">
              {analysisText.split('\n\n').map((para, i) => (
                <p key={i} className="whitespace-pre-wrap">{para}</p>
              ))}
            </div>
          </div>
        );
      }
    }
  }

  // If no sections found, show as-is with better formatting
  if (sections.length === 0) {
    return (
      <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-6 rounded-xl border border-purple-500/30 backdrop-blur-sm">
        <div className="text-gray-200 leading-relaxed space-y-3">
          {analysisText.split('\n\n').map((para, i) => (
            <p key={i} className="whitespace-pre-wrap">{para}</p>
          ))}
        </div>
      </div>
    );
  }

  return sections.map((section, index) => (
    <motion.div
      key={index}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-6 rounded-xl border border-purple-500/30 backdrop-blur-sm hover:border-purple-500/50 transition-all"
    >
      <h4 className="text-lg font-bold text-purple-300 mb-4 flex items-center gap-2">
        <span className="text-2xl">{section.icon}</span>
        {section.title}
      </h4>
      <div className="text-gray-200 leading-relaxed space-y-2">
        {formatSectionContent(section.content)}
      </div>
    </motion.div>
  ));
};

/**
 * Get icon for section based on title
 */
const getSectionIcon = (title) => {
  const titleLower = title.toLowerCase();
  if (titleLower.includes('score') || titleLower.includes('ats')) return '🎯';
  if (titleLower.includes('skill')) return '💡';
  if (titleLower.includes('experience')) return '📊';
  if (titleLower.includes('keyword')) return '🔑';
  if (titleLower.includes('achievement') || titleLower.includes('impact')) return '⭐';
  if (titleLower.includes('recommendation')) return '💎';
  if (titleLower.includes('competitive') || titleLower.includes('edge')) return '🚀';
  if (titleLower.includes('strength')) return '💪';
  if (titleLower.includes('structure') || titleLower.includes('format')) return '📐';
  if (titleLower.includes('content')) return '📝';
  if (titleLower.includes('language') || titleLower.includes('style')) return '✍️';
  if (titleLower.includes('overall')) return '📋';
  return '📌';
};

/**
 * Format section content with bullets, numbers, and emphasis
 */
const formatSectionContent = (content) => {
  if (!content) return null;

  const lines = content.split('\n').filter(line => line.trim());
  const elements = [];
  let currentList = [];
  let listType = null; // 'bullet' or 'number'

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Check if it's a bullet point
    if (trimmed.match(/^[-•*]\s+/)) {
      const text = trimmed.replace(/^[-•*]\s+/, '');
      if (listType !== 'bullet' && currentList.length > 0) {
        elements.push(renderList(currentList, listType));
        currentList = [];
      }
      currentList.push(text);
      listType = 'bullet';
    }
    // Check if it's a numbered item
    else if (trimmed.match(/^\d+\.\s+/)) {
      const text = trimmed.replace(/^\d+\.\s+/, '');
      if (listType !== 'number' && currentList.length > 0) {
        elements.push(renderList(currentList, listType));
        currentList = [];
      }
      currentList.push(text);
      listType = 'number';
    }
    // Regular paragraph
    else {
      if (currentList.length > 0) {
        elements.push(renderList(currentList, listType));
        currentList = [];
        listType = null;
      }
      if (trimmed) {
        elements.push(
          <p key={`para-${index}`} className="mb-2">
            {formatInlineText(trimmed)}
          </p>
        );
      }
    }
  });

  // Flush remaining list
  if (currentList.length > 0) {
    elements.push(renderList(currentList, listType));
  }

  return elements.length > 0 ? elements : <p className="whitespace-pre-wrap">{content}</p>;
};

/**
 * Render list items
 */
const renderList = (items, type) => {
  return (
    <ul key={`list-${Math.random()}`} className={`space-y-2 ml-4 mb-3 ${type === 'number' ? 'list-decimal' : 'list-disc'} list-inside`}>
      {items.map((item, i) => (
        <li key={i} className="text-gray-200 leading-relaxed">
          {formatInlineText(item)}
        </li>
      ))}
    </ul>
  );
};

/**
 * Format inline text with bold and highlights
 */
const formatInlineText = (text) => {
  // Split by **bold** markers
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="text-purple-300 font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

/**
 * Format cover letter with paragraphs
 */
const formatCoverLetter = (coverLetterText) => {
  if (!coverLetterText) return null;

  const paragraphs = coverLetterText.split('\n\n').filter(p => p.trim());
  
  return (
    <div className="space-y-4">
      {paragraphs.map((para, index) => (
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="text-gray-200 leading-relaxed text-justify"
        >
          {formatInlineText(para.trim())}
        </motion.p>
      ))}
    </div>
  );
};

/**
 * Format interview questions with categories
 */
const formatInterviewQuestions = (questionsText) => {
  if (!questionsText) return null;

  // Try to split by categories
  const categoryRegex = /(?:^|\n)(?:\*\*)?(\d+\.\s*[A-Z][^:\n]+):?(?:\*\*)?/g;
  const questions = [];
  let lastIndex = 0;
  let match;
  let currentCategory = null;

  while ((match = categoryRegex.exec(questionsText)) !== null) {
    // Add questions from previous category
    if (match.index > lastIndex && currentCategory) {
      const content = questionsText.slice(lastIndex, match.index).trim();
      if (content) {
        questions.push({ category: currentCategory, content });
      }
    }

    currentCategory = match[1].trim();
    lastIndex = categoryRegex.lastIndex;
  }

  // Add remaining questions
  if (lastIndex < questionsText.length && currentCategory) {
    const remaining = questionsText.slice(lastIndex).trim();
    if (remaining) {
      questions.push({ category: currentCategory, content: remaining });
    }
  }

  // If no categories found, split by question numbers
  if (questions.length === 0) {
    const questionItems = questionsText.split(/\n(?=\d+\.|Q\d+:|Question \d+:)/g).filter(q => q.trim());
    return (
      <div className="space-y-3">
        {questionItems.map((question, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-5 rounded-xl border border-indigo-500/30 backdrop-blur-sm hover:border-indigo-500/50 transition-all"
          >
            <div className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                {index + 1}
              </span>
              <p className="text-gray-200 flex-1 leading-relaxed whitespace-pre-wrap">{question.trim()}</p>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  // Render categorized questions
  return questions.map((item, catIndex) => {
    const categoryIcon = getCategoryIcon(item.category);
    const questionItems = item.content.split(/\n(?=\d+\.|Q\d+:|Question \d+:|-\s)/g).filter(q => q.trim());

    return (
      <motion.div
        key={catIndex}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: catIndex * 0.1 }}
        className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-6 rounded-xl border border-indigo-500/30 backdrop-blur-sm"
      >
        <h4 className="text-lg font-bold text-indigo-300 mb-4 flex items-center gap-2">
          <span className="text-2xl">{categoryIcon}</span>
          {item.category}
        </h4>
        <div className="space-y-3">
          {questionItems.map((question, qIndex) => (
            <div key={qIndex} className="pl-4 border-l-2 border-indigo-500/30">
              <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{question.trim()}</p>
            </div>
          ))}
        </div>
      </motion.div>
    );
  });
};

/**
 * Get icon for question category
 */
const getCategoryIcon = (category) => {
  const catLower = category.toLowerCase();
  if (catLower.includes('technical')) return '⚙️';
  if (catLower.includes('behavioral')) return '🧠';
  if (catLower.includes('situational')) return '🎭';
  if (catLower.includes('role')) return '👔';
  if (catLower.includes('cultural') || catLower.includes('fit')) return '🤝';
  if (catLower.includes('critical') || catLower.includes('thinking')) return '🔍';
  if (catLower.includes('leadership')) return '👑';
  return '❓';
};

export default function ResultsTabs({ results, loading = false, error = null }) {
  const [activeTab, setActiveTab] = useState('parsed');
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDownloadReport = async () => {
    if (!results?.analysis && !results?.parsedResume) {
      showError('No analysis data available to download');
      return;
    }

    setDownloading(true);
    try {
      const response = await apiClient.post('/resume-genome/pdf-report', {
        analysisOutput: results.analysis || results.parsedResume,
        jobDescription: results.jobDescription || '',
        resumeText: results.resumeText || '',
      }, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `resume-analysis-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccess('Report downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      showError('Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showSuccess('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showError('Failed to copy');
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="relative mb-8">
            <Loader2 className="w-20 h-20 text-royal-400 animate-spin" />
            <div className="absolute inset-0 w-20 h-20 bg-royal-400 rounded-full opacity-20 animate-ping"></div>
          </div>
          <Sparkles className="w-8 h-8 text-purple-400 mb-4 animate-pulse" />
          <p className="text-white font-semibold text-xl mb-2">Analyzing Resume with AI...</p>
          <p className="text-gray-400 text-sm">This may take 10-30 seconds</p>
        </motion.div>
      );
    }

    if (error) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 bg-red-500/10 backdrop-blur-sm rounded-2xl border border-red-500/30"
        >
          <AlertCircle className="w-16 h-16 text-red-400 mb-6" />
          <p className="text-red-200 font-bold text-xl mb-2">Analysis Error</p>
          <p className="text-red-300 text-sm max-w-md text-center px-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </motion.div>
      );
    }

    if (!results) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 bg-white/5 backdrop-blur-sm rounded-2xl border-2 border-dashed border-white/20"
        >
          <FileText className="w-24 h-24 text-gray-400 mb-6 opacity-50" />
          <p className="text-gray-300 text-lg font-medium mb-2">No Results Yet</p>
          <p className="text-gray-400 text-sm">Upload a resume and click "Analyze" to see results</p>
        </motion.div>
      );
    }

    switch (activeTab) {
      case 'parsed':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-400" />
                Parsed Resume Content
              </h3>
            </div>
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl mb-4">
              <p className="text-sm text-blue-200">
                <strong>Note:</strong> Your resume has been parsed securely. Data is transient and deleted after session ends.
              </p>
            </div>
            <div className="whitespace-pre-wrap bg-black/30 backdrop-blur-sm p-6 rounded-xl border border-white/10 font-mono text-sm text-gray-200 leading-relaxed max-h-[600px] overflow-y-auto custom-scrollbar">
              {results.parsedResume || results.resumeText || 'No parsed content available'}
            </div>
          </div>
        );

      case 'analysis':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Target className="w-6 h-6 text-purple-400" />
              Resume Analysis
            </h3>
            
            {results.analysis ? (
              <div className="space-y-4">
                {formatAnalysisOutput(results.analysis)}
              </div>
            ) : (
              <div className="text-center py-12 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4 opacity-50" />
                <p className="text-gray-400">Run analysis to see feedback</p>
              </div>
            )}
          </div>
        );

      case 'rephrased':
        const rephrasedBullets = results.rephrased && results.rephrased.length > 0 ? results.rephrased : [];
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Edit3 className="w-6 h-6 text-green-400" />
              Buzzword Booster
            </h3>
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl mb-4">
              <p className="text-sm text-green-200">
                <strong>Pro Tip:</strong> These AI-generated bullet points use stronger action verbs and industry keywords for maximum impact.
              </p>
            </div>
            {rephrasedBullets.length > 0 ? (
              <div className="space-y-3">
                {rephrasedBullets.map((bullet, index) => {
                  const cleanBullet = typeof bullet === 'string' ? bullet.trim() : String(bullet);
                  if (!cleanBullet) return null;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex gap-4 p-5 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/30 backdrop-blur-sm hover:border-green-500/50 transition-all group cursor-pointer"
                      onClick={() => handleCopy(cleanBullet)}
                    >
                      <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </span>
                      <p className="text-gray-200 flex-1 leading-relaxed">{cleanBullet}</p>
                      <Copy className="w-4 h-4 text-gray-400 group-hover:text-green-400 transition-colors opacity-0 group-hover:opacity-100" />
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                <Edit3 className="w-12 h-12 text-gray-400 mx-auto mb-4 opacity-50" />
                <p className="text-gray-400">No rephrased content available</p>
                <p className="text-gray-500 text-sm mt-2">Upload a resume and run analysis to generate professional bullet points</p>
              </div>
            )}
          </div>
        );

      case 'cover':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Mail className="w-6 h-6 text-orange-400" />
                Generated Cover Letter
              </h3>
              {results.coverLetter && (
                <button
                  onClick={() => handleCopy(results.coverLetter)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              )}
            </div>
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl mb-4">
              <p className="text-sm text-yellow-200">
                <strong>Disclaimer:</strong> This cover letter is AI-generated. Review and personalize before use.
              </p>
            </div>
            {results.coverLetter ? (
              <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 p-6 rounded-xl border border-orange-500/30 backdrop-blur-sm">
                {formatCoverLetter(results.coverLetter)}
              </div>
            ) : (
              <div className="text-center py-12 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4 opacity-50" />
                <p className="text-gray-400">Add a job description to generate cover letter</p>
              </div>
            )}
          </div>
        );

      case 'interview':
        const interviewQuestions = results.interviewQuestions;
        const hasQuestions = interviewQuestions && (Array.isArray(interviewQuestions) ? interviewQuestions.length > 0 : typeof interviewQuestions === 'string' && interviewQuestions.trim().length > 0);
        
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-indigo-400" />
              Interview Questions
            </h3>
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl mb-4">
              <p className="text-sm text-indigo-200">
                <strong>Prep Guide:</strong> Practice these AI-generated questions to prepare for your interview.
              </p>
            </div>
            {hasQuestions ? (
              <div className="space-y-4">
                {formatInterviewQuestions(Array.isArray(interviewQuestions) ? interviewQuestions.join('\n\n') : interviewQuestions)}
              </div>
            ) : (
              <div className="text-center py-12 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4 opacity-50" />
                <p className="text-gray-400">Add a job description to generate interview questions</p>
                <p className="text-gray-500 text-sm mt-2">Interview questions are tailored to the specific role</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 p-4 bg-white/5 border-b border-white/10">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
                ${isActive 
                  ? `bg-gradient-to-r ${tab.color} text-white shadow-lg` 
                  : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">{tab.label}</span>
            </motion.button>
          );
        })}
        
        {/* Download Button */}
        {results && (
          <motion.button
            onClick={handleDownloadReport}
            disabled={downloading}
            whileHover={!downloading ? { scale: 1.05 } : {}}
            whileTap={!downloading ? { scale: 0.95 } : {}}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium ml-auto transition-all duration-200
              ${downloading 
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/50'
              }
            `}
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm hidden sm:inline">Generating...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">PDF Report</span>
              </>
            )}
          </motion.button>
        )}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
