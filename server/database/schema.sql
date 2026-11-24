-- He4rt Hub relational model: every type of src/mocks/db.ts as tables, in SQLite.
-- Table and column names follow the Laravel conventions (snake_case, plural tables, *_at timestamps),
-- so each table becomes a migration without renaming. Dates are ISO 8601 text, booleans are 0/1.
-- Ids are text: the seed keeps the prototype ids ('u1', 'p1'); new rows get short random ids.

PRAGMA foreign_keys = ON;

----------------------------------------------------------------------------------------------------
-- Accounts and authentication
----------------------------------------------------------------------------------------------------

-- One account of the shared He4rt identity (Hub, Basement, Job Finder).
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  email_verified_at TEXT,
  -- bcrypt hash; null for accounts created by social login.
  password TEXT,
  -- Staff is admin and super-admin; captain and validator are not roles.
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin', 'super-admin')),
  origin TEXT NOT NULL DEFAULT 'hub' CHECK (origin IN ('hub', 'basement', 'job-finder')),
  username TEXT NOT NULL UNIQUE,
  -- Required at sign-up; nobody under 18 has an account. Never public.
  birth_date TEXT NOT NULL,
  usage_notice_accepted_at TEXT,
  onboarding_started_at TEXT,
  onboarded_at TEXT,
  objective TEXT CHECK (objective IN ('learn', 'get-job', 'grow')),
  -- Private: only the member sees it.
  starting_point TEXT CHECK (starting_point IN ('beginner', 'junior', 'mid', 'senior')),
  situation TEXT CHECK (situation IN ('working', 'seeking', 'studying')),
  -- Only the administration sees it.
  open_to_opportunities INTEGER NOT NULL DEFAULT 0 CHECK (open_to_opportunities IN (0, 1)),
  city_name TEXT,
  city_uf TEXT,
  photo_url TEXT,
  bio TEXT NOT NULL DEFAULT '',
  portfolio_url TEXT NOT NULL DEFAULT '',
  -- Profiles are born private.
  published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0, 1)),
  -- First time the profile completeness reached 100%. The percent itself is computed, not stored.
  profile_completed_at TEXT,
  profile_reminder_dismissals INTEGER NOT NULL DEFAULT 0,
  profile_reminder_hidden_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK ((city_name IS NULL) = (city_uf IS NULL))
);

CREATE TABLE user_areas (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  area TEXT NOT NULL CHECK (area IN ('front-end', 'back-end', 'full-stack', 'mobile', 'qa', 'devops', 'data-ai', 'cybersec')),
  position INTEGER NOT NULL,
  PRIMARY KEY (user_id, area)
);

CREATE TABLE user_languages (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  position INTEGER NOT NULL,
  PRIMARY KEY (user_id, language)
);

CREATE TABLE user_spoken_languages (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('basic', 'intermediate', 'advanced', 'fluent', 'native')),
  position INTEGER NOT NULL,
  PRIMARY KEY (user_id, language)
);

-- Discord, GitHub and Google sign in; LinkedIn only links. One account per provider and handle.
CREATE TABLE linked_accounts (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('discord', 'github', 'google', 'linkedin')),
  handle TEXT NOT NULL,
  linked_at TEXT NOT NULL,
  PRIMARY KEY (user_id, provider),
  UNIQUE (provider, handle)
);

-- Areas and languages suggested from the member's GitHub repositories, waiting for confirmation.
CREATE TABLE github_suggestion_items (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('area', 'language')),
  value TEXT NOT NULL,
  position INTEGER NOT NULL,
  PRIMARY KEY (user_id, kind, value)
);

-- Same table as Laravel's password broker.
CREATE TABLE password_reset_tokens (
  email TEXT PRIMARY KEY COLLATE NOCASE,
  token TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Server-side sessions. The member (/app) and the admin (/admin) are separate guards with separate
-- cookies, so signing in to one never signs in to the other. A guest session has no user.
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  guard TEXT NOT NULL CHECK (guard IN ('web', 'admin')),
  user_id TEXT REFERENCES users (id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL,
  last_activity_at TEXT NOT NULL
);
CREATE INDEX sessions_user_id_index ON sessions (user_id);

-- Social login waiting in the session: a new e-mail goes to the sign-up form ('sign-up'); an
-- account without a confirmed e-mail is linked after a password login ('link').
CREATE TABLE pending_social_identities (
  session_id TEXT PRIMARY KEY REFERENCES sessions (id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('sign-up', 'link')),
  provider TEXT NOT NULL CHECK (provider IN ('discord', 'github', 'google')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  email_verified INTEGER NOT NULL CHECK (email_verified IN (0, 1)),
  handle TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- What PostHog would receive. The payload is free-form by nature, so it stays JSON.
CREATE TABLE analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,
  props TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(props)),
  at TEXT NOT NULL
);

----------------------------------------------------------------------------------------------------
-- Profile and trajectory (/members/:username). Identity lives only in users.
----------------------------------------------------------------------------------------------------

CREATE TABLE member_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  -- Picture on top of the profile header, as a data URL; NULL shows the ink band.
  cover_image_url TEXT
);

