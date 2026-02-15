import apiClient from '../config/axios';

/**
 * Resume Genome API Client
 * Clean, stable API client for resume processing with single AI provider
 */

/**
 * Process resume file - Parse and extract content
 * @param {File} file - Resume file (PDF or DOCX)
 * @returns {Promise<Object>} Extracted resume content
 */
export async function processResume(file) {
  try {
    console.log('📄 Processing resume:', file.name);
    
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/resume-genome/process-resume', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 30000 // 30 second timeout
    });

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Resume processing failed');
    }

    console.log('✅ Resume processed successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Resume processing error:', error.message);
    throw new Error(error.response?.data?.message || error.message || 'Failed to process resume');
  }
}

/**
 * Analyze resume with optional job description
 * @param {string} resumeText - Resume content
 * @param {string} jobDescription - Optional job description
 * @param {Object} options - Analysis options (temperature, maxTokens)
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeResume(resumeText, jobDescription = '', options = {}) {
  try {
    console.log('🔍 Analyzing resume...');
    
    const response = await apiClient.post('/resume-genome/analyze', {
      resumeText,
      jobDescription,
      withJobDescription: !!jobDescription,
      temperature: options.temperature,
      maxTokens: options.maxTokens
    }, {
      timeout: 60000 // 60 second timeout for AI
    });

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Analysis failed');
    }

    console.log('✅ Analysis complete');
    return response.data;
  } catch (error) {
    console.error('❌ Analysis error:', error.message);
    throw new Error(error.response?.data?.message || error.message || 'Failed to analyze resume');
  }
}

/**
 * Rephrase text with professional improvements
 * @param {string} text - Text to rephrase
 * @param {Object} options - Options (temperature, maxTokens)
 * @returns {Promise<Array>} Array of rephrased bullet points
 */
export async function rephraseText(text, options = {}) {
  try {
    console.log('✍️ Rephrasing text...');
    
    const response = await apiClient.post('/resume-genome/rephrase', {
      text,
      temperature: options.temperature,
      maxTokens: options.maxTokens
    }, {
      timeout: 30000 // 30 second timeout
    });

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Rephrase failed');
    }

    console.log('✅ Rephrase complete');
    return response.data.data || [];
  } catch (error) {
    console.error('❌ Rephrase error:', error.message);
    throw new Error(error.response?.data?.message || error.message || 'Failed to rephrase text');
  }
}

/**
 * Generate cover letter
 * @param {string} resumeText - Resume content
 * @param {string} jobDescription - Job description
 * @param {Object} options - Options (temperature, maxTokens)
 * @returns {Promise<string>} Generated cover letter
 */
export async function generateCoverLetter(resumeText, jobDescription, options = {}) {
  try {
    console.log('📧 Generating cover letter...');
    
    const response = await apiClient.post('/resume-genome/cover-letter', {
      resumeText,
      jobDescription,
      temperature: options.temperature,
      maxTokens: options.maxTokens
    }, {
      timeout: 60000 // 60 second timeout
    });

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Cover letter generation failed');
    }

    console.log('✅ Cover letter generated');
    return response.data.data;
  } catch (error) {
    console.error('❌ Cover letter error:', error.message);
    throw new Error(error.response?.data?.message || error.message || 'Failed to generate cover letter');
  }
}

/**
 * Generate interview Q&A
 * @param {string} resumeText - Resume content
 * @param {string} jobDescription - Job description
 * @param {Object} options - Options (temperature, maxTokens)
 * @returns {Promise<string>} Interview questions and answers
 */
export async function generateInterviewQA(resumeText, jobDescription, options = {}) {
  try {
    console.log('💬 Generating interview Q&A...');
    
    const response = await apiClient.post('/resume-genome/interview-questions', {
      resumeText,
      jobDescription,
      temperature: options.temperature,
      maxTokens: options.maxTokens
    }, {
      timeout: 60000 // 60 second timeout
    });

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Interview Q&A generation failed');
    }

    console.log('✅ Interview Q&A generated');
    return response.data.data;
  } catch (error) {
    console.error('❌ Interview Q&A error:', error.message);
    throw new Error(error.response?.data?.message || error.message || 'Failed to generate interview Q&A');
  }
}

/**
 * Auto-fill job description from URL
 * @param {string} url - Job posting URL
 * @returns {Promise<string>} Extracted job description
 */
export async function autoFillJobDescription(url) {
  try {
    console.log('🔗 Auto-filling from URL...');
    
    const response = await apiClient.post('/resume-genome/auto-fill-jd', {
      url
    }, {
      timeout: 15000 // 15 second timeout
    });

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Auto-fill failed');
    }

    console.log('✅ Job description extracted');
    return response.data.data;
  } catch (error) {
    console.error('❌ Auto-fill error:', error.message);
    throw new Error(error.response?.data?.message || error.message || 'Failed to extract job description from URL');
  }
}

/**
 * Save resume analysis to database
 * @param {Object} data - Analysis data to save
 * @returns {Promise<Object>} Save confirmation
 */
export async function saveAnalysis(data) {
  try {
    console.log('💾 Saving analysis...');
    
    const response = await apiClient.post('/resume-genome/save', data, {
      timeout: 10000 // 10 second timeout
    });

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Save failed');
    }

    console.log('✅ Analysis saved');
    return response.data;
  } catch (error) {
    console.error('❌ Save error:', error.message);
    throw new Error(error.response?.data?.message || error.message || 'Failed to save analysis');
  }
}

/**
 * Generate PDF report
 * @param {Object} data - Data for PDF report
 * @returns {Promise<Blob>} PDF blob
 */
export async function generatePDFReport(data) {
  try {
    console.log('📄 Generating PDF report...');
    
    const response = await apiClient.post('/resume-genome/pdf-report', data, {
      responseType: 'blob',
      timeout: 30000 // 30 second timeout
    });

    console.log('✅ PDF generated');
    return response.data;
  } catch (error) {
    console.error('❌ PDF generation error:', error.message);
    throw new Error(error.response?.data?.message || error.message || 'Failed to generate PDF report');
  }
}

/**
 * Check Resume Genome service health
 * @returns {Promise<Object>} Health status
 */
export async function checkHealth() {
  try {
    const response = await apiClient.get('/resume-genome/health', {
      timeout: 5000 // 5 second timeout
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Health check error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  processResume,
  analyzeResume,
  rephraseText,
  generateCoverLetter,
  generateInterviewQA,
  autoFillJobDescription,
  saveAnalysis,
  generatePDFReport,
  checkHealth
};

    return response.data.questions;
  } catch (error) {
    console.error('❌ Error generating interview Q&A:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to generate interview questions');
  }
}

/**
 * Auto-fill job description from URL
 * @param {string} url - Job posting URL
 * @returns {Promise<string>} Extracted job description
 */
export async function autoFillJobDescription(url) {
  try {
    console.log('🔗 Auto-filling job description from:', url);
    
    const response = await apiClient.post('/resume-genome/auto-fill-jd', { url });

    console.log('✅ Job description auto-filled');
    return response.data.job_description;
  } catch (error) {
    console.error('❌ Error auto-filling job description:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch job description');
  }
}

export default {
  processResume,
  analyzeResume,
  rephraseText,
  generateCoverLetter,
  generateInterviewQA,
  autoFillJobDescription
};
