export default async function generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const codeVerifier = generateRandomString(128); // Gerando o codeVerifier
  const codeChallenge = await generateCodeChallenge(codeVerifier); // Calculando o codeChallenge a partir do codeVerifier

  // Armazenando no localStorage na ordem correta
  localStorage.setItem("codeVerifier", codeVerifier);
  localStorage.setItem("codeChallenge", codeChallenge);

  return { codeVerifier, codeChallenge };
}

function generateRandomString(length: number): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let result = "";
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  for (let i = 0; i < array.length; i++) {
    result += charset[array[i] % charset.length];
  }
  return result;
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(digest);
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
