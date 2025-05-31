import { CodeHighlight } from '@mantine/code-highlight';
import { Box, Group, Text } from '@mantine/core';
import FontSizeControls from '../common/FontSizeControls';
import { useState } from 'react';

interface CodeBlockWithHeaderProps {
  code: string;
  language: string;
}

export function CodeBlockWithHeader({ code, language }: CodeBlockWithHeaderProps) {
  const [codeFontSize, setCodeFontSize] = useState(14);

  const handleFontSizeIncrease = () => {
    setCodeFontSize((prev) => Math.min(prev + 2, 24)); // Max 24px
  };

  const handleFontSizeDecrease = () => {
    setCodeFontSize((prev) => Math.max(prev - 2, 12)); // Min 12px
  };

  const handleFontSizeReset = () => {
    setCodeFontSize(14); // Reset to default
  };

  return (
    <Box style={{ width: '100%' }}>
      <Group
        gap={0}
        justify="space-between"
        px="sm"
        py="xs"
        bg="var(--mantine-color-gray-light)"
        style={{
          borderTopLeftRadius: '4px',
          borderTopRightRadius: '4px',
          borderBottom: 'none',
        }}
      >
        <Text size="sm" c="dimmed">
          {language}
        </Text>
        <FontSizeControls
          fontSize={codeFontSize}
          onIncrease={handleFontSizeIncrease}
          onDecrease={handleFontSizeDecrease}
          onReset={handleFontSizeReset}
        />
      </Group>
      <CodeHighlight
        code={code}
        language={language}
        withCopyButton={true}
        styles={{
          root: {
            marginTop: 0,
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            width: '100%',
          },
          code: {
            fontSize: `${codeFontSize}px`,
            transition: 'font-size 0.2s ease',
          },
          copy: {
            position: 'absolute',
            right: 135,
            top: -37,
          },
        }}
      />
    </Box>
  );
}
