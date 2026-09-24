namespace ragchatbot.db;

using { cuid, managed } from '@sap/cds/common';

/**
 * A source PDF uploaded by an admin.
 * Chunking parameters are stored per document so you know exactly
 * how each document's chunks were produced.
 */
entity Documents : cuid, managed {
  filename          : String(255) not null;
  uploadedBy        : String(255) not null;   // admin's email/user id from JWT
  chunkSize         : Integer not null;
  chunkOverlap      : Integer not null;
  chunkingStrategy  : String(50) default 'hybrid';
  status            : String(20) default 'processing'; // processing | ready | failed
  chunks            : Association to many Chunks on chunks.document = $self;
}

/**
 * One retrievable chunk of text, with its embedding vector.
 * 768 = gemini-embedding-001 output dimensionality.
 */
entity Chunks : cuid {
  document     : Association to Documents not null;
  chunkIndex   : Integer not null;
  content      : LargeString not null;
  embedding    : Vector(768) not null;
  metadata     : LargeString; // JSON string: page number, section heading, etc.
}

/**
 * One conversation thread per user (persisted long-term memory).
 */
entity ChatSessions : cuid, managed {
  userId    : String(255) not null; // from JWT (req.user.id)
  title     : String(255);          // optional, e.g. first message truncated
  messages  : Association to many ChatMessages on messages.session = $self;
}

entity ChatMessages : cuid {
  session    : Association to ChatSessions not null;
  role       : String(10) not null;  // 'human' | 'ai'
  content    : LargeString not null;
  createdAt  : Timestamp @cds.on.insert: $now;
}