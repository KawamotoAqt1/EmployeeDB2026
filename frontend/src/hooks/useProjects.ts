import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, API_ENDPOINTS } from '@/api/config';
import type {
  ProjectSearchParams,
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateProjectAssignmentRequest,
  UpdateProjectAssignmentRequest,
} from '@/types';

// Query keys
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (params: ProjectSearchParams) => [...projectKeys.lists(), params] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

// 案件一覧取得
export function useProjects(params: ProjectSearchParams = {}) {
  return useQuery({
    queryKey: projectKeys.list(params),
    queryFn: async () => {
      const apiParams: Record<string, string | number | undefined> = {
        q: params.keyword,
        companyId: params.companyId,
        status: params.status,
        contractType: params.contractType,
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      };

      const cleanParams = Object.fromEntries(
        Object.entries(apiParams).filter(([, v]) => v !== undefined && v !== '')
      );

      const response = await apiClient.get(API_ENDPOINTS.projects.list, { params: cleanParams });
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

// 案件詳細取得
export function useProject(id: string | undefined) {
  return useQuery<Project>({
    queryKey: projectKeys.detail(id!),
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.projects.detail(id!));
      return response.data.data;
    },
    enabled: !!id,
  });
}

// 案件作成
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProjectRequest) => {
      const response = await apiClient.post(API_ENDPOINTS.projects.create, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// 案件更新
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProjectRequest }) => {
      const response = await apiClient.put(API_ENDPOINTS.projects.update(id), data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) });
    },
  });
}

// 案件削除
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(API_ENDPOINTS.projects.delete(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// アサイン追加
export function useCreateProjectAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProjectAssignmentRequest) => {
      const response = await apiClient.post(
        API_ENDPOINTS.projects.assignments(data.projectId),
        data
      );
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.projectId) });
    },
  });
}

// アサイン更新
export function useUpdateProjectAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      assignmentId,
      data,
    }: {
      projectId: string;
      assignmentId: string;
      data: UpdateProjectAssignmentRequest;
    }) => {
      const response = await apiClient.put(
        API_ENDPOINTS.projects.assignment(projectId, assignmentId),
        data
      );
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.projectId) });
    },
  });
}

// アサイン削除
export function useDeleteProjectAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      assignmentId,
    }: {
      projectId: string;
      assignmentId: string;
    }) => {
      await apiClient.delete(API_ENDPOINTS.projects.assignment(projectId, assignmentId));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.projectId) });
    },
  });
}
