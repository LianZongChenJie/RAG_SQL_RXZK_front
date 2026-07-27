import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

// 开发环境：使用 /api，通过Vite代理
// 生产环境：使用完整API地址
const baseURL =  "/api";
const instance: AxiosInstance = axios.create({
  baseURL: baseURL,
  timeout: 30000,
  withCredentials: true,
});

// 请求拦截：自动带上 token（如有）
instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// 响应拦截：统一处理后端常见响应结构
instance.interceptors.response.use(
  (response: AxiosResponse) => {
    const res = response.data;
    if (res && typeof res === "object" && "code" in res) {
      if ([0, 200].includes(Number(res.code))) {
        return res.data;
      }
      return Promise.reject(new Error(res.msg || res.message || "请求出错"));
    }
    return res;
  },
  (error: unknown) => Promise.reject(error),
);

export function get<T = any>(
  url: string,
  params?: any,
  config?: AxiosRequestConfig,
) {
  return instance.request({
    url,
    method: "GET",
    params,
    ...config,
  }) as unknown as Promise<T>;
}

export function post<T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig,
) {
  return instance.request({
    url,
    method: "POST",
    data,
    ...config,
  }) as unknown as Promise<T>;
}

export function put<T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig,
) {
  return instance.request({
    url,
    method: "PUT",
    data,
    ...config,
  }) as unknown as Promise<T>;
}

export function deleteRequest<T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig,
) {
  return instance.request({
    url,
    method: "DELETE",
    data,
    ...config,
  }) as unknown as Promise<T>;
}

/**
 * 从 Cookie 中获取指定名称的值
 * @param name Cookie 名称
 * @returns Cookie 值，如果不存在则返回 null
 */
export function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null;
  }
  return null;
}
