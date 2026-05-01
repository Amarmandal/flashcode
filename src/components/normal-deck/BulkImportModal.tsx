import { Modal, Stack, Text, Button, Group, FileButton, Alert, Paper, Tabs, Textarea, rem } from '@mantine/core';
import { IconFileUpload, IconAlertCircle, IconCheck, IconTextPlus, IconUpload } from '@tabler/icons-react';
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { SuccessApiResponse } from '../../types/successApiResponse';
import { NormalCard } from '../../types/normalDeck';

interface BulkImportModalProps {
  opened: boolean;
  onClose: () => void;
  deckId: number;
  existingFronts: string[];
  onImportComplete: (addedCount: number, skippedCount: number) => void;
}

interface ImportRecord {
  front: string;
  back: string;
}

export function BulkImportModal({ opened, onClose, deckId, existingFronts, onImportComplete }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('file');

  const resetState = () => {
    setFile(null);
    setTextInput('');
    setError(null);
    setIsProcessing(false);
    setActiveTab('file');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const processImport = async (jsonText: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      let records: ImportRecord[];

      try {
        records = JSON.parse(jsonText);
      } catch {
        setError('Invalid JSON format. Please check your file.');
        setIsProcessing(false);
        return;
      }

      if (!Array.isArray(records)) {
        setError('File must contain a JSON array of objects.');
        setIsProcessing(false);
        return;
      }

      if (records.length > 500) {
        setError('File exceeds the 500 record limit.');
        setIsProcessing(false);
        return;
      }

      let addedCount = 0;
      let skippedCount = 0;
      const existingFrontsSet = new Set(existingFronts);

      for (const record of records) {
        if (
          !record ||
          typeof record !== 'object' ||
          typeof record.front !== 'string' ||
          typeof record.back !== 'string' ||
          !record.front.trim() ||
          !record.back.trim()
        ) {
          skippedCount++;
          continue;
        }

        if (existingFrontsSet.has(record.front)) {
          skippedCount++;
          continue;
        }

        try {
          const res = await invoke<SuccessApiResponse<NormalCard>>('create_normal_card', {
            deckId,
            front: record.front,
            back: record.back,
          });

          if (res.success) {
            addedCount++;
            existingFrontsSet.add(record.front);
          } else {
            skippedCount++;
          }
        } catch {
          skippedCount++;
        }
      }

      onImportComplete(addedCount, skippedCount);
      handleClose();
    } catch {
      setError('Failed to process input. Please try again.');
      setIsProcessing(false);
    }
  };

  const validateAndImportFile = async (selectedFile: File | null) => {
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);

    if (!selectedFile.name.endsWith('.json')) {
      setError('Only .json files are supported.');
      return;
    }

    try {
      const text = await selectedFile.text();
      await processImport(text);
    } catch {
      setError('Failed to read file. Please try again.');
    }
  };

  const handleTextImport = async () => {
    if (!textInput.trim()) {
      setError('Please enter JSON content.');
      return;
    }
    await processImport(textInput);
  };

  const iconStyle = { width: rem(16), height: rem(16) };

  return (
    <Modal opened={opened} onClose={handleClose} title="Bulk Import Flashcards" size="lg">
      <Stack>
        <Text size="sm" c="dimmed">
          Import up to 500 flashcards. Cards will be appended to the existing deck.
        </Text>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List grow>
            <Tabs.Tab value="file" leftSection={<IconFileUpload style={iconStyle} />}>
              Upload File
            </Tabs.Tab>
            <Tabs.Tab value="text" leftSection={<IconTextPlus style={iconStyle} />}>
              Paste JSON
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="file" pt="md">
            <Stack>
              <Paper withBorder p="xl" radius="md" style={{ borderStyle: 'dashed', borderWidth: 2 }}>
                <Stack align="center" gap="md">
                  <IconUpload size={48} stroke={1.5} opacity={0.5} />
                  <Stack align="center" gap={4}>
                    <Text size="sm" fw={500}>
                      Drop your JSON file here or click to browse
                    </Text>
                    <Text size="xs" c="dimmed">
                      Only .json files are accepted
                    </Text>
                  </Stack>
                  <FileButton onChange={validateAndImportFile} accept=".json" disabled={isProcessing}>
                    {(props) => (
                      <Button {...props} variant="light" loading={isProcessing} size="md">
                        {isProcessing ? 'Importing...' : 'Select File'}
                      </Button>
                    )}
                  </FileButton>
                </Stack>
              </Paper>

              {file && !error && !isProcessing && (
                <Alert icon={<IconCheck size={16} />} color="blue" title="File selected">
                  {file.name}
                </Alert>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="text" pt="md">
            <Stack>
              <Textarea
                placeholder={`[\n  { "front": "Question?", "back": "Answer" },\n  { "front": "2 + 2", "back": "4" }\n]`}
                value={textInput}
                onChange={(e) => setTextInput(e.currentTarget.value)}
                disabled={isProcessing}
                styles={{
                  input: {
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    height: '250px',
                  },
                }}
              />
              <Button
                leftSection={<IconUpload size={16} />}
                onClick={handleTextImport}
                loading={isProcessing}
                disabled={!textInput.trim()}
              >
                {isProcessing ? 'Importing...' : 'Import Cards'}
              </Button>
            </Stack>
          </Tabs.Panel>
        </Tabs>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error">
            {error}
          </Alert>
        )}

        <Paper
          p="md"
          withBorder
          radius="md"
          style={{
            backgroundColor: 'var(--mantine-color-blue-light)',
            borderColor: 'var(--mantine-color-blue-light-color)',
          }}
        >
          <Text size="sm" fw={600} mb={8} c="blue.9">
            Requirements:
          </Text>
          <Stack gap={6}>
            <Text size="sm" c="blue.9">
              • JSON array with "front" and "back" fields
            </Text>
            <Text size="sm" c="blue.9">
              • Maximum 500 records per import
            </Text>
            <Text size="sm" c="blue.9">
              • Duplicates and malformed records will be skipped
            </Text>
          </Stack>
        </Paper>

        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleClose} disabled={isProcessing}>
            Cancel
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
