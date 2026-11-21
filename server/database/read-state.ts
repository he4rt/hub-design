import type {
  Area,
  BoardItem,
  Discussion,
  FeedPost,
  MemberProfile,
  MockDb,
  Project,
  SquadApplication,
  SquadDelivery,
  User,
  Validation,
  ValidationRequest,
} from '@/mocks/db'
import { withCompleteness } from '@/mocks/profile-completeness'
import { all, first } from './connection'

/*
 * Reads the relational tables back into the shapes the screens use (the types of src/mocks/db.ts),
 * like the Laravel Data classes a page receives. Child rows keep their insertion order.
 */

type R = Record<string, any>

function groupBy(rows: R[], key: string): Map<string, R[]> {
  const groups = new Map<string, R[]>()
  for (const row of rows) {
    const k = String(row[key])
    groups.set(k, [...(groups.get(k) ?? []), row])
  }
  return groups
}

const bool = (value: unknown) => value === 1

export function readUsers(where = '', params: Record<string, unknown> = {}): User[] {
  const users = all<R>(`SELECT * FROM users ${where} ORDER BY rowid`, params)
  const areas = groupBy(all('SELECT * FROM user_areas ORDER BY position'), 'user_id')
  const languages = groupBy(all('SELECT * FROM user_languages ORDER BY position'), 'user_id')
  const accounts = groupBy(all('SELECT * FROM linked_accounts ORDER BY rowid'), 'user_id')
  const suggestions = groupBy(all('SELECT * FROM github_suggestion_items ORDER BY position'), 'user_id')
  return users.map((u) => {
    const suggestion = suggestions.get(u.id)
    return withCompleteness({
      id: u.id,
      name: u.name,
      email: u.email,
      emailVerifiedAt: u.email_verified_at,
      role: u.role,
      origin: u.origin,
      linkedAccounts: (accounts.get(u.id) ?? []).map((a) => ({ provider: a.provider, handle: a.handle, linkedAt: a.linked_at })),
      username: u.username,
      birthDate: u.birth_date,
      usageNoticeAcceptedAt: u.usage_notice_accepted_at,
      onboardingStartedAt: u.onboarding_started_at,
      onboardedAt: u.onboarded_at,
      objective: u.objective,
      areas: (areas.get(u.id) ?? []).map((a) => a.area as Area),
      startingPoint: u.starting_point,
      languages: (languages.get(u.id) ?? []).map((l) => l.language),
      situation: u.situation,
      openToOpportunities: bool(u.open_to_opportunities),
      city: u.city_name ? { name: u.city_name, uf: u.city_uf } : null,
      photoUrl: u.photo_url,
      bio: u.bio,
      portfolioUrl: u.portfolio_url,
      published: bool(u.published),
      githubSuggestion: suggestion
        ? {
            areas: suggestion.filter((s) => s.kind === 'area').map((s) => s.value),
            languages: suggestion.filter((s) => s.kind === 'language').map((s) => s.value),
          }
        : null,
      completeness: { percent: 0, missing: [] },
      profileCompletedAt: u.profile_completed_at,
      profileReminder: { dismissals: u.profile_reminder_dismissals, hiddenUntil: u.profile_reminder_hidden_until },
      createdAt: u.created_at,
    })
  })
}

