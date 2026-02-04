import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, API_ENDPOINTS } from '@/api/config';
import type {
  Tag,
  TagCategory,
  CreateTagRequest,
  UpdateTagRequest,
  CreateTagCategoryRequest,
  UpdateTagCategoryRequest,
  TagSearchParams,
  PaginatedResponse,
} from '@/types';

// Query keys
export const tagKeys = {
  all: ['tags'] as const,
  lists: () => [...tagKeys.all, 'list'] as const,
  list: (params: TagSearchParams) => [...tagKeys.lists(), params] as const,
  details: () => [...tagKeys.all, 'detail'] as const,
  detail: (id: string) => [...tagKeys.details(), id] as const,
  categories: ['tagCategories'] as const,
  category: (id: string) => [...tagKeys.categories, id] as const,
};

// タグ一覧取得
export function useTagList(params: TagSearchParams = {}) {
  return useQuery({
    queryKey: tagKeys.list(params),
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Tag>>(
        API_ENDPOINTS.tags.list,
        { params }
      );
      return response.data;
    },
  });
}

// 全タグ取得（フィルター用など）
// バックエンドのZodスキーマでlimitの最大値が100に制限されているため、limit: 100を指定
export function useAllTags() {
  return useQuery({
    queryKey: tagKeys.lists(),
    queryFn: async () => {
      const response = await apiClient.get(
        API_ENDPOINTS.tags.list,
        { params: { limit: 100 } }
      );
      // バックエンドのレスポンス形式: { success: true, data: tags[] }
      const data = response.data;
      if (data.success && Array.isArray(data.data)) {
        return data.data as Tag[];
      }
      // フォールバック
      return Array.isArray(data) ? data : (data.data || []) as Tag[];
    },
  });
}

// タグカテゴリ一覧取得
export function useTagCategories() {
  return useQuery({
    queryKey: tagKeys.categories,
    queryFn: async () => {
      const response = await apiClient.get<TagCategory[] | PaginatedResponse<TagCategory>>(
        API_ENDPOINTS.tagCategories.list
      );
      return Array.isArray(response.data) ? response.data : response.data.data;
    },
  });
}

// タグ作成
export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTagRequest) => {
      const response = await apiClient.post<Tag>(
        API_ENDPOINTS.tags.create,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
    },
  });
}

// タグ更新
export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTagRequest }) => {
      const response = await apiClient.put<Tag>(
        API_ENDPOINTS.tags.update(id),
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
    },
  });
}

// タグ削除
export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(API_ENDPOINTS.tags.delete(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
    },
  });
}

// カテゴリ作成
export function useCreateTagCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTagCategoryRequest) => {
      const response = await apiClient.post<TagCategory>(
        API_ENDPOINTS.tagCategories.create,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.categories });
    },
  });
}

// カテゴリ更新
export function useUpdateTagCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTagCategoryRequest }) => {
      const response = await apiClient.put<TagCategory>(
        API_ENDPOINTS.tagCategories.update(id),
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.categories });
    },
  });
}

// カテゴリ削除
export function useDeleteTagCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(API_ENDPOINTS.tagCategories.delete(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.categories });
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
    },
  });
}

// タグの並び替え
export function useReorderTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tagIds: string[]) => {
      const response = await apiClient.put('/tags/reorder', { tagIds });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
      queryClient.invalidateQueries({ queryKey: tagKeys.categories });
    },
  });
}

// カテゴリの並び替え
export function useReorderCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryIds: string[]) => {
      const response = await apiClient.put('/tags/categories/reorder', { categoryIds });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.categories });
    },
  });
}

// タグとカテゴリをまとめて取得するカスタムフック
export function useTags() {
  const tagsQuery = useAllTags();
  const categoriesQuery = useTagCategories();

  return {
    tags: tagsQuery.data,
    categories: categoriesQuery.data,
    isLoading: tagsQuery.isLoading || categoriesQuery.isLoading,
    error: tagsQuery.error || categoriesQuery.error,
    refetch: () => {
      tagsQuery.refetch();
      categoriesQuery.refetch();
    },
  };
}

export default useTags;
