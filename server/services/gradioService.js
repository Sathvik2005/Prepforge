import { Client } from '@gradio/client';

let cachedClient = null;

/**
 * Gradio Service - Backend wrapper for Resume-Genome Gradio Space
 * Handles all interactions with the HuggingFace Gradio API
 */

/**
 * Create and cache Gradio client connection
 */
async function getGradioClient() {
  if (cachedClient) return cachedClient;
  
  try {
    console.log('🔌 Connecting to Resume-Genome Gradio Space...');
    cachedClient = await Client.connect('thisrudrapatel/Resume-Genome');
    console.log('✅ Connected to Resume-Genome Gradio Space');
    return cachedClient;
  } catch (error) {
    console.error('❌ Failed to connect to Gradio:', error);
    throw new Error('Unable to connect to Resume analysis service');
  }
}

/**
 * Process resume file and extract text
 * @param {Buffer} fileBuffer - Resume file buffer
 * @param {string} fileName - Original filename
 * @param {string} mimeType - File MIME type
 * @returns {Promise<string>} Parsed resume text
 */
export async function processResume(fileBuffer, fileName, mimeType) {
  const client = await getGradioClient();
  
  try {
    console.log('📄 Processing resume:', fileName, mimeType);
    
    // Create Blob from buffer
    const blob = new Blob([fileBuffer], { type: mimeType });
    const file = new File([blob], fileName, { type: mimeType });
    
    const result = await client.predict("/process_resume", { 
      file: file
    });
    
    console.log('✅ Resume processed successfully');
    
    const parsedText = result?.data || result;
    
    if (!parsedText || typeof parsedText !== 'string') {
      throw new Error('Invalid response from resume parser');
    }
    
    return parsedText;
  } catch (error) {
    console.error('❌ Error processing resume:', error);
    throw new Error(`Failed to process resume: ${error.message}`);
  }
}

/**
 * Analyze resume against job description
 */
export async function analyzeResume(resumeText, jobDescription = '', withJobDescription = false, temperature = 0.5, maxTokens = 1024) {
  const client = await getGradioClient();
  
  try {
    console.log('🔍 Analyzing resume...');
    
    const result = await client.predict("/analyze_resume", { 
      resume_text: resumeText,
      job_description: jobDescription || '',
      with_job_description: withJobDescription,
      temperature: temperature,
      max_tokens: maxTokens
    });
    
    console.log('✅ Analysis complete');
    
    const analysis = result?.data || result;
    return typeof analysis === 'object' ? analysis : { general: analysis };
  } catch (error) {
    console.error('❌ Error analyzing resume:', error);
    throw new Error(`Analysis failed: ${error.message}`);
  }
}

/**
 * Rephrase text with professional buzzwords
 */
export async function rephraseText(text, temperature = 0.5, maxTokens = 1024) {
  const client = await getGradioClient();
  
  try {
    console.log('✍️ Rephrasing text...');
    
    const result = await client.predict("/rephrase_text", { 
      text: text,
      temperature: temperature,
      max_tokens: maxTokens
    });
    
    console.log('✅ Rephrase complete');
    
    const rephrased = result?.data || result;
    return rephrased;
  } catch (error) {
    console.error('❌ Error rephrasing text:', error);
    throw new Error(`Rephrase failed: ${error.message}`);
  }
}

/**
 * Generate cover letter
 */
export async function generateCoverLetter(resumeText, jobDescription, temperature = 0.7, maxTokens = 2000) {
  const client = await getGradioClient();
  
  try {
    console.log('📧 Generating cover letter...');
    
    const result = await client.predict("/generate_cover_letter", { 
      resume_text: resumeText,
      job_description: jobDescription,
      temperature: temperature,
      max_tokens: maxTokens
    });
    
    console.log('✅ Cover letter generated');
    
    const coverLetter = result?.data || result;
    return typeof coverLetter === 'string' ? coverLetter : String(coverLetter);
  } catch (error) {
    console.error('❌ Error generating cover letter:', error);
    throw new Error(`Cover letter generation failed: ${error.message}`);
  }
}

/**
 * Generate interview questions
 */
export async function generateInterviewQuestions(jobDescription, temperature = 0.6, maxTokens = 1500) {
  const client = await getGradioClient();
  
  try {
    console.log('💬 Generating interview questions...');
    
    const result = await client.predict("/generate_interview_questions", { 
      job_description: jobDescription,
      temperature: temperature,
      max_tokens: maxTokens
    });
    
    console.log('✅ Interview questions generated');
    
    const questions = result?.data || result;
    return questions;
  } catch (error) {
    console.error('❌ Error generating interview questions:', error);
    throw new Error(`Interview questions generation failed: ${error.message}`);
  }
}

/**
 * Auto-fill job description from URL
 */
export async function autoFillJobDescription(url) {
  const client = await getGradioClient();
  
  try {
    console.log('🔗 Auto-filling job description from URL...');
    
    const result = await client.predict("/auto_fill_job_desc", { 
      url: url
    });
    
    console.log('✅ Job description auto-filled');
    
    const jobDesc = result?.data || result;
    if (!jobDesc || typeof jobDesc !== 'string' || jobDesc.trim().length === 0) {
      throw new Error('No job description found at the provided URL');
    }
    return jobDesc;
  } catch (error) {
    console.error('❌ Error auto-filling job description:', error);
    throw new Error(`Auto-fill failed: ${error.message}`);
  }
}

/**
 * Download PDF report
 */
export async function downloadPDFReport(analysisOutput, jobDescription, resumeText) {
  const client = await getGradioClient();
  
  try {
    console.log('📊 Generating PDF report...');
    
    const result = await client.predict("/handle_pdf_download", { 
      analysis_output: analysisOutput,
      job_description: jobDescription,
      resume_text: resumeText
    });
    
    console.log('✅ PDF report generated');
    
    return result.data;
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw new Error('Failed to generate PDF report');
  }
}
