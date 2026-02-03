import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiClient, API_ENDPOINTS } from '@/api/config';
import type {
  EmployeeSearchParams,
  AddEmployeeSkillRequest,
  UpdateEmployeeSkillRequest,
  Employee,
} from '@/types';

// Query keys
export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (params: EmployeeSearchParams) => [...employeeKeys.lists(), params] as const,
  details: () => [...employeeKeys.all, 'detail'] as const,
  detail: (id: string) => [...employeeKeys.details(), id] as const,
};

// 社員一覧取得
export function useEmployees(params: EmployeeSearchParams = {}) {
  return useQuery({
    queryKey: employeeKeys.list(params),
    queryFn: async () => {
      // フロントエンドのパラメータをバックエンドの形式に変換
      const apiParams: Record<string, string | number | undefined> = {
        q: params.keyword,
        department: params.department,
        position: params.position,
        status: params.status,
        tags: params.tagIds?.join(','),
        tagOperator: params.tagOperator,
        matchType: params.matchType,
        level: params.skillLevelMin,
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      };

      // undefined値を除外
      const cleanParams = Object.fromEntries(
        Object.entries(apiParams).filter(([, v]) => v !== undefined && v !== '')
      );

      const response = await apiClient.get(API_ENDPOINTS.employees.list, { params: cleanParams });
      // バックエンドのレスポンス形式: { success: true, data: [...], pagination: {...} }
      // フロントエンドの期待する形式に変換
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

// 社員詳細取得
export function useEmployee(id: string | undefined) {
  return useQuery<Employee>({
    queryKey: employeeKeys.detail(id!),
    queryFn: async () => {
      const response = await apiClient.get(`/employees/${id}`);
      // バックエンドのレスポンス形式: { success: true, data: employee }
      return response.data.data;
    },
    enabled: !!id,
    // Cache data for 5 minutes to reduce flickering when switching between employees
    staleTime: 5 * 60 * 1000,
    // Keep previous data while loading new employee to prevent flickering
    placeholderData: keepPreviousData,
  });
}

// 社員作成
export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const response = await apiClient.post('/employees', data);
      // バックエンドのレスポンス形式: { success: true, data: employee }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}

// 社員更新
export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const response = await apiClient.put(`/employees/${id}`, data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(variables.id) });
    },
  });
}

// 社員削除
export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
}

// スキル追加
export function useAddEmployeeSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      data,
    }: {
      employeeId: string;
      data: AddEmployeeSkillRequest;
    }) => {
      const response = await apiClient.post(`/employees/${employeeId}/skills`, data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: employeeKeys.detail(variables.employeeId),
      });
    },
  });
}

// スキル更新
export function useUpdateEmployeeSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      skillId,
      data,
    }: {
      employeeId: string;
      skillId: string;
      data: UpdateEmployeeSkillRequest;
    }) => {
      const response = await apiClient.put(
        `/employees/${employeeId}/skills/${skillId}`,
        data
      );
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: employeeKeys.detail(variables.employeeId),
      });
    },
  });
}

// スキル削除
export function useDeleteEmployeeSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      skillId,
    }: {
      employeeId: string;
      skillId: string;
    }) => {
      await apiClient.delete(`/employees/${employeeId}/skills/${skillId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: employeeKeys.detail(variables.employeeId),
      });
    },
  });
}

// 画像アップロード
export function useUploadEmployeeImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, file }: { employeeId: string; file: File }) => {
      const formData = new FormData();
      formData.append('image', file);

      const response = await apiClient.post(
        `/employees/${employeeId}/image`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: employeeKeys.detail(variables.employeeId),
      });
    },
  });
}
