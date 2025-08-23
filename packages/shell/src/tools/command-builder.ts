import { createTool } from '@mastra/core';
import { z } from 'zod';

export const commandBuilderTool = createTool({
    id: 'shell-build-command',
    description: 'Build complex shell commands interactively with proper escaping and validation',
    inputSchema: z.object({
        operation: z.enum([
            'find_files', 'backup_directory', 'batch_rename', 'log_analysis',
            'system_monitoring', 'network_diagnostics', 'file_permissions',
            'text_processing', 'archive_operations', 'custom'
        ]).describe('Type of operation to build'),
        parameters: z.record(z.any()).describe('Operation-specific parameters'),
        shell: z.enum(['bash', 'zsh', 'fish', 'powershell']).optional().default('bash'),
        addComments: z.boolean().optional().default(true),
        safeMode: z.boolean().optional().default(true).describe('Add safety checks')
    }),
    outputSchema: z.object({
        command: z.string(),
        explanation: z.string(),
        warnings: z.array(z.string()).optional(),
        alternatives: z.array(z.object({
            command: z.string(),
            description: z.string(),
            pros: z.array(z.string()),
            cons: z.array(z.string())
        })).optional(),
        safety_checks: z.array(z.string()).optional(),
        estimated_time: z.string().optional()
    }),
    execute: async ({ context }: { context: any }) => {
        const { operation, parameters, shell, addComments, safeMode } = context;

        switch (operation) {
            case 'find_files':
                return buildFindCommand(parameters, shell, addComments, safeMode);
            case 'backup_directory':
                return buildBackupCommand(parameters, shell, addComments, safeMode);
            case 'batch_rename':
                return buildRenameCommand(parameters, shell, addComments, safeMode);
            case 'log_analysis':
                return buildLogAnalysisCommand(parameters, shell, addComments, safeMode);
            case 'system_monitoring':
                return buildMonitoringCommand(parameters, shell, addComments, safeMode);
            case 'network_diagnostics':
                return buildNetworkCommand(parameters, shell, addComments, safeMode);
            case 'file_permissions':
                return buildPermissionsCommand(parameters, shell, addComments, safeMode);
            case 'text_processing':
                return buildTextProcessingCommand(parameters, shell, addComments, safeMode);
            case 'archive_operations':
                return buildArchiveCommand(parameters, shell, addComments, safeMode);
            default:
                return buildCustomCommand(parameters, shell, addComments, safeMode);
        }
    }
});

function buildFindCommand(params: any, shell: string, addComments: boolean, safeMode: boolean) {
    const {
        path = '.',
        name,
        type,
        size,
        mtime,
        action = 'print'
    } = params;

    let command = `find "${path}"`;

    if (type) command += ` -type ${type}`;
    if (name) command += ` -name "${name}"`;
    if (size) command += ` -size ${size}`;
    if (mtime) command += ` -mtime ${mtime}`;

    const warnings: string[] = [];
    const safetyChecks = [];

    if (action === 'delete') {
        warnings.push('This command will DELETE files permanently');
        if (safeMode) {
            command += ' -print'; // Show what would be deleted first
            safetyChecks.push('Run with -print first to see what will be deleted');
            safetyChecks.push('Add -confirm for interactive deletion');
        } else {
            command += ' -delete';
        }
    } else if (action === 'exec') {
        command += ` -exec ${params.execCommand || 'echo'} {} \\;`;
    } else {
        command += ' -print';
    }

    const alternatives = [
        {
            command: command.replace('find', 'fd'),
            description: 'Using fd (faster, modern alternative)',
            pros: ['Faster execution', 'Better default behavior', 'Regex support'],
            cons: ['Requires fd to be installed', 'Different syntax']
        }
    ];

    return {
        command,
        explanation: `Find files in ${path} matching the specified criteria`,
        warnings: warnings.length > 0 ? warnings : undefined,
        alternatives,
        safety_checks: safetyChecks.length > 0 ? safetyChecks : undefined,
        estimated_time: 'Varies based on directory size'
    };
}

