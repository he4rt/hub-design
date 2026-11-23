import type { MockDb } from '@/mocks/db'
import { first, insert, update } from './connection'

/**
 * Writes a whole prototype state (the `MockDb` of src/mocks/db.ts) into the relational tables.
 * Used by the seeder and after every action; the order follows the foreign keys. Sessions, pending
 * social logins and computed values (completeness, achievements, journey) are not part of it.
 */
const BCRYPT = /^\$2[aby]\$/

export function writeState(state: MockDb) {
  for (const user of state.users) {
    const password = state.passwords[user.id]
    insert('users', {
      id: user.id,
      name: user.name,
      email: user.email,
      email_verified_at: user.emailVerifiedAt,
      // A bcrypt hash is kept; a plain password (the seed's, or one an action just set) is hashed.
      password: !password ? null : BCRYPT.test(password) ? password : Bun.password.hashSync(password, { algorithm: 'bcrypt', cost: 10 }),
      role: user.role,
      origin: user.origin,
      username: user.username,
      birth_date: user.birthDate,
      usage_notice_accepted_at: user.usageNoticeAcceptedAt,
      onboarding_started_at: user.onboardingStartedAt,
      onboarded_at: user.onboardedAt,
      objective: user.objective,
      starting_point: user.startingPoint,
      situation: user.situation,
      open_to_opportunities: user.openToOpportunities,
      city_name: user.city?.name,
      city_uf: user.city?.uf,
      photo_url: user.photoUrl,
      bio: user.bio,
      portfolio_url: user.portfolioUrl,
      published: user.published,
      profile_completed_at: user.profileCompletedAt,
      profile_reminder_dismissals: user.profileReminder.dismissals,
      profile_reminder_hidden_until: user.profileReminder.hiddenUntil,
      created_at: user.createdAt,
      updated_at: user.createdAt,
    })
    user.areas.forEach((area, position) => insert('user_areas', { user_id: user.id, area, position }))
    user.languages.forEach((language, position) => insert('user_languages', { user_id: user.id, language, position }))
    for (const account of user.linkedAccounts) {
      insert('linked_accounts', { user_id: user.id, provider: account.provider, handle: account.handle, linked_at: account.linkedAt })
    }
    const suggestion = user.githubSuggestion
    suggestion?.areas.forEach((value, position) => insert('github_suggestion_items', { user_id: user.id, kind: 'area', value, position }))
    suggestion?.languages.forEach((value, position) =>
      insert('github_suggestion_items', { user_id: user.id, kind: 'language', value, position }),
    )
  }
  for (const revision of state.profileRevisions) {
    insert('profile_revisions', { id: revision.id, user_id: revision.userId, actor_id: revision.actorId, collection: revision.collection, record_id: revision.recordId, operation: revision.operation, snapshot: revision.snapshot, at: revision.at })
  }
  for (const reset of state.passwordResets) {
    insert('password_reset_tokens', { email: reset.email, token: reset.token, created_at: reset.createdAt })
  }
  for (const event of state.events.toReversed()) {
    insert('analytics_events', { event: event.event, props: event.props, at: event.at })
  }

  writeSquads(state)

  for (const profile of state.profiles) {
    const user_id = profile.userId
    insert('member_profiles', {
      user_id,
      readme: profile.readme,
      current_focus: profile.currentFocus,
      cover_image_url: profile.coverImageUrl,
    })
    for (const k of profile.knowledge) {
      insert('declared_knowledge', { id: k.id, user_id, competency: k.competency, level: k.level, declared_at: k.declaredAt, visibility: k.visibility })
    }
    for (const l of profile.learnings) {
      insert('learning_records', {
        id: l.id,
        user_id,
        title: l.title,
        description: l.description,
        origin: l.origin,
        completed_at: l.completedAt,
        visibility: l.visibility,
      })
    }
    for (const e of profile.experiences) {
      insert('experience_records', {
        id: e.id,
        user_id,
        role: e.role,
        organization: e.organization,
        description: e.description,
        started_at: e.startedAt,
        ended_at: e.endedAt,
        visibility: e.visibility,
      })
    }
    for (const a of profile.articles) {
      insert('articles', {
        id: a.id,
        user_id,
        title: a.title,
        summary: a.summary,
        url: a.url,
        source: a.source,
        published_at: a.publishedAt,
        visibility: a.visibility,
      })
    }
    for (const v of profile.evidences) {
      insert('technical_evidences', {
        id: v.id,
        user_id,
        kind: v.kind,
        repository: v.repository,
        ref: v.ref,
        title: v.title,
        context: v.context,
        url: v.url,
        date: v.date,
        project_id: v.projectId,
        visibility: v.visibility,
      })
    }
  }
  for (const choice of state.achievementChoices) insert('achievement_choices', { user_id: choice.userId, key: choice.key })

  for (const c of state.feedCollections) insert('feed_collections', { id: c.id, user_id: c.userId, name: c.name, created_at: c.createdAt })
  for (const p of state.memberProjects) {
    insert('member_projects', {
      id: p.id,
      user_id: p.userId,
      repository_full_name: p.repository.fullName,
      repository_url: p.repository.url,
      pitch: p.pitch,
      read_name: p.read.name,
      read_description: p.read.description,
      read_language: p.read.language,
      read_license: p.read.license,
      read_pushed_at: p.read.pushedAt,
      product_md: p.read.files.product,
      product_metrics_md: p.read.files.metrics,
      readme_md: p.read.files.readme,
      repository_status: p.repositoryStatus,
      read_at: p.readAt,
      created_at: p.createdAt,
    })
    for (const r of p.revisions) {
      insert('member_project_revisions', { project_id: p.id, intent: r.intent, pitch: r.pitch, help_request: r.helpRequest, replaced_at: r.replacedAt })
    }
  }
  for (const post of state.feedPosts) {
    insert('feed_posts', {
      id: post.id,
      user_id: post.userId,
      learned: post.learned,
      applied: post.applied,
      objective_progress: post.objectiveProgress,
      learning_id: post.learningId,
      project_id: post.projectId,
      shared_on_feed: post.sharedOnFeed,
      shown_on_profile: post.shownOnProfile,
      show_reaction_counts: post.showReactionCounts,
      created_at: post.createdAt,
      edited_at: post.editedAt,
      deleted_at: post.deletedAt,
    })
    for (const r of post.revisions) {
      insert('feed_post_revisions', {
        post_id: post.id,
        learned: r.learned,
        applied: r.applied,
        objective_progress: r.objectiveProgress,
        replaced_at: r.replacedAt,
      })
    }
    for (const r of post.reactions) {
      insert('feed_post_reactions', { post_id: post.id, user_id: r.userId, type: r.type, created_at: r.createdAt })
    }
    post.collectionIds.forEach((collection_id, position) =>
      insert('feed_collection_posts', { collection_id, post_id: post.id, position }),
    )
  }
  for (const b of state.feedBookmarks) insert('feed_bookmarks', { user_id: b.userId, post_id: b.postId, created_at: b.createdAt })
  for (const c of state.feedComments) {
    insert('feed_comments', { id: c.id, post_id: c.postId, user_id: c.userId, body: c.body, created_at: c.createdAt, deleted_at: c.deletedAt })
  }
  for (const a of state.feedAnnouncements) {
    insert('feed_announcements', { id: a.id, author_id: a.authorId, title: a.title, body: a.body, created_at: a.createdAt, pinned_at: a.pinnedAt })
  }
  for (const b of state.homeBanners) {
    insert('home_banners', {
      id: b.id,
      kind: b.kind,
      partner: b.partner,
      text: b.text,
      link_label: b.link?.label,
      link_url: b.link?.url,
      active: b.active,
      created_at: b.createdAt,
    })
  }

  for (const d of state.discussions) {
    insert('discussions', {
      id: d.id,
      title: d.title,
      category: d.category,
      author_id: d.authorId,
      body: d.body,
      context_type: d.context?.type,
      context_id: d.context?.id,
      created_at: d.createdAt,
    })
    for (const r of d.replies) {
      insert('discussion_replies', { id: r.id, discussion_id: d.id, author_id: r.authorId, body: r.body, created_at: r.createdAt })
    }
    if (d.solvedReplyId) update('discussions', { id: d.id }, { solved_reply_id: d.solvedReplyId })
  }

  writeValidation(state)
}

