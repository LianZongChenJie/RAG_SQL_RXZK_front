import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

// 开发环境：使用 /rest，Vite代理会重写为 /rest/v1
// 生产环境：使用完整API地址
const baseURL = '/rest/v1';

const instance: AxiosInstance = axios.create({
  baseURL: baseURL,
  timeout: 30000,
  withCredentials: true,
});

// 请求拦截：自动带上 Authorization
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
      if (res.code === 0 || res.code === 200) {
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
