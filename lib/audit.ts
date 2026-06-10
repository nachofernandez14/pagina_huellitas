import { createAdminClient } from '@/lib/supabase/admin';

interface AuditEntry {
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
}

export async function auditLog(entry: AuditEntry): Promise<void> {
  const timestamp = new Date().toISOString();
  const logEntry = { ...entry, timestamp };

  console.log('[audit]', JSON.stringify(logEntry));

  try {
    const admin = createAdminClient();
    await admin.from('audit_log').insert({
      user_id: entry.user_id,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      details: entry.details ? JSON.stringify(entry.details) : null,
    });
  } catch {
    // audit_log table might not exist yet — log to console is sufficient
  }
}