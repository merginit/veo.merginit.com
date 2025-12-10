export enum AspectRatio {
  Landscape = '16:9',
  Portrait = '9:16'
}

export enum Resolution {
  HD = '720p',
  FHD = '1080p'
}

export enum VeoModel {
  Fast = 'veo-3.1-fast-generate-001',
  Quality = 'veo-3.1-generate-001'
}

export interface VideoGenerationState {
  isGenerating: boolean;
  progressMessage: string;
  videoUri: string | null;
  error: string | null;
}

export interface GenerationParams {
  prompt: string;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  model: VeoModel;
  storageUri?: string;
  responseCount?: number;
}

export interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain?: string;
}

export interface PromptHistoryEntry {
  id: number;
  prompt: string;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  model: VeoModel;
  videoUri: string | null;
  videoBlob?: Blob | null;
  error: string | null;
  createdAt: number;
}

export interface GenerationResult {
  uri: string;
  blob?: Blob | null;
}
