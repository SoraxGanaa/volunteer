import type { ColumnType, Generated } from "kysely";
type Timestamp = ColumnType<Date, Date | undefined, Date | undefined>;

export interface DB {
  users: {
    id: Generated<string>;
    role: "SUPERADMIN" | "ORG_ADMIN" | "USER";
    email: string | null;
    phone: string | null;
    password_hash: string;
    first_name: string | null;
    last_name: string | null;
    status: "ACTIVE" | "SUSPENDED" | "DELETED";
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  organizations: {
    id: Generated<string>;
    name: string;
    email: string | null;
    phone: string | null;
    logo_url: string | null;
    description: string | null;
    status: "PENDING" | "ACTIVE" | "SUSPENDED" | "DELETED";
    created_by: string | null;
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  org_members: {
    id: Generated<string>;
    org_id: string;
    user_id: string;
    org_role: "STAFF";
    status: "ACTIVE" | "SUSPENDED" | "DELETED";
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  org_staff_applications: {
    id: Generated<string>;
    org_id: string;
    user_id: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
    message: string | null;
    decided_by: string | null;
    decided_at: Timestamp;
    decision_note: string | null;
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  events: {
    id: Generated<string>;
    banner_url: string | null;
    org_id: string;
    created_by: string | null;
    title: string;
    description: string | null;
    category: string | null;
    city: string | null;
    address: string | null;
    lat: string | null; // numeric -> string
    lng: string | null;
    start_at: Date;
    end_at: Date | null;
    capacity: number;
    status: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  event_applications: {
    id: Generated<string>;
    event_id: string;
    user_id: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
    message: string | null;
    decided_by: string | null;
    decided_at: Timestamp;
    decision_note: string | null;
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  event_attendance: {
    id: Generated<string>;
    event_id: string;
    user_id: string;
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
    check_in_at: Date | null;
    note: string | null;
    marked_by: string | null;
    marked_at: Date;
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  volunteer_certificates: {
    id: Generated<string>;
    user_id: string;
    title: string;
    issuer: string | null;
    issue_date: string | null; // date -> string
    expiry_date: string | null;
    file_url: string;
    note: string | null;
    created_at: Timestamp;
    updated_at: Timestamp;
  };
}