CREATE TABLE declared_knowledge (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  competency TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('basic', 'intermediate', 'advanced')),
  declared_at TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('private', 'community', 'public'))
);
CREATE INDEX declared_knowledge_user_id_index ON declared_knowledge (user_id);

CREATE TABLE learning_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  origin TEXT NOT NULL CHECK (origin IN ('member', 'basement')),
  completed_at TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('private', 'community', 'public'))
);
CREATE INDEX learning_records_user_id_index ON learning_records (user_id);

CREATE TABLE experience_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  organization TEXT NOT NULL,
  description TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  visibility TEXT NOT NULL CHECK (visibility IN ('private', 'community', 'public'))
);
CREATE INDEX experience_records_user_id_index ON experience_records (user_id);

-- Article written outside the Hub, such as on dev.to.
CREATE TABLE articles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  url TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('dev.to')),
  published_at TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('private', 'community', 'public'))
);
CREATE INDEX articles_user_id_index ON articles (user_id);

-- Commit, pull request or repository the member picked; project_id is a squad project, if any.
CREATE TABLE technical_evidences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('commit', 'pull-request', 'repository')),
  repository TEXT NOT NULL,
  ref TEXT,
  title TEXT NOT NULL,
  context TEXT NOT NULL,
  url TEXT NOT NULL,
  date TEXT NOT NULL,
  project_id TEXT REFERENCES projects (id),
  visibility TEXT NOT NULL CHECK (visibility IN ('private', 'community', 'public'))
);
CREATE INDEX technical_evidences_user_id_index ON technical_evidences (user_id);

-- Achievements are computed from the facts (src/mocks/achievements.ts), never stored. Only the
-- member's choice to show one on the profile is.
CREATE TABLE achievement_choices (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  PRIMARY KEY (user_id, key)
);

----------------------------------------------------------------------------------------------------
-- Feed: the learning diary
----------------------------------------------------------------------------------------------------

-- A member's own project, shared in the Feed from one of their GitHub repositories (not a squad project).
-- The read_* columns are the last read of the He4rt GitHub App; they stay when the repository disappears.
CREATE TABLE member_projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  repository_full_name TEXT NOT NULL,
  repository_url TEXT NOT NULL,
  pitch TEXT NOT NULL,
  read_name TEXT NOT NULL,
  read_description TEXT,
  read_language TEXT,
  read_license TEXT,
  read_pushed_at TEXT NOT NULL,
  product_md TEXT,
  product_metrics_md TEXT,
  readme_md TEXT,
  repository_status TEXT NOT NULL DEFAULT 'available' CHECK (repository_status IN ('available', 'unavailable')),
  read_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
-- One project per repository: sharing the same link again leads to the existing one.
CREATE UNIQUE INDEX member_projects_repository_unique ON member_projects (repository_full_name COLLATE NOCASE);

CREATE TABLE member_project_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES member_projects (id) ON DELETE CASCADE,
  intent TEXT NOT NULL CHECK (intent IN ('showcase', 'help')),
  pitch TEXT NOT NULL,
  help_request TEXT,
  replaced_at TEXT NOT NULL
);

