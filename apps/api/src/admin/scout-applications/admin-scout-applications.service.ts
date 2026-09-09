import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { NotificationsService } from '../../notifications/notifications.service';

export interface AdminScoutApplicationListItem {
  id: string;
  user_id: string;
  user_display_name: string | null;
  full_name: string | null;
  status: string;
  applied_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  platforms: { platform: string; handle: string }[];
  other_platform: string | null;
  other_handle: string | null;
  motivation: string | null;
  can_commit: boolean | null;
  commitment_note: string | null;
}

interface ListFilters {
  status?: string;
}

const ACTIONABLE_STATUSES = ['pending'];

// Scout Applications queue (docs/database-schema.md's Careers / Scout
// program section, Part D). Same list/approve/reject shape as Trade Review
// (AdminTradesService) - a single conditional UPDATE both performs the
// transition and guards against a double-click/double-review race.
@Injectable()
export class AdminScoutApplicationsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async list(filters: ListFilters): Promise<AdminScoutApplicationListItem[]> {
    const client = this.supabaseService.getClient();

    let query = client
      .from('scout_applications')
      .select(
        'id, user_id, full_name, status, applied_at, reviewed_at, rejection_reason, platforms, other_platform, other_handle, motivation, can_commit, commitment_note, ' +
          'users!scout_applications_user_id_fkey(display_name)',
      )
      .order('applied_at', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as unknown as Record<string, unknown>[];

    return rows.map((row) => {
      const user = row.users as { display_name: string | null } | null;
      return {
        id: row.id as string,
        user_id: row.user_id as string,
        user_display_name: user?.display_name ?? null,
        full_name: row.full_name as string | null,
        status: row.status as string,
        applied_at: row.applied_at as string,
        reviewed_at: row.reviewed_at as string | null,
        rejection_reason: row.rejection_reason as string | null,
        platforms:
          (row.platforms as { platform: string; handle: string }[]) ?? [],
        other_platform: row.other_platform as string | null,
        other_handle: row.other_handle as string | null,
        motivation: row.motivation as string | null,
        can_commit: row.can_commit as boolean | null,
        commitment_note: row.commitment_note as string | null,
      };
    });
  }

  async detail(applicationId: string): Promise<AdminScoutApplicationListItem> {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('scout_applications')
      .select(
        'id, user_id, full_name, status, applied_at, reviewed_at, rejection_reason, platforms, other_platform, other_handle, motivation, can_commit, commitment_note, ' +
          'users!scout_applications_user_id_fkey(display_name)',
      )
      .eq('id', applicationId)
      .maybeSingle<Record<string, unknown>>();

    if (error || !data) {
      throw new NotFoundException('Application not found.');
    }

    const user = data.users as { display_name: string | null } | null;
    return {
      id: data.id as string,
      user_id: data.user_id as string,
      user_display_name: user?.display_name ?? null,
      full_name: data.full_name as string | null,
      status: data.status as string,
      applied_at: data.applied_at as string,
      reviewed_at: data.reviewed_at as string | null,
      rejection_reason: data.rejection_reason as string | null,
      platforms:
        (data.platforms as { platform: string; handle: string }[]) ?? [],
      other_platform: data.other_platform as string | null,
      other_handle: data.other_handle as string | null,
      motivation: data.motivation as string | null,
      can_commit: data.can_commit as boolean | null,
      commitment_note: data.commitment_note as string | null,
    };
  }

  async approve(adminId: string, applicationId: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('scout_applications')
      .update({
        status: 'approved',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .in('status', ACTIONABLE_STATUSES)
      .select('id, user_id')
      .maybeSingle<{ id: string; user_id: string }>();

    if (error) throw new Error(error.message);
    if (!data) {
      throw new ConflictException(
        'This application has already been resolved or does not exist.',
      );
    }

    await this.logAction(
      client,
      adminId,
      applicationId,
      'scout_application_approved',
    );
    await this.notify(
      client,
      data.user_id,
      'Scout application approved',
      "You're approved as a Veyro Scout! Head to your dashboard to start submitting links.",
    );

    try {
      const emailByUserId = await this.supabaseService.getUserEmailsByIds([
        data.user_id,
      ]);
      const email = emailByUserId.get(data.user_id);
      const { data: profile } = await client
        .from('users')
        .select('display_name')
        .eq('id', data.user_id)
        .maybeSingle();
      if (email) {
        await this.notificationsService.sendScoutApplicationApprovedEmail({
          email,
          name: (profile?.display_name as string | null) ?? 'there',
        });
      }
    } catch {
      // The approval already succeeded; a failed email is non-critical.
    }

    return { id: data.id, status: 'approved' };
  }

  async reject(adminId: string, applicationId: string, reason: string) {
    const trimmedReason = reason?.trim();
    if (!trimmedReason) {
      throw new BadRequestException('A rejection reason is required.');
    }

    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('scout_applications')
      .update({
        status: 'rejected',
        rejection_reason: trimmedReason,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .in('status', ACTIONABLE_STATUSES)
      .select('id, user_id')
      .maybeSingle<{ id: string; user_id: string }>();

    if (error) throw new Error(error.message);
    if (!data) {
      throw new ConflictException(
        'This application has already been resolved or does not exist.',
      );
    }

    await this.logAction(
      client,
      adminId,
      applicationId,
      'scout_application_rejected',
      trimmedReason,
    );
    await this.notify(
      client,
      data.user_id,
      'Scout application rejected',
      `Your Scout application was not approved: ${trimmedReason}`,
    );

    return { id: data.id, status: 'rejected' };
  }

  private async notify(
    client: ReturnType<SupabaseService['getClient']>,
    userId: string,
    title: string,
    body: string,
  ): Promise<void> {
    await client.from('notifications').insert({
      user_id: userId,
      category: 'account',
      title,
      body,
    });
  }

  private async logAction(
    client: ReturnType<SupabaseService['getClient']>,
    adminId: string,
    targetId: string,
    actionType: string,
    notes?: string,
  ): Promise<void> {
    await client.from('admin_actions').insert({
      admin_id: adminId,
      action_type: actionType,
      target_id: targetId,
      notes: notes ?? null,
    });
  }
}
