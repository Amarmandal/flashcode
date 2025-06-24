import {
  bashIcon,
  cppIcon,
  goIcon,
  javaIcon,
  javascriptIcon,
  phpIcon,
  pythonIcon,
  rustIcon,
  swiftIcon,
  typescriptIcon,
} from './language-icons';

export const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'rust', label: 'Rust' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'go', label: 'Go' },
  { value: 'php', label: 'PHP' },
  { value: 'swift', label: 'Swift' },
  { value: 'bash', label: 'Bash' },
];

export const languageIcons: Record<string, string> = {
  rust: rustIcon,
  javascript: javascriptIcon,
  python: pythonIcon,
  java: javaIcon,
  cpp: cppIcon,
  go: goIcon,
  typescript: typescriptIcon,
  php: phpIcon,
  swift: swiftIcon,
  bash: bashIcon,
};