function writeSquads(state: MockDb) {
  for (const s of state.squads) {
    insert('squads', {
      id: s.id,
      slug: s.slug,
      name: s.name,
      description: s.description,
      captain_id: s.captainId,
      status: s.status,
      created_at: s.createdAt,
    })
  }
  for (const p of state.projects) {
    insert('projects', {
      id: p.id,
      squad_id: p.squadId,
      slug: p.slug,
      name: p.name,
      goal: p.goal,
      seats: p.seats,
      repository_full_name: p.repository?.fullName,
      repository_url: p.repository?.url,
      board_number: p.board?.number,
      board_url: p.board?.url,
      status: p.status,
      started_at: p.startedAt,
      ended_at: p.endedAt,
    })
    const project_id = p.id
    p.acceptanceCriteria.forEach((c, position) => insert('project_acceptance_criteria', { project_id, id: c.id, text: c.text, position }))
    p.evaluationCriteria.forEach((c, position) =>
      insert('project_evaluation_criteria', { project_id, id: c.id, competency: c.competency, description: c.description, position }),
    )
    p.applicationQuestions.forEach((q, position) =>
      insert('project_application_questions', { project_id, id: q.id, text: q.text, required: q.required, position }),
    )
    p.stack.forEach((technology, position) => insert('project_stack', { project_id, technology, position }))
    for (const level of p.expectedLevel) insert('project_expected_levels', { project_id, level })
  }
  for (const m of state.memberships) {
    insert('squad_memberships', {
      id: m.id,
      squad_id: m.squadId,
      project_id: m.projectId,
      user_id: m.userId,
      responsibilities: m.responsibilities,
      joined_at: m.joinedAt,
      left_at: m.leftAt,
      left_reason: m.leftReason,
      shown_on_profile: m.shownOnProfile,
    })
  }
  for (const t of state.entryTests) {
    insert('entry_tests', {
      user_id: t.userId,
      pull_request_repository: t.pullRequest.repository,
      pull_request_number: t.pullRequest.number,
      pull_request_url: t.pullRequest.url,
      pull_request_title: t.pullRequest.title,
      status: t.status,
      reviewer: t.reviewer,
      opened_at: t.openedAt,
      approved_at: t.approvedAt,
    })
  }
  for (const a of state.applications) {
    insert('squad_applications', {
      id: a.id,
      project_id: a.projectId,
      user_id: a.userId,
      status: a.status,
      notes_strengths: a.notes?.strengths,
      notes_improvements: a.notes?.improvements,
      notes_author_id: a.notes?.authorId,
      notes_updated_at: a.notes?.updatedAt,
      decision_reason: a.decision?.reason,
      decision_next_steps: a.decision?.nextSteps,
      decided_by: a.decision?.decidedBy,
      decided_at: a.decision?.decidedAt,
      github_invite: a.githubInvite,
      created_at: a.createdAt,
    })
    for (const answer of a.answers) {
      insert('squad_application_answers', { application_id: a.id, question_id: answer.questionId, answer: answer.answer })
    }
  }
  for (const b of state.boardItems) {
    insert('board_items', {
      id: b.id,
      project_id: b.projectId,
      issue_number: b.issue.number,
      issue_title: b.issue.title,
      issue_url: b.issue.url,
      status: b.status,
      kind: b.kind,
      criterion_id: b.criterionId,
      updated_at: b.updatedAt,
    })
    for (const user_id of b.assigneeIds) insert('board_item_assignees', { board_item_id: b.id, user_id })
    for (const pr of b.pullRequests) {
      insert('board_item_pull_requests', { board_item_id: b.id, number: pr.number, url: pr.url, merged: pr.merged, author_id: pr.authorId })
      const id = lastId()
      for (const user_id of pr.coAuthorIds) insert('board_item_pull_request_co_authors', { pull_request_id: id, user_id })
      for (const user_id of pr.reviewerIds ?? []) insert('board_item_pull_request_reviewers', { pull_request_id: id, user_id })
    }
  }
  for (const d of state.deliveries) {
    insert('squad_deliveries', {
      id: d.id,
      project_id: d.projectId,
      board_item_id: d.boardItemId,
      title: d.title,
      kind: d.kind,
      criterion_id: d.criterionId,
      status: d.status,
      collaboration: d.collaboration,
      context: d.context,
      returned_reason: d.returnedReason,
      decided_by: d.decidedBy,
      decided_at: d.decidedAt,
      created_at: d.createdAt,
    })
    d.credits.forEach((c, position) => insert('squad_delivery_credits', { delivery_id: d.id, user_id: c.userId, part: c.part, position }))
    for (const e of d.evidence) {
      insert('squad_delivery_evidence', { delivery_id: d.id, kind: e.kind, ref: e.ref, url: e.url, author_id: e.authorId })
    }
    for (const entry of d.decisions ?? []) {
      insert('squad_delivery_decisions', { id: entry.id, delivery_id: d.id, decision: entry.decision, actor_id: entry.actorId, reason: entry.reason, at: entry.at })
    }
  }
  for (const l of state.squadLog) {
    insert('squad_log_entries', {
      id: l.id,
      squad_id: l.squadId,
      project_id: l.projectId,
      kind: l.kind,
      actor_id: l.actorId,
      subject_id: l.subjectId,
      detail: l.detail,
      reason: l.reason,
      at: l.at,
    })
  }
  insert('github_sync_state', { id: 1, last_webhook_at: state.githubSync.lastWebhookAt, last_sweep_at: state.githubSync.lastSweepAt })
  state.githubSync.repositories.forEach((full_name, position) => insert('github_repositories', { full_name, position }))
  for (const d of state.githubSync.divergences) {
    insert('github_sync_divergences', { id: d.id, description: d.description, detected_at: d.detectedAt })
  }
}

