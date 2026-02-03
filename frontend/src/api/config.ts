import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '@/types';

/**
 * API設定
 */

// 環境変数からベースURLを取得（デフォルトはローカル開発用）
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// APIタイムアウト設定（ミリ秒）
export const API_TIMEOUT = 30000;

// ローカルストレージのトークンキー
export const ACCESS_TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';

/**
 * Axiosインスタンスの作成
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * リクエストインターセプター
 * - 認証トークンの自動付与
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * レスポンスインターセプター
 * - エラーハンドリング
 * - トークンリフレッシュ（将来実装）
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    // 401エラーの場合（認証エラー）
    if (error.response?.status === 401) {
      // トークンをクリアしてログインページへリダイレクト
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);

      // 現在のパスがログインページでない場合のみリダイレクト
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // エラーレスポンスを整形して返す
    const apiError: ApiError = error.response?.data || {
      code: 'UNKNOWN_ERROR',
      message: error.message || '不明なエラーが発生しました',
    };

    return Promise.reject(apiError);
  }
);

/**
 * 認証トークンを設定
 */
export function setAuthToken(accessToken: string, refreshToken?: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

/**
 * 認証トークンをクリア
 */
export function clearAuthToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * 認証済みかどうかを確認
 */
export function isAuthenticated(): boolean {
  return !!localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * APIエンドポイント定義
 */
export const API_ENDPOINTS = {
  // 認証
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    me: '/auth/me',
  },
  // 従業員
  employees: {
    list: '/employees',
    detail: (id: string) => `/employees/${id}`,
    create: '/employees',
    update: (id: string) => `/employees/${id}`,
    delete: (id: string) => `/employees/${id}`,
    skills: (id: string) => `/employees/${id}/skills`,
    skill: (employeeId: string, skillId: string) => `/employees/${employeeId}/skills/${skillId}`,
    tags: (id: string) => `/employees/${id}/tags`,
    uploadImage: (id: string) => `/employees/${id}/image`,
  },
  // タグ
  tags: {
    list: '/tags',
    detail: (id: string) => `/tags/${id}`,
    create: '/tags',
    update: (id: string) => `/tags/${id}`,
    delete: (id: string) => `/tags/${id}`,
  },
  // タグカテゴリ
  tagCategories: {
    list: '/tags/categories',
    detail: (id: string) => `/tags/categories/${id}`,
    create: '/tags/categories',
    update: (id: string) => `/tags/categories/${id}`,
    delete: (id: string) => `/tags/categories/${id}`,
  },
  // ユーザー
  users: {
    list: '/users',
    detail: (id: string) => `/users/${id}`,
    create: '/users',
    update: (id: string) => `/users/${id}`,
    delete: (id: string) => `/users/${id}`,
    changePassword: (id: string) => `/users/${id}/password`,
  },
  // 企業
  companies: {
    list: '/companies',
    detail: (id: string) => `/companies/${id}`,
    create: '/companies',
    update: (id: string) => `/companies/${id}`,
    delete: (id: string) => `/companies/${id}`,
    offices: (id: string) => `/companies/${id}/offices`,
    departments: (id: string) => `/companies/${id}/departments`,
    contacts: (id: string) => `/companies/${id}/contacts`,
  },
  // 案件
  projects: {
    list: '/projects',
    detail: (id: string) => `/projects/${id}`,
    create: '/projects',
    update: (id: string) => `/projects/${id}`,
    delete: (id: string) => `/projects/${id}`,
    assignments: (id: string) => `/projects/${id}/assignments`,
    assignment: (projectId: string, assignmentId: string) => `/projects/${projectId}/assignments/${assignmentId}`,
  },
} as const;

export default apiClient;
