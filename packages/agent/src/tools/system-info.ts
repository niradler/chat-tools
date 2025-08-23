import { z } from 'zod';
import { platform, arch, cpus, totalmem, freemem, uptime, hostname } from 'os';
import { version } from 'process';

export const systemInfoTool = {
  description: 'Get system information including OS, hardware, and runtime details',
  parameters: z.object({
    type: z.enum(['basic', 'detailed', 'memory', 'cpu']).optional().default('basic'),
  }),
  execute: async ({ type = 'basic' }: { type?: 'basic' | 'detailed' | 'memory' | 'cpu' }) => {
    try {
      const basicInfo = {
        platform: platform(),
        architecture: arch(),
        hostname: hostname(),
        nodeVersion: version,
        uptime: uptime(),
      };

      if (type === 'basic') {
        return {
          success: true,
          type,
          info: basicInfo,
        };
      }

      if (type === 'memory') {
        return {
          success: true,
          type,
          info: {
            ...basicInfo,
            memory: {
              total: totalmem(),
              free: freemem(),
              used: totalmem() - freemem(),
              usagePercentage: ((totalmem() - freemem()) / totalmem()) * 100,
            },
          },
        };
      }

      if (type === 'cpu') {
        const cpuInfo = cpus();
        return {
          success: true,
          type,
          info: {
            ...basicInfo,
            cpu: {
              count: cpuInfo.length,
              model: cpuInfo[0]?.model || 'Unknown',
              speed: cpuInfo[0]?.speed || 0,
              cores: cpuInfo.map(cpu => ({
                model: cpu.model,
                speed: cpu.speed,
              })),
            },
          },
        };
      }

      if (type === 'detailed') {
        const cpuInfo = cpus();
        return {
          success: true,
          type,
          info: {
            ...basicInfo,
            memory: {
              total: totalmem(),
              free: freemem(),
              used: totalmem() - freemem(),
              usagePercentage: ((totalmem() - freemem()) / totalmem()) * 100,
            },
            cpu: {
              count: cpuInfo.length,
              model: cpuInfo[0]?.model || 'Unknown',
              speed: cpuInfo[0]?.speed || 0,
            },
            environment: {
              cwd: process.cwd(),
              pid: process.pid,
              ppid: process.ppid,
              argv: process.argv,
            },
          },
        };
      }

      return {
        success: false,
        error: `Unknown info type: ${type}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        type,
      };
    }
  },
};