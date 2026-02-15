import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import {
  generateRoadmap,
  getRoadmap,
  updateMilestone,
  exportRoadmap,
  getRoadmapProvenance,
} from '../services/roadmapApi';

// Mock backend server
const server = setupServer(
  rest.post('http://localhost:7860/api/roadmap/generate', (req, res, ctx) => {
    return res(
      ctx.json({
        roadmapId: 'roadmap-123',
        summary: {
          totalPhases: 3,
          totalMilestones: 12,
          estimatedDuration: '6 months',
        },
      })
    );
  }),
  
  rest.get('http://localhost:7860/api/roadmap/:id', (req, res, ctx) => {
    return res(
      ctx.json({
        _id: req.params.id,
        userId: 'user-123',
        targetRole: 'Data Scientist',
        targetDate: '2026-08-01',
        weeklyHours: 10,
        experienceLevel: 'novice',
        focusAreas: ['ML', 'NLP'],
        phases: [
          {
            name: 'Foundation',
            milestones: [
              {
                id: 'milestone-1',
                title: 'Learn Python Basics',
                description: 'Master Python fundamentals',
                estimatedHours: 40,
                status: 'pending',
                resources: [],
                prerequisites: [],
                dependencies: [],
              },
            ],
          },
        ],
        feasibilityScore: 85,
        provenance: {
          ruleSetVersion: '1.0.0',
          generatedAt: new Date().toISOString(),
        },
      })
    );
  }),
  
  rest.patch('http://localhost:7860/api/roadmap/:id/milestone/:mid', (req, res, ctx) => {
    return res(
      ctx.json({
        _id: req.params.id,
        phases: [
          {
            milestones: [
              {
                id: req.params.mid,
                status: 'completed',
                completedAt: new Date().toISOString(),
              },
            ],
          },
        ],
      })
    );
  }),
  
  rest.get('http://localhost:7860/api/roadmap/:id/provenance', (req, res, ctx) => {
    return res(
      ctx.json({
        ruleSetVersion: '1.0.0',
        generatedAt: new Date().toISOString(),
        inputs: {
          role: 'Data Scientist',
          experience: 'novice',
          targetDate: '2026-08-01',
          weeklyHours: 10,
          focusAreas: ['ML', 'NLP'],
        },
        aiPhrasingLog: [
          {
            field: 'milestone.description',
            timestamp: new Date().toISOString(),
            description: 'LLM used for phrasing only',
          },
        ],
      })
    );
  }),
  
  rest.post('http://localhost:7860/api/roadmap/:id/export', (req, res, ctx) => {
    return res(
      ctx.body(new Blob(['PDF content'], { type: 'application/pdf' }))
    );
  })
);

beforeAll(() => server.listen());
afterAll(() => server.close());

describe('Roadmap API - Integration Tests', () => {
  describe('Generate → Fetch → Patch Cycle', () => {
    it('should complete full roadmap lifecycle', async () => {
      // Step 1: Generate roadmap
      const generateResult = await generateRoadmap({
        userId: 'user-123',
        role: 'Data Scientist',
        jdText: 'Looking for ML experience',
        targetDate: '2026-08-01',
        weeklyHours: 10,
        experience: 'novice',
        focusAreas: ['ML', 'NLP'],
      });
      
      expect(generateResult.roadmapId).toBe('roadmap-123');
      expect(generateResult.summary).toBeDefined();
      
      // Step 2: Fetch roadmap details
      const roadmap = await getRoadmap(generateResult.roadmapId);
      
      expect(roadmap._id).toBe('roadmap-123');
      expect(roadmap.targetRole).toBe('Data Scientist');
      expect(roadmap.phases).toHaveLength(1);
      expect(roadmap.phases[0].milestones).toHaveLength(1);
      
      // Step 3: Update milestone
      const milestone = roadmap.phases[0].milestones[0];
      const updated = await updateMilestone(
        roadmap._id,
        milestone.id,
        { action: 'complete', payload: {} }
      );
      
      expect(updated.phases[0].milestones[0].status).toBe('completed');
    });
    
    it('should fetch provenance data', async () => {
      const provenance = await getRoadmapProvenance('roadmap-123');
      
      expect(provenance.ruleSetVersion).toBe('1.0.0');
      expect(provenance.inputs).toBeDefined();
      expect(provenance.aiPhrasingLog).toHaveLength(1);
    });
    
    it('should export roadmap as PDF', async () => {
      const blob = await exportRoadmap('roadmap-123');
      
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      server.use(
        rest.post('http://localhost:7860/api/roadmap/generate', (req, res, ctx) => {
          return res.networkError('Network error');
        })
      );
      
      await expect(
        generateRoadmap({
          userId: 'user-123',
          role: 'Engineer',
          targetDate: '2026-08-01',
          weeklyHours: 10,
          experience: 'novice',
          focusAreas: [],
        })
      ).rejects.toThrow();
    });
    
    it('should handle 500 errors with retry', async () => {
      let attempts = 0;
      
      server.use(
        rest.get('http://localhost:7860/api/roadmap/:id', (req, res, ctx) => {
          attempts++;
          if (attempts < 2) {
            return res(ctx.status(500), ctx.json({ error: 'Internal server error' }));
          }
          return res(ctx.json({ _id: req.params.id, phases: [] }));
        })
      );
      
      const result = await getRoadmap('roadmap-123');
      expect(result._id).toBe('roadmap-123');
      expect(attempts).toBeGreaterThan(1);
    });
  });
});