CREATE TABLE feed_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id),
  learned TEXT NOT NULL,
  applied TEXT NOT NULL,
  objective_progress TEXT NOT NULL CHECK (objective_progress IN ('none', 'little', 'a-lot', 'very-much')),
  learning_id TEXT REFERENCES learning_records (id) ON DELETE SET NULL,
  -- Set when the post shares a member project; its text lives in the project and learned/applied stay empty.
  project_id TEXT REFERENCES member_projects (id),
  shared_on_feed INTEGER NOT NULL DEFAULT 1 CHECK (shared_on_feed IN (0, 1)),
  shown_on_profile INTEGER NOT NULL DEFAULT 0 CHECK (shown_on_profile IN (0, 1)),
  show_reaction_counts INTEGER NOT NULL DEFAULT 0 CHECK (show_reaction_counts IN (0, 1)),
  created_at TEXT NOT NULL,
  edited_at TEXT,
  -- Soft delete: gone for every member, kept for moderation and audit.
  deleted_at TEXT,
  -- Removed by the staff: the author sees the reason; who removed it stays with the administration.
  removal_reason TEXT,
  removed_by TEXT REFERENCES users (id),
  removed_at TEXT
);
CREATE INDEX feed_posts_feed_index ON feed_posts (shared_on_feed, deleted_at, created_at);
CREATE INDEX feed_posts_user_id_index ON feed_posts (user_id, created_at);

-- Earlier versions of a post's text, seen only by moderation.
CREATE TABLE feed_post_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id TEXT NOT NULL REFERENCES feed_posts (id) ON DELETE CASCADE,
  learned TEXT NOT NULL,
  applied TEXT NOT NULL,
  objective_progress TEXT NOT NULL CHECK (objective_progress IN ('none', 'little', 'a-lot', 'very-much')),
  replaced_at TEXT NOT NULL
);
CREATE INDEX feed_post_revisions_post_id_index ON feed_post_revisions (post_id, replaced_at);

