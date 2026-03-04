import { 
  ApiResponse, 
  AuthResponse, 
  User, 
  UserFilters, 
  CreateUserData, 
  UpdateUserData,
  Role,
  RoleFilters,
  Page,
  PageFilters,
  RoleDetail,
  RoleDetailFilters,
  Department,
  DepartmentFilters,
  Circle,
  CircleFilters,
  Division,
  DivisionFilters,
  SubDivision,
  SubDivisionFilters,
  UserSubDivision,
  UserSubDivisionFilters,
  UserDepartment,
  UserDepartmentFilters,
  ProjectType,
  ProjectTypeFilters,
  ProjectTypeDetail,
  ProjectTypeDetailFilters,
  PTSDetail,
  DelayReason,
  DelayReasonFilters,
  Step,
  StepFilters,
  Issue,
  IssueFilters,
  IssueCategory,
  IssueCategoryFilters,
  FundingSource,
  FundingSourceFilters,
  Material,
  MaterialFilters,
  BusinessPlan,
  BusinessPlanFilters,
  BusinessPlanDetail,
  BusinessPlanDetailFilters,
  LoginCredentials,
  AuditTrail,
  AuditTrailFilters,
  BPDDelay,
  BPDDelayFilters,
  CreateBPDDelayData,
  UpdateBPDDelayData,
  BPDMaterial,
  BPDMaterialFilters,
  CreateBPDMaterialData,
  UpdateBPDMaterialData,
  ProjectIssue,
  ProjectIssueFilters,
  CreateProjectIssueData,
  UpdateProjectIssueData,
  ProjectWithIssues,
  ProjectIssuesReportFilters,
  IssuesDetailReport,
  IssuesDetailReportFilters,
  KPIsReport,
  KPIsFilters,
  ProjectsStatusSnapshot,
  ProgressByProjectTypeReport,
  ProgressByDepartmentReport,
  QuarterWiseProjectsReport,
  FundingSourceMixReport,
  IssuesByCauseReport,
  MaterialsSummaryReport,
  UsersReportUser,
  UsersReportFilters,
  UsersReportDepartmentStatistic,
  Settings,
  // Inventory System Types
  Store,
  StoreFilters,
  CreateStoreData,
  UpdateStoreData,
  Item,
  ItemFilters,
  CreateItemData,
  UpdateItemData,
  Rate,
  RateFilters,
  CreateRateData,
  UpdateRateData,
  StoreTransferNote,
  StoreTransferNoteFilters,
  CreateStoreTransferNoteData,
  UpdateStoreTransferNoteData,
  StockReport,
  StockReportFilters,
  StockTransferDetailReport,
  StockTransferDetailReportFilters
} from '@/types';
import { getUserFriendlyApiErrorMessage } from '@/lib/utils';

const API_BASE_URL = 
process.env.NEXT_PUBLIC_API_URL 
|| 'http://localhost:7076';
// || 
// 'http://localhost:7076';


