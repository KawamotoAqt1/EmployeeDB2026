import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import { EmployeeCard, EmployeeFilter } from '@/components/employee';
import { useEmployees } from '@/hooks/useEmployees';
import { useAuth } from '@/hooks/useAuth';
import type { EmployeeSearchParams, Employee } from '@/types';

export function EmployeeList() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<EmployeeSearchParams>({});
  const [page, setPage] = useState(1);
  const role = user?.role?.toUpperCase();
  const isEditor = role === 'ADMIN' || role === 'EDITOR';

  const { data, isLoading, error } = useEmployees({
    ...filters,
    page,
    limit: 12,
  });

  const handleFilter = (newFilters: EmployeeSearchParams) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">社員一覧</h1>
          <p className="mt-1 text-sm text-gray-500">
            {data?.pagination.totalItems ?? 0}名の社員が登録されています
          </p>
        </div>
        {isEditor && (
          <Link to="/employees/new">
            <Button variant="primary">
              <svg
                className="h-5 w-5 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              新規登録
            </Button>
          </Link>
        )}
      </div>

      {/* Filter */}
      <EmployeeFilter
        initialFilters={filters}
        onFilter={handleFilter}
      />

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">データの取得に失敗しました</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => window.location.reload()}
          >
            再読み込み
          </Button>
        </div>
      ) : data?.data.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            該当する社員が見つかりません
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            検索条件を変更してお試しください
          </p>
        </div>
      ) : (
        <>
          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.data.map((employee: Employee) => (
              <EmployeeCard key={employee.id} employee={employee} />
            ))}
          </div>

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-200 rounded-lg">
              <div className="flex-1 flex justify-between sm:hidden">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!data.pagination.hasPreviousPage}
                  onClick={() => handlePageChange(page - 1)}
                >
                  前へ
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!data.pagination.hasNextPage}
                  onClick={() => handlePageChange(page + 1)}
                >
                  次へ
                </Button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    全{' '}
                    <span className="font-medium">{data.pagination.totalItems}</span>{' '}
                    件中{' '}
                    <span className="font-medium">
                      {(page - 1) * data.pagination.itemsPerPage + 1}
                    </span>{' '}
                    -{' '}
                    <span className="font-medium">
                      {Math.min(
                        page * data.pagination.itemsPerPage,
                        data.pagination.totalItems
                      )}
                    </span>{' '}
                    件を表示
                  </p>
                </div>
                <div>
                  <nav className="inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={!data.pagination.hasPreviousPage}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1)
                      .filter((p) => {
                        const distance = Math.abs(p - page);
                        return distance === 0 || distance === 1 || p === 1 || p === data.pagination.totalPages;
                      })
                      .map((p, idx, arr) => {
                        const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                        return (
                          <span key={p}>
                            {showEllipsis && (
                              <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                ...
                              </span>
                            )}
                            <button
                              onClick={() => handlePageChange(p)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                p === page
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {p}
                            </button>
                          </span>
                        );
                      })}
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={!data.pagination.hasNextPage}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default EmployeeList;