-- Learning reactions; a reader marks each type at most once. Never XP, never a ranking.
CREATE TABLE feed_post_reactions (
  post_id TEXT NOT NULL REFERENCES feed_posts (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('helped', 'learning-too', 'want-to-learn', 'inspiring')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (post_id, user_id, type)
);

-- A member's study track ("trilha").
CREATE TABLE feed_collections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX feed_collections_user_name_unique ON feed_collections (user_id, name COLLATE NOCASE);

CREATE TABLE feed_collection_posts (
  collection_id TEXT NOT NULL REFERENCES feed_collections (id) ON DELETE CASCADE,
  post_id TEXT NOT NULL REFERENCES feed_posts (id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  PRIMARY KEY (collection_id, post_id)
);

CREATE TABLE feed_bookmarks (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  post_id TEXT NOT NULL REFERENCES feed_posts (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, post_id)
);

-- Short comments on a post; no replies, no reactions. Soft delete keeps them for moderation.
CREATE TABLE feed_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES feed_posts (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  deleted_at TEXT,
  -- Removed by the staff, like a post.
  removal_reason TEXT,
  removed_by TEXT REFERENCES users (id),
  removed_at TEXT
);
CREATE INDEX feed_comments_post_id_index ON feed_comments (post_id, created_at);

-- Official publication signed by He4rt Developers; the staff writes and pins it.
CREATE TABLE feed_announcements (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES users (id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  pinned_at TEXT
);

CREATE TABLE home_banners (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('notice', 'partner')),
  partner TEXT,
  text TEXT NOT NULL,
  link_label TEXT,
  link_url TEXT,
  active INTEGER NOT NULL CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  CHECK ((kind = 'partner') = (partner IS NOT NULL)),
  CHECK ((link_label IS NULL) = (link_url IS NULL))
);

----------------------------------------------------------------------------------------------------
-- Forum
----------------------------------------------------------------------------------------------------

CREATE TABLE discussions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('question', 'technical', 'learning')),
  author_id TEXT NOT NULL REFERENCES users (id),
  body TEXT NOT NULL,
  -- Polymorphic context, like a Laravel morph: a squad, a project or one of the author's posts.
  context_type TEXT CHECK (context_type IN ('squad', 'project', 'post')),
  context_id TEXT,
  solved_reply_id TEXT REFERENCES discussion_replies (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  CHECK ((context_type IS NULL) = (context_id IS NULL))
);
CREATE INDEX discussions_context_index ON discussions (context_type, context_id);

CREATE TABLE discussion_replies (
  id TEXT PRIMARY KEY,
  discussion_id TEXT NOT NULL REFERENCES discussions (id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users (id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX discussion_replies_discussion_id_index ON discussion_replies (discussion_id, created_at);

----------------------------------------------------------------------------------------------------
-- Squads and projects (docs/squads.md)
----------------------------------------------------------------------------------------------------

-- Never deleted, only inactive. A null captain is a vacancy.
CREATE TABLE squads (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  captain_id TEXT REFERENCES users (id),
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  squad_id TEXT NOT NULL REFERENCES squads (id),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  goal TEXT NOT NULL,
  -- Counts every active member, the captain included.
  seats INTEGER NOT NULL CHECK (seats > 0),
  -- Created by the GitHub App after the project is born in the Hub.
  repository_full_name TEXT,
  repository_url TEXT,
  board_number INTEGER,
  board_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('provisioning', 'active', 'ended')),
  started_at TEXT,
  ended_at TEXT,
  UNIQUE (squad_id, slug)
);
-- At most one project of a squad is not ended.
CREATE UNIQUE INDEX projects_one_open_per_squad ON projects (squad_id) WHERE status <> 'ended';

-- Criteria and questions are numbered per project ('ac1', 'ec1', 'q1'), so their keys include it.
CREATE TABLE project_acceptance_criteria (
  project_id TEXT NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  text TEXT NOT NULL,
  position INTEGER NOT NULL,
  PRIMARY KEY (project_id, id)
);

CREATE TABLE project_evaluation_criteria (
  project_id TEXT NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  competency TEXT NOT NULL,
  description TEXT NOT NULL,
  position INTEGER NOT NULL,
  PRIMARY KEY (project_id, id)
);

CREATE TABLE project_application_questions (
  project_id TEXT NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  text TEXT NOT NULL,
  required INTEGER NOT NULL CHECK (required IN (0, 1)),
  position INTEGER NOT NULL,
  PRIMARY KEY (project_id, id)
);

CREATE TABLE project_stack (
  project_id TEXT NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  technology TEXT NOT NULL,
  position INTEGER NOT NULL,
  PRIMARY KEY (project_id, technology)
);

CREATE TABLE project_expected_levels (
  project_id TEXT NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('beginner', 'junior', 'mid', 'senior')),
  PRIMARY KEY (project_id, level)
);

CREATE TABLE squad_memberships (
  id TEXT PRIMARY KEY,
  squad_id TEXT NOT NULL REFERENCES squads (id),
  project_id TEXT NOT NULL REFERENCES projects (id),
  user_id TEXT NOT NULL REFERENCES users (id),
  responsibilities TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  left_at TEXT,
  left_reason TEXT,
  -- Off when it starts: nothing private is published by itself.
  shown_on_profile INTEGER NOT NULL DEFAULT 0 CHECK (shown_on_profile IN (0, 1))
);
CREATE UNIQUE INDEX squad_memberships_one_active ON squad_memberships (project_id, user_id) WHERE left_at IS NULL;

-- One per member: a pull request to a He4rt repository, merged by the staff.
CREATE TABLE entry_tests (
  user_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  pull_request_repository TEXT NOT NULL,
  pull_request_number INTEGER NOT NULL,
  pull_request_url TEXT NOT NULL,
  pull_request_title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'approved', 'closed')),
  -- GitHub handle of the staff member who merged it.
  reviewer TEXT,
  opened_at TEXT NOT NULL,
  approved_at TEXT
);

CREATE TABLE squad_applications (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects (id),
  user_id TEXT NOT NULL REFERENCES users (id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn')),
  -- Notes seen by the member, the captain and the staff.
  notes_strengths TEXT,
  notes_improvements TEXT,
  notes_author_id TEXT REFERENCES users (id),
  notes_updated_at TEXT,
  decision_reason TEXT,
  decision_next_steps TEXT,
  decided_by TEXT REFERENCES users (id),
  decided_at TEXT,
  github_invite TEXT NOT NULL CHECK (github_invite IN ('not-needed', 'pending', 'accepted')),
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX squad_applications_one_pending ON squad_applications (project_id, user_id) WHERE status = 'pending';

CREATE TABLE squad_application_answers (
  application_id TEXT NOT NULL REFERENCES squad_applications (id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  answer TEXT NOT NULL,
  PRIMARY KEY (application_id, question_id)
);

-- Read-only copy of the project's GitHub board.
CREATE TABLE board_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects (id),
  issue_number INTEGER NOT NULL,
  issue_title TEXT NOT NULL,
  issue_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('backlog', 'ready', 'in-progress', 'in-review', 'done')),
  kind TEXT NOT NULL CHECK (kind IN ('technical', 'non-technical')),
  criterion_id TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id, criterion_id) REFERENCES project_acceptance_criteria (project_id, id)
);