class ApiClient {
  private baseURL: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('access_token');
      this.refreshToken = localStorage.getItem('refresh_token');
    }
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('access_token', token);
      } else {
        localStorage.removeItem('access_token');
      }
    }
  }

  setRefreshToken(token: string | null) {
    this.refreshToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('refresh_token', token);
      } else {
        localStorage.removeItem('refresh_token');
      }
    }
  }

  setTokens(accessToken: string | null, refreshToken: string | null) {
    this.setAccessToken(accessToken);
    this.setRefreshToken(refreshToken);
  }

  getAccessToken(): string | null {
    if (typeof window !== 'undefined' && !this.accessToken) {
      this.accessToken = localStorage.getItem('access_token');
    }
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    if (typeof window !== 'undefined' && !this.refreshToken) {
      this.refreshToken = localStorage.getItem('refresh_token');
    }
    return this.refreshToken;
  }


  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getAccessToken();
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      // Handle 401 Unauthorized - token might be expired
      if (response.status === 401 && retryCount === 0 && this.refreshToken) {
        // Try to refresh the token
        const newAccessToken = await this.refreshAccessToken();
        if (newAccessToken) {
          // Retry the request with new token
          return this.request<T>(endpoint, options, retryCount + 1);
        }
        // Refresh failed, clear tokens and throw error
        this.setTokens(null, null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('user_id');
        }
        throw new Error('Session expired. Please login again.');
      }
      
      if (!response.ok) {
        let errorData: any = {};
        try {
          const text = await response.text();
          errorData = text ? JSON.parse(text) : {};
        } catch (parseError) {
          // Ignore parse errors
        }
        const rawMessage = errorData.message || errorData.error || `HTTP error! status: ${response.status}`;
        if (process.env.NODE_ENV !== 'production' && rawMessage) {
          console.warn('[API Error]', rawMessage);
        }
        throw new Error(getUserFriendlyApiErrorMessage(rawMessage));
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unknown error occurred');
    }
  }

  private async refreshAccessToken(): Promise<string | null> {
    // If already refreshing, wait for the existing refresh
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          // Refresh failed, clear tokens
          this.setTokens(null, null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('user_id');
          }
          return null;
        }

        const data = await response.json();
        if (data.success && data.data?.accessToken && data.data?.refreshToken) {
          // Store new tokens
          this.setTokens(data.data.accessToken, data.data.refreshToken);
          return data.data.accessToken;
        }

        return null;
      } catch (error) {
        // Refresh failed, clear tokens
        this.setTokens(null, null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('user_id');
        }
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString());
      }
    });
    
    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  // Auth
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.success && response.data) {
      const accessToken = response.data.accessToken;
      const refreshToken = response.data.refreshToken;
      
      if (accessToken) {
        this.setAccessToken(accessToken);
        // Store user ID in localStorage
        if (response.data?.user?.id && typeof window !== 'undefined') {
          localStorage.setItem('user_id', response.data.user.id.toString());
        }
      }
      
      if (refreshToken) {
        this.setRefreshToken(refreshToken);
      }
    }
    
    return response;
  }

  async refreshTokens(): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.request<{ accessToken: string; refreshToken: string }>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    if (response.success && response.data) {
      this.setTokens(response.data.accessToken, response.data.refreshToken);
    }

    return response;
  }

  async verifyToken(token?: string): Promise<ApiResponse<AuthResponse>> {
    const endpoint = '/api/auth/verify';
    const options: RequestInit = {
      method: 'POST',
    };

    if (token) {
      options.body = JSON.stringify({ token });
    }

    return this.request<AuthResponse>(endpoint, options);
  }

  logout() {
    this.setTokens(null, null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_id');
    }
  }

  getUserId(): number | null {
    if (typeof window !== 'undefined') {
      // First try to get from localStorage
      const storedUserId = localStorage.getItem('user_id');
      if (storedUserId) {
        return parseInt(storedUserId, 10);
      }
      
      // If not in localStorage, try to extract from JWT access token
      const accessToken = this.getAccessToken();
      if (accessToken) {
        try {
          const parts = accessToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            // The token might have user_id or id field
            const userId = payload.user_id || payload.id;
            if (userId) {
              // Store it in localStorage for future use
              const userIdNum = typeof userId === 'number' ? userId : parseInt(userId, 10);
              localStorage.setItem('user_id', userIdNum.toString());
              if (process.env.NODE_ENV === 'development') {
                console.log('✅ Extracted user_id from JWT access token:', userIdNum);
              }
              return userIdNum;
            }
          }
        } catch (error) {
          // Failed to decode token, try refresh token as fallback
          const refreshToken = this.getRefreshToken();
          if (refreshToken) {
            try {
              const parts = refreshToken.split('.');
              if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                const userId = payload.user_id || payload.id;
                if (userId) {
                  const userIdNum = typeof userId === 'number' ? userId : parseInt(userId, 10);
                  localStorage.setItem('user_id', userIdNum.toString());
                  if (process.env.NODE_ENV === 'development') {
                    console.log('✅ Extracted user_id from JWT refresh token:', userIdNum);
                  }
                  return userIdNum;
                }
              }
            } catch (refreshError) {
              // Both tokens failed to decode
              if (process.env.NODE_ENV === 'development') {
                console.error('Failed to decode JWT tokens:', error, refreshError);
              }
            }
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.error('Failed to decode JWT access token:', error);
            }
          }
        }
      }
    }
    return null;
  }

  // Users
  async getUsers(filters: UserFilters = {}): Promise<ApiResponse<{ users: User[]; pagination: any }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<{ users: User[]; pagination: any }>(`/api/users${queryString}`);
  }

  async getUser(id: number): Promise<ApiResponse<User>> {
    return this.request<User>(`/api/users/${id}`);
  }

  async getUserAccess(id: number): Promise<ApiResponse<{
    user: User;
    roles: Array<{
      role_id: number;
      role_name: string;
      created_at: string;
    }>;
    permissions: Array<{
      page_id: number;
      slug: string;
      show: boolean;
      create: boolean;
      edit: boolean;
      delete: boolean;
      role_id: number;
      role_name: string;
    }>;
    aggregatedPermissions: Record<string, {
      show: boolean;
      create: boolean;
      edit: boolean;
      delete: boolean;
    }>;
  }>> {
    return this.request<{
      user: User;
      roles: Array<{
        role_id: number;
        role_name: string;
        created_at: string;
      }>;
      permissions: Array<{
        page_id: number;
        slug: string;
        show: boolean;
        create: boolean;
        edit: boolean;
        delete: boolean;
        role_id: number;
        role_name: string;
      }>;
      aggregatedPermissions: Record<string, {
        show: boolean;
        create: boolean;
        edit: boolean;
        delete: boolean;
      }>;
    }>(`/api/users/${id}/access`);
  }

  async createUser(userData: CreateUserData): Promise<ApiResponse<User>> {
    return this.request<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: number, userData: UpdateUserData): Promise<ApiResponse<User>> {
    return this.request<User>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/users/${id}`, {
      method: 'DELETE',
    });
  }

  async updatePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<null>> {
    return this.request<null>('/api/users/password', {
      method: 'PUT',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
  }

  // Roles
  async getRoles(filters: RoleFilters = {}): Promise<ApiResponse<Role[] | { roles: Role[]; pagination: any }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<Role[] | { roles: Role[]; pagination: any }>(`/api/roles${queryString}`);
  }

  async getRole(id: number): Promise<ApiResponse<Role>> {
    return this.request<Role>(`/api/roles/${id}`);
  }

  async createRole(roleData: { role_name: string }): Promise<ApiResponse<Role>> {
    return this.request<Role>('/api/roles', {
      method: 'POST',
      body: JSON.stringify(roleData),
    });
  }

  async updateRole(id: number, roleData: { role_name?: string }): Promise<ApiResponse<Role>> {
    return this.request<Role>(`/api/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(roleData),
    });
  }

  async deleteRole(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/roles/${id}`, {
      method: 'DELETE',
    });
  }

  // Pages
  async getPages(filters: PageFilters = {}): Promise<ApiResponse<Page[] | { pages: Page[]; pagination: any }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<Page[] | { pages: Page[]; pagination: any }>(`/api/pages${queryString}`);
  }

  async getPage(id: number): Promise<ApiResponse<Page>> {
    return this.request<Page>(`/api/pages/${id}`);
  }

  async createPage(pageData: { page_name: string }): Promise<ApiResponse<Page>> {
    return this.request<Page>('/api/pages', {
      method: 'POST',
      body: JSON.stringify(pageData),
    });
  }

  async updatePage(id: number, pageData: { page_name?: string }): Promise<ApiResponse<Page>> {
    return this.request<Page>(`/api/pages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(pageData),
    });
  }

  async deletePage(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/pages/${id}`, {
      method: 'DELETE',
    });
  }

  // Role Details
  async getRoleDetails(filters: RoleDetailFilters = {}): Promise<ApiResponse<RoleDetail[] | { details: RoleDetail[]; pagination: any }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<RoleDetail[] | { details: RoleDetail[]; pagination: any }>(`/api/role-details${queryString}`);
  }

  async getRoleDetail(id: number): Promise<ApiResponse<RoleDetail>> {
    return this.request<RoleDetail>(`/api/role-details/${id}`);
  }

  async createRoleDetail(roleDetailData: { role_id: number; page_id: number; show?: boolean; create?: boolean; edit?: boolean; delete?: boolean }): Promise<ApiResponse<RoleDetail>> {
    return this.request<RoleDetail>('/api/role-details', {
      method: 'POST',
      body: JSON.stringify(roleDetailData),
    });
  }

  async updateRoleDetail(id: number, roleDetailData: { show?: boolean; create?: boolean; edit?: boolean; delete?: boolean }): Promise<ApiResponse<RoleDetail>> {
    return this.request<RoleDetail>(`/api/role-details/${id}`, {
      method: 'PUT',
      body: JSON.stringify(roleDetailData),
    });
  }

  async deleteRoleDetail(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/role-details/${id}`, {
      method: 'DELETE',
    });
  }

  // Departments
  async getDepartments(filters: DepartmentFilters = {}): Promise<ApiResponse<Department[] | { departments: Department[]; pagination: any }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<Department[] | { departments: Department[]; pagination: any }>(`/api/departments${queryString}`);
  }

  async getDepartment(id: number): Promise<ApiResponse<Department>> {
    return this.request<Department>(`/api/departments/${id}`);
  }

  async createDepartment(departmentData: { name: string; description?: string }): Promise<ApiResponse<Department>> {
    return this.request<Department>('/api/departments', {
      method: 'POST',
      body: JSON.stringify(departmentData),
    });
  }

  async updateDepartment(id: number, departmentData: { name?: string; description?: string }): Promise<ApiResponse<Department>> {
    return this.request<Department>(`/api/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(departmentData),
    });
  }

  async deleteDepartment(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/departments/${id}`, {
      method: 'DELETE',
    });
  }

  // Circles
  async getCircles(filters: CircleFilters = {}): Promise<ApiResponse<Circle[] | { circles: Circle[]; pagination: any }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<Circle[] | { circles: Circle[]; pagination: any }>(`/api/circles${queryString}`);
  }

  async getCircle(id: number): Promise<ApiResponse<Circle>> {
    return this.request<Circle>(`/api/circles/${id}`);
  }

  async createCircle(circleData: { name: string; description?: string }): Promise<ApiResponse<Circle>> {
    return this.request<Circle>('/api/circles', {
      method: 'POST',
      body: JSON.stringify(circleData),
    });
  }

  async updateCircle(id: number, circleData: { name?: string; description?: string }): Promise<ApiResponse<Circle>> {
    return this.request<Circle>(`/api/circles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(circleData),
    });
  }

  async deleteCircle(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/circles/${id}`, {
      method: 'DELETE',
    });
  }

  // Divisions
  async getDivisions(filters: DivisionFilters = {}): Promise<ApiResponse<Division[] | { divisions: Division[]; pagination: any }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<Division[] | { divisions: Division[]; pagination: any }>(`/api/divisions${queryString}`);
  }

  async getDivision(id: number): Promise<ApiResponse<Division>> {
    return this.request<Division>(`/api/divisions/${id}`);
  }

  async createDivision(divisionData: { name: string; circle_id: number; description?: string }): Promise<ApiResponse<Division>> {
    return this.request<Division>('/api/divisions', {
      method: 'POST',
      body: JSON.stringify(divisionData),
    });
  }

  async updateDivision(id: number, divisionData: { name?: string; circle_id?: number; description?: string }): Promise<ApiResponse<Division>> {
    return this.request<Division>(`/api/divisions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(divisionData),
    });
  }

  async deleteDivision(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/divisions/${id}`, {
      method: 'DELETE',
    });
  }

  // Sub Divisions
  async getSubDivisions(filters: SubDivisionFilters = {}): Promise<ApiResponse<SubDivision[] | { sub_divisions: SubDivision[]; pagination: any }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<SubDivision[] | { sub_divisions: SubDivision[]; pagination: any }>(`/api/sub-divisions${queryString}`);
  }

  async getAllowedSubDivisions(): Promise<ApiResponse<SubDivision[]>> {
    return this.request<SubDivision[]>('/api/sub-divisions/allowed');
  }

  async getSubDivision(id: number): Promise<ApiResponse<SubDivision>> {
    return this.request<SubDivision>(`/api/sub-divisions/${id}`);
  }

  async createSubDivision(subDivisionData: { name: string; division_id: number; description?: string }): Promise<ApiResponse<SubDivision>> {
    return this.request<SubDivision>('/api/sub-divisions', {
      method: 'POST',
      body: JSON.stringify(subDivisionData),
    });
  }

  async updateSubDivision(id: number, subDivisionData: { name?: string; division_id?: number; description?: string }): Promise<ApiResponse<SubDivision>> {
    return this.request<SubDivision>(`/api/sub-divisions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(subDivisionData),
    });
  }

  async deleteSubDivision(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/sub-divisions/${id}`, {
      method: 'DELETE',
    });
  }

  // User Sub Divisions
  async getUsersSubDivisions(filters: UserSubDivisionFilters = {}): Promise<ApiResponse<UserSubDivision[] | { userSubDivisions: UserSubDivision[]; pagination: any }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<UserSubDivision[] | { userSubDivisions: UserSubDivision[]; pagination: any }>(`/api/users-sub-divisions${queryString}`);
  }

  async getUserSubDivision(id: number): Promise<ApiResponse<UserSubDivision>> {
    return this.request<UserSubDivision>(`/api/users-sub-divisions/${id}`);
  }

  async createUserSubDivision(userSubDivisionData: { user_id: number; sd_id: number }): Promise<ApiResponse<UserSubDivision>> {
    return this.request<UserSubDivision>('/api/users-sub-divisions', {
      method: 'POST',
      body: JSON.stringify(userSubDivisionData),
    });
  }

  async updateUserSubDivision(id: number, userSubDivisionData: { user_id?: number; sd_id?: number }): Promise<ApiResponse<UserSubDivision>> {
    return this.request<UserSubDivision>(`/api/users-sub-divisions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userSubDivisionData),
    });
  }

  async deleteUserSubDivision(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/users-sub-divisions/${id}`, {
      method: 'DELETE',
    });
  }

  // User Departments
  async getUsersDepartments(filters: UserDepartmentFilters = {}): Promise<ApiResponse<UserDepartment[] | { userDepartments: UserDepartment[]; pagination: any }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<UserDepartment[] | { userDepartments: UserDepartment[]; pagination: any }>(`/api/users-departments${queryString}`);
  }

  async getUserDepartment(id: number): Promise<ApiResponse<UserDepartment>> {
    return this.request<UserDepartment>(`/api/users-departments/${id}`);
  }

  async createUserDepartment(userDepartmentData: { user_id: number; dept_id: number }): Promise<ApiResponse<UserDepartment>> {
    return this.request<UserDepartment>('/api/users-departments', {
      method: 'POST',
      body: JSON.stringify(userDepartmentData),
    });
  }

  async updateUserDepartment(id: number, userDepartmentData: { user_id?: number; dept_id?: number }): Promise<ApiResponse<UserDepartment>> {
    return this.request<UserDepartment>(`/api/users-departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userDepartmentData),
    });
  }

  async deleteUserDepartment(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/users-departments/${id}`, {
      method: 'DELETE',
    });
  }

  // Project Types
  async getProjectTypes(filters: ProjectTypeFilters = {}): Promise<ApiResponse<ProjectType[] | { projectTypes: ProjectType[]; pagination: any }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<ProjectType[] | { projectTypes: ProjectType[]; pagination: any }>(`/api/project-types${queryString}`);
  }

  async getProjectType(id: number): Promise<ApiResponse<ProjectType>> {
    return this.request<ProjectType>(`/api/project-types/${id}`);
  }

  async createProjectType(projectTypeData: { ptype_name: string; department_id: number }): Promise<ApiResponse<ProjectType>> {
    return this.request<ProjectType>('/api/project-types', {
      method: 'POST',
      body: JSON.stringify(projectTypeData),
    });
  }

  async updateProjectType(id: number, projectTypeData: { ptype_name?: string }): Promise<ApiResponse<ProjectType>> {
    return this.request<ProjectType>(`/api/project-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(projectTypeData),
    });
  }

  async deleteProjectType(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/project-types/${id}`, {
      method: 'DELETE',
    });
  }

  // Project Types Detail
  async getProjectTypeDetails(filters: ProjectTypeDetailFilters = {}): Promise<ApiResponse<ProjectTypeDetail[] | { details: ProjectTypeDetail[]; pagination: any }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<ProjectTypeDetail[] | { details: ProjectTypeDetail[]; pagination: any }>(`/api/project-types-detail${queryString}`);
  }

  async getProjectTypeDetail(id: number): Promise<ApiResponse<ProjectTypeDetail>> {
    return this.request<ProjectTypeDetail>(`/api/project-types-detail/${id}`);
  }

  async createProjectTypeDetail(projectTypeDetailData: { ptype_id: number; s_id: number; weightage?: number; t_days?: number; est_cost?: number }): Promise<ApiResponse<ProjectTypeDetail>> {
    return this.request<ProjectTypeDetail>('/api/project-types-detail', {
      method: 'POST',
      body: JSON.stringify(projectTypeDetailData),
    });
  }

  async updateProjectTypeDetail(id: number, projectTypeDetailData: { ptype_id?: number; s_id?: number; weightage?: number; t_days?: number; est_cost?: number }): Promise<ApiResponse<ProjectTypeDetail>> {
    return this.request<ProjectTypeDetail>(`/api/project-types-detail/${id}`, {
      method: 'PUT',
      body: JSON.stringify(projectTypeDetailData),
    });
  }

  async deleteProjectTypeDetail(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/project-types-detail/${id}`, {
      method: 'DELETE',
    });
  }

  // PTS Details (Prerequisite Step Details)
  async getPTSDetails(ptd_id: number, proj_id?: number): Promise<ApiResponse<PTSDetail[]>> {
    const queryString = proj_id ? `?proj_id=${proj_id}` : '';
    const response = await this.request<any[]>(`/api/project-types-detail/${ptd_id}/pts-detail${queryString}`);
    if (response.success && response.data) {
      const normalized = response.data.map((d: any): PTSDetail => ({
        ptsd_id: d.ptsd_id,
        ptd_id: d.ptd_id,
        step_id: d.step_id,
        created_at: d.created_at,
        updated_at: d.updated_at,
        step: d.step ? {
          id: d.step.s_id || d.step.id,
          name: d.step.s_name || d.step.name,
          created_at: d.step.created_at || '',
          updated_at: d.step.updated_at || '',
        } : undefined,
      }))
      return { ...response, data: normalized }
    }
    return response as unknown as ApiResponse<PTSDetail[]>
  }

  async createPTSDetail(ptd_id: number, step_id: number): Promise<ApiResponse<PTSDetail>> {
    const response = await this.request<any>(`/api/project-types-detail/${ptd_id}/pts-detail`, {
      method: 'POST',
      body: JSON.stringify({ step_id }),
    });
    if (response.success && response.data) {
      const d: any = response.data
      const normalized: PTSDetail = {
        ptsd_id: d.ptsd_id,
        ptd_id: d.ptd_id,
        step_id: d.step_id,
        created_at: d.created_at,
        updated_at: d.updated_at,
        step: d.step ? {
          id: d.step.s_id || d.step.id,
          name: d.step.s_name || d.step.name,
          created_at: d.step.created_at || '',
          updated_at: d.step.updated_at || '',
        } : undefined,
      }
      return { ...response, data: normalized }
    }
    return response as unknown as ApiResponse<PTSDetail>
  }

  async deletePTSDetail(ptd_id: number, ptsd_id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/project-types-detail/${ptd_id}/pts-detail/${ptsd_id}`, {
      method: 'DELETE',
    });
  }

  // Delay Reasons
  async getDelayReasons(filters: DelayReasonFilters = {}): Promise<ApiResponse<DelayReason[] | { delayReasons: DelayReason[]; pagination: any }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<DelayReason[] | { delayReasons: DelayReason[]; pagination: any }>(`/api/delay-reasons${queryString}`);
  }

  async getDelayReason(id: number): Promise<ApiResponse<DelayReason>> {
    return this.request<DelayReason>(`/api/delay-reasons/${id}`);
  }

  async createDelayReason(delayReasonData: { d_name: string }): Promise<ApiResponse<DelayReason>> {
    return this.request<DelayReason>('/api/delay-reasons', {
      method: 'POST',
      body: JSON.stringify(delayReasonData),
    });
  }

  async updateDelayReason(id: number, delayReasonData: { d_name?: string }): Promise<ApiResponse<DelayReason>> {
    return this.request<DelayReason>(`/api/delay-reasons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(delayReasonData),
    });
  }

  async deleteDelayReason(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/delay-reasons/${id}`, {
      method: 'DELETE',
    });
  }

  // Steps
  async getSteps(filters: StepFilters = {}): Promise<ApiResponse<Step[] | { steps: Step[]; pagination: any }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<Step[] | { steps: Step[]; pagination: any }>(`/api/steps${queryString}`);
  }

  async getStep(id: number): Promise<ApiResponse<Step>> {
    return this.request<Step>(`/api/steps/${id}`);
  }

  async createStep(stepData: { s_name: string; department_id: number }): Promise<ApiResponse<Step>> {
    return this.request<Step>('/api/steps', {
      method: 'POST',
      body: JSON.stringify(stepData),
    });
  }

  async updateStep(id: number, stepData: { s_name?: string }): Promise<ApiResponse<Step>> {
    return this.request<Step>(`/api/steps/${id}`, {
      method: 'PUT',
      body: JSON.stringify(stepData),
    });
  }

  async deleteStep(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/steps/${id}`, {
      method: 'DELETE',
    });
  }

  // Issues
  async getIssues(filters: IssueFilters = {}): Promise<ApiResponse<Issue[] | { issues: Issue[]; pagination: any }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<Issue[] | { issues: Issue[]; pagination: any }>(`/api/issues${queryString}`);
  }

  async getIssue(id: number): Promise<ApiResponse<Issue>> {
    return this.request<Issue>(`/api/issues/${id}`);
  }

  async createIssue(issueData: { issue_name: string; description?: string | null; issue_category_id?: number | null; department_id: number }): Promise<ApiResponse<Issue>> {
    return this.request<Issue>('/api/issues', {
      method: 'POST',
      body: JSON.stringify(issueData),
    });
  }

  async updateIssue(id: number, issueData: { issue_name?: string; description?: string | null; issue_category_id?: number | null }): Promise<ApiResponse<Issue>> {
    return this.request<Issue>(`/api/issues/${id}`, {
      method: 'PUT',
      body: JSON.stringify(issueData),
    });
  }

  async deleteIssue(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/issues/${id}`, {
      method: 'DELETE',
    });
  }

  // Issue Categories
  async getIssueCategories(filters: IssueCategoryFilters = {}): Promise<ApiResponse<IssueCategory[] | { issueCategories: IssueCategory[]; pagination: any }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<IssueCategory[] | { issueCategories: IssueCategory[]; pagination: any }>(`/api/issues-categories${queryString}`);
  }

  async getIssueCategory(id: number): Promise<ApiResponse<IssueCategory>> {
    return this.request<IssueCategory>(`/api/issues-categories/${id}`);
  }

  async createIssueCategory(issueCategoryData: { issue_c_name: string; description?: string }): Promise<ApiResponse<IssueCategory>> {
    return this.request<IssueCategory>('/api/issues-categories', {
      method: 'POST',
      body: JSON.stringify(issueCategoryData),
    });
  }

  async updateIssueCategory(id: number, issueCategoryData: { issue_c_name?: string; description?: string }): Promise<ApiResponse<IssueCategory>> {
    return this.request<IssueCategory>(`/api/issues-categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(issueCategoryData),
    });
  }

  async deleteIssueCategory(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/issues-categories/${id}`, {
      method: 'DELETE',
    });
  }

  // Funding Sources
  async getFundingSources(filters: FundingSourceFilters = {}): Promise<ApiResponse<FundingSource[] | { fundingSources: FundingSource[]; pagination: any }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<FundingSource[] | { fundingSources: FundingSource[]; pagination: any }>(`/api/funding-sources${queryString}`);
  }

  async getFundingSource(id: number): Promise<ApiResponse<FundingSource>> {
    return this.request<FundingSource>(`/api/funding-sources/${id}`);
  }

  async createFundingSource(fundingSourceData: { fs_name: string; description?: string }): Promise<ApiResponse<FundingSource>> {
    return this.request<FundingSource>('/api/funding-sources', {
      method: 'POST',
      body: JSON.stringify(fundingSourceData),
    });
  }

  async updateFundingSource(id: number, fundingSourceData: { fs_name?: string; description?: string }): Promise<ApiResponse<FundingSource>> {
    return this.request<FundingSource>(`/api/funding-sources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(fundingSourceData),
    });
  }

  async deleteFundingSource(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/funding-sources/${id}`, {
      method: 'DELETE',
    });
  }

  // Materials
  async getMaterials(filters: MaterialFilters = {}): Promise<ApiResponse<Material[] | { materials: Material[]; pagination: any }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<Material[] | { materials: Material[]; pagination: any }>(`/api/materials${queryString}`);
  }

  async getMaterial(id: number): Promise<ApiResponse<Material>> {
    return this.request<Material>(`/api/materials/${id}`);
  }

  async createMaterial(materialData: { m_name: string; description?: string }): Promise<ApiResponse<Material>> {
    return this.request<Material>('/api/materials', {
      method: 'POST',
      body: JSON.stringify(materialData),
    });
  }

  async updateMaterial(id: number, materialData: { m_name?: string; description?: string }): Promise<ApiResponse<Material>> {
    return this.request<Material>(`/api/materials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(materialData),
    });
  }

  async deleteMaterial(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/materials/${id}`, {
      method: 'DELETE',
    });
  }

  // Business Plans
  async getBusinessPlans(filters: BusinessPlanFilters = {}): Promise<ApiResponse<BusinessPlan[] | { businessPlans: BusinessPlan[]; pagination: any }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<BusinessPlan[] | { businessPlans: BusinessPlan[]; pagination: any }>(`/api/business-plans${queryString}`);
  }

  async getBusinessPlan(id: number): Promise<ApiResponse<BusinessPlan>> {
    return this.request<BusinessPlan>(`/api/business-plans/${id}`);
  }

  async createBusinessPlan(businessPlanData: { ptype_id: number; dept_id?: number; sd_id: number; fs_id?: number | null; proj_name: string; tar_date: string; start_date?: string | null; completion_date?: string | null }): Promise<ApiResponse<BusinessPlan>> {
    return this.request<BusinessPlan>('/api/business-plans', {
      method: 'POST',
      body: JSON.stringify(businessPlanData),
    });
  }

  async updateBusinessPlan(id: number, businessPlanData: { ptype_id?: number; dept_id?: number; sd_id?: number; fs_id?: number | null; proj_name?: string; tar_date?: string | null; start_date?: string | null; completion_date?: string | null }): Promise<ApiResponse<BusinessPlan>> {
    return this.request<BusinessPlan>(`/api/business-plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(businessPlanData),
    });
  }

  async startBusinessPlan(id: number, start_date: string): Promise<ApiResponse<BusinessPlan>> {
    return this.request<BusinessPlan>(`/api/business-plans/${id}/actions/start`, {
      method: 'PUT',
      body: JSON.stringify({ start_date }),
    });
  }

  async completeBusinessPlan(id: number): Promise<ApiResponse<BusinessPlan>> {
    return this.request<BusinessPlan>(`/api/business-plans/${id}/actions/complete`, {
      method: 'PUT',
      body: JSON.stringify({}),
    });
  }

  async cancelBusinessPlan(id: number, cancellation_date: string, cancellation_reason: string): Promise<ApiResponse<BusinessPlan>> {
    return this.request<BusinessPlan>(`/api/business-plans/${id}/actions/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ cancellation_date, cancellation_reason }),
    });
  }

  async deleteBusinessPlan(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/business-plans/${id}`, {
      method: 'DELETE',
    });
  }

  // Business Plan Details
  async getBusinessPlanDetails(filters: BusinessPlanDetailFilters = {}): Promise<ApiResponse<BusinessPlanDetail[] | { details: BusinessPlanDetail[]; pagination: any }>> {
    const params = new URLSearchParams();
    if (filters.proj_id) params.append('proj_id', filters.proj_id.toString());
    if (filters.all) params.append('all', 'true');
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.sort_by) params.append('sort_by', filters.sort_by);
    if (filters.sort_order) params.append('sort_order', filters.sort_order);
    
    const queryString = params.toString();
    const url = `/api/business-plans-detail${queryString ? `?${queryString}` : ''}`;
    return this.request<BusinessPlanDetail[] | { details: BusinessPlanDetail[]; pagination: any }>(url);
  }

  async getBusinessPlanDetail(id: number): Promise<ApiResponse<BusinessPlanDetail>> {
    return this.request<BusinessPlanDetail>(`/api/business-plans-detail/${id}`);
  }

  async createBusinessPlanDetail(detailData: { proj_id: number; s_id: number; weightage?: number; t_days?: number; est_cost?: number; order?: number; status?: number }): Promise<ApiResponse<BusinessPlanDetail>> {
    return this.request<BusinessPlanDetail>('/api/business-plans-detail', {
      method: 'POST',
      body: JSON.stringify(detailData),
    });
  }

  async updateBusinessPlanDetail(id: number, detailData: { proj_id?: number; s_id?: number; weightage?: number; t_days?: number; est_cost?: number; act_cost?: number | null; order?: number; started_at?: string | null; completed_at?: string | null; remarks_1?: string | null; remarks_2?: string | null }): Promise<ApiResponse<BusinessPlanDetail>> {
    return this.request<BusinessPlanDetail>(`/api/business-plans-detail/${id}`, {
      method: 'PUT',
      body: JSON.stringify(detailData),
    });
  }

  async startBusinessPlanDetail(id: number, started_at: string, remarks_1?: string | null): Promise<ApiResponse<BusinessPlanDetail>> {
    return this.request<BusinessPlanDetail>(`/api/business-plans-detail/${id}/actions/start`, {
      method: 'PUT',
      body: JSON.stringify({ started_at, ...(remarks_1 ? { remarks_1 } : {}) }),
    });
  }

  async completeBusinessPlanDetail(id: number, completed_at: string, remarks_2?: string | null, act_cost?: number | null): Promise<ApiResponse<BusinessPlanDetail>> {
    const body: { completed_at: string; remarks_2?: string | null; act_cost?: number | null } = { completed_at };
    if (remarks_2 !== undefined) {
      body.remarks_2 = remarks_2;
    }
    if (act_cost !== undefined) {
      body.act_cost = act_cost;
    }
    return this.request<BusinessPlanDetail>(`/api/business-plans-detail/${id}/actions/complete`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async deleteBusinessPlanDetail(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/business-plans-detail/${id}`, {
      method: 'DELETE',
    });
  }

  // Audit Trail
  async getAuditTrail(filters: AuditTrailFilters = {}): Promise<ApiResponse<{ auditTrails: AuditTrail[]; pagination: any }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<{ auditTrails: AuditTrail[]; pagination: any }>(`/api/audit-trail${queryString}`);
  }

  // BPD Delays
  async getBPDDelays(filters: BPDDelayFilters = {}): Promise<ApiResponse<BPDDelay[] | { delays: BPDDelay[]; pagination: any }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<BPDDelay[] | { delays: BPDDelay[]; pagination: any }>(`/api/bpd-delays${queryString}`);
  }

  async getBPDDelay(id: number): Promise<ApiResponse<BPDDelay>> {
    return this.request<BPDDelay>(`/api/bpd-delays/${id}`);
  }

  async createBPDDelay(delayData: CreateBPDDelayData): Promise<ApiResponse<BPDDelay>> {
    return this.request<BPDDelay>('/api/bpd-delays', {
      method: 'POST',
      body: JSON.stringify(delayData),
    });
  }

  async updateBPDDelay(id: number, delayData: UpdateBPDDelayData): Promise<ApiResponse<BPDDelay>> {
    return this.request<BPDDelay>(`/api/bpd-delays/${id}`, {
      method: 'PUT',
      body: JSON.stringify(delayData),
    });
  }

  async deleteBPDDelay(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/bpd-delays/${id}`, {
      method: 'DELETE',
    });
  }

  // BPD Materials
  async getBPDMaterials(filters: BPDMaterialFilters = {}): Promise<ApiResponse<BPDMaterial[] | { materials: BPDMaterial[]; pagination: any }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<BPDMaterial[] | { materials: BPDMaterial[]; pagination: any }>(`/api/bpd-materials${queryString}`);
  }

  async getBPDMaterial(id: number): Promise<ApiResponse<BPDMaterial>> {
    return this.request<BPDMaterial>(`/api/bpd-materials/${id}`);
  }

  async createBPDMaterial(materialData: CreateBPDMaterialData): Promise<ApiResponse<BPDMaterial>> {
    return this.request<BPDMaterial>('/api/bpd-materials', {
      method: 'POST',
      body: JSON.stringify(materialData),
    });
  }

  async updateBPDMaterial(id: number, materialData: UpdateBPDMaterialData): Promise<ApiResponse<BPDMaterial>> {
    return this.request<BPDMaterial>(`/api/bpd-materials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(materialData),
    });
  }

  async deleteBPDMaterial(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/bpd-materials/${id}`, {
      method: 'DELETE',
    });
  }

  async allocateBPDMaterial(id: number, alloc_qty?: number | null, alloc_remarks?: string | null): Promise<ApiResponse<BPDMaterial>> {
    return this.request<BPDMaterial>(`/api/bpd-materials/${id}/actions/allocate`, {
      method: 'PUT',
      body: JSON.stringify({
        ...(alloc_qty !== undefined && { alloc_qty }),
        ...(alloc_remarks !== undefined && { alloc_remarks }),
      }),
    });
  }

  async useBPDMaterial(id: number, act_qty?: number | null, act_remarks?: string | null): Promise<ApiResponse<BPDMaterial>> {
    return this.request<BPDMaterial>(`/api/bpd-materials/${id}/actions/use`, {
      method: 'PUT',
      body: JSON.stringify({
        ...(act_qty !== undefined && { act_qty }),
        ...(act_remarks !== undefined && { act_remarks }),
      }),
    });
  }

  // Project Issues
  async getProjectIssues(filters: ProjectIssueFilters = {}): Promise<ApiResponse<ProjectIssue[] | { projectIssues: ProjectIssue[]; pagination: any }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<ProjectIssue[] | { projectIssues: ProjectIssue[]; pagination: any }>(`/api/project-issues${queryString}`);
  }

  async getProjectIssue(id: number): Promise<ApiResponse<ProjectIssue>> {
    return this.request<ProjectIssue>(`/api/project-issues/${id}`);
  }

  async createProjectIssue(projectIssueData: CreateProjectIssueData): Promise<ApiResponse<ProjectIssue>> {
    return this.request<ProjectIssue>('/api/project-issues', {
      method: 'POST',
      body: JSON.stringify({
        issue_id: projectIssueData.issue_id,
        proj_id: projectIssueData.proj_id,
        s_id: projectIssueData.s_id,
        remarks_1: projectIssueData.remarks_1 ?? null,
      }),
    });
  }

  async createProjectIssueAction(projectIssueData: CreateProjectIssueData): Promise<ApiResponse<ProjectIssue>> {
    return this.request<ProjectIssue>('/api/project-issues/actions/open', {
      method: 'POST',
      body: JSON.stringify({
        issue_id: projectIssueData.issue_id,
        proj_id: projectIssueData.proj_id,
        s_id: projectIssueData.s_id,
        description: projectIssueData.description ?? null,
        remarks_1: projectIssueData.remarks_1 ?? null,
      }),
    });
  }

  async updateProjectIssue(id: number, projectIssueData: { issue_id?: number; proj_id?: number; remarks_1?: string | null; remarks_3?: string | null }): Promise<ApiResponse<ProjectIssue>> {
    const body: any = {};
    if (projectIssueData.issue_id !== undefined) body.issue_id = projectIssueData.issue_id;
    if (projectIssueData.proj_id !== undefined) body.proj_id = projectIssueData.proj_id;
    if (projectIssueData.remarks_1 !== undefined) body.remarks_1 = projectIssueData.remarks_1 ?? null;
    if (projectIssueData.remarks_3 !== undefined) body.remarks_3 = projectIssueData.remarks_3 ?? null;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Updating project issue:', id, body);
    }
    
    return this.request<ProjectIssue>(`/api/project-issues/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async openProjectIssue(id: number, remarks_1?: string | null): Promise<ApiResponse<ProjectIssue>> {
    return this.request<ProjectIssue>(`/api/project-issues/${id}/actions/open`, {
      method: 'PUT',
      body: JSON.stringify(remarks_1 ? { remarks_1 } : {}),
    });
  }

  async completeProjectIssue(id: number, remarks_3?: string | null): Promise<ApiResponse<ProjectIssue>> {
    return this.request<ProjectIssue>(`/api/project-issues/${id}/actions/complete`, {
      method: 'PUT',
      body: JSON.stringify(remarks_3 ? { remarks_3 } : {}),
    });
  }

  async deleteProjectIssue(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/project-issues/${id}`, {
      method: 'DELETE',
    });
  }

  // Project Wise Issues Report
  async getProjectIssuesReport(filters: ProjectIssuesReportFilters = {}): Promise<ApiResponse<{ projects: ProjectWithIssues[]; pagination: any }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<{ projects: ProjectWithIssues[]; pagination: any }>(`/api/report/project-issues${queryString}`);
  }

  // Issues Detail Report
  async getIssuesDetailReport(filters: IssuesDetailReportFilters = {}): Promise<ApiResponse<IssuesDetailReport>> {
    // Handle special case for fs_id: null or empty string should be sent as "null" string
    const processedFilters: Record<string, any> = { ...filters };
    if (processedFilters.fs_id === null || processedFilters.fs_id === '') {
      processedFilters.fs_id = 'null';
    }
    const queryString = this.buildQueryString(processedFilters);
    return this.request<IssuesDetailReport>(`/api/report/issues-detail${queryString}`);
  }

  // KPIs Report
  async getKPIsReport(filters: KPIsFilters = {}): Promise<ApiResponse<KPIsReport>> {
    // Handle special case for fs_id: null or empty string should be sent as "null" string
    const processedFilters: Record<string, any> = { ...filters };
    if (processedFilters.fs_id === null || processedFilters.fs_id === '') {
      processedFilters.fs_id = 'null';
    }
    const queryString = this.buildQueryString(processedFilters);
    return this.request<KPIsReport>(`/api/report/kpis${queryString}`);
  }

  // Projects Status Snapshot Report
  async getProjectsStatusSnapshot(filters?: { dept_id?: number; from_date?: string; to_date?: string }): Promise<ApiResponse<ProjectsStatusSnapshot>> {
    const queryString = this.buildQueryString(filters || {});
    return this.request<ProjectsStatusSnapshot>(`/api/report/projects-status-snapshot${queryString}`);
  }

  // Progress by Project Type Report
  async getProgressByProjectType(filters?: { dept_id?: number; from_date?: string; to_date?: string }): Promise<ApiResponse<ProgressByProjectTypeReport>> {
    const queryString = this.buildQueryString(filters || {});
    return this.request<ProgressByProjectTypeReport>(`/api/report/progress-by-project-type${queryString}`);
  }

  // Progress by Department Report
  async getProgressByDepartment(filters?: { dept_id?: number; from_date?: string; to_date?: string }): Promise<ApiResponse<ProgressByDepartmentReport>> {
    const queryString = this.buildQueryString(filters || {});
    return this.request<ProgressByDepartmentReport>(`/api/report/progress-by-department${queryString}`);
  }

  // Quarter-wise Projects Report
  async getQuarterWiseProjects(filters?: { dept_id?: number; from_date?: string; to_date?: string }): Promise<ApiResponse<QuarterWiseProjectsReport>> {
    const queryString = this.buildQueryString(filters || {});
    return this.request<QuarterWiseProjectsReport>(`/api/report/quarter-wise-projects${queryString}`);
  }

  // Funding Source Mix Report
  async getFundingSourceMix(filters?: { ptype_id?: number; status?: number; dept_id?: number; from_date?: string; to_date?: string }): Promise<ApiResponse<FundingSourceMixReport>> {
    const queryString = this.buildQueryString(filters || {});
    return this.request<FundingSourceMixReport>(`/api/report/funding-source-mix${queryString}`);
  }

  // Issues by Cause Report
  async getIssuesByCause(filters?: { dept_id?: number; from_date?: string; to_date?: string }): Promise<ApiResponse<IssuesByCauseReport>> {
    const queryString = this.buildQueryString(filters || {});
    return this.request<IssuesByCauseReport>(`/api/report/issues-by-cause${queryString}`);
  }

  // Materials Summary Report
  async getMaterialsSummary(filters?: { from_date?: string; to_date?: string }): Promise<ApiResponse<MaterialsSummaryReport>> {
    const queryString = this.buildQueryString(filters || {});
    return this.request<MaterialsSummaryReport>(`/api/report/materials-summary${queryString}`);
  }

  // Users Report
  async getUsersReport(filters: UsersReportFilters = {}): Promise<ApiResponse<{ 
    users: UsersReportUser[]; 
    pagination: any;
    department_statistics?: UsersReportDepartmentStatistic[];
    users_with_all_departments_count?: number;
  }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<{ 
      users: UsersReportUser[]; 
      pagination: any;
      department_statistics?: UsersReportDepartmentStatistic[];
      users_with_all_departments_count?: number;
    }>(`/api/report/users${queryString}`);
  }

  // Settings
  async getSettings(): Promise<ApiResponse<Settings>> {
    return this.request<Settings>('/api/settings');
  }

  async updateSettings(payload: Partial<Pick<Settings, 'currency_symbol' | 'currency_code'>>): Promise<ApiResponse<Settings>> {
    return this.request<Settings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // ==================== INVENTORY SYSTEM API METHODS ====================

  // Stores
  async getStores(filters: StoreFilters = {}): Promise<ApiResponse<Store[] | { stores: Store[]; pagination: any }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<Store[] | { stores: Store[]; pagination: any }>(`/api/stores${queryString}`);
  }

  async getStore(id: number): Promise<ApiResponse<Store>> {
    return this.request<Store>(`/api/stores/${id}`);
  }

  async createStore(storeData: CreateStoreData): Promise<ApiResponse<Store>> {
    return this.request<Store>('/api/stores', {
      method: 'POST',
      body: JSON.stringify(storeData),
    });
  }

  async updateStore(id: number, storeData: UpdateStoreData): Promise<ApiResponse<Store>> {
    return this.request<Store>(`/api/stores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(storeData),
    });
  }

  async deleteStore(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/stores/${id}`, {
      method: 'DELETE',
    });
  }

  // Items
  async getItems(filters: ItemFilters = {}): Promise<ApiResponse<Item[] | { items: Item[]; pagination: any }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<Item[] | { items: Item[]; pagination: any }>(`/api/items${queryString}`);
  }

  async getItem(id: number, includeOpeningStocks: boolean = false): Promise<ApiResponse<Item>> {
    const queryString = includeOpeningStocks ? '?include_opening_stocks=true' : '';
    return this.request<Item>(`/api/items/${id}${queryString}`);
  }

  async createItem(itemData: CreateItemData): Promise<ApiResponse<Item>> {
    return this.request<Item>('/api/items', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  }

  async updateItem(id: number, itemData: UpdateItemData): Promise<ApiResponse<Item>> {
    return this.request<Item>(`/api/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(itemData),
    });
  }

  async deleteItem(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/items/${id}`, {
      method: 'DELETE',
    });
  }

  // Rates
  async getRates(filters: RateFilters = {}): Promise<ApiResponse<Rate[] | { rates: Rate[]; pagination: any }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<Rate[] | { rates: Rate[]; pagination: any }>(`/api/rates${queryString}`);
  }

  async getCurrentRate(itemId: number): Promise<ApiResponse<Rate>> {
    return this.request<Rate>(`/api/rates/current/${itemId}`);
  }

  async getRate(id: number): Promise<ApiResponse<Rate>> {
    return this.request<Rate>(`/api/rates/${id}`);
  }

  async createRate(rateData: CreateRateData): Promise<ApiResponse<Rate>> {
    return this.request<Rate>('/api/rates', {
      method: 'POST',
      body: JSON.stringify(rateData),
    });
  }

  async updateRate(id: number, rateData: UpdateRateData): Promise<ApiResponse<Rate>> {
    return this.request<Rate>(`/api/rates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(rateData),
    });
  }

  async deleteRate(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/rates/${id}`, {
      method: 'DELETE',
    });
  }

  // Store Transfer Notes
  async getStoreTransferNotes(filters: StoreTransferNoteFilters = {}): Promise<ApiResponse<StoreTransferNote[] | { transferNotes: StoreTransferNote[]; pagination: any }>> {
    const queryString = this.buildQueryString(filters);
    return this.request<StoreTransferNote[] | { transferNotes: StoreTransferNote[]; pagination: any }>(`/api/store-transfer-notes${queryString}`);
  }

  async getStoreTransferNote(id: number): Promise<ApiResponse<StoreTransferNote>> {
    return this.request<StoreTransferNote>(`/api/store-transfer-notes/${id}`);
  }

  async createStoreTransferNote(transferNoteData: CreateStoreTransferNoteData): Promise<ApiResponse<StoreTransferNote>> {
    return this.request<StoreTransferNote>('/api/store-transfer-notes', {
      method: 'POST',
      body: JSON.stringify(transferNoteData),
    });
  }

  async updateStoreTransferNote(id: number, transferNoteData: UpdateStoreTransferNoteData): Promise<ApiResponse<StoreTransferNote>> {
    return this.request<StoreTransferNote>(`/api/store-transfer-notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(transferNoteData),
    });
  }

  async deleteStoreTransferNote(id: number): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/store-transfer-notes/${id}`, {
      method: 'DELETE',
    });
  }

  async getSourceStoresWithStock(
    itemId: number,
    minQty: number = 0,
  ): Promise<ApiResponse<StoreSourceWithStock[]>> {
    const params: Record<string, any> = { item_id: itemId }
    if (minQty !== 0) {
      params.min_qty = minQty
    }
    const queryString = this.buildQueryString(params)
    return this.request<StoreSourceWithStock[]>(`/api/store-transfer-notes/source-stores${queryString}`)
  }

  // Reports - Inventory
  async getStockReport(filters: StockReportFilters): Promise<ApiResponse<StockReport>> {
    const queryString = this.buildQueryString(filters as Record<string, any>);
    return this.request<StockReport>(`/api/reports/store-wise-stock${queryString}`);
  }

  async getStockTransferDetailReport(filters: StockTransferDetailReportFilters): Promise<ApiResponse<StockTransferDetailReport>> {
    const queryString = this.buildQueryString(filters as Record<string, any>);
    return this.request<StockTransferDetailReport>(`/api/reports/store-transfer-detail${queryString}`);
  }
}

export const apiClient = new ApiClient();
export default apiClient;

