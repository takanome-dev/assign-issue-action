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
  [key: string]: any;
  number: number;
  html_url?: string;
  body?: string;
}

export interface Comment {
  [key: string]: any;
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
  user: {
    avatar_url: string;
    events_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    gravatar_id: string;
    html_url: string;
    id: number;
    login: string;
    node_id: string;
    organizations_url: string;
    received_events_url: string;
    repos_url: string;
    site_admin: boolean;
    starred_url: string;
    subscriptions_url: string;
    type: string;
    url: string;
  };
}

export interface GithubPayload extends WebhookPayload {
  issue?: Issue;
  comment?: Comment | undefined;
}
