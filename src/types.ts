export interface Inputs {
  assigned_label: string;
  assigned_comment: string;
  days_until_unassign: number;
  github_token: string;
  pin_label?: string;
  required_label?: string;
  stale_assignment_label: string;
}

export interface Issue {
  [key: string]: any;
  number: number;
  html_url?: string;
  body?: string;
}
