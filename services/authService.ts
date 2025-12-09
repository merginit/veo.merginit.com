import { ServiceAccount } from '../types';
const SCOPES = ['https://www.googleapis.com/auth/cloud-platform'];

let currentCredentials: ServiceAccount | null = null;
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

export const setCredentials = (creds: ServiceAccount) => {
  if (!creds.private_key || !creds.client_email || !creds.project_id) {
    throw new Error("Invalid Service Account JSON: Missing required fields.");
  }
  currentCredentials = creds;
  cachedToken = null;
  tokenExpiry = 0;
};

export const getProjectId = (): string => {
  if (!currentCredentials) {
    throw new Error("Credentials not loaded.");
  }
  return currentCredentials.project_id;
};

function str2ab(str: string) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

function base64UrlEncode(str: string) {
  return window.btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function arrayBufferToBase64Url(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return base64UrlEncode(binary);
}

async function importPrivateKey(pem: string) {
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";

  const pemContents = pem
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\\n/g, '')
    .replace(/\n/g, '')
    .trim();

  const binaryDerString = window.atob(pemContents);
  const binaryDer = str2ab(binaryDerString);

  return await window.crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );
}

export const getAccessToken = async (): Promise<string> => {
  if (!currentCredentials) {
    throw new Error("No credentials loaded. Please upload a Service Account JSON.");
  }

  if (cachedToken && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }

  try {
    const key = await importPrivateKey(currentCredentials.private_key);

    const header = {
      alg: "RS256",
      typ: "JWT",
      kid: currentCredentials.private_key_id
    };

    const now = Math.floor(Date.now() / 1000);
    const claimSet = {
      iss: currentCredentials.client_email,
      scope: SCOPES.join(' '),
      aud: currentCredentials.token_uri,
      exp: now + 3600,
      iat: now
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedClaimSet = base64UrlEncode(JSON.stringify(claimSet));
    const unsignedToken = `${encodedHeader}.${encodedClaimSet}`;

    const signature = await window.crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      str2ab(unsignedToken)
    );

    const signedJwt = `${unsignedToken}.${arrayBufferToBase64Url(signature)}`;

    const response = await fetch(currentCredentials.token_uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${signedJwt}`
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Auth failed: ${errText}`);
    }

    const data = await response.json();
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000);

    return data.access_token;
  } catch (error) {
    console.error("Token generation failed:", error);
    throw new Error("Failed to authenticate with Service Account. Please check the Private Key format.");
  }
};
