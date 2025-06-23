import { Group, Image, Text } from '@mantine/core';
import { IconCheck, IconFilter } from '@tabler/icons-react';
import { languageIcons } from '../../assets/language-constants';

// For Mantine Select's renderOption prop
export const renderLanguageOption = ({ option, checked }: any) => (
  <Group wrap="nowrap" gap="xs">
    {languageIcons[option.value] && (
      <Image
        src={languageIcons[option.value]}
        alt={option.label}
        width={20}
        height={20}
        style={{ objectFit: 'contain' }}
      />
    )}
    <Text size="sm">{option.label}</Text>
    {checked && <IconCheck size={16} style={{ marginInlineStart: 'auto' }} />}
  </Group>
);

// For Mantine Select's leftSection prop
export function getLanguageSelectLeftSection(language: string | undefined) {
  return language && languageIcons[language] ? (
    <Image src={languageIcons[language]} alt={language} width={16} height={16} />
  ) : (
    <IconFilter size={16} />
  );
}
