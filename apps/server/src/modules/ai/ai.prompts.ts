export interface PromptTemplate {
  name: string;
  template: string;
}

const promptTemplates = new Map<string, PromptTemplate>([
  [
    'system.default',
    {
      name: 'system.default',
      template: 'You are Tang AI. Answer clearly and helpfully.',
    },
  ],
  [
    'vision.default',
    {
      name: 'vision.default',
      template: 'Analyze the provided image input and return a concise answer.',
    },
  ],
]);

export function getPromptTemplate(name: string): PromptTemplate {
  const template = promptTemplates.get(name);
  if (!template) {
    throw new Error(`Unknown prompt template: ${name}`);
  }

  return template;
}

export function renderPromptTemplate(name: string, variables: Record<string, string>): string {
  const template = getPromptTemplate(name).template;

  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    return variables[key] ?? '';
  });
}