CREATE TABLE board_item_assignees (
  board_item_id TEXT NOT NULL REFERENCES board_items (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users (id),
  PRIMARY KEY (board_item_id, user_id)
);

CREATE TABLE board_item_pull_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_item_id TEXT NOT NULL REFERENCES board_items (id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  url TEXT NOT NULL,
  merged INTEGER NOT NULL CHECK (merged IN (0, 1)),
  author_id TEXT NOT NULL REFERENCES users (id)
);

CREATE TABLE board_item_pull_request_co_authors (
  pull_request_id INTEGER NOT NULL REFERENCES board_item_pull_requests (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users (id),
  PRIMARY KEY (pull_request_id, user_id)
);

CREATE TABLE profile_revisions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id),
  actor_id TEXT NOT NULL REFERENCES users (id),
  collection TEXT NOT NULL CHECK (collection IN ('presentation', 'knowledge', 'learnings', 'experiences', 'articles', 'evidences')),
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('update', 'delete')),
  snapshot TEXT NOT NULL CHECK (json_valid(snapshot)),
  at TEXT NOT NULL
);

CREATE TABLE board_item_pull_request_reviewers (
  pull_request_id INTEGER NOT NULL REFERENCES board_item_pull_requests (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users (id),
  PRIMARY KEY (pull_request_id, user_id)
);

-- A board item the captain checks against the acceptance criteria and credits to who did it.
CREATE TABLE squad_deliveries (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects (id),
  board_item_id TEXT NOT NULL REFERENCES board_items (id),
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('technical', 'non-technical')),
  criterion_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'returned')),
  collaboration TEXT NOT NULL CHECK (collaboration IN ('individual', 'pair', 'group')),
  -- The captain's note; the validator reads it.
  context TEXT NOT NULL DEFAULT '',
  returned_reason TEXT,
  decided_by TEXT REFERENCES users (id),
  decided_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id, criterion_id) REFERENCES project_acceptance_criteria (project_id, id)
);

CREATE TABLE squad_delivery_credits (
  delivery_id TEXT NOT NULL REFERENCES squad_deliveries (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users (id),
  part TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL,
  PRIMARY KEY (delivery_id, user_id)
);

CREATE TABLE squad_delivery_evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  delivery_id TEXT NOT NULL REFERENCES squad_deliveries (id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('commit', 'pull-request', 'review')),
  ref TEXT NOT NULL,
  url TEXT NOT NULL,
  author_id TEXT NOT NULL REFERENCES users (id)
);

CREATE TABLE squad_delivery_decisions (
  id TEXT PRIMARY KEY,
  delivery_id TEXT NOT NULL REFERENCES squad_deliveries (id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('accepted', 'returned')),
  actor_id TEXT NOT NULL REFERENCES users (id),
  reason TEXT NOT NULL,
  at TEXT NOT NULL
);

-- Permanent record of what the squad did, project by project.
CREATE TABLE squad_log_entries (
  id TEXT PRIMARY KEY,
  squad_id TEXT NOT NULL REFERENCES squads (id),
  project_id TEXT REFERENCES projects (id),
  kind TEXT NOT NULL CHECK (kind IN (
    'project-started', 'project-ended', 'member-joined', 'member-left', 'member-removed',
    'member-reassigned', 'captain-changed', 'delivery-accepted'
  )),
  actor_id TEXT NOT NULL REFERENCES users (id),
  subject_id TEXT REFERENCES users (id),
  detail TEXT,
  reason TEXT,
  at TEXT NOT NULL
);
CREATE INDEX squad_log_entries_squad_id_index ON squad_log_entries (squad_id, at);

-- Single-row state of the GitHub App sync.
CREATE TABLE github_sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_webhook_at TEXT,
  last_sweep_at TEXT
);

-- Repositories of the organization, as the GitHub App last saw them.
CREATE TABLE github_repositories (
  full_name TEXT PRIMARY KEY,
  position INTEGER NOT NULL
);

CREATE TABLE github_sync_divergences (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  detected_at TEXT NOT NULL
);

----------------------------------------------------------------------------------------------------
-- Validation (docs/validation.md)
----------------------------------------------------------------------------------------------------