function buildBackupCommand(params: any, shell: string, addComments: boolean, safeMode: boolean) {
    const {
        source,
        destination,
        compression = 'gzip',
        exclude = [],
        incremental = false
    } = params;

    if (!source || !destination) {
        throw new Error('Source and destination are required for backup operations');
    }

    let command: string;
    const warnings: string[] = [];
    const safetyChecks = [];

    if (incremental) {
        command = `rsync -avz --progress`;
        if (exclude.length > 0) {
            command += ` ${exclude.map((ex: string) => `--exclude="${ex}"`).join(' ')}`;
        }
        command += ` "${source}" "${destination}"`;
    } else {
        const timestamp = '$(date +%Y%m%d_%H%M%S)';
        if (compression === 'gzip') {
            command = `tar -czf "${destination}/backup_${timestamp}.tar.gz"`;
        } else if (compression === 'xz') {
            command = `tar -cJf "${destination}/backup_${timestamp}.tar.xz"`;
        } else {
            command = `tar -cf "${destination}/backup_${timestamp}.tar"`;
        }

        if (exclude.length > 0) {
            command += ` ${exclude.map((ex: string) => `--exclude="${ex}"`).join(' ')}`;
        }
        command += ` -C "$(dirname "${source}")" "$(basename "${source}")"`;
    }

    if (safeMode) {
        safetyChecks.push('Verify destination has enough space');
        safetyChecks.push('Test restore process with small backup first');
    }

    return {
        command,
        explanation: `Create ${incremental ? 'incremental' : 'full'} backup of ${source}`,
        warnings,
        safety_checks: safetyChecks,
        estimated_time: 'Depends on data size and storage speed'
    };
}

function buildRenameCommand(params: any, shell: string, addComments: boolean, safeMode: boolean) {
    const {
        pattern,
        replacement,
        path = '.',
        preview = true
    } = params;

    if (!pattern || !replacement) {
        throw new Error('Pattern and replacement are required');
    }

    let command: string;
    const warnings: string[] = [];
    const safetyChecks = [];

    if (shell === 'bash' || shell === 'zsh') {
        if (preview || safeMode) {
            command = `find "${path}" -name "${pattern}" -type f`;
            if (!preview) {
                command += ` -exec bash -c 'mv "$1" "\${1/${pattern}/${replacement}}" ' _ {} \\;`;
            }
        } else {
            command = `find "${path}" -name "${pattern}" -type f -exec bash -c 'mv "$1" "\${1/${pattern}/${replacement}}" ' _ {} \\;`;
        }
    } else {
        command = `rename 's/${pattern}/${replacement}/' "${path}"/*`;
        if (preview) command = `rename -n 's/${pattern}/${replacement}/' "${path}"/*`;
    }

    if (!preview) {
        warnings.push('This will rename files permanently');
        safetyChecks.push('Run with preview mode first');
    }

    return {
        command,
        explanation: `${preview ? 'Preview' : 'Execute'} batch rename operation`,
        warnings: warnings.length > 0 ? warnings : undefined,
        safety_checks: safetyChecks.length > 0 ? safetyChecks : undefined
    };
}

function buildLogAnalysisCommand(params: any, shell: string, addComments: boolean, safeMode: boolean) {
    const {
        logFile,
        pattern,
        timeRange,
        outputFormat = 'summary'
    } = params;

    if (!logFile) {
        throw new Error('Log file path is required');
    }

    let command: string;

    if (pattern) {
        command = `grep "${pattern}" "${logFile}"`;

        if (timeRange) {
            // Add date filtering logic
            command += ` | grep "${timeRange}"`;
        }

        if (outputFormat === 'count') {
            command += ' | wc -l';
        } else if (outputFormat === 'unique') {
            command += ' | sort | uniq -c | sort -nr';
        } else if (outputFormat === 'tail') {
            command += ' | tail -20';
        }
    } else {
        command = `tail -f "${logFile}"`;
    }

    return {
        command,
        explanation: `Analyze log file ${logFile}${pattern ? ` for pattern "${pattern}"` : ''}`,
        estimated_time: 'Real-time for tail -f, varies for analysis'
    };
}

function buildMonitoringCommand(params: any, shell: string, addComments: boolean, safeMode: boolean) {
    const {
        type = 'system',
        interval = 5,
        duration
    } = params;

    let command: string;

    switch (type) {
        case 'cpu':
            command = `top -l ${duration || 1} -s ${interval} | grep "CPU usage"`;
            break;
        case 'memory':
            command = `watch -n ${interval} 'free -h'`;
            break;
        case 'disk':
            command = `watch -n ${interval} 'df -h'`;
            break;
        case 'network':
            command = `watch -n ${interval} 'netstat -i'`;
            break;
        default:
            command = `watch -n ${interval} 'uptime && free -h && df -h'`;
    }

    return {
        command,
        explanation: `Monitor ${type} every ${interval} seconds`,
        estimated_time: duration ? `${duration * interval} seconds` : 'Until interrupted'
    };
}

