// Tipos compartilhados pelas telas de lista, perfil e modais de corretores.
export type UserRole = "ADMIN" | "CORRETOR";

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  active: boolean;
  crmEnabled?: boolean;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  loginCount: number;
  createdAt: string;
  updatedAt?: string;
  activeLeads: number;
  closedLeads: number;
};

export type TransferFilter = "all" | "active" | "open";

export type TransferPreview = Record<TransferFilter, {
  count: number;
  samples: Array<{ id: string; name: string; stage: string }>;
}>;

export type AccessLogItem = {
  id: string;
  action: string;
  ip: string | null;
  userAgent: string | null;
  detail: string | null;
  createdAt: string;
};

export type UserProfileResponse = {
  user: Omit<ManagedUser, "activeLeads" | "closedLeads"> & { accessLogs: AccessLogItem[] };
  stats: {
    totalLeads: number;
    activeLeads: number;
    closedLeads: number;
    lostLeads: number;
    mrr: number;
    conversionRate: number;
    avgResponseTime: number;
  };
  distribution: Array<{ stage: string; total: number }>;
  transferPreview: TransferPreview;
};
