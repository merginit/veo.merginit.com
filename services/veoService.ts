import { GenerationParams, VeoModel, Resolution } from "../types";
import { getAccessToken, getProjectId } from "./authService";

const LOCATION = "us-central1";

export const generateVeoVideo = async (
  params: GenerationParams,
  onProgress: (msg: string) => void
): Promise<string> => {
  const { model } = params;

  onProgress("Authenticating with Vertex AI...");
  const accessToken = await getAccessToken();
  const projectId = getProjectId();

  const candidates = buildModelOrder(String(model));
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      awaitRespectRateLimit(candidate);
      const lroEndpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${LOCATION}/publishers/google/models/${candidate}:predictLongRunning`;
      onProgress(`Starting request with ${candidate} (LRO)...`);
      const op = await startLongRunning(lroEndpoint, accessToken, params);
      const opName = op.name;
      if (!opName) {
        throw new Error("Operation Name fehlt in der Antwort.");
      }
      onProgress("Waiting for generation...");
      const final = await waitForOperation(projectId, candidate, opName, accessToken);
      const videoUri = extractVideoUriFromOperation(final);
      if (videoUri) return await maybeDownload(videoUri, accessToken, onProgress);
      throw new Error("Kein Video-URI in der Operation gefunden.");
    } catch (e: any) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const is429 = /429/.test(lastError.message) || /RESOURCE_EXHAUSTED/.test(lastError.message);
      if (is429) {
        onProgress(`Quota reached for ${candidate}. Backing off...`);
        await applyBackoff();
        onProgress(`Switching to next model...`);
        continue;
      }
      throw lastError;
    }
  }

  if (lastError) throw lastError;
  throw new Error("All Veo models failed.");

  function buildModelOrder(selected: string): string[] {
    const defaultOrder = [
      "veo-3.1-generate-001",
      "veo-3.1-fast-generate-001",
      "veo-3.0-generate-001",
      "veo-3.0-fast-generate-001",
    ];
    const envOrder = (import.meta as any).env?.VITE_VEO_MODEL_ORDER as string | undefined;
    const configured = envOrder ? envOrder.split(",").map(s => s.trim()).filter(Boolean) : defaultOrder;
    const set = new Set<string>();
    const order: string[] = [];
    [selected, ...configured].forEach(id => {
      if (!id) return;
      if (!knownModels().includes(id)) return;
      if (!set.has(id)) { set.add(id); order.push(id); }
    });
    return order;
  }

  function knownModels(): string[] {
    return [
      "veo-3.1-generate-001",
      "veo-3.1-fast-generate-001",
      "veo-3.0-generate-001",
      "veo-3.0-fast-generate-001",
      String(VeoModel.Fast),
      String(VeoModel.Quality)
    ];
  }

  async function startLongRunning(endpoint: string, accessToken: string, p: GenerationParams) {
    const payload = {
      instances: [
        {
          prompt: p.prompt
        }
      ],
      parameters: {
        aspectRatio: p.aspectRatio,
        sampleCount: typeof p.responseCount === 'number' ? Math.max(1, Math.min(2, p.responseCount)) : 1,
        resolution: mapResolution(p.resolution),
        storageUri: p.storageUri
      }
    };
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vertex AI Error (${response.status}): ${errorText}`);
    }
    return await response.json();
  }

  async function waitForOperation(projectId: string, modelId: string, opName: string, accessToken: string) {
    const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${LOCATION}/publishers/google/models/${modelId}:fetchPredictOperation`;
    let attempts = 0;
    while (true) {
      const body = { operationName: opName };
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vertex AI Error (${response.status}): ${errorText}`);
      }
      const json = await response.json();
      if (json.done) return json;
      attempts++;
      await new Promise(r => setTimeout(r, Math.min(2000 + attempts * 250, 5000)));
    }
  }

  function extractVideoUriFromOperation(op: any): string | null {
    if (!op.response || !op.response.videos) return null;
    const videos = op.response.videos as Array<{ gcsUri?: string; mimeType?: string; bytesBase64Encoded?: string }>;
    const first = videos[0];
    if (!first) return null;
    if (first.gcsUri) return first.gcsUri;
    const bytes = (first as any).bytesBase64Encoded;
    if (bytes) return `data:video/mp4;base64,${bytes}`;
    return null;
  }

  async function maybeDownload(videoUri: string, accessToken: string, onProgress: (msg: string) => void): Promise<string> {
    if (videoUri.startsWith("gs://")) {
      onProgress("Retrieving video from Cloud Storage...");
      return await downloadGcsVideo(videoUri, accessToken);
    }
    return videoUri;
  }
};

async function downloadGcsVideo(gcsUri: string, accessToken: string): Promise<string> {
  const matches = gcsUri.match(/gs:\/\/([^/]+)\/(.+)/);
  if (!matches) {
    throw new Error("Invalid GCS URI format");
  }

  const bucket = matches[1];
  const objectPath = encodeURIComponent(matches[2]);

  const downloadUrl = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${objectPath}?alt=media`;

  const response = await fetch(downloadUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to download video artifact: ${response.statusText}`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

const limiterState: Map<string, { windowStart: number; used: number }> = new Map();
function limitFor(modelId: string): number {
  if (modelId.startsWith("veo-3.1")) return 50;
  if (modelId.startsWith("veo-3.0")) return 10;
  return 50;
}

async function awaitRespectRateLimit(modelId: string): Promise<void> {
  const now = Date.now();
  const limit = limitFor(modelId);
  const state = limiterState.get(modelId) || { windowStart: now, used: 0 };
  if (now - state.windowStart >= 60000) {
    state.windowStart = now;
    state.used = 0;
  }
  if (state.used >= limit) {
    const waitMs = 60000 - (now - state.windowStart);
    await new Promise(r => setTimeout(r, Math.max(waitMs, 100)));
    state.windowStart = Date.now();
    state.used = 0;
  }
  state.used += 1;
  limiterState.set(modelId, state);
}

let backoffMs = 250;
async function applyBackoff(): Promise<void> {
  await new Promise(r => setTimeout(r, backoffMs));
  backoffMs = Math.min(backoffMs * 2, 8000);
}

function mapResolution(r: Resolution | undefined): string | undefined {
  if (!r) return undefined;
  if (r === Resolution.HD) return "720p";
  if (r === Resolution.FHD) return "1080p";
  return undefined;
}
