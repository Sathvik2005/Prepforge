/**
 * Health Check Utility
 * Verifies backend connectivity and service status
 */

const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export const checkBackendHealth = async () => {
  try {
    const response = await fetch(`${API_URL}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Backend Health Check:', data);
    return { ok: true, data };
  } catch (error) {
    console.error('❌ Backend Health Check Failed:', error.message);
    return { ok: false, error: error.message };
  }
};

export const checkServiceStatus = async () => {
  const health = await checkBackendHealth();
  
  return {
    backend: health.ok,
    frontend: true, // If this runs, frontend is up
    timestamp: new Date().toISOString(),
    details: health.data || health.error
  };
};

export default { checkBackendHealth, checkServiceStatus };
