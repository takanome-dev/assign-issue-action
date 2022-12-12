import { WebhookPayload } from '@actions/github/lib/interfaces';

export interface Inputs {
  assigned_label?: string;
  assigned_comment?: string;
  days_until_unassign?: number;
  github_token: string;
  trigger?: string;
  pin_label?: string;
  required_label?: string;
  stale_assignment_label?: string;
}

export interface Issue {
  id: number;
  node_id: string;
  url: string;
  repository_url: string;
  labels_url: string;
  comments_url: string;
  events_url: string;
  html_url: string;
  number: number;
  state: string;
  title: string;
  body?: string;
  user: User | null;
  labels: Label[];
  assignee: User | null;
  assignees?: User[] | null;
  milestone: Milestone | null;
  locked: boolean;
  active_lock_reason?: string | null;
  comments: number;
  pull_request?: {
    url: string | null;
    html_url: string | null;
    diff_url: string | null;
    patch_url: string | null;
  };
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  // closed_by: User;
  author_association: string;
}

export interface User {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string | null;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
}

export interface Label {
  id?: number;
  node_id?: string;
  url?: string;
  name?: string;
  description?: string | null;
  color?: string;
  default?: boolean;
}

export interface Milestone {
  url: string;
  html_url: string;
  labels_url: string;
  id: number;
  node_id: string;
  number: number;
  state: string;
  title: string;
  description: string | null;
  creator: User | null;
  open_issues: number;
  closed_issues: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  due_on: string | null;
}

export interface Comment {
  author_association: string;
  body: string;
  created_at: string;
  html_url: string;
  id: number;
  issue_url: string;
  node_id: string;
  performed_via_github_app: null;
  reactions: {
    '+1': number;
    '-1': number;
    confused: number;
    eyes: number;
    heart: number;
    hooray: number;
    laugh: number;
    rocket: number;
    total_count: number;
    url: string;
  };
  updated_at: string;
  url: string;
  user: User;
}

export interface GithubPayload extends WebhookPayload {
  issue?: Issue;
  comment?: Comment | undefined;
}
