import apiClient from '../config/axios';

/**
 * Resume Analysis API Client
 * Calls backend endpoints which handle Gradio interactions
 */

/**
 * Process resume file and extract text
 * @param {File} file - Resume file (PDF or DOCX)
 * @returns {Promise<string>} Parsed resume text
 */
export async function processResume(file) {
  try {
    console.log('📄 Uploading resume to backend:', file.name, file.type, file.size);
    
    const formData = new FormData();
    formData.append('resume', file);

    const response = await apiClient.post('/resume-analysis/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    console.log('✅ Resume processed successfully');
    return response.data.parsedText;
  } catch (error) {
    console.error('❌ Error processing resume:', error);
    const message = error.response?.data?.message || error.message;
    throw new Error(`Failed to process resume: ${message}`);
  }
}

/**
 * Analyze resume against job description
 */
export async function analyzeResume({
  resumeText,
  jobDescription = '',
  withJobDescription = false,
  temperature = 0.5,
  maxTokens = 1024
}) {
  try {
    console.log('🔍 Analyzing resume via backend...');
    
    const response = await apiClient.post('/resume-analysis/analyze', {
      resumeText,
      jobDescription,
      withJobDescription,
      temperature,
      maxTokens
    });

    console.log('✅ Analysis complete');
    return response.data.analysis;
  } catch (error) {
    console.error('❌ Error analyzing resume:', error);
    const message = error.response?.data?.message || error.message;
    throw new Error(`Failed to analyze resume: ${message}`);
  }
}

/**
 * Rephrase text with professional buzzwords
 */
export async function rephraseText({
  text,
  temperature = 0.5,
  maxTokens = 1024
}) {
  try {
    console.log('✍️ Rephrasing text via backend...');
    
    const response = await apiClient.post('/resume-analysis/rephrase', {
      text,
      temperature,
      maxTokens
    });

    console.log('✅ Rephrase complete');
    const rephrased = response.data.rephrased;
    
    // Parse if string
    if (typeof rephrased === 'string') {
      return rephrased.split('\n').filter(line => line.trim());
    }
    return Array.isArray(rephrased) ? rephrased : [rephrased];
  } catch (error) {
    console.error('❌ Error rephrasing text:', error);
    const message = error.response?.data?.message || error.message;
    throw new Error(`Failed to rephrase text: ${message}`);
  }
}

/**
 * Generate cover letter
 */
export async function generateCoverLetter({
  resumeText,
  jobDescription,
  temperature = 0.7,
  maxTokens = 2000
}) {
  try {
    console.log('📧 Generating cover letter via backend...');
    
    const response = await apiClient.post('/resume-analysis/cover-letter', {
      resumeText,
      jobDescription,
      temperature,
      maxTokens
    });

    console.log('✅ Cover letter generated');
    return response.data.coverLetter;
  } catch (error) {
    console.error('❌ Error generating cover letter:', error);
    const message = error.response?.data?.message || error.message;
    throw new Error(`Failed to generate cover letter: ${message}`);
  }
}

/**
 * Generate interview questions
 */
export async function generateInterviewQuestions({
  jobDescription,
  temperature = 0.6,
  maxTokens = 1500
}) {
  try {
    console.log('💬 Generating interview questions via backend...');
    
    const response = await apiClient.post('/resume-analysis/interview-questions', {
      jobDescription,
      temperature,
      maxTokens
    });

    console.log('✅ Interview questions generated');
    const questions = response.data.questions;
    
    // Parse if string
    if (typeof questions === 'string') {
      return questions.split('\n').filter(q => q.trim()).map(q => q.replace(/^\d+\.\s*/, '').trim());
    }
    return Array.isArray(questions) ? questions : [questions];
  } catch (error) {
    console.error('❌ Error generating interview questions:', error);
    const message = error.response?.data?.message || error.message;
    throw new Error(`Failed to generate interview questions: ${message}`);
  }
}

/**
 * Auto-fill job description from URL
 */
export async function autoFillJobDescription(url) {
  try {
    console.log('🔗 Auto-filling job description via backend...');
    
    const response = await apiClient.post('/resume-analysis/autofill-jd', { url });

    console.log('✅ Job description auto-filled');
    return response.data.jobDescription;
  } catch (error) {
    console.error('❌ Error auto-filling job description:', error);
    const message = error.response?.data?.message || error.message;
    throw new Error(`Failed to fetch job description: ${message}`);
  }
}

/**
 * Download PDF report
 */
export async function downloadPDFReport({
  analysisOutput,
  jobDescription,
  resumeText
}) {
  try {
    console.log('📊 Downloading PDF report via backend...');
    
    const response = await apiClient.post('/resume-analysis/pdf-report', {
      analysisOutput,
      jobDescription,
      resumeText
    }, {
      responseType: 'blob'
    });

    console.log('✅ PDF report downloaded');
    return response.data;
  } catch (error) {
    console.error('❌ Error downloading PDF:', error);
    throw new Error('Failed to generate PDF report');
  }
}