CREATE TABLE validator_applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id),
  summary TEXT NOT NULL,
  job_title TEXT NOT NULL,
  company TEXT NOT NULL,
  show_employer INTEGER NOT NULL CHECK (show_employer IN (0, 1)),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'declined')),
  decision_reason TEXT,
  decided_by TEXT REFERENCES users (id),
  decided_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE validator_application_links (
  application_id TEXT NOT NULL REFERENCES validator_applications (id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INTEGER NOT NULL,
  PRIMARY KEY (application_id, url)
);

CREATE TABLE validators (
  user_id TEXT PRIMARY KEY REFERENCES users (id),
  approved_at TEXT NOT NULL,
  job_title TEXT NOT NULL,
  company TEXT NOT NULL,
  -- The validator agreed to show job title and company on validations.
  show_employer INTEGER NOT NULL CHECK (show_employer IN (0, 1)),
  suspension_reason TEXT,
  suspended_by TEXT REFERENCES users (id),
  suspended_at TEXT,
  last_assigned_at TEXT
);

CREATE TABLE validation_requests (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES users (id),
  project_id TEXT NOT NULL REFERENCES projects (id),
  -- One of the project's evaluation criteria.
  criterion_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'assigned', 'recorded', 'cancelled')),
  validator_id TEXT REFERENCES validators (user_id),
  assigned_at TEXT,
  -- Set when a request goes back to the queue; it then goes to the front.
  requeued_at TEXT,
  -- A correction after a contestation points to the validation it replaces.
  supersedes_id TEXT REFERENCES validations (id),
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id, criterion_id) REFERENCES project_evaluation_criteria (project_id, id)
);
CREATE INDEX validation_requests_queue_index ON validation_requests (status, requeued_at, created_at);

CREATE TABLE validation_request_deliveries (
  request_id TEXT NOT NULL REFERENCES validation_requests (id) ON DELETE CASCADE,
  delivery_id TEXT NOT NULL REFERENCES squad_deliveries (id),
  PRIMARY KEY (request_id, delivery_id)
);

CREATE TABLE validation_request_conflicts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL REFERENCES validation_requests (id) ON DELETE CASCADE,
  validator_id TEXT NOT NULL REFERENCES validators (user_id),
  description TEXT NOT NULL,
  at TEXT NOT NULL
);

-- What a validator saw. Immutable once recorded; a correction is a new record.
CREATE TABLE validations (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES validation_requests (id),
  member_id TEXT NOT NULL REFERENCES users (id),
  validator_id TEXT NOT NULL REFERENCES validators (user_id),
  -- Snapshot at record time; job title and company only when the validator allowed it.
  validator_name TEXT NOT NULL,
  validator_job_title TEXT,
  validator_company TEXT,
  project_id TEXT NOT NULL REFERENCES projects (id),
  competency TEXT NOT NULL,
  context TEXT NOT NULL,
  contribution TEXT NOT NULL,
  conflict_declared INTEGER NOT NULL CHECK (conflict_declared IN (0, 1)),
  conflict_description TEXT NOT NULL DEFAULT '',
  insufficient_evidence INTEGER NOT NULL CHECK (insufficient_evidence IN (0, 1)),
  status TEXT NOT NULL CHECK (status IN ('draft', 'in-review', 'recorded')),
  review_reviewer_id TEXT REFERENCES users (id),
  review_decision TEXT CHECK (review_decision IN ('approved', 'returned')),
  review_note TEXT,
  reviewed_at TEXT,
  recorded_at TEXT,
  published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0, 1)),
  published_at TEXT,
  supersedes_id TEXT REFERENCES validations (id)
);
CREATE INDEX validations_member_id_index ON validations (member_id);

-- Strengths and improvement points, in order. An improvement also has a suggestion.
CREATE TABLE validation_points (
  validation_id TEXT NOT NULL REFERENCES validations (id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('strength', 'improvement')),
  position INTEGER NOT NULL,
  text TEXT NOT NULL,
  evidence_ref TEXT NOT NULL,
  suggestion TEXT,
  PRIMARY KEY (validation_id, kind, position),
  CHECK ((kind = 'improvement') = (suggestion IS NOT NULL))
);

CREATE TABLE contestations (
  id TEXT PRIMARY KEY,
  validation_id TEXT NOT NULL REFERENCES validations (id),
  opened_by TEXT NOT NULL REFERENCES users (id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'upheld', 'corrected')),
  decided_by TEXT REFERENCES users (id),
  decision_note TEXT,
  decided_at TEXT,
  created_at TEXT NOT NULL
);
