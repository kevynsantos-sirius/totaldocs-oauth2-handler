// src/utils/jwtUtils.ts
// Função para decodificar o JWT e obter o payload
export const decodeJWT = (token: string) => {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
      .join('')
  );
  return JSON.parse(jsonPayload);
};

// Função para pegar o valor do atributo `exp` (expiração do token)
export const getTokenExpiration = (accessToken: string) => {
  const decodedToken = decodeJWT(accessToken);
  return decodedToken?.exp || null;
};