export function readProfiles(where = '', params: Record<string, unknown> = {}): MemberProfile[] {
  const byUser = (table: string) => groupBy(all(`SELECT * FROM ${table} ORDER BY rowid`), 'user_id')
  const knowledge = byUser('declared_knowledge')
  const learnings = byUser('learning_records')
  const experiences = byUser('experience_records')
  const articles = byUser('articles')
  const evidences = byUser('technical_evidences')
  return all<R>(`SELECT * FROM member_profiles ${where} ORDER BY rowid`, params).map((p) => ({
    userId: p.user_id,
    readme: p.readme,
    currentFocus: p.current_focus,
    knowledge: (knowledge.get(p.user_id) ?? []).map((k) => ({
      id: k.id,
      competency: k.competency,
      level: k.level,
      declaredAt: k.declared_at,
      visibility: k.visibility,
    })),
    learnings: (learnings.get(p.user_id) ?? []).map((l) => ({
      id: l.id,
      title: l.title,
      description: l.description,
      origin: l.origin,
      completedAt: l.completed_at,
      visibility: l.visibility,
    })),
    experiences: (experiences.get(p.user_id) ?? []).map((e) => ({
      id: e.id,
      role: e.role,
      organization: e.organization,
      description: e.description,
      startedAt: e.started_at,
      endedAt: e.ended_at,
      visibility: e.visibility,
    })),
    articles: (articles.get(p.user_id) ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      summary: a.summary,
      url: a.url,
      source: a.source,
      publishedAt: a.published_at,
      visibility: a.visibility,
    })),
    evidences: (evidences.get(p.user_id) ?? []).map((v) => ({
      id: v.id,
      kind: v.kind,
      repository: v.repository,
      ref: v.ref,
      title: v.title,
      context: v.context,
      url: v.url,
      date: v.date,
      projectId: v.project_id,
      visibility: v.visibility,
    })),
  }))
}

export function readFeedPosts(where = '', params: Record<string, unknown> = {}): FeedPost[] {
  const reactions = groupBy(all('SELECT * FROM feed_post_reactions ORDER BY rowid'), 'post_id')
  const revisions = groupBy(all('SELECT * FROM feed_post_revisions ORDER BY id'), 'post_id')
  const collections = groupBy(all('SELECT * FROM feed_collection_posts ORDER BY position'), 'post_id')
  return all<R>(`SELECT * FROM feed_posts ${where} ORDER BY rowid`, params).map((p) => ({
    id: p.id,
    userId: p.user_id,
    learned: p.learned,
    applied: p.applied,
    objectiveProgress: p.objective_progress,
    learningId: p.learning_id,
    sharedOnFeed: bool(p.shared_on_feed),
    shownOnProfile: bool(p.shown_on_profile),
    collectionIds: (collections.get(p.id) ?? []).map((c) => c.collection_id),
    reactions: (reactions.get(p.id) ?? []).map((r) => ({ userId: r.user_id, type: r.type, createdAt: r.created_at })),
    showReactionCounts: bool(p.show_reaction_counts),
    createdAt: p.created_at,
    deletedAt: p.deleted_at,
    editedAt: p.edited_at,
    revisions: (revisions.get(p.id) ?? []).map((r) => ({
      learned: r.learned,
      applied: r.applied,
      objectiveProgress: r.objective_progress,
      replacedAt: r.replaced_at,
    })),
  }))
}

function readDiscussions(): Discussion[] {
  const replies = groupBy(all('SELECT * FROM discussion_replies ORDER BY rowid'), 'discussion_id')
  return all<R>('SELECT * FROM discussions ORDER BY rowid').map((d) => ({
    id: d.id,
    title: d.title,
    category: d.category,
    authorId: d.author_id,
    body: d.body,
    createdAt: d.created_at,
    context: d.context_type ? { type: d.context_type, id: d.context_id } : null,
    replies: (replies.get(d.id) ?? []).map((r) => ({ id: r.id, authorId: r.author_id, body: r.body, createdAt: r.created_at })),
    solvedReplyId: d.solved_reply_id,
  }))
}

