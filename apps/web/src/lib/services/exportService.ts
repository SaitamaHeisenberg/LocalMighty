import { browser } from '$app/environment';
import type { SmsMessage, SmsThread } from '$lib/stores/messages';
import { formatPhoneNumber } from '$lib/utils/formatters';

export type ExportFormat = 'txt' | 'csv' | 'json';

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeCSV(str: string): string {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

class ExportService {
  exportConversation(
    messages: SmsMessage[],
    thread: SmsThread,
    format: ExportFormat
  ): void {
    if (!browser) return;

    const contactName = thread.contactName || formatPhoneNumber(thread.address);
    let content: string;
    let filename: string;
    let mimeType: string;

    switch (format) {
      case 'txt':
        content = this.toText(messages, contactName, thread.address);
        filename = `conversation_${contactName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.txt`;
        mimeType = 'text/plain';
        break;

      case 'csv':
        content = this.toCSV(messages, contactName);
        filename = `conversation_${contactName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv`;
        mimeType = 'text/csv';
        break;

      case 'json':
        content = this.toJSON(messages, thread);
        filename = `conversation_${contactName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`;
        mimeType = 'application/json';
        break;

      default:
        return;
    }

    this.download(content, filename, mimeType);
  }

  private toText(messages: SmsMessage[], contactName: string, address: string): string {
    const lines: string[] = [];
    lines.push(`Conversation avec ${contactName}`);
    lines.push(`Numero: ${formatPhoneNumber(address)}`);
    lines.push(`Exporte le: ${formatDate(Date.now())}`);
    lines.push(`Total: ${messages.length} messages`);
    lines.push('');
    lines.push('='.repeat(50));
    lines.push('');

    for (const msg of messages) {
      const sender = msg.type === 'inbox' ? contactName : 'Moi';
      const date = formatDate(msg.date);
      lines.push(`[${date}] ${sender}:`);
      lines.push(msg.body);
      lines.push('');
    }

    return lines.join('\n');
  }

  private toCSV(messages: SmsMessage[], contactName: string): string {
    const lines: string[] = [];
    lines.push('Date,Heure,Direction,Expediteur,Message');

    for (const msg of messages) {
      const date = new Date(msg.date);
      const dateStr = date.toLocaleDateString('fr-FR');
      const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const direction = msg.type === 'inbox' ? 'Recu' : 'Envoye';
      const sender = msg.type === 'inbox' ? contactName : 'Moi';
      lines.push([
        dateStr,
        timeStr,
        direction,
        escapeCSV(sender),
        escapeCSV(msg.body),
      ].join(','));
    }

    return lines.join('\n');
  }

  private toJSON(messages: SmsMessage[], thread: SmsThread): string {
    const exportData = {
      exportedAt: new Date().toISOString(),
      contact: {
        name: thread.contactName || null,
        phone: thread.address,
      },
      messageCount: messages.length,
      messages: messages.map(msg => ({
        id: msg.id,
        date: new Date(msg.date).toISOString(),
        type: msg.type,
        body: msg.body,
        read: msg.read,
      })),
    };
    return JSON.stringify(exportData, null, 2);
  }

  private download(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Export all threads summary
  exportAllThreads(threads: SmsThread[]): void {
    if (!browser) return;

    const lines: string[] = [];
    lines.push('Contact,Numero,Dernier message,Date,Non lus');

    for (const thread of threads) {
      const name = thread.contactName || '';
      const phone = formatPhoneNumber(thread.address);
      const lastMsg = escapeCSV(thread.lastMessage.substring(0, 100));
      const date = formatDate(thread.lastDate);
      lines.push([name, phone, lastMsg, date, thread.unreadCount.toString()].join(','));
    }

    const content = lines.join('\n');
    this.download(content, `conversations_${Date.now()}.csv`, 'text/csv');
  }
}

export const exportService = new ExportService();
