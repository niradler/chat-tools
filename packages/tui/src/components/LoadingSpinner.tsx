import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

interface LoadingSpinnerProps {
  text?: string;
  variant?: 'dots' | 'spinner' | 'bar' | 'pulse' | 'bounce';
  color?: string;
  speed?: number;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  text = 'Loading...',
  variant = 'dots',
  color = 'cyan',
  speed = 200
}) => {
  const [frame, setFrame] = useState(0);

  const animations = {
    dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    spinner: ['|', '/', '-', '\\'],
    bar: ['▁', '▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃'],
    pulse: ['●', '◐', '○', '◑'],
    bounce: ['⠁', '⠂', '⠄', '⠂']
  };

  const frames = animations[variant];

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(prev => (prev + 1) % frames.length);
    }, speed);

    return () => clearInterval(interval);
  }, [frames.length, speed]);

  return (
    <Box>
      <Text color={color}>{frames[frame]} </Text>
      <Text>{text}</Text>
    </Box>
  );
};
