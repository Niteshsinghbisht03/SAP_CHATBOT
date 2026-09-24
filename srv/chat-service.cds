@path: 'chat'
@requires: ['User', 'Admin']
service ChatService {

  type Hit {
    content  : LargeString;
    filename : String;
    metadata : LargeString;
    score    : Double;
  };

  type Source {
    filename : String;
    page     : Integer;
    score    : Double;
  };

  type ChatReply {
    sessionId : UUID;
    answer    : String;
    sources   : many Source;
  };

  type SessionInfo {
    ID        : UUID;
    title     : String;
    createdAt : Timestamp;
  };

  type Message {
    role      : String;
    content   : LargeString;
    createdAt : Timestamp;
  };

  // debug only: returns raw document text, so admins only
  @requires: 'Admin'
  action   search(question : String, topK : Integer) returns array of Hit;

  action   chat(sessionId : UUID, question : String) returns ChatReply;
  function mySessions() returns array of SessionInfo;
  function sessionMessages(sessionId : UUID) returns array of Message;
  action   deleteSession(sessionId : UUID) returns Boolean;
}