function buildNetworkCommand(params: any, shell: string, addComments: boolean, safeMode: boolean) {
    const {
        target,
        type = 'ping',
        count = 4
    } = params;

    let command: string;

    switch (type) {
        case 'ping':
            command = `ping -c ${count} ${target || 'google.com'}`;
            break;
        case 'traceroute':
            command = `traceroute ${target || 'google.com'}`;
            break;
        case 'port_scan':
            if (!target) throw new Error('Target required for port scan');
            command = `nmap -p 1-1000 ${target}`;
            break;
        case 'dns_lookup':
            command = `nslookup ${target || 'google.com'}`;
            break;
        default:
            command = `ping -c ${count} ${target || 'google.com'}`;
    }

    const warnings = type === 'port_scan' ? ['Port scanning may be detected as malicious activity'] : undefined;

    return {
        command,
        explanation: `Network ${type} for ${target || 'default target'}`,
        warnings,
        estimated_time: 'Few seconds to minutes'
    };
}

function buildPermissionsCommand(params: any, shell: string, addComments: boolean, safeMode: boolean) {
    const {
        path,
        permissions,
        recursive = false,
        owner,
        group
    } = params;

    if (!path) {
        throw new Error('Path is required for permission operations');
    }

    let commands = [];
    const warnings: string[] = [];

    if (permissions) {
        let cmd = `chmod ${recursive ? '-R ' : ''}${permissions} "${path}"`;
        commands.push(cmd);
    }

    if (owner) {
        let cmd = `chown ${recursive ? '-R ' : ''}${owner} "${path}"`;
        commands.push(cmd);
        warnings.push('Changing ownership may require sudo privileges');
    }

    if (group) {
        let cmd = `chgrp ${recursive ? '-R ' : ''}${group} "${path}"`;
        commands.push(cmd);
        warnings.push('Changing group may require sudo privileges');
    }

    const command = commands.join(' && ');

    return {
        command,
        explanation: `Change permissions/ownership for ${path}`,
        warnings: warnings.length > 0 ? warnings : undefined
    };
}

function buildTextProcessingCommand(params: any, shell: string, addComments: boolean, safeMode: boolean) {
    const {
        file,
        operation,
        pattern,
        replacement,
        output
    } = params;

    if (!file) {
        throw new Error('Input file is required');
    }

    let command: string;

    switch (operation) {
        case 'replace':
            if (!pattern || !replacement) {
                throw new Error('Pattern and replacement required for replace operation');
            }
            command = `sed 's/${pattern}/${replacement}/g' "${file}"`;
            if (output) command += ` > "${output}"`;
            break;
        case 'extract':
            if (!pattern) {
                throw new Error('Pattern required for extract operation');
            }
            command = `grep "${pattern}" "${file}"`;
            if (output) command += ` > "${output}"`;
            break;
        case 'sort':
            command = `sort "${file}"`;
            if (output) command += ` > "${output}"`;
            break;
        case 'unique':
            command = `sort "${file}" | uniq`;
            if (output) command += ` > "${output}"`;
            break;
        default:
            command = `cat "${file}"`;
    }

    return {
        command,
        explanation: `${operation} operation on ${file}`,
        estimated_time: 'Depends on file size'
    };
}

function buildArchiveCommand(params: any, shell: string, addComments: boolean, safeMode: boolean) {
    const {
        operation = 'create',
        archive,
        files = [],
        compression = 'gzip',
        extractTo
    } = params;

    let command: string;
    const warnings: string[] = [];

    switch (operation) {
        case 'create':
            if (!archive || files.length === 0) {
                throw new Error('Archive name and files are required for create operation');
            }

            const ext = compression === 'gzip' ? '.tar.gz' :
                compression === 'bzip2' ? '.tar.bz2' :
                    compression === 'xz' ? '.tar.xz' : '.tar';

            const flag = compression === 'gzip' ? 'czf' :
                compression === 'bzip2' ? 'cjf' :
                    compression === 'xz' ? 'cJf' : 'cf';

            command = `tar -${flag} "${archive}${ext}" ${files.map((f: string) => `"${f}"`).join(' ')}`;
            break;

        case 'extract':
            if (!archive) {
                throw new Error('Archive name is required for extract operation');
            }
            command = `tar -xf "${archive}"`;
            if (extractTo) command += ` -C "${extractTo}"`;
            break;

        case 'list':
            if (!archive) {
                throw new Error('Archive name is required for list operation');
            }
            command = `tar -tf "${archive}"`;
            break;

        default:
            throw new Error(`Unknown archive operation: ${operation}`);
    }

    return {
        command,
        explanation: `${operation} archive operation`,
        warnings: warnings.length > 0 ? warnings : undefined
    };
}

function buildCustomCommand(params: any, shell: string, addComments: boolean, safeMode: boolean) {
    const { description, baseCommand, options = [] } = params;

    if (!baseCommand) {
        throw new Error('Base command is required for custom operations');
    }

    let command = baseCommand;

    if (options.length > 0) {
        command += ' ' + options.join(' ');
    }

    return {
        command,
        explanation: description || `Custom command: ${baseCommand}`,
        warnings: safeMode ? ['Custom command - please review carefully'] : undefined
    };
}

