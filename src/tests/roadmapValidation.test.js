import { describe, it, expect, vi } from 'vitest';
import { validateGenerationPayload, estimateFeasibility } from '../services/roadmapApi';

describe('Roadmap API - Validation', () => {
  describe('validateGenerationPayload', () => {
    it('should pass validation with valid payload', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const payload = {
        userId: 'user-123',
        role: 'Data Scientist',
        targetDate: tomorrow.toISOString().split('T')[0],
        weeklyHours: 10,
        experience: 'intermediate',
        focusAreas: ['ML', 'Python'],
      };
      
      const result = validateGenerationPayload(payload);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should fail validation with missing userId', () => {
      const payload = {
        role: 'Engineer',
        targetDate: '2026-08-01',
        weeklyHours: 10,
        experience: 'novice',
        focusAreas: [],
      };
      
      const result = validateGenerationPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('User ID is required');
    });
    
    it('should fail validation with past target date', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const payload = {
        userId: 'user-123',
        role: 'Developer',
        targetDate: yesterday.toISOString().split('T')[0],
        weeklyHours: 10,
        experience: 'intermediate',
        focusAreas: [],
      };
      
      const result = validateGenerationPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('future'))).toBe(true);
    });
    
    it('should fail validation with invalid weekly hours', () => {
      const payload = {
        userId: 'user-123',
        role: 'Engineer',
        targetDate: '2026-08-01',
        weeklyHours: 0,
        experience: 'novice',
        focusAreas: [],
      };
      
      const result = validateGenerationPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Weekly hours'))).toBe(true);
    });
    
    it('should fail validation with invalid experience level', () => {
      const payload = {
        userId: 'user-123',
        role: 'Engineer',
        targetDate: '2026-08-01',
        weeklyHours: 10,
        experience: 'expert', // invalid
        focusAreas: [],
      };
      
      const result = validateGenerationPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Experience level'))).toBe(true);
    });
    
    it('should warn about unrealistic timeline', () => {
      const soon = new Date();
      soon.setDate(soon.getDate() + 3);
      
      const payload = {
        userId: 'user-123',
        role: 'Engineer',
        targetDate: soon.toISOString().split('T')[0],
        weeklyHours: 2,
        experience: 'novice',
        focusAreas: [],
      };
      
      const result = validateGenerationPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('hours total'))).toBe(true);
    });
  });
  
  describe('estimateFeasibility', () => {
    it('should return high score for realistic plan', () => {
      const payload = {
        role: 'Junior Developer',
        targetDate: '2027-01-01',
        weeklyHours: 15,
        experience: 'intermediate',
        focusAreas: ['JavaScript', 'React'],
      };
      
      const result = estimateFeasibility(payload);
      expect(result.score).toBeGreaterThan(70);
    });
    
    it('should penalize very short timeline', () => {
      const soon = new Date();
      soon.setDate(soon.getDate() + 14);
      
      const payload = {
        role: 'Engineer',
        targetDate: soon.toISOString().split('T')[0],
        weeklyHours: 5,
        experience: 'novice',
        focusAreas: ['ML'],
      };
      
      const result = estimateFeasibility(payload);
      expect(result.score).toBeLessThan(70);
      expect(result.reasons.length).toBeGreaterThan(0);
    });
    
    it('should penalize senior role with novice experience', () => {
      const payload = {
        role: 'Senior Machine Learning Engineer',
        targetDate: '2027-01-01',
        weeklyHours: 15,
        experience: 'novice',
        focusAreas: ['ML'],
      };
      
      const result = estimateFeasibility(payload);
      expect(result.reasons.some(r => r.includes('Senior role'))).toBe(true);
    });
    
    it('should penalize many focus areas', () => {
      const payload = {
        role: 'Engineer',
        targetDate: '2027-01-01',
        weeklyHours: 10,
        experience: 'intermediate',
        focusAreas: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      };
      
      const result = estimateFeasibility(payload);
      expect(result.reasons.some(r => r.includes('Many focus areas'))).toBe(true);
    });
    
    it('should penalize low weekly commitment', () => {
      const payload = {
        role: 'Engineer',
        targetDate: '2027-01-01',
        weeklyHours: 3,
        experience: 'intermediate',
        focusAreas: ['ML'],
      };
      
      const result = estimateFeasibility(payload);
      expect(result.reasons.some(r => r.includes('Low weekly'))).toBe(true);
    });
  });
});