function writeValidation(state: MockDb) {
  for (const a of state.validatorApplications) {
    insert('validator_applications', {
      id: a.id,
      user_id: a.userId,
      summary: a.summary,
      job_title: a.jobTitle,
      company: a.company,
      show_employer: a.showEmployer,
      status: a.status,
      decision_reason: a.decision?.reason,
      decided_by: a.decision?.decidedBy,
      decided_at: a.decision?.decidedAt,
      created_at: a.createdAt,
    })
    a.links.forEach((url, position) => insert('validator_application_links', { application_id: a.id, url, position }))
  }
  for (const v of state.validators) {
    insert('validators', {
      user_id: v.userId,
      approved_at: v.approvedAt,
      job_title: v.jobTitle,
      company: v.company,
      show_employer: v.showEmployer,
      suspension_reason: v.suspension?.reason,
      suspended_by: v.suspension?.by,
      suspended_at: v.suspension?.at,
      last_assigned_at: v.lastAssignedAt,
    })
  }
  for (const r of state.validationRequests) {
    insert('validation_requests', {
      id: r.id,
      member_id: r.memberId,
      project_id: r.projectId,
      criterion_id: r.criterionId,
      status: r.status,
      validator_id: r.validatorId,
      assigned_at: r.assignedAt,
      requeued_at: r.requeuedAt,
      created_at: r.createdAt,
    })
    for (const delivery_id of r.deliveryIds) insert('validation_request_deliveries', { request_id: r.id, delivery_id })
    for (const c of r.conflicts) {
      insert('validation_request_conflicts', { request_id: r.id, validator_id: c.validatorId, description: c.description, at: c.at })
    }
  }
  for (const v of state.validations) {
    insert('validations', {
      id: v.id,
      request_id: v.requestId,
      member_id: v.memberId,
      validator_id: v.validatorId,
      validator_name: v.validator.name,
      validator_job_title: v.validator.jobTitle,
      validator_company: v.validator.company,
      project_id: v.projectId,
      competency: v.competency,
      context: v.context,
      contribution: v.contribution,
      conflict_declared: v.conflictOfInterest.declared,
      conflict_description: v.conflictOfInterest.description,
      insufficient_evidence: v.insufficientEvidence,
      status: v.status,
      review_reviewer_id: v.review?.reviewerId,
      review_decision: v.review?.decision,
      review_note: v.review?.note,
      reviewed_at: v.review?.at,
      recorded_at: v.recordedAt,
      published: v.published,
      published_at: v.publishedAt,
    })
    v.strengths.forEach((p, position) =>
      insert('validation_points', { validation_id: v.id, kind: 'strength', position, text: p.text, evidence_ref: p.evidenceRef }),
    )
    v.improvements.forEach((p, position) =>
      insert('validation_points', {
        validation_id: v.id,
        kind: 'improvement',
        position,
        text: p.text,
        evidence_ref: p.evidenceRef,
        suggestion: p.suggestion,
      }),
    )
  }
  // Both point to validations, which point back to requests: set them once every row exists.
  for (const v of state.validations) if (v.supersedesId) update('validations', { id: v.id }, { supersedes_id: v.supersedesId })
  for (const r of state.validationRequests) {
    if (r.supersedesId) update('validation_requests', { id: r.id }, { supersedes_id: r.supersedesId })
  }
  for (const c of state.contestations) {
    insert('contestations', {
      id: c.id,
      validation_id: c.validationId,
      opened_by: c.openedBy,
      reason: c.reason,
      status: c.status,
      decided_by: c.decision?.by,
      decision_note: c.decision?.note,
      decided_at: c.decision?.at,
      created_at: c.createdAt,
    })
  }
}

function lastId(): number {
  return (first<{ id: number }>('SELECT last_insert_rowid() AS id') as { id: number }).id
}