function readProjects(): Project[] {
  const byProject = (table: string, order = 'position') => groupBy(all(`SELECT * FROM ${table} ORDER BY ${order}`), 'project_id')
  const acceptance = byProject('project_acceptance_criteria')
  const evaluation = byProject('project_evaluation_criteria')
  const questions = byProject('project_application_questions')
  const stack = byProject('project_stack')
  const levels = byProject('project_expected_levels', 'rowid')
  return all<R>('SELECT * FROM projects ORDER BY rowid').map((p) => ({
    id: p.id,
    squadId: p.squad_id,
    slug: p.slug,
    name: p.name,
    goal: p.goal,
    acceptanceCriteria: (acceptance.get(p.id) ?? []).map((c) => ({ id: c.id, text: c.text })),
    evaluationCriteria: (evaluation.get(p.id) ?? []).map((c) => ({ id: c.id, competency: c.competency, description: c.description })),
    stack: (stack.get(p.id) ?? []).map((s) => s.technology),
    expectedLevel: (levels.get(p.id) ?? []).map((l) => l.level),
    seats: p.seats,
    applicationQuestions: (questions.get(p.id) ?? []).map((q) => ({ id: q.id, text: q.text, required: bool(q.required) })),
    repository: p.repository_full_name ? { fullName: p.repository_full_name, url: p.repository_url } : null,
    board: p.board_number !== null ? { number: p.board_number, url: p.board_url } : null,
    status: p.status,
    startedAt: p.started_at,
    endedAt: p.ended_at,
  }))
}

function readApplications(): SquadApplication[] {
  const answers = groupBy(all('SELECT * FROM squad_application_answers ORDER BY rowid'), 'application_id')
  return all<R>('SELECT * FROM squad_applications ORDER BY rowid').map((a) => ({
    id: a.id,
    projectId: a.project_id,
    userId: a.user_id,
    answers: (answers.get(a.id) ?? []).map((x) => ({ questionId: x.question_id, answer: x.answer })),
    status: a.status,
    notes: a.notes_author_id
      ? { strengths: a.notes_strengths, improvements: a.notes_improvements, authorId: a.notes_author_id, updatedAt: a.notes_updated_at }
      : null,
    decision: a.decided_by
      ? { reason: a.decision_reason, nextSteps: a.decision_next_steps, decidedBy: a.decided_by, decidedAt: a.decided_at }
      : null,
    githubInvite: a.github_invite,
    createdAt: a.created_at,
  }))
}

function readBoardItems(): BoardItem[] {
  const assignees = groupBy(all('SELECT * FROM board_item_assignees ORDER BY rowid'), 'board_item_id')
  const coAuthors = groupBy(all('SELECT * FROM board_item_pull_request_co_authors ORDER BY rowid'), 'pull_request_id')
  const pullRequests = groupBy(all('SELECT * FROM board_item_pull_requests ORDER BY id'), 'board_item_id')
  return all<R>('SELECT * FROM board_items ORDER BY rowid').map((b) => ({
    id: b.id,
    projectId: b.project_id,
    issue: { number: b.issue_number, title: b.issue_title, url: b.issue_url },
    status: b.status,
    kind: b.kind,
    criterionId: b.criterion_id,
    assigneeIds: (assignees.get(b.id) ?? []).map((a) => a.user_id),
    pullRequests: (pullRequests.get(b.id) ?? []).map((pr) => ({
      number: pr.number,
      url: pr.url,
      merged: bool(pr.merged),
      authorId: pr.author_id,
      coAuthorIds: (coAuthors.get(String(pr.id)) ?? []).map((c) => c.user_id),
    })),
    updatedAt: b.updated_at,
  }))
}

function readDeliveries(): SquadDelivery[] {
  const credits = groupBy(all('SELECT * FROM squad_delivery_credits ORDER BY position'), 'delivery_id')
  const evidence = groupBy(all('SELECT * FROM squad_delivery_evidence ORDER BY id'), 'delivery_id')
  return all<R>('SELECT * FROM squad_deliveries ORDER BY rowid').map((d) => ({
    id: d.id,
    projectId: d.project_id,
    boardItemId: d.board_item_id,
    title: d.title,
    kind: d.kind,
    criterionId: d.criterion_id,
    status: d.status,
    collaboration: d.collaboration,
    credits: (credits.get(d.id) ?? []).map((c) => ({ userId: c.user_id, part: c.part })),
    context: d.context,
    evidence: (evidence.get(d.id) ?? []).map((e) => ({ kind: e.kind, ref: e.ref, url: e.url, authorId: e.author_id })),
    returnedReason: d.returned_reason,
    decidedBy: d.decided_by,
    decidedAt: d.decided_at,
    createdAt: d.created_at,
  }))
}

