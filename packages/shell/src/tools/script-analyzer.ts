import { createTool } from '@mastra/core';
import { z } from 'zod';

export const scriptAnalyzerTool = createTool({
    id: 'shell-analyze-script',
    description: 'Analyze shell scripts for best practices, security issues, and optimizations',
    inputSchema: z.object({
        script: z.string().describe('Shell script content to analyze'),
        shell: z.enum(['bash', 'zsh', 'fish', 'powershell']).optional().default('bash'),
        checkSecurity: z.boolean().optional().default(true),
        checkPerformance: z.boolean().optional().default(true),
        checkPortability: z.boolean().optional().default(false)
    }),
    outputSchema: z.object({
        score: z.number().min(0).max(100).describe('Overall script quality score'),
        issues: z.array(z.object({
            line: z.number().optional(),
            type: z.enum(['security', 'performance', 'style', 'portability', 'error']),
            severity: z.enum(['low', 'medium', 'high', 'critical']),
            message: z.string(),
            suggestion: z.string().optional(),
            rule: z.string()
        })),
        suggestions: z.array(z.object({
            type: z.enum(['optimization', 'security', 'style', 'modernization']),
            description: z.string(),
            before: z.string().optional(),
            after: z.string().optional()
        })),
        statistics: z.object({
            lines: z.number(),
            functions: z.number(),
            commands: z.number(),
            complexity: z.enum(['low', 'medium', 'high'])
        })
    }),
    execute: async ({ context }: { context: any }) => {
        const { script, shell, checkSecurity, checkPerformance, checkPortability } = context;

        const lines = script.split('\n');
        const issues: any[] = [];
        const suggestions: any[] = [];

        // Security analysis
        if (checkSecurity) {
            lines.forEach((line: string, index: number) => {
                // Check for common security issues
                if (line.includes('eval ') && !line.trim().startsWith('#')) {
                    issues.push({
                        line: index + 1,
                        type: 'security',
                        severity: 'high',
                        message: 'Use of eval() can be dangerous',
                        suggestion: 'Consider using arrays or proper parsing instead',
                        rule: 'no-eval'
                    });
                }

                if (line.match(/\$\([^)]*\$[^)]*\)/)) {
                    issues.push({
                        line: index + 1,
                        type: 'security',
                        severity: 'medium',
                        message: 'Nested command substitution can be risky',
                        suggestion: 'Break complex commands into separate variables',
                        rule: 'avoid-nested-substitution'
                    });
                }

                if (line.includes('rm -rf $') && !line.includes('"')) {
                    issues.push({
                        line: index + 1,
                        type: 'security',
                        severity: 'critical',
                        message: 'Unquoted variable in rm -rf command',
                        suggestion: 'Always quote variables: rm -rf "$variable"',
                        rule: 'quote-rm-variables'
                    });
                }
            });
        }

        // Performance analysis
        if (checkPerformance) {
            lines.forEach((line: string, index: number) => {
                // Check for inefficient patterns
                if (line.includes('cat ') && line.includes('| grep')) {
                    suggestions.push({
                        type: 'optimization',
                        description: 'Use grep directly instead of cat | grep',
                        before: line.trim(),
                        after: line.replace(/cat\s+([^\s]+)\s*\|\s*grep/, 'grep $2 $1')
                    });
                }

                if (line.match(/for.*in\s*\$\(ls/)) {
                    issues.push({
                        line: index + 1,
                        type: 'performance',
                        severity: 'medium',
                        message: 'Parsing ls output in loop is inefficient and unreliable',
                        suggestion: 'Use shell globbing: for file in *; do',
                        rule: 'avoid-ls-parsing'
                    });
                }
            });
        }

        // Portability analysis
        if (checkPortability) {
            lines.forEach((line: string, index: number) => {
                if (line.includes('[[') && shell === 'sh') {
                    issues.push({
                        line: index + 1,
                        type: 'portability',
                        severity: 'medium',
                        message: '[[ ]] is not portable to POSIX sh',
                        suggestion: 'Use [ ] for POSIX compatibility',
                        rule: 'posix-compatibility'
                    });
                }
            });
        }

        // Style analysis
        lines.forEach((line: string, index: number) => {
            if (line.match(/\$[A-Za-z_][A-Za-z0-9_]*[^"]/) && !line.trim().startsWith('#')) {
                issues.push({
                    line: index + 1,
                    type: 'style',
                    severity: 'low',
                    message: 'Variable should be quoted',
                    suggestion: 'Use "$variable" instead of $variable',
                    rule: 'quote-variables'
                });
            }
        });

        // Calculate statistics
        const functionCount = lines.filter((line: string) =>
            line.match(/^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\(\s*\)/) ||
            line.match(/^\s*function\s+[a-zA-Z_][a-zA-Z0-9_]*/)
        ).length;

        const commandCount = lines.filter((line: string) =>
            line.trim() &&
            !line.trim().startsWith('#') &&
            !line.trim().startsWith('if') &&
            !line.trim().startsWith('for') &&
            !line.trim().startsWith('while')
        ).length;

        // Calculate complexity based on control structures
        const controlStructures = lines.filter((line: string) =>
            line.match(/^\s*(if|for|while|case|select)\b/)
        ).length;

        const complexity = (controlStructures > 10 ? 'high' :
            controlStructures > 5 ? 'medium' : 'low') as 'low' | 'medium' | 'high';

        // Calculate overall score
        const criticalIssues = issues.filter(i => i.severity === 'critical').length;
        const highIssues = issues.filter(i => i.severity === 'high').length;
        const mediumIssues = issues.filter(i => i.severity === 'medium').length;
        const lowIssues = issues.filter(i => i.severity === 'low').length;

        let score = 100;
        score -= criticalIssues * 25;
        score -= highIssues * 15;
        score -= mediumIssues * 10;
        score -= lowIssues * 5;
        score = Math.max(0, score);

        return {
            score,
            issues,
            suggestions,
            statistics: {
                lines: lines.length,
                functions: functionCount,
                commands: commandCount,
                complexity
            }
        };
    }
});

