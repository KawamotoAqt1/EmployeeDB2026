import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, API_ENDPOINTS } from '@/api/config';
import type {
  CompanySearchParams,
  Company,
  CompanyDepartment,
  CreateCompanyRequest,
  DepartmentType,
  UpdateCompanyRequest,
} from '@/types';

// 部署作成リクエスト型
export interface CreateDepartmentRequest {
  name: string;
  type: DepartmentType;
  parentId?: string | null;
  officeId?: string | null;
  sortOrder?: number;
}

// 部署更新リクエスト型
export interface UpdateDepartmentRequest extends Partial<CreateDepartmentRequest> {}

// Query keys
export const companyKeys = {
  all: ['companies'] as const,
  lists: () => [...companyKeys.all, 'list'] as const,
  list: (params: CompanySearchParams) => [...companyKeys.lists(), params] as const,
  details: () => [...companyKeys.all, 'detail'] as const,
  detail: (id: string) => [...companyKeys.details(), id] as const,
};

// 企業一覧取得
export function useCompanies(params: CompanySearchParams = {}) {
  return useQuery({
    queryKey: companyKeys.list(params),
    queryFn: async () => {
      const apiParams: Record<string, string | number | undefined> = {
        q: params.keyword,
        industry: params.industry,
        status: params.status,
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      };

      const cleanParams = Object.fromEntries(
        Object.entries(apiParams).filter(([, v]) => v !== undefined && v !== '')
      );

      const response = await apiClient.get(API_ENDPOINTS.companies.list, { params: cleanParams });
      const { data, pagination } = response.data;
      return {
        data,
        pagination: {
          currentPage: pagination.page,
          totalPages: pagination.totalPages,
          totalItems: pagination.total,
          itemsPerPage: pagination.limit,
          hasNextPage: pagination.page < pagination.totalPages,
          hasPreviousPage: pagination.page > 1,
        },
      };
    },
  });
}

// 企業詳細取得
export function useCompany(id: string | undefined) {
  return useQuery<Company>({
    queryKey: companyKeys.detail(id!),
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.companies.detail(id!));
      return response.data.data;
    },
    enabled: !!id,
  });
}

// 企業作成
export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCompanyRequest) => {
      const response = await apiClient.post(API_ENDPOINTS.companies.create, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
  });
}

// 企業更新
export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCompanyRequest }) => {
      const response = await apiClient.put(API_ENDPOINTS.companies.update(id), data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(variables.id) });
    },
  });
}

// 企業削除
export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(API_ENDPOINTS.companies.delete(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
  });
}

// ============================================
// 部署管理フック
// ============================================

// 部署一覧取得
export function useCompanyDepartments(companyId: string | undefined) {
  return useQuery<CompanyDepartment[]>({
    queryKey: [...companyKeys.detail(companyId!), 'departments'],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.companies.departments(companyId!));
      return response.data.data;
    },
    enabled: !!companyId,
  });
}

// 部署作成
export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, data }: { companyId: string; data: CreateDepartmentRequest }) => {
      const response = await apiClient.post(API_ENDPOINTS.companies.departments(companyId), data);
      return response.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(variables.companyId) });
    },
  });
}

// 部署更新
export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, departmentId, data }: { companyId: string; departmentId: string; data: UpdateDepartmentRequest }) => {
      const response = await apiClient.put(`${API_ENDPOINTS.companies.departments(companyId)}/${departmentId}`, data);
      return response.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(variables.companyId) });
    },
  });
}

// 部署削除
export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, departmentId }: { companyId: string; departmentId: string }) => {
      await apiClient.delete(`${API_ENDPOINTS.companies.departments(companyId)}/${departmentId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(variables.companyId) });
    },
  });
}
