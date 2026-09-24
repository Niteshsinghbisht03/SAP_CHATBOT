using ragchatbot.db as db from '../db/schema';

@path: 'admin'
@requires: 'Admin'
service AdminService {

  @readonly entity Documents as projection on db.Documents;

  // embedding column hidden: 768 numbers per row is useless to a UI
  @readonly entity Chunks as projection on db.Chunks excluding { embedding };

  action uploadDocument(
    filename     : String,
    fileBase64   : LargeString,
    chunkSize    : Integer,
    chunkOverlap : Integer
  ) returns {
    documentId : UUID;
    chunkCount : Integer;
  };

action deleteDocument(documentId : UUID) returns Boolean;
}

