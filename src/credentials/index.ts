/**
 * OpenAI credential type definitions
 */

// Credential type name constant
export const CREDENTIAL_TYPE_NAME = 'openAICredential';

// OpenAI credential definition
export const OpenAICredential = {
  name: CREDENTIAL_TYPE_NAME,
  displayName: 'OpenAI',
  description: 'Credentials for OpenAI API',
  properties: [
    {
      name: 'apiKey',
      displayName: 'API Key',
      type: 'string' as const,
      required: true,
      secret: true,
      description: 'Your OpenAI API key',
      placeholder: 'sk-...'
    },
    {
      name: 'organizationId',
      displayName: 'Organization ID',
      type: 'string' as const,
      required: false,
      description: 'Your OpenAI organization ID (optional)',
      placeholder: 'org-...'
    },
    {
      name: 'baseUrl',
      displayName: 'Base URL',
      type: 'string' as const,
      default: 'https://api.openai.com/v1',
      required: false,
      description: 'Custom API endpoint (optional)'
    }
  ]
};
