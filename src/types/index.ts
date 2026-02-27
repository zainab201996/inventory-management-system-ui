// User Types
export interface User {
  id: number;
  username: string;
  is_active: boolean;
  department_id?: number | null;
  circle_id?: number | null;
  division_id?: number | null;
  sub_division_id?: number | null;
  sap_code?: number | null;
  email?: string | null;
  p_num?: string | null;
  full_name?: string | null;
  created_at: string;
  updated_at: string;
  roles?: Array<{
    role_id: number;
    role_name: string;
    created_at: string;
  }>;
  department?: Department;
  circle?: Circle;
  division?: Division;
  sub_division?: SubDivision;
  permissions?: Record<string, {
    show: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  }>;
}

export interface UserFilters {
  search?: string;
  is_active?: boolean;
  role_id?: number;
  circle_id?: number;
  division_id?: number;
  sub_division_id?: number;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CreateUserData {
  username: string;
  password: string;
  department_id: number;
  role_ids: number[];
  sap_code?: number;
  email?: string;
  p_num?: string;
  full_name?: string;
}

export interface UpdateUserData {
  username?: string;
  password?: string;
  department_id?: number;
  role_ids?: number[];
  is_active?: boolean;
  sap_code?: number;
  email?: string;
  p_num?: string;
  full_name?: string;
}

// Role Types
export interface Role {
  id: number;
  role_id?: number; // API uses role_id
  name: string;
  role_name?: string; // API uses role_name
  description?: string;
  created_at: string;
  updated_at?: string;
}

export interface RoleFilters {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  all?: boolean;
}

// Page Types
export interface Page {
  page_id: number;
  page_name: string;
  slug?: string;
  description?: string | null;
  is_report?: boolean;
  is_action?: boolean;
  created_at: string;
}

export interface PageFilters {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  all?: boolean;
}

// Role Detail Types
export interface RoleDetail {
  id: number;
  role_id: number;
  page_id: number;
  show: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  created_at: string;
  role?: Role;
  page?: Page;
}

export interface RoleDetailFilters {
  role_id?: number;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  all?: boolean;
}

// Department Types
export interface Department {
  dept_id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  updated_by?: number;
  updated_by_username?: string;
}

export interface DepartmentFilters {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  all?: boolean;
}

// Circle Types
export interface Circle {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  updated_by?: number;
  updated_by_username?: string;
}

export interface CircleFilters {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  all?: boolean;
}

// Division Types
export interface Division {
  id: number;
  name: string;
  circle_id: number;
  description?: string;
  created_at: string;
  updated_at: string;
  updated_by?: number;
  updated_by_username?: string;
  circle?: Circle;
}

export interface DivisionFilters {
  circle_id?: number;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  all?: boolean;
}

// Sub Division Types
export interface SubDivision {
  id: number;
  name: string;
  division_id: number;
  description?: string;
  created_at: string;
  updated_at: string;
  updated_by?: number;
  updated_by_username?: string;
  division?: Division;
  circle?: Circle;
}

export interface SubDivisionFilters {
  division_id?: number;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  all?: boolean;
}

// User Sub Division Types
export interface UserSubDivision {
  usd_id: number;
  user_id: number;
  sd_id: number;
  created_at: string;
  user?: User;
  sub_division?: SubDivision;
}

export interface UserSubDivisionFilters {
  user_id?: number;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  all?: boolean;
}

export interface UserDepartment {
  ud_id: number;
  user_id: number;
  dept_id: number;
  created_at: string;
  user?: User;
  department?: Department;
}

export interface UserDepartmentFilters {
  user_id?: number;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  all?: boolean;
}

// Project Type Types
export interface ProjectType {
  id: number;
  name: string;
  department_id?: number;
  department_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectTypeFilters {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  all?: boolean;
}

// Project Type Detail Types
export interface ProjectTypeDetail {
  id: number;
  ptype_id: number;
  s_id: number;
  weightage: number;
  t_days: number;
  est_cost: number;
  order: number;
  created_at: string;
  updated_at: string;
  project_type?: ProjectType;
  step?: Step;
}

export interface ProjectTypeDetailFilters {
  ptype_id?: number;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  all?: boolean;
}

// PTS Detail (Prerequisite Step Detail) Types
export interface PTSDetail {
  ptsd_id: number;
  ptd_id: number;
  step_id: number;
  created_at: string;
  updated_at: string;
  step?: Step;
}

// Delay Reason Types
export interface DelayReason {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  updated_by?: number;
  updated_by_username?: string;
}

export interface DelayReasonFilters {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  all?: boolean;
}

// Step Types
export interface Step {
  id: number;
  name: string;
  department_id?: number;
  department_name?: string;
  created_at: string;
  updated_at: string;
}

export interface StepFilters {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  all?: boolean;
}

// Issue Category Types
export interface IssueCategory {
  id: number;
  issue_c_id?: number; // API uses issue_c_id
  name: string;
  issue_c_name?: string; // API uses issue_c_name
  description?: string;
  created_at: string;
  updated_at: string;
  updated_by?: number;
  updated_by_username?: string;
}

export interface IssueCategoryFilters {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  all?: boolean;
}

// Issue Types
export interface Issue {
  id: number;
  name: string;
  description?: string;
  issue_category_id?: number | null;
  department_id?: number;
  department_name?: string;
  created_at: string;
  updated_at: string;
  updated_by?: number;
  updated_by_username?: string;
  issue_category?: IssueCategory;
  department?: Department;
}

export interface IssueFilters {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  all?: boolean;
}

// Funding Source Types
export interface FundingSource {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  updated_by?: number;
  updated_by_username?: string;
}

export interface FundingSourceFilters {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  all?: boolean;
}

// Material Types
export interface Material {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  updated_by?: number;
  updated_by_username?: string;
}

export interface MaterialFilters {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  all?: boolean;
}

// Business Plan Types
export interface BusinessPlan {
  id: number;
  ptype_id: number;
  dept_id: number;
  department_name?: string; // Department name from API
  sd_id: number;
  sub_division_name?: string; // Sub division name from API
  fs_id?: number | null;
  funding_source_name?: string; // Funding source name from API
  name: string;
  start_date: string | null;
  completion_date: string | null;
  est_completion_date?: string | null; // Calculated completion date from API
  total_days?: number | null; // Total days from API
  new_est_completion_date?: string | null; // Recalculated completion date from API
  tar_date: string | null;
  status: number; // 0 = planned, 1 = started, 2 = completed, 3 = cancelled
  cancellation_date?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  project_type?: ProjectType;
  department?: Department;
  sub_division?: SubDivision;
}

export interface BusinessPlanFilters {
  ptype_id?: number;
  sd_id?: number;
  fs_id?: number | null | string; // null or 'null' string to filter for projects with no funding source
  dept_id?: number;
  status?: number;
  from_date?: string; // YYYY-MM-DD format
  to_date?: string; // YYYY-MM-DD format
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  all?: boolean;
}

// Business Plan Detail Types
export interface BusinessPlanDetail {
  bpd_id: number;
  proj_id: number;
  s_id: number;
  weightage: number;
  t_days: number;
  est_cost: number;
  act_cost: number | null;
  order: number;
  status: number; // 0 = planned, 1 = started, 2 = completed
  remarks_1: string | null;
  remarks_2: string | null;
  started_at: string | null;
  completed_at: string | null;
  due_date: string | null; // Calculated by backend based on prerequisites
  created_at: string;
  updated_at: string;
  business_plan?: BusinessPlan;
  step?: Step;
}

export interface BusinessPlanDetailFilters {
  proj_id?: number;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  all?: boolean;
}

// Project Issue Types
export interface ProjectIssue {
  pi_id: number;
  issue_id: number;
  proj_id: number;
  // Step this issue is associated with (business plan execution step)
  s_id?: number;
  // Human-readable step name returned by /api/project-issues (step_name)
  step_name?: string;
  status: number; // 0 = open, 2 = resolved
  remarks_1: string | null; // Remarks for issue opening (status = 0)
  remarks_3: string | null; // Remarks for issue resolved (status = 2)
  opened_at: string | null; // Read-only: timestamp when issue was opened/created
  completed_at: string | null; // Read-only: timestamp when issue was resolved (null if not resolved)
  created_at: string;
  updated_at: string;
  updated_by?: number;
  updated_by_username?: string;
  issue?: Issue;
  business_plan?: BusinessPlan;
}

export interface ProjectIssueFilters {
  proj_id?: number;
  issue_id?: number;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  all?: boolean;
}

export interface CreateProjectIssueData {
  issue_id: number;
  proj_id: number;
  // Required by POST /api/project-issues/actions/open
  s_id: number;
  description?: string | null;
  remarks_1?: string | null;
  remarks_3?: string | null;
}

export interface UpdateProjectIssueData {
  issue_id?: number;
  proj_id?: number;
  remarks_1?: string | null;
  remarks_3?: string | null;
}

// Project Wise Issues Report Types
export interface ProjectIssueReportItem {
  pi_id: number;
  issue_id: number;
  proj_id?: number;
  s_id?: number;
  step_name?: string;
  status: number;
  remarks_1: string | null;
  remarks_3: string | null;
  opened_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string | null;
  updated_by?: number;
  updated_by_username?: string;
  issue?: Issue;
}

export interface ProjectWithIssues {
  proj_id: number;
  proj_name: string;
  ptype_id: number;
  dept_id: number;
  start_date: string;
  completion_date: string;
  status: number;
  created_at: string;
  project_type?: ProjectType;
  department?: Department;
  issues: ProjectIssueReportItem[];
  issue_counts: {
    total: number;
    open: number;
    completed: number;
  };
}

export interface ProjectIssuesReportFilters {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  proj_id?: number;
  status?: string; // Can be single value or comma-separated (e.g., "0,2")
  issue_id?: number;
  proj_name?: string;
  issue_name?: string;
  ptype_id?: number;
  dept_id?: number;
  from_date?: string; // YYYY-MM-DD format
  to_date?: string; // YYYY-MM-DD format
}

// Issues Detail Report Types
export interface IssuesDetailReportItem {
  pi_id: number;
  issue_id: number;
  proj_id: number;
  s_id?: number;
  step_name?: string;
  status: number;
  description: string | null;
  remarks_1: string | null;
  remarks_2: string | null;
  remarks_3: string | null;
  opened_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string | null;
  updated_by: number | null;
  updated_by_username: string | null;
  issue?: Issue;
  project?: {
    proj_id: number;
    proj_name: string;
    ptype_id: number;
    dept_id: number;
    sd_id: number;
    fs_id: number | null;
    start_date: string | null;
    completion_date: string | null;
    tar_date: string | null;
    status: number;
    created_at: string;
    project_type?: ProjectType;
    department?: Department;
  };
}

export interface IssuesDetailReportFilters {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  issue_id?: number;
  proj_id?: number;
  status?: number;
  ptype_id?: number;
  fs_id?: number | null | string; // null or empty string to filter for projects with no funding source
  dept_id?: number;
  from_date?: string; // YYYY-MM-DD format
  to_date?: string; // YYYY-MM-DD format
}

export interface IssuesDetailReport {
  issues: IssuesDetailReportItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// Report Types
export interface KPIsReport {
  total_projects: number;
  initiated_projects: number;
  in_progress_projects: number;
  completed_projects: number;
  cancelled_projects: number;
  portfolio_budget: number;
  actual_cost: number;
  variance: number;
  cost_performance: number | null;
  overall_completion_percentage: number | null;
  schedule_performance: number | null;
  on_time_completion_ratio: string | null;
}

export interface KPIsFilters {
  dept_id?: number;
  ptype_id?: number;
  fs_id?: number | null | string; // null or empty string to filter for projects with no funding source
  from_date?: string; // YYYY-MM-DD format
  to_date?: string; // YYYY-MM-DD format
}

export interface ProjectsStatusSnapshot {
  planned: number;
  started: number;
  completed: number;
  cancelled?: number; // Optional for backward compatibility until API is updated
  total: number;
}

export interface ProgressByProjectTypeItem {
  ptype_id: number;
  ptype_name: string;
  overall_completion_percentage: number;
}

export interface ProgressByProjectTypeReport {
  project_types: ProgressByProjectTypeItem[];
}

export interface ProgressByDepartmentItem {
  dept_id: number;
  dept_name: string;
  overall_completion_percentage: number;
}

export interface ProgressByDepartmentReport {
  departments: ProgressByDepartmentItem[];
}

export interface QuarterWiseQuarter {
  quarter: number;
  start_date: string;
  end_date: string;
  total_planned: number;
  total_started: number;
  total_completed: number;
}

export interface QuarterWiseProjectsReport {
  year_start: string;
  year_end: string;
  current_year: number;
  quarters: QuarterWiseQuarter[];
}

export interface FundingSourceMixItem {
  fs_id: number;
  fs_name: string;
  project_count: number;
  percentage: number;
}

export interface FundingSourceMixReport {
  total_projects: number;
  mix: FundingSourceMixItem[];
}

export interface IssuesByCauseReport {
  issues: Array<{
    issue_id: number;
    issue_name: string;
    total_open_issues: number;
  }>;
}

export interface MaterialsSummaryReport {
  total_required_material: number;
  total_allocated_material: number;
  total_installed_material: number;     
}

export interface UsersReportUser {
  id: number;
  username: string;
  sap_code?: number | null;
  email?: string | null;
  p_num?: string | null;
  full_name?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  departments: Array<{
    dept_id: number;
    name: string;
  }>;
  roles: Array<{
    role_id: number;
    role_name: string;
  }>;
}

export interface UsersReportDepartmentStatistic {
  dept_id: number;
  name: string;
  exclusive_users_count: number;
}

export interface UsersReportFilters {
  page?: number;
  limit?: number;
  sort_by?: 'id' | 'username' | 'sap_code' | 'email' | 'full_name' | 'is_active' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

// Auth Types
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  [key: string]: T[] | {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// Audit Trail Types
export interface AuditTrail {
  id: number;
  event_type: 'create' | 'edit' | 'delete';
  page_id: number;
  page_name: string;
  page_slug: string;
  userid: number;
  username: string;
  timestamp: string;
  is_action?: boolean; // Indicates if this is a status-related action
}

export interface AuditTrailFilters {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page_id?: number;
  userid?: number;
  event_type?: 'create' | 'edit' | 'delete';
  from_date?: string; // YYYY-MM-DD format
  to_date?: string; // YYYY-MM-DD format
  is_action?: boolean | string; // Filter by action type (true/1 for actions only, false/0 for non-actions)
}

// BPD Delay Types
export interface BPDDelay {
  bpdd_id: number;
  bpd_id: number;
  delay_id: number;
  remarks: string | null;
  created_at: string;
  created_by?: number;
  created_by_username?: string;
  business_plan_detail?: BusinessPlanDetail;
  delay_reason?: DelayReason;
}

export interface BPDDelayFilters {
  bpd_id?: number;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  all?: boolean;
}

export interface CreateBPDDelayData {
  bpd_id: number;
  delay_id: number;
  remarks?: string | null;
}

export interface UpdateBPDDelayData {
  bpd_id?: number;
  delay_id?: number;
  remarks?: string | null;
}

// BPD Material Types
export interface BPDMaterial {
  bpdm_id: number;
  bpd_id: number;
  m_id: number;
  r_qty: number;
  req_remarks: string | null;
  alloc_qty: number | null;
  alloc_remarks: string | null;
  status: number; // 0 = required, 1 = allocated, 2 = installed
  act_qty: number | null;
  act_remarks: string | null;
  proj_name?: string; // Project name from API
  step_name?: string; // Step name from API
  business_plan_detail?: BusinessPlanDetail;
  material?: Material;
}

export interface BPDMaterialFilters {
  bpd_id?: number;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  all?: boolean;
}

export interface CreateBPDMaterialData {
  bpd_id: number;
  m_id: number;
  r_qty?: number;
  req_remarks?: string | null;
  alloc_qty?: number | null;
  alloc_remarks?: string | null;
  status?: number;
  act_qty?: number | null;
  act_remarks?: string | null;
}

export interface UpdateBPDMaterialData {
  bpd_id?: number;
  m_id?: number;
  r_qty?: number;
  req_remarks?: string | null;
  alloc_qty?: number | null;
  alloc_remarks?: string | null;
  status?: number;
  act_qty?: number | null;
  act_remarks?: string | null;
}

// Settings Types
export interface Settings {
  id: number;
  year_start: string; // MM-DD format (e.g., "07-01")
  year_end: string; // MM-DD format (e.g., "06-30")
  created_at: string;
  updated_at: string;
}

// Financial Year Types
export interface FinancialYear {
  year: number; // The starting year of the financial year (e.g., 2025 for FY 2025-2026)
  label: string; // Display label (e.g., "FY 2025-2026")
  from_date: string; // ISO date string (e.g., "2025-07-01")
  to_date: string; // ISO date string (e.g., "2026-06-30")
}

// ==================== INVENTORY SYSTEM TYPES ====================

// Store Types
export interface Store {
  id: number;
  store_code: string;
  store_name: string;
  created_at: string;
  updated_at: string;
  updated_by?: number;
  updated_by_username?: string;
}

export interface StoreFilters {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  all?: boolean;
  search?: string;
}

export interface CreateStoreData {
  // store_code is generated by the backend
  store_name: string;
}

export interface UpdateStoreData {
  // store_code is generated by the backend and not editable from UI
  store_name?: string;
}

// Item Types
export interface Item {
  id: number;
  item_code: string;
  item_name: string;
  item_category: string;
  created_at: string;
  updated_at: string;
  updated_by?: number;
  updated_by_username?: string;
  opening_stocks?: OpeningStock[];
}

export interface ItemFilters {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  all?: boolean;
  search?: string;
  item_category?: string;
}

export interface CreateItemData {
  // item_code is generated by the backend
  item_name: string;
  item_category: string;
  opening_stocks?: CreateOpeningStockData[];
}

export interface UpdateItemData {
  // item_code is generated by the backend and not editable from UI
  item_name?: string;
  item_category?: string;
}

// Opening Stock Types
export interface OpeningStock {
  id: number;
  item_id: number;
  store_id: number;
  opening_qty: number;
  created_at: string;
  updated_at: string;
  item?: Item;
  store?: Store;
}

export interface CreateOpeningStockData {
  store_id: number;
  opening_qty: number;
}

export interface UpdateOpeningStockData {
  store_id?: number;
  opening_qty?: number;
}

// Rate Types
export interface Rate {
  id: number;
  item_id: number;
  rate: number;
  effective_date: string;
  created_at: string;
  updated_at: string;
  item?: Item;
}

export interface RateFilters {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  all?: boolean;
  item_id?: number;
}

export interface CreateRateData {
  item_id: number;
  rate: number;
  effective_date: string;
}

export interface UpdateRateData {
  item_id?: number;
  rate?: number;
  effective_date?: string;
}

// Store Transfer Note Types
export interface StoreTransferNote {
  id: number;
  v_no: string;
  date: string;
  ref_no: string | null;
  from_store_id: number;
  to_store_id: number;
  order_no: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  from_store?: Store;
  to_store?: Store;
  details?: StoreTransferNoteDetail[];
}

export interface StoreTransferNoteFilters {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  from_store_id?: number;
  to_store_id?: number;
  v_no?: string;
  date_from?: string;
  date_to?: string;
}

export interface StoreTransferNoteDetail {
  id: number;
  store_transfer_note_id: number;
  item_id: number;
  item_code: string;
  item_name: string;
  qty: number;
  ref: string | null;
  created_at: string;
  item?: Item;
}

export interface CreateStoreTransferNoteData {
  v_no: string;
  date: string;
  ref_no?: string | null;
  from_store_id: number;
  to_store_id: number;
  order_no?: string | null;
  details: CreateStoreTransferNoteDetailData[];
}

export interface CreateStoreTransferNoteDetailData {
  item_id: number;
  item_code: string;
  item_name: string;
  qty: number;
  ref?: string | null;
}

export interface UpdateStoreTransferNoteData {
  v_no?: string;
  date?: string;
  ref_no?: string | null;
  from_store_id?: number;
  to_store_id?: number;
  order_no?: string | null;
  details?: CreateStoreTransferNoteDetailData[];
}

// Store Wise Stock Report Types (Store Wise Stock Report API)
export interface StockReportFilters {
  fromDate: string;
  toDate: string;
  store_id?: number;
}

export interface StockReportItem {
  store_id: number;
  store_code: string;
  store_name: string;
  item_id: number;
  item_code: string;
  item_name: string;
  item_category?: string;
  opening_qty: number;
  purchase_qty: number;
  transfer_in_qty: number;
  transfer_out_qty: number;
  closing_qty: number;
  stock_rate: number | null;
  stock_value: number | null;
}

export type StockReport = StockReportItem[];

// Store Transfer Detail Report Types (Store Transfer Detail Report API)
export interface StockTransferDetailReportFilters {
  fromDate: string;
  toDate: string;
  from_store_id?: number;
  to_store_id?: number;
}

export interface StockTransferDetailReportItem {
  transfer_note_id: number;
  v_no: string;
  date: string;
  ref_no: string | null;
  order_no: string | null;
  from_store_id: number;
  from_store_code: string;
  from_store_name: string;
  to_store_id: number;
  to_store_code: string;
  to_store_name: string;
  item_id: number;
  item_code: string;
  item_name: string;
  qty: number;
  ref: string | null;
}

export type StockTransferDetailReport = StockTransferDetailReportItem[];
