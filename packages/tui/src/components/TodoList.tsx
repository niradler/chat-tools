import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import tasuku from "tasuku";

interface TodoItem {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "running" | "completed" | "failed";
  progress?: number;
  subtasks?: TodoItem[];
}

interface TodoListProps {
  todos: TodoItem[];
  onUpdate?: (todos: TodoItem[]) => void;
  showProgress?: boolean;
  interactive?: boolean;
}

export const TodoList: React.FC<TodoListProps> = ({
  todos,
  onUpdate,
  showProgress = true,
  interactive = false,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [localTodos, setLocalTodos] = useState<TodoItem[]>(todos);

  useEffect(() => {
    setLocalTodos(todos);
  }, [todos]);

  const getStatusIcon = (status: TodoItem["status"]) => {
    switch (status) {
      case "pending":
        return "⏳";
      case "running":
        return "🔄";
      case "completed":
        return "✅";
      case "failed":
        return "❌";
      default:
        return "⏳";
    }
  };

  const getStatusColor = (status: TodoItem["status"]) => {
    switch (status) {
      case "pending":
        return "yellow";
      case "running":
        return "blue";
      case "completed":
        return "green";
      case "failed":
        return "red";
      default:
        return "gray";
    }
  };

  const executeTask = async (todo: TodoItem) => {
    const updatedTodos = localTodos.map((t) =>
      t.id === todo.id ? { ...t, status: "running" as const } : t
    );
    setLocalTodos(updatedTodos);
    onUpdate?.(updatedTodos);

    try {
      await tasuku(
        todo.title,
        async ({ setTitle, setStatus, setOutput }: any) => {
          setTitle(todo.title);
          setStatus("running");

          if (todo.description) {
            setOutput(todo.description);
          }

          await new Promise((resolve) => setTimeout(resolve, 1000));

          setStatus("success");
          return `Completed: ${todo.title}`;
        }
      );

      const completedTodos = localTodos.map((t) =>
        t.id === todo.id ? { ...t, status: "completed" as const } : t
      );
      setLocalTodos(completedTodos);
      onUpdate?.(completedTodos);
    } catch (error) {
      const failedTodos = localTodos.map((t) =>
        t.id === todo.id ? { ...t, status: "failed" as const } : t
      );
      setLocalTodos(failedTodos);
      onUpdate?.(failedTodos);
    }
  };

  useInput((input, key) => {
    if (!interactive) return;

    if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      setSelectedIndex(Math.min(localTodos.length - 1, selectedIndex + 1));
    } else if (key.return) {
      const selectedTodo = localTodos[selectedIndex];
      if (selectedTodo && selectedTodo.status === "pending") {
        executeTask(selectedTodo);
      }
    }
  });

  const renderProgressBar = (progress: number) => {
    const width = 20;
    const filled = Math.round((progress / 100) * width);
    const empty = width - filled;
    return (
      <Box>
        <Text color="green">{"█".repeat(filled)}</Text>
        <Text color="gray">{"░".repeat(empty)}</Text>
        <Text color="gray"> {progress}%</Text>
      </Box>
    );
  };

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box
        borderStyle="round"
        borderColor="cyan"
        padding={1}
        flexDirection="column"
      >
        <Box justifyContent="space-between" marginBottom={1}>
          <Text bold color="cyan">
            📋 Todo List
          </Text>
          <Text color="gray" dimColor>
            {localTodos.filter((t) => t.status === "completed").length}/
            {localTodos.length} completed
          </Text>
        </Box>

        <Box flexDirection="column">
          {localTodos.map((todo, index) => (
            <Box
              key={todo.id}
              paddingX={1}
              paddingY={0}
              borderStyle={
                interactive && index === selectedIndex ? "double" : "single"
              }
              borderColor={
                interactive && index === selectedIndex ? "cyan" : "gray"
              }
              marginBottom={1}
            >
              <Box flexDirection="column" width="100%">
                <Box justifyContent="space-between" alignItems="center">
                  <Box alignItems="center">
                    <Text color={getStatusColor(todo.status)}>
                      {getStatusIcon(todo.status)}
                    </Text>
                    <Text bold> {todo.title}</Text>
                  </Box>

                  {todo.status === "running" && (
                    <Text color="blue">Running...</Text>
                  )}
                </Box>

                {todo.description && (
                  <Box paddingLeft={3} paddingTop={0}>
                    <Text color="gray" dimColor wrap="wrap">
                      {todo.description}
                    </Text>
                  </Box>
                )}

                {showProgress && todo.progress !== undefined && (
                  <Box paddingLeft={3} paddingTop={0}>
                    {renderProgressBar(todo.progress)}
                  </Box>
                )}

                {todo.subtasks && todo.subtasks.length > 0 && (
                  <Box paddingLeft={3} paddingTop={0}>
                    {todo.subtasks.map((subtask) => (
                      <Box key={subtask.id} alignItems="center">
                        <Text color={getStatusColor(subtask.status)}>
                          {getStatusIcon(subtask.status)}
                        </Text>
                        <Text color="gray"> {subtask.title}</Text>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          ))}
        </Box>

        {interactive && (
          <Box justifyContent="center" marginTop={1}>
            <Text color="gray" dimColor>
              ↑↓: Navigate | Enter: Execute selected task
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};
