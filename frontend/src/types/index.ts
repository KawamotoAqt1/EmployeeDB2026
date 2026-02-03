/**
 * 従業員管理システムの型定義
 */

// ========================================
// 基本型定義
// ========================================

/** スキルレベル */
export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

/** スキルレベルの表示名 */
export const SkillLevelLabels: Record<SkillLevel, string> = {
  BEGINNER: '初級',
  INTERMEDIATE: '中級',
  ADVANCED: '上級',
  EXPERT: 'エキスパート',
};

/** ユーザーロール */
export type UserRole = 'ADMIN' | 'EDITOR' | 'VIEWER';

/** ユーザーロールの表示名 */
export const UserRoleLabels: Record<UserRole, string> = {
  ADMIN: '管理者',
  EDITOR: '編集者',
  VIEWER: '閲覧者',
};

// ========================================
// エンティティ型定義
// ========================================

/** タグカテゴリ */
export interface TagCategory {
  id: string;
  code: string;
  name: string;
  parentId?: string;
  sortOrder: number;
  createdAt: string;
  children?: TagCategory[];
  tags?: Tag[];
}

/** タグ */
export interface Tag {
  id: string;
  name: string;
  categoryId: string;
  category?: TagCategory;
  sortOrder: number;
  createdAt: string;
}

/** 従業員スキル */
export interface EmployeeSkill {
  id: string;
  employeeId: string;
  tagId: string;
  tag?: Tag;
  level: SkillLevel;
  createdAt: string;
}

/** 社員ステータス */
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'RESIGNED';

/** 社員ステータスの表示名 */
export const EmployeeStatusLabels: Record<EmployeeStatus, string> = {
  ACTIVE: '在籍',
  INACTIVE: '休職',
  PENDING: '退職（求職）',
  RESIGNED: '退職',
};

/** 性別 */
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

/** 性別の表示名 */
export const GenderLabels: Record<Gender, string> = {
  MALE: '男性',
  FEMALE: '女性',
  OTHER: 'その他',
};

/** 契約形態（従業員用） */
export type ContractType = 'FULL_TIME' | 'CONTRACT' | 'PART_TIME' | 'TEMPORARY' | 'INTERN' | 'OUTSOURCE';

/** 契約形態（案件用） */
export type ContractTypeProject = 'DISPATCH' | 'SES' | 'CONTRACT';

/** 案件の契約形態の表示名 */
export const ContractTypeProjectLabels: Record<ContractTypeProject, string> = {
  DISPATCH: '派遣',
  SES: 'SES',
  CONTRACT: '請負',
};

/** 従業員 */
export interface Employee {
  id: string;
  employeeNumber: string;
  employeeUniqueNumber?: string;
  fullName: string;
  fullNameKana?: string;
  email?: string;
  birthDate?: string;
  gender?: Gender;
  contractType?: ContractType;
  department?: string;
  position?: string;
  location?: string;
  country?: string;
  residence?: string;
  station?: string;
  hireDate?: string;
  contractEndDate?: string;
  status: EmployeeStatus;
  remark?: string;
  photoUrl?: string;
  skills?: EmployeeSkill[];
  assignments?: ProjectAssignment[];
  createdAt: string;
  updatedAt: string;
}

/** ユーザー */
export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

// ========================================
// API リクエスト型
// ========================================

/** 従業員作成リクエスト */
export interface CreateEmployeeRequest {
  employeeCode: string;
  firstName: string;
  lastName: string;
  firstNameKana?: string;
  lastNameKana?: string;
  email: string;
  phone?: string;
  department?: string;
  position?: string;
  hireDate?: string;
  birthDate?: string;
  bio?: string;
}

/** 従業員更新リクエスト */
export interface UpdateEmployeeRequest extends Partial<CreateEmployeeRequest> {
  isActive?: boolean;
}

/** 従業員スキル追加リクエスト */
export interface AddEmployeeSkillRequest {
  tagId: string;
  level: SkillLevel;
}

/** 従業員スキル更新リクエスト */
export interface UpdateEmployeeSkillRequest {
  level?: SkillLevel;
}

/** タグ作成リクエスト */
export interface CreateTagRequest {
  name: string;
  categoryId: string;
}

/** タグ更新リクエスト */
export interface UpdateTagRequest extends Partial<CreateTagRequest> {}

/** タグカテゴリ作成リクエスト */
export interface CreateTagCategoryRequest {
  name: string;
  description?: string;
  color?: string;
}

/** タグカテゴリ更新リクエスト */
export interface UpdateTagCategoryRequest extends Partial<CreateTagCategoryRequest> {}

/** ユーザー作成リクエスト */
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  employeeId?: number;
}

/** ユーザー更新リクエスト */
export interface UpdateUserRequest {
  email?: string;
  role?: UserRole;
  employeeId?: number;
  isActive?: boolean;
}

/** ログインリクエスト */
export interface LoginRequest {
  email: string;
  password: string;
}

// ========================================
// API レスポンス型
// ========================================

/** ページネーション情報 */
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** ページネーション付きレスポンス */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

/** API エラーレスポンス */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

/** 認証レスポンス */
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ========================================
// 検索・フィルタ型
// ========================================

/** 検索一致タイプ */
export type MatchType = 'partial' | 'prefix';

/** タグ検索演算子 */
export type TagOperator = 'AND' | 'OR';

