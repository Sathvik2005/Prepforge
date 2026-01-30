import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

let openaiClient = null;

// Initialize OpenAI client
const initOpenAI = () => {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
};

const isOpenAIAvailable = () => {
  return !!process.env.OPENAI_API_KEY;
};

// AI-powered bullet point enhancement
export async function enhanceBulletPoint(bulletPoint, context = {}) {
  if (!isOpenAIAvailable()) {
    console.log('⚠️  OpenAI not configured, returning original text');
    return { enhanced: bulletPoint, aiGenerated: false };
  }

  try {
    const client = initOpenAI();
    if (!client) {
      return { enhanced: bulletPoint, aiGenerated: false };
    }
    
    const { position, company, industry } = context;
    
    const prompt = `You are a professional resume writer. Enhance the following bullet point for a resume.

Position: ${position || 'Software Engineer'}
Company: ${company || 'Tech Company'}
Industry: ${industry || 'Technology'}

Original bullet point:
"${bulletPoint}"

Requirements:
1. Start with a strong action verb
2. Include quantifiable metrics (e.g., "increased by 30%", "reduced by 50%")
3. Highlight impact and results
4. Keep it concise (1-2 lines)
5. Use professional language
6. Make it ATS-friendly

Enhanced bullet point:`;

    const response = await client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert resume writer specializing in creating impactful, ATS-optimized bullet points. Focus on achievements, metrics, and results.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const enhanced = response.choices[0].message.content.trim();
    console.log('✅ Bullet point enhanced with AI');
    
    return { enhanced, aiGenerated: true };
  } catch (error) {
    console.error('❌ OpenAI enhancement error:', error.message);
    return { enhanced: bulletPoint, aiGenerated: false };
  }
}

// Generate professional summary
export async function generateSummary(profile) {
  if (!isOpenAIAvailable()) {
    return { summary: '', aiGenerated: false };
  }

  try {
    const client = initOpenAI();
    if (!client) {
      return { summary: '', aiGenerated: false };
    }
    
    const { name, position, yearsExperience, skills, industry } = profile;
    
    const prompt = `Create a professional resume summary (3-4 sentences) for:

Name: ${name}
Current Position: ${position || 'Software Engineer'}
Years of Experience: ${yearsExperience || '3+'}
Key Skills: ${skills?.join(', ') || 'JavaScript, Python, React'}
Industry: ${industry || 'Technology'}

Requirements:
1. Highlight key strengths and expertise
2. Mention years of experience
3. Include 2-3 top skills
4. Show value proposition
5. Keep it professional and impactful
6. 3-4 sentences maximum

Professional Summary:`;

    const response = await client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert resume writer creating compelling professional summaries that capture candidate value.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const summary = response.choices[0].message.content.trim();
    console.log('✅ Professional summary generated with AI');
    
    return { summary, aiGenerated: true };
  } catch (error) {
    console.error('❌ Summary generation error:', error.message);
    return { summary: '', aiGenerated: false };
  }
}

// Optimize resume for specific job description
export async function optimizeForJob(resumeData, jobDescription) {
  if (!isOpenAIAvailable()) {
    return { suggestions: [], aiGenerated: false };
  }

  try {
    const client = initOpenAI();
    if (!client) {
      return { suggestions: [], aiGenerated: false };
    }
    
    const prompt = `Analyze this resume against the job description and provide optimization suggestions.

JOB DESCRIPTION:
${jobDescription}

CURRENT RESUME SUMMARY:
- Experience: ${resumeData.experience?.length || 0} positions
- Skills: ${resumeData.skills?.technical?.join(', ') || 'None listed'}
- Projects: ${resumeData.projects?.length || 0} projects

Provide 5-7 specific, actionable suggestions to optimize this resume for the job, including:
1. Missing keywords to add
2. Skills to highlight
3. Experience to emphasize
4. Projects to feature
5. Overall improvements

Format as a JSON array of objects with "type" and "suggestion" fields.`;

    const response = await client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an ATS optimization expert. Analyze resumes and provide specific suggestions to improve match scores.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.6,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content);
    console.log('✅ Job optimization suggestions generated');
    
    return { suggestions: result.suggestions || [], aiGenerated: true };
  } catch (error) {
    console.error('❌ Job optimization error:', error.message);
    return { suggestions: [], aiGenerated: false };
  }
}

// Generate project description
export async function generateProjectDescription(projectName, technologies) {
  if (!isOpenAIAvailable()) {
    return { description: '', aiGenerated: false };
  }

  try {
    const client = initOpenAI();
    if (!client) {
      return { description: '', aiGenerated: false };
    }
    
    const prompt = `Create a professional resume project description (2-3 sentences) for:

Project Name: ${projectName}
Technologies Used: ${technologies?.join(', ') || 'Web Technologies'}

Requirements:
1. Describe what the project does
2. Highlight technical complexity
3. Mention impact/results if applicable
4. Use professional language
5. Keep it concise (2-3 sentences)

Project Description:`;    const response = await client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a resume writer creating compelling project descriptions that showcase technical skills.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const description = response.choices[0].message.content.trim();
    console.log('✅ Project description generated');
    
    return { description, aiGenerated: true };
  } catch (error) {
    console.error('❌ Project description error:', error.message);
    return { description: '', aiGenerated: false };
  }
}

// Extract skills from job description
export async function extractSkillsFromJob(jobDescription) {
  if (!isOpenAIAvailable()) {
    return { skills: [], aiGenerated: false };
  }

  try {
    const client = initOpenAI();
    if (!client) {
      return { skills: {}, aiGenerated: false };
    }
    
    const prompt = `Extract all technical skills, tools, and technologies mentioned in this job description:

${jobDescription}

Categorize them into:
- Programming Languages
- Frameworks & Libraries
- Tools & Platforms
- Soft Skills

Format as JSON with these categories as keys and arrays of skills as values.`;

    const response = await client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a skill extraction expert. Identify all relevant technical and soft skills from job descriptions.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const skills = JSON.parse(response.choices[0].message.content);
    console.log('✅ Skills extracted from job description');
    
    return { skills, aiGenerated: true };
  } catch (error) {
    console.error('❌ Skill extraction error:', error.message);
    return { skills: {}, aiGenerated: false };
  }
}

// Batch enhance multiple bullet points
export async function enhanceBulletPoints(bulletPoints, context = {}) {
  if (!isOpenAIAvailable()) {
    return bulletPoints.map(bp => ({ original: bp, enhanced: bp, aiGenerated: false }));
  }

  try {
    const results = [];
    
    for (const bulletPoint of bulletPoints) {
      const result = await enhanceBulletPoint(bulletPoint, context);
      results.push({
        original: bulletPoint,
        enhanced: result.enhanced,
        aiGenerated: result.aiGenerated,
      });
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return results;
  } catch (error) {
    console.error('❌ Batch enhancement error:', error.message);
    return bulletPoints.map(bp => ({ original: bp, enhanced: bp, aiGenerated: false }));
  }
}
