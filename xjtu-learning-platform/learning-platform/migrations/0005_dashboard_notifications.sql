CREATE TABLE announcements (
 id TEXT PRIMARY KEY, author_id TEXT NOT NULL REFERENCES user(id),
 title TEXT NOT NULL, body TEXT NOT NULL,
 pinned INTEGER NOT NULL DEFAULT 0 CHECK(pinned IN (0,1)),
 hidden INTEGER NOT NULL DEFAULT 0 CHECK(hidden IN (0,1)),
 created_at INTEGER NOT NULL
);
CREATE INDEX announcements_visible_date ON announcements(hidden,pinned,created_at);
CREATE TABLE notifications (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 recipient_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('announcement','feedback','reply')),
 source_id TEXT NOT NULL, created_at INTEGER NOT NULL,
 read_at INTEGER
);
CREATE INDEX notifications_recipient_id ON notifications(recipient_id,id DESC);
CREATE TRIGGER announcement_notify AFTER INSERT ON announcements
WHEN NEW.hidden=0
BEGIN
 INSERT INTO notifications(recipient_id,kind,source_id,created_at)
 SELECT id,'announcement',NEW.id,NEW.created_at FROM user
 WHERE COALESCE(banned,0)=0 AND id!=NEW.author_id;
END;
CREATE TRIGGER feedback_notify AFTER UPDATE OF feedback,grade ON uploads
WHEN NEW.kind='submission' AND NEW.status='ready'
 AND (NEW.grade IS NOT OLD.grade OR NEW.feedback IS NOT OLD.feedback)
 AND (NEW.grade IS NOT NULL OR LENGTH(TRIM(NEW.feedback))>0)
BEGIN
 INSERT INTO notifications(recipient_id,kind,source_id,created_at)
 VALUES(NEW.owner_id,'feedback',NEW.id,CAST(strftime('%s','now') AS INTEGER)*1000);
END;
CREATE TRIGGER reply_notify AFTER INSERT ON posts
WHEN NEW.parent_id IS NOT NULL AND NEW.hidden=0
BEGIN
 INSERT INTO notifications(recipient_id,kind,source_id,created_at)
 SELECT author_id,'reply',NEW.id,NEW.created_at FROM posts
 WHERE id=NEW.parent_id AND hidden=0 AND author_id!=NEW.author_id;
END;
