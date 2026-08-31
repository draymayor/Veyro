import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { NotificationsService } from '../../notifications/notifications.service';

export interface AdminSupportThreadListItem {
  user_id: string;
  display_name: string | null;
  email: string | null;
  category: string;
  subject: string;
  status: string;
  last_message_body: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminSupportMessage {
  id: string;
  user_id: string;
  sender: 'user' | 'admin';
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface AdminSupportThreadDetail {
  user_id: string;
  display_name: string | null;
  email: string | null;
  category: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
  messages: AdminSupportMessage[];
}

interface ListFilters {
  status?: string;
  category?: string;
}

const VALID_STATUSES = ['open', 'resolved'];
const VALID_CATEGORIES = ['trades', 'wallet', 'account', 'referrals', 'other'];

// Support Inbox (docs/admin-guide.md): the categorized ticket list plus
// per-thread message history, admin replies, and mark-resolved. Every
// query here runs through the service-role client (bypasses RLS), the
// same as every other admin module, admin replies must never be
// insertable through the client-scoped RLS policies (only "insert own as
// user" exists on support_messages), so writing sender = 'admin' from
// this backend is what actually enforces that restriction, not a
// convention the client is trusted to follow.
@Injectable()
export class AdminSupportService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async list(filters: ListFilters): Promise<AdminSupportThreadListItem[]> {
    if (filters.status && !VALID_STATUSES.includes(filters.status)) {
      throw new BadRequestException('Invalid status filter.');
    }
    if (filters.category && !VALID_CATEGORIES.includes(filters.category)) {
      throw new BadRequestException('Invalid category filter.');
    }

    const client = this.supabaseService.getClient();

    let query = client
      .from('support_threads')
      .select('user_id, category, subject, status, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.category) query = query.eq('category', filters.category);

    const { data: threadRows, error } = await query;
    if (error) throw new Error(error.message);

    const threads = (threadRows ?? []) as Record<string, unknown>[];
    if (threads.length === 0) return [];

    const userIds = threads.map((row) => row.user_id as string);

    const [{ data: userRows }, emailByUserId, lastMessageByUserId] =
      await Promise.all([
        client.from('users').select('id, display_name').in('id', userIds),
        this.supabaseService.getUserEmailsByIds(userIds),
        this.lastMessagesByUserId(client, userIds),
      ]);

    const displayNameByUserId = new Map(
      ((userRows ?? []) as { id: string; display_name: string | null }[]).map(
        (row) => [row.id, row.display_name],
      ),
    );

    return threads.map((row) => {
      const userId = row.user_id as string;
      const lastMessage = lastMessageByUserId.get(userId);
      return {
        user_id: userId,
        display_name: displayNameByUserId.get(userId) ?? null,
        email: emailByUserId.get(userId) ?? null,
        category: row.category as string,
        subject: row.subject as string,
        status: row.status as string,
        last_message_body: lastMessage?.body ?? null,
        last_message_at: lastMessage?.created_at ?? null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
      };
    });
  }

  // One query for the latest message per thread rather than N queries,
  // support_messages has an index on (user_id, created_at) so this stays
  // cheap even as the message table grows.
  private async lastMessagesByUserId(
    client: ReturnType<SupabaseService['getClient']>,
    userIds: string[],
  ): Promise<Map<string, { body: string; created_at: string }>> {
    const { data, error } = await client
      .from('support_messages')
      .select('user_id, body, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const result = new Map<string, { body: string; created_at: string }>();
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      const userId = row.user_id as string;
      if (!result.has(userId)) {
        result.set(userId, {
          body: row.body as string,
          created_at: row.created_at as string,
        });
      }
    }
    return result;
  }

  async detail(userId: string): Promise<AdminSupportThreadDetail> {
    const client = this.supabaseService.getClient();

    const { data: threadRow, error: threadError } = await client
      .from('support_threads')
      .select('user_id, category, subject, status, created_at, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (threadError) throw new Error(threadError.message);
    if (!threadRow) throw new NotFoundException('Support thread not found.');

    const { data: messageRows, error: messagesError } = await client
      .from('support_messages')
      .select('id, user_id, sender, body, read_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (messagesError) throw new Error(messagesError.message);

    const messages = (messageRows ?? []) as AdminSupportMessage[];

    // Admin is looking at this thread right now, so any unread user
    // message counts as read the same moment the consumer side marks an
    // admin reply read on open.
    const unreadUserMessageIds = messages
      .filter((m) => m.sender === 'user' && m.read_at === null)
      .map((m) => m.id);

    if (unreadUserMessageIds.length > 0) {
      await client
        .from('support_messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadUserMessageIds);
    }

    const [{ data: userRow }, emailByUserId] = await Promise.all([
      client
        .from('users')
        .select('display_name')
        .eq('id', userId)
        .maybeSingle(),
      this.supabaseService.getUserEmailsByIds([userId]),
    ]);

    return {
      user_id: userId,
      display_name: (userRow?.display_name as string | null) ?? null,
      email: emailByUserId.get(userId) ?? null,
      category: threadRow.category as string,
      subject: threadRow.subject as string,
      status: threadRow.status as string,
      created_at: threadRow.created_at as string,
      updated_at: threadRow.updated_at as string,
      messages,
    };
  }

  async sendMessage(
    adminId: string,
    userId: string,
    body: string,
  ): Promise<AdminSupportMessage> {
    const trimmedBody = body?.trim();
    if (!trimmedBody) {
      throw new BadRequestException('Enter a message before sending.');
    }

    const client = this.supabaseService.getClient();

    const { data: threadRow } = await client
      .from('support_threads')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!threadRow) throw new NotFoundException('Support thread not found.');

    const { data, error } = await client
      .from('support_messages')
      .insert({ user_id: userId, sender: 'admin', body: trimmedBody })
      .select('id, user_id, sender, body, read_at, created_at')
      .single();

    if (error || !data) {
      throw new BadRequestException('Could not send this reply.');
    }

    await this.logAction(client, adminId, userId, 'support_reply_sent');

    return data;
  }

  async resolve(
    adminId: string,
    userId: string,
  ): Promise<{ user_id: string; status: string }> {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('support_threads')
      .update({ status: 'resolved', updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select('user_id, status, category')
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundException('Support thread not found.');

    await this.logAction(client, adminId, userId, 'support_thread_resolved');

    // Support Ticket Resolved email (docs/email-templates.md #15). A
    // failed send is non-critical, the thread is already marked resolved.
    try {
      const [{ data: userRow }, emailByUserId] = await Promise.all([
        client
          .from('users')
          .select('display_name')
          .eq('id', userId)
          .maybeSingle(),
        this.supabaseService.getUserEmailsByIds([userId]),
      ]);
      const email = emailByUserId.get(userId);
      if (email) {
        await this.notificationsService.sendSupportTicketResolvedEmail({
          email,
          name: (userRow?.display_name as string | null) ?? 'there',
          category: data.category as string,
        });
      }
    } catch {
      // Already logged by NotificationsService.send().
    }

    return { user_id: data.user_id as string, status: data.status as string };
  }

  private async logAction(
    client: ReturnType<SupabaseService['getClient']>,
    adminId: string,
    userId: string,
    actionType: string,
  ): Promise<void> {
    await client.from('admin_actions').insert({
      admin_id: adminId,
      action_type: actionType,
      target_id: userId,
    });
  }
}