function readValidationRequests(): ValidationRequest[] {
  const deliveries = groupBy(all('SELECT * FROM validation_request_deliveries ORDER BY rowid'), 'request_id')
  const conflicts = groupBy(all('SELECT * FROM validation_request_conflicts ORDER BY id'), 'request_id')
  return all<R>('SELECT * FROM validation_requests ORDER BY rowid').map((r) => ({
    id: r.id,
    memberId: r.member_id,
    projectId: r.project_id,
    deliveryIds: (deliveries.get(r.id) ?? []).map((d) => d.delivery_id),
    criterionId: r.criterion_id,
    status: r.status,
    validatorId: r.validator_id,
    assignedAt: r.assigned_at,
    conflicts: (conflicts.get(r.id) ?? []).map((c) => ({ validatorId: c.validator_id, description: c.description, at: c.at })),
    requeuedAt: r.requeued_at,
    supersedesId: r.supersedes_id,
    createdAt: r.created_at,
  }))
}

function readValidations(): Validation[] {
  const points = groupBy(all('SELECT * FROM validation_points ORDER BY position'), 'validation_id')
  return all<R>('SELECT * FROM validations ORDER BY rowid').map((v) => {
    const own = points.get(v.id) ?? []
    return {
      id: v.id,
      requestId: v.request_id,
      memberId: v.member_id,
      validatorId: v.validator_id,
      validator: { name: v.validator_name, jobTitle: v.validator_job_title, company: v.validator_company },
      projectId: v.project_id,
      competency: v.competency,
      context: v.context,
      contribution: v.contribution,
      strengths: own.filter((p) => p.kind === 'strength').map((p) => ({ text: p.text, evidenceRef: p.evidence_ref })),
      improvements: own
        .filter((p) => p.kind === 'improvement')
        .map((p) => ({ text: p.text, evidenceRef: p.evidence_ref, suggestion: p.suggestion })),
      conflictOfInterest: { declared: bool(v.conflict_declared), description: v.conflict_description },
      insufficientEvidence: bool(v.insufficient_evidence),
      status: v.status,
      review: v.review_reviewer_id
        ? { reviewerId: v.review_reviewer_id, decision: v.review_decision, note: v.review_note, at: v.reviewed_at }
        : null,
      recordedAt: v.recorded_at,
      published: bool(v.published),
      publishedAt: v.published_at,
      supersedesId: v.supersedes_id,
    }
  })
}

/**
 * The whole model as one `MockDb`. Password hashes are read apart (server/actions.ts), and
 * `session`, `adminSession` and the pending social logins come from the request's cookies.
 */