/** 従業員検索パラメータ */
export interface EmployeeSearchParams {
  keyword?: string;
  department?: string;
  position?: string;
  tagIds?: string[];
  skillLevelMin?: SkillLevel;
  skillLevelMax?: SkillLevel;
  status?: EmployeeStatus;
  matchType?: MatchType;
  tagOperator?: TagOperator;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'employeeNumber' | 'department' | 'hireDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/** タグ検索パラメータ */
export interface TagSearchParams {
  keyword?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
}

// ========================================
// UI関連型
// ========================================

/** 選択肢 */
export interface SelectOption<T = string> {
  label: string;
  value: T;
}

/** テーブルカラム定義 */
export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: unknown, item: T) => React.ReactNode;
}

/** フォームフィールドエラー */
export interface FieldError {
  field: string;
  message: string;
}

/** 通知タイプ */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/** 通知 */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

// ========================================
// 企業・案件管理の型定義 (Phase 2)
// ========================================

/** 企業ステータス */
export type CompanyStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED';

/** 企業ステータスの表示名 */
export const CompanyStatusLabels: Record<CompanyStatus, string> = {
  ACTIVE: '取引中',
  INACTIVE: '取引停止',
  TERMINATED: '取引終了',
};

/** 案件ステータス */
export type ProjectStatus = 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'CANCELLED';

/** 案件ステータスの表示名 */
export const ProjectStatusLabels: Record<ProjectStatus, string> = {
  ACTIVE: '稼働中',
  INACTIVE: '休止中',
  COMPLETED: '完了',
  CANCELLED: 'キャンセル',
};

/** 契約形態の表示名 */
export const ContractTypeLabels: Record<ContractType, string> = {
  FULL_TIME: '正社員',
  CONTRACT: '契約社員',
  PART_TIME: 'パート',
  TEMPORARY: '派遣',
  INTERN: 'インターン',
  OUTSOURCE: '外注',
};

/** 企業 */
export interface Company {
  id: string;
  name: string;
  nameKana?: string;
  industry?: string;
  status: CompanyStatus;
  website?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  offices?: CompanyOffice[];
  departments?: CompanyDepartment[];
  contacts?: CompanyContact[];
}

/** 企業拠点 */
export interface CompanyOffice {
  id: string;
  companyId: string;
  name: string;
  postalCode?: string;
  address?: string;
  phone?: string;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: string;
}

/** 企業部署 */
export interface CompanyDepartment {
  id: string;
  companyId: string;
  name: string;
  parentId?: string;
  sortOrder: number;
  createdAt: string;
  children?: CompanyDepartment[];
}

/** 企業担当窓口 */
export interface CompanyContact {
  id: string;
  companyId: string;
  departmentId?: string;
  fullName: string;
  fullNameKana?: string;
  position?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  isPrimary: boolean;
  remark?: string;
  sortOrder: number;
  createdAt: string;
  department?: CompanyDepartment;
}

/** 案件 */
export interface Project {
  id: string;
  companyId: string;
  company?: Company;
  departmentId?: string;
  department?: CompanyDepartment;
  name: string;
  description?: string;
  status: ProjectStatus;
  contractType: ContractTypeProject;
  startDate?: string;
  endDate?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  assignments?: ProjectAssignment[];
}

/** 案件アサイン */
export interface ProjectAssignment {
  id: string;
  projectId: string;
  employeeId: string;
  project?: Project;
  employee?: Employee;
  startDate: string;
  endDate?: string;
  role?: string;
  workloadPercentage?: number;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

// ========================================
// 企業・案件管理のリクエスト型
// ========================================

/** 企業作成リクエスト */
export interface CreateCompanyRequest {
  name: string;
  nameKana?: string;
  industry?: string;
  status?: CompanyStatus;
  website?: string;
  remark?: string;
  offices?: Array<{
    name: string;
    postalCode?: string;
    address?: string;
    phone?: string;
    isPrimary?: boolean;
  }>;
  departments?: Array<{
    name: string;
    parentId?: string;
  }>;
  contacts?: Array<{
    fullName: string;
    fullNameKana?: string;
    position?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    isPrimary?: boolean;
    remark?: string;
    departmentId?: string;
  }>;
}

/** 企業更新リクエスト */
export interface UpdateCompanyRequest extends Partial<CreateCompanyRequest> {}

/** 案件作成リクエスト */
export interface CreateProjectRequest {
  companyId: string;
  departmentId?: string;
  name: string;
  description?: string;
  status?: ProjectStatus;
  contractType: ContractTypeProject;
  startDate?: string;
  endDate?: string;
  remark?: string;
}

/** 案件更新リクエスト */
export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {}

/** 案件アサイン作成リクエスト */
export interface CreateProjectAssignmentRequest {
  projectId: string;
  employeeId: string;
  startDate: string;
  endDate?: string;
  role?: string;
  workloadPercentage?: number;
  remark?: string;
}

/** 案件アサイン更新リクエスト */
export interface UpdateProjectAssignmentRequest extends Partial<Omit<CreateProjectAssignmentRequest, 'projectId' | 'employeeId'>> {}

// ========================================
// 企業・案件管理の検索パラメータ
// ========================================

/** 企業検索パラメータ */
export interface CompanySearchParams {
  keyword?: string;
  industry?: string;
  status?: CompanyStatus;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'nameKana' | 'industry' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/** 案件検索パラメータ */
export interface ProjectSearchParams {
  keyword?: string;
  companyId?: string;
  status?: ProjectStatus;
  contractType?: ContractTypeProject;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'startDate' | 'endDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}
