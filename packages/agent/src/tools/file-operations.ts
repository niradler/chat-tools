import { z } from 'zod';
import { promises as fs } from 'fs';
import { resolve, dirname } from 'path';

export const fileOperationsTool = {
  description: 'Perform file system operations like reading, writing, and listing files',
  parameters: z.object({
    operation: z.enum(['read', 'write', 'list', 'exists', 'mkdir', 'delete']),
    path: z.string().describe('File or directory path'),
    content: z.string().optional().describe('Content to write (for write operation)'),
    recursive: z.boolean().optional().describe('Whether to operate recursively'),
  }),
  execute: async ({ operation, path, content, recursive = false }: { operation: 'read' | 'write' | 'list' | 'exists' | 'mkdir' | 'delete'; path: string; content?: string; recursive?: boolean }) => {
    try {
      const fullPath = resolve(path);

      switch (operation) {
        case 'read':
          const fileContent = await fs.readFile(fullPath, 'utf-8');
          return {
            success: true,
            operation,
            path: fullPath,
            content: fileContent,
            size: fileContent.length,
          };

        case 'write':
          if (!content) {
            throw new Error('Content is required for write operation');
          }
          // Ensure directory exists
          await fs.mkdir(dirname(fullPath), { recursive: true });
          await fs.writeFile(fullPath, content, 'utf-8');
          return {
            success: true,
            operation,
            path: fullPath,
            bytesWritten: Buffer.byteLength(content, 'utf-8'),
          };

        case 'list':
          const entries = await fs.readdir(fullPath, { withFileTypes: true });
          return {
            success: true,
            operation,
            path: fullPath,
            entries: entries.map(entry => ({
              name: entry.name,
              type: entry.isDirectory() ? 'directory' : 'file',
              path: resolve(fullPath, entry.name),
            })),
          };

        case 'exists':
          try {
            await fs.access(fullPath);
            return {
              success: true,
              operation,
              path: fullPath,
              exists: true,
            };
          } catch {
            return {
              success: true,
              operation,
              path: fullPath,
              exists: false,
            };
          }

        case 'mkdir':
          await fs.mkdir(fullPath, { recursive });
          return {
            success: true,
            operation,
            path: fullPath,
          };

        case 'delete':
          const stat = await fs.stat(fullPath);
          if (stat.isDirectory()) {
            await fs.rmdir(fullPath, { recursive });
          } else {
            await fs.unlink(fullPath);
          }
          return {
            success: true,
            operation,
            path: fullPath,
            type: stat.isDirectory() ? 'directory' : 'file',
          };

        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
    } catch (error: any) {
      return {
        success: false,
        operation,
        path,
        error: error.message,
      };
    }
  },
};