export function readState(): MockDb {
  const sync = first<R>('SELECT * FROM github_sync_state WHERE id = 1')
  return {
    users: readUsers(),
    passwords: {},
    passwordResets: all<R>('SELECT * FROM password_reset_tokens ORDER BY rowid').map((r) => ({
      email: r.email,
      token: r.token,
      createdAt: r.created_at,
    })),
    pendingSocialSignUp: null,
    pendingSocialLink: null,
    session: null,
    adminSession: null,
    feedPosts: readFeedPosts(),
    feedCollections: all<R>('SELECT * FROM feed_collections ORDER BY rowid').map((c) => ({
      id: c.id,
      userId: c.user_id,
      name: c.name,
      createdAt: c.created_at,
    })),
    feedBookmarks: all<R>('SELECT * FROM feed_bookmarks ORDER BY rowid').map((b) => ({
      userId: b.user_id,
      postId: b.post_id,
      createdAt: b.created_at,
    })),
    feedAnnouncements: all<R>('SELECT * FROM feed_announcements ORDER BY rowid').map((a) => ({
      id: a.id,
      authorId: a.author_id,
      title: a.title,
      body: a.body,
      createdAt: a.created_at,
      pinnedAt: a.pinned_at,
    })),
    homeBanners: all<R>('SELECT * FROM home_banners ORDER BY rowid').map((b) => ({
      id: b.id,
      kind: b.kind,
      partner: b.partner,
      text: b.text,
      link: b.link_url ? { label: b.link_label, url: b.link_url } : null,
      active: bool(b.active),
      createdAt: b.created_at,
    })),
    events: all<R>('SELECT * FROM analytics_events ORDER BY id DESC').map((e) => ({ event: e.event, props: JSON.parse(e.props), at: e.at })),
    profiles: readProfiles(),
    achievementChoices: all<R>('SELECT * FROM achievement_choices ORDER BY rowid').map((c) => ({ userId: c.user_id, key: c.key })),
    discussions: readDiscussions(),
    squads: all<R>('SELECT * FROM squads ORDER BY rowid').map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      description: s.description,
      captainId: s.captain_id,
      status: s.status,
      createdAt: s.created_at,
    })),
    projects: readProjects(),
    memberships: all<R>('SELECT * FROM squad_memberships ORDER BY rowid').map((m) => ({
      id: m.id,
      squadId: m.squad_id,
      projectId: m.project_id,
      userId: m.user_id,
      responsibilities: m.responsibilities,
      joinedAt: m.joined_at,
      leftAt: m.left_at,
      leftReason: m.left_reason,
      shownOnProfile: bool(m.shown_on_profile),
    })),
    entryTests: all<R>('SELECT * FROM entry_tests ORDER BY rowid').map((t) => ({
      userId: t.user_id,
      pullRequest: {
        repository: t.pull_request_repository,
        number: t.pull_request_number,
        url: t.pull_request_url,
        title: t.pull_request_title,
      },
      status: t.status,
      reviewer: t.reviewer,
      openedAt: t.opened_at,
      approvedAt: t.approved_at,
    })),
    applications: readApplications(),
    boardItems: readBoardItems(),
    deliveries: readDeliveries(),
    squadLog: all<R>('SELECT * FROM squad_log_entries ORDER BY rowid').map((l) => ({
      id: l.id,
      squadId: l.squad_id,
      projectId: l.project_id,
      kind: l.kind,
      actorId: l.actor_id,
      subjectId: l.subject_id,
      detail: l.detail,
      reason: l.reason,
      at: l.at,
    })),
    githubSync: {
      lastWebhookAt: sync?.last_webhook_at ?? null,
      lastSweepAt: sync?.last_sweep_at ?? null,
      divergences: all<R>('SELECT * FROM github_sync_divergences ORDER BY rowid').map((d) => ({
        id: d.id,
        description: d.description,
        detectedAt: d.detected_at,
      })),
    },
    validatorApplications: (() => {
      const links = groupBy(all('SELECT * FROM validator_application_links ORDER BY position'), 'application_id')
      return all<R>('SELECT * FROM validator_applications ORDER BY rowid').map((a) => ({
        id: a.id,
        userId: a.user_id,
        summary: a.summary,
        links: (links.get(a.id) ?? []).map((l) => l.url),
        jobTitle: a.job_title,
        company: a.company,
        showEmployer: bool(a.show_employer),
        status: a.status,
        decision: a.decided_by ? { reason: a.decision_reason, decidedBy: a.decided_by, decidedAt: a.decided_at } : null,
        createdAt: a.created_at,
      }))
    })(),
    validators: all<R>('SELECT * FROM validators ORDER BY rowid').map((v) => ({
      userId: v.user_id,
      approvedAt: v.approved_at,
      jobTitle: v.job_title,
      company: v.company,
      showEmployer: bool(v.show_employer),
      suspension: v.suspended_by ? { reason: v.suspension_reason, by: v.suspended_by, at: v.suspended_at } : null,
      lastAssignedAt: v.last_assigned_at,
    })),
    validationRequests: readValidationRequests(),
    validations: readValidations(),
    contestations: all<R>('SELECT * FROM contestations ORDER BY rowid').map((c) => ({
      id: c.id,
      validationId: c.validation_id,
      openedBy: c.opened_by,
      reason: c.reason,
      status: c.status,
      decision: c.decided_by ? { by: c.decided_by, note: c.decision_note, at: c.decided_at } : null,
      createdAt: c.created_at,
    })),
  }
}
