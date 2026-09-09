import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { NotificationsService } from '../../notifications/notifications.service';

export interface AdminSupportThreadListItem {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  profile_image_url: string | null;
  category: string;
  subject: string;
  status: string;
  has_unread: boolean;
  last_message_body: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminSupportMessage {
  id: string;
  thread_id: string;
  user_id: string;
  sender: 'user' | 'admin';
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface AdminSupportThreadDetail {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  profile_image_url: string | null;
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
  unread?: boolean;
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
      .select('id, user_id, category, subject, status, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.category) query = query.eq('category', filters.category);

    const { data: threadRows, error } = await query;
    if (error) throw new Error(error.message);

    let threads = (threadRows ?? []) as Record<string, unknown>[];
    if (threads.length === 0) return [];

    const ticketIds = threads.map((row) => row.id as string);
    const userIds = [...new Set(threads.map((row) => row.user_id as string))];

    const [{ data: userRows }, emailByUserId, messageInfoByTicketId] =
      await Promise.all([
        client
          .from('users')
          .select('id, display_name, profile_image_url')
          .in('id', userIds),
        this.supabaseService.getUserEmailsByIds(userIds),
        this.messageInfoByTicketId(client, ticketIds),
      ]);

    const userRowById = new Map(
      (
        (userRows ?? []) as {
          id: string;
          display_name: string | null;
          profile_image_url: string | null;
        }[]
      ).map((row) => [row.id, row]),
    );

    if (filters.unread) {
      threads = threads.filter(
        (row) => messageInfoByTicketId.get(row.id as string)?.hasUnread,
      );
    }

    return threads.map((row) => {
      const ticketId = row.id as string;
      const userId = row.user_id as string;
      const messageInfo = messageInfoByTicketId.get(ticketId);
      const userRow = userRowById.get(userId);
      return {
        id: ticketId,
        user_id: userId,
        display_name: userRow?.display_name ?? null,
        email: emailByUserId.get(userId) ?? null,
        profile_image_url: userRow?.profile_image_url ?? null,
        category: row.category as string,
        subject: row.subject as string,
        status: row.status as string,
        has_unread: messageInfo?.hasUnread ?? false,
        last_message_body: messageInfo?.lastBody ?? null,
        last_message_at: messageInfo?.lastCreatedAt ?? null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
      };
    });
  }

  // One query for the latest message and unread state per ticket rather
  // than N queries, support_messages has an index on (thread_id,
  // created_at) so this stays cheap even as the message table grows.
  private async messageInfoByTicketId(
    client: ReturnType<SupabaseService['getClient']>,
    ticketIds: string[],
  ): Promise<
    Map<
      string,
      {
        lastBody: string;
        lastCreatedAt: string;
        hasUnread: boolean;
      }
    >
  > {
    const { data, error } = await client
      .from('support_messages')
      .select('thread_id, sender, body, read_at, created_at')
      .in('thread_id', ticketIds)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const result = new Map<
      string,
      { lastBody: string; lastCreatedAt: string; hasUnread: boolean }
    >();
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      const ticketId = row.thread_id as string;
      const existing = result.get(ticketId);
      const isUnreadUserMessage = row.sender === 'user' && row.read_at === null;

      if (!existing) {
        result.set(ticketId, {
          lastBody: row.body as string,
          lastCreatedAt: row.created_at as string,
          hasUnread: isUnreadUserMessage,
        });
      } else if (isUnreadUserMessage) {
        existing.hasUnread = true;
      }
    }
    return result;
  }

  async detail(ticketId: string): Promise<AdminSupportThreadDetail> {
    const client = this.supabaseService.getClient();

    const { data: threadRow, error: threadError } = await client
      .from('support_threads')
      .select('id, user_id, category, subject, status, created_at, updated_at')
      .eq('id', ticketId)
      .maybeSingle();

    if (threadError) throw new Error(threadError.message);
    if (!threadRow) throw new NotFoundException('Support thread not found.');

    const userId = threadRow.user_id as string;

    const { data: messageRows, error: messagesError } = await client
      .from('support_messages')
      .select('id, thread_id, user_id, sender, body, read_at, created_at')
      .eq('thread_id', ticketId)
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
        .select('display_name, profile_image_url')
        .eq('id', userId)
        .maybeSingle(),
      this.supabaseService.getUserEmailsByIds([userId]),
    ]);

    return {
      id: ticketId,
      user_id: userId,
      display_name: (userRow?.display_name as string | null) ?? null,
      email: emailByUserId.get(userId) ?? null,
      profile_image_url: (userRow?.profile_image_url as string | null) ?? null,
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
    ticketId: string,
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
      .eq('id', ticketId)
      .maybeSingle();

    if (!threadRow) throw new NotFoundException('Support thread not found.');

    const userId = threadRow.user_id as string;

    const { data, error } = await client
      .from('support_messages')
      .insert({
        thread_id: ticketId,
        user_id: userId,
        sender: 'admin',
        body: trimmedBody,
      })
      .select('id, thread_id, user_id, sender, body, read_at, created_at')
      .single();

    if (error || !data) {
      throw new BadRequestException('Could not send this reply.');
    }

    await this.logAction(client, adminId, userId, 'support_reply_sent');

    return data;
  }

  async resolve(
    adminId: string,
    ticketId: string,
  ): Promise<{ user_id: string; status: string }> {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('support_threads')
      .update({ status: 'resolved', updated_at: new Date().toISOString() })
      .eq('id', ticketId)
      .select('user_id, status, category')
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundException('Support thread not found.');

    const userId = data.user_id as string;

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
