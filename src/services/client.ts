import axios from "axios";

// timeout global de 50s — evita que un endpoint colgado (ej. la API externa
// de APIWorking sin responder) deje un spinner girando para siempre sin
// ningun feedback. Un poco por encima del timeout de 45s que el backend le
// pone a sus propias llamadas a APIWorking, para que sea el backend el que
// responda con el error primero. Las pocas acciones que sabemos que tardan
// mas (sync completo, refrescar todos los usuarios del sistema) desactivan
// el timeout explicitamente en su propia llamada — ver refreshPostVentaCache
// y refreshSystemUsersAll.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api",
  withCredentials: true,
  timeout: 50000,
